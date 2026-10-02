/**
 * Référentiel métier BatiClair : ce que BatiClair SAIT, avec la preuve.
 *
 * Il sert deux fois : pour transformer un ouvrage du devis client en liste
 * d'achat (quantitatif), puis pour lire et comparer les réponses des
 * fournisseurs (même famille, mêmes caractéristiques clés). Un métier =
 * un fichier de données de ce format ; le moteur ne change pas.
 *
 * Règle d'or : aucune valeur sans source. Seules les valeurs « verified »
 * servent au calcul ; un brouillon (trouvé sur le web, proposé par l'IA)
 * attend qu'une personne identifiée le vérifie.
 */

/** D'où vient une valeur, de la plus fiable à la moins fiable. */
export type SourceKind =
  /** Fiche technique ou documentation officielle du fabricant. */
  | "manufacturer"
  /** Norme, DTU, avis technique, documentation reconnue. */
  | "standard"
  /** Règle métier BatiClair (géométrie, usage) validée par un professionnel. */
  | "baticlair_rule"
  /** Fiche d'un distributeur (catalogue, site marchand). */
  | "retailer"
  /** Définition (1 pièce = 1 pièce) : rien à prouver. */
  | "definition"
  | "other";

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  publisher?: string;
  url?: string;
  /** Référence d'un document sans adresse (« NF DTU 40.29, § 6.3 »). */
  documentRef?: string;
  /** Date de récupération (AAAA-MM-JJ). */
  retrievedAt: string;
  note?: string;
}

export type VerificationStatus = "draft" | "verified" | "deprecated";

export interface Verification {
  status: VerificationStatus;
  /** Obligatoires dès que la valeur est « verified ». */
  verifiedAt?: string;
  verifiedBy?: string;
  note?: string;
}

/** Ce qui accompagne toute donnée du référentiel. */
export interface Provenance {
  /** Identifiant d'une `Source`. */
  source: string;
  verification: Verification;
  /** Incrémentée à chaque changement de la valeur. */
  version: number;
  note?: string;
}

/**
 * Les cinq natures de savoir, JAMAIS mélangées :
 *  - caractéristique fabricant (largeur utile, pureau mini/maxi) ;
 *  - condition de pose (recouvrement de l'écran selon la pente, pente
 *    minimale admissible : elle autorise ou non un produit, elle ne fixe
 *    pas une quantité) ;
 *  - donnée du chantier (surface, pente, longueurs, pureau retenu) ;
 *  - préférence ou pratique de l'artisan (marge, longueur de liteau habituelle) ;
 *  - conditionnement (palette, rouleau, longueur vendue).
 * Les trois premières et la dernière vivent dans le référentiel (sourcées) ;
 * les données du chantier et les préférences viennent du devis ou de l'artisan.
 */
export type KnowledgeKind = "manufacturer_spec" | "installation_condition" | "site_data" | "artisan_preference" | "packaging";

/** Une valeur chiffrée prouvée : « 0,268 m (fiche Edilians, vérifiée le…) ». */
export interface Fact extends Provenance {
  /** Nature de la donnée (contrôlée selon l'endroit où elle est rangée). */
  kind: "manufacturer_spec" | "installation_condition" | "packaging";
  /** Décimal en texte, point décimal (« 0.268 »). */
  value: string;
  /** Unité du référentiel (« m », « m2 », « u/m2 », « % »). */
  unit: string;
}

/** Caractéristique attendue pour les produits d'une famille. */
export interface AttributeDef {
  key: string;
  label: string;
  unit: string;
}

export interface ProductFamily {
  /** Code stable, le même que les profils métier (« roof_tile »). */
  code: string;
  label: string;
  /** Unité dans laquelle s'exprime le besoin (« u », « ml », « m2 »). */
  needUnit: string;
  /** Caractéristiques chiffrées que ses produits peuvent porter (et que les formules citent). */
  attributes: AttributeDef[];
  /** Caractéristiques à comparer entre deux offres (« même besoin, caractéristique différente »). */
  keyAttributes: string[];
  /**
   * Mots qui désignent la famille dans une ligne de devis (« faîtage »,
   * « faîtière »). Du vocabulaire, jamais une quantité : le mot le plus tôt
   * dans la ligne nomme l'ouvrage (« Gouttière… crochets compris » = gouttière).
   */
  keywords?: string[];
}

/** Façon de vendre un produit : à la pièce, à la longueur de 4 m, au rouleau… */
export interface SellingUnit {
  id: string;
  label: { one: string; many: string };
  /** Contenu, dans une unité de même dimension que le besoin (« 4 m », « 75 m2 », « 1 u »). */
  contains: Fact;
  /** Unité de commande principale (une seule par produit) ; les autres donnent un ordre de grandeur. */
  primary?: boolean;
}

export interface Product {
  id: string;
  family: string;
  /** Nom complet (fabricant, gamme). */
  label: string;
  /** Nom court affiché sur téléphone (« Tuiles HP10 »). */
  shortLabel: string;
  manufacturer?: string;
  /** Appellations chantier et fournisseur (normalisées à la lecture). */
  aliases: string[];
  /**
   * Produit entièrement défini par ce que le devis écrit (« liteau 27×40 ») :
   * reconnu, il ne demande pas de confirmation. Un modèle de marque
   * (« HP10 ») se fait toujours confirmer.
   */
  generic?: boolean;
  attributes: Record<string, Fact>;
  sellingUnits: SellingUnit[];
  note?: string;
}

/** Paramètre d'un ouvrage : lu dans le devis ou demandé à l'artisan. */
export interface ParamDef {
  key: string;
  label: string;
  unit: string;
  /**
   * « site_data » : propre à ce chantier (lu dans le devis ou demandé) ;
   * « artisan_preference » : habitude de l'entreprise, réutilisable d'un chantier à l'autre.
   * Jamais de valeur par défaut : une formule ne calcule qu'avec des données présentes.
   */
  kind: "site_data" | "artisan_preference";
  /** Question posée s'il manque (courte, mots simples). */
  question: string;
  hint?: string;
  /** Bornes admises, en variables de formule (« tuile.pureau_min »). */
  range?: { min: string; max: string };
  /** La quantité de la ligne de l'ouvrage EST cette donnée (« 120 m² » = la surface ; « 2 ensembles » = 2 descentes). */
  fromLineQuantity?: boolean;
  /** Mots qui l'annoncent dans le texte d'une ligne de cet ouvrage (« entraxe 90 cm », « hauteur 4 m »). */
  textLabels?: string[];
}

/** Place d'un produit dans l'ouvrage (« la tuile », « le liteau »). */
export interface Slot {
  key: string;
  family: string;
  label: string;
  /** Départage deux emplacements d'une même famille (« contre-lattage » ≠ « lattage »). */
  keywords?: string[];
  /**
   * Produit d'usage quand le devis ne le précise pas (« liteaux 18×40 pour l'ardoise ») :
   * une PRATIQUE déclarée, jamais une règle. Montrée à l'artisan « à confirmer » ;
   * elle ne change aucune quantité et ne choisit jamais le produit à sa place.
   */
  usual?: { text: string; source: string };
}

/**
 * Ouvrage que le devis COMPTE (« 2 entourages de cheminée », « 6 jouées ») :
 * du vocabulaire, aucune quantité. Une ligne comptée ainsi n'est jamais un
 * nombre d'articles : c'est un nombre d'ouvrages, ou une ambiguïté à lever.
 */
export interface CountedWork {
  key: string;
  label: { one: string; many: string };
  keywords: string[];
}

/** Besoin matériau d'un ouvrage : une formule sourcée. */
export interface NeedRule extends Provenance {
  id: string;
  slot: string;
  /** Formule (voir expression.ts) : paramètres, « slot.caracteristique », « regle.constante ». */
  formula: string;
  /** Unité du résultat (contrôlée contre la formule au chargement). */
  unit: string;
  /**
   * Cœur de l'ouvrage (les tuiles d'une couverture en tuiles) : déduit dès
   * que l'ouvrage est reconnu. Sinon, un besoin absent du devis n'est que
   * suggéré (« À confirmer »), jamais ajouté d'office.
   */
  core: boolean;
  /** Ce que la règle ne compte pas (dit à l'artisan dans « Voir le calcul »). */
  exclusions?: string;
}

export interface WorkItemType {
  id: string;
  trade: string;
  label: string;
  /** Familles du devis qui signalent cet ouvrage. */
  triggers: string[];
  params: ParamDef[];
  slots: Slot[];
  /** Constantes de règle (recouvrement minimal…), chacune sourcée. Citées « regle.cle ». */
  constants: Record<string, Fact>;
  needs: NeedRule[];
}

/**
 * Marge de casse ou de coupe recommandée par une source. Jamais
 * universelle : elle vise une famille, et peut se restreindre à un produit
 * ou à un ouvrage (la plus précise l'emporte). Sans règle, c'est le
 * réglage de l'artisan, sinon 0 % affiché.
 */
export interface WasteRule extends Provenance {
  family: string;
  product?: string;
  workItem?: string;
  /** En pourcentage (« 5 » = 5 %). */
  rate: string;
}

/**
 * Deux savoirs distincts :
 *  - DONNÉE PRODUIT (caractéristiques, conditionnements) : prouvée par le
 *    fabricant, une norme ou un distributeur, jamais par l'habitude ;
 *  - RÈGLE DE MISE EN ŒUVRE (formules, constantes, marges) : norme, DTU,
 *    ou règle BatiClair validée par un professionnel.
 */
export const PRODUCT_DATA_SOURCES: readonly SourceKind[] = ["manufacturer", "standard", "retailer", "definition"];

export interface Referential {
  id: string;
  /** Version des données (incrémentée à chaque modification), enregistrée avec chaque calcul. */
  version: string;
  trade: string;
  sources: Source[];
  families: ProductFamily[];
  products: Product[];
  workItems: WorkItemType[];
  wasteRules: WasteRule[];
  /** Ouvrages comptés à l'unité dans les devis (vocabulaire). */
  countedWorks?: CountedWork[];
}
