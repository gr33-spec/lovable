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
  /** §47.1 : les sources se contredisent (statut « contradiction » du tiroir) ; la valeur retenue reste à confirmer. */
  conflict?: string;
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
  /**
   * Le nom de la règle en un mot, pour « Quantité à confirmer : colle 4 kg/m² » (§47.3) ; « {v} » y place la valeur et
   * son unité (« {v} rails par cloison » → « 2 rails par cloison »).
   */
  label?: string;
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
  /**
   * Consommable (pointes, vis, mastic, bande à joint) : rangé en fin de « Fournitures à chiffrer », dans le groupe
   * « consommables » (§45.3 « du gros au petit, consommables en dernier »).
   */
  consumable?: boolean;
  /**
   * Une précision que le fournisseur ne peut pas deviner et que la ligne du devis ne donne pas (le diamètre d'une
   * sortie de toit) : une question à boutons sur la ligne, la réponse part dans la colonne « précision ». `answered` :
   * expression (texte sans accents, en minuscules) qui dit que la ligne la donne déjà.
   */
  ask?: { question: string; hint?: string; choices: { label: string; value: string }[]; answered: string };
  /**
   * Famille qui l'emporte dès qu'un de ses mots est dans la ligne, où qu'il soit (« Désamiantage de plaques
   * fibres-ciment » : du désamiantage, jamais une ardoise fibres-ciment).
   */
  dominant?: true;
  /** Ce que l'artisan doit savoir quand le devis la cite (l'amiante, §18) : dit en haut de la liste, jamais au fournisseur. */
  warning?: string;
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
  /**
   * Le devis nomme la chose sans la préciser (« zinc prépatiné » : quartz ou anthra ?) : l'hypothèse ne vaut plus,
   * on demande (règle du comptoir, §47.8). Mots cherchés dans les lignes de l'ouvrage.
   */
  unlessText?: string[];
  /**
   * Quand une autre donnée est DONNÉE (devis, réponse), l'hypothèse se déduit d'elle et non de la règle générale :
   * des crochets de 11 cm écrits au devis fixent le recouvrement (crochet − 1 cm, Cupa), donc le pureau (D-2026-020).
   */
  whenGiven?: { param: string; formula: string; note: string };
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
  /**
   * Un nombre écrit DEVANT ces mots dans une ligne de l'ouvrage est cette donnée (« 2 descentes de 3 m » : 2 descentes).
   * Toujours un nombre entier en chiffres ; jamais deviné d'un mot.
   */
  textCount?: string[];
  /** Mots permis entre le mot qui annonce la donnée et sa valeur (« crochets inox de 11 cm » : 2). Par défaut : aucun. */
  labelGap?: number;
  /** Un nombre écrit sans unité après le mot (« crochets de 11 ») se lit dans l'unité de la donnée (dans `textRange`). */
  bareNumber?: true;
  /** Valeurs plausibles d'une lecture dans le texte, dans l'unité de la donnée : hors de là, ce n'est pas elle (« Ø 2,7 mm »). */
  textRange?: { min: string; max: string };
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
  /**
   * Pas encore répondue, la donnée est l'une de ses réponses proposées (le développé : 100 à 400 mm), pas n'importe
   * quelle valeur : ce qui ne dépend pas de laquelle (un bobineau de 500 mm) se calcule sans la demander.
   */
  withinChoices?: boolean;
  /** Un mot de la ligne de l'ouvrage donne la valeur (« VMC » → 0, « fumée » → 1) : lu dans le devis, jamais deviné. */
  textValues?: { value: string; keywords: string[] }[];
  /**
   * La valeur se lit sur les AUTRES ouvrages du devis (« embase adaptée à la couverture » : zinc à joint debout → platine
   * zinc ; ardoises ou tuiles → embase plomb). Deux valeurs possibles dans le même devis : rien n'est déduit, on demande.
   */
  fromWorks?: { value: string; workItems: string[] }[];
  /** Lue sur un autre ouvrage seulement si c'est un ouvrage principal (l'aspect du zinc de la couverture, pas d'une bande). */
  onlyFromPrincipal?: true;
  /** Jamais prêtée par un autre ouvrage : « tu façonnes ? » se demande pièce par pièce (§48.6). */
  ownOnly?: true;
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
  /** La question du comptoir quand le devis ne nomme pas le produit (« Parpaings de 20, de 15 ou de 10 ? »). */
  ask?: string;
  /**
   * Produit par défaut quand le devis ne le précise pas (« liteaux 18×40 pour
   * l'ardoise », « faîtière standard ») : une pratique validée et sourcée,
   * utilisée sans question, dite à l'artisan dans les hypothèses et modifiable.
   * Elle s'efface dès que le devis nomme un produit.
   */
  usual?: { text: string; source: string; productShort?: string; productId?: string };
  /** La ligne du devis donne une MESURE (« 91 m² de joint debout ») ; rien ne se commande sous ce nom. */
  measureOnly?: true;
  /**
   * Avec `measureOnly` : la ligne part AUSSI telle qu'écrite au devis (« Fenêtre PVC 2 vantaux 120×125 » : la menuiserie
   * se commande comme le devis la décrit), et son nombre compte l'ouvrage pour les fournitures de pose (mousse, mastic).
   */
  orderedAsWritten?: true;
  /**
   * Les caractéristiques lues sur un autre emplacement du même ouvrage suivent celui-ci (la naissance prend la matière
   * et la forme de la gouttière : « zinc demi-ronde »).
   */
  charsFrom?: string;
  /**
   * RÈGLE NUMÉRO UN (fondateur, 2026-10-06) : cet emplacement est une autre FORME de l'article écrit dans l'emplacement
   * nommé (les feuilles 2 × 1 m d'une bande que l'artisan façonne, les bobines d'une couverture joint debout) : il existe
   * dès que cet article est écrit au devis.
   */
  formOf?: string;
  /**
   * §49.1 point 3 : accessoire indissociable d'une ligne écrite, liste FERMÉE (une seule entrée aujourd'hui : la naissance
   * d'une gouttière, §48.7). Toute nouvelle entrée est une décision du fondateur, écrite au §49.1.
   */
  indissociable?: true;
  /**
   * La ligne écrite en mètres se commande en pièces : « 2 descentes de 3 m » = 2 tubes de 3 m (D-2026-020, §49.2.3).
   * `piece` : le nom de la pièce au comptoir (« tube »), « longueur » sinon.
   */
  piecesFrom?: { count: string; length: string; piece?: { one: string; many: string } };
  /**
   * Mots d'une ligne de POSE qui citent cet article sans le chiffrer (« fixation » des descentes = les colliers) : il
   * sort, calculé, mais orange (« le devis parle de fixation sans les chiffrer », §49.6).
   */
  citedBy?: string[];
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
  /** Le nom de la règle en un mot, quand elle est « à vérifier » (§47.3 : « Quantité à confirmer : montants 1 par 60 cm »). */
  short?: string;
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
  /** Comment la quantité se compte, dit seulement quand le devis écrit une autre quantité (« pour 10 ml, un tous les 50 cm »). */
  basis?: string;
  /**
   * Données sans lesquelles la précision ne s'écrit pas et que le fournisseur ne peut pas deviner (le diamètre d'une
   * sortie de toit) : demandées même si elles ne changent aucune quantité — elles changent l'article.
   */
  precisionRequires?: string[];
  /**
   * Désignation calculée de l'article, à la place du nom du produit générique (« Bobineau {largeur|mm#} × {longueur|m},
   * {epaisseur|mm#} » → « Bobineau 500 × 17 m, 0,65 ») : même écriture que la précision.
   */
  designation?: string;
  /**
   * Besoin hors cœur (core: false) proposé dans « On ajoute ? » (§45.8) comme un consommable, Oui / Non d'un tap :
   * l'égout et le faîtage du joint debout (le comptoir ne demande pas « on les ajoute ? », §47.8). Sauf si une ligne
   * du devis cite déjà l'un de ces mots (la bande d'égout est au devis).
   */
  offer?: { unlessQuoteSays?: string[] };
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
  /**
   * §49.1 point 4 : consommable de pose (pointes, vis, pattes, étain, silicone). Il ne sort que si l'artisan a dit OUI à
   * la question consommables, et seulement lié à une ligne écrite (`consumableFor` : l'emplacement qui doit être écrit ;
   * sans lui, n'importe quel article écrit de l'ouvrage). Une famille marquée « consumable » l'est d'office.
   */
  consumable?: true;
  consumableFor?: string;
  /**
   * Quantité ESTIMÉE (les feuilles d'un zinc façonné sur place, d'après le développé) : la ligne sort orange avec cette
   * phrase (« ajuste selon ton façonnage », §49.6), jusqu'au « C'est bon » de l'artisan.
   */
  estimate?: string;
}

export interface WorkItemType {
  id: string;
  trade: string;
  label: string;
  /**
   * Rang de l'ouvrage dans la liste des fournitures (retour du fondateur, 2026-10-04) : l'ouvrage principal, puis
   * les points singuliers, puis l'évacuation des eaux ; les consommables ferment la liste. Absent : point singulier.
   */
  section?: "principal" | "singulier" | "evacuation";
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
  /**
   * RÈGLE NUMÉRO UN (§49.1, tous les tiroirs, tous les métiers) : seuls les articles écrits au devis sortent (leur forme
   * d'achat comprise), plus la naissance indissociable et les consommables acceptés. Absent : la règle s'applique.
   * `false` : VALIDATION DU RÉFÉRENTIEL seulement (ses formules sur tous les articles), jamais pour un artisan.
   */
  writtenOnly?: boolean;
}
