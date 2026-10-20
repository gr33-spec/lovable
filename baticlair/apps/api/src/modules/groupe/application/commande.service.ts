import {
  documentBonDeCommande,
  documentFacture,
  documentRecapitulatif,
  excluDuGroupe,
  factureARelancer,
  factureDeCommission,
  livraisonARelancer,
  messageDesistement,
  messageLivraisonDuJour,
  messageNegoceRetenu,
  sanctionDesistement,
  totalDuBon,
  type BonDeCommande,
  type EmetteurFacture,
  type MessageArtisan,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../../tenancy/index.js";
import { assertCanWrite } from "../../tenancy/index.js";
import { pdfDeTexte } from "./pdf-texte.js";

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const jour = (d: Date) => d.toISOString().slice(0, 10);
const pdfJoint = (nom: string, pdf: Uint8Array) => ({ filename: nom, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") });

/**
 * BONS DE COMMANDE, FACTURE, LIVRAISON, DÉSISTEMENT (parcours groupé, étape 7). Dès le négoce retenu : un bon de commande
 * PDF par artisan, envoyé au négoce avec le récapitulatif de ses livraisons, copie à l'artisan ; la facture de commission
 * (2 % × total HT des bons, à 30 jours) part au négoce aussitôt, relancée après l'échéance ; l'artisan confirme la
 * livraison d'un tap (« Livré » / « Problème »), relancé à J+15 ; un désistement après bon de commande est journalisé à
 * part (avertissement, puis exclusion 6 mois) et le négoce est prévenu.
 */
export interface ReglagesFacture {
  emetteur: EmetteurFacture | null;
  tvaPourcent: number;
}

export class CommandeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: TransactionalEmailSender,
    private readonly facture: ReglagesFacture,
    /** Étape 8 : les messages 3 et 4 de la section 3, l'avertissement du désistement. */
    private readonly notifications: { prevenir(companyId: string, message: MessageArtisan, courriel?: { objet: string; texte: string; piecesJointes?: { filename: string; contentType: string; contentBase64: string }[] }): Promise<unknown>; emailDe(companyId: string): Promise<string | null> },
  ) {}

  /** Les lots choisis dont les offres n'ont pas encore de bon : bons, récapitulatif, copie à l'artisan, facture. */
  async passerLesCommandes(maintenant = new Date()): Promise<{ lotsCommandes: number; bons: number }> {
    const lots = await this.prisma.lotGroupe.findMany({
      where: { statut: "choisi", negoceRetenuId: { not: null }, offres: { some: { bon: null } } },
      include: { negoceRetenu: true, offres: { include: { besoin: { include: { company: true } }, bon: true } } },
      orderBy: { numero: "asc" },
    });
    let bons = 0;
    for (const lot of lots) {
      const negoce = lot.negoceRetenu!;
      const docs: { offreId: string; bon: BonDeCommande; pdf: Uint8Array; artisanEmail: string | null }[] = [];
      for (const o of lot.offres) {
        if (o.bon) continue;
        const c = o.besoin.company;
        const lien = await this.prisma.negoceArtisan.findUnique({ where: { companyId_negoceId: { companyId: c.id, negoceId: negoce.id } } });
        const proprietaire = await this.prisma.membership.findFirst({ where: { companyId: c.id, role: "owner" }, include: { user: { select: { email: true } } } });
        const artisanEmail = c.contactEmail ?? proprietaire?.user.email ?? null;
        const bon: BonDeCommande = {
          numeroLot: lot.numero,
          artisan: { nom: c.name, siret: c.siret, telephone: c.phone, email: artisanEmail },
          numeroCompte: lien?.numeroCompte ?? null,
          adresseChantier: o.besoin.adresseLivraison,
          lignes: [{ designation: o.besoin.designation, quantite: o.besoin.quantite.toString(), unite: o.besoin.unite, prixUnitaire: Number(o.prixUnitaire) }],
          fenetre: { tot: o.besoin.fenetreTot, tard: o.besoin.fenetreTard },
          dateLivraison: o.dateLivraison,
          negoce: negoce.nom,
        };
        const doc = documentBonDeCommande(bon);
        docs.push({ offreId: o.id, bon, pdf: await pdfDeTexte(doc.titre, doc.blocs), artisanEmail });
      }
      if (docs.length === 0) continue;
      const recap = documentRecapitulatif(lot.numero, negoce.nom, docs.map((d) => d.bon));
      const recapPdf = await pdfDeTexte(recap.titre, recap.blocs);
      // Au négoce : tous les bons du lot et le récapitulatif, en un e-mail.
      await this.email.send({
        to: negoce.email,
        subject: `Tarif groupé lot n° ${lot.numero} : ${docs.length} bon${docs.length > 1 ? "s" : ""} de commande`,
        text: [
          "Bonjour,",
          `Votre offre a été retenue pour le lot n° ${lot.numero}. Vous trouverez ci-joint le bon de commande de chaque artisan (nom, numéro de compte ou ouverture de compte demandée, adresse du chantier, quantités, fenêtre de livraison) et le récapitulatif de vos livraisons.`,
          "Chaque chantier se livre comme une commande normale, sur le compte du client ; facturation et paiement comme d'habitude. La facture de commission de BatiClair suit dans un e-mail à part.",
          "Regroupement artisans, par BatiClair",
        ].join("\n\n"),
        attachments: [pdfJoint(`recapitulatif-lot-${lot.numero}.pdf`, recapPdf), ...docs.map((d, i) => pdfJoint(`bon-de-commande-lot-${lot.numero}-${i + 1}.pdf`, d.pdf))],
        mustDeliver: true,
      });
      const totalLotHt = Math.round(docs.reduce((s, d) => s + totalDuBon(d.bon.lignes), 0) * 100) / 100;
      await this.prisma.$transaction(async (tx) => {
        for (const d of docs) {
          const bon = await tx.bonCommande.create({ data: { offreId: d.offreId, negoceId: negoce.id, pdf: new Uint8Array(d.pdf), envoyeLe: maintenant } });
          await tx.livraison.create({ data: { bonId: bon.id, datePrevue: d.bon.dateLivraison } });
          await tx.besoin.updateMany({ where: { offre: { id: d.offreId } }, data: { statut: "commande" } });
        }
        await tx.journalGroupe.create({ data: { lotId: lot.id, evenement: "bons_envoyes", details: { negoce: negoce.id, bons: docs.length, totalLotHt } } });
      });
      bons += docs.length;
      // Étape 8, message 3 (push + e-mail avec son bon, sans ceux des autres) : « Vos 31 bacs : X € chez A (−Y %). Bon de
      // commande transmis, livraison le 3 nov. »
      for (const d of docs) {
        const offre = lot.offres.find((o) => o.id === d.offreId)!;
        const message = messageNegoceRetenu({
          quantite: d.bon.lignes[0]!.quantite,
          unite: d.bon.lignes[0]!.unite,
          prixUnitaire: d.bon.lignes[0]!.prixUnitaire,
          prixReference: offre.prixReference ? Number(offre.prixReference) : null,
          negoce: negoce.nom,
          dateLivraison: d.bon.dateLivraison,
          numero: lot.numero,
        });
        await this.notifications.prevenir(offre.besoin.companyId, message, {
          objet: `Ton bon de commande, tarif groupé lot n° ${lot.numero}`,
          texte: `Bonjour,\n\n${message.corps}\n\nTu commandes sur ton compte, tu es livré sur ton chantier, tu paies comme d'habitude. Le jour prévu, dis-nous d'un tap si tout est arrivé.\n\nBatiClair`,
          piecesJointes: [pdfJoint(`bon-de-commande-lot-${lot.numero}.pdf`, d.pdf)],
        });
      }
      await this.emettreLaFacture(lot.id, negoce, totalLotHt, maintenant);
    }
    return { lotsCommandes: lots.length, bons };
  }

  /** Section 6 : la facture automatique au bon de commande, 2 % × total HT des bons du lot, à 30 jours. */
  private async emettreLaFacture(lotId: string, negoce: { id: string; nom: string; email: string }, totalLotHt: number, maintenant: Date): Promise<void> {
    const lot = await this.prisma.lotGroupe.findUniqueOrThrow({ where: { id: lotId }, include: { facture: true } });
    if (lot.facture) return;
    const accord = await this.prisma.accordNegoce.findUnique({ where: { lotId_negoceId: { lotId, negoceId: negoce.id } } });
    if (!accord) {
      await this.prisma.journalGroupe.create({ data: { lotId, evenement: "facture_sans_accord", details: { negoce: negoce.id, totalLotHt } } });
      return;
    }
    const { montantHt, montantTtc, echeanceLe } = factureDeCommission(totalLotHt, maintenant, Number(accord.tauxPourcent), this.facture.tvaPourcent);
    const creee = await this.prisma.factureNegoce.create({ data: { lotId, negoceId: negoce.id, accordId: accord.id, totalLotHt, montantHt, emiseLe: maintenant, echeanceLe } });
    if (!this.facture.emetteur) await this.prisma.journalGroupe.create({ data: { lotId, evenement: "facture_emetteur_manquant", details: { numero: creee.numero } } });
    const doc = documentFacture({ numero: creee.numero, numeroLot: lot.numero, negoce, totalLotHt, montantHt, emiseLe: maintenant, echeanceLe, versionContrat: accord.versionContrat, tvaPourcent: this.facture.tvaPourcent }, this.facture.emetteur);
    const pdf = await pdfDeTexte(doc.titre, doc.blocs);
    let envoyee = false;
    try {
      await this.email.send({
        to: negoce.email,
        subject: `Facture n° ${creee.numero}, commission d'apporteur d'affaires, lot n° ${lot.numero}`,
        text: `Bonjour,\n\nConformément à l'accord accepté lors de votre réponse (version ${accord.versionContrat}), vous trouverez ci-joint la facture de commission de ${montantHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT, soit ${montantTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € TTC (${Number(accord.tauxPourcent)} % de ${totalLotHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT, TVA ${this.facture.tvaPourcent} %), payable à 30 jours, soit le ${jour(echeanceLe)}.\n\nBatiClair`,
        attachments: [pdfJoint(`facture-${creee.numero}.pdf`, pdf)],
        mustDeliver: true,
      });
      envoyee = true;
    } catch {
      envoyee = false;
    }
    await this.prisma.factureNegoce.update({ where: { id: creee.id }, data: { pdf: new Uint8Array(pdf), ...(envoyee ? { envoyeeLe: maintenant, statut: "envoyee" } : {}) } });
    await this.prisma.journalGroupe.create({ data: { lotId, evenement: envoyee ? "facture_envoyee" : "facture_emise", details: { numero: creee.numero, montantHt, echeanceLe: jour(echeanceLe) } } });
  }

  /** La relance automatique des factures échues (une fois). */
  async relancerLesFactures(maintenant = new Date()): Promise<{ relancees: number }> {
    const dues = await this.prisma.factureNegoce.findMany({ where: { statut: "envoyee", relanceeLe: null, payeeLe: null, echeanceLe: { lt: maintenant } }, include: { negoce: true, lot: true } });
    let relancees = 0;
    for (const f of dues) {
      if (!factureARelancer(f, maintenant)) continue;
      try {
        await this.email.send({
          to: f.negoce.email,
          subject: `Relance : facture n° ${f.numero}, lot n° ${f.lot.numero}`,
          text: `Bonjour,\n\nSauf erreur de notre part, la facture n° ${f.numero} (${Number(f.montantHt).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT, échue le ${jour(f.echeanceLe)}) reste à régler. Merci de la régulariser.\n\nBatiClair`,
          ...(f.pdf ? { attachments: [pdfJoint(`facture-${f.numero}.pdf`, f.pdf)] } : {}),
          mustDeliver: true,
        });
        await this.prisma.factureNegoce.update({ where: { id: f.id }, data: { relanceeLe: maintenant, statut: "relancee" } });
        await this.prisma.journalGroupe.create({ data: { lotId: f.lotId, evenement: "facture_relancee", details: { numero: f.numero } } });
        relancees++;
      } catch {
        // Retentée au prochain passage.
      }
    }
    return { relancees };
  }

  /** « Livré » / « Problème », d'un tap, par l'artisan. */
  async confirmerLivraison(tenant: TenantContext, bonId: string, statut: "livre" | "probleme", texte: string | null): Promise<{ bonId: string; statut: string; confirmeLe: string }> {
    assertCanWrite(tenant);
    const bon = await this.bonDe(tenant, bonId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.livraison.update({ where: { bonId: bon.id }, data: { statut, confirmeLe: now } }),
      this.prisma.besoin.update({ where: { id: bon.offre.besoinId }, data: statut === "livre" ? { statut: "livre" } : {} }),
      this.prisma.journalGroupe.create({ data: { lotId: bon.offre.lotId, evenement: statut === "livre" ? "livraison_confirmee" : "livraison_probleme", details: { bon: bon.id, ...(texte ? { texte } : {}) } } }),
    ]);
    return { bonId: bon.id, statut, confirmeLe: now.toISOString() };
  }

  /** Section 2, étape 8 : relance à J+15 après la date prévue, tant que l'artisan n'a rien dit. */
  async relancerLesLivraisons(maintenant = new Date()): Promise<{ relancees: number }> {
    const prevues = await this.prisma.livraison.findMany({ where: { statut: "prevue", relanceLe: null, datePrevue: { not: null } }, include: { bon: { include: { offre: { include: { besoin: { include: { company: true } }, lot: true } } } } } });
    let relancees = 0;
    for (const l of prevues) {
      if (!livraisonARelancer(l, maintenant)) continue;
      const c = l.bon.offre.besoin.company;
      const proprietaire = await this.prisma.membership.findFirst({ where: { companyId: c.id, role: "owner" }, include: { user: { select: { email: true } } } });
      const to = c.contactEmail ?? proprietaire?.user.email;
      if (to) {
        try {
          await this.email.send({ to, subject: `Lot n° ${l.bon.offre.lot.numero} : tout est arrivé ?`, text: `Bonjour,\n\nTa livraison (${l.bon.offre.besoin.designation}) était prévue le ${jour(l.datePrevue!)}. Tout est arrivé ? Dis-le d'un tap dans BatiClair, onglet Groupé : « Livré » ou « Problème ».\n\nBatiClair` });
        } catch {
          continue;
        }
      }
      await this.prisma.livraison.update({ where: { id: l.id }, data: { relanceLe: maintenant } });
      relancees++;
    }
    return { relancees };
  }

  /** Section 4 c : l'artisan ne commande pas après le bon. Avertissement, puis exclusion 6 mois ; le négoce est prévenu. */
  async seDesister(tenant: TenantContext, bonId: string, raison: string | null): Promise<{ sanction: "avertissement" | "exclusion"; excluJusquau: string | null }> {
    assertCanWrite(tenant);
    const bon = await this.bonDe(tenant, bonId);
    if (bon.livraison?.statut === "livre") throw new DomainError("conflict", "Already delivered", { reason: "deja_livre" });
    const deja = await this.prisma.desistement.findFirst({ where: { bonId: bon.id } });
    if (deja) throw new DomainError("conflict", "Already withdrawn", { reason: "deja_desiste" });
    const now = new Date();
    const precedents = await this.prisma.desistement.findMany({ where: { companyId: tenant.companyId }, select: { createdAt: true } });
    const s = sanctionDesistement(precedents.map((p) => p.createdAt), now);
    await this.prisma.$transaction([
      this.prisma.desistement.create({ data: { companyId: tenant.companyId, lotId: bon.offre.lotId, bonId: bon.id, raison, sanction: s.sanction, excluJusquau: s.excluJusquau } }),
      this.prisma.besoin.update({ where: { id: bon.offre.besoinId }, data: { statut: "retire", retireLe: now } }),
      this.prisma.livraison.updateMany({ where: { bonId: bon.id }, data: { statut: "probleme", confirmeLe: now } }),
      this.prisma.journalGroupe.create({ data: { lotId: bon.offre.lotId, evenement: "desistement", details: { bon: bon.id, sanction: s.sanction, ...(raison ? { raison } : {}) } } }),
    ]);
    // Le négoce est prévenu et peut annuler la ligne.
    try {
      await this.email.send({
        to: bon.negoce.email,
        subject: `Tarif groupé lot n° ${bon.offre.lot.numero} : une commande annulée`,
        text: `Bonjour,\n\nLe client ${bon.offre.besoin.company.name} ne donne pas suite à son bon de commande du lot n° ${bon.offre.lot.numero} (${bon.offre.besoin.quantite.toString()} ${bon.offre.besoin.unite} ${bon.offre.besoin.designation}, ${bon.offre.besoin.adresseLivraison}). Vous pouvez annuler cette ligne ; les autres bons du lot sont inchangés.\n\nRegroupement artisans, par BatiClair`,
      });
    } catch {
      // Journalisé ; Greg le voit.
    }
    // Étape 8 (décision du fondateur, 2026-10-20) : l'avertissement à l'artisan, par e-mail.
    const avertissement = messageDesistement(s);
    const to = await this.notifications.emailDe(tenant.companyId);
    if (to) {
      try {
        await this.email.send({ to, subject: avertissement.objet, text: avertissement.texte });
      } catch {
        // Journalisé plus haut ; rien d'autre.
      }
    }
    return { sanction: s.sanction, excluJusquau: s.excluJusquau ? jour(s.excluJusquau) : null };
  }

  /** Étape 8, message 4 : le jour prévu, « Livraison aujourd'hui. Tout est arrivé ? », une fois. */
  async prevenirLesLivraisonsDuJour(maintenant = new Date()): Promise<{ prevenues: number }> {
    const aujourdHui = new Date(jour(maintenant));
    const livraisons = await this.prisma.livraison.findMany({ where: { statut: "prevue", prevenuLe: null, datePrevue: { lte: aujourdHui } }, include: { bon: { include: { offre: { include: { besoin: { select: { companyId: true } }, lot: { select: { numero: true } } } } } } } });
    let prevenues = 0;
    for (const l of livraisons) {
      await this.notifications.prevenir(l.bon.offre.besoin.companyId, messageLivraisonDuJour({ numero: l.bon.offre.lot.numero }));
      await this.prisma.livraison.update({ where: { id: l.id }, data: { prevenuLe: maintenant } });
      prevenues++;
    }
    return { prevenues };
  }

  /** L'entreprise est-elle exclue du groupé (section 4 c) ? */
  async exclue(companyId: string, maintenant = new Date()): Promise<boolean> {
    const rows = await this.prisma.desistement.findMany({ where: { companyId, excluJusquau: { not: null } }, select: { excluJusquau: true } });
    return excluDuGroupe(rows.map((r) => r.excluJusquau), maintenant);
  }

  /** Le compteur « Économisé grâce au groupé » (section 6) : la somme des économies des offres commandées. */
  async economies(tenant: TenantContext): Promise<{ total: string; lots: number }> {
    const offres = await this.prisma.offreArtisan.findMany({ where: { besoin: { companyId: tenant.companyId }, bon: { isNot: null } }, select: { economie: true } });
    const total = offres.reduce((s, o) => s + Number(o.economie ?? 0), 0);
    return { total: (Math.round(total * 100) / 100).toFixed(2), lots: offres.length };
  }

  private async bonDe(tenant: TenantContext, bonId: string) {
    if (!isUuid(bonId)) throw notFound("Bon");
    const bon = await this.prisma.bonCommande.findFirst({
      where: { id: bonId, offre: { besoin: { companyId: tenant.companyId } } },
      include: { livraison: true, negoce: true, offre: { include: { besoin: { include: { company: true } }, lot: true } } },
    });
    if (!bon) throw notFound("Bon");
    return bon;
  }
}
