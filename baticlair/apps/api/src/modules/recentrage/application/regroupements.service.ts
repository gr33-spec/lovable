import {
  LIBELLES_FAMILLES,
  LIBELLES_PARTICIPATION,
  MESSAGE_HORS_ZONE,
  SEUIL_VOLUME_MIN_DEFAUT,
  chrono,
  cyclesAuChoix,
  deMois,
  famillesDuMetier,
  ligneGroupable,
  phraseParticipants,
  phraseRefusGroupable,
  referenceStricte,
  uniteRepere,
  volumeAtteint,
  zoneDuCodePostal,
  type FamilleGroupe,
  type Mois,
  type PrixReperes,
  type RefusGroupable,
  type StatutParticipation,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { CommandeDuMoisService } from "../../groupe/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { DemandePersoService } from "./demande-perso.service.js";
import type { DroitsService } from "./droits.service.js";

/**
 * LES REGROUPEMENTS (Greg, 25 octobre 2026, recentrage), côté serveur. Un regroupement = un cycle d'UNE famille dans UN
 * département, aux échéances du 1er et du 15 à midi (« ce cycle » ou « le suivant ») ; il ne prend que des gros articles
 * identiques (`ligneGroupable` : famille groupable, référence stricte, 1 000 € HT estimés). L'artisan garde sa demande
 * perso pour tout le reste. Il rejoint d'un seul bouton (une ligne d'un chantier, ou une quantité tapée pour un article
 * déjà dans le regroupement) ; une entreprise peut le lancer depuis son propre besoin. Jamais un nom, jamais une commune :
 * sous `SEUIL_ANONYMAT`, seulement « Regroupement en cours ». À la clôture, le volume minimum décide (`volume`, branché
 * sur la commande du mois) ; la consultation, les grilles, les résultats et la commande sont ceux de la commande du mois.
 */
export interface ReglagesRegroupements {
  seuilLigneHt: number;
  seuilAnonymat: number;
  seuilVolumeMin: Record<string, number> | null;
  prixReperes: PrixReperes;
  familles: string[];
}

const DANS = ["signe", "commande"];
const PROJET_STOCK = "Stock (regroupements)";

export class RegroupementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commande: Pick<CommandeDuMoisService, "regroupementPour" | "lignesDuChantier" | "config">,
    private readonly droits: Pick<DroitsService, "exiger" | "droits" | "zoneDe" | "zoneActive">,
    private readonly demandes: Pick<DemandePersoService, "dernierPrixPour">,
    private readonly reglages: ReglagesRegroupements,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private get seuilsVolume(): Record<string, number> {
    return { ...(SEUIL_VOLUME_MIN_DEFAUT as Record<string, number>), ...(this.reglages.seuilVolumeMin ?? {}) };
  }

  /** Branché sur la clôture : le volume estimé des participants, et s'il atteint le minimum de la famille. */
  async volume(c: { id: string; famille: string }): Promise<{ atteint: boolean; estimeHt: number }> {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: { in: DANS } }, select: { estimeHt: true } });
    const estimeHt = Math.round(besoins.reduce((s, b) => s + Number(b.estimeHt ?? 0), 0) * 100) / 100;
    return { atteint: volumeAtteint(c.famille, estimeHt, this.seuilsVolume), estimeHt };
  }

  /* ---------------------------------------------------------------------------------------------------- les lignes */

  /** Les lignes d'un chantier, chacune groupable ou non (avec la phrase du refus), et les deux cycles au choix. */
  async lignesDuChantier(tenant: TenantContext, projectId: string) {
    const { lignes, adresse } = await this.commande.lignesDuChantier(tenant, projectId);
    const dernierPrix = await this.demandes.dernierPrixPour(tenant.companyId);
    const config = await this.commande.config();
    const zone = zoneDuCodePostal(adresse);
    return {
      zone,
      zoneActive: this.droits.zoneActive(zone),
      message: this.droits.zoneActive(zone) ? null : MESSAGE_HORS_ZONE,
      cycles: cyclesAuChoix(this.now(), config).map((c) => ({ cle: c.cle, de: deMois(c.cle), clotureLe: c.clotureLe.toISOString() })),
      lignes: lignes.map((l) => {
        const g = ligneGroupable(l, { familles: this.reglages.familles, seuilHt: this.reglages.seuilLigneHt, reperes: this.reglages.prixReperes, dernierPrix });
        return g.ok
          ? { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, groupable: true, reference: g.ligne.reference.libelle, famille: g.ligne.reference.famille, estimeHt: g.ligne.estimeHt, raison: null }
          : { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, groupable: false, reference: null, famille: l.famille, estimeHt: null, raison: phraseRefusGroupable((g as { raison: RefusGroupable }).raison) };
      }),
    };
  }

  /**
   * « Tenter un prix de groupe » sur des lignes d'un chantier : chaque ligne groupable rejoint (ou lance) le regroupement
   * de sa famille au cycle choisi ; une ligne non groupable est refusée, avec sa raison. Le reste du chantier ne bouge pas.
   */
  async tenter(tenant: TenantContext, projectId: string, input: { articles: string[]; mois: Mois }, maintenant = this.now()) {
    assertCanWrite(tenant);
    await this.droits.exiger(tenant.companyId, { type: "regroupement" });
    const { lignes, adresse, takeoffId } = await this.commande.lignesDuChantier(tenant, projectId);
    const zone = zoneDuCodePostal(adresse);
    if (!zone || !adresse) throw validationFailed("The site needs an address with a postcode", { reason: "adresse_requise" });
    if (!this.droits.zoneActive(zone)) throw new DomainError("forbidden", MESSAGE_HORS_ZONE, { reason: "zone_inactive", message: MESSAGE_HORS_ZONE });
    this.cycleAuChoix(input.mois, maintenant, await this.commande.config());
    const dernierPrix = await this.demandes.dernierPrixPour(tenant.companyId);
    const voulues = lignes.filter((l) => input.articles.includes(l.key));
    if (voulues.length === 0) throw validationFailed("Nothing to add", { reason: "rien_a_ajouter" });
    const refusees: { key: string; designation: string; raison: string }[] = [];
    const ajoutees: { key: string; regroupementId: string }[] = [];
    for (const l of voulues) {
      const g = ligneGroupable(l, { familles: this.reglages.familles, seuilHt: this.reglages.seuilLigneHt, reperes: this.reglages.prixReperes, dernierPrix });
      if (!g.ok) {
        refusees.push({ key: l.key, designation: l.designation, raison: phraseRefusGroupable((g as { raison: RefusGroupable }).raison) });
        continue;
      }
      const cycle = await this.commande.regroupementPour(zone, g.ligne.reference.famille, input.mois, maintenant);
      await this.ajouter(tenant, cycle.id, { projectId, takeoffId, articleKey: l.key, designation: l.designation, cle: g.ligne.reference.cle, famille: g.ligne.reference.famille, quantite: l.quantite, unite: l.unite, zone, adresse, estimeHt: g.ligne.estimeHt, nature: "chantier" }, maintenant);
      ajoutees.push({ key: l.key, regroupementId: cycle.id });
    }
    if (ajoutees.length === 0) throw validationFailed(refusees[0]?.raison ?? "Nothing groupable", { reason: "non_groupable", refusees });
    return { ajoutees, refusees };
  }

  private cycleAuChoix(mois: Mois, maintenant: Date, config: Awaited<ReturnType<CommandeDuMoisService["config"]>>) {
    if (!cyclesAuChoix(maintenant, config).some((c) => c.cle === mois)) throw validationFailed("This cycle or the next one only", { reason: "cycle_au_choix" });
  }

  private async ajouter(
    tenant: TenantContext,
    cycleId: string,
    b: { projectId: string; takeoffId: string; articleKey: string; designation: string; cle: string; famille: string; quantite: number; unite: string; zone: string; adresse: string; estimeHt: number; nature: "chantier" | "stock" },
    maintenant: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [etat] = await tx.$queryRaw<{ phase: string; clotureLe: Date }[]>`SELECT phase, "clotureLe" FROM cycle_commande WHERE id = ${cycleId}::uuid FOR UPDATE`;
      if (!etat || etat.phase !== "inscriptions" || maintenant >= etat.clotureLe) throw new DomainError("conflict", "Order closed", { reason: "commande_close" });
      const lanceur = (await tx.besoin.count({ where: { cycleId, statut: { in: DANS } } })) === 0;
      const data = {
        designation: b.designation,
        cle: b.cle,
        famille: b.famille,
        quantite: b.quantite,
        unite: b.unite,
        zone: b.zone,
        adresseLivraison: b.adresse,
        fenetreTot: maintenant,
        fenetreTard: new Date(maintenant.getTime() + 60 * 86_400_000),
        statut: "signe",
        signeLe: maintenant,
        retireLe: null,
        lotId: null,
        cycleId,
        nature: b.nature,
        participation: "intention",
        estimeHt: b.estimeHt,
        lanceur,
      };
      const deja = await tx.besoin.findUnique({ where: { takeoffId_articleKey: { takeoffId: b.takeoffId, articleKey: b.articleKey } }, select: { id: true, statut: true } });
      if (deja && deja.statut !== "retire") throw new DomainError("conflict", "Already proposed", { reason: "deja_propose", article: b.articleKey });
      if (deja) await tx.besoin.update({ where: { id: deja.id }, data });
      else await tx.besoin.create({ data: { ...data, companyId: tenant.companyId, projectId: b.projectId, takeoffId: b.takeoffId, articleKey: b.articleKey } });
    });
  }

  /**
   * « Rejoindre » en tapant une quantité, pour un article déjà dans le regroupement (même référence stricte) : le besoin
   * est rangé dans le chantier « Stock (regroupements) » de l'entreprise, créé une fois.
   */
  async rejoindre(tenant: TenantContext, regroupementId: string, input: { cle: string; quantite: number }, maintenant = this.now()) {
    assertCanWrite(tenant);
    await this.droits.exiger(tenant.companyId, { type: "regroupement" });
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: regroupementId } });
    if (!c || c.famille === "toutes") throw notFound("Regroupement");
    const zone = await this.droits.zoneDe(tenant.companyId);
    if (zone !== c.zone) throw notFound("Regroupement");
    const modele = await this.prisma.besoin.findFirst({ where: { cycleId: c.id, cle: input.cle, statut: { in: DANS } }, select: { designation: true, unite: true, famille: true, quantite: true, estimeHt: true } });
    if (!modele) throw validationFailed("Unknown article", { reason: "article_inconnu" });
    if (!(input.quantite > 0)) throw validationFailed("Quantity required", { reason: "quantite_requise" });
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } });
    const stock = await this.projetStock(tenant, company?.address ?? null);
    const puModele = Number(modele.estimeHt ?? 0) / Math.max(Number(modele.quantite), 1);
    const dernierPrix = (await this.demandes.dernierPrixPour(tenant.companyId))(input.cle, uniteRepere(modele.unite));
    const estimeHt = Math.round((dernierPrix ?? puModele) * input.quantite * 100) / 100;
    await this.ajouter(tenant, c.id, { projectId: stock.projectId, takeoffId: stock.takeoffId, articleKey: `saisie:${c.id}:${input.cle}:${maintenant.getTime()}`, designation: modele.designation, cle: input.cle, famille: modele.famille, quantite: input.quantite, unite: modele.unite, zone: c.zone, adresse: company?.address ?? c.zone, estimeHt, nature: "stock" }, maintenant);
    return this.detail(tenant, c.id);
  }

  private async projetStock(tenant: TenantContext, adresse: string | null): Promise<{ projectId: string; takeoffId: string }> {
    const existant = await this.prisma.project.findFirst({ where: { companyId: tenant.companyId, name: PROJET_STOCK }, select: { id: true } });
    const takeoff = existant ? await this.prisma.takeoff.findFirst({ where: { projectId: existant.id, companyId: tenant.companyId }, select: { id: true } }) : null;
    if (existant && takeoff) return { projectId: existant.id, takeoffId: takeoff.id };
    const project = existant ?? (await this.prisma.project.create({ data: { companyId: tenant.companyId, name: PROJET_STOCK, address: adresse, createdById: tenant.userId } }));
    const t = await this.prisma.takeoff.create({ data: { companyId: tenant.companyId, projectId: project.id, source: "lignes", trade: "roofing", status: "validated", promptId: "saisie", promptVersion: 1, model: "saisie" } });
    return { projectId: project.id, takeoffId: t.id };
  }

  /**
   * Volume minimum non atteint : « Cycle suivant » (les lignes passent au regroupement suivant de la même famille) ou
   * « Demande perso » (elles quittent le regroupement ; l'écran ouvre la demande perso de leurs chantiers).
   */
  async basculer(tenant: TenantContext, regroupementId: string, vers: "suivant" | "perso", maintenant = this.now()) {
    assertCanWrite(tenant);
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: regroupementId } });
    if (!c || c.statutVolume !== "non_consulte") throw notFound("Regroupement");
    const miens = await this.prisma.besoin.findMany({ where: { cycleId: c.id, companyId: tenant.companyId, statut: "signe" } });
    if (miens.length === 0) throw notFound("Regroupement");
    if (vers === "perso") {
      await this.prisma.besoin.updateMany({ where: { id: { in: miens.map((b) => b.id) } }, data: { participation: "bascule", statut: "retire", retireLe: maintenant } });
      return { vers, chantiers: [...new Set(miens.map((b) => b.projectId))].map((projectId) => ({ projectId, articles: miens.filter((b) => b.projectId === projectId).map((b) => b.articleKey) })) };
    }
    const prochain = cyclesAuChoix(maintenant, await this.commande.config())[0];
    if (!prochain) throw new DomainError("conflict", "No open cycle", { reason: "pas_de_cycle" });
    const suivant = await this.commande.regroupementPour(c.zone, c.famille, prochain.cle, maintenant);
    await this.prisma.besoin.updateMany({ where: { id: { in: miens.map((b) => b.id) } }, data: { cycleId: suivant.id, participation: "intention" } });
    return { vers, regroupementId: suivant.id, de: deMois(suivant.mois) };
  }

  /* ---------------------------------------------------------------------------------------------- ce que voit l'artisan */

  /**
   * Les regroupements PERTINENTS pour l'artisan : ceux de sa zone où il est, ou d'une famille de ses métiers. Jamais de
   * liste vide affichée : l'accueil n'a l'encart que s'il y en a un.
   */
  async liste(tenant: TenantContext, maintenant = this.now()) {
    const zone = await this.droits.zoneDe(tenant.companyId);
    if (!this.droits.zoneActive(zone)) return { zone, zoneActive: false, message: MESSAGE_HORS_ZONE, regroupements: [] };
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { trades: true } });
    const familles = new Set(company?.trades.flatMap((t) => famillesDuMetier(t)) ?? []);
    const miens = new Set((await this.prisma.besoin.findMany({ where: { companyId: tenant.companyId, statut: { in: DANS }, cycle: { famille: { not: "toutes" } } }, select: { cycleId: true } })).map((b) => b.cycleId!));
    const cycles = await this.prisma.cycleCommande.findMany({
      where: { zone: zone!, famille: { not: "toutes" }, OR: [{ id: { in: [...miens] } }, { phase: "inscriptions", clotureLe: { gt: maintenant } }] },
      orderBy: { clotureLe: "asc" },
    });
    const pertinents = cycles.filter((c) => miens.has(c.id) || familles.has(c.famille as FamilleGroupe));
    const vues = [];
    for (const c of pertinents) {
      const v = await this.vue(tenant, c, maintenant);
      // Rien à montrer d'un regroupement encore vide (sauf le sien).
      if (v.materiaux.length > 0) vues.push(v);
    }
    return { zone, zoneActive: true, message: null, regroupements: vues };
  }

  async detail(tenant: TenantContext, regroupementId: string, maintenant = this.now()) {
    const c = await this.prisma.cycleCommande.findUnique({ where: { id: regroupementId } });
    const zone = await this.droits.zoneDe(tenant.companyId);
    if (!c || c.famille === "toutes" || c.zone !== zone) throw notFound("Regroupement");
    const v = await this.vue(tenant, c, maintenant);
    const mes = await this.prisma.besoin.findMany({ where: { cycleId: c.id, companyId: tenant.companyId, statut: { in: DANS } }, include: { project: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
    return {
      ...v,
      mesLignes: mes.map((b) => ({ id: b.id, designation: b.designation, quantite: Number(b.quantite), unite: b.unite, chantier: b.project.name, statut: (b.participation ?? "intention") as StatutParticipation, libelle: LIBELLES_PARTICIPATION[(b.participation ?? "intention") as StatutParticipation] })),
    };
  }

  private async vue(tenant: TenantContext, c: { id: string; mois: string; famille: string; zone: string; phase: string; clotureLe: Date; statutVolume: string | null }, maintenant: Date) {
    const besoins = await this.prisma.besoin.findMany({ where: { cycleId: c.id, statut: { in: DANS } }, select: { companyId: true, cle: true, designation: true, unite: true, participation: true } });
    const entreprises = new Set(besoins.map((b) => b.companyId)).size;
    const parCle = new Map<string, { cle: string; libelle: string; unite: string }>();
    for (const b of besoins) {
      if (parCle.has(b.cle)) continue;
      const r = referenceStricte(b.designation);
      parCle.set(b.cle, { cle: b.cle, libelle: r.ok ? r.reference.libelle : b.designation, unite: b.unite });
    }
    const participants = phraseParticipants(entreprises, c.zone, this.reglages.seuilAnonymat);
    const moi = besoins.filter((b) => b.companyId === tenant.companyId);
    return {
      id: c.id,
      famille: c.famille,
      titre: LIBELLES_FAMILLES[c.famille as FamilleGroupe] ?? c.famille,
      departement: c.zone,
      cycle: deMois(c.mois),
      phase: c.phase,
      nonConsulte: c.statutVolume === "non_consulte",
      clotureLe: c.clotureLe.toISOString(),
      clotureDans: c.phase === "inscriptions" ? chrono(maintenant, c.clotureLe) : null,
      // Jamais un nom ni une commune ; sous le seuil, pas même un nombre.
      participants: participants.titre,
      participantsDetail: participants.detail,
      materiaux: [...parCle.values()],
      jeSuisDedans: moi.length > 0,
      maParticipation: moi.length ? ((moi.find((b) => b.participation === "commande")?.participation ?? moi[0]!.participation ?? "intention") as StatutParticipation) : null,
    };
  }
}
