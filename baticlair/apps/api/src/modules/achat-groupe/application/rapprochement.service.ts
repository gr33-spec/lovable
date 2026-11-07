import {
  PHRASE_ENGAGEMENT,
  LIBELLES_NIVEAU,
  PHRASE_COLLECTIF,
  PHRASE_RECHERCHE_RAPPROCHEMENT,
  PHRASE_RESTE_INDIVIDUELLE,
  RAYON_MAX_KM,
  SEUIL_ANONYMAT_DEFAUT,
  comparerBesoins,
  departementsAutour,
  phraseNotificationRapprochement,
  referenceStricte,
  tranche,
  transitionPermise,
  zoneDuCodePostal,
  type BesoinComparable,
  type EtatLigneRapprochement,
  type NiveauRapprochement,
} from "@baticlair/domain";
import { etatsDuChantier, exiger as exigerCycle, faitsDesLignes } from "../../../platform/cycle/lignes.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { NotificationsGroupeService } from "../../../platform/notifications/notifications-artisan.js";
import { signalerException } from "../../../platform/supervision/exceptions.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/**
 * LE RAPPROCHEMENT CONTINU (Greg, 6 novembre 2026, parcours produit, points 7 à 9 et 19) : après la validation de sa
 * liste, l'artisan envoie sa demande individuelle quand il veut ; il peut AUSSI laisser certaines lignes chercher, jusqu'à
 * une date, un besoin compatible d'un autre artisan ou une collecte ouverte. MOBIIZ compare (code, `comparerBesoins`),
 * prévient l'artisan concerné (push + e-mail, une fois, puis une seule relance), et n'ajoute JAMAIS rien à un achat groupé :
 * « Examiner » ouvre le parcours existant, où l'artisan confirme lui-même. Une ligne couverte par une offre acceptée sort
 * de la recherche (pas de double commande). Jamais le nom, la quantité ni le prix d'un autre artisan.
 */

const MODE_AUTO = "automatique";
const OUVERT = "en_collecte";
const ENGAGE = "declare";
const ACTIFS: EtatLigneRapprochement[] = ["disponible", "proposee"];
const JOUR = 86_400_000;
/** La recherche dure au plus 30 jours ; une relance unique deux jours après la notification sans réponse. */
export const RECHERCHE_MAX_JOURS = 30;
export const RELANCE_APRES_JOURS = 2;

interface LigneDeListe {
  key: string;
  designation: string;
  quantite: number;
  unite: string;
}

export interface RapprochementPorts {
  lignesDeListe(tenant: TenantContext, projectId: string): Promise<{ adresse: string | null; lignes: LigneDeListe[] }>;
}

type Ligne = Awaited<ReturnType<PrismaService["ligneRapprochement"]["findFirstOrThrow"]>>;

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Les clés de la liste déjà couvertes par une offre acceptée (« Je retiens ce négoce », ou une commande passée sur une
 * demande perso) : « toutes » quand la demande acceptée portait sur toute la liste. Partagé avec l'achat groupé.
 */
export async function clesCommandees(prisma: PrismaService, companyId: string, projectId: string): Promise<Set<string> | "toutes"> {
  const demandes = await prisma.priceRequest.findMany({
    where: { companyId, projectId, OR: [{ retainedSupplierIds: { isEmpty: false } }, { recipients: { some: { commandeLe: { not: null } } } }] },
    select: { itemKeys: true },
  });
  if (demandes.some((d) => d.itemKeys.length === 0)) return "toutes";
  return new Set(demandes.flatMap((d) => d.itemKeys));
}

const couverte = (cles: Set<string> | "toutes", key: string) => cles === "toutes" || cles.has(key);

export class RapprochementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ports: RapprochementPorts,
    private readonly notifications: NotificationsGroupeService | null,
    private readonly cfg: { seuilAnonymat: number } = { seuilAnonymat: SEUIL_ANONYMAT_DEFAUT },
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* --------------------------------------------------------------------------------- la liste, ligne par ligne */

  /** Le cycle de vie de chaque ligne du chantier (§19) : son état et les gestes encore permis. */
  async cycle(tenant: TenantContext, projectId: string) {
    if (!isUuid(projectId)) throw notFound("Project");
    const { lignes } = await this.ports.lignesDeListe(tenant, projectId);
    return { lignes: await etatsDuChantier(this.prisma, tenant.companyId, projectId, lignes, this.now()) };
  }

  /** Ce que chaque ligne de la liste peut faire : partir tout de suite (toujours), rejoindre une collecte qui correspond exactement, ou chercher. */
  async analyser(tenant: TenantContext, projectId: string) {
    if (!isUuid(projectId)) throw notFound("Project");
    const { adresse, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    const departement = zoneDuCodePostal(adresse);
    const maintenant = this.now();
    await this.synchroniser(maintenant, tenant.companyId);
    const deja = await this.prisma.ligneRapprochement.findMany({ where: { companyId: tenant.companyId, projectId } });
    const commandees = await clesCommandees(this.prisma, tenant.companyId, projectId);
    const collectes = departement ? await this.collectesOuvertes(departement, maintenant, tenant.companyId) : [];
    const faits = await faitsDesLignes(this.prisma, tenant.companyId, projectId, maintenant);
    return {
      phrase: PHRASE_RECHERCHE_RAPPROCHEMENT,
      resteIndividuelle: PHRASE_RESTE_INDIVIDUELLE,
      collectif: PHRASE_COLLECTIF,
      departement,
      rechercheMaxJours: RECHERCHE_MAX_JOURS,
      // Rejoindre une collecte depuis la carte (lot 3) : la case d'engagement, la même phrase que l'achat groupé.
      engagement: PHRASE_ENGAGEMENT,
      lignes: lignes.map((l) => {
        const r = referenceStricte(l.designation);
        const recherche = deja.find((d) => d.articleKey === l.key);
        const besoin: BesoinComparable = { designation: l.designation, unite: l.unite, departement, dateMax: null, modeLivraison: "livraison" };
        const collecte = r.ok ? collectes.find((c) => c.lignes.some((cl) => comparerBesoins(besoin, cl).niveau === "exacte")) : undefined;
        return {
          key: l.key,
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          reference: r.ok ? r.reference.libelle : null,
          rapprochable: r.ok && !!departement && !couverte(commandees, l.key) && !faits(l.key).groupe,
          raison: couverte(commandees, l.key) ? "Une offre est déjà acceptée pour cette ligne." : faits(l.key).groupe ? `Déjà dans l'achat groupé « ${faits(l.key).groupe!.titre} ».` : !r.ok ? ("raison" in r && r.raison === "accessoire" ? "Petit accessoire : il part en demande individuelle." : "Article pas assez précis pour un rapprochement sûr.") : !departement ? "Indique l'adresse du chantier avec son code postal." : null,
          collecte: collecte && !faits(l.key).groupe ? { id: collecte.id, titre: collecte.libelle, clotureLe: collecte.clotureLe.toISOString(), dateBesoin: collecte.dateBesoin ? jourIso(collecte.dateBesoin) : null } : null,
          recherche: recherche ? { id: recherche.id, statut: recherche.statut, jusquau: recherche.jusquau.toISOString(), modeLivraison: recherche.modeLivraison === "retrait" ? "retrait" : "livraison", rayonKm: recherche.rayonKm, dateMax: recherche.dateMax ? jourIso(recherche.dateMax) : null } : null,
        };
      }),
    };
  }

  /** L'artisan laisse les lignes choisies chercher jusqu'à une date. Refait le même geste : rien de plus (idempotent). */
  async rendreDisponible(tenant: TenantContext, projectId: string, d: { articles: string[]; jusquau: Date; dateMax: Date | null; modeLivraison: "livraison" | "retrait"; rayonKm?: number }) {
    assertCanWrite(tenant);
    if (!isUuid(projectId)) throw notFound("Project");
    const maintenant = this.now();
    if (d.jusquau.getTime() <= maintenant.getTime() + 3_600_000 || d.jusquau.getTime() > maintenant.getTime() + RECHERCHE_MAX_JOURS * JOUR)
      throw validationFailed("Search date out of range", { reason: "date_recherche", message: `Choisis une date entre demain et dans ${RECHERCHE_MAX_JOURS} jours.` });
    const { adresse, lignes } = await this.ports.lignesDeListe(tenant, projectId);
    const departement = zoneDuCodePostal(adresse);
    if (!departement)
      await signalerException(this.prisma, { type: "adresse_incertaine", cle: `${tenant.companyId}:${projectId}`, titre: "Adresse de chantier incertaine (recherche de besoins compatibles)", detail: "Code postal manquant ou illisible : la recherche est refusée tant que l'adresse n'est pas précisée.", companyId: tenant.companyId });
    if (!departement) throw validationFailed("A site address with a postcode is required", { reason: "livraison_requise", message: "Indique l'adresse du chantier avec son code postal." });
    const commandees = await clesCommandees(this.prisma, tenant.companyId, projectId);
    // Le cycle de vie (§19) : une ligne déjà dans un achat groupé ne cherche pas d'autre rapprochement.
    const faits = await faitsDesLignes(this.prisma, tenant.companyId, projectId, maintenant);
    const choisies = d.articles.map((key) => {
      const l = lignes.find((x) => x.key === key);
      if (!l) throw validationFailed("Unknown line", { reason: "ligne_inconnue" });
      if (couverte(commandees, key)) throw new DomainError("conflict", "An offer is already accepted for this line", { reason: "offre_deja_acceptee", message: `« ${l.designation} » est déjà couverte par une offre acceptée : pas de recherche, pas de double commande.` });
      exigerCycle(faits(key), "chercher", l.designation);
      const r = referenceStricte(l.designation);
      if (!r.ok) throw validationFailed("Line cannot be matched safely", { reason: "ligne_non_rapprochable", message: `« ${l.designation} » n'est pas assez précise pour un rapprochement sûr.` });
      return { l, ref: r.reference };
    });
    if (choisies.length === 0) throw validationFailed("Nothing chosen", { reason: "rien_choisi", message: "Choisis au moins une ligne." });
    for (const { l, ref } of choisies) {
      const data = { designation: l.designation, cle: ref.cle, type: ref.type, libelle: ref.libelle, famille: ref.famille, quantite: l.quantite, unite: l.unite, departement, modeLivraison: d.modeLivraison, rayonKm: d.rayonKm ?? 0, dateMax: d.dateMax, jusquau: d.jusquau };
      const existante = await this.prisma.ligneRapprochement.findUnique({ where: { companyId_projectId_articleKey: { companyId: tenant.companyId, projectId, articleKey: l.key } } });
      if (!existante)
        // Double clic : la seconde création tombe sur la clé unique ; la ligne existe déjà, c'est fait (jamais une 500).
        await this.prisma.ligneRapprochement.create({ data: { ...data, companyId: tenant.companyId, projectId, articleKey: l.key } }).catch((e: unknown) => {
          if (!(e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002")) throw e;
        });
      else if (existante.statut === "rejointe") continue;
      else await this.prisma.ligneRapprochement.update({ where: { id: existante.id }, data: { ...data, ...(ACTIFS.includes(existante.statut as EtatLigneRapprochement) ? {} : { statut: "disponible", retraitMotif: null, retireLe: null }) } });
    }
    await this.rechercher(maintenant, departement);
    return this.analyser(tenant, projectId);
  }

  async retirer(tenant: TenantContext, ligneId: string) {
    assertCanWrite(tenant);
    const l = await this.ligneDe(tenant, ligneId);
    if (l.statut === "retiree") return { retiree: true };
    if (!transitionPermise(l.statut as EtatLigneRapprochement, "retiree")) throw new DomainError("conflict", "Line cannot be withdrawn", { reason: "transition_interdite" });
    await this.prisma.ligneRapprochement.update({ where: { id: l.id }, data: { statut: "retiree", retraitMotif: "artisan", retireLe: this.now() } });
    return { retiree: true };
  }

  /* ---------------------------------------------------------------------------------- les propositions */

  /** Les lignes en recherche et leurs propositions : niveau, écarts, secteur, clôture ; jamais un nom ni une quantité d'autrui. */
  async mesRapprochements(tenant: TenantContext) {
    const maintenant = this.now();
    await this.synchroniser(maintenant, tenant.companyId);
    const lignes = await this.prisma.ligneRapprochement.findMany({
      where: { companyId: tenant.companyId, OR: [{ statut: { in: ACTIFS } }, { updatedAt: { gt: new Date(maintenant.getTime() - 14 * JOUR) } }] },
      include: { propositions: { orderBy: { score: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      lignes: await Promise.all(
        lignes.map(async (l) => ({
          id: l.id,
          projectId: l.projectId,
          designation: l.designation,
          libelle: l.libelle,
          statut: l.statut,
          jusquau: l.jusquau.toISOString(),
          retraitMotif: l.retraitMotif,
          propositions: await Promise.all(l.propositions.map((p) => this.vueProposition(l, p))),
        })),
      ),
    };
  }

  private async vueProposition(l: Ligne, p: { id: string; cible: string; niveau: string; differences: string[]; reponse: string | null }) {
    const [genre, id] = p.cible.split(":") as ["ligne" | "collecte", string];
    let collecte: { titre: string; clotureLe: string } | null = null;
    let entreprises = 2;
    if (genre === "collecte") {
      const c = await this.prisma.regroupementNegocie.findUnique({ where: { id }, select: { libelle: true, clotureLe: true } });
      collecte = c ? { titre: c.libelle, clotureLe: (c.clotureLe ?? this.now()).toISOString() } : null;
      entreprises = 1 + new Set((await this.prisma.besoinNegocie.findMany({ where: { regroupementId: id, statut: ENGAGE }, select: { companyId: true } })).map((b) => b.companyId)).size;
    }
    // Agrégé et seulement à partir du seuil d'anonymat : à deux, un total révélerait la quantité de l'autre.
    let total: string | null = null;
    if (entreprises >= this.cfg.seuilAnonymat && genre === "collecte") {
      const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { regroupementId: id, besoin: { statut: ENGAGE } }, select: { designationOrigine: true, unite: true, quantite: true } });
      const somme = lignes.filter((x) => comparerBesoins(this.comparable(l), { designation: x.designationOrigine, unite: x.unite, departement: l.departement, dateMax: null, modeLivraison: l.modeLivraison as "livraison" }).niveau !== "incompatible").reduce((s, x) => s + Number(x.quantite), Number(l.quantite));
      total = `Ensemble, plus de ${tranche(somme).toLocaleString("fr-FR")} ${l.unite}`;
    }
    return {
      id: p.id,
      niveau: p.niveau as NiveauRapprochement,
      libelleNiveau: LIBELLES_NIVEAU[p.niveau as NiveauRapprochement],
      differences: p.differences,
      collecte,
      zone: `Département ${l.departement}`,
      entreprises: entreprises >= this.cfg.seuilAnonymat ? `${entreprises} entreprises` : `moins de ${this.cfg.seuilAnonymat} entreprises`,
      total,
      reponse: p.reponse,
    };
  }

  /** « Examiner » (ouvre le parcours où l'artisan confirme lui-même) ou « Pas intéressé ». Une réponse arrête les relances. */
  async repondre(tenant: TenantContext, propositionId: string, reponse: "examinee" | "refusee") {
    assertCanWrite(tenant);
    if (!isUuid(propositionId)) throw notFound("Proposition");
    const p = await this.prisma.propositionRapprochement.findFirst({ where: { id: propositionId, companyId: tenant.companyId }, include: { ligne: true } });
    if (!p) throw notFound("Proposition");
    if (!p.reponse || p.reponse !== reponse) await this.prisma.propositionRapprochement.update({ where: { id: p.id }, data: { reponse, reponduLe: this.now() } });
    if (reponse === "refusee") {
      const restantes = await this.prisma.propositionRapprochement.count({ where: { ligneId: p.ligneId, reponse: null } });
      if (restantes === 0 && p.ligne.statut === "proposee") await this.prisma.ligneRapprochement.update({ where: { id: p.ligneId }, data: { statut: "disponible" } });
      return { reponse };
    }
    const [genre, id] = p.cible.split(":");
    const achat = genre === "collecte" ? await this.prisma.regroupementNegocie.findUnique({ where: { id: id! }, select: { id: true, libelle: true } }) : null;
    return { reponse, href: `/chantiers/${p.ligne.projectId}`, achat: achat ? { id: achat.id, titre: achat.libelle } : null, articleKey: p.ligne.articleKey };
  }

  /** Les actions « À faire » du rapprochement : propositions à examiner, et une ligne commandée seule mais encore dans une collecte. */
  async actions(tenant: TenantContext) {
    const maintenant = this.now();
    await this.synchroniser(maintenant, tenant.companyId);
    const propositions = await this.prisma.propositionRapprochement.findMany({ where: { companyId: tenant.companyId, reponse: null, ligne: { statut: { in: ACTIFS } } }, include: { ligne: { select: { libelle: true } } }, orderBy: { createdAt: "asc" }, take: 10 });
    const items = propositions.map((p) => ({ cle: `rapprochement:${p.id}`, genre: "rapprochement" as const, texte: `${LIBELLES_NIVEAU[p.niveau as NiveauRapprochement]} pour « ${p.ligne.libelle} » : à examiner`, href: "/achats-groupes?vue=mes-groupes" }));
    // Double commande : une ligne engagée dans une collecte encore ouverte, alors qu'une offre individuelle la couvre déjà.
    const engagees = await this.prisma.ligneAchatGroupe.findMany({ where: { companyId: tenant.companyId, projectId: { not: null }, articleKey: { not: null }, besoin: { statut: ENGAGE, regroupement: { statut: OUVERT } } }, select: { id: true, projectId: true, articleKey: true, libelle: true, besoinId: true } });
    for (const e of engagees) {
      if (couverte(await clesCommandees(this.prisma, tenant.companyId, e.projectId!), e.articleKey!))
        items.push({ cle: `double:${e.id}`, genre: "rapprochement", texte: `« ${e.libelle} » est déjà commandé en demande individuelle : retire-le de l'achat groupé`, href: `/achats-groupes/${e.besoinId}` });
    }
    // Le parcours du négoce (6 novembre 2026) : une question d'un négoce attend la réponse de l'artisan.
    const questions = await this.prisma.priceRequestRecipient.findMany({
      where: { precisionQuestion: { not: null }, precisionReponse: null, priceRequest: { companyId: tenant.companyId } },
      select: { id: true, supplier: { select: { name: true } }, priceRequest: { select: { projectId: true } } },
      take: 10,
    });
    for (const q of questions) items.push({ cle: `precision:${q.id}`, genre: "rapprochement", texte: `${q.supplier.name} a besoin d'une précision`, href: `/chantiers/${q.priceRequest.projectId}?onglet=suivi` });
    return { items };
  }

  /* ---------------------------------------------------------------------------------- la recherche */

  /** Lignes expirées, couvertes par une offre acceptée (pas de double commande) ou rejointes dans une collecte. */
  async synchroniser(maintenant: Date, companyId?: string) {
    const where = { statut: { in: ACTIFS }, ...(companyId ? { companyId } : {}) };
    await this.prisma.ligneRapprochement.updateMany({ where: { ...where, jusquau: { lte: maintenant } }, data: { statut: "expiree" } });
    const actives = await this.prisma.ligneRapprochement.findMany({ where });
    const parProjet = new Map<string, Set<string> | "toutes">();
    for (const l of actives) {
      const k = `${l.companyId}:${l.projectId}`;
      if (!parProjet.has(k)) parProjet.set(k, await clesCommandees(this.prisma, l.companyId, l.projectId));
      if (couverte(parProjet.get(k)!, l.articleKey)) {
        await this.prisma.ligneRapprochement.update({ where: { id: l.id }, data: { statut: "retiree", retraitMotif: "offre_acceptee", retireLe: maintenant } });
        continue;
      }
      const rejointe = await this.prisma.ligneAchatGroupe.findFirst({ where: { companyId: l.companyId, projectId: l.projectId, articleKey: l.articleKey, besoin: { statut: ENGAGE } }, select: { id: true } });
      if (rejointe) await this.prisma.ligneRapprochement.update({ where: { id: l.id }, data: { statut: "rejointe" } });
    }
  }

  private comparable(l: Pick<Ligne, "designation" | "unite" | "departement" | "dateMax" | "modeLivraison" | "rayonKm">): BesoinComparable {
    return { designation: l.designation, unite: l.unite, departement: l.departement, dateMax: l.dateMax ? jourIso(l.dateMax) : null, modeLivraison: l.modeLivraison === "retrait" ? "retrait" : "livraison", rayonKm: l.rayonKm };
  }

  private async collectesOuvertes(departement: string, maintenant: Date, saufCompanyId?: string) {
    const collectes = await this.prisma.regroupementNegocie.findMany({ where: { mode: MODE_AUTO, statut: OUVERT, departement, clotureLe: { gt: maintenant } }, select: { id: true, libelle: true, clotureLe: true, dateBesoinMin: true, modeLivraison: true } });
    const out: { id: string; libelle: string; clotureLe: Date; dateBesoin: Date | null; participants: Set<string>; lignes: BesoinComparable[] }[] = [];
    for (const c of collectes) {
      const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { regroupementId: c.id, besoin: { statut: ENGAGE } }, select: { companyId: true, designationOrigine: true, unite: true } });
      const participants = new Set(lignes.map((l) => l.companyId));
      out.push({
        id: c.id,
        libelle: c.libelle,
        clotureLe: c.clotureLe!,
        dateBesoin: c.dateBesoinMin,
        participants,
        lignes: lignes.filter((l) => l.companyId !== saufCompanyId).map((l) => ({ designation: l.designationOrigine, unite: l.unite, departement, dateMax: c.dateBesoinMin ? jourIso(c.dateBesoinMin) : null, modeLivraison: c.modeLivraison === "retrait" ? ("retrait" as const) : ("livraison" as const), rayonKm: RAYON_MAX_KM })),
      });
    }
    return out;
  }

  /**
   * La recherche (à chaque nouvelle ligne disponible, et chaque jour par la tâche) : chaque ligne active est comparée aux
   * lignes actives des AUTRES entreprises du même secteur et aux collectes ouvertes ; un rapprochement nouveau est
   * proposé à chaque entreprise concernée (une ligne de proposition chacune, unique), qui est prévenue une fois. Une seule
   * relance après deux jours sans réponse ; plus rien dès qu'elle a répondu.
   */
  async rechercher(maintenant = this.now(), departement?: string) {
    await this.synchroniser(maintenant);
    const actives = await this.prisma.ligneRapprochement.findMany({ where: { statut: { in: ACTIFS }, jusquau: { gt: maintenant }, ...(departement ? { departement: { in: departementsAutour(departement, RAYON_MAX_KM) } } : {}) } });
    const nouvelles: { companyId: string; ligne: Ligne; niveau: NiveauRapprochement; collecte: boolean }[] = [];
    const proposer = async (ligne: Ligne, cible: string, niveau: NiveauRapprochement, differences: string[], score: number, collecte: boolean) => {
      const existe = await this.prisma.propositionRapprochement.findUnique({ where: { ligneId_cible: { ligneId: ligne.id, cible } } });
      if (existe) return;
      try {
        await this.prisma.propositionRapprochement.create({ data: { ligneId: ligne.id, companyId: ligne.companyId, cible, niveau, differences, score } });
      } catch {
        return; // créée en même temps par une autre recherche : la contrainte unique protège du doublon
      }
      if (ligne.statut === "disponible") await this.prisma.ligneRapprochement.update({ where: { id: ligne.id }, data: { statut: "proposee" } });
      nouvelles.push({ companyId: ligne.companyId, ligne, niveau, collecte });
    };
    for (let i = 0; i < actives.length; i++)
      for (let j = i + 1; j < actives.length; j++) {
        const a = actives[i]!;
        const b = actives[j]!;
        // Lot 5 : le secteur (même département, ou voisin dans le rayon des deux artisans) est jugé par `comparerBesoins`.
        if (a.companyId === b.companyId || a.type !== b.type) continue;
        // Chaque entreprise lit les écarts de son point de vue : sa valeur d'abord.
        const r = comparerBesoins(this.comparable(a), this.comparable(b));
        if (r.niveau === "incompatible") continue;
        const inverse = comparerBesoins(this.comparable(b), this.comparable(a));
        await proposer(a, `ligne:${b.id}`, r.niveau, r.differences, r.score, false);
        await proposer(b, `ligne:${a.id}`, inverse.niveau, inverse.differences, inverse.score, false);
      }
    const parDepartement = new Map<string, Awaited<ReturnType<RapprochementService["collectesOuvertes"]>>>();
    for (const l of actives) {
      // Lot 5 : les collectes du département, et celles des départements voisins dans le rayon accepté par l'artisan.
      const collectes = [];
      for (const dep of departementsAutour(l.departement, l.rayonKm)) {
        if (!parDepartement.has(dep)) parDepartement.set(dep, await this.collectesOuvertes(dep, maintenant));
        collectes.push(...parDepartement.get(dep)!);
      }
      for (const c of collectes) {
        if (c.participants.has(l.companyId)) continue;
        const resultats = c.lignes.map((cl) => comparerBesoins(this.comparable(l), cl)).filter((r) => r.niveau !== "incompatible").sort((x, y) => y.score - x.score);
        const meilleur = resultats[0];
        if (meilleur) await proposer(l, `collecte:${c.id}`, meilleur.niveau, meilleur.differences, meilleur.score, true);
      }
    }
    let prevenues = 0;
    for (const n of nouvelles) {
      await this.prevenir(n.companyId, n.ligne, n.niveau, n.collecte, false);
      await this.prisma.propositionRapprochement.updateMany({ where: { ligneId: n.ligne.id, notifieLe: null }, data: { notifieLe: maintenant } });
      prevenues++;
    }
    const aRelancer = await this.prisma.propositionRapprochement.findMany({ where: { reponse: null, relanceLe: null, notifieLe: { lte: new Date(maintenant.getTime() - RELANCE_APRES_JOURS * JOUR) }, ligne: { statut: { in: ACTIFS }, jusquau: { gt: maintenant } } }, include: { ligne: true } });
    for (const p of aRelancer) {
      await this.prevenir(p.companyId, p.ligne, p.niveau as NiveauRapprochement, p.cible.startsWith("collecte:"), true);
      await this.prisma.propositionRapprochement.update({ where: { id: p.id }, data: { relanceLe: maintenant } });
    }
    return { propositions: nouvelles.length, prevenues, relances: aRelancer.length };
  }

  private async prevenir(companyId: string, ligne: Ligne, niveau: NiveauRapprochement, collecte: boolean, relance: boolean) {
    if (!this.notifications) return;
    const corps = phraseNotificationRapprochement({ produit: ligne.libelle, niveau, collecte });
    await this.notifications
      .prevenir(companyId, { titre: relance ? "Rapprochement à examiner" : "Rapprochement possible", corps, url: "/achats-groupes?vue=mes-groupes", etiquette: `rapprochement:${ligne.id}` }, {
        objet: relance ? `Rappel : rapprochement possible pour ${ligne.libelle}` : `Rapprochement possible pour ${ligne.libelle}`,
        texte: `${corps}\n\nRien n'est ajouté sans ton accord : tu examines, puis tu décides.\n\n${this.notifications.lienVers("/achats-groupes?vue=mes-groupes")}`,
      })
      .catch(() => undefined);
  }

  private async ligneDe(tenant: TenantContext, ligneId: string) {
    if (!isUuid(ligneId)) throw notFound("Ligne");
    const l = await this.prisma.ligneRapprochement.findFirst({ where: { id: ligneId, companyId: tenant.companyId } });
    if (!l) throw notFound("Ligne");
    return l;
  }
}
