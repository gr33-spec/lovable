import {
  de,
  communeDe,
  dateLimiteNegociation,
  joursAvant,
  memeJourParis,
  negocesAAppeler,
  pastilleRegroupement,
  phraseFormation,
  phraseNouveauTotal,
  rappelDu,
  articleNegociable,
  commissionDe,
  lireModeRegroupement,
  LIBELLES_REGROUPEMENT_NEGOCIE,
  LIGNE_COMMISSION_INCLUSE,
  LIGNE_NEGOCIE_PAR_MOBIIZ,
  MESSAGE_HORS_ZONE,
  NOM_APP,
  negoceMasque,
  participantsNegocie,
  passageRegroupement,
  phraseRefusNegociable,
  phraseVeille,
  prixAffiche,
  referenceStricte,
  rejointLeRegroupement,
  veilleANotifier,
  zoneDuCodePostal,
  type ModeRegroupement,
  type RefusNegociable,
  type StatutBesoinNegocie,
  type StatutRegroupementNegocie,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, forbidden, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { bonDeCommandePdf } from "../../../platform/pdf/bon-de-commande.js";
import type { PushSender } from "../../../platform/push/push.port.js";
import type { CommandeDuMoisService } from "../../groupe/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { DroitsService } from "./droits.service.js";
import type { ObservatoireService } from "./observatoire.service.js";

/**
 * LE REGROUPEMENT NÉGOCIÉ PAR UN HUMAIN (Greg, 25 octobre 2026, « business model final ») :
 * - l'artisan déclare un BESOIN (gros article, quantité, date de besoin, commune de livraison) depuis un chantier ou
 *   l'onglet ; les besoins d'une même référence, d'un même département, à dates compatibles, forment un REGROUPEMENT ;
 * - les lignes groupables d'une demande perso restent EN VEILLE jusqu'à la date de besoin : quand un regroupement se forme
 *   sur la même référence, « Tu les ajoutes ? » (push + e-mail), un clic, sans ressaisie ;
 * - un CHASSEUR de Mobiiz prend le regroupement en charge, appelle les négoces (journal), saisit l'OFFRE (prix négocié,
 *   commission intégrée au prix affiché), l'envoie à tous ; chaque artisan accepte (commande ferme, bon de commande) ou
 *   refuse ; le chasseur transmet au négoce la commande totale des quantités acceptées.
 * L'artisan ne voit ni nom ni commune des autres ; le nom du négoce lui est masqué jusqu'à son acceptation.
 */

const CLE_MODE = "regroupement:mode";
const JOUR = 86_400_000;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 }).replace(/\u202f/g, "\u00a0")} €`;
const qte = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/\u202f/g, "\u00a0");
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
const DANS: StatutBesoinNegocie[] = ["declare", "accepte", "refuse"];

export interface DeclarationBesoin {
  projectId?: string | null;
  articleKey?: string | null;
  designation?: string | null;
  quantite?: number | null;
  unite?: string | null;
  dateBesoin: Date;
  livraison?: string | null;
}

export interface SaisieOffre {
  negoceNom: string;
  negoceEmail: string;
  negoceTelephone: string | null;
  prixNegocieHt: number;
  commissionPct: number | null;
  livraisonHt: number;
  conditions: string | null;
  valideJusquau: Date;
}

export class NegocieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly droits: Pick<DroitsService, "exiger" | "zoneDe" | "zoneActive">,
    private readonly commande: Pick<CommandeDuMoisService, "lignesDuChantier">,
    private readonly observatoire: Pick<ObservatoireService, "enregistrer">,
    private readonly mailer: TransactionalEmailSender,
    private readonly push: PushSender | null,
    private readonly cfg: { webAppUrl: string; mode: ModeRegroupement; chasseurs: string[]; admins: string[]; commissionDefaut: number; seuilAnonymat: number; emailChasseur?: string | null; delaiLivraisonJours?: number },
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* --------------------------------------------------------------------------------------------- le mode (admin) */

  async mode(): Promise<ModeRegroupement> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_MODE } });
    return p ? lireModeRegroupement(p.valeur) : this.cfg.mode;
  }

  async changerMode(mode: ModeRegroupement): Promise<{ mode: ModeRegroupement }> {
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_MODE }, create: { cle: CLE_MODE, valeur: mode }, update: { valeur: mode } });
    return { mode };
  }

  private async exigerHumain(): Promise<void> {
    if ((await this.mode()) !== "humain") throw new DomainError("conflict", "Human mode is off", { reason: "mode_automatique" });
  }

  /* ----------------------------------------------------------------------------------------- l'artisan : déclarer */

  /** Les lignes d'un chantier qui se négocient en groupe (gros articles identiques), les autres avec leur raison. */
  async lignesNegociables(tenant: TenantContext, projectId: string) {
    const { lignes, adresse } = await this.commande.lignesDuChantier(tenant, projectId);
    const zone = zoneDuCodePostal(adresse) ?? (await this.droits.zoneDe(tenant.companyId));
    return {
      zone,
      zoneActive: this.droits.zoneActive(zone),
      message: this.droits.zoneActive(zone) ? null : MESSAGE_HORS_ZONE,
      lignes: lignes.map((l) => {
        const a = articleNegociable(l.designation);
        return a.ok
          ? { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, negociable: true, reference: a.reference.libelle, raison: null }
          : { key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite, negociable: false, reference: null, raison: phraseRefusNegociable((a as { raison: RefusNegociable }).raison) };
      }),
    };
  }

  /** Déclarer un besoin : depuis une ligne de chantier, ou un article tapé. Il rejoint (ou forme) le regroupement. */
  async declarer(tenant: TenantContext, d: DeclarationBesoin) {
    assertCanWrite(tenant);
    await this.exigerHumain();
    let designation = d.designation?.trim() ?? "";
    let quantite = d.quantite ?? null;
    let unite = d.unite?.trim() ?? "";
    let livraison = d.livraison?.trim() || null;
    if (d.projectId && d.articleKey) {
      const { lignes, adresse } = await this.commande.lignesDuChantier(tenant, d.projectId);
      const l = lignes.find((x) => x.key === d.articleKey);
      if (!l) throw notFound("Line");
      designation = l.designation;
      quantite = quantite ?? l.quantite;
      unite = l.unite;
      livraison = livraison ?? adresse;
    }
    if (!designation || !(quantite && quantite > 0) || !unite) throw validationFailed("Article, quantity and unit required", { reason: "besoin_incomplet" });
    const a = articleNegociable(designation);
    if (!a.ok) throw validationFailed(phraseRefusNegociable((a as { raison: RefusNegociable }).raison), { reason: "non_negociable", phrase: phraseRefusNegociable((a as { raison: RefusNegociable }).raison) });
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } });
    livraison = livraison ?? company?.address ?? null;
    const departement = zoneDuCodePostal(livraison) ?? (await this.droits.zoneDe(tenant.companyId));
    if (!departement || !livraison) throw validationFailed("A delivery town with a postcode is required", { reason: "livraison_requise" });
    // Les droits (zone ouverte, formule) se lisent au département de la livraison, pas seulement à celui de l'entreprise.
    await this.droits.exiger(tenant.companyId, { type: "regroupement", zone: departement });
    const besoin = await this.prisma.besoinNegocie.create({
      data: {
        companyId: tenant.companyId,
        projectId: d.projectId ?? null,
        articleKey: d.articleKey ?? null,
        designation,
        cle: a.reference.cle,
        famille: a.reference.famille,
        quantite,
        unite,
        departement,
        livraison,
        dateBesoin: d.dateBesoin,
        statut: "declare",
      },
    });
    const regroupement = await this.rattacher(besoin.id);
    return { besoinId: besoin.id, regroupementId: regroupement.id };
  }

  /** Le besoin rejoint le regroupement ouvert compatible, ou en forme un ; les lignes en veille de la zone sont prévenues. */
  private async rattacher(besoinId: string) {
    const b = await this.prisma.besoinNegocie.findUniqueOrThrow({ where: { id: besoinId } });
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { cle: b.cle, departement: b.departement, statut: { in: ["en_collecte", "en_negociation"] } }, orderBy: { createdAt: "asc" } });
    let r = ouverts.find((x) => rejointLeRegroupement(b, { ...x, statut: x.statut as StatutRegroupementNegocie }));
    if (!r) {
      const ref = referenceStricte(b.designation);
      r = await this.prisma.regroupementNegocie.create({ data: { cle: b.cle, libelle: ref.ok ? ref.reference.libelle : b.designation, famille: b.famille, departement: b.departement, dateBesoinMin: b.dateBesoin } });
    } else if (!r.dateBesoinMin || b.dateBesoin < r.dateBesoinMin) {
      r = await this.prisma.regroupementNegocie.update({ where: { id: r.id }, data: { dateBesoinMin: b.dateBesoin } });
    }
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { regroupementId: r.id } });
    await this.alerterChasseur(r.id);
    await this.notifierLesVeilles(r);
    return r;
  }

  /* ------------------------------------------------------------------------------------- la veille et le rattrapage */

  /**
   * Branché sur l'envoi d'une demande perso : chaque ligne groupable reste en veille jusqu'à la date de besoin (30 jours
   * sans date). Si un regroupement compatible existe déjà, l'artisan est prévenu tout de suite.
   */
  async mettreEnVeille(companyId: string, priceRequestId: string): Promise<number> {
    if ((await this.mode()) !== "humain") return 0;
    const d = await this.prisma.priceRequest.findUnique({ where: { id: priceRequestId }, select: { lines: true, dueDate: true, projectId: true, project: { select: { address: true } }, company: { select: { address: true } } } });
    if (!d) return 0;
    const livraison = d.project.address ?? d.company.address;
    const departement = zoneDuCodePostal(livraison);
    if (!departement || !livraison || !this.droits.zoneActive(departement)) return 0;
    const dateBesoin = d.dueDate ?? new Date(this.now().getTime() + 30 * JOUR);
    let n = 0;
    for (const l of (d.lines as { designation: string; quantity: string | null; unit: string | null }[] | null) ?? []) {
      const a = articleNegociable(l.designation);
      const q = Number(String(l.quantity ?? "").replace(/\s/g, "").replace(",", "."));
      if (!a.ok || !(q > 0)) continue;
      const deja = await this.prisma.besoinNegocie.findFirst({ where: { companyId, priceRequestId, cle: a.reference.cle } });
      if (deja) continue;
      await this.prisma.besoinNegocie.create({ data: { companyId, projectId: d.projectId, priceRequestId, designation: l.designation, cle: a.reference.cle, famille: a.reference.famille, quantite: q, unite: l.unit ?? "", departement, livraison, dateBesoin, statut: "veille" } });
      n++;
    }
    const ouverts = await this.prisma.regroupementNegocie.findMany({ where: { departement, statut: { in: ["en_collecte", "en_negociation"] } } });
    for (const r of ouverts) await this.notifierLesVeilles(r);
    return n;
  }

  /** Les lignes en veille qui correspondent à ce regroupement sont prévenues une fois, sauf déjà commandées en perso. */
  private async notifierLesVeilles(r: { id: string; cle: string; departement: string; dateBesoinMin: Date | null; statut: string; libelle: string }) {
    const veilles = await this.prisma.besoinNegocie.findMany({ where: { cle: r.cle, departement: r.departement, statut: "veille", notifieLe: null }, include: { company: { select: { id: true } } } });
    const maintenant = this.now();
    for (const v of veilles) {
      if (!rejointLeRegroupement(v, { ...r, statut: r.statut as StatutRegroupementNegocie })) continue;
      const commandeEnPerso = v.priceRequestId ? !!(await this.prisma.priceRequestRecipient.findFirst({ where: { priceRequestId: v.priceRequestId, commandeLe: { not: null } }, select: { id: true } })) : false;
      if (!veilleANotifier({ statut: "veille", notifieLe: v.notifieLe, dateBesoin: v.dateBesoin, commandeEnPerso }, maintenant)) continue;
      const chantier = v.projectId ? ((await this.prisma.project.findUnique({ where: { id: v.projectId }, select: { name: true } }))?.name ?? "") : "";
      const phrase = phraseVeille(r.libelle, `${qte(Number(v.quantite))} ${v.unite}`, chantier);
      await this.prisma.besoinNegocie.update({ where: { id: v.id }, data: { notifieLe: maintenant } });
      await this.prevenir(v.companyId, { titre: "Un regroupement se forme", phrase, url: "/regroupements" });
    }
  }

  /** « Oui, j'ajoute » : la ligne en veille rejoint le regroupement, sans ressaisie. */
  async ajouterDepuisVeille(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    await this.exigerHumain();
    await this.droits.exiger(tenant.companyId, { type: "regroupement" });
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "veille") throw new DomainError("conflict", "Not in watch", { reason: "pas_en_veille" });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "declare" } });
    const r = await this.rattacher(b.id);
    return { besoinId: b.id, regroupementId: r.id };
  }

  /** « Non merci » : la ligne sort de la veille, plus aucune alerte pour elle. */
  async nonMerci(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "veille") throw new DomainError("conflict", "Not in watch", { reason: "pas_en_veille" });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "non_merci" } });
    return { fait: true };
  }

  /** Retirer son besoin tant qu'il n'est pas accepté. */
  async retirer(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut === "accepte") throw new DomainError("conflict", "Already ordered", { reason: "deja_commande" });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "retire" } });
    return { fait: true };
  }

  private async monBesoin(tenant: TenantContext, besoinId: string) {
    const b = await this.prisma.besoinNegocie.findFirst({ where: { id: besoinId, companyId: tenant.companyId } });
    if (!b) throw notFound("Besoin");
    return b;
  }

  /* ------------------------------------------------------------------------------------------- l'artisan : sa vue */

  /** Tout ce que voit l'artisan : ses besoins (statut, offre, comparaison avec sa demande perso) et ses lignes en veille. */
  async mesBesoins(tenant: TenantContext) {
    const zone = await this.droits.zoneDe(tenant.companyId);
    const mode = await this.mode();
    const besoins = await this.prisma.besoinNegocie.findMany({
      where: { companyId: tenant.companyId, statut: { in: ["veille", ...DANS] } },
      include: { regroupement: { include: { offre: true, besoins: { where: { statut: { in: DANS } }, select: { companyId: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const maintenant = this.now();
    const vues = [];
    for (const b of besoins.filter((x) => x.statut !== "veille")) {
      const r = b.regroupement;
      const o = r?.offre && r.offreEnvoyeeLe ? r.offre : null;
      const accepte = b.statut === "accepte";
      const perso = await this.meilleurPrixPerso(tenant.companyId, b.cle, b.unite);
      vues.push({
        id: b.id,
        designation: b.designation,
        quantite: Number(b.quantite),
        unite: b.unite,
        dateBesoin: jourIso(b.dateBesoin),
        statut: b.statut,
        regroupement: r
          ? {
              id: r.id,
              statut: r.statut,
              libelle: LIBELLES_REGROUPEMENT_NEGOCIE[r.statut as StatutRegroupementNegocie] ?? r.statut,
              participants: participantsNegocie(new Set(r.besoins.map((x) => x.companyId)).size, r.departement, this.cfg.seuilAnonymat),
              departement: r.departement,
            }
          : null,
        offre: o
          ? {
              // Nom du négoce masqué jusqu'à l'acceptation.
              negoce: accepte ? o.negoceNom : negoceMasque(r!.departement),
              prixHt: Number(o.prixAfficheHt),
              livraisonHt: Number(o.livraisonHt),
              totalHt: Math.round((Number(o.prixAfficheHt) * Number(b.quantite) + Number(o.livraisonHt)) * 100) / 100,
              conditions: o.conditions,
              valideJusquau: jourIso(o.valideJusquau),
              valide: o.valideJusquau.getTime() + JOUR > maintenant.getTime(),
              mentions: [LIGNE_NEGOCIE_PAR_MOBIIZ, ...(Number(o.commissionPct) > 0 ? [LIGNE_COMMISSION_INCLUSE] : [])],
            }
          : null,
        perso,
        bonNumero: b.bonNumero,
      });
    }
    const veille = [];
    for (const b of besoins.filter((x) => x.statut === "veille")) {
      const chantier = b.projectId ? ((await this.prisma.project.findUnique({ where: { id: b.projectId }, select: { name: true } }))?.name ?? null) : null;
      veille.push({ id: b.id, designation: b.designation, quantite: Number(b.quantite), unite: b.unite, chantier, dateBesoin: jourIso(b.dateBesoin), regroupementDisponible: !!b.notifieLe });
    }
    return { mode, zone, zoneActive: this.droits.zoneActive(zone), message: this.droits.zoneActive(zone) ? null : MESSAGE_HORS_ZONE, besoins: vues, veille };
  }

  /** Le meilleur prix reçu en demande perso pour la même référence (la comparaison dans le même écran), ou null. */
  private async meilleurPrixPerso(companyId: string, cle: string, unite: string): Promise<{ prixHt: number; negoce: string } | null> {
    const recus = await this.prisma.priceRequestRecipient.findMany({
      where: { priceRequest: { companyId, but: { not: null } }, reponduLe: { not: null } },
      select: { prix: true, supplier: { select: { name: true } }, priceRequest: { select: { lines: true } } },
      take: 200,
    });
    let meilleur: { prixHt: number; negoce: string } | null = null;
    for (const r of recus) {
      const prix = (r.prix as Record<string, number> | null) ?? {};
      ((r.priceRequest.lines as { designation: string; unit: string | null }[] | null) ?? []).forEach((l, i) => {
        const ref = referenceStricte(l.designation);
        const p = prix[String(i)];
        if (ref.ok && ref.reference.cle === cle && (l.unit ?? "") === unite && typeof p === "number" && (!meilleur || p < meilleur.prixHt)) meilleur = { prixHt: p, negoce: r.supplier.name };
      });
    }
    return meilleur;
  }

  /** Accepter l'offre : commande ferme sur sa quantité, bon de commande (PDF à champs remplissables). */
  async accepter(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut === "accepte") throw new DomainError("conflict", "Already accepted", { reason: "deja_accepte" });
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    const r = b.regroupementId ? await this.prisma.regroupementNegocie.findUnique({ where: { id: b.regroupementId }, include: { offre: true } }) : null;
    const o = r?.offre;
    if (!r || !o || !r.offreEnvoyeeLe || r.statut !== "offre_recue") throw new DomainError("conflict", "No offer yet", { reason: "sans_offre" });
    const maintenant = this.now();
    if (o.valideJusquau.getTime() + JOUR <= maintenant.getTime()) throw new DomainError("conflict", "Offer expired", { reason: "offre_expiree" });
    const rang = (await this.prisma.besoinNegocie.count({ where: { regroupementId: r.id, bonNumero: { not: null } } })) + 1;
    const bonNumero = r.numero * 1000 + rang;
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "accepte", accepteLe: maintenant, bonNumero } });
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const prix = Number(o.prixAfficheHt);
    const quantite = Number(b.quantite);
    const totalLignes = Math.round(prix * quantite * 100) / 100;
    const total = totalLignes + Number(o.livraisonHt);
    const pdf = await bonDeCommandePdf({
      numero: String(bonNumero),
      date: jourFr(maintenant),
      acheteur: { nom: company?.name ?? "", adresse: company?.address ?? null, telephone: company?.phone ?? null, email: company?.contactEmail ?? null },
      vendeur: { nom: o.negoceNom, email: o.negoceEmail },
      livraison: b.livraison,
      lignes: [{ designation: b.designation, quantite: qte(quantite), unite: b.unite, prixHt: euros(prix), totalHt: euros(totalLignes) }],
      livraisonHt: Number(o.livraisonHt) > 0 ? euros(Number(o.livraisonHt)) : "offerte",
      totalHt: euros(total),
      mentions: [`${LIGNE_NEGOCIE_PAR_MOBIIZ} (regroupement n° ${r.numero}).`, ...(Number(o.commissionPct) > 0 ? [`${LIGNE_COMMISSION_INCLUSE}.`] : []), `Facturation et paiement directement entre l'acheteur et le vendeur. ${NOM_APP} ne vend ni n'achète rien.`],
    });
    const email = company?.contactEmail ?? (await this.emailDuProprietaire(tenant.companyId));
    if (email)
      await this.mailer.send({
        to: email,
        subject: `Ta commande groupée n° ${bonNumero} : ${b.designation}`,
        text: ["Bonjour,", "", `C'est commandé : ${qte(quantite)} ${b.unite} ${de(b.designation)} chez ${o.negoceNom}, ${euros(total)} HT livré.`, "Ton bon de commande est joint (tu peux y remplir ton numéro de compte client et ta date de livraison).", "", `${this.cfg.webAppUrl}/regroupements`, "", NOM_APP].join("\n"),
        attachments: [{ filename: `bon-de-commande-${bonNumero}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") }],
      });
    await this.observatoire.enregistrer({ type: "groupe", sourceId: r.id, departement: r.departement, lignes: [{ designation: b.designation, unite: b.unite, quantite, prixHt: prix }] });
    return { bonNumero, negoce: o.negoceNom, totalHt: total };
  }

  async refuser(tenant: TenantContext, besoinId: string) {
    assertCanWrite(tenant);
    const b = await this.monBesoin(tenant, besoinId);
    if (b.statut !== "declare") throw new DomainError("conflict", "Not open", { reason: "besoin_ferme" });
    await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { statut: "refuse", refuseLe: this.now() } });
    return { fait: true };
  }

  /** Le PDF du bon de commande d'un besoin accepté (re-téléchargeable). */
  async bonPdf(tenant: TenantContext, besoinId: string): Promise<Uint8Array> {
    const b = await this.monBesoin(tenant, besoinId);
    const r = b.regroupementId ? await this.prisma.regroupementNegocie.findUnique({ where: { id: b.regroupementId }, include: { offre: true } }) : null;
    if (b.statut !== "accepte" || !r?.offre || !b.bonNumero) throw notFound("Bon");
    const company = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true, address: true, phone: true, contactEmail: true } });
    const prix = Number(r.offre.prixAfficheHt);
    const quantite = Number(b.quantite);
    return bonDeCommandePdf({
      numero: String(b.bonNumero),
      date: jourFr(b.accepteLe ?? this.now()),
      acheteur: { nom: company?.name ?? "", adresse: company?.address ?? null, telephone: company?.phone ?? null, email: company?.contactEmail ?? null },
      vendeur: { nom: r.offre.negoceNom, email: r.offre.negoceEmail },
      livraison: b.livraison,
      lignes: [{ designation: b.designation, quantite: qte(quantite), unite: b.unite, prixHt: euros(prix), totalHt: euros(Math.round(prix * quantite * 100) / 100) }],
      livraisonHt: Number(r.offre.livraisonHt) > 0 ? euros(Number(r.offre.livraisonHt)) : "offerte",
      totalHt: euros(Math.round(prix * quantite * 100) / 100 + Number(r.offre.livraisonHt)),
      mentions: [`${LIGNE_NEGOCIE_PAR_MOBIIZ} (regroupement n° ${r.numero}).`, ...(Number(r.offre.commissionPct) > 0 ? [`${LIGNE_COMMISSION_INCLUSE}.`] : [])],
    });
  }

  /* ------------------------------------------------------------------------------------------------- le chasseur */

  estChasseur(email: string | null | undefined): boolean {
    const e = (email ?? "").toLowerCase();
    return !!e && (this.cfg.chasseurs.includes(e) || this.cfg.admins.includes(e));
  }

  /** La liste du chasseur : volume total, entreprises, date de besoin la plus proche, négoces de la zone (avec téléphone). */
  async regroupementsDuChasseur(statuts: readonly StatutRegroupementNegocie[] = ["en_collecte", "en_negociation", "offre_recue"]) {
    const regroupements = await this.prisma.regroupementNegocie.findMany({
      where: { statut: { in: [...statuts] } },
      include: { besoins: { where: { statut: { in: DANS } }, include: { company: { select: { name: true } } } }, offre: true, appels: { orderBy: { le: "desc" }, take: 20 } },
      orderBy: [{ dateBesoinMin: "asc" }, { createdAt: "asc" }],
    });
    const maintenant = this.now();
    const sortie = [];
    for (const r of regroupements) {
      const companies = [...new Set(r.besoins.map((b) => b.companyId))];
      const zone = await this.prisma.negoce.findMany({
        where: { departement: r.departement, stopLe: null, OR: [{ generaliste: true }, { familles: { has: r.famille } }] },
        select: { nom: true, email: true, compte: { select: { telephone: true, verification: true, inscritLe: true } } },
        take: 50,
      });
      // Les négoces que ces artisans utilisent en demande perso (même hors de la base de la zone).
      const perso = companies.length
        ? await this.prisma.supplier.findMany({ where: { companyId: { in: companies }, archivedAt: null, recipients: { some: { priceRequest: { but: { not: null } } } } }, select: { name: true, email: true, phone: true } })
        : [];
      const emailsPerso = new Set(perso.map((x) => x.email.toLowerCase()));
      const candidats = new Map<string, { nom: string; email: string; telephone: string | null; verification: string | null; aRepondu: boolean; utiliseEnPerso: boolean }>();
      for (const n of zone) candidats.set(n.email.toLowerCase(), { nom: n.nom, email: n.email, telephone: n.compte?.telephone ?? null, verification: n.compte?.verification ?? null, aRepondu: !!n.compte?.inscritLe, utiliseEnPerso: emailsPerso.has(n.email.toLowerCase()) });
      for (const x of perso) if (!candidats.has(x.email.toLowerCase())) candidats.set(x.email.toLowerCase(), { nom: x.name, email: x.email, telephone: x.phone, verification: null, aRepondu: false, utiliseEnPerso: true });
      for (const c of candidats.values())
        if (!c.aRepondu) c.aRepondu = !!(await this.prisma.priceRequestRecipient.findFirst({ where: { reponduLe: { not: null }, supplier: { email: { equals: c.email, mode: "insensitive" } } }, select: { id: true } }));
      const dateLimite = r.dateBesoinMin ? dateLimiteNegociation(r.dateBesoinMin, this.delai()) : null;
      const joursRestants = dateLimite ? joursAvant(dateLimite, maintenant) : null;
      sortie.push({
        id: r.id,
        numero: r.numero,
        libelle: r.libelle,
        famille: r.famille,
        departement: r.departement,
        statut: r.statut,
        chasseur: r.chasseurEmail,
        dateBesoinMin: r.dateBesoinMin ? jourIso(r.dateBesoinMin) : null,
        dateLimite: dateLimite ? jourIso(dateLimite) : null,
        joursRestants,
        pastille: pastilleRegroupement({ offreSaisie: !!r.offre, joursRestants }),
        volume: r.besoins.reduce((s, b) => s + Number(b.quantite), 0),
        unite: r.besoins[0]?.unite ?? "",
        entreprises: companies.length,
        participants: r.besoins.map((b) => ({ besoinId: b.id, entreprise: b.company.name, quantite: Number(b.quantite), statut: b.statut, commune: communeDe(b.livraison) ?? b.departement, dateBesoin: jourIso(b.dateBesoin) })),
        acceptes: r.besoins.filter((b) => b.statut === "accepte").length,
        negoces: negocesAAppeler([...candidats.values()]),
        offre: r.offre
          ? { negoceNom: r.offre.negoceNom, prixNegocieHt: Number(r.offre.prixNegocieHt), commissionPct: Number(r.offre.commissionPct), prixAfficheHt: Number(r.offre.prixAfficheHt), livraisonHt: Number(r.offre.livraisonHt), valideJusquau: jourIso(r.offre.valideJusquau), envoyee: !!r.offreEnvoyeeLe, transmise: !!r.offre.transmiseLe }
          : null,
        appels: r.appels.map((a) => ({ negoce: a.negoce, note: a.note, le: a.le.toISOString(), par: a.parEmail })),
      });
    }
    // Triés par date butoir (la plus proche d'abord ; sans date à la fin).
    sortie.sort((a, b) => (a.dateLimite ?? "9999").localeCompare(b.dateLimite ?? "9999"));
    return { regroupements: sortie, commissionDefaut: this.cfg.commissionDefaut, aTraiter: await this.aTraiter() };
  }

  private async regroupement(id: string) {
    const r = await this.prisma.regroupementNegocie.findUnique({ where: { id }, include: { offre: true } });
    if (!r) throw notFound("Regroupement");
    return r;
  }

  private async passer(id: string, de: StatutRegroupementNegocie, vers: StatutRegroupementNegocie, data: Record<string, unknown> = {}) {
    if (!passageRegroupement(de, vers)) throw new DomainError("conflict", `Cannot go from ${de} to ${vers}`, { reason: "statut", de, vers });
    await this.prisma.regroupementNegocie.update({ where: { id }, data: { statut: vers, ...data } });
  }

  async prendreEnCharge(chasseur: string, id: string) {
    const r = await this.regroupement(id);
    await this.passer(r.id, r.statut as StatutRegroupementNegocie, "en_negociation", { chasseurEmail: chasseur, prisEnChargeLe: this.now() });
    // Point 4 bis : l'artisan apprend que Mobiiz négocie pour lui (une fois par entreprise).
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: r.id, statut: "declare" } });
    for (const companyId of new Set(besoins.map((b) => b.companyId))) {
      const q = besoins.filter((b) => b.companyId === companyId).reduce((t, b) => t + Number(b.quantite), 0);
      await this.prevenir(companyId, { titre: "Mobiiz négocie pour toi", phrase: `Un chasseur d'opportunités Mobiiz négocie ${qte(q)} ${besoins[0]!.unite} ${de(r.libelle)} pour toi. Tu reçois l'offre ici, et tu choisis.`, url: "/regroupements" });
    }
    return { fait: true };
  }

  async noterAppel(chasseur: string, id: string, a: { negoce: string; note: string }) {
    await this.regroupement(id);
    if (!a.negoce.trim()) throw validationFailed("Supplier required", { reason: "negoce_requis" });
    await this.prisma.appelChasseur.create({ data: { regroupementId: id, negoce: a.negoce.trim(), note: a.note.trim(), parEmail: chasseur, le: this.now() } });
    return { fait: true };
  }

  /** L'offre négociée : le prix affiché intègre la commission (défaut `COMMISSION_DEFAUT`). Modifiable tant qu'elle n'est pas envoyée. */
  async saisirOffre(chasseur: string, id: string, o: SaisieOffre) {
    const r = await this.regroupement(id);
    if (r.statut !== "en_negociation") throw new DomainError("conflict", "Take it first", { reason: "prendre_en_charge_d_abord" });
    if (!(o.prixNegocieHt > 0)) throw validationFailed("Price required", { reason: "prix_requis" });
    if (o.valideJusquau.getTime() < this.now().getTime()) throw validationFailed("Validity in the past", { reason: "validite_passee" });
    const commissionPct = o.commissionPct ?? this.cfg.commissionDefaut;
    const data = {
      negoceNom: o.negoceNom.trim(),
      negoceEmail: o.negoceEmail.trim().toLowerCase(),
      negoceTelephone: o.negoceTelephone?.trim() || null,
      prixNegocieHt: o.prixNegocieHt,
      commissionPct,
      prixAfficheHt: prixAffiche(o.prixNegocieHt, commissionPct),
      livraisonHt: o.livraisonHt,
      conditions: o.conditions?.trim() || null,
      valideJusquau: o.valideJusquau,
      saisieParEmail: chasseur,
    };
    await this.prisma.offreNegociee.upsert({ where: { regroupementId: id }, create: { regroupementId: id, ...data }, update: data });
    return { prixAfficheHt: data.prixAfficheHt };
  }

  /** Envoyer l'offre à tous les artisans du regroupement (push + e-mail), en un clic. */
  async envoyerOffre(chasseur: string, id: string) {
    const r = await this.regroupement(id);
    if (!r.offre) throw validationFailed("No offer", { reason: "offre_requise" });
    await this.passer(r.id, r.statut as StatutRegroupementNegocie, "offre_recue", { offreEnvoyeeLe: this.now() });
    await this.prisma.offreNegociee.update({ where: { regroupementId: id }, data: { envoyeeLe: this.now() } });
    const besoins = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: id, statut: "declare" } });
    for (const b of besoins)
      await this.prevenir(b.companyId, { titre: "Ton offre groupée est arrivée", phrase: `${LIGNE_NEGOCIE_PAR_MOBIIZ} : ${b.designation} à ${euros(Number(r.offre.prixAfficheHt))} HT l'unité. Tu acceptes ou tu refuses, avant le ${jourFr(r.offre.valideJusquau)}.`, url: "/regroupements" });
    return { envoyes: besoins.length, chasseur };
  }

  /** Transmettre au négoce la commande totale (quantités acceptées seulement), avec les entreprises et les communes. */
  async transmettre(chasseur: string, id: string) {
    const r = await this.regroupement(id);
    if (!r.offre || r.statut !== "offre_recue") throw new DomainError("conflict", "No accepted offer", { reason: "sans_offre" });
    const acceptes = await this.prisma.besoinNegocie.findMany({ where: { regroupementId: id, statut: "accepte" }, include: { company: { select: { name: true, phone: true, contactEmail: true } } }, orderBy: { accepteLe: "asc" } });
    if (acceptes.length === 0) throw validationFailed("Nobody accepted", { reason: "aucune_acceptation" });
    const total = acceptes.reduce((s, b) => s + Number(b.quantite), 0);
    const prixNegocie = Number(r.offre.prixNegocieHt);
    const prixArtisan = Number(r.offre.prixAfficheHt);
    await this.mailer.send({
      to: r.offre.negoceEmail,
      subject: `Commande groupée n° ${r.numero} : ${qte(total)} ${acceptes[0]!.unite} ${de(r.libelle)}`,
      text: [
        "Bonjour,",
        "",
        `Comme convenu avec ${chasseur}, voici la commande groupée n° ${r.numero} (${r.libelle}) : ${qte(total)} ${acceptes[0]!.unite} au total, au prix de ${euros(prixArtisan)} HT l'unité facturé à chaque entreprise.`,
        "",
        ...acceptes.map((b) => `- Bon n° ${b.bonNumero} · ${b.company.name} : ${qte(Number(b.quantite))} ${b.unite}, livraison ${b.livraison}${b.company.phone ? `, ${b.company.phone}` : ""}${b.company.contactEmail ? `, ${b.company.contactEmail}` : ""}`),
        "",
        `Chaque entreprise est facturée par vous, sur son compte. Commission Mobiiz : ${euros(Math.round((prixArtisan - prixNegocie) * 100) / 100)} HT par unité, selon nos conditions.`,
        "",
        NOM_APP,
      ].join("\n"),
      mustDeliver: true,
    });
    await this.prisma.offreNegociee.update({ where: { regroupementId: id }, data: { transmiseLe: this.now() } });
    await this.passer(r.id, "offre_recue", "commande", { commandeLe: this.now() });
    return { quantite: total, entreprises: acceptes.length, commissionHt: commissionDe(prixNegocie, prixArtisan, total) };
  }

  async abandonner(chasseur: string, id: string) {
    const r = await this.regroupement(id);
    await this.passer(r.id, r.statut as StatutRegroupementNegocie, "abandonne", { abandonneLe: this.now(), chasseurEmail: r.chasseurEmail ?? chasseur });
    return { fait: true };
  }

  /* ------------------------------------------------------------------------------------------------ prévenir */

  private async emailDuProprietaire(companyId: string): Promise<string | null> {
    const m = await this.prisma.membership.findFirst({ where: { companyId, role: "owner" }, select: { user: { select: { email: true, id: true } } } });
    return m?.user.email ?? null;
  }

  /** Push (téléphones abonnés) + e-mail à l'entreprise. */
  private async prevenir(companyId: string, n: { titre: string; phrase: string; url: string }) {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { contactEmail: true, memberships: { where: { role: "owner" }, select: { user: { select: { id: true, email: true } } }, take: 1 } } });
    const owner = c?.memberships[0]?.user;
    const email = c?.contactEmail ?? owner?.email ?? null;
    if (email) await this.mailer.send({ to: email, subject: n.titre, text: ["Bonjour,", "", n.phrase, "", `${this.cfg.webAppUrl}${n.url}`, "", NOM_APP].join("\n") }).catch(() => undefined);
    if (this.push && owner) {
      const appareils = await this.prisma.pushSubscription.findMany({ where: { userId: owner.id } });
      for (const a of appareils) {
        const r = await this.push.send({ endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth }, { title: n.titre, body: n.phrase, url: n.url, tag: `negocie:${n.url}` }).catch(() => "failed" as const);
        if (r === "gone") await this.prisma.pushSubscription.deleteMany({ where: { endpoint: a.endpoint } });
      }
    }
  }

  /* ---------------------------------------------------------------------------------- les alertes du chasseur (4 bis) */

  private delai() {
    return this.cfg.delaiLivraisonJours ?? 10;
  }

  /** L'e-mail au chasseur (`EMAIL_CHASSEUR`, défaut : l'admin) et la notification sur ses appareils. */
  private async alerteChasseur(sujet: string, lignes: string[], url: string) {
    const to = this.cfg.emailChasseur;
    if (!to) return;
    await this.mailer.send({ to, subject: sujet, text: ["Bonjour,", "", ...lignes, "", `${this.cfg.webAppUrl}${url}`, "", NOM_APP].join("\n") }).catch(() => undefined);
    if (!this.push) return;
    const user = await this.prisma.user.findFirst({ where: { email: { equals: to, mode: "insensitive" } }, select: { id: true } });
    if (!user) return;
    for (const a of await this.prisma.pushSubscription.findMany({ where: { userId: user.id } })) {
      const r = await this.push.send({ endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth }, { title: sujet, body: lignes[0] ?? sujet, url, tag: `chasseur:${url}` }).catch(() => "failed" as const);
      if (r === "gone") await this.prisma.pushSubscription.deleteMany({ where: { endpoint: a.endpoint } });
    }
  }

  private async etatRegroupement(id: string) {
    const r = await this.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id }, include: { besoins: { where: { statut: { in: DANS } } }, offre: true } });
    const entreprises = new Set(r.besoins.map((b) => b.companyId)).size;
    const volume = r.besoins.reduce((t, b) => t + Number(b.quantite), 0);
    const dateLimite = r.dateBesoinMin ? dateLimiteNegociation(r.dateBesoinMin, this.delai()) : null;
    return { r, entreprises, volume, unite: r.besoins[0]?.unite ?? "", dateLimite };
  }

  /**
   * À chaque besoin rattaché : dès la 2e entreprise, l'alerte « Nouveau regroupement » part tout de suite ; ensuite, le
   * premier ajout du jour part tout de suite (« nouveau total »), les suivants attendent le digest de 18 h.
   */
  private async alerterChasseur(regroupementId: string) {
    const { r, entreprises, volume, unite, dateLimite } = await this.etatRegroupement(regroupementId);
    if (entreprises < 2) return;
    const maintenant = this.now();
    const url = `/admin/chasseur#r-${r.id}`;
    if (!r.formationAlerteLe) {
      const butoir = dateLimite ? `Date butoir de la négociation : ${jourFr(dateLimite)}.` : "";
      await this.alerteChasseur(phraseFormation({ libelle: r.libelle, entreprises, volume, unite, dateBesoinMin: r.dateBesoinMin }), [`${phraseFormation({ libelle: r.libelle, entreprises, volume, unite, dateBesoinMin: r.dateBesoinMin })}.`, butoir].filter(Boolean), url);
      await this.prisma.regroupementNegocie.update({ where: { id: r.id }, data: { formationAlerteLe: maintenant, ajoutAlerteLe: maintenant } });
      await this.prisma.besoinNegocie.updateMany({ where: { regroupementId: r.id, signaleLe: null }, data: { signaleLe: maintenant } });
      return;
    }
    if (r.ajoutAlerteLe && memeJourParis(r.ajoutAlerteLe, maintenant)) return;
    await this.alerteChasseur(`${r.libelle} : nouveau total`, [phraseNouveauTotal({ libelle: r.libelle, entreprises, volume, unite })], url);
    await this.prisma.regroupementNegocie.update({ where: { id: r.id }, data: { ajoutAlerteLe: maintenant } });
    await this.prisma.besoinNegocie.updateMany({ where: { regroupementId: r.id, signaleLe: null }, data: { signaleLe: maintenant } });
  }

  /**
   * La tâche du soir (18 h, Paris) : le digest des ajouts du jour, les rappels J-5 et J-2 au chasseur tant qu'aucune offre
   * n'est saisie, et le rappel à l'artisan qui n'a pas répondu 48 h avant la fin de validité de l'offre.
   */
  async tacheDuSoir(maintenant = this.now()) {
    const ouverts = ["en_collecte", "en_negociation", "offre_recue"];
    const aDigerer = await this.prisma.regroupementNegocie.findMany({ where: { statut: { in: ouverts }, formationAlerteLe: { not: null }, besoins: { some: { signaleLe: null, statut: { in: DANS } } } }, select: { id: true } });
    const lignes: string[] = [];
    for (const { id } of aDigerer) {
      const { r, entreprises, volume, unite } = await this.etatRegroupement(id);
      lignes.push(`- ${phraseNouveauTotal({ libelle: r.libelle, entreprises, volume, unite })}`);
      await this.prisma.besoinNegocie.updateMany({ where: { regroupementId: id, signaleLe: null }, data: { signaleLe: maintenant } });
    }
    if (lignes.length) await this.alerteChasseur(`Les ajouts du jour (${lignes.length} regroupement${lignes.length > 1 ? "s" : ""})`, lignes, "/admin/chasseur");

    let rappels = 0;
    for (const x of await this.prisma.regroupementNegocie.findMany({ where: { statut: { in: ["en_collecte", "en_negociation"] }, dateBesoinMin: { not: null } }, select: { id: true } })) {
      const { r, entreprises, volume, unite, dateLimite } = await this.etatRegroupement(x.id);
      if (!dateLimite || entreprises === 0) continue;
      const joursRestants = joursAvant(dateLimite, maintenant);
      const rap = rappelDu({ offreSaisie: !!r.offre, joursRestants, rappelJ5Le: r.rappelJ5Le, rappelJ2Le: r.rappelJ2Le });
      if (!rap) continue;
      await this.alerteChasseur(`${rap} : ${r.libelle}, aucune offre saisie`, [`${r.libelle} : ${qte(volume)} ${unite}, ${entreprises} entreprise${entreprises > 1 ? "s" : ""}.`, `Date butoir de la négociation : ${jourFr(dateLimite)} (${rap}).`], `/admin/chasseur#r-${r.id}`);
      await this.prisma.regroupementNegocie.update({ where: { id: r.id }, data: rap === "J-2" ? { rappelJ2Le: maintenant, rappelJ5Le: r.rappelJ5Le ?? maintenant } : { rappelJ5Le: maintenant } });
      rappels++;
    }

    let rappelsArtisans = 0;
    const enAttente = await this.prisma.besoinNegocie.findMany({ where: { statut: "declare", rappelOffreLe: null, regroupement: { statut: "offre_recue", offreEnvoyeeLe: { not: null } } }, include: { regroupement: { include: { offre: true } } } });
    for (const b of enAttente) {
      const o = b.regroupement?.offre;
      if (!o) continue;
      const fin = o.valideJusquau.getTime() + JOUR;
      if (fin <= maintenant.getTime() || fin - maintenant.getTime() > 2 * JOUR) continue;
      await this.prevenir(b.companyId, { titre: "Ton offre groupée se termine bientôt", phrase: `L'offre négociée par Mobiiz sur ${b.designation} est valable jusqu'au ${jourFr(o.valideJusquau)}. Tu acceptes ou tu refuses ?`, url: "/regroupements" });
      await this.prisma.besoinNegocie.update({ where: { id: b.id }, data: { rappelOffreLe: maintenant } });
      rappelsArtisans++;
    }
    return { digest: lignes.length, rappels, rappelsArtisans };
  }

  /** Le compteur « à traiter » du menu : les regroupements formés (2 entreprises ou plus) sans offre saisie. */
  async aTraiter(): Promise<number> {
    const rs = await this.prisma.regroupementNegocie.findMany({ where: { statut: { in: ["en_collecte", "en_negociation"] }, offre: null }, include: { besoins: { where: { statut: { in: DANS } }, select: { companyId: true } } } });
    return rs.filter((r) => new Set(r.besoins.map((b) => b.companyId)).size >= 2).length;
  }

  /** Les chiffres du mois pour « Hypothèses de lancement ». */
  async indicateurs(depuis: Date) {
    const regroupements = await this.prisma.regroupementNegocie.findMany({ where: { createdAt: { gte: depuis } }, include: { offre: true, besoins: { where: { statut: { in: DANS } } } } });
    const offres = regroupements.filter((r) => r.offreEnvoyeeLe);
    const proposes = offres.flatMap((r) => r.besoins);
    const acceptes = proposes.filter((b) => b.statut === "accepte");
    let commission = 0;
    for (const r of offres) for (const b of r.besoins.filter((x) => x.statut === "accepte")) commission += commissionDe(Number(r.offre!.prixNegocieHt), Number(r.offre!.prixAfficheHt), Number(b.quantite));
    return {
      formes: regroupements.length,
      prisEnCharge: regroupements.filter((r) => r.prisEnChargeLe).length,
      avecOffre: offres.length,
      commandes: regroupements.filter((r) => r.statut === "commande").length,
      tauxAcceptation: proposes.length ? Math.round((acceptes.length / proposes.length) * 1000) / 1000 : null,
      commissionHt: Math.round(commission * 100) / 100,
    };
  }

  exigerChasseurEmail(email: string | null | undefined): string {
    if (!this.estChasseur(email)) throw forbidden("Reserved to opportunity hunters");
    return email!.toLowerCase();
  }
}
