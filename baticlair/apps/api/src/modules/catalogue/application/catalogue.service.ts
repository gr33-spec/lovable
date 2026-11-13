import { randomUUID } from "node:crypto";
import {
  aPlat,
  anciensIdentifiants,
  doublonsDuCatalogue,
  etatDesLieuxDuCatalogue,
  arbreArticles,
  cleDeLibelle,
  libelleAPartager,
  candidatesDeLibelles,
  SEUIL_PROPOSITION,
  vocabulaireDuCatalogue,
  rechercherLibelles,
  scoreArticle,
  type Candidate,
  FAMILLE_DU_METIER_CATALOGUE,
  LIBELLES_METIERS_CATALOGUE,
  METIERS_CATALOGUE,
  METIERS_DU_SELECTEUR,
  metiersDuRayon,
  rayonDuMetierCatalogue,
  metiersCatalogueDuCompte,
  clesDeRegroupement,
  rechercherAvecPrecisions,
  departementDeLAdresse,
  regionDuDepartement,
  referenceStricte,
  TOUT_LE_CATALOGUE,
  comprendreArticle,
  cheminsDeLArticle,
  indicationDuProduit,
  LIBELLES_CATALOGUES,
  vueDuCatalogue,
  type ChoixDeVue,
  type ArticleCatalogue,
  type ArticleCompris,
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
  /** La fiche du catalogue métier (amorce du domaine) : marque et référence vérifiées, statut, source. */
  marque: string | null;
  reference: string | null;
  /** L'EAN du coloris ou du format, publié par le fabricant. */
  ean: string | null;
  statut: "verifie" | "generique" | null;
  source: { libelle: string; url?: string; verifieLe: string } | null;
  /** Marqué « à vérifier » par l'admin : l'artisan le lit, rien n'est affirmé à sa place. */
  aVerifier: boolean;
}

const FICHES = new Map(TOUT_LE_CATALOGUE.map((a) => [a.cle, a]));
const CLES_AMORCE: ReadonlySet<string> = new Set(FICHES.keys());

/** Un article choisi pour l'achat groupé : sa clé de regroupement et le nom que lit le négoce. */
export interface ArticleRegroupe extends ArticleVue {
  cleRegroupement: string;
  libelleRegroupement: string;
}

export interface EtatDeSynchronisation {
  enBase: number;
  dansLAmorce: number;
  /** Les articles de l'amorce absents de la base : ce que la synchronisation ajouterait. */
  aAjouter: number;
  aAjouterParMetier: Record<string, number>;
  /** Les articles de la base absents de l'amorce (ajouts de l'admin, anciennes clés) : jamais touchés. */
  horsAmorce: number;
  /** Les anciens identifiants (même article sous une clé d'avant) : gardés en base, plus proposés deux fois. */
  anciensIdentifiants: number;
  /** Les doublons à regarder, par nature (`doublonsDuCatalogue`) : jamais fusionnés d'office. */
  doublons: Record<string, number>;
  /** Le bilan par métier : les articles en base, ceux qui entreraient, ceux qu'aucune famille ne range. */
  bilanParMetier: { metier: string; libelle: string; enBase: number; aAjouter: number; sansFamille: number }[];
}

export interface ChoixVue {
  nom: string;
  options: { valeur: string; suite: ChoixVue | null; article: ArticleVue | null }[];
}

type Ligne = Awaited<ReturnType<PrismaService["catalogueArticle"]["findMany"]>>[number];

const estMetier = (m: string): m is MetierCatalogue => (METIERS_CATALOGUE as readonly string[]).includes(m);
const vue = (a: Ligne): ArticleVue => {
  const f = FICHES.get(a.cle);
  return {
    cle: a.cle,
    // Chaque métier est un catalogue de premier niveau (Greg, 13 novembre 2026) : l'article se lit sous SON métier.
    metier: estMetier(a.metier) ? rayonDuMetierCatalogue(a.metier) : a.metier,
    famille: a.famille,
    produit: a.produit,
    variante: a.variante,
    designation: a.designation,
    unite: a.unite,
    familleAchat: estMetier(a.metier) ? FAMILLE_DU_METIER_CATALOGUE[a.metier] : a.metier,
    marque: f?.marque ?? null,
    reference: f?.reference ?? null,
    ean: f?.ean ?? null,
    statut: f?.statut ?? null,
    source: f?.source ?? null,
    aVerifier: a.aVerifier,
  };
};

/**
 * LE CATALOGUE EN DONNÉES (correction après test de Greg, 30 octobre 2026, points 3 et 4) : amorcé depuis le domaine la
 * première fois (un article manquant est ajouté, un article de l'admin n'est jamais écrasé), lu en listes (famille ›
 * produit › variante) ou par recherche tolérante, modifié par l'admin (ajouter, renommer, masquer).
 */
export class CatalogueService {
  private amorce = false;
  private regroupement: Map<string, string> | null = null;
  /** Les propositions et références des artisans, recalculées au plus toutes les minutes (ou dès qu'un intitulé arrive). */
  private communaute: { quand: number; items: (Candidate & { publiee: boolean })[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * L'AMORCE N'EST PLUS UNE AFFAIRE DE LECTURE (Greg, 12 novembre 2026 : « ne conserve pas un système où l'ajout de centaines
   * d'articles dépend silencieusement de la première ouverture du catalogue par un artisan »). Lire le catalogue n'y ajoute
   * plus rien, sauf dans deux cas dits : une base VIDE (première installation, base de test remise à zéro) et le réglage
   * `CATALOGUE_SYNCHRO_AUTO=on` (développement et tests). Partout ailleurs, les articles de l'amorce n'entrent que par la
   * synchronisation explicite (`synchroniser`, route de l'admin ou `scripts/synchroniser-catalogue.ts`).
   */
  async amorcer(): Promise<void> {
    const n = await this.prisma.catalogueArticle.count();
    if (this.amorce && n > 0) return;
    if (n === 0 || process.env.CATALOGUE_SYNCHRO_AUTO === "on") await this.synchroniser();
    this.amorce = true;
  }

  /** Ce que la synchronisation ferait, sans rien écrire : les articles de l'amorce absents de la base, par métier. */
  async etatDeSynchronisation(): Promise<EtatDeSynchronisation> {
    const base = await this.prisma.catalogueArticle.findMany({ select: { cle: true, metier: true, famille: true, produit: true, variante: true, designation: true, unite: true, metiersSecondaires: true } });
    const enBase = new Set(base.map((a) => a.cle));
    const manquants = TOUT_LE_CATALOGUE.filter((a) => !enBase.has(a.cle));
    const parMetier: Record<string, number> = {};
    for (const a of manquants) parMetier[a.metier] = (parMetier[a.metier] ?? 0) + 1;
    const connus = base.filter((a): a is typeof a & { metier: MetierCatalogue } => estMetier(a.metier));
    const anciens = anciensIdentifiants(base, CLES_AMORCE);
    const doublons: Record<string, number> = {};
    for (const g of doublonsDuCatalogue(connus, CLES_AMORCE)) doublons[g.nature] = (doublons[g.nature] ?? 0) + 1;
    const sansFamille = etatDesLieuxDuCatalogue(connus.filter((a) => !anciens.has(a.cle)), CLES_AMORCE).nonClasses;
    return {
      enBase: enBase.size,
      dansLAmorce: TOUT_LE_CATALOGUE.length,
      aAjouter: manquants.length,
      aAjouterParMetier: parMetier,
      horsAmorce: [...enBase].filter((c) => !FICHES.has(c)).length,
      anciensIdentifiants: anciens.size,
      doublons,
      bilanParMetier: METIERS_CATALOGUE.map((m) => ({ metier: m, libelle: LIBELLES_METIERS_CATALOGUE[m], enBase: base.filter((a) => a.metier === m).length, aAjouter: parMetier[m] ?? 0, sansFamille: sansFamille.filter((a) => a.metier === m).length })),
    };
  }

  /**
   * LA SYNCHRONISATION EXPLICITE : les articles de l'amorce absents de la base y entrent, et rien d'autre. Idempotente
   * (rejouée, elle n'ajoute rien), sans écrasement (un article déjà là, renommé ou masqué par l'admin, n'est jamais
   * touché), sans suppression (un article de la base absent de l'amorce reste). Rend le relevé avant et après.
   */
  async synchroniser(): Promise<{ avant: EtatDeSynchronisation; apres: EtatDeSynchronisation; ajoutes: number }> {
    const avant = await this.etatDeSynchronisation();
    let ajoutes = 0;
    if (avant.aAjouter > 0) {
      const enBase = new Set((await this.prisma.catalogueArticle.findMany({ select: { cle: true } })).map((a) => a.cle));
      const r = await this.prisma.catalogueArticle.createMany({
        data: TOUT_LE_CATALOGUE.map((a, i) => ({ cle: a.cle, metier: a.metier, famille: a.famille, produit: a.produit, variante: a.variante, designation: a.designation, unite: a.unite, synonymes: [...a.synonymes], ordre: i })).filter((a) => !enBase.has(a.cle)),
        skipDuplicates: true,
      });
      ajoutes = r.count;
      this.regroupement = null;
    }
    return { avant, apres: ajoutes ? await this.etatDeSynchronisation() : avant, ajoutes };
  }

  private async articles(metier: string | null, avecMasques = false): Promise<Ligne[]> {
    await this.amorcer();
    const lignes = await this.prisma.catalogueArticle.findMany({ where: { ...(metier ? { metier: estMetier(metier) ? { in: metiersDuRayon(metier) } : metier } : {}), ...(avecMasques ? {} : { masque: false }) }, orderBy: [{ ordre: "asc" }, { cle: "asc" }] });
    if (avecMasques) return lignes;
    // Un même article écrit sous deux clés (un ancien identifiant) n'est proposé qu'une fois ; l'ancien reste en base,
    // lisible par sa clé (`article`), jamais supprimé ni réécrit (Greg, 13 novembre 2026, « cœur métier »).
    const anciens = anciensIdentifiants(lignes, CLES_AMORCE);
    return anciens.size ? lignes.filter((a) => !anciens.has(a.cle)) : lignes;
  }

  /** Les métiers du sélecteur : ceux du profil d'abord (« Métier : Couverture ▾ »), puis les autres. */
  private async metiers(tenant: TenantContext) {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { trades: true } });
    return this.metiersDe(c?.trades ?? []);
  }

  /** La région du §26.2 de l'entreprise (code postal de son adresse), pour proposer d'abord ses matériaux. */
  private async regionDe(tenant: TenantContext) {
    const c = await this.prisma.company.findUnique({ where: { id: tenant.companyId }, select: { address: true } });
    return regionDuDepartement(departementDeLAdresse(c?.address));
  }

  private metiersDe(trades: string[]) {
    const miens = metiersCatalogueDuCompte(trades);
    const ordre = [...miens, ...METIERS_DU_SELECTEUR.filter((m) => !miens.includes(m))];
    return ordre.map((m) => ({ code: m, libelle: LIBELLES_CATALOGUES[m] ?? LIBELLES_METIERS_CATALOGUE[m], mien: miens.includes(m), familleAchat: FAMILLE_DU_METIER_CATALOGUE[m] }));
  }

  /**
   * L'ASSISTANT COMPREND LES MOTS DE L'ARTISAN (Greg, 8 novembre 2026 : « 36 mètres de Lito ») : chaque désignation dite
   * est rapprochée du catalogue (celui de la base, modifications de l'admin comprises), sans appel IA. `null` : rien ne
   * correspond, la ligne reste telle qu'écrite.
   */
  async comprendre(lignes: readonly { libelle: string; unite: string | null }[]): Promise<{ articles: (ArticleCompris | null)[] }> {
    const tous: ArticleCatalogue[] = (await this.articles(null)).map((a) => {
      const f = FICHES.get(a.cle);
      return { cle: a.cle, metier: a.metier as MetierCatalogue, famille: a.famille, produit: a.produit, variante: a.variante, designation: a.designation, unite: a.unite, synonymes: a.synonymes, ...(f?.marque ? { marque: f.marque } : {}), ...(f?.statut ? { statut: f.statut } : {}) };
    });
    return { articles: lignes.map((l) => comprendreArticle(l.libelle, tous, l.unite)) };
  }

  /** L'écran : le métier choisi (sinon le premier du profil), son arbre, ou les résultats d'une recherche (tous métiers). */
  async lire(tenant: TenantContext, metierDemande: string | undefined, q: string | undefined) {
    const metiers = await this.metiers(tenant);
    const metier = metierDemande && estMetier(metierDemande) ? rayonDuMetierCatalogue(metierDemande) : (metiers[0]?.code ?? "couverture");
    const recherche = (q ?? "").trim();
    if (recherche) {
      const tous = await this.articles(null);
      // La recherche cherche d'abord dans le métier choisi, puis dans les autres.
      // Le moteur métier (Greg, 31 octobre 2026) : dimensions, références exactes, précisions gardées (« H14 rouge »).
      // Région par région (Greg, 31 octobre 2026, soir ; §26.2) : à score égal, les matériaux de la région d'abord.
      const region = await this.regionDe(tenant);
      const dominants = new Set(region?.dominants ?? []);
      const trouves = rechercherAvecPrecisions(
        tous.map((a) => ({ ...a, statut: FICHES.get(a.cle)?.statut ?? null })),
        recherche,
        60,
        dominants.size ? (a) => dominants.has(a.produit) : undefined,
      );
      const duRayon = (m: string) => estMetier(m) && rayonDuMetierCatalogue(m) === metier;
      const duMetier = trouves.filter((t) => duRayon(t.article.metier));
      // Jamais deux résultats identiques (Greg, 13 novembre 2026) : la même désignation dans la même unité sous deux
      // métiers ne sort qu'une fois, celle du métier choisi d'abord ; l'autre métier est dit sur la ligne (« aussi en … »).
      const dits = new Map<string, { autres: Set<string> }>();
      const uniques = [...duMetier, ...trouves.filter((t) => !duRayon(t.article.metier))].filter((t) => {
        const k = `${aPlat(t.article.designation)}|${aPlat(t.article.unite)}`;
        const deja = dits.get(k);
        if (deja) {
          if (estMetier(t.article.metier)) deja.autres.add(LIBELLES_CATALOGUES[t.article.metier] ?? t.article.metier);
          return false;
        }
        dits.set(k, { autres: new Set() });
        return true;
      });
      const resultats = uniques.slice(0, 30).map((t) => {
        const r = this.rangement(t.article);
        const autres = dits.get(`${aPlat(t.article.designation)}|${aPlat(t.article.unite)}`)!.autres;
        return { ...vue(t.article), precisions: t.precisions, ...r, autresCatalogues: [...new Set([...r.autresCatalogues, ...autres])].filter((c) => c !== r.chemin?.catalogue) };
      });
      // Les intitulés écrits par l'entreprise elle-même, après le catalogue (Greg, 30 octobre 2026, nuit : rien n'est
      // diffusé aux autres ; un intitulé générique ne l'est qu'une fois ajouté au catalogue par l'admin).
      const vus = new Set(resultats.map((a) => cleDeLibelle(a.designation)));
      const ecrits = (await this.libellesConnus(tenant.companyId, recherche)).filter((l) => !vus.has(cleDeLibelle(l.libelle)));
      for (const l of ecrits) vus.add(cleDeLibelle(l.libelle));
      // Les références des artisans (Greg, 31 octobre 2026, soir) : écrites ou commandées par plusieurs entreprises.
      const communes = (await this.referencesDesArtisans(recherche)).filter((c) => !vus.has(c.cle) && ![c.libelle, ...c.variantes].some((l) => vus.has(cleDeLibelle(l))));
      return { metiers, metier, resultats, ecrits: ecrits.map((l) => ({ designation: l.libelle, unite: l.unite })), communes: communes.map((c) => ({ designation: c.libelle, unite: c.unite, entreprises: c.entreprises })), rayons: null, arbre: null };
    }
    const articles = await this.articles(metier);
    const arbre = arbreArticles(articles.map(vue)).map((f) => ({
      libelle: f.libelle,
      produits: f.enfants.map((p) => ({ libelle: p.libelle, article: p.article, variantes: p.enfants.map((v) => ({ libelle: v.libelle, article: v.article! })) })),
    }));
    return { metiers, metier, resultats: null, ecrits: null, communes: null, arbre, rayons: await this.rayons(metier) };
  }

  /** Où un article se lit (son catalogue d'abord, puis ceux qui le partagent) et ce que son format précise déjà. */
  private rangement(a: Ligne) {
    const chemins = estMetier(a.metier) ? cheminsDeLArticle({ ...a, metier: a.metier }) : [];
    const c = chemins[0] ?? null;
    return {
      chemin: c ? { catalogue: c.libelleCatalogue, rayon: c.rayon, famille: c.famille, produit: c.produit } : null,
      autresCatalogues: chemins.slice(1).map((x) => x.libelleCatalogue),
      caracteristiques: a.variante ? a.variante.split(" · ") : [],
    };
  }

  /**
   * LE CATALOGUE D'UN MÉTIER EN RAYONS (Greg, 12 novembre 2026) : rayon › famille › produit › caractéristiques. Une vue
   * sur les articles de la base (tous métiers : un produit partagé se lit dans chaque catalogue qui le prend) ; les
   * articles, eux, ne changent pas.
   */
  private async rayons(metier: MetierCatalogue) {
    const tous = (await this.articles(null)).filter((a): a is Ligne & { metier: MetierCatalogue } => estMetier(a.metier));
    const choix = (n: ChoixDeVue<Ligne> | null): ChoixVue | null => (n ? { nom: n.nom, options: n.options.map((o) => ({ valeur: o.valeur, suite: choix(o.suite), article: o.article ? vue(o.article) : null })) } : null);
    return vueDuCatalogue(metier, tous).map((r) => ({
      libelle: r.libelle,
      familles: r.familles.map((f) => ({
        libelle: f.libelle,
        produits: f.produits.map((p) => ({ libelle: p.libelle, indication: indicationDuProduit(p), nombre: p.nombre, precisions: p.precisions, article: p.article ? vue(p.article) : null, choix: choix(p.choix) })),
      })),
    }));
  }

  /**
   * Les intitulés écrits dans « Écris ta liste » (Greg, 30 octobre 2026) : gardés anonymisés, une fois par entreprise ; un
   * intitulé déjà au catalogue n'est pas gardé. Jamais bloquant : une panne ici ne retient pas la liste.
   */
  async noterLibelles(companyId: string, lignes: readonly { libelle: string; unite?: string | null }[]): Promise<void> {
    const parCle = new Map<string, { libelle: string; unite: string }>();
    for (const l of lignes) {
      const libelle = libelleAPartager(l.libelle);
      if (libelle) parCle.set(cleDeLibelle(libelle), { libelle, unite: (l.unite ?? "").trim().slice(0, 40) || "pièces" });
    }
    if (!parCle.size) return;
    await this.amorcer();
    const catalogue = new Set((await this.prisma.catalogueArticle.findMany({ select: { designation: true } })).map((a) => cleDeLibelle(a.designation)));
    const data = [...parCle].filter(([cle]) => !catalogue.has(cle)).map(([cle, l]) => ({ companyId, cle, ...l }));
    if (data.length) await this.prisma.libelleEcrit.createMany({ data, skipDuplicates: true });
    if (data.length) this.communaute = null;
  }

  /** Les intitulés de l'entreprise pour une recherche : ceux qui contiennent le début du premier mot tapé. */
  private async libellesConnus(companyId: string, recherche: string) {
    const mot = aPlat(recherche).split(" ").find((m) => m.length >= 3);
    if (!mot) return [];
    const lignes = await this.prisma.libelleEcrit.findMany({ where: { companyId, cle: { contains: mot.slice(0, 4) } }, select: { libelle: true, unite: true }, orderBy: { createdAt: "asc" }, take: 500 });
    return rechercherLibelles(
      lignes.map((l) => ({ ...l, entreprises: 1, mien: true })),
      recherche,
    );
  }

  /**
   * Les propositions pour l'admin (Greg, 30 octobre 2026, nuit) : les intitulés génériques écrits par plusieurs entreprises
   * et pas encore au catalogue ; jamais le nom des entreprises.
   *
   * LES RÉFÉRENCES DES ARTISANS (Greg, 31 octobre 2026, soir : « un produit que nous n'avons pas […] devient une référence
   * à partir du moment où quelqu'un d'autre formule la même chose ou commande en achat groupé ») : comptent les intitulés
   * écrits dans les listes ET les lignes libres des achats groupés (« je décris mon besoin »). Dès
   * `CATALOGUE_SEUIL_COMMUNAUTE` entreprises différentes (2 par défaut), la candidate est PUBLIÉE : proposée à tous les
   * artisans comme « écrit par d'autres artisans », jamais vérifiée, sans nom d'entreprise ; un mot inconnu doit venir de
   * ce nombre d'entreprises (un nom de client ne se répète pas), un intitulé où l'anonymisation retire quelque chose n'est
   * jamais gardé. L'admin l'écarte ou l'ajoute au catalogue.
   */
  async propositions(): Promise<(Candidate & { publiee: boolean })[]> {
    if (this.communaute && Date.now() - this.communaute.quand < 60_000) return this.communaute.items;
    await this.amorcer();
    const articles = await this.prisma.catalogueArticle.findMany({ select: { designation: true, famille: true, produit: true, variante: true, synonymes: true } });
    const auCatalogue = new Set(articles.map((a) => cleDeLibelle(a.designation)));
    const ecrits = await this.prisma.libelleEcrit.findMany({ select: { cle: true, libelle: true, unite: true, companyId: true }, orderBy: { createdAt: "asc" }, take: 50_000 });
    const libres = await this.prisma.ligneAchatGroupe.findMany({ where: { libre: true }, select: { libelle: true, unite: true, companyId: true }, orderBy: { createdAt: "asc" }, take: 20_000 });
    const commandes = libres.flatMap((l) => {
      const libelle = libelleAPartager(l.libelle);
      return libelle ? [{ cle: cleDeLibelle(libelle), libelle, unite: l.unite, companyId: l.companyId }] : [];
    });
    const tous = [...ecrits, ...commandes].filter((l) => !auCatalogue.has(l.cle));
    // Les intitulés voisins se rapprochent (catalogue métier, Greg, 31 octobre 2026) ; les seuils se règlent sans code.
    const seuilAdmin = Math.max(2, Number(process.env.CATALOGUE_SEUIL_PROPOSITION) || SEUIL_PROPOSITION);
    const seuilCommunaute = Math.max(2, Number(process.env.CATALOGUE_SEUIL_COMMUNAUTE) || 2);
    const ecartees = new Set((await this.prisma.referenceEcartee.findMany({ select: { cle: true } })).map((e) => e.cle));
    const items = candidatesDeLibelles(tous, vocabulaireDuCatalogue(articles), Math.min(seuilAdmin, seuilCommunaute)).map((c) => ({ ...c, publiee: c.entreprises >= seuilCommunaute && !ecartees.has(c.cle) }));
    this.communaute = { quand: Date.now(), items };
    return items;
  }

  /** Les références des artisans pour ce qui est tapé (publiées seulement), les plus écrites d'abord. */
  private async referencesDesArtisans(recherche: string, max = 3) {
    return (await this.propositions())
      .filter((c) => c.publiee)
      .map((c) => ({ c, s: [c.libelle, ...c.variantes].reduce<number | null>((m, l) => Math.max(m ?? -1, scoreArticle({ designation: l, famille: "", produit: l, synonymes: [] }, recherche) ?? -1), null) }))
      .filter((x) => x.s !== null && x.s >= 0)
      .sort((x, y) => y.s! - x.s! || y.c.entreprises - x.c.entreprises)
      .slice(0, max)
      .map((x) => x.c);
  }

  /** L'admin écarte une référence des artisans : elle n'est plus proposée à tous (les intitulés écrits restent). */
  async ecarterProposition(cle: string) {
    await this.prisma.referenceEcartee.upsert({ where: { cle }, create: { cle }, update: {} });
    this.communaute = null;
    return { cle, publiee: false };
  }

  /** Une proposition ajoutée au catalogue par l'admin : elle devient un article, proposé à tous. */
  async accepterProposition(cle: string, metier: string, famille: string) {
    const p = (await this.propositions()).find((x) => x.cle === cle);
    if (!p) throw notFound("Proposal not found");
    this.communaute = null;
    return this.ajouter({ metier, famille, produit: p.libelle, variante: null, designation: p.libelle, unite: p.unite, synonymes: [] });
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

  /**
   * L'ADMIN DU CATALOGUE (Greg, 13 novembre 2026, « cœur métier ») : les articles d'un métier, ou ceux qu'une recherche
   * trouve dans TOUS les métiers ; pour chacun son métier, sa famille d'origine, où il se lit, ses mots, s'il est masqué,
   * à vérifier, d'où il vient (l'amorce et sa source, ou un ajout de l'admin) et sa dernière modification ; et les doublons
   * à regarder. Les anciens identifiants y sont montrés (l'admin voit tout), avec la clé gardée.
   */
  async admin(metier: string | undefined, q?: string) {
    const m = metier && estMetier(metier) ? rayonDuMetierCatalogue(metier) : "couverture";
    const recherche = (q ?? "").trim();
    const tous = await this.articles(null, true);
    const anciens = anciensIdentifiants(tous, CLES_AMORCE);
    const choisis = recherche
      ? tous.map((a, i) => ({ a, i, s: scoreArticle(a, recherche) })).filter((x) => x.s !== null).sort((x, y) => y.s! - x.s! || x.i - y.i).slice(0, 80).map((x) => x.a)
      : tous.filter((a) => a.metier === m);
    const connus = tous.filter((a): a is Ligne & { metier: MetierCatalogue } => estMetier(a.metier));
    return {
      metiers: METIERS_DU_SELECTEUR.map((x) => ({ code: x, libelle: LIBELLES_METIERS_CATALOGUE[x] })),
      metier: m,
      recherche,
      articles: choisis.map((a) => {
        const f = FICHES.get(a.cle);
        return {
          ...vue(a),
          metier: a.metier,
          masque: a.masque,
          ajoute: a.ajoute,
          synonymes: a.synonymes,
          metiersSecondaires: a.metiersSecondaires,
          aliasDe: anciens.get(a.cle) ?? null,
          origine: a.ajoute ? "Ajout de l'admin" : f ? (f.source?.libelle ?? "Amorce du catalogue") : "Ancien identifiant",
          modifieLe: a.updatedAt.toISOString(),
          chemins: estMetier(a.metier) ? cheminsDeLArticle({ ...a, metier: a.metier }).map((c) => `${c.libelleCatalogue} · ${c.rayon}${c.famille === c.rayon ? "" : ` · ${c.famille}`}`) : [],
        };
      }),
      doublons: doublonsDuCatalogue(connus, CLES_AMORCE).map((g) => ({ nature: g.nature, designation: g.designation, cles: g.cles, canonique: g.canonique })),
    };
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
  async modifier(cle: string, m: Partial<{ metier: string; famille: string; produit: string; variante: string | null; designation: string; unite: string; synonymes: string[]; masque: boolean; aVerifier: boolean; metiersSecondaires: string[] }>) {
    // Le classement se corrige (métier principal, métiers secondaires) sans jamais toucher à la clé.
    if (m.metier !== undefined && !estMetier(m.metier)) throw validationFailed("Unknown trade", { reason: "metier_inconnu", phrase: "Ce métier n'existe pas au catalogue." });
    if (m.metiersSecondaires?.some((x) => !estMetier(x))) throw validationFailed("Unknown trade", { reason: "metier_inconnu", phrase: "Ce métier n'existe pas au catalogue." });
    await this.amorcer();
    const a = await this.prisma.catalogueArticle.findUnique({ where: { cle } });
    if (!a) throw notFound("Article");
    this.regroupement = null;
    const maj = await this.prisma.catalogueArticle.update({ where: { cle }, data: m });
    return { ...vue(maj), metier: maj.metier, masque: maj.masque, metiersSecondaires: maj.metiersSecondaires };
  }
}
