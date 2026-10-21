import { choisirLeNegoce, type ReponseAChoisir } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const csv = (v: unknown) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/**
 * L'ADMIN DE GREG (parcours groupé, étape 9 ; section 5 : « Journal de chaque lot … visible par Greg seul »). Il surveille,
 * il ne traite pas : lots par département, journal, réponses « à vérifier », négoces, accords, factures (export CSV),
 * exclusions ; et les gestes de secours : clore, forcer, annuler, changer le négoce retenu, marquer une facture payée.
 */
export class AdminGroupeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departements: string[] | null,
  ) {}

  async tableau() {
    const [lots, negoces, factures, desistements, accords] = await Promise.all([
      this.prisma.lotGroupe.findMany({ include: { besoins: { select: { statut: true, quantite: true, unite: true, designation: true } }, reponses: { select: { deposeLe: true, pasConcerneLe: true, statutExtraction: true } }, negoceRetenu: { select: { nom: true } }, offres: { select: { economie: true, bon: { select: { envoyeLe: true } } } } }, orderBy: { numero: "desc" } }),
      this.prisma.negoce.findMany({ orderBy: [{ departement: "asc" }, { nom: "asc" }], include: { _count: { select: { artisans: true, reponses: true } } } }),
      this.prisma.factureNegoce.findMany({ include: { negoce: { select: { nom: true } }, lot: { select: { numero: true } } }, orderBy: { numero: "desc" } }),
      this.prisma.desistement.findMany({ include: { company: { select: { name: true } }, lot: { select: { numero: true } } }, orderBy: { createdAt: "desc" } }),
      this.prisma.accordNegoce.findMany({ include: { negoce: { select: { nom: true, email: true } }, lot: { select: { numero: true } } }, orderBy: { accepteLe: "desc" } }),
    ]);
    const parDepartement = new Map<string, { lots: number; economies: number }>();
    for (const l of lots) {
      const d = parDepartement.get(l.zone) ?? { lots: 0, economies: 0 };
      d.lots++;
      d.economies += l.offres.reduce((s, o) => s + Number(o.economie ?? 0), 0);
      parDepartement.set(l.zone, d);
    }
    return {
      departements: { ouverts: this.departements, compteurs: [...parDepartement.entries()].map(([departement, v]) => ({ departement, lots: v.lots, economies: Math.round(v.economies * 100) / 100 })) },
      lots: lots.map((l) => ({
        id: l.id,
        numero: l.numero,
        statut: l.statut,
        zone: l.zone,
        famille: l.famille,
        designation: l.besoins[0]?.designation ?? l.cle,
        fenetre: { tot: jour(l.fenetreTot), tard: jour(l.fenetreTard) },
        envoyeLe: jour(l.envoyeLe),
        besoins: { total: l.besoins.length, fermes: l.besoins.filter((b) => ["signe", "engage", "commande", "livre"].includes(b.statut)).length },
        reponses: { attendues: l.reponses.length, deposees: l.reponses.filter((r) => r.deposeLe).length, pasConcernes: l.reponses.filter((r) => r.pasConcerneLe).length, aVerifier: l.reponses.filter((r) => r.deposeLe && r.statutExtraction !== "lue").length },
        negoceRetenu: l.negoceRetenu?.nom ?? null,
        prixRetenu: l.prixRetenu?.toString() ?? null,
        bons: l.offres.filter((o) => o.bon?.envoyeLe).length,
      })),
      negoces: negoces.map((n) => ({ id: n.id, nom: n.nom, email: n.email, departement: n.departement, agences: negoces.filter((x) => x.email === n.email && x.id !== n.id).map((x) => x.departement).sort(), familles: n.familles, stop: !!n.stopLe, artisans: n._count.artisans, reponses: n._count.reponses })),
      accords: accords.map((a) => ({ id: a.id, lot: a.lot.numero, negoce: a.negoce.nom, email: a.email, adresseIp: a.adresseIp, versionContrat: a.versionContrat, tauxPourcent: a.tauxPourcent.toString(), accepteLe: a.accepteLe.toISOString() })),
      factures: factures.map((f) => ({ id: f.id, numero: f.numero, lot: f.lot.numero, negoce: f.negoce.nom, totalLotHt: f.totalLotHt.toString(), montantHt: f.montantHt.toString(), statut: f.statut, emiseLe: jour(f.emiseLe), echeanceLe: jour(f.echeanceLe), payeeLe: jour(f.payeeLe) })),
      exclusions: desistements.map((d) => ({ id: d.id, entreprise: d.company.name, lot: d.lot.numero, sanction: d.sanction, excluJusquau: jour(d.excluJusquau), raison: d.raison, le: jour(d.createdAt) })),
    };
  }

  async lot(lotId: string) {
    if (!isUuid(lotId)) throw notFound("Lot");
    const l = await this.prisma.lotGroupe.findUnique({
      where: { id: lotId },
      include: {
        besoins: { include: { company: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        reponses: { include: { negoce: { select: { nom: true, email: true } }, fichiers: { select: { nom: true } } } },
        journal: { orderBy: { createdAt: "asc" } },
        negoceRetenu: { select: { nom: true } },
        offres: { include: { bon: { include: { livraison: true } } } },
        facture: true,
        accords: { include: { negoce: { select: { nom: true } } } },
      },
    });
    if (!l) throw notFound("Lot");
    return {
      id: l.id,
      numero: l.numero,
      statut: l.statut,
      zone: l.zone,
      famille: l.famille,
      cle: l.cle,
      fenetre: { tot: jour(l.fenetreTot), tard: jour(l.fenetreTard) },
      negoceRetenu: l.negoceRetenu?.nom ?? null,
      prixRetenu: l.prixRetenu?.toString() ?? null,
      // Greg voit les noms : c'est son journal (section 5) ; jamais un artisan.
      besoins: l.besoins.map((b) => ({ id: b.id, entreprise: b.company.name, designation: b.designation, quantite: b.quantite.toString(), unite: b.unite, statut: b.statut, adresse: b.adresseLivraison, offre: l.offres.find((o) => o.besoinId === b.id) ? { prixUnitaire: l.offres.find((o) => o.besoinId === b.id)!.prixUnitaire.toString(), bon: !!l.offres.find((o) => o.besoinId === b.id)!.bon, livraison: l.offres.find((o) => o.besoinId === b.id)!.bon?.livraison?.statut ?? null } : null })),
      reponses: l.reponses.map((r) => ({ id: r.id, negoceId: r.negoceId, negoce: r.negoce.nom, email: r.negoce.email, deposeLe: jour(r.deposeLe), pasConcerneLe: jour(r.pasConcerneLe), statutExtraction: r.statutExtraction, prix: r.prix, delaiJours: r.delaiJours, message: r.message, fichiers: r.fichiers.map((f) => f.nom) })),
      accords: l.accords.map((a) => ({ negoce: a.negoce.nom, email: a.email, adresseIp: a.adresseIp, accepteLe: a.accepteLe.toISOString(), versionContrat: a.versionContrat })),
      facture: l.facture ? { numero: l.facture.numero, montantHt: l.facture.montantHt.toString(), statut: l.facture.statut, echeanceLe: jour(l.facture.echeanceLe) } : null,
      journal: l.journal.map((j) => ({ evenement: j.evenement, details: j.details, le: j.createdAt.toISOString() })),
    };
  }

  /** « Clore le lot » : plus rien n'en part ; les besoins engagés restent visibles (Greg prévient à la main s'il le faut). */
  async clore(lotId: string, par: string): Promise<{ statut: string }> {
    const l = await this.lotOuvrable(lotId);
    if (["clos", "annule"].includes(l.statut)) throw new DomainError("conflict", "Already closed", { reason: "deja_clos" });
    await this.prisma.$transaction([
      this.prisma.lotGroupe.update({ where: { id: l.id }, data: { statut: "clos", clotureLe: new Date() } }),
      this.prisma.journalGroupe.create({ data: { lotId: l.id, evenement: "clos_par_admin", details: { par } } }),
    ]);
    return { statut: "clos" };
  }

  /** « Annuler le lot » : les besoins redeviennent libres (signés ou en attente) pour le lot suivant. */
  async annuler(lotId: string, par: string): Promise<{ statut: string; besoinsLiberes: number }> {
    const l = await this.lotOuvrable(lotId);
    if (l.offres.some((o) => o.bon)) throw new DomainError("conflict", "Orders already sent", { reason: "bons_partis" });
    const liberes = await this.prisma.$transaction(async (tx) => {
      const engages = await tx.besoin.updateMany({ where: { lotId: l.id, statut: "engage" }, data: { statut: "signe", lotId: null, engageLe: null } });
      const autres = await tx.besoin.updateMany({ where: { lotId: l.id, statut: { in: ["signe", "en_attente"] } }, data: { lotId: null } });
      await tx.offreArtisan.deleteMany({ where: { lotId: l.id } });
      await tx.lotGroupe.update({ where: { id: l.id }, data: { statut: "annule", clotureLe: new Date(), negoceRetenuId: null, prixRetenu: null } });
      await tx.journalGroupe.create({ data: { lotId: l.id, evenement: "annule_par_admin", details: { par } } });
      return engages.count + autres.count;
    });
    return { statut: "annule", besoinsLiberes: liberes };
  }

  /** « Forcer » : un lot ouvert passe formé sans attendre le seuil ni le lundi (il partira au prochain passage). */
  async forcer(lotId: string, par: string): Promise<{ statut: string }> {
    const l = await this.lotOuvrable(lotId);
    if (l.statut !== "ouvert") throw new DomainError("conflict", "Not open", { reason: "pas_ouvert" });
    await this.prisma.$transaction([
      this.prisma.lotGroupe.update({ where: { id: l.id }, data: { statut: "forme" } }),
      this.prisma.journalGroupe.create({ data: { lotId: l.id, evenement: "lot_forme", details: { par: "admin", admin: par } } }),
    ]);
    return { statut: "forme" };
  }

  /** « Changer le négoce retenu » (avant les bons) : le lot se rechoisit avec ce négoce seul. */
  async changerNegoce(lotId: string, negoceId: string, par: string): Promise<{ negoce: string; prixUnitaire: number }> {
    const l = await this.lotOuvrable(lotId);
    if (!isUuid(negoceId)) throw notFound("Negoce");
    if (l.offres.some((o) => o.bon)) throw new DomainError("conflict", "Orders already sent", { reason: "bons_partis" });
    const r = await this.prisma.reponseNegoce.findUnique({ where: { lotId_negoceId: { lotId: l.id, negoceId } }, include: { negoce: true } });
    if (!r || !r.deposeLe) throw new DomainError("conflict", "No deposit from this négoce", { reason: "sans_depot" });
    const engages = l.besoins.filter((b) => ["engage", "signe"].includes(b.statut));
    const volumeFerme = engages.reduce((s, b) => s + Number(b.quantite), 0);
    const reponse: ReponseAChoisir = { negoceId, statutExtraction: "lue", prix: r.prix as unknown as ReponseAChoisir["prix"], delaiJours: r.delaiJours, deposeLe: r.deposeLe, pasConcerneLe: null };
    const choix = choisirLeNegoce({ volumeFerme, fenetre: { tot: l.fenetreTot, tard: l.fenetreTard } }, [reponse]);
    if (!choix.retenu) throw new DomainError("conflict", "No applicable price", { reason: choix.ecartes[0]?.raison ?? "sans_prix" });
    const { prixUnitaire, dateLivraison } = choix.retenu;
    await this.prisma.$transaction([
      this.prisma.lotGroupe.update({ where: { id: l.id }, data: { statut: "choisi", negoceRetenuId: negoceId, prixRetenu: prixUnitaire, clotureLe: new Date() } }),
      ...engages.map((b) => this.prisma.offreArtisan.upsert({ where: { besoinId: b.id }, create: { lotId: l.id, besoinId: b.id, prixUnitaire, dateLivraison }, update: { prixUnitaire, dateLivraison } })),
      this.prisma.journalGroupe.create({ data: { lotId: l.id, evenement: "negoce_change_par_admin", details: { par, negoce: negoceId, prixUnitaire } } }),
    ]);
    return { negoce: r.negoce.nom, prixUnitaire };
  }

  async marquerPayee(factureId: string, par: string): Promise<{ statut: string }> {
    if (!isUuid(factureId)) throw notFound("Facture");
    const f = await this.prisma.factureNegoce.findUnique({ where: { id: factureId } });
    if (!f) throw notFound("Facture");
    await this.prisma.$transaction([
      this.prisma.factureNegoce.update({ where: { id: f.id }, data: { statut: "payee", payeeLe: new Date() } }),
      this.prisma.journalGroupe.create({ data: { lotId: f.lotId, evenement: "facture_payee", details: { par, numero: f.numero } } }),
    ]);
    return { statut: "payee" };
  }

  /** L'export CSV des factures de commission : mois, négoce, lot, HT, TVA, TTC, statut. */
  async facturesCsv(tvaPourcent: number): Promise<string> {
    const factures = await this.prisma.factureNegoce.findMany({ include: { negoce: { select: { nom: true } }, lot: { select: { numero: true } } }, orderBy: { numero: "asc" } });
    const lignes = [["mois", "numero", "negoce", "lot", "total_lot_ht", "commission_ht", "tva", "ttc", "statut", "emise_le", "echeance_le", "payee_le"].join(";")];
    for (const f of factures) {
      const ht = Number(f.montantHt);
      const tva = Math.round(ht * tvaPourcent) / 100;
      lignes.push([f.emiseLe.toISOString().slice(0, 7), f.numero, f.negoce.nom, f.lot.numero, Number(f.totalLotHt).toFixed(2), ht.toFixed(2), tva.toFixed(2), (ht + tva).toFixed(2), f.statut, jour(f.emiseLe), jour(f.echeanceLe), jour(f.payeeLe)].map(csv).join(";"));
    }
    return `${lignes.join("\n")}\n`;
  }

  private async lotOuvrable(lotId: string) {
    if (!isUuid(lotId)) throw notFound("Lot");
    const l = await this.prisma.lotGroupe.findUnique({ where: { id: lotId }, include: { besoins: true, offres: { include: { bon: true } } } });
    if (!l) throw notFound("Lot");
    return l;
  }
}
