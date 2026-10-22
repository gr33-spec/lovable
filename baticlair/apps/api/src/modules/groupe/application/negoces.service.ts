import { FAMILLES_GROUPE, LIBELLES_FAMILLES, mailRegroupementAuNegoce, messageAuNegoce, zoneDuCodePostal, type FamilleGroupe } from "@baticlair/domain";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { jetonDeLien, lienDuJeton } from "./lien-negoce.js";

export interface NegoceVue {
  id: string;
  nom: string;
  email: string;
  departement: string;
  familles: FamilleGroupe[];
  favori: boolean;
  numeroCompte: string | null;
  /** Le négoce a demandé « stop » : il ne reçoit plus rien. */
  stop: boolean;
  /**
   * Plan 2 du 21 octobre 2026, bloc 5 : un négoce peut servir plusieurs agences (une par département) avec le même e-mail.
   * Les autres départements où cet e-mail est connu.
   */
  agences: string[];
}

export interface NegoceSaisi {
  nom: string;
  email: string;
  departement?: string | null;
  familles: readonly FamilleGroupe[];
  favori?: boolean;
  numeroCompte?: string | null;
}

const familles = (f: readonly string[]) => FAMILLES_GROUPE.filter((x) => f.includes(x));

/**
 * LA BASE DES NÉGOCES (parcours groupé, étape 3) : alimentée par les artisans, commune à un département. L'artisan saisit
 * l'e-mail de ses négoces (le favori en premier) et coche ce que chacun vend ; un négoce déjà dans la base garde ses
 * familles et gagne celles cochées ; son « stop » est respecté. « Pas concerné » et « stop » arrivent par les liens signés
 * des e-mails (étape 5), sans compte.
 */
export class NegocesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secret: string,
    /** Nouveau cap (22 octobre) : le mail qui prévient un négoce nouveau qu'un regroupement de couvreurs existe. */
    private readonly email: TransactionalEmailSender | null = null,
    private readonly webAppUrl = "",
  ) {}

  async mesNegoces(tenant: TenantContext): Promise<NegoceVue[]> {
    const rows = await this.prisma.negoceArtisan.findMany({ where: { companyId: tenant.companyId }, include: { negoce: true }, orderBy: [{ rang: "asc" }, { createdAt: "asc" }] });
    const agences = await this.agencesDe(rows.map((r) => r.negoce.email));
    return rows.map((r, i) => vue(r.negoce, i === 0, r.numeroCompte, agences.get(r.negoce.email) ?? []));
  }

  /** Pour chaque e-mail, les départements où il est connu (ses agences), triés. */
  async agencesDe(emails: readonly string[]): Promise<Map<string, string[]>> {
    const tous = await this.prisma.negoce.findMany({ where: { email: { in: [...new Set(emails)] } }, select: { email: true, departement: true } });
    const parEmail = new Map<string, string[]>();
    for (const n of tous) parEmail.set(n.email, [...(parEmail.get(n.email) ?? []), n.departement].sort());
    return parEmail;
  }

  async message(tenant: TenantContext): Promise<{ message: string }> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true } });
    const u = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });
    return { message: messageAuNegoce({ entreprise: c.name, prenom: u?.name?.split(/\s+/)[0] ?? null }) };
  }

  async ajouter(tenant: TenantContext, n: NegoceSaisi): Promise<NegoceVue[]> {
    assertCanWrite(tenant);
    if (n.familles.length === 0) throw validationFailed("At least one family", { reason: "familles_requises" });
    const departement = n.departement?.trim() || (await this.departementDeLEntreprise(tenant));
    if (!departement) throw validationFailed("Department required", { reason: "departement_requis" });
    const email = n.email.trim().toLowerCase();
    let nouveau: { id: string; nom: string; familles: string[] } | null = null;
    await this.prisma.$transaction(async (tx) => {
      const existant = await tx.negoce.findUnique({ where: { email_departement: { email, departement } } });
      // Bloc 5 (21 octobre) : le même e-mail dans un autre département, c'est une autre agence du même négoce : une ligne
      // par département, qui garde le « stop » déjà demandé par cet e-mail.
      const autreAgence = existant ? null : await tx.negoce.findFirst({ where: { email, stopLe: { not: null } }, select: { stopLe: true } });
      const negoce = existant
        ? await tx.negoce.update({ where: { id: existant.id }, data: { familles: familles([...existant.familles, ...n.familles]) } })
        : await tx.negoce.create({ data: { nom: n.nom.trim(), email, departement, familles: familles(n.familles), ajouteParId: tenant.companyId, stopLe: autreAgence?.stopLe ?? null } });
      if (!existant && !autreAgence) nouveau = { id: negoce.id, nom: negoce.nom, familles: negoce.familles };
      const liens = await tx.negoceArtisan.findMany({ where: { companyId: tenant.companyId }, orderBy: { rang: "asc" } });
      if (liens.some((l) => l.negoceId === negoce.id)) throw new DomainError("conflict", "Already in your list", { reason: "deja_ajoute" });
      const favori = n.favori === true || liens.length === 0;
      if (favori) for (const l of liens) await tx.negoceArtisan.update({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId: l.negoceId } }, data: { rang: l.rang + 1 } });
      await tx.negoceArtisan.create({ data: { companyId: tenant.companyId, negoceId: negoce.id, rang: favori ? 1 : (liens.at(-1)?.rang ?? 0) + 1, numeroCompte: n.numeroCompte?.trim() || null } });
    });
    if (nouveau) await this.prevenirDuRegroupement(tenant, nouveau, email, departement);
    return this.mesNegoces(tenant);
  }

  /** Le négoce entre dans la base : un mail lui dit qu'un regroupement existe (un échec n'empêche pas l'ajout). */
  private async prevenirDuRegroupement(tenant: TenantContext, n: { id: string; nom: string; familles: string[] }, email: string, departement: string): Promise<void> {
    if (!this.email) return;
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true } });
    const stop = `${this.webAppUrl}/negoces/lien/${jetonDeLien(this.secret, { action: "stop", negoceId: n.id })}`;
    const mail = mailRegroupementAuNegoce({ negoce: n.nom, departement, familles: n.familles, artisan: c?.name ?? "Un artisan", stop });
    await this.email.send({ to: email, subject: mail.objet, text: mail.texte }).catch(() => undefined);
  }

  /** Changer ce que mon négoce vend (familles cochées en plus), mon numéro de compte chez lui, ou en faire mon favori. */
  async modifier(tenant: TenantContext, negoceId: string, m: { familles?: readonly FamilleGroupe[]; numeroCompte?: string | null; favori?: boolean }): Promise<NegoceVue[]> {
    assertCanWrite(tenant);
    const lien = await this.lien(tenant, negoceId);
    await this.prisma.$transaction(async (tx) => {
      if (m.familles) await tx.negoce.update({ where: { id: negoceId }, data: { familles: familles([...lien.negoce.familles, ...m.familles]) } });
      if (m.numeroCompte !== undefined) await tx.negoceArtisan.update({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId } }, data: { numeroCompte: m.numeroCompte?.trim() || null } });
      if (m.favori) {
        const liens = await tx.negoceArtisan.findMany({ where: { companyId: tenant.companyId }, orderBy: { rang: "asc" } });
        let rang = 2;
        for (const l of liens) await tx.negoceArtisan.update({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId: l.negoceId } }, data: { rang: l.negoceId === negoceId ? 1 : rang++ } });
      }
    });
    return this.mesNegoces(tenant);
  }

  /** Le retirer de MA liste : il reste dans la base du département (d'autres artisans l'utilisent). */
  async retirer(tenant: TenantContext, negoceId: string): Promise<NegoceVue[]> {
    assertCanWrite(tenant);
    await this.lien(tenant, negoceId);
    await this.prisma.negoceArtisan.delete({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId } } });
    return this.mesNegoces(tenant);
  }

  /** Ce que fait un lien d'e-mail, sans le faire (la page du négoce le dit avant qu'il confirme). */
  async apercuLien(jeton: string): Promise<{ action: "stop" | "pas_concerne"; negoce: string; famille: string | null; fait: boolean }> {
    const { lien, negoce } = await this.lienValide(jeton);
    const fait = lien.action === "stop" ? !!negoce.stopLe : !negoce.familles.includes(lien.famille);
    return { action: lien.action, negoce: negoce.nom, famille: lien.action === "pas_concerne" ? (LIBELLES_FAMILLES[lien.famille as FamilleGroupe] ?? lien.famille) : null, fait };
  }

  /** Le négoce confirme : « pas concerné » décoche la famille, « stop » le désinscrit. Rejouer le lien ne change plus rien. */
  async appliquerLien(jeton: string): Promise<{ action: "stop" | "pas_concerne"; negoce: string; famille: string | null; fait: boolean }> {
    const { lien, negoce } = await this.lienValide(jeton);
    const now = new Date();
    if (lien.action === "stop") {
      // « Stop » vaut pour l'e-mail, donc pour toutes ses agences (bloc 5, 21 octobre) ; « pas concerné » reste par agence.
      const agences = await this.prisma.negoce.findMany({ where: { email: negoce.email }, select: { id: true } });
      const ids = agences.map((a) => a.id);
      await this.prisma.negoce.updateMany({ where: { id: { in: ids }, stopLe: null }, data: { stopLe: now } });
      // Les lots qui l'attendaient encore n'attendent plus (étape 6 : le lot se décide quand tous ont répondu).
      await this.prisma.reponseNegoce.updateMany({ where: { negoceId: { in: ids }, deposeLe: null, pasConcerneLe: null, lot: { statut: "envoye" } }, data: { pasConcerneLe: now } });
    } else {
      await this.prisma.negoce.update({ where: { id: negoce.id }, data: { familles: negoce.familles.filter((f) => f !== lien.famille) } });
      await this.prisma.reponseNegoce.updateMany({ where: { negoceId: negoce.id, deposeLe: null, pasConcerneLe: null, lot: { statut: "envoye", famille: lien.famille } }, data: { pasConcerneLe: now } });
    }
    return { ...(await this.apercuLien(jeton)), fait: true };
  }

  private async lienValide(jeton: string) {
    const lien = lienDuJeton(this.secret, jeton);
    if (!lien || !isUuid(lien.negoceId)) throw notFound("Link");
    const negoce = await this.prisma.negoce.findUnique({ where: { id: lien.negoceId } });
    if (!negoce) throw notFound("Link");
    return { lien, negoce };
  }

  private async lien(tenant: TenantContext, negoceId: string) {
    if (!isUuid(negoceId)) throw notFound("Negoce");
    const lien = await this.prisma.negoceArtisan.findUnique({ where: { companyId_negoceId: { companyId: tenant.companyId, negoceId } }, include: { negoce: true } });
    if (!lien) throw notFound("Negoce");
    return lien;
  }

  private async departementDeLEntreprise(tenant: TenantContext): Promise<string | null> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { address: true } });
    return zoneDuCodePostal(c.address);
  }
}

function vue(n: { id: string; nom: string; email: string; departement: string; familles: string[]; stopLe: Date | null }, favori: boolean, numeroCompte: string | null, departements: string[]): NegoceVue {
  return { id: n.id, nom: n.nom, email: n.email, departement: n.departement, familles: familles(n.familles), favori, numeroCompte, stop: !!n.stopLe, agences: departements.filter((d) => d !== n.departement) };
}
