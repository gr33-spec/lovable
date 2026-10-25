import { createHash, randomBytes } from "node:crypto";
import {
  ACCORD_IDENTITE,
  BUTS_DEMANDE,
  NOM_APP,
  PHRASE_COMPTE_APRES_REPONSE,
  blocLienChiffrage,
  clotureDeLaDemande,
  comparerLesReponses,
  debutHistorique,
  finDeValidite,
  mailRelanceDemandePerso,
  mesPrix,
  cleDeMesPrix,
  offreValide,
  phraseDernierPrix,
  relanceDue,
  resultatsNegoce,
  validiteAcceptee,
  zoneDuCodePostal,
  VALIDITE_MIN_JOURS,
  type ButDemande,
  type LigneDemandee,
  type PrixRecu,
  type ReponseNegocePerso,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import type { PriceRequestsService } from "../../price-requests/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { DroitsService } from "./droits.service.js";

/**
 * LA DEMANDE PERSO (Greg, 25 octobre 2026, recentrage : « le cœur, immédiat, sans cycle »), côté serveur. Elle s'appuie
 * sur la demande de devis existante (§43, §45 : le même mail, le même PDF, l'envoi fiable) et y ajoute :
 * - le BUT (« Chiffrer un chantier » ou « Commander ») et l'ACCORD de l'artisan pour transmettre son identité ;
 * - le choix des négoces : ses habituels (carnet), ceux de la zone (inscrits), ou un nouveau par e-mail ;
 * - un lien de CHIFFRAGE EN LIGNE SANS COMPTE par destinataire (haché en base) : prix par ligne, livraison, délai,
 *   validité fixée par le négoce (7 jours au moins), ou « Je ne chiffre pas » ; après la première réponse, l'invitation
 *   à créer son compte (le parcours d'inscription existant) ;
 * - la COMPARAISON livraison comprise, la RELANCE à 48 h ouvrées, la CLÔTURE à la date de besoin ;
 * - « COMMANDER » sur une réponse : bon de commande au négoce, suivi Reçue → Confirmée → Livrée ;
 * - « MES PRIX » : les prix reçus et payés par CET artisan, jamais ceux d'un autre.
 * En gratuit, un seul négoce par demande ; en payant, cinq (`DroitsService`).
 */

const hacher = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const nombre = (q: unknown): number | null => {
  if (q === null || q === undefined) return null;
  const n = Number(String(q).replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n).replace(/\u202f|\u00a0/g, " ");
const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);

export type NegoceChoisi = { supplierId: string } | { negoceId: string } | { nom: string; email: string };

export interface EnvoiDemandePerso {
  but: ButDemande;
  accord: boolean;
  negoces: NegoceChoisi[];
  dateBesoin: Date | null;
  message: string | null;
  articles?: string[];
}

interface LigneDeDemande {
  designation: string;
  quantity: string | null;
  unit: string | null;
}

export class DemandePersoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demandes: Pick<PriceRequestsService, "create" | "send" | "deliversEmail">,
    private readonly droits: Pick<DroitsService, "exiger" | "droits">,
    private readonly inviter: (negoce: { id: string; email: string; siret: string | null; nom: string; compteId: string | null }) => Promise<string>,
    private readonly mailer: TransactionalEmailSender,
    private readonly cfg: { webAppUrl: string },
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* ------------------------------------------------------------------------------------------------- l'envoi (artisan) */

  /** Les négoces qu'on lui propose : ses habituels (carnet) et les négoces inscrits de la zone du chantier. */
  async negocesProposes(tenant: TenantContext, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId: tenant.companyId }, select: { address: true, company: { select: { address: true } } } });
    if (!project) throw notFound("Project");
    const zone = zoneDuCodePostal(project.address) ?? zoneDuCodePostal(project.company.address);
    const [habituels, droits] = await Promise.all([
      this.prisma.supplier.findMany({ where: { companyId: tenant.companyId, archivedAt: null }, select: { id: true, name: true, email: true, negoceId: true }, orderBy: { name: "asc" } }),
      this.droits.droits(tenant.companyId),
    ]);
    const deja = new Set(habituels.map((h) => h.email.toLowerCase()));
    const zoneNegoces = zone
      ? (await this.prisma.negoce.findMany({ where: { departement: zone, stopLe: null, compteId: { not: null }, compte: { inscritLe: { not: null } } }, select: { id: true, nom: true, email: true, generaliste: true, familles: true }, orderBy: { nom: "asc" } })).filter((n) => !deja.has(n.email.toLowerCase()))
      : [];
    return {
      zone,
      max: droits.negocesParDemande,
      formule: droits.formule,
      accord: ACCORD_IDENTITE,
      habituels: habituels.map((h) => ({ supplierId: h.id, nom: h.name, email: h.email })),
      // Le négoce ne se catégorise que lui-même (généraliste, spécialiste de ses familles) ; on n'affiche jamais son e-mail.
      zoneNegoces: zoneNegoces.map((n) => ({ negoceId: n.id, nom: n.nom, generaliste: n.generaliste, familles: n.familles })),
    };
  }

  async envoyer(tenant: TenantContext, projectId: string, input: EnvoiDemandePerso) {
    assertCanWrite(tenant);
    if (!input.accord) throw validationFailed("Identity consent required", { reason: "accord_requis" });
    if (!BUTS_DEMANDE.includes(input.but)) throw validationFailed("Unknown goal", { reason: "but_inconnu" });
    if (input.negoces.length === 0) throw validationFailed("Choose at least one supplier", { reason: "aucun_negoce" });
    await this.droits.exiger(tenant.companyId, { type: "envoi", negoces: input.negoces.length });
    const supplierIds = [...new Set(await Promise.all(input.negoces.map((n) => this.fournisseurDe(tenant, n))))];
    const maintenant = this.now();
    const vue = await this.demandes.create(tenant, projectId, { supplierIds, message: input.message, dueDate: input.dateBesoin, ...(input.articles?.length ? { articles: input.articles } : {}) });
    await this.prisma.priceRequest.update({ where: { id: vue.id }, data: { but: input.but, accordIdentiteLe: maintenant, closLe: clotureDeLaDemande(maintenant, input.dateBesoin) } });
    if (this.demandes.deliversEmail) for (const r of vue.recipients) await this.demandes.send(tenant, r.id);
    return this.vue(tenant, vue.id);
  }

  /** Un négoce choisi devient un fournisseur du carnet (une seule fois par e-mail). */
  private async fournisseurDe(tenant: TenantContext, n: NegoceChoisi): Promise<string> {
    if ("supplierId" in n) {
      const s = await this.prisma.supplier.findFirst({ where: { id: n.supplierId, companyId: tenant.companyId, archivedAt: null }, select: { id: true } });
      if (!s) throw notFound("Supplier");
      return s.id;
    }
    const cible = "negoceId" in n ? await this.prisma.negoce.findFirst({ where: { id: n.negoceId, stopLe: null }, select: { id: true, nom: true, email: true } }) : { id: null, nom: n.nom.trim(), email: n.email.trim().toLowerCase() };
    if (!cible) throw notFound("Negoce");
    const existant = await this.prisma.supplier.findFirst({ where: { companyId: tenant.companyId, archivedAt: null, email: { equals: cible.email, mode: "insensitive" } }, select: { id: true, negoceId: true } });
    if (existant) {
      if (cible.id && !existant.negoceId) await this.prisma.supplier.update({ where: { id: existant.id }, data: { negoceId: cible.id } });
      return existant.id;
    }
    const cree = await this.prisma.supplier.create({ data: { companyId: tenant.companyId, name: cible.nom, email: cible.email, ...(cible.id ? { negoceId: cible.id } : {}) }, select: { id: true } });
    return cree.id;
  }

  /** Branché sur l'envoi du mail (§43) : le but et le lien de chiffrage propre au destinataire. */
  async complement(requestId: string, recipientId: string): Promise<string | null> {
    const r = await this.prisma.priceRequest.findUnique({ where: { id: requestId }, select: { but: true } });
    if (!r?.but) return null;
    const jeton = randomBytes(24).toString("base64url");
    const dest = await this.prisma.priceRequestRecipient.update({ where: { id: recipientId }, data: { tokenHash: hacher(jeton) }, select: { supplier: { select: { negoceId: true } } } });
    if (dest.supplier.negoceId) await this.prisma.priceRequestRecipient.update({ where: { id: recipientId }, data: { negoceId: dest.supplier.negoceId } });
    return blocLienChiffrage({ but: r.but as ButDemande, lien: `${this.cfg.webAppUrl}/chiffrer/${jeton}`, nomApp: NOM_APP });
  }

  /* --------------------------------------------------------------------------------------- la vue et la comparaison */

  private lignes(lines: unknown): LigneDemandee[] {
    return ((lines as LigneDeDemande[] | null) ?? []).map((l, i) => ({ cle: String(i), designation: l.designation, quantite: nombre(l.quantity) ?? 0, unite: l.unit ?? "" }));
  }

  private async demandeDe(tenant: TenantContext, requestId: string) {
    const d = await this.prisma.priceRequest.findFirst({
      where: { id: requestId, companyId: tenant.companyId },
      include: { recipients: { include: { supplier: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }, project: { select: { name: true } } },
    });
    if (!d) throw notFound("PriceRequest");
    return d;
  }

  /** La demande, ses réponses comparées livraison comprise, et le repère « Ton dernier prix » sur chaque ligne. */
  async vue(tenant: TenantContext, requestId: string) {
    const d = await this.demandeDe(tenant, requestId);
    const maintenant = this.now();
    const lignes = this.lignes(d.lines);
    const reponses: ReponseNegocePerso[] = d.recipients
      .filter((r) => r.reponduLe && r.prix)
      .map((r) => ({ negoceId: r.id, nom: r.supplier.name, prix: r.prix as Record<string, number>, livraisonHt: Number(r.livraisonHt ?? 0), delaiJours: r.delaiJours, validiteJours: r.validiteJours ?? VALIDITE_MIN_JOURS, deposeLe: r.reponduLe! }));
    const comparees = comparerLesReponses(lignes.filter((l) => l.quantite > 0), reponses, maintenant);
    const reperes = await this.reperesDeMesPrix(tenant.companyId);
    const commande = d.recipients.find((r) => r.commandeLe);
    return {
      id: d.id,
      chantier: d.project.name,
      but: d.but,
      dateBesoin: d.dueDate,
      closLe: d.closLe,
      close: !!d.closLe && maintenant >= d.closLe,
      lignes: lignes.map((l) => ({ ...l, repere: reperes.get(cleDeMesPrix(l.designation, l.unite)) ?? null })),
      destinataires: d.recipients.map((r) => ({
        id: r.id,
        nom: r.supplier.name,
        statut: r.refuseLe ? "refuse" : r.reponduLe ? "repondu" : r.relanceLe ? "relance" : r.status === "sent" ? "envoye" : "a_envoyer",
        suivi: r.suivi,
      })),
      offres: comparees.map((o) => ({ ...o, recipientId: o.negoceId, valideJusquau: o.valideJusquau.toISOString() })),
      commande: commande ? { recipientId: commande.id, nom: commande.supplier.name, suivi: commande.suivi, commandeLe: commande.commandeLe } : null,
    };
  }

  /** Les demandes perso d'un chantier. */
  async duChantier(tenant: TenantContext, projectId: string) {
    const ids = await this.prisma.priceRequest.findMany({ where: { companyId: tenant.companyId, projectId, but: { not: null } }, select: { id: true }, orderBy: { createdAt: "desc" } });
    return Promise.all(ids.map((i) => this.vue(tenant, i.id)));
  }

  /* ---------------------------------------------------------------------------------------------- la commande (artisan) */

  async commander(tenant: TenantContext, requestId: string, recipientId: string) {
    assertCanWrite(tenant);
    const d = await this.demandeDe(tenant, requestId);
    if (d.recipients.some((r) => r.commandeLe)) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    const r = d.recipients.find((x) => x.id === recipientId);
    if (!r?.reponduLe || !r.prix) throw validationFailed("No offer from this supplier", { reason: "sans_offre" });
    const maintenant = this.now();
    if (!offreValide(r.reponduLe, r.validiteJours ?? VALIDITE_MIN_JOURS, maintenant)) throw new DomainError("conflict", "Offer expired", { reason: "offre_expiree" });
    const prix = r.prix as Record<string, number>;
    const lignes = this.lignes(d.lines).filter((l) => prix[l.cle] !== undefined && l.quantite > 0);
    const totalLignes = lignes.reduce((s, l) => s + prix[l.cle]! * l.quantite, 0);
    const livraison = Number(r.livraisonHt ?? 0);
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true, phone: true, address: true } });
    const company = c ? { ...c, email: await this.emailDe(tenant.companyId) } : null;
    const project = await this.prisma.project.findUnique({ where: { id: d.projectId }, select: { address: true } });
    await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { commandeLe: maintenant, suivi: "recue" } });
    // Le bon de commande part au négoce (vouvoiement), avec le lien pour confirmer ; « Répondre » écrit à l'artisan.
    const jeton = randomBytes(24).toString("base64url");
    await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { tokenHash: hacher(jeton) } });
    await this.mailer.send({
      to: r.supplier.email,
      subject: `Bon de commande de ${company?.name ?? "votre client"} (${euros(totalLignes + livraison)} HT livré)`,
      text: [
        "Bonjour,",
        "",
        `${company?.name ?? "Votre client"} commande sur votre offre du ${jourFr(r.reponduLe)} :`,
        "",
        ...lignes.map((l) => `- ${l.designation} : ${String(l.quantite).replace(".", ",")} ${l.unite} × ${euros(prix[l.cle]!)} HT`),
        `- Livraison : ${livraison > 0 ? `${euros(livraison)} HT` : "offerte"}`,
        "",
        `Total : ${euros(totalLignes + livraison)} HT livré.`,
        project?.address ? `Livraison : ${project.address}.` : "",
        company?.phone ? `Contact : ${company.phone}${company.email ? `, ${company.email}` : ""}.` : company?.email ? `Contact : ${company.email}.` : "",
        "",
        "Confirmez la commande d'un clic :",
        `${this.cfg.webAppUrl}/chiffrer/${jeton}`,
        "",
        `Facturation et paiement comme d'habitude, sur le compte du client chez vous. Envoyé avec ${NOM_APP}.`,
      ]
        .filter((l, i, t) => !(l === "" && t[i - 1] === ""))
        .join("\n"),
      ...(company?.email ? { replyTo: company.email } : {}),
      mustDeliver: true,
    });
    return this.vue(tenant, requestId);
  }

  /** L'artisan dit « Livrée ». */
  async livree(tenant: TenantContext, requestId: string, recipientId: string) {
    assertCanWrite(tenant);
    const d = await this.demandeDe(tenant, requestId);
    const r = d.recipients.find((x) => x.id === recipientId && x.commandeLe);
    if (!r) throw notFound("Order");
    await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { suivi: "livree", livreLe: this.now() } });
    return this.vue(tenant, requestId);
  }

  /* --------------------------------------------------------------------------------- le chiffrage en ligne (négoce) */

  private async parJeton(jeton: string) {
    if (typeof jeton !== "string" || jeton.length < 20 || jeton.length > 100) throw notFound("Link");
    const r = await this.prisma.priceRequestRecipient.findUnique({
      where: { tokenHash: hacher(jeton) },
      include: { supplier: { select: { name: true, email: true } }, priceRequest: { include: { company: { select: { id: true, name: true, address: true } }, project: { select: { address: true } } } } },
    });
    if (!r?.priceRequest.but) throw notFound("Link");
    return r;
  }

  /** Ce que voit le négoce : le nom de l'artisan (il a donné son accord), la liste, la ville de livraison ; jamais un prix d'un autre. */
  async page(jeton: string) {
    const r = await this.parJeton(jeton);
    const d = r.priceRequest;
    const maintenant = this.now();
    const ville = (d.project.address ?? "").replace(/^.*\b\d{5}\s*/, "").trim() || null;
    return {
      artisan: d.company.name,
      negoce: r.supplier.name,
      but: d.but,
      dateBesoin: d.dueDate,
      ville,
      close: !!d.closLe && maintenant >= d.closLe,
      lignes: this.lignes(d.lines),
      validiteMin: VALIDITE_MIN_JOURS,
      etat: r.commandeLe ? "commande" : r.refuseLe ? "refuse" : r.reponduLe ? "repondu" : "a_chiffrer",
      reponse: r.reponduLe ? { prix: r.prix, livraisonHt: Number(r.livraisonHt ?? 0), delaiJours: r.delaiJours, validiteJours: r.validiteJours, valideJusquau: finDeValidite(r.reponduLe, r.validiteJours ?? VALIDITE_MIN_JOURS) } : null,
      commande: r.commandeLe ? { le: r.commandeLe, suivi: r.suivi } : null,
    };
  }

  async chiffrer(jeton: string, body: { prix: Record<string, number>; livraisonHt: number; delaiJours: number | null; validiteJours: number }) {
    const r = await this.parJeton(jeton);
    const d = r.priceRequest;
    const maintenant = this.now();
    if (d.closLe && maintenant >= d.closLe) throw new DomainError("conflict", "Request closed", { reason: "demande_close" });
    if (r.commandeLe) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    if (!validiteAcceptee(body.validiteJours)) throw validationFailed("Validity of at least 7 days", { reason: "validite_trop_courte", min: VALIDITE_MIN_JOURS });
    const cles = new Set(this.lignes(d.lines).map((l) => l.cle));
    const prix = Object.fromEntries(Object.entries(body.prix).filter(([k, v]) => cles.has(k) && Number.isFinite(v) && v >= 0));
    // Une grille partielle est acceptée ; une réponse vide, non.
    if (Object.keys(prix).length === 0) throw validationFailed("At least one price", { reason: "aucun_prix" });
    const premiere = !r.reponduLe;
    await this.prisma.priceRequestRecipient.update({
      where: { id: r.id },
      data: { prix, livraisonHt: body.livraisonHt, delaiJours: body.delaiJours, validiteJours: body.validiteJours, reponduLe: maintenant, refuseLe: null, status: "received" },
    });
    // L'artisan est prévenu (tutoiement) ; un e-mail, jamais le prix d'un autre négoce.
    const emailArtisan = await this.emailDe(d.company.id);
    if (emailArtisan)
      await this.mailer.send({
        to: emailArtisan,
        subject: `${r.supplier.name} a chiffré ta demande`,
        text: ["Bonjour,", "", `${r.supplier.name} vient de chiffrer ta demande. Compare les offres livraison comprise et commande d'un clic :`, `${this.cfg.webAppUrl}/chantiers/${d.projectId}`, "", NOM_APP].join("\n"),
      }).catch(() => undefined);
    return { fait: true, compte: premiere ? await this.invitationCompte(r.supplier, d.company.address, d.project.address).catch(() => null) : null };
  }

  /** Après la première réponse : le lien d'inscription de l'espace négoce (le parcours existant), sauf compte déjà inscrit. */
  private async invitationCompte(s: { name: string; email: string }, adresseEntreprise: string | null, adresseChantier: string | null): Promise<{ phrase: string; lien: string } | null> {
    const departement = zoneDuCodePostal(adresseChantier) ?? zoneDuCodePostal(adresseEntreprise);
    if (!departement) return null;
    const email = s.email.toLowerCase();
    const inscrit = await this.prisma.compteNegoce.findFirst({ where: { email, inscritLe: { not: null } }, select: { id: true } });
    if (inscrit) return null;
    const negoce = (await this.prisma.negoce.findUnique({ where: { email_departement: { email, departement } } })) ?? (await this.prisma.negoce.create({ data: { nom: s.name, email, departement } }));
    const jeton = await this.inviter({ id: negoce.id, email: negoce.email, siret: negoce.siret, nom: negoce.nom, compteId: negoce.compteId });
    return { phrase: PHRASE_COMPTE_APRES_REPONSE, lien: `${this.cfg.webAppUrl}/negoce/rejoindre/${jeton}` };
  }

  async refuser(jeton: string) {
    const r = await this.parJeton(jeton);
    if (r.commandeLe) throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { refuseLe: this.now(), status: "declined" } });
    return { fait: true };
  }

  /** Le négoce confirme la commande reçue. */
  async confirmer(jeton: string) {
    const r = await this.parJeton(jeton);
    if (!r.commandeLe) throw validationFailed("No order", { reason: "pas_de_commande" });
    if (r.suivi === "recue") await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { suivi: "confirmee", confirmeLe: this.now() } });
    return { fait: true };
  }

  /** L'e-mail de l'entreprise : celui du profil, sinon celui du propriétaire du compte (comme la demande de devis). */
  private async emailDe(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { contactEmail: true, memberships: { where: { role: "owner" }, select: { user: { select: { email: true } } }, take: 1 } } });
    return c?.contactEmail ?? c?.memberships[0]?.user.email ?? null;
  }

  /* ----------------------------------------------------------------------------------- la tâche (relances, clôtures) */

  /** Une relance par négoce sans réponse à 48 h ouvrées, tant que la demande est ouverte. */
  async tache(maintenant = this.now()): Promise<{ relances: number }> {
    const attente = await this.prisma.priceRequestRecipient.findMany({
      where: { reponduLe: null, refuseLe: null, relanceLe: null, status: "sent", priceRequest: { but: { not: null } } },
      include: { supplier: { select: { email: true } }, priceRequest: { select: { closLe: true, company: { select: { name: true } } } } },
      take: 500,
    });
    let relances = 0;
    for (const r of attente) {
      if (!relanceDue({ envoyeLe: r.sentAt ?? r.createdAt, reponduLe: null, relanceLe: null }, maintenant, r.priceRequest.closLe)) continue;
      // Un nouveau lien : l'ancien n'est connu que haché.
      const jeton = randomBytes(24).toString("base64url");
      await this.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { relanceLe: maintenant, tokenHash: hacher(jeton) } });
      const m = mailRelanceDemandePerso({ entreprise: r.priceRequest.company.name, lien: `${this.cfg.webAppUrl}/chiffrer/${jeton}` });
      await this.mailer.send({ to: r.supplier.email, subject: m.objet, text: m.texte }).catch(() => undefined);
      relances++;
    }
    return { relances };
  }

  /* ---------------------------------------------------------------------------------------------------- « Mes prix » */

  /** Les prix reçus (réponses) et payés (commandes) par CETTE entreprise. */
  private async prixDe(companyId: string): Promise<PrixRecu[]> {
    const recus = await this.prisma.priceRequestRecipient.findMany({
      where: { reponduLe: { not: null }, priceRequest: { companyId } },
      select: { prix: true, reponduLe: true, commandeLe: true, supplier: { select: { name: true } }, priceRequest: { select: { lines: true } } },
    });
    const prix: PrixRecu[] = [];
    for (const r of recus) {
      const lignes = this.lignes(r.priceRequest.lines);
      for (const [cle, pu] of Object.entries((r.prix as Record<string, number> | null) ?? {})) {
        const l = lignes.find((x) => x.cle === cle);
        if (l) prix.push({ designation: l.designation, unite: l.unite, prixHt: pu, negoce: r.supplier.name, date: r.commandeLe ?? r.reponduLe!, source: r.commandeLe ? "paye" : "recu" });
      }
    }
    return prix;
  }

  async mesPrix(tenant: TenantContext) {
    const [prix, d] = await Promise.all([this.prixDe(tenant.companyId), this.droits.droits(tenant.companyId)]);
    const depuis = debutHistorique(d, this.now());
    return { formule: d.formule, depuis, articles: mesPrix(prix, depuis).map((a) => ({ ...a, repere: phraseDernierPrix(a) })) };
  }

  /** Le repère « Ton dernier prix pour cet article » par clé (tout l'historique : c'est son propre prix). */
  private async reperesDeMesPrix(companyId: string): Promise<Map<string, string>> {
    return new Map(mesPrix(await this.prixDe(companyId)).map((a) => [a.cle, phraseDernierPrix(a)]));
  }

  /** Le dernier prix unitaire HT payé ou reçu pour une clé de référence stricte (estimation des lignes groupables). */
  async dernierPrixPour(companyId: string): Promise<(cle: string, unite: string) => number | null> {
    const articles = mesPrix(await this.prixDe(companyId));
    return (cle, unite) => articles.find((a) => a.cle === `${cle}#${unite}`)?.dernier.prixHt ?? null;
  }

  /* ---------------------------------------------------------------------------------- « Vos résultats » (négoce) */

  async resultatsNegoce(compteId: string) {
    const compte = await this.prisma.compteNegoce.findUnique({ where: { id: compteId }, select: { email: true } });
    if (!compte) throw notFound("Account");
    const negoces = await this.prisma.negoce.findMany({ where: { compteId }, select: { id: true } });
    const ids = negoces.map((n) => n.id);
    const [perso, grilles, choix] = await Promise.all([
      this.prisma.priceRequestRecipient.findMany({
        where: { OR: [{ negoceId: { in: ids } }, { supplier: { email: { equals: compte.email, mode: "insensitive" } } }], status: { not: "to_send" } },
        select: { reponduLe: true, commandeLe: true, prix: true, livraisonHt: true, priceRequest: { select: { lines: true } } },
      }),
      this.prisma.grilleNegoce.findMany({ where: { negoceId: { in: ids } }, select: { deposeLe: true } }),
      this.prisma.choixArtisan.findMany({ where: { commandeLe: { not: null } }, select: { negoceId: true, totalHt: true, parts: true } }),
    ]);
    let ca = 0;
    let gagnees = 0;
    for (const r of perso.filter((p) => p.commandeLe)) {
      gagnees++;
      const prix = (r.prix as Record<string, number> | null) ?? {};
      ca += this.lignes(r.priceRequest.lines).reduce((s, l) => s + (prix[l.cle] ?? 0) * l.quantite, 0) + Number(r.livraisonHt ?? 0);
    }
    for (const c of choix) {
      const parts = (c.parts as { negoceId: string; totalHt: number }[] | null) ?? null;
      const miennes: number[] = parts ? parts.filter((p) => ids.includes(p.negoceId)).map((p) => Number(p.totalHt)) : ids.includes(c.negoceId) ? [Number(c.totalHt)] : [];
      if (miennes.length) gagnees++;
      ca += miennes.reduce((s, n) => s + n, 0);
    }
    return resultatsNegoce({ demandesRecues: perso.length + grilles.length, reponses: perso.filter((p) => p.reponduLe).length + grilles.filter((g) => g.deposeLe).length, commandesGagnees: gagnees, caHt: ca });
  }
}
