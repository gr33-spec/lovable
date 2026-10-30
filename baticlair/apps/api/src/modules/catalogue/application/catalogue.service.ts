import { randomUUID } from "node:crypto";
import {
  arbreArticles,
  FAMILLE_DU_METIER_CATALOGUE,
  LIBELLES_METIERS_CATALOGUE,
  METIERS_CATALOGUE,
  metiersCatalogueDuCompte,
  clesDeRegroupement,
  rechercherArticles,
  referenceStricte,
  TOUT_LE_CATALOGUE,
  type MetierCatalogue,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../../tenancy/index.js";

export interface ArticleVue {
  cle: string;
  metier: string;
  famille: string;
  produit: string;
  variante: string | null;
  designation: string;
  unite: string;
  /** La famille d'achat groupé (le métier des négoces) : un achat groupé n'en a qu'une. */
  familleAchat: string;
}

/** Un article choisi pour l'achat groupé : sa clé de regroupement et le nom que lit le négoce. */
export interface ArticleRegroupe extends ArticleVue {
  cleRegroupement: string;
  libelleRegroupement: string;
}

type Ligne = Awaited<ReturnType<PrismaService["catalogueArticle"]["findMany"]>>[number];

const estMetier = (m: string): m is MetierCatalogue => (METIERS_CATALOGUE as readonly string[]).includes(m);
const vue = (a: Ligne): ArticleVue => ({ cle: a.cle, metier: a.metier, famille: a.famille, produit: a.produit, variante: a.variante, designation: a.designation, unite: a.unite, familleAchat: estMetier(a.metier) ? FAMILLE_DU_METIER_CATALOGUE[a.metier] : a.metier });

/**
 * LE CATALOGUE EN DONNÉES (correction après test de Greg, 30 octobre 2026, points 3 et 4) : amorcé depuis le domaine la
 * première fois (un article manquant est ajouté, un article de l'admin n'est jamais écrasé), lu en listes (famille ›
 * produit › variante) ou par recherche tolérante, modifié par l'admin (ajouter, renommer, masquer).
 */
export class CatalogueService {
  private amorce = false;
  private regroupement: Map<string, string> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** L'amorce : les articles du domaine absents de la base y entrent (jamais par-dessus une modification de l'admin). */
  async amorcer(): Promise<void> {
    if (this.amorce && (await this.prisma.catalogueArticle.count()) > 0) return;
    await this.prisma.catalogueArticle.createMany({
      data: TOUT_LE_CATALOGUE.map((a, i) => ({ cle: a.cle, metier: a.metier, famille: a.famille, produit: a.produit, variante: a.variante, designation: a.designation, unite: a.unite, synonymes: [...a.synonymes], ordre: i })),
      skipDuplicates: true,
    });
    this.amorce = true;
  }

  private async articles(metier: string | null, avecMasques = false): Promise<Ligne[]> {
    await this.amorcer();
    return this.prisma.catalogueArticle.findMany({ where: { ...(metier ? { metier } : {}), ...(avecMasques ? {} : { masque: false }) }, orderBy: [{ ordre: "asc" }, { cle: "asc" }] });
  }

  /** Les métiers du sélecteur : ceux du profil d'abord (« Métier : Couverture ▾ »), puis les autres. */
  private async metiers(tenant: TenantContext) {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { trades: true } });
    const miens = metiersCatalogueDuCompte(c?.trades ?? []);
    const ordre = [...miens, ...METIERS_CATALOGUE.filter((m) => !miens.includes(m))];
    return ordre.map((m) => ({ code: m, libelle: LIBELLES_METIERS_CATALOGUE[m], mien: miens.includes(m), familleAchat: FAMILLE_DU_METIER_CATALOGUE[m] }));
  }

  /** L'écran : le métier choisi (sinon le premier du profil), son arbre, ou les résultats d'une recherche (tous métiers). */
  async lire(tenant: TenantContext, metierDemande: string | undefined, q: string | undefined) {
    const metiers = await this.metiers(tenant);
    const metier = metierDemande && estMetier(metierDemande) ? metierDemande : (metiers[0]?.code ?? "couverture");
    const recherche = (q ?? "").trim();
    if (recherche) {
      const tous = await this.articles(null);
      // La recherche cherche d'abord dans le métier choisi, puis dans les autres.
      const trouves = rechercherArticles(tous, recherche, 60);
      const duMetier = trouves.filter((a) => a.metier === metier);
      return { metiers, metier, resultats: [...duMetier, ...trouves.filter((a) => a.metier !== metier)].slice(0, 30).map(vue), arbre: null };
    }
    const articles = await this.articles(metier);
    const arbre = arbreArticles(articles.map(vue)).map((f) => ({
      libelle: f.libelle,
      produits: f.enfants.map((p) => ({ libelle: p.libelle, article: p.article, variantes: p.enfants.map((v) => ({ libelle: v.libelle, article: v.article! })) })),
    }));
    return { metiers, metier, resultats: null, arbre };
  }

  /** Un article choisi (jamais masqué), pour l'achat groupé, avec sa clé de regroupement ; null s'il n'existe pas. */
  async article(cle: string): Promise<ArticleRegroupe | null> {
    await this.amorcer();
    const a = await this.prisma.catalogueArticle.findUnique({ where: { cle } });
    if (!a || a.masque) return null;
    if (!this.regroupement) {
      const tous = await this.prisma.catalogueArticle.findMany({ where: { masque: false }, select: { cle: true, designation: true } });
      this.regroupement = clesDeRegroupement(tous, (d) => {
        const r = referenceStricte(d);
        return r.ok ? r.reference.cle : null;
      });
    }
    const cleRegroupement = this.regroupement.get(a.cle) ?? `cat:${a.cle}`;
    const r = referenceStricte(a.designation);
    return { ...vue(a), cleRegroupement, libelleRegroupement: !cleRegroupement.startsWith("cat:") && r.ok ? r.reference.libelle : a.designation };
  }

  /* ------------------------------------------------------------------------------------------------- l'admin */

  async admin(metier: string | undefined) {
    const m = metier && estMetier(metier) ? metier : "couverture";
    return { metiers: METIERS_CATALOGUE.map((x) => ({ code: x, libelle: LIBELLES_METIERS_CATALOGUE[x] })), metier: m, articles: (await this.articles(m, true)).map((a) => ({ ...vue(a), masque: a.masque, ajoute: a.ajoute, synonymes: a.synonymes })) };
  }

  async ajouter(a: { metier: string; famille: string; produit: string; variante: string | null; designation: string | null; unite: string; synonymes: string[] }) {
    if (!estMetier(a.metier)) throw validationFailed("Unknown trade", { reason: "metier_inconnu" });
    await this.amorcer();
    const dernier = await this.prisma.catalogueArticle.aggregate({ _max: { ordre: true } });
    const designation = a.designation?.trim() || [a.produit, a.variante].filter(Boolean).join(" ");
    this.regroupement = null;
    const cree = await this.prisma.catalogueArticle.create({
      data: { cle: `${a.metier}/ajout/${randomUUID()}`, metier: a.metier, famille: a.famille.trim(), produit: a.produit.trim(), variante: a.variante?.trim() || null, designation, unite: a.unite.trim(), synonymes: a.synonymes, ordre: (dernier._max.ordre ?? 0) + 1, ajoute: true },
    });
    return vue(cree);
  }

  /** Les lignes libres des achats groupés encore ouverts : l'admin peut les rattacher à un article (elles se cumulent alors). */
  async lignesLibres() {
    const lignes = await this.prisma.ligneAchatGroupe.findMany({ where: { libre: true }, orderBy: { createdAt: "desc" }, take: 200 });
    const achats = new Map((await this.prisma.regroupementNegocie.findMany({ where: { id: { in: [...new Set(lignes.map((l) => l.regroupementId))] } }, select: { id: true, libelle: true, statut: true } })).map((a) => [a.id, a]));
    return lignes
      .filter((l) => achats.get(l.regroupementId)?.statut === "en_collecte")
      .map((l) => ({ id: l.id, libelle: l.libelle, quantite: Number(l.quantite), unite: l.unite, famille: l.famille, achat: achats.get(l.regroupementId)?.libelle ?? "" }));
  }

  /** Rattacher une ligne libre à un article : elle prend sa clé et sa désignation, et se cumule avec les autres. */
  async rattacherLigneLibre(id: string, cle: string) {
    const l = await this.prisma.ligneAchatGroupe.findFirst({ where: { id, libre: true } });
    if (!l) throw notFound("Ligne");
    const a = await this.article(cle);
    if (!a) throw validationFailed("Unknown catalogue article", { reason: "article_inconnu", phrase: "Cet article n'est pas au catalogue." });
    const achat = await this.prisma.regroupementNegocie.findUnique({ where: { id: l.regroupementId }, select: { statut: true } });
    if (achat?.statut !== "en_collecte") throw validationFailed("Purchase closed", { reason: "achat_clos", phrase: "L'achat groupé est déjà parti aux négoces." });
    const deja = await this.prisma.ligneAchatGroupe.findFirst({ where: { besoinId: l.besoinId, cle: a.cleRegroupement, unite: a.unite } });
    if (deja) {
      await this.prisma.$transaction([this.prisma.ligneAchatGroupe.update({ where: { id: deja.id }, data: { quantite: Number(deja.quantite) + Number(l.quantite) } }), this.prisma.ligneAchatGroupe.delete({ where: { id: l.id } })]);
      return { id: deja.id, cle: a.cle, designation: a.designation };
    }
    await this.prisma.ligneAchatGroupe.update({ where: { id: l.id }, data: { cle: a.cleRegroupement, libelle: a.libelleRegroupement, unite: a.unite, libre: false } });
    return { id: l.id, cle: a.cle, designation: a.designation };
  }

  /** Renommer (désignation, famille, produit, variante, unité, mots) ou masquer : la clé ne change jamais. */
  async modifier(cle: string, m: Partial<{ famille: string; produit: string; variante: string | null; designation: string; unite: string; synonymes: string[]; masque: boolean }>) {
    await this.amorcer();
    const a = await this.prisma.catalogueArticle.findUnique({ where: { cle } });
    if (!a) throw notFound("Article");
    this.regroupement = null;
    const maj = await this.prisma.catalogueArticle.update({ where: { cle }, data: m });
    return { ...vue(maj), masque: maj.masque };
  }
}
