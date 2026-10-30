import { identiteComplete, portableLisible, portableValide, prenomDe, PHRASE_IDENTITE } from "@baticlair/domain";
import { siretBienForme } from "../../groupe/index.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import type { VerificationNegoceService } from "./verification-negoce.service.js";

/**
 * L'IDENTITÉ DE L'ARTISAN AU PREMIER ENVOI (Greg, lot final, point 1) : SIRET, prénom, portable, sur un seul écran. Le
 * SIRET remplit le nom de l'entreprise et l'adresse (annuaire des entreprises de l'État) et préremplit le prénom du
 * dirigeant ; le SIRET est ensuite vérifié comme avant (accès aux achats groupés). Modifiable dans Profil.
 */
export class IdentiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annuaire: Pick<VerificationNegoceService, "fiche">,
    private readonly verifierSiret: (tenant: TenantContext) => Promise<{ verifie: boolean; message?: string } | unknown>,
  ) {}

  async lire(tenant: TenantContext) {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { name: true, address: true, siret: true, phone: true, prenom: true, siretVerifieLe: true } });
    const u = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } });
    const prenom = c.prenom ?? prenomDe(u?.name);
    return { phrase: PHRASE_IDENTITE, entreprise: c.name, adresse: c.address, siret: c.siret, prenom, telephone: c.phone, complete: identiteComplete({ siret: c.siret, prenom: c.prenom, telephone: c.phone }), siretVerifie: !!c.siretVerifieLe };
  }

  /** Ce que l'annuaire dit d'un SIRET, pour préremplir l'écran (rien n'est enregistré). */
  async apercu(siret: string) {
    const s = siret.replace(/\s/g, "");
    if (!siretBienForme(s)) throw validationFailed("Invalid SIRET", { reason: "siret_invalide" });
    const f = await this.annuaire.fiche(s);
    return { trouvee: !!f?.trouvee, active: !!f?.active, entreprise: f?.nom || null, adresse: f?.adresse ?? null, prenomDirigeant: f?.prenomDirigeant ?? null };
  }

  async enregistrer(tenant: TenantContext, b: { siret: string; prenom: string; telephone: string }) {
    assertCanWrite(tenant);
    const siret = b.siret.replace(/\s/g, "");
    if (!siretBienForme(siret)) throw validationFailed("Invalid SIRET", { reason: "siret_invalide" });
    if (!portableValide(b.telephone)) throw validationFailed("Mobile phone expected", { reason: "portable_invalide" });
    const prenom = b.prenom.trim();
    if (!prenom) throw validationFailed("First name required", { reason: "prenom_requis" });
    const f = await this.annuaire.fiche(siret);
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id: tenant.companyId }, select: { siret: true } });
    await this.prisma.company.update({
      where: { id: tenant.companyId },
      data: {
        siret,
        prenom,
        phone: portableLisible(b.telephone),
        ...(f?.trouvee && f.nom ? { name: f.nom } : {}),
        ...(f?.trouvee && f.adresse ? { address: f.adresse } : {}),
        ...(c.siret !== siret ? { siretVerifieLe: null } : {}),
      },
    });
    // Le SIRET vérifié comme avant (achats groupés) ; une panne de l'INSEE n'empêche pas l'envoi à ses négoces.
    const v = (await this.verifierSiret(tenant).catch(() => null)) as { verifie?: boolean; message?: string } | null;
    // L'achat groupé dit pourquoi un SIRET n'est pas retenu, sur place (correction après test de Greg, 30 octobre 2026).
    return { ...(await this.lire(tenant)), siretMessage: v && !v.verifie ? (v.message ?? null) : null };
  }
}
