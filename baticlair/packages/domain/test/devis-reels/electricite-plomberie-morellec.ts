import { line, resetLines, type BenchLine, type Truth } from "./truth.js";

/**
 * Devis réel électricité + VMC + sanitaire (transformation d'un immeuble en
 * 4 logements, 2022), d'une entreprise multi-métiers. Fourni par le
 * fondateur le 2026-10-01. ANONYMISÉ : désignation, quantité, unité.
 *
 * Document SCANNÉ (aucun texte) : lignes relevées sur l'image, comme le fait
 * la lecture IA sur une page sans texte. Les titres (« APPAREILLAGE HAGER
 * ESSENSYA », « N°1 TYPE T3 », « CUISINE/SEJOUR »…) ne sont pas des lignes :
 * gardés dans CONTEXT, information du document.
 */
resetLines();

const POINT_NOTE = "Point d'installation (mécanisme + plaque + boîte + câble + gaine) : ouvrage composé, longueur de câble inconnue.";
const PRISE_NOTE = "Prise : la quantité compte les prises à commander ; boîtes, plaques et câble s'y ajoutent.";
// Grille corrigée après le passage à l'aveugle : une PRISE se compte à la pièce (« P »), un point lumineux
// ou une alimentation reste un ouvrage composé (« C »). Appliquée aussi au score « avant ».
const pt = (designation: string, qty: string) =>
  designation.startsWith("PRISE") ? line(designation, qty, "U", "P", PRISE_NOTE) : line(designation, qty, "U", "C", POINT_NOTE);
const tableau = () =>
  line(
    "TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 MA DISJONCTEURS 2A DISJONCTEURS 10A DISJONCTEURS 16A DISJONCTEURS 20A DISJONCTEURS 32A CONTACTEUR J/N FILS BARETTE MONTAGE",
    "1,000",
    "U",
    "C",
    "Tableau composé : nombre de disjoncteurs par calibre NON écrit. Impossible à commander sans le schéma.",
  );
const terre = (): BenchLine[] => [
  line("PRISE DE TERRE", "1,000", "U", "D", "Piquet / câble de terre : composition à préciser."),
  line("BARETTE DE TERRE", "1,000", "U", "D"),
  line("LIAISON EQUIPOTENTIEL", "1,000", "U", "C", "Câble 6 mm² + connecteurs : longueur inconnue."),
  line("MESURE DE LA VALEUR DE LA PRISE DE TERRE", "1,000", "U", "L"),
];
const raw = (designation: string, qty: string | null, unit: string | null, truth: Truth, note?: string) => line(designation, qty, unit, truth, note);

export const MORELLEC_LINES: BenchLine[] = [
  raw("POSE D'UNE PRISE DE CHANTIER", "1,000", null, "L"),
  raw("PLAN ELECTRIQUE", "1,000", null, "L"),
  raw("PERCEMENT / CREATION DE PASSAGE / RACCORDS CIMENT / TRAVAUX ELECTRICITE", "1,000", null, "LI"),
  // N°1 TYPE T3 — CUISINE/SEJOUR
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "2,000"),
  pt("ALIMENTATION HOTTE", "1,000"),
  pt("PRISE DE COURANT 16A+T", "8,000"),
  pt("PRISE FOUR", "1,000"),
  pt("PRISE PLAQUE", "1,000"),
  pt("PRISE LAVE-VAISSELLE", "1,000"),
  pt("PRISE REFRIGERATEUR", "1,000"),
  pt("PRISE RJ45", "1,000"),
  pt("PRISE TV", "1,000"),
  // DEGAGEMENT
  pt("VA ET VIENT 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  // CHAMBRE 1
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE RJ45", "1,000"),
  // CHAMBRE 2
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE RJ45", "1,000"),
  // WC
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  // SALLE DE BAINS
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "2,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  tableau(),
  ...terre(),
  // N°2 TYPE T3 — CHAMBRE 1
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE RJ45", "1,000"),
  // CHAMBRE 2
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE RJ45", "1,000"),
  // DEGAGEMENT A
  pt("VA ET VIENT 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  // SALLE DE BAINS
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "2,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  pt("PRISE MACHINE A LAVER", "1,000"),
  pt("PRISE SECHE-LINGE", "1,000"),
  // SALON/SEJOUR
  pt("VA ET VIENT 1 POINT LUMINEUX", "1,000"),
  pt("LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "5,000"),
  pt("PRISE RJ45", "1,000"),
  pt("PRISE TV", "1,000"),
  // WC
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  // CUISINE
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("ALIMENTATION HOTTE", "1,000"),
  pt("PRISE DE COURANT 16A+T", "6,000"),
  pt("PRISE FOUR", "1,000"),
  pt("PRISE PLAQUE", "1,000"),
  pt("PRISE LAVE-VAISSELLE", "1,000"),
  pt("PRISE REFRIGERATEUR", "1,000"),
  tableau(),
  ...terre(),
  // N°3 TYPE T2 BIS — CUISINE/SEJOUR
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "2,000"),
  pt("ALIMENTATION HOTTE", "1,000"),
  pt("PRISE DE COURANT 16A+T", "6,000"),
  pt("PRISE FOUR", "1,000"),
  pt("PRISE PLAQUE", "1,000"),
  pt("PRISE REFRIGERATEUR", "1,000"),
  // CHAMBRE 1
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE TV", "1,000"),
  pt("PRISE RJ45", "1,000"),
  // MEZZANINE
  pt("VA ET VIENT 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  // SALLE DE BAINS
  pt("LAMPLE SIMPLE 1 POINT LUMINEUX", "2,000"),
  pt("PRISE DE COURANT 16A+T", "1,000"),
  pt("PRISE MACHINE A LAVER", "1,000"),
  pt("ALIMENTATION CHAUFFE-EAU", "1,000"),
  tableau(),
  ...terre(),
  // N°4 TYPE T2 BIS — BAINS
  pt("LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE MACHINE A LAVER", "1,000"),
  pt("PRISE SECHE-LINGE", "1,000"),
  pt("ALIMENTATION CHAUFFE-EAU", "1,000"),
  // CHAMBRE 1
  pt("LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "3,000"),
  pt("PRISE RJ45", "1,000"),
  // CUISINE/SEJOUR
  pt("VA ET VIENT 1 POINT LUMINEUX", "1,000"),
  pt("LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("ALIMENTATION HOTTE", "1,000"),
  pt("PRISE DE COURANT 16A+T", "6,000"),
  pt("PRISE FOUR", "1,000"),
  pt("PRISE PLAQUE", "1,000"),
  pt("PRISE LAVE-VAISSELLE", "1,000"),
  pt("PRISE REFRIGERATEUR", "1,000"),
  pt("PRISE RJ45", "1,000"),
  pt("PRISE TV", "1,000"),
  // MEZZANINE
  pt("LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"),
  pt("PRISE DE COURANT 16A+T", "2,000"),
  pt("PRISE RJ45", "1,000"),
  tableau(),
  ...terre(),
  // COMMUN
  raw("TELERUPTEUR SUR MINUTERIE", "1,000", "U", "C", "Télérupteur/minuterie + boutons poussoirs + câblage : composition non écrite."),
  pt("PRISE DE COURANT 16A+T", "2,000"),
  tableau(),
  ...terre(),
  // TRAVAUX ADMINISTRATIF
  raw("DEMANDE DE CONSUEL", "5,000", "U", "L"),
  raw("FORMATION UTILISATEUR", "1,000", "U", "L"),
  raw("COFFRET DE COM SEMI-ÉQU. 4XRJ45/TV GR2 TN405", "4,000", "U", "D"),
  raw("CONNECTEUR RJ45", "12,000", "U", "D"),
  raw("INSTALLATION ET MISE EN SERVICE DU COFFRET DE COMMUNICATION", "4,000", "U", "L"),
  // DEVIS RADIATEURS ELECTRIQUE
  raw("ALIMENTATION RADIATEUR", "17,000", null, "C", "Point d'alimentation (sortie de câble) : câble et boîtes, longueur inconnue."),
  raw("RADIATEUR ELECTRIQUE ATOLL 750W", "5,000", null, "D"),
  raw("RADIATEUR ELECTRIQUE ATOLL 1000W", "8,000", null, "D"),
  raw("SECHE SERVIETTE 750W SDB ANCINETI", "4,000", null, "D"),
  // VMC HYGROREGLABLE ALDES
  raw("ALDES Kit BAHIA Optima MICROWATT HYGRO B", "4,000", null, "D"),
  raw("BOUCHE EXTRACTION BAINS", "4,000", "U", "D"),
  raw("BOUCHE EXTRACTION WC", "3,000", "U", "D"),
  raw("BOUCHE EXTRACTION CUISINE", "4,000", "U", "D"),
  raw("BOUCHE ENTREE D'AIR ENTREE D'AIR HYGRO 6/45 CLAS 30", "8,000", "U", "D"),
  raw("MANCHON REGLABE LG 100MM HYGRO", "8,000", "U", "D"),
  raw("RESEAU DE GAINE Y COMPRIS SUPPORT", "4,000", "U", "C", "Réseau par logement : longueurs de gaine inconnues."),
  raw("GAINE 0/80 SANITAIRE GAINE SOUPLE PVC DN80 ATLANTIC", "1,000", null, "C", "Longueur non écrite."),
  raw("GAINE 0/125 CUISINE GAINE SOUPLE PVC DN 125 ATLANTIC", "1,000", null, "C", "Longueur non écrite."),
  raw("CHAPEAU PREVU PAR LE COUVREUR", null, null, "I", "Fourni par un autre lot."),
  raw("POSE, MISE EN SERVICE ET PERCEMENT", "4,000", "U", "L"),
  // TRAVAUX SANITAIRE — SALLE D'EAU
  raw("ROBINET M.A.L SANS RACCORD 1/2-3/4", "4,000", null, "D"),
  raw("SIPHON M.A.L", "4,000", null, "D"),
  raw("VANNE D'ARRET GENERAL", "4,000", null, "D"),
  raw("ROBINET DE PUISAGE NIVEAU 0", "0,400", null, "D", "PIÈGE : « 0,400 » (probablement 1 robinet, prix 45 € × 0,4) : à vérifier."),
  // CUISINE
  raw("ROBINET LAVE VAISSELLE SANS RACCORD 1/2-3/4", "4,000", null, "D"),
  raw("SIPHON LAVE VAISSELLE SORTIE VERTICALE", "4,000", null, "D"),
  raw(
    "Alimentation Eau froide, Eau chaude pour évier en attente pour cuisiniste (non prévu raccordement de l'évier, travaux à la charge du cuisiniste)",
    "4,000",
    null,
    "C",
    "Alimentations en attente : tube + raccords, longueurs inconnues.",
  ),
  // ESPACE WC INDEPENDANT NIVEAU 0
  raw("ENSEMBLE SUSPENDU ANCOFLASH", "4,000", "U", "D"),
  raw("PLAQUE DOUBLE TOUCHE RONDO BLANC 100104506 PORCELANOSA", "4,000", "U", "D"),
  // ESPACE MEUBLE SDE NIVEAU 0
  raw("MEUBLE 60 AVEC MITIGEUR ET MIROIR", "4,000", null, "D"),
  // ESPACE DOUCHE SDE NIVEAU 2
  raw("RECEVEUR DOUCHE120*80 CM PORCELANOSA BLANC 100286768", "4,000", "U", "D"),
  raw("VALVULA HOR 80MM PLATO DUCHA STONE", "4,000", "U", "D", "Bonde de douche (libellé espagnol du fabricant)."),
  raw("THERMOSTATIQUE ET BARRE DE DOUCHE", "4,000", "U", "D"),
  raw("PAROI A DEFINIR", "1,000", "U", "D", "Produit non défini : question réelle."),
  // CHAUFFE EAU ELECTRIQUE
  raw("MALICIO 80 LITRES", "2,000", "U", "D"),
  raw("MALICIO 65 LITRES", "2,000", "U", "D"),
  raw("GROUPE DE SECURITE AVEC SOUPAPE 10 BARS, VANNE D'ARRET, CLAPET ANTI-RETOUR ET MANOMETRE", "4,000", "U", "D"),
  raw("SIPHON DE GROUPE", "4,000", "U", "D"),
  raw("RACCORDS DIELECTRIQUE MF 3/4F", "4,000", "U", "D"),
  raw("REDUCTEUR DE PRESSION", "4,000", "U", "D"),
  raw("RACCORDS CUIVRE Y COMPRIS SOUDURE", "4,000", "U", "X", "Lot de raccords par logement : composition non écrite."),
  // CANALISATION
  raw("Distribution eau froide et eau chaude en Tuyaux PE, dans la dalle.", "340,000", null, "D", "Unité absente (mètres implicites) ; diamètres sur les 2 lignes suivantes (10×12 et 13×16) sans répartition."),
  raw("TUBE PER PRE GAINE 10X12 BLEU", "1,000", null, "C", "Quantité « 1 » = sous-détail de la ligne précédente, pas 1 mètre."),
  raw("TUBE PER PRE GAINE 13X16 BLEU", "1,000", null, "C", "Idem."),
  raw("plaque SERTIFIX DOUCHE", "1,000", null, "D"),
  raw("RACCORDS PE, RACCORDS MULTICOUCHE CUIVRE, OXYGENE, ACETYLENE, SOUDURES", "4,000", null, "X", "Forfait sans liste ni quantités."),
  // EVACUATION
  raw("TUBE PVC EVACUATION D 100 NF", "40,000", "ML", "D", "40 ml → barres (longueur vendue à documenter)."),
  raw("CULOTTE PVC 87°30 MF SIMPLE 100", "6,000", null, "D"),
  raw("COUDE PVC 45° FF 100", "6,000", null, "D"),
  raw("COLLIER PVC 100", "40,000", null, "D"),
  raw("TAMPON REDUCTION PVC MF 100.40", "24,000", null, "D"),
  raw("RACCORDS 0/40, COLLES", "4,000", null, "X", "Forfait sans liste ni quantités."),
  raw("FIXATION INOX WC BIDET 6X70 X2, et Manchon de raccordement", "4,000", null, "D", "« X2 » : 2 fixations par lot ?"),
  raw("DIVERS PLATRE, CIMENT", "4,000", null, "X"),
];

/** Titres et mentions du document (information, pas des lignes). */
export const MORELLEC_CONTEXT = [
  "DEVIS ELECTRICITE — installation monophasée 220 V, conforme NF C 15-100",
  "APPAREILLAGE HAGER ESSENSYA (marque et gamme de toutes les prises et commandes)",
  "N°1 TYPE T3 / N°2 TYPE T3 / N°3 TYPE T2 BIS / N°4 TYPE T2 BIS / COMMUN (4 logements)",
  "Pièces : CUISINE/SEJOUR, DEGAGEMENT, CHAMBRE 1, CHAMBRE 2, WC, SALLE DE BAINS, MEZZANINE…",
  "VMC HYGROREGLABLE ALDES (marque de toute la ventilation)",
];
