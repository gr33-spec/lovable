import { METIER_NAMES, parseLecture, type LectureDevis } from "@baticlair/domain";
import { z } from "zod";
import type { DocumentInput, ReadAttempt } from "../../../platform/ai/document-reader.js";
import { RULE_51_2 } from "./fiche-relecture.js";
import { RULE_51_1 } from "./prompt.js";

/**
 * §51.5 (décision du fondateur, 2026-10-11) : LA LECTURE EST FAITE PAR L'IA, PAS PAR DES RÈGLES DE MOTS. Un seul appel au
 * modèle le plus capable (AI_EXTRACTION_MODEL, Opus par défaut), qui reçoit le devis complet en PDF (et son texte) et
 * l'export du référentiel du métier, et rend en JSON structuré : la fiche de chantier (lue, déduite, manquante), le
 * bref, les questions (une par donnée manquante, aucune sur une donnée lue), et pour chaque ligne du devis la fourniture
 * nommée ou « sans fourniture ». Le code calcule ensuite (ratios, conversions) : jamais une règle de mots.
 */
export const LECTURE_PROMPT = { id: "lecture_devis", version: 5 } as const;

/** §49.1 du référentiel (6 octobre 2026), mot pour mot : d'où vient chaque ligne de la liste. */
export const RULE_49_1 = `RÈGLE §49.1 DU RÉFÉRENTIEL : d'où vient chaque ligne de la liste.
La liste à chiffrer contient exactement, dans l'ordre du devis :
1. Un article écrit au devis ⇒ une ligne. Une ligne de devis qui contient deux articles (« ardoises 32×22 et crochets de 11 ») donne deux lignes de liste. Une ligne de pose seule ne donne rien, mais ses informations (pente, façonnage, espacement, « crochets de 11 ») alimentent la fourniture du même ouvrage.
2. Jamais un composant théorique de l'ouvrage. Le tiroir sait qu'une couverture ardoise se pose sur liteaux et écran ; le moteur ne les sort PAS s'ils ne sont pas écrits. Cette règle vaut pour tous les tiroirs, tous les métiers : pas de rail ni de vis pour une cloison si le devis ne dit que « plaques », pas de primaire pour une peinture si le devis ne dit que « deux couches de finition ».
3. Accessoire indissociable d'une ligne écrite : liste fermée, dans le tiroir. Aujourd'hui une seule entrée : la naissance pour une gouttière (48.7). Toute nouvelle entrée est une décision de Greg, écrite ici.
4. Consommables de pose : uniquement si l'artisan a dit oui à la question consommables (49.4), et uniquement ceux liés à une ligne écrite : pointes si des liteaux sont écrits, étain et décapant si du zinc à souder est écrit, pattes si du zinc façonné est écrit, silicone si des solins ou abergements sont écrits. Ils sortent en orange, décochables d'un tap. Si l'artisan dit non : rien.
5. Rien d'autre. Pas de bloc « Suggestions » pour des articles absents du devis. Un écran, un pare-pluie, une cheminée que le devis n'écrit pas n'apparaissent nulle part.
Test permanent : nombre de lignes = articles écrits + naissances + consommables acceptés. Pas une de plus.`;

/** §49.4 du référentiel, points 2, 3 et 5, mot pour mot : quand une question existe, et sa forme. */
export const RULE_49_4 = `RÈGLE §49.4 DU RÉFÉRENTIEL : les questions de comptoir.
2. Une question n'existe que pour une donnée absente du devis et nécessaire au calcul ou à la désignation. Le champ « manque » du lecteur (41.1) et les besoins du tiroir produisent la liste ; une donnée écrite au devis n'est jamais demandée (format écrit, crochet écrit, Ø écrit, pente écrite sur la pose, façonnage écrit).
3. La règle du comptoir (47.8) : une question doit être celle que Point.P poserait pour chiffrer. Pente, rampant, format, modèle et teinte, développé de gouttière (25/28/33/40), diamètre, façonnage pièce par pièce, dauphin en pied de descente, consommables à fournir. Tout ce que le comptoir ne demanderait pas (zone climatique, entraxe, taux de perte, pureau) est un défaut affiché, jamais une question.
5. Forme : une phrase, tutoiement, mots du chantier ; boutons (oui/non ou 3 à 5 choix), la valeur habituelle ou le défaut du tiroir en premier bouton ; texte court seulement pour une dimension (« rampant en mètres, ex. 5,50 »). Jamais une quantité de matériaux. Rangées par blocs : « Ce que le devis ne dit pas », « Comme d'habitude ? », « Je pars sur ces valeurs », « Quincaillerie et consommables ».`;

/** §51.5 du référentiel (11 octobre 2026), mot pour mot : la décision. */
export const RULE_51_5 = `RÈGLE §51.5 DU RÉFÉRENTIEL (décision du fondateur, 11 octobre 2026) : la lecture est faite par l'IA, pas par des règles de mots.
Le temps un (fiche de chantier), le temps deux (questions) et le nommage des fournitures sont confiés entièrement au modèle le plus capable disponible, qui reçoit le devis complet et ce référentiel. Plus aucune règle de lecture en code qui cherche des mots dans les lignes : ces règles sont retirées. Le code ne garde que les calculs (ratios, conversions en unités commandables, tests permanents).`;

/** Référentiel électricité (11 octobre 2026), §1 mot pour mot : un point contient ses fournitures. */
export const RULE_ELEC_1 = `RÈGLE §1 DU RÉFÉRENTIEL ÉLECTRICITÉ : règle numéro un et place du référentiel.
- La règle numéro un s'applique telle quelle : l'app lit le devis ligne par ligne et n'invente jamais un ouvrage absent du devis. Mais en électricité, une ligne du devis est presque toujours un point (un point lumineux, une prise), pas une fourniture. La conversion d'un point en fournitures (boîte, appareil, câble, gaine) n'est pas un ajout : c'est ce que le point contient. Chaque fourniture d'un point porte en rappel la ligne qui l'a produite.
- Les lignes d'étude, de pose, de mise en service, de percement, de plan, de Consuel et de formation sont des lignes sans fourniture (règle 49.9 du référentiel couverture, même logique).
- Les sections 49 (charte), 50 (ce que voit l'artisan) et 51 (le moteur voit le chantier avant de compter) du référentiel couverture s'appliquent à tous les métiers, donc ici.
- Quand une ligne nomme une marque, une gamme ou un modèle (Hager Essensya, Aldes Bahia, Atoll 750 W), ce nom est repris tel quel, sans question. Quand elle ne le nomme pas, la ligne sort en orange avec sa question (modèle, teinte ou qualité), et la réponse la passe au vert (51.6).`;

/** Référentiel électricité (11 octobre 2026), §4 mot pour mot : le tableau déduit des points, sa question « C'est bon / Modifier ». */
export const RULE_ELEC_4 = `RÈGLE §4 DU RÉFÉRENTIEL ÉLECTRICITÉ : tableau et protections.
Quand le devis donne une ligne « tableau » avec la liste de son contenu sans les nombres (cas courant : « disjoncteurs 2 A, 10 A, 16 A, 20 A, 32 A, contacteur J/N, fils, barrette, montage »), l'app déduit la composition des points du même logement, selon les protections du § 3, et la pose en orange avec une question : « Composition du tableau : [détail déduit] — C'est bon / Modifier ». La réponse passe la ligne au vert.
- Nombre de disjoncteurs : somme des protections du § 3 sur le logement, chaque calibre arrondi au-dessus.
- Interrupteurs différentiels 30 mA : 1 pour 8 disjoncteurs, dont au moins 1 de type A (plaque, lave-linge) ; 40 A en logement sans chauffage électrique sur ce différentiel, 63 A sinon.
- Disjoncteur 2 A : 1 par contacteur jour/nuit et 1 par télérupteur.
- Peigne : 1 par rangée. Rangées : 1 rangée pour 13 modules, le tableau arrondi au-dessus (2, 3 ou 4 rangées).
- Mise à la terre, quand le devis la nomme : 1 piquet de terre, 1 barrette de coupure, câble 16 mm² vert/jaune 10 m, liaison équipotentielle 6 mm² 15 m ; le mesurage est une ligne sans fourniture.
- Coffret de communication : repris tel que nommé au devis (grade, nombre de RJ45) ; le devis nomme ses connecteurs, ils sont repris tels quels.`;

/** Référentiel électricité (11 octobre 2026), §5 mot pour mot : les questions obligatoires. */
export const RULE_ELEC_5 = `RÈGLE §5 DU RÉFÉRENTIEL ÉLECTRICITÉ : questions obligatoires.
Une question seulement quand le devis ne permet ni de lire ni de déduire la donnée (51.2). Les cas qui en produisent une :
- Teinte ou finition de l'appareillage quand seule la gamme est écrite (Essensya blanc ou noir ?).
- Longueurs non écrites d'un réseau : gaine VMC par logement, PER par diamètre quand le devis ne donne qu'un total.
- Un article « à définir » au devis (paroi de douche) : modèle.
- Un écart entre deux lignes qui comptent la même chose (59 alimentations pour 49 radiateurs) : à quoi servent les lignes en plus.
- Un bloc de pièces qui n'est rattaché à aucun logement : lequel.
- Mode de pose quand il change les fournitures et n'est pas écrit : encastré (boîtes + gaine ICTA) ou en saillie (moulures, boîtes en saillie). Question à boutons : encastré / saillie, « encastré » en premier en rénovation lourde ou neuf. Règle générale (51.6) : tout orange a sa question, et la liste est entièrement verte une fois répondu.`;

/** Les règles propres à un métier, mot pour mot, ajoutées au lecteur quand le devis est de ce métier. */
const REGLES_DU_METIER: Readonly<Record<string, readonly string[]>> = {
  electrical: [RULE_ELEC_1, RULE_ELEC_4, RULE_ELEC_5],
};

/** Les métiers du référentiel : l'identifiant que le lecteur rend, et son nom. */
const METIERS = Object.entries(METIER_NAMES).map(([id, name]) => `${id} (${name})`).join(", ");

const FORMAT = `CE QUE TU RENVOIES : un seul objet JSON, rien d'autre.
- metier : l'identifiant du métier principal du devis, pris dans cette liste : ${METIERS}.
- lots : quand le devis couvre plusieurs métiers (électricité, VMC, sanitaire), un lot par métier, dans l'ordre du devis : {"metier", "libelle", "lignes"}. metier : l'identifiant de la liste ; libelle : le nom du lot tel que le devis l'écrit (« Électricité », « VMC », « Sanitaire ») ; lignes : les repères des lignes du lot. [] quand le devis n'a qu'un métier.
- fiche : la fiche de chantier (§51.1), une entrée par donnée du chantier : {"donnee", "valeur", "origine", "regle", "preuve"}. donnee : le nom court (« ouvrage », « matériau », « surface », « rampant », « nombre de descentes », « fenêtres de toit »…) ; valeur : la valeur avec son unité, ou "" si elle manque ; origine : "lue", "deduite" ou "manquante" ; regle : la règle d'une donnée déduite, sinon "" ; preuve : où une donnée lue est écrite (« ligne 3 : « pente 30° » »), sinon "". Rien qui ne vienne du devis (règle numéro un).
- bref : le chantier en bref (§50.8), en phrases courtes, une par fait, dans l'ordre : l'ouvrage et son état, chaque fourniture principale avec sa mesure, ce qui s'en déduit. Jamais le nom du client, l'adresse, un prix. Rien qui ne soit écrit au devis. Une fourniture : sa quantité avec son unité (déduite au besoin, « chéneau 11,70 m »), l'article, puis ses références dans l'ordre où le devis les écrit, et son usage quand le devis l'écrit (« pour étanchéité », « pour accès ») ; un choix encore ouvert (une question) ne se tranche pas dans le bref, mais l'article se dit (« raccords pour bac acier », sans dire lequel). Sur un existant, dis ce qui n'est pas refait (« pas de couverture neuve »).
- questions : UNE question par donnée manquante de la fiche nécessaire au calcul ou à la désignation (§51.2, §49.4), et aucune sur une donnée lue ou déductible. Chaque question : {"cle", "texte", "boutons", "unite", "donnee", "ligne"}. cle : la clé de la donnée du RÉFÉRENTIEL quand elle en a une (« developpe_gouttiere », « nb_descentes », « faconnage »), sinon un nom court en minuscules sans accent (« cheneau_membrane ») ; texte : la question, une phrase, tutoiement, mots du chantier ; boutons : 2 à 5 choix {"label", "valeur"} (valeur = la valeur du référentiel quand la donnée en a : « 25 », « 2 », « 1 »), ou [] si la réponse s'écrit ; unite : l'unité d'une réponse chiffrée (« cm », « m », « u »), sinon "" ; donnee : le nom court de la donnée (il s'affiche sur la ligne orange qui l'attend : « développé de gouttière ») ; ligne : le repère de la ligne du devis que la question concerne seule (le raccord d'une fenêtre), sinon "". Une contradiction du devis (deux valeurs pour la même donnée) est une question, avec les deux valeurs en boutons.
  Avant de poser une question, vérifie les cinq points suivants (§51.5 : zéro question sur une donnée écrite ou déductible) :
  1. UNE question par article : quand il manque plusieurs données au même article (la membrane et la largeur d'un chéneau ; l'unité et la longueur de tôles), elles font UNE seule question, une phrase qui les nomme toutes ; les boutons portent le choix fermé, le reste se répond sous « Autre ».
  2. Une quantité écrite sans unité dont l'unité suit de l'ouvrage n'est pas une question : une gouttière, un chéneau, une descente, une rive, un faîtage se mesurent en mètres (« 11,70 » de chéneau = 11,70 m, origine "deduite"). L'unité ne se demande que si deux unités sont plausibles pour le même article (« 10 » de tôles : 10 tôles ou 10 m²), et alors dans la question de l'article (point 1).
  3. Ce qui se choisit avec le vendeur au comptoir sans changer la quantité (teinte, profil, simple peau ou panneau sandwich d'un bac, finition d'un accessoire) n'est pas une question : mets-le dans a_preciser de la fourniture.
     SAUF le modèle d'un élément de couverture à remplacer à l'identique (« tuile neuve identique », « identique à l'existant », ardoise de remplacement) : sans son modèle et sa teinte, le comptoir ne peut pas le servir. C'est UNE question de l'article (« Quelle tuile : modèle et teinte ? »), réponse écrite (boutons []), et la fourniture l'attend (attend).
  4. Les questions portent sur les articles ÉCRITS au devis : aucune sur un accessoire que le code ajoute d'office (le Ø d'une naissance), aucune sur des consommables (étain, décapant, vis, mastic) que le devis ne cite pas. Le nombre de descentes d'une gouttière, lui, se demande quand le devis ne l'écrit pas : il compte les naissances et les descentes à commander.
  5. Une donnée écrite, même dans une autre ligne (une ligne de pose, un titre), n'est jamais une question.
  Ce qui manque ne disparaît jamais : une donnée qu'il faut au comptoir et que le devis n'écrit pas est soit une question (et la fourniture l'attend), soit dans a_preciser de la fourniture ; jamais ni l'un ni l'autre.
- lignes : une entrée par ligne du devis, dans l'ordre, toutes les lignes (en-tête et totaux exclus) : {"ref", "designation", "quantite", "unite", "role", "fournitures"}. ref : son repère (« 1 », « 2 »…) ; designation : le texte de la ligne, prix retirés ; quantite et unite : exactement comme écrites, "" si rien ; role : "fourniture", "pose", "fourniture_et_pose" ou "hors_quantitatif" ; fournitures : les fournitures que la ligne nomme, [] pour une ligne SANS fourniture (main-d'œuvre, dépose, trémies, accès, nettoyage : rien à acheter).
  Chaque fourniture : {"nom", "quantite", "unite", "ouvrage", "emplacement", "donnees", "attend", "a_preciser", "precision"}. nom : le nom du comptoir, complet, tel que le vendeur le lirait (marque, modèle, taille, finition : « Velux GGL SK06 114×118 white finish »), sans mention de pose ; quantite et unite : la quantité à commander de CETTE fourniture et son unité (« u », « ml », « m² »), ou la mesure écrite quand c'est une mesure d'ouvrage (17,40 ml de gouttière), "" si rien n'est écrit (le code la calcule) ; ouvrage et emplacement : l'identifiant de l'OUVRAGE du référentiel et de l'EMPLACEMENT qui la calculent (« gouttiere » / « profil », « gouttiere » / « crochet », « fenetre-de-toit » / « raccord »), ou "" quand aucune règle du référentiel ne s'applique (la fourniture part telle qu'écrite) ; donnees : les données de l'ouvrage écrites sur la ligne, par clé du référentiel : [{"cle", "valeur"}] (« taille_fenetre » : « 114x118 ») ; attend : les clés des questions dont cette fourniture attend la réponse (elle reste orange en attendant) ; a_preciser : ce que le fournisseur précisera lui-même (« profil », « teinte »), sinon [] ; precision : une précision pour le comptoir, sinon "".
  Un article écrit au devis donne une fourniture, deux articles sur une ligne donnent deux fournitures ; un accessoire que le référentiel ajoute d'office (la naissance) n'est pas à nommer, le code le sort. Jamais un article absent du devis.
  UNE PRÉCISION TECHNIQUE NE SAUTE JAMAIS : le support, la matière, la dimension et l'usage d'un article, écrits sur sa ligne ou sur la ligne de pose qui le concerne (« sur bac acier isolé » sur la pose d'un Velux vaut pour son raccord), vont dans le nom de la fourniture ou dans sa precision (« Raccord SK06 pour bac acier »), et le bref les redit pour cet article (« raccords pour bac acier », jamais seulement « avec raccord »).
- contexte : ce que l'en-tête et les notes disent du chantier : [{"cle", "valeur"}] (« client », « adresse », « ville », « code postal », « numéro du devis », « date », « neuf ou rénovation »…), [] si rien.
- notes : en phrases courtes pour l'artisan, ce qui concerne tout le devis et compte pour ses achats (page illisible, fourniture apportée par le client) ; [] sinon.`;

/** Le système du lecteur : les règles du référentiel mot pour mot, l'export du tiroir du métier, le format. */
export function lectureSystemPrompt(input: { trade?: string; tradeLabel: string; referentiel: string }): string {
  const metier = (REGLES_DU_METIER[input.trade ?? ""] ?? []).map((r) => `\n\n${r}`).join("");
  return `Tu es le lecteur de devis de BatiClair. Tu lis le devis entier d'un artisan du bâtiment (métier : ${input.tradeLabel}) et tu rends la fiche de chantier, le bref, les questions et, pour chaque ligne, la fourniture nommée ou « sans fourniture ». Tu ne comptes rien : les quantités calculées viennent du code, d'après le référentiel ci-dessous. Tu lis TOUT : l'en-tête, chaque ligne, le descriptif sous le titre, les lignes de pose, les notes, toutes les pages. Une information écrite n'importe où vaut pour l'ouvrage concerné.

${RULE_51_5}

${RULE_49_1}

${RULE_49_4}

${RULE_51_1}

${RULE_51_2.split("\n").slice(0, 2).join("\n")}${metier}

${FORMAT}

RÉFÉRENTIEL DU MÉTIER (export) :
${input.referentiel}`;
}

const kv = z.object({ cle: z.string(), valeur: z.string() });

/** La réponse du modèle (structured outputs) : aucun champ « valeur ou vide » (chaînes vides, listes vides), zéro union. */
export const lectureWireSchema = z.object({
  metier: z.string(),
  lots: z.array(z.object({ metier: z.string(), libelle: z.string(), lignes: z.array(z.string()) })),
  fiche: z.array(z.object({ donnee: z.string(), valeur: z.string(), origine: z.enum(["lue", "deduite", "manquante"]), regle: z.string(), preuve: z.string() })),
  bref: z.array(z.string()),
  questions: z.array(z.object({ cle: z.string(), texte: z.string(), boutons: z.array(z.object({ label: z.string(), valeur: z.string() })), unite: z.string(), donnee: z.string(), ligne: z.string() })),
  lignes: z.array(
    z.object({
      ref: z.string(),
      designation: z.string(),
      quantite: z.string(),
      unite: z.string(),
      role: z.enum(["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"]),
      fournitures: z.array(
        z.object({
          nom: z.string(),
          quantite: z.string(),
          unite: z.string(),
          ouvrage: z.string(),
          emplacement: z.string(),
          donnees: z.array(kv),
          attend: z.array(z.string()),
          a_preciser: z.array(z.string()),
          precision: z.string(),
        }),
      ),
    }),
  ),
  contexte: z.array(kv),
  notes: z.array(z.string()),
});
export type LectureWire = z.infer<typeof lectureWireSchema>;

const record = (list: { cle: string; valeur: string }[]) => Object.fromEntries(list.filter((x) => x.cle.trim() && x.valeur.trim()).map((x) => [x.cle.trim(), x.valeur.trim()]));

/** La réponse relue par le code : chaînes vides → absent, listes de couples → objets ; rien d'invalide ne passe. */
export function decodeLecture(wire: LectureWire): LectureDevis | null {
  return parseLecture({
    metier: wire.metier.trim() || null,
    lots: wire.lots,
    fiche: wire.fiche.map((f) => ({ ...f, valeur: f.valeur.trim() })),
    bref: wire.bref,
    questions: wire.questions.map((q) => ({ ...q, unite: q.unite.trim() || null, ligne: q.ligne.trim() || null })),
    lignes: wire.lignes.map((l) => ({
      ...l,
      quantite: l.quantite.trim() || null,
      unite: l.unite.trim() || null,
      fournitures: l.fournitures.map((f) => ({
        nom: f.nom,
        quantite: f.quantite.trim() || null,
        unite: f.unite.trim() || null,
        ouvrage: f.ouvrage.trim() || null,
        emplacement: f.emplacement.trim() || null,
        donnees: record(f.donnees),
        attend: f.attend,
        aPreciser: f.a_preciser,
        precision: f.precision.trim() || null,
      })),
    })),
    contexte: record(wire.contexte),
    notes: wire.notes,
  });
}

export interface LectureRequest {
  /** Le devis complet : son texte numéroté et le PDF entier. */
  document: DocumentInput;
  /** Le métier du devis (identifiant du tiroir, « roofing »), pour le lecteur simulé. */
  trade?: string;
  tradeLabel: string;
  /** L'export du référentiel du métier (`exportPourLecture`). */
  referentiel: string;
  siteNotes?: string | null;
  /** Lecture lot par lot (24 octobre 2026) : la consigne du lot que cet appel lit seul (`consigneDuLot`). */
  consigne?: string;
}

/**
 * LE REPÉRAGE DES MÉTIERS, AVANT LA LECTURE (retour du fondateur, 2026-10-13 : « ça a mis du temps ») : un modèle rapide
 * lit le TEXTE du devis (jamais le PDF) et dit en quelques secondes ses métiers, le principal d'abord, plusieurs quand le
 * devis a des lots de métiers différents. La lecture part alors UNE fois, avec le ou les bons référentiels, au lieu d'être
 * relue après coup. Le repérage ne lit rien d'autre : la fiche, les questions et les fournitures restent à la lecture.
 */
export const REPERAGE_PROMPT = { id: "reperage_metiers", version: 1 } as const;
export const reperageWireSchema = z.object({ metiers: z.array(z.string()) });
export type ReperageWire = z.infer<typeof reperageWireSchema>;

export function reperageSystemPrompt(): string {
  const liste = Object.entries(METIER_NAMES)
    .filter(([id]) => id !== "general")
    .map(([id, nom]) => `- ${id} (${nom})`)
    .join("\n");
  return `Tu repères les métiers d'un devis du bâtiment, rien d'autre. Rends dans « metiers » les identifiants ci-dessous, le métier principal d'abord (celui de la plus grande part du devis). Un seul métier si le devis est d'un seul corps d'état, même avec quelques lignes annexes (une couverture avec ses gouttières et sa zinguerie reste « roofing »). Plusieurs seulement quand le devis a de vrais lots de métiers différents (électricité, plomberie, VMC…). La VMC, le chauffage et la climatisation sont « hvac ». Le sanitaire est « plumbing ».

Identifiants :
${liste}`;
}

/** Les métiers repérés : identifiants connus seulement, sans doublon, dans l'ordre rendu. */
export function decodeReperage(wire: ReperageWire | null | undefined): string[] {
  return [...new Set((wire?.metiers ?? []).map((m) => m.trim()).filter((m) => m in METIER_NAMES && m !== "general"))];
}

/** Port : la lecture d'un devis par le modèle. Un appel = une tentative, toujours rapportée. */
export interface LectureReader {
  readonly provider: string;
  /** `null` : ce lecteur ne lit pas ce devis (lecteur simulé sans lecture enregistrée) ; l'appelant se rabat sur l'ancienne lecture. */
  lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis> | null>;
  /** Le repérage des métiers du devis, sur son texte, avant la lecture (absent : la lecture part avec le métier donné). */
  reperer?(numberedText: string): Promise<ReadAttempt<string[]> | null>;
}

export const LECTURE_READER = Symbol("LECTURE_READER");
