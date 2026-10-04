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
  /**
   * Pratique de métier écrite et validée par un professionnel identifié
   * (référentiel du fondateur). Peut porter une règle, une hypothèse par
   * défaut, et les données d'un produit GÉNÉRIQUE (« faîtière standard ») ;
   * jamais celles d'un produit de marque.
   */
  | "trade_practice"
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
  /**
   * Famille plus précise qu'une autre (« tuile canal » précise « tuile ») : si la ligne est rattachée à la
   * famille générale mais nomme quelque part celle-ci (« Tuiles (fourniture et pose de tuiles canal…) »),
   * c'est elle qui compte. Du vocabulaire, jamais un réglage pour un devis.
   */
  refines?: string;
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

/**
 * HYPOTHÈSE PAR DÉFAUT d'un paramètre, sourcée et validée : utilisée sans
 * question quand le devis ne dit rien, DITE à l'artisan (« Hypothèses :
 * pente 45 % ») et modifiable d'un geste. Une valeur fixe (« 45 % »), ou une
 * formule sur les autres données (« le pureau mini du fabricant »).
 */
export interface ParamDefault extends Provenance {
  value?: string;
  formula?: string;
  /** Pourquoi, en mots d'artisan (« Pente moyenne d'une toiture »). */
  note?: string;
}

/** Paramètre d'un ouvrage : lu dans le devis, supposé par défaut, ou demandé à l'artisan. */
export interface ParamDef {
  key: string;
  label: string;
  unit: string;
  /**
   * « site_data » : propre à ce chantier (lu dans le devis ou demandé) ;
   * « artisan_preference » : habitude de l'entreprise, réutilisable d'un chantier à l'autre.
   */
  kind: "site_data" | "artisan_preference";
  /** Question posée s'il manque (courte, mots simples). */
  question: string;
  hint?: string;
  /** Bornes admises, en variables de formule (« tuile.pureau_min »). */
  range?: { min: string; max: string };
  /** La quantité de la ligne de l'ouvrage EST cette donnée (« 120 m² » = la surface ; « 2 ensembles » = 2 descentes). */
  fromLineQuantity?: boolean;
  /**
   * Seulement depuis une ligne de ces emplacements (« 24 m » de la ligne RIVES = la longueur de rives ;
   * « 480 ml » d'une ligne de liteaux n'en est pas une). Sans restriction : toute ligne de l'ouvrage.
   */
  forSlots?: string[];
  /** Mots qui l'annoncent dans le texte d'une ligne de cet ouvrage (« entraxe 90 cm », « hauteur 4 m »). */
  textLabels?: string[];
  /** Sans valeur lue ni répondue : cette hypothèse, dite et modifiable. Sans hypothèse : une question. */
  default?: ParamDefault;
  /** Réponses proposées en boutons (l'artisan ne tape rien) : « Faible (30 %) », « Moyenne (45 %) »… */
  choices?: { label: string; value: string }[];
  /**
   * Valeur approchée faute de table officielle (la région ardoise prise égale à la zone climatique
   * du département) : dite « estimation » à l'artisan, avec cette raison.
   */
  estimate?: string;
  /** Façon de dire une valeur dans l'explication (« 3 » → « III » pour une région ardoise) ; le calcul garde la valeur. */
  display?: Record<string, string>;
}

/**
 * VALEUR INTERMÉDIAIRE d'un ouvrage (le pureau d'une ardoise, déduit du
 * recouvrement) : une formule sourcée, citée par son nom dans les règles.
 */
export interface DerivedRule extends Provenance {
  key: string;
  label: string;
  unit: string;
  formula: string;
  /** Dite dans les hypothèses à l'artisan (« pureau 10 cm »). */
  shown?: boolean;
}

/**
 * TABLE à une ou deux entrées (recouvrement de l'ardoise selon la pente et
 * la zone) : la cellule retenue est celle des plus grands seuils atteints
 * par chaque entrée ; une entrée sous le premier seuil est hors table (le
 * calcul le dit, il ne devine pas). Citée « table.nom » dans les formules.
 */
export interface LookupTable extends Provenance {
  label: string;
  unit: string;
  axes: { param: string; thresholds: string[] }[];
  /** values[i][j] : i = ligne du premier axe, j = colonne du second (une seule colonne sans second axe). */
  values: string[][];
  note?: string;
}

/**
 * TABLE DE POINTS d'un fabricant (Cupa, §34) : une valeur pour une combinaison EXACTE de données
 * (format de l'ardoise et recouvrement). Elle fait foi ; hors table seulement, `otherwise` calcule
 * (interpolation par la formule du fabricant), et c'est dit. Citée « points.nom ».
 */
export interface PointTable extends Provenance {
  label: string;
  unit: string;
  /** Données comparées à l'égalité, dans l'unité où la table les écrit (« ardoise.longueur » en cm). */
  keys: { variable: string; unit: string }[];
  /** Une ligne = les valeurs des clés, puis la valeur. */
  rows: string[][];
  /** Hors table : cette formule, de même unité. */
  otherwise: string;
  /**
   * Bornes du fabricant : pour un produit donné (les premières clés), la dernière clé doit rester entre
   * le plus petit et le plus grand de ses lignes (32×22 : recouvrement 69 à 103 mm). Au-delà, le produit
   * de cet emplacement n'est pas admis : UNE question, avec les produits admis, le plus proche d'abord.
   */
  admissible?: { slot: string };
  note?: string;
}

/** Place d'un produit dans l'ouvrage (« la tuile », « le liteau »). */
export interface Slot {
  key: string;
  family: string;
  label: string;
  /** Départage deux emplacements d'une même famille (« contre-lattage » ≠ « lattage »). */
  keywords?: string[];
  /**
   * Produit par défaut quand le devis ne le précise pas (« liteaux 18×40 pour
   * l'ardoise », « faîtière standard ») : une pratique validée et sourcée,
   * utilisée sans question, dite à l'artisan dans les hypothèses et modifiable.
   * Elle s'efface dès que le devis nomme un produit.
   */
  usual?: { text: string; source: string; productShort?: string; productId?: string };
  /** La ligne du devis donne une MESURE (« 91 m² de joint debout ») ; rien ne se commande sous ce nom. */
  measureOnly?: true;
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
  /**
   * Formule (voir expression.ts) : paramètres, « slot.caracteristique », « regle.constante », et
   * « commande.<besoin> » : la quantité d'un besoin PRÉCÉDENT du même ouvrage, après sa marge et
   * arrondie à l'unité (un crochet par ardoise COMMANDÉE, pas par ardoise posée).
   */
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
  /**
   * Ce qui sert au comptoir (§45.3, colonne « précision ») : l'usage de la pièce
   * (« pour façonner la bande d'égout »), une position (« zone fixe de chaque bac »).
   * Une ligne dont on ne sait pas à quoi elle sert porte son usage ici (§45.5).
   */
  precision?: string;
  /**
   * Besoin qui n'existe que si ces données sont connues (« tuiles de rive »
   * seulement si le devis donne une longueur de rives) : sinon il est omis,
   * sans question ni « inconnu ».
   */
  requires?: string[];
  /**
   * Condition d'existence (« faconnage < 2 ») : le besoin n'existe que si elle est vraie. Tant que
   * ses données ne sont pas connues, le besoin existe et pose sa question (« tu façonnes ? »).
   */
  when?: string;
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
  /** Valeurs intermédiaires (pureau de l'ardoise), citées par leur clé. */
  derived?: DerivedRule[];
  /** Tables (recouvrement selon pente et zone), citées « table.nom ». */
  tables?: Record<string, LookupTable>;
  /** Tables de points de fabricant (valeur exacte, formule hors table), citées « points.nom ». */
  points?: Record<string, PointTable>;
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
/** Un produit GÉNÉRIQUE (sans marque) peut en plus tenir ses données d'une pratique métier validée. */
export const GENERIC_PRODUCT_DATA_SOURCES: readonly SourceKind[] = [...PRODUCT_DATA_SOURCES, "trade_practice"];

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
