import { createHash, randomBytes } from "node:crypto";
import {
  DELAI_REPONSE_JOURS,
  documentDemande,
  htmlDemande,
  LIBELLES_FAMILLES,
  negoceConcerne,
  NOM_DEMANDE,
  objetDemande,
  PHRASE_ACCORD,
  PHRASE_COMMISSION,
  TAUX_COMMISSION_POURCENT,
  texteContrat,
  texteDemande,
  VERSION_CONTRAT,
  volumesDuLot,
  type FamilleGroupe,
  type LotADemander,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { PdfReader } from "../../documents/index.js";
import { jetonDeLien } from "./lien-negoce.js";
import { prixDesPaliers, statutDeLecture, type NegoceExtractor } from "./negoce-extractor.js";
import { pdfDeTexte } from "./pdf-texte.js";

const JOUR = 24 * 3600 * 1000;
const PAGES_MAX = 10;

export interface ReglagesDemande {
  webAppUrl: string;
  authSecret: string;
}

export interface FichierDepose {
  nom: string;
  type: string;
  contenu: Buffer;
}

export interface PageReponse {
  lot: {
    numero: number;
    designation: string;
    famille: string;
    departement: string;
    unite: string;
    volumeFerme: string;
    volumeProbable: string;
    fenetre: { tot: string; tard: string };
    chantiers: { adresse: string; quantite: string; unite: string; fenetre: { tot: string; tard: string }; engagement: "ferme" | "probable" }[];
    /** Le lot attend encore les réponses (« envoyé ») ; sinon la page le dit et ne prend plus rien. */
    ouvert: boolean;
    reponseAttendueLe: string | null;
  };
  negoce: { nom: string; email: string };
  commission: { phrase: string; phraseAccord: string; tauxPourcent: number; versionContrat: string; contrat: string[] };
  accord: { accepteLe: string } | null;
  reponse: { deposeLe: string; fichiers: string[]; message: string | null; statutExtraction: string } | null;
}

const jour = (d: Date) => d.toISOString().slice(0, 10);
const hash = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

/**
 * LA DEMANDE AUX NÉGOCES (parcours groupé, étape 5) : dès qu'un lot est formé, un e-mail part au nom du « Regroupement
 * artisans » à chaque négoce du département qui vend sa famille (un généraliste reçoit tous ses lots dans un seul
 * e-mail), avec le PDF en deux parties et, en gras, la phrase de commission (décision du fondateur, 2026-10-20). Chaque
 * négoce a son lien unique de réponse par lot, sans compte ; il dépose un ou deux devis après avoir coché l'accord de
 * commission (date, e-mail, IP enregistrés) ; sans la case, rien n'est pris. Le lot passe « envoyé », les besoins signés
 * « engagés » : plus de retrait (section 4 b). Aucun nom d'artisan ne part ; aucun contact entre artisans.
 */
export class DemandeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: TransactionalEmailSender,
    private readonly pdf: PdfReader,
    private readonly extracteur: NegoceExtractor | null,
    private readonly reglages: ReglagesDemande,
    /** Étape 6 : après un dépôt, le lot se décide si tout le monde a répondu. */
    private readonly choix: { choisirLesLotsEnvoyes(maintenant?: Date): Promise<unknown> },
  ) {}

  /** Envoie chaque lot formé aux négoces concernés. Un lot sans négoce concerné reste formé (Greg le voit, étape 9). */
  async envoyerLesLotsFormes(maintenant = new Date()): Promise<{ lotsEnvoyes: number; negocesPrevenus: number }> {
    const formes = await this.prisma.lotGroupe.findMany({ where: { statut: "forme" }, include: { besoins: { where: { statut: { in: ["signe", "en_attente"] } } } }, orderBy: { numero: "asc" } });
    if (formes.length === 0) return { lotsEnvoyes: 0, negocesPrevenus: 0 };
    const zones = [...new Set(formes.map((l) => l.zone))];
    const negoces = await this.prisma.negoce.findMany({ where: { departement: { in: zones }, stopLe: null } });
    // Par négoce, ses lots : un seul e-mail par négoce (le généraliste reçoit toutes ses familles d'un coup).
    const parNegoce = new Map<string, typeof formes>();
    for (const lot of formes) {
      for (const n of negoces) {
        if (!negoceConcerne({ departement: n.departement, familles: n.familles, stop: n.stopLe !== null }, lot)) continue;
        parNegoce.set(n.id, [...(parNegoce.get(n.id) ?? []), lot]);
      }
    }
    const partis = new Set<string>();
    let negocesPrevenus = 0;
    for (const [negoceId, lots] of parNegoce) {
      const negoce = negoces.find((n) => n.id === negoceId)!;
      const aDemander: LotADemander[] = [];
      for (const lot of lots) {
        const jeton = randomBytes(24).toString("base64url");
        // Une réponse par (lot, négoce) : déjà créée (envoi repris après une panne), on ne renvoie pas.
        const existante = await this.prisma.reponseNegoce.findUnique({ where: { lotId_negoceId: { lotId: lot.id, negoceId } } });
        if (existante) continue;
        await this.prisma.reponseNegoce.create({ data: { lotId: lot.id, negoceId, tokenHash: hash(jeton) } });
        aDemander.push({
          numero: lot.numero,
          designation: lot.besoins[0]?.designation ?? lot.cle,
          famille: lot.famille,
          zone: lot.zone,
          unite: lot.besoins[0]?.unite ?? "",
          fenetre: { tot: lot.fenetreTot, tard: lot.fenetreTard },
          chantiers: lot.besoins.map((b) => ({ adresse: b.adresseLivraison, quantite: b.quantite.toString(), unite: b.unite, fenetre: { tot: b.fenetreTot, tard: b.fenetreTard }, ferme: b.statut === "signe" })),
          lienReponse: `${this.reglages.webAppUrl}/reponse/${jeton}`,
        });
      }
      if (aDemander.length === 0) continue;
      const departement = negoce.departement;
      const liens = {
        pasConcerne: `${this.reglages.webAppUrl}/negoces/lien/${jetonDeLien(this.reglages.authSecret, { action: "pas_concerne", negoceId, famille: aDemander[0]!.famille })}`,
        stop: `${this.reglages.webAppUrl}/negoces/lien/${jetonDeLien(this.reglages.authSecret, { action: "stop", negoceId })}`,
      };
      const doc = documentDemande(aDemander, departement, maintenant);
      const pdf = await pdfDeTexte(doc.titre, [{ titre: "1. Les lots : volume ferme et volume probable", lignes: doc.partie1 }, ...doc.partie2.map((p) => ({ titre: `2. ${p.titre}`, lignes: p.lignes })), { lignes: [doc.pied] }]);
      try {
        await this.email.send({
          to: negoce.email,
          subject: objetDemande(aDemander, departement),
          text: texteDemande(aDemander, liens),
          html: htmlDemande(aDemander, liens),
          attachments: [{ filename: `demande-de-prix-${NOM_DEMANDE.toLowerCase().replace(/\s+/g, "-")}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }],
          mustDeliver: true,
        });
      } catch (e) {
        // Le mail n'est pas parti chez ce négoce : la réponse créée est retirée, on retentera au prochain passage.
        await this.prisma.reponseNegoce.deleteMany({ where: { negoceId, lotId: { in: lots.map((l) => l.id) }, deposeLe: null } });
        for (const lot of lots) await this.prisma.journalGroupe.create({ data: { lotId: lot.id, evenement: "envoi_echoue", details: { negoce: negoceId, erreur: e instanceof Error ? e.message : String(e) } } });
        continue;
      }
      negocesPrevenus++;
      for (const lot of lots) partis.add(lot.id);
    }
    for (const lotId of partis) {
      const lot = formes.find((l) => l.id === lotId)!;
      const negocesDuLot = [...parNegoce.entries()].filter(([, ls]) => ls.some((l) => l.id === lotId)).map(([n]) => n);
      await this.prisma.$transaction([
        this.prisma.lotGroupe.update({ where: { id: lotId }, data: { statut: "envoye", envoyeLe: maintenant } }),
        this.prisma.besoin.updateMany({ where: { lotId, statut: "signe" }, data: { statut: "engage", engageLe: maintenant } }),
        this.prisma.journalGroupe.create({ data: { lotId, evenement: "demande_envoyee", details: { negoces: negocesDuLot.length, reponseAttendueLe: jour(new Date(maintenant.getTime() + DELAI_REPONSE_JOURS * JOUR)) } } }),
      ]);
      void lot;
    }
    return { lotsEnvoyes: partis.size, negocesPrevenus };
  }

  /** La page de réponse d'un négoce, lue par son lien. */
  async page(jeton: string): Promise<PageReponse> {
    const r = await this.reponse(jeton);
    const v = volumesDuLot({ chantiers: r.lot.besoins.map((b) => ({ adresse: "", quantite: b.quantite.toString(), unite: b.unite, fenetre: { tot: b.fenetreTot, tard: b.fenetreTard }, ferme: b.statut === "engage" || b.statut === "signe" })), unite: r.lot.besoins[0]?.unite ?? "" });
    return {
      lot: {
        numero: r.lot.numero,
        designation: r.lot.besoins[0]?.designation ?? r.lot.cle,
        famille: LIBELLES_FAMILLES[r.lot.famille as FamilleGroupe] ?? r.lot.famille,
        departement: r.lot.zone,
        unite: r.lot.besoins[0]?.unite ?? "",
        volumeFerme: v.ferme,
        volumeProbable: v.probable,
        fenetre: { tot: jour(r.lot.fenetreTot), tard: jour(r.lot.fenetreTard) },
        chantiers: r.lot.besoins.map((b) => ({ adresse: b.adresseLivraison, quantite: b.quantite.toString(), unite: b.unite, fenetre: { tot: jour(b.fenetreTot), tard: jour(b.fenetreTard) }, engagement: b.statut === "en_attente" ? "probable" : "ferme" })),
        ouvert: r.lot.statut === "envoye",
        reponseAttendueLe: r.lot.envoyeLe ? jour(new Date(r.lot.envoyeLe.getTime() + DELAI_REPONSE_JOURS * JOUR)) : null,
      },
      negoce: { nom: r.negoce.nom, email: r.negoce.email },
      commission: { phrase: PHRASE_COMMISSION, phraseAccord: PHRASE_ACCORD, tauxPourcent: TAUX_COMMISSION_POURCENT, versionContrat: VERSION_CONTRAT, contrat: texteContrat() },
      accord: r.accord ? { accepteLe: r.accord.accepteLe.toISOString() } : null,
      reponse: r.deposeLe ? { deposeLe: r.deposeLe.toISOString(), fichiers: r.fichiers.map((f) => f.nom), message: r.message, statutExtraction: r.statutExtraction } : null,
    };
  }

  /** Le contrat de commission, en PDF, à côté de la case (décision du fondateur, 2026-10-20). */
  async contratPdf(jeton: string): Promise<Uint8Array> {
    await this.reponse(jeton);
    const [titre, ...articles] = texteContrat();
    return pdfDeTexte(titre!, [{ lignes: articles }]);
  }

  /**
   * Le dépôt : la case d'accord est obligatoire (sans elle, rien n'est enregistré), un ou deux PDF, une phrase libre ;
   * l'accord garde la date, l'e-mail du négoce et l'adresse IP ; puis la lecture du prix et du délai.
   */
  async deposer(jeton: string, depot: { accord: boolean; message: string | null; fichiers: FichierDepose[] }, adresseIp: string): Promise<PageReponse> {
    const r = await this.reponse(jeton);
    if (r.lot.statut !== "envoye") throw new DomainError("conflict", "Lot closed", { reason: "lot_ferme" });
    if (!depot.accord) throw validationFailed("Commission agreement required", { reason: "accord_requis" });
    if (depot.fichiers.length === 0) throw validationFailed("Quote required", { reason: "devis_requis" });
    if (depot.fichiers.length > 2) throw validationFailed("Two quotes at most", { reason: "deux_devis_au_plus" });
    for (const f of depot.fichiers) if (f.type !== "application/pdf" || !f.contenu.subarray(0, 5).toString().startsWith("%PDF")) throw validationFailed("PDF only", { reason: "pdf_seulement" });
    const maintenant = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.accordNegoce.upsert({
        where: { lotId_negoceId: { lotId: r.lotId, negoceId: r.negoceId } },
        create: { lotId: r.lotId, negoceId: r.negoceId, versionContrat: VERSION_CONTRAT, tauxPourcent: TAUX_COMMISSION_POURCENT, email: r.negoce.email, adresseIp, accepteLe: maintenant },
        update: {},
      });
      await tx.reponseNegoceFichier.deleteMany({ where: { reponseId: r.id } });
      await tx.reponseNegoce.update({
        where: { id: r.id },
        data: { message: depot.message, deposeLe: maintenant, statutExtraction: "en_attente", prix: [], delaiJours: null, fichiers: { create: depot.fichiers.map((f) => ({ nom: f.nom, type: f.type, contenu: new Uint8Array(f.contenu) })) } },
      });
    });
    const lecture = await this.lire(r, depot.fichiers);
    await this.prisma.reponseNegoce.update({ where: { id: r.id }, data: { statutExtraction: lecture.statut, prix: lecture.prix.map((x) => ({ ...x })), delaiJours: lecture.delaiJours } });
    await this.prisma.journalGroupe.create({ data: { lotId: r.lotId, evenement: "reponse_deposee", details: { negoce: r.negoceId, fichiers: depot.fichiers.length, lecture: lecture.statut } } });
    const page = await this.page(jeton);
    await this.choix.choisirLesLotsEnvoyes();
    return page;
  }

  private async lire(r: Awaited<ReturnType<DemandeService["reponse"]>>, fichiers: FichierDepose[]) {
    if (!this.extracteur) return { statut: "a_verifier" as const, prix: [] as ReturnType<typeof prixDesPaliers>, delaiJours: null };
    const v = volumesDuLot({ chantiers: r.lot.besoins.map((b) => ({ adresse: "", quantite: b.quantite.toString(), unite: b.unite, fenetre: { tot: b.fenetreTot, tard: b.fenetreTard }, ferme: b.statut !== "en_attente" })), unite: r.lot.besoins[0]?.unite ?? "" });
    const lot = { numero: r.lot.numero, designation: r.lot.besoins[0]?.designation ?? r.lot.cle, unite: r.lot.besoins[0]?.unite ?? "", volumeFerme: v.ferme, volumeProbable: v.probable };
    const prix: ReturnType<typeof prixDesPaliers> = [];
    let delaiJours: number | null = null;
    let statut: "lue" | "a_verifier" | "echec" = "lue";
    for (const f of fichiers) {
      let texte = "";
      try {
        const contenu = await this.pdf.read(new Uint8Array(f.contenu), { maxPages: PAGES_MAX });
        texte = contenu.pages.map((p) => p.lines.map((l, i) => `[${p.pageNumber}:${String(i + 1).padStart(3, "0")}] ${l}`).join("\n")).join("\n");
      } catch {
        texte = "";
      }
      const document = texte.trim() ? { numberedText: texte, imagePdf: null, imagePages: [] } : { numberedText: "", imagePdf: new Uint8Array(f.contenu), imagePages: [1] };
      let tentative: Awaited<ReturnType<NegoceExtractor["lire"]>> | null = null;
      try {
        tentative = await this.extracteur.lire({ ...document, lot });
      } catch {
        tentative = null;
      }
      const s = tentative ? statutDeLecture(tentative) : "echec";
      if (s !== "lue") statut = statut === "echec" ? "echec" : s;
      if (tentative?.output) {
        prix.push(...prixDesPaliers(tentative.output, r.lot.cle));
        delaiJours ??= tentative.output.delaiJours;
      }
    }
    if (prix.length === 0 && statut === "lue") statut = "a_verifier";
    return { statut, prix, delaiJours };
  }

  private async reponse(jeton: string) {
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(jeton)) throw notFound("Lien");
    const r = await this.prisma.reponseNegoce.findUnique({
      where: { tokenHash: hash(jeton) },
      include: { lot: { include: { besoins: { where: { statut: { in: ["signe", "engage", "en_attente"] } }, orderBy: { createdAt: "asc" } } } }, negoce: true, fichiers: { select: { nom: true } } },
    });
    if (!r) throw notFound("Lien");
    const accord = await this.prisma.accordNegoce.findUnique({ where: { lotId_negoceId: { lotId: r.lotId, negoceId: r.negoceId } } });
    return { ...r, accord };
  }
}
