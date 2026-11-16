import { createHash } from "node:crypto";
import {
  adressesCandidates,
  CERTIFICATIONS_SUGGEREES,
  estCouleur,
  estModele,
  LIMITES_PAGE,
  NUANCIER,
  MODELES_PAGE,
  refusAdresse,
  siteWebPropre,
  telephonePropre,
  THEMES_METIER,
  themeDuMetier,
  TRADES,
  type ContenuPage,
  type PhotoPublique,
} from "@baticlair/domain";
import type { AppConfig } from "../../../platform/config/config.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import type { AppLogger } from "../../../platform/logging/logger.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { StockagePhotos } from "./stockage.port.js";
import { controlerPhoto, produireVariantes } from "./photos.js";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026). Seule l'entreprise modifie SA page (toujours `tenant.companyId`, jamais un
 * identifiant reçu) ; un visiteur sans compte ne lit QUE la page visible et non masquée, et jamais un nom de personne, un
 * e-mail ni une adresse exacte sans le choix explicite de l'artisan. Les champs connus du profil (nom, métiers, téléphone,
 * zone, SIRET vérifié) sont LUS à chaque affichage : changer son téléphone dans le profil change la page.
 */
export const LIBELLES_METIERS: Record<string, string> = Object.fromEntries(TRADES.map((t) => [t.id, t.label]));

export const MOTIFS_SIGNALEMENT_PAGE = [
  { id: "contenu", libelle: "Contenu choquant ou trompeur" },
  { id: "usurpation", libelle: "Cette page usurpe une entreprise" },
  { id: "photos", libelle: "Photos qui ne lui appartiennent pas ou montrent des personnes" },
  { id: "arnaque", libelle: "Arnaque ou démarchage abusif" },
  { id: "autre", libelle: "Autre" },
] as const;
export type MotifSignalementPage = (typeof MOTIFS_SIGNALEMENT_PAGE)[number]["id"];

/** Limites anti-abus du formulaire de contact (en plus de Turnstile quand il est branché). */
export const LIMITES_CONTACT = { parIpParHeure: 5, parPageParJour: 30 } as const;

export interface ModificationPage {
  visible?: boolean;
  modele?: string;
  couleur?: string | null;
  fond?: "clair" | "sombre" | null;
  pictos?: boolean;
  motif?: boolean;
  accroche?: string | null;
  presentation?: string | null;
  telephone?: string | null;
  zone?: string | null;
  horaires?: string | null;
  siteWeb?: string | null;
  creeeEn?: number | null;
  certifications?: string[];
  afficherAdresse?: boolean;
}

export interface MessageContact {
  nom: string;
  telephone: string | null;
  email: string | null;
  commune: string | null;
  message: string;
}

type PageRow = NonNullable<Awaited<ReturnType<PrismaService["pageEntreprise"]["findUnique"]>>>;
type PhotoRow = NonNullable<Awaited<ReturnType<PrismaService["photoPage"]["findUnique"]>>>;

const refus = (reason: string, phrase: string, field?: string) => new DomainError("validation_failed", phrase, { reason, phrase, ...(field ? { field } : {}) });

/** La ville d'une adresse postale française (« 3 rue X, 22300 Lannion » → « Lannion »), sinon null. */
export function villeDeLAdresse(adresse: string | null | undefined): string | null {
  const m = /\b\d{5}\s+([^,\n]+)\s*$/.exec(adresse?.trim() ?? "");
  return m ? m[1]!.trim().replace(/\s+cedex.*$/i, "") : null;
}

function nettoyer(v: string | null | undefined, max: number): string | null {
  const t = v?.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

export class PageEntrepriseService {
  /** Les traitements de photos en cours (arrière-plan) : les tests les attendent. */
  private readonly enCours = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockage: StockagePhotos,
    private readonly emails: TransactionalEmailSender,
    private readonly config: AppConfig,
    private readonly logger: AppLogger,
    /** Garde un travail en vie après la réponse (Vercel : waitUntil). */
    private readonly garderEnVie: (travail: Promise<unknown>) => void = () => undefined,
    /** Missions ouvertes ? L'interrupteur de l'admin (`ReglageMissions`), sinon `MISSIONS_V1`. */
    private readonly missionsActives: () => Promise<boolean> = async () => this.config.missionsV1,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async traitementsTermines(): Promise<void> {
    while (this.enCours.size) await Promise.allSettled([...this.enCours]);
  }

  /* --------------------------------------------------------------------------------------------- Lecture commune */

  private async entreprise(companyId: string) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, trades: true, phone: true, address: true, siret: true, siretVerifieLe: true, contactEmail: true, logoType: true, updatedAt: true, profilPublic: { select: { ville: true } } },
    });
    if (!c) throw notFound("Entreprise");
    return c;
  }

  /** La page de l'entreprise, créée privée à la première ouverture, à une adresse libre tirée de son nom. */
  private async pageDe(companyId: string): Promise<PageRow> {
    const deja = await this.prisma.pageEntreprise.findUnique({ where: { companyId } });
    if (deja) return deja;
    const e = await this.entreprise(companyId);
    for (const adresse of adressesCandidates(e.name, villeDeLAdresse(e.address) ?? e.profilPublic?.ville ?? null)) {
      if (await this.adressePrise(adresse)) continue;
      try {
        return await this.prisma.pageEntreprise.create({ data: { companyId, adresse } });
      } catch (err) {
        // Deux ouvertures simultanées : la page existe déjà, ou l'adresse vient d'être prise par une autre.
        const p = await this.prisma.pageEntreprise.findUnique({ where: { companyId } });
        if (p) return p;
        this.logger.warn({ err: String(err) }, "page_entreprise_adresse_course");
      }
    }
    return this.prisma.pageEntreprise.create({ data: { companyId, adresse: `entreprise-${companyId.slice(0, 8)}` } });
  }

  private async adressePrise(adresse: string): Promise<boolean> {
    const [p, a] = await Promise.all([this.prisma.pageEntreprise.count({ where: { adresse } }), this.prisma.ancienneAdressePage.count({ where: { adresse } })]);
    return p + a > 0;
  }

  private vuePhoto(p: PhotoRow): PhotoPublique {
    return { id: p.id, legende: p.legende, largeur: p.largeur, hauteur: p.hauteur, variantes: (p.variantes as PhotoPublique["variantes"]) ?? [], partage: p.partage };
  }

  /** Le contenu tel que la page l'affiche (tout ce qui vient du profil y est relu). */
  private async contenu(page: PageRow): Promise<ContenuPage> {
    const e = await this.entreprise(page.companyId);
    const missions = await this.missionsActives().catch(() => false);
    const [photos, couverture, dispo] = await Promise.all([
      this.prisma.photoPage.findMany({ where: { companyId: page.companyId, role: "galerie", statut: "prete" }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] }),
      page.couvertureId ? this.prisma.photoPage.findFirst({ where: { id: page.couvertureId, companyId: page.companyId, statut: "prete" } }) : null,
      missions ? this.prisma.annonceMission.findFirst({ where: { companyId: page.companyId, type: "disponibilite", statut: "publiee" }, orderBy: { createdAt: "desc" }, select: { id: true, debut: true, fin: true } }) : null,
    ]);
    const metiers = e.trades.filter((t) => LIBELLES_METIERS[t]);
    return {
      adresse: page.adresse,
      nom: e.name,
      metierPrincipal: metiers[0] ?? "other",
      metiers,
      accroche: page.accroche,
      presentation: page.presentation,
      zone: page.zone ?? e.profilPublic?.ville ?? villeDeLAdresse(e.address),
      horaires: page.horaires,
      telephone: telephonePropre(page.telephone ?? e.phone),
      siteWeb: page.siteWeb,
      adressePostale: page.afficherAdresse ? (e.address?.trim() || null) : null,
      creeeEn: page.creeeEn,
      certifications: page.certifications,
      verifiee: !!e.siretVerifieLe,
      siret: e.siret?.replace(/\s/g, "") || null,
      modele: estModele(page.modele) ? page.modele : "photo",
      couleur: page.couleur,
      fond: page.fond === "clair" || page.fond === "sombre" ? page.fond : null,
      pictos: page.pictos,
      motif: page.motif,
      logo: e.logoType ? `/v1/public/pages/${page.adresse}/logo?v=${e.updatedAt.getTime().toString(36)}` : null,
      couverture: couverture ? this.vuePhoto(couverture) : null,
      photos: photos.map((p) => this.vuePhoto(p)),
      missions: dispo ? { disponibleDu: dispo.debut.toISOString().slice(0, 10), disponibleAu: dispo.fin?.toISOString().slice(0, 10) ?? null, lien: `/missions/${dispo.id}` } : null,
      majLe: new Date(Math.max(page.updatedAt.getTime(), e.updatedAt.getTime())).toISOString(),
    };
  }

  /* --------------------------------------------------------------------------------------------- L'artisan */

  /** L'éditeur : réglages, valeurs du profil (pour « prérempli, synchronisé »), aperçu et photos (en cours compris). */
  async maPage(t: TenantContext) {
    const page = await this.pageDe(t.companyId);
    const [e, contenu, photos] = await Promise.all([
      this.entreprise(t.companyId),
      this.contenu(page),
      this.prisma.photoPage.findMany({ where: { companyId: t.companyId }, orderBy: [{ role: "asc" }, { ordre: "asc" }, { createdAt: "asc" }] }),
    ]);
    return {
      reglages: {
        visible: page.visible,
        masquee: !!page.masqueeLe,
        adresse: page.adresse,
        adresseModifiable: !page.adresseChangeeLe,
        modele: contenu.modele,
        couleur: page.couleur,
        fond: page.fond,
        pictos: page.pictos,
        motif: page.motif,
        accroche: page.accroche,
        presentation: page.presentation,
        telephone: page.telephone,
        zone: page.zone,
        horaires: page.horaires,
        siteWeb: page.siteWeb,
        creeeEn: page.creeeEn,
        certifications: page.certifications,
        afficherAdresse: page.afficherAdresse,
        photosAccord: !!page.photosAccordLe,
        couvertureId: page.couvertureId,
      },
      profil: { nom: e.name, metiers: contenu.metiers, telephone: telephonePropre(e.phone), zone: e.profilPublic?.ville ?? villeDeLAdresse(e.address), adressePostale: e.address, siret: e.siret, verifiee: !!e.siretVerifieLe, logo: !!e.logoType },
      contenu,
      photos: photos.map((p) => ({ ...this.vuePhoto(p), role: p.role, statut: p.statut })),
      choix: {
        modeles: MODELES_PAGE,
        nuancier: NUANCIER,
        certifications: CERTIFICATIONS_SUGGEREES,
        theme: themeDuMetier(contenu.metierPrincipal),
        limites: LIMITES_PAGE,
        stockagePhotos: this.stockage.actif,
        missions: await this.missionsActives().catch(() => false),
      },
    };
  }

  /** Tout changement s'applique tout de suite ; un champ absent ne change pas, un champ vide (null) revient au profil. */
  async modifier(t: TenantContext, m: ModificationPage) {
    assertCanWrite(t);
    const page = await this.pageDe(t.companyId);
    const d: Record<string, unknown> = {};
    if (m.visible !== undefined) d.visible = m.visible;
    if (m.modele !== undefined) {
      if (!estModele(m.modele)) throw refus("modele", "Modèle inconnu.", "modele");
      d.modele = m.modele;
    }
    if (m.couleur !== undefined) {
      if (m.couleur !== null && !estCouleur(m.couleur)) throw refus("couleur", "Couleur invalide.", "couleur");
      d.couleur = m.couleur?.toUpperCase() ?? null;
    }
    if (m.fond !== undefined) d.fond = m.fond;
    if (m.pictos !== undefined) d.pictos = m.pictos;
    if (m.motif !== undefined) d.motif = m.motif;
    if (m.accroche !== undefined) d.accroche = nettoyer(m.accroche?.replace(/\n/g, " "), LIMITES_PAGE.accroche);
    if (m.presentation !== undefined) d.presentation = nettoyer(m.presentation, LIMITES_PAGE.presentation);
    if (m.telephone !== undefined) {
      if (m.telephone && !telephonePropre(m.telephone)) throw refus("telephone", "Ce numéro n'est pas valable.", "telephone");
      d.telephone = telephonePropre(m.telephone);
    }
    if (m.zone !== undefined) d.zone = nettoyer(m.zone, LIMITES_PAGE.zone);
    if (m.horaires !== undefined) d.horaires = nettoyer(m.horaires, LIMITES_PAGE.horaires);
    if (m.siteWeb !== undefined) {
      if (m.siteWeb && !siteWebPropre(m.siteWeb)) throw refus("site_web", "Cette adresse de site n'est pas valable.", "siteWeb");
      d.siteWeb = siteWebPropre(m.siteWeb);
    }
    if (m.creeeEn !== undefined) {
      const annee = this.now().getFullYear();
      if (m.creeeEn !== null && (!Number.isInteger(m.creeeEn) || m.creeeEn < LIMITES_PAGE.creeeEn.min || m.creeeEn > annee)) throw refus("creee_en", `Année entre ${LIMITES_PAGE.creeeEn.min} et ${annee}.`, "creeeEn");
      d.creeeEn = m.creeeEn;
    }
    if (m.certifications !== undefined) {
      const vues = new Set<string>();
      d.certifications = m.certifications
        .map((c) => nettoyer(c, LIMITES_PAGE.certification))
        .filter((c): c is string => !!c && !vues.has(c.toLowerCase()) && !!vues.add(c.toLowerCase()))
        .slice(0, LIMITES_PAGE.certifications);
    }
    if (m.afficherAdresse !== undefined) d.afficherAdresse = m.afficherAdresse;
    if (Object.keys(d).length) await this.prisma.pageEntreprise.update({ where: { companyId: page.companyId }, data: d });
    return this.maPage(t);
  }

  /** L'adresse se change UNE fois ; l'ancienne n'est jamais réattribuée et redirige vers la nouvelle. */
  async changerAdresse(t: TenantContext, voulue: string) {
    assertCanWrite(t);
    const page = await this.pageDe(t.companyId);
    const adresse = voulue.trim().toLowerCase();
    if (adresse === page.adresse) return this.maPage(t);
    if (page.adresseChangeeLe) throw new DomainError("conflict", "Address already changed", { reason: "adresse_deja_changee", phrase: "Tu as déjà changé l'adresse de ta page une fois." });
    const faute = refusAdresse(adresse);
    if (faute) throw refus("adresse_invalide", faute, "adresse");
    const ancienne = await this.prisma.ancienneAdressePage.findUnique({ where: { adresse } });
    if ((ancienne && ancienne.companyId !== t.companyId) || (await this.prisma.pageEntreprise.count({ where: { adresse } }))) throw new DomainError("conflict", "Address taken", { reason: "adresse_prise", phrase: "Cette adresse est déjà prise." });
    await this.prisma.$transaction(async (tx) => {
      // Revenir à une de SES anciennes adresses la libère de la liste des redirections.
      if (ancienne) await tx.ancienneAdressePage.delete({ where: { adresse } });
      await tx.ancienneAdressePage.create({ data: { adresse: page.adresse, companyId: t.companyId } });
      await tx.pageEntreprise.update({ where: { companyId: t.companyId }, data: { adresse, adresseChangeeLe: this.now() } });
    });
    return this.maPage(t);
  }

  /** Les adresses dont le cache est à régénérer après un changement (la courante et les anciennes). */
  async adressesARafraichir(companyId: string): Promise<string[]> {
    const [p, anciennes] = await Promise.all([
      this.prisma.pageEntreprise.findUnique({ where: { companyId }, select: { adresse: true } }),
      this.prisma.ancienneAdressePage.findMany({ where: { companyId }, select: { adresse: true } }),
    ]);
    return [...(p ? [p.adresse] : []), ...anciennes.map((a) => a.adresse)];
  }

  /* --------------------------------------------------------------------------------------------- Photos */

  /**
   * Relecture du juriste (16 novembre 2026) : avant la première photo, l'artisan déclare avoir le droit de les publier
   * (accord des clients et des personnes reconnaissables, retrait sur demande). La date est gardée comme preuve.
   */
  async accorderPhotos(t: TenantContext) {
    assertCanWrite(t);
    const page = await this.pageDe(t.companyId);
    if (!page.photosAccordLe) await this.prisma.pageEntreprise.update({ where: { companyId: t.companyId }, data: { photosAccordLe: this.now() } });
    return this.maPage(t);
  }

  async ajouterPhoto(t: TenantContext, octets: Buffer, role: "galerie" | "couverture", legende: string | null) {
    assertCanWrite(t);
    if (!this.stockage.actif) throw new DomainError("forbidden", "Photo storage off", { reason: "stockage_coupe", phrase: "L'envoi de photos n'est pas encore ouvert." });
    const page = await this.pageDe(t.companyId);
    if (!page.photosAccordLe) throw new DomainError("forbidden", "Photo rights not confirmed", { reason: "accord_photos", phrase: "Coche d'abord que tu as le droit de publier ces photos." });
    if (role === "galerie") {
      const n = await this.prisma.photoPage.count({ where: { companyId: t.companyId, role: "galerie", statut: { not: "erreur" } } });
      if (n >= LIMITES_PAGE.photos) throw refus("photos_max", `${LIMITES_PAGE.photos} photos au plus. Retire une photo pour en ajouter une.`);
    }
    const { largeur, hauteur } = await controlerPhoto(octets);
    const dernier = await this.prisma.photoPage.aggregate({ where: { companyId: t.companyId, role }, _max: { ordre: true } });
    const photo = await this.prisma.photoPage.create({
      data: { companyId: t.companyId, role, legende: nettoyer(legende, LIMITES_PAGE.legende), ordre: (dernier._max.ordre ?? -1) + 1, largeur, hauteur, octets: octets.length },
    });
    const travail = this.traiter(photo.id, t.companyId, role, octets).finally(() => this.enCours.delete(travail));
    this.enCours.add(travail);
    this.garderEnVie(travail);
    return { ...this.vuePhoto(photo), role, statut: photo.statut };
  }

  /** En arrière-plan : les tailles, le dépôt, puis la photo passe « prête » (ou « erreur », sans rien laisser derrière). */
  private async traiter(photoId: string, companyId: string, role: "galerie" | "couverture", octets: Buffer): Promise<void> {
    const deposees: string[] = [];
    try {
      const { fichiers, largeur, hauteur } = await produireVariantes(octets, role);
      const urls = await Promise.all(fichiers.map(async (f) => ({ f, url: await this.stockage.deposer(`pages/${companyId}/${photoId}/${f.nom}`, f.octets, f.type) })));
      deposees.push(...urls.map((u) => u.url));
      const variantes = [...new Set(urls.filter((u) => u.f.nom !== "partage.jpg").map((u) => u.f.largeur))].map((l) => ({
        largeur: l,
        avif: urls.find((u) => u.f.largeur === l && u.f.type === "image/avif")!.url,
        webp: urls.find((u) => u.f.largeur === l && u.f.type === "image/webp")!.url,
      }));
      const partage = urls.find((u) => u.f.nom === "partage.jpg")?.url ?? null;
      // La photo a pu être retirée pendant le traitement : ses fichiers ne restent pas.
      const maj = await this.prisma.photoPage.updateMany({ where: { id: photoId, companyId }, data: { statut: "prete", variantes, partage, cles: deposees, largeur, hauteur } });
      if (maj.count === 0) {
        await this.stockage.supprimer(deposees);
        return;
      }
      if (role === "couverture") await this.remplacerCouverture(companyId, photoId);
    } catch (err) {
      this.logger.warn({ err: String(err), photoId }, "photo_page_traitement_echoue");
      await this.stockage.supprimer(deposees).catch(() => undefined);
      await this.prisma.photoPage.updateMany({ where: { id: photoId }, data: { statut: "erreur", cles: [] } });
    }
  }

  private async remplacerCouverture(companyId: string, photoId: string): Promise<void> {
    const anciennes = await this.prisma.photoPage.findMany({ where: { companyId, role: "couverture", id: { not: photoId } } });
    await this.prisma.pageEntreprise.update({ where: { companyId }, data: { couvertureId: photoId } });
    for (const a of anciennes) await this.effacer(a);
  }

  /** Suppression propre : les fichiers du stockage d'abord, puis la ligne. */
  private async effacer(p: PhotoRow): Promise<void> {
    await this.stockage.supprimer(p.cles);
    await this.prisma.photoPage.deleteMany({ where: { id: p.id, companyId: p.companyId } });
    await this.prisma.pageEntreprise.updateMany({ where: { companyId: p.companyId, couvertureId: p.id }, data: { couvertureId: null } });
  }

  private async maPhoto(t: TenantContext, id: string): Promise<PhotoRow> {
    const p = isUuid(id) ? await this.prisma.photoPage.findFirst({ where: { id, companyId: t.companyId } }) : null;
    if (!p) throw notFound("Photo");
    return p;
  }

  async modifierPhoto(t: TenantContext, id: string, legende: string | null) {
    assertCanWrite(t);
    await this.maPhoto(t, id);
    await this.prisma.photoPage.update({ where: { id }, data: { legende: nettoyer(legende, LIMITES_PAGE.legende) } });
    return this.maPage(t);
  }

  async supprimerPhoto(t: TenantContext, id: string) {
    assertCanWrite(t);
    await this.effacer(await this.maPhoto(t, id));
    return this.maPage(t);
  }

  /** Glisser pour réordonner : l'ordre complet des photos de la galerie, uniquement les siennes. */
  async ordonner(t: TenantContext, ids: string[]) {
    assertCanWrite(t);
    const siennes = await this.prisma.photoPage.findMany({ where: { companyId: t.companyId, role: "galerie" }, select: { id: true } });
    const connues = new Set(siennes.map((p) => p.id));
    if (ids.some((id) => !connues.has(id)) || new Set(ids).size !== ids.length) throw notFound("Photo");
    await this.prisma.$transaction(ids.map((id, ordre) => this.prisma.photoPage.update({ where: { id }, data: { ordre } })));
    return this.maPage(t);
  }

  /** Retirer la couverture choisie : la page reprend le visuel du métier. */
  async retirerCouverture(t: TenantContext) {
    assertCanWrite(t);
    const page = await this.pageDe(t.companyId);
    const cov = page.couvertureId ? await this.prisma.photoPage.findFirst({ where: { id: page.couvertureId, companyId: t.companyId } }) : null;
    if (cov) await this.effacer(cov);
    return this.maPage(t);
  }

  /* --------------------------------------------------------------------------------------------- Visiteurs */

  private async pagePublique(adresse: string): Promise<PageRow | { redirection: string }> {
    const a = adresse.toLowerCase();
    if (refusAdresse(a) && !/^entreprise-[0-9a-f]{8}$/.test(a)) throw notFound("Page");
    const page = await this.prisma.pageEntreprise.findUnique({ where: { adresse: a } });
    if (page) {
      if (!page.visible || page.masqueeLe) throw notFound("Page");
      return page;
    }
    const ancienne = await this.prisma.ancienneAdressePage.findUnique({ where: { adresse: a } });
    if (ancienne) {
      const courante = await this.prisma.pageEntreprise.findUnique({ where: { companyId: ancienne.companyId } });
      if (courante?.visible && !courante.masqueeLe) return { redirection: courante.adresse };
    }
    throw notFound("Page");
  }

  async publique(adresse: string): Promise<{ redirection: string } | { contenu: ContenuPage }> {
    const p = await this.pagePublique(adresse);
    if ("redirection" in p) return p;
    return { contenu: await this.contenu(p) };
  }

  async logoPublic(adresse: string): Promise<{ type: string; octets: Uint8Array }> {
    const p = await this.pagePublique(adresse);
    if ("redirection" in p) throw notFound("Logo");
    const c = await this.prisma.company.findUnique({ where: { id: p.companyId }, select: { logo: true, logoType: true } });
    if (!c?.logo || !c.logoType) throw notFound("Logo");
    return { type: c.logoType, octets: new Uint8Array(c.logo) };
  }

  private empreinteIp(ip: string | undefined): string | null {
    return ip ? createHash("sha256").update(`${this.config.authSecret}:page:${ip}`).digest("hex").slice(0, 32) : null;
  }

  /** Le formulaire de contact : l'e-mail de l'entreprise n'est JAMAIS montré ; le message part chez elle, « Répondre » écrit au visiteur. */
  async contacter(adresse: string, m: MessageContact, ip: string | undefined) {
    const p = await this.pagePublique(adresse);
    if ("redirection" in p) throw notFound("Page");
    const ipHash = this.empreinteIp(ip);
    const heure = new Date(this.now().getTime() - 3_600_000);
    const jour = new Date(this.now().getTime() - 86_400_000);
    const [parIp, parPage] = await Promise.all([
      ipHash ? this.prisma.contactPage.count({ where: { ipHash, createdAt: { gte: heure } } }) : 0,
      this.prisma.contactPage.count({ where: { companyId: p.companyId, createdAt: { gte: jour } } }),
    ]);
    if (parIp >= LIMITES_CONTACT.parIpParHeure || parPage >= LIMITES_CONTACT.parPageParJour) {
      throw new DomainError("too_many_requests", "Too many messages", { reason: "trop_de_messages", phrase: "Trop de messages envoyés. Réessayez plus tard ou appelez directement." });
    }
    if (!m.telephone && !m.email) throw refus("coordonnees", "Laissez un téléphone ou un e-mail pour qu'on vous réponde.", "telephone");
    const dest = await this.destinataire(p.companyId);
    if (!dest) throw new DomainError("conflict", "No recipient", { reason: "sans_destinataire", phrase: "Ce message ne peut pas partir pour l'instant. Appelez directement." });
    const e = await this.entreprise(p.companyId);
    await this.emails.send({
      to: dest,
      subject: `Nouveau message depuis votre page Mobiiz : ${m.nom}`,
      text: [
        `Bonjour,`,
        ``,
        `${m.nom} vous a écrit depuis votre page Mobiiz (${this.config.webAppUrl}/e/${p.adresse}).`,
        ``,
        m.message,
        ``,
        `Pour lui répondre :`,
        m.telephone ? `Téléphone : ${m.telephone}` : null,
        m.email ? `E-mail : ${m.email} (ou répondez simplement à ce message)` : null,
        m.commune ? `Commune du projet : ${m.commune}` : null,
        ``,
        `Ce message vous est transmis par Mobiiz pour ${e.name}. Votre adresse e-mail n'a pas été montrée au visiteur.`,
      ]
        .filter((l) => l !== null)
        .join("\n"),
      ...(m.email ? { replyTo: m.email } : {}),
      mustDeliver: true,
    });
    await this.prisma.contactPage.create({ data: { companyId: p.companyId, ipHash } });
    return { envoye: true };
  }

  /** Qui reçoit les messages : l'e-mail de contact de l'entreprise, sinon celui de son propriétaire. */
  private async destinataire(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { contactEmail: true } });
    if (c?.contactEmail) return c.contactEmail;
    const m = await this.prisma.membership.findFirst({ where: { companyId, role: "owner" }, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true } } } });
    return m?.user.email ?? null;
  }

  async signaler(adresse: string, motif: MotifSignalementPage, precision: string | null, ip: string | undefined) {
    const p = await this.pagePublique(adresse);
    if ("redirection" in p) throw notFound("Page");
    const ipHash = this.empreinteIp(ip);
    const deja = ipHash ? await this.prisma.signalementPage.count({ where: { companyId: p.companyId, ipHash, createdAt: { gte: new Date(this.now().getTime() - 86_400_000) } } }) : 0;
    if (!deja) await this.prisma.signalementPage.create({ data: { companyId: p.companyId, motif, precision: nettoyer(precision, 1000), ipHash } });
    return { signale: true };
  }

  /* --------------------------------------------------------------------------------------------- Admin */

  async listeAdmin() {
    const [pages, signalements] = await Promise.all([
      this.prisma.pageEntreprise.findMany({ where: { OR: [{ visible: true }, { masqueeLe: { not: null } }] }, orderBy: { updatedAt: "desc" }, take: 500, include: { company: { select: { name: true, trades: true, siretVerifieLe: true } } } }),
      this.prisma.signalementPage.findMany({ where: { traiteLe: null }, orderBy: { createdAt: "desc" }, take: 200, include: { company: { select: { name: true, pageEntreprise: { select: { adresse: true } } } } } }),
    ]);
    const parPage = new Map<string, number>();
    for (const s of signalements) parPage.set(s.companyId, (parPage.get(s.companyId) ?? 0) + 1);
    return {
      pages: pages.map((p) => ({ adresse: p.adresse, nom: p.company.name, metier: themeDuMetier(p.company.trades[0]).nom, verifiee: !!p.company.siretVerifieLe, visible: p.visible, masquee: !!p.masqueeLe, motif: p.masqueeMotif, signalements: parPage.get(p.companyId) ?? 0, majLe: p.updatedAt.toISOString() })),
      signalements: signalements.map((s) => ({ id: s.id, adresse: s.company.pageEntreprise?.adresse ?? null, nom: s.company.name, motif: MOTIFS_SIGNALEMENT_PAGE.find((m) => m.id === s.motif)?.libelle ?? s.motif, precision: s.precision, le: s.createdAt.toISOString() })),
    };
  }

  async masquer(adresse: string, masquer: boolean, motif: string | null): Promise<{ companyId: string; adresses: string[] }> {
    const p = await this.prisma.pageEntreprise.findUnique({ where: { adresse } });
    if (!p) throw notFound("Page");
    await this.prisma.pageEntreprise.update({ where: { adresse }, data: masquer ? { masqueeLe: this.now(), masqueeMotif: nettoyer(motif, 300) } : { masqueeLe: null, masqueeMotif: null } });
    // DSA, art. 17 (relecture du juriste) : l'artisan est prévenu, avec le motif et le moyen de contester. Jamais bloquant.
    if (masquer && !p.masqueeLe) {
      const dest = await this.destinataire(p.companyId);
      if (dest) {
        await this.emails
          .send({
            to: dest,
            subject: "Votre page Mobiiz a été masquée",
            text: [
              "Bonjour,",
              "",
              `Votre page ${this.config.webAppUrl}/e/${p.adresse} a été masquée par l'équipe Mobiiz : elle n'est plus visible du public.`,
              `Motif : ${nettoyer(motif, 300) ?? "non respect des conditions d'utilisation"}.`,
              "",
              "Si vous pensez que c'est une erreur, répondez à cet e-mail ou écrivez à contact@mobiiz.fr : nous réexaminerons la décision.",
              "",
              "L'équipe Mobiiz",
            ].join("\n"),
          })
          .catch((err) => this.logger.warn({ err: String(err) }, "page_masquee_email"));
      }
    }
    return { companyId: p.companyId, adresses: await this.adressesARafraichir(p.companyId) };
  }

  /**
   * LE MÉNAGE DE LA NUIT (relecture du juriste, 16 novembre 2026) : traces du formulaire de contact après 30 jours,
   * empreintes d'IP des signalements après 30 jours, signalements après 12 mois ; et les fichiers du stockage dont la photo
   * n'existe plus (compte supprimé : ses lignes partent avec l'entreprise, ses fichiers ici, la nuit suivante).
   */
  async menage(maintenant = this.now()): Promise<{ contacts: number; signalements: number; empreintes: number; fichiers: number }> {
    const jours = (n: number) => new Date(maintenant.getTime() - n * 86_400_000);
    const contacts = await this.prisma.contactPage.deleteMany({ where: { createdAt: { lt: jours(30) } } });
    const empreintes = await this.prisma.signalementPage.updateMany({ where: { createdAt: { lt: jours(30) }, ipHash: { not: null } }, data: { ipHash: null } });
    const signalements = await this.prisma.signalementPage.deleteMany({ where: { createdAt: { lt: jours(365) } } });
    const fichiers = await this.stockage.lister("pages/");
    const ids = [...new Set(fichiers.map((f) => f.cle.split("/")[2]).filter((x): x is string => !!x && isUuid(x)))];
    const vivantes = new Set((await this.prisma.photoPage.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id));
    // Une photo à peine créée peut être en cours de dépôt : on ne touche qu'aux dossiers sans ligne.
    const orphelins = fichiers.filter((f) => !vivantes.has(f.cle.split("/")[2] ?? ""));
    for (let i = 0; i < orphelins.length; i += 500) await this.stockage.supprimer(orphelins.slice(i, i + 500).map((f) => f.url));
    return { contacts: contacts.count, signalements: signalements.count, empreintes: empreintes.count, fichiers: orphelins.length };
  }

  async traiterSignalement(id: string) {
    if (!isUuid(id)) throw notFound("Signalement");
    const r = await this.prisma.signalementPage.updateMany({ where: { id, traiteLe: null }, data: { traiteLe: this.now() } });
    if (!r.count && !(await this.prisma.signalementPage.count({ where: { id } }))) throw notFound("Signalement");
    return { traite: true };
  }
}

export { THEMES_METIER };
