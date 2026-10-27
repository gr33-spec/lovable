import { randomBytes } from "node:crypto";
import { adresseReponseArtisan, candidatsAdresse, etiquetteDepuis, expediteurVia, fauteAdresse, PHRASES_REFUS_ADRESSE, type RefusAdresse } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, validationFailed } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../../tenancy/index.js";

export interface EtatAdresseMobiiz {
  /** Le nom avant le @ (`bati-invest`). */
  adresse: string;
  domaine: string | null;
  /** L'adresse complète, à donner aux négoces ; null tant que l'application n'a pas de domaine. */
  email: string | null;
  /** L'écran « Voici ton adresse Mobiiz » a été vu. */
  vueLe: string | null;
  /** Les anciennes adresses de l'entreprise : elles reçoivent encore. */
  anciennes: string[];
  /** L'artisan peut encore la changer (une fois). */
  modifiable: boolean;
  /** Le nombre de demandes de prix déjà parties : le rappel en une ligne ne se montre qu'au premier envoi. */
  envois: number;
}

/**
 * R7 (Greg, 26 et 27 octobre 2026) : L'ADRESSE MOBIIZ DE L'ARTISAN. Créée à la première demande (après l'inscription),
 * tirée du nom de l'entreprise ; l'artisan peut la changer UNE fois ; une adresse donnée reste à son entreprise pour
 * toujours (les négoces qui l'ont notée écrivent encore au bon endroit). Sans domaine configuré (`EMAIL_DOMAINE`),
 * l'adresse existe mais l'application le dit : elle ne reçoit rien.
 */
export class AdresseMobiizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domaine: string | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** L'adresse courante de l'entreprise, créée au besoin. */
  async adresseDe(companyId: string): Promise<string> {
    const courante = await this.prisma.adresseMobiiz.findFirst({ where: { companyId, courante: true }, orderBy: { createdAt: "desc" } });
    if (courante) return courante.adresse;
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, address: true } });
    for (const candidat of candidatsAdresse(c.name, communeDe(c.address))) {
      const prise = await this.prisma.adresseMobiiz.findUnique({ where: { adresse: candidat } });
      if (prise) continue;
      try {
        await this.prisma.adresseMobiiz.create({ data: { adresse: candidat, companyId, courante: true } });
        return candidat;
      } catch {
        // Prise entre-temps : au suivant.
      }
    }
    throw new DomainError("conflict", "No Mobiiz address available", { reason: "adresse_indisponible" });
  }

  async etat(tenant: TenantContext): Promise<EtatAdresseMobiiz> {
    const adresse = await this.adresseDe(tenant.companyId);
    const toutes = await this.prisma.adresseMobiiz.findMany({ where: { companyId: tenant.companyId }, orderBy: { createdAt: "asc" } });
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { adresseMobiizVueLe: true } });
    const envois = await this.prisma.priceRequestRecipient.count({ where: { priceRequest: { companyId: tenant.companyId }, sentAt: { not: null } } });
    return {
      envois,
      adresse,
      domaine: this.domaine,
      email: this.domaine ? `${adresse}@${this.domaine}` : null,
      vueLe: c.adresseMobiizVueLe?.toISOString() ?? null,
      anciennes: toutes.filter((a) => !a.courante).map((a) => a.adresse),
      modifiable: toutes.length <= 1,
    };
  }

  async marquerVue(tenant: TenantContext): Promise<EtatAdresseMobiiz> {
    await this.prisma.company.update({ where: { id: tenant.companyId }, data: { adresseMobiizVueLe: this.now() } });
    return this.etat(tenant);
  }

  /** « Cette adresse est-elle libre ? » : la faute de forme, ou prise par une autre entreprise. */
  async verifier(tenant: TenantContext, souhaitee: string): Promise<{ adresse: string; libre: boolean; raison: string | null }> {
    const adresse = souhaitee.trim().toLowerCase();
    const faute: RefusAdresse | null = fauteAdresse(adresse);
    if (faute) return { adresse, libre: false, raison: PHRASES_REFUS_ADRESSE[faute] };
    const prise = await this.prisma.adresseMobiiz.findUnique({ where: { adresse } });
    if (prise && prise.companyId !== tenant.companyId) return { adresse, libre: false, raison: "Déjà prise par une autre entreprise." };
    return { adresse, libre: true, raison: null };
  }

  /** Changer d'adresse, une fois : l'ancienne reste à l'entreprise et reçoit encore. */
  async changer(tenant: TenantContext, souhaitee: string): Promise<EtatAdresseMobiiz> {
    if (tenant.role === "viewer") throw new DomainError("forbidden", "Read-only membership");
    const etat = await this.etat(tenant);
    const v = await this.verifier(tenant, souhaitee);
    if (!v.libre) throw validationFailed(v.raison ?? "Adresse refusée", { reason: "adresse_refusee", phrase: v.raison });
    if (v.adresse === etat.adresse) return etat;
    if (!etat.modifiable) throw new DomainError("conflict", "Address already changed once", { reason: "adresse_deja_changee", phrase: "Tu as déjà changé d'adresse une fois. Écris-nous si tu dois la changer encore." });
    await this.prisma.$transaction([
      this.prisma.adresseMobiiz.updateMany({ where: { companyId: tenant.companyId }, data: { courante: false } }),
      this.prisma.adresseMobiiz.create({ data: { adresse: v.adresse, companyId: tenant.companyId, courante: true } }),
    ]);
    return this.etat(tenant);
  }

  /** L'entreprise derrière une adresse (courante ou ancienne), sinon null. */
  async entrepriseDe(adresse: string): Promise<string | null> {
    return (await this.prisma.adresseMobiiz.findUnique({ where: { adresse: adresse.toLowerCase() } }))?.companyId ?? null;
  }

  /**
   * L'expéditeur d'une demande de prix et son adresse de réponse étiquetée (« Répondre » du négoce retrouve la demande).
   * Null sans domaine : la demande part de l'adresse de l'application, comme avant.
   */
  async expediteur(companyId: string): Promise<{ from: string; replyTo: (etiquette: string) => string; adresse: string } | null> {
    if (!this.domaine) return null;
    const adresse = await this.adresseDe(companyId);
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } });
    const domaine = this.domaine;
    return { from: expediteurVia(c.name, adresse, domaine), replyTo: (etiquette) => adresseReponseArtisan(adresse, etiquette, domaine), adresse };
  }

  /** Une étiquette de réponse neuve, jamais donnée à une autre demande. */
  async etiquetteNeuve(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const e = etiquetteDepuis(randomBytes(8));
      if (!(await this.prisma.priceRequestRecipient.findUnique({ where: { etiquette: e }, select: { id: true } }))) return e;
    }
    throw new DomainError("conflict", "No free reply tag");
  }
}

/** La commune d'une adresse postale (« 3 rue de la Gare, 22300 Lannion » → « Lannion »), sinon null. */
export function communeDe(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  const m = /\b\d{5}\s+([^,\n]+)/.exec(adresse);
  return m ? m[1]!.trim() : null;
}
