import {
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
    private readonly cfg: { webAppUrl: string; mode: ModeRegroupement; chasseurs: string[]; admins: string[]; commissionDefaut: number; seuilAnonymat: number },
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
    await this.droits.exiger(tenant.companyId, { type: "regroupement" });
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
    if (!this.droits.zoneActive(departement)) throw new DomainError("forbidden", MESSAGE_HORS_ZONE, { reason: "zone_inactive", message: MESSAGE_HORS_ZONE });
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
              mentions: [LIGNE_NEGOCIE_PAR_MOBIIZ, LIGNE_COMMISSION_INCLUSE],
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
      mentions: [`${LIGNE_NEGOCIE_PAR_MOBIIZ} (regroupement n° ${r.numero}).`, `${LIGNE_COMMISSION_INCLUSE}.`, `Facturation et paiement directement entre l'acheteur et le vendeur. ${NOM_APP} ne vend ni n'achète rien.`],
    });
    const email = company?.contactEmail ?? (await this.emailDuProprietaire(tenant.companyId));
    if (email)
      await this.mailer.send({
        to: email,
        subject: `Ta commande groupée n° ${bonNumero} : ${b.designation}`,
        text: ["Bonjour,", "", `C'est commandé : ${qte(quantite)} ${b.unite} de ${b.designation} chez ${o.negoceNom}, ${euros(total)} HT livré.`, "Ton bon de commande est joint (tu peux y remplir ton numéro de compte client et ta date de livraison).", "", `${this.cfg.webAppUrl}/regroupements`, "", NOM_APP].join("\n"),
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
      mentions: [`${LIGNE_NEGOCIE_PAR_MOBIIZ} (regroupement n° ${r.numero}).`, `${LIGNE_COMMISSION_INCLUSE}.`],
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
    const sortie = [];
    for (const r of regroupements) {
      const negoces = await this.prisma.negoce.findMany({
        where: { departement: r.departement, stopLe: null, OR: [{ generaliste: true }, { familles: { has: r.famille } }] },
        select: { nom: true, email: true, compte: { select: { telephone: true, verification: true } } },
        orderBy: { nom: "asc" },
        take: 30,
      });
      sortie.push({
        id: r.id,
        numero: r.numero,
        libelle: r.libelle,
        famille: r.famille,
        departement: r.departement,
        statut: r.statut,
        chasseur: r.chasseurEmail,
        dateBesoinMin: r.dateBesoinMin ? jourIso(r.dateBesoinMin) : null,
        volume: r.besoins.reduce((s, b) => s + Number(b.quantite), 0),
        unite: r.besoins[0]?.unite ?? "",
        entreprises: new Set(r.besoins.map((b) => b.companyId)).size,
        participants: r.besoins.map((b) => ({ besoinId: b.id, entreprise: b.company.name, quantite: Number(b.quantite), statut: b.statut, livraison: b.livraison })),
        acceptes: r.besoins.filter((b) => b.statut === "accepte").length,
        negoces: negoces.map((n) => ({ nom: n.nom, email: n.email, telephone: n.compte?.telephone ?? null, verification: n.compte?.verification ?? null })),
        offre: r.offre
          ? { negoceNom: r.offre.negoceNom, prixNegocieHt: Number(r.offre.prixNegocieHt), commissionPct: Number(r.offre.commissionPct), prixAfficheHt: Number(r.offre.prixAfficheHt), livraisonHt: Number(r.offre.livraisonHt), valideJusquau: jourIso(r.offre.valideJusquau), envoyee: !!r.offreEnvoyeeLe, transmise: !!r.offre.transmiseLe }
          : null,
        appels: r.appels.map((a) => ({ negoce: a.negoce, note: a.note, le: a.le.toISOString(), par: a.parEmail })),
      });
    }
    return { regroupements: sortie, commissionDefaut: this.cfg.commissionDefaut };
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
      subject: `Commande groupée n° ${r.numero} : ${qte(total)} ${acceptes[0]!.unite} de ${r.libelle}`,
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
