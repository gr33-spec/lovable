import { line, resetLines, type BenchLine } from "./truth.js";

/**
 * Devis réel de plâtrerie-isolation (rénovation d'un bâtiment en logements,
 * 2022), d'une entreprise de plaquiste. Fourni par le fondateur le
 * 2026-10-01. ANONYMISÉ : désignation, quantité, unité. Les titres de
 * section du devis (« Doublage isolant », « Cloison SAD »…) ne sont pas des
 * lignes : ils sont gardés dans SECTIONS, comme information du document.
 */
resetLines();
export const LEZARDRIEUX_LINES: BenchLine[] = [
  line(
    "Doublage Placostil en BA13 sur ossature métallique 48mm double, y compris traitement des joints. Ensemble des doublages sur murs extérieurs, y compris ébrasements.",
    "776,100",
    "M2",
    "C",
    "Ouvrage composé : plaques BA13, rails, montants 48, vis, bandes, enduit. 776 m² de mur ≠ 776 m² à commander.",
  ),
  line(
    "Mise en place d'une isolation thermique en doublages Typologie du chantier : Isolation thermique des murs par l'intérieur Fixé mécaniquement par ossature métallique Finition cité sur la ligne ci dessus 120 mm GR32 revêtu kraft de chez ISOVER ACERMI N°02/018/408 permettant un coefficient R=3.75m²K/W. La résistance thermique est évaluée selon la norme NF EN 12677",
    "776,100",
    "M2",
    "C",
    "Laine GR32 120 mm Isover : m² → rouleaux/panneaux (m² par colis).",
  ),
  line("Plus value PPM pour pièces humides.", "108,150", "M2", "C", "Remplace une partie des BA13 de la ligne 1 par des plaques hydrofuges (PPM) : à rattacher."),
  line(
    "Doublage Placostil en BA13 sur ossature métallique 48mm double, y compris traitement des joints. Ensemble des doublages intérieurs.",
    "38,100",
    "M2",
    "C",
  ),
  line("BA13 collée sur murs avec colle MAP de chez PLACO, y compris traitement des joints.", "66,900", "M2", "C", "Plaques + colle MAP (sacs) + bandes + enduit."),
  line("Plus value PPM pour pièces humides.", "27,400", "M2", "C", "Modifie la ligne précédente."),
  line(
    "Cloison séparative d'appartements SAD120 duo'tech 25. Cloison EI60, 61dB, ossature métallique en M48 et R70, parement duo'tech 25 vissées sur les montants constituant chaque parement. Y compris fourniture et pose de laine de verre acoustique de 70mm et façon de joint.",
    "82,800",
    "M2",
    "C",
  ),
  line("Plus value PPM pour pièces humides.", "40,800", "M2", "C", "Modifie la ligne précédente."),
  line(
    "Cloison de distribution 72/48. Ensemble des cloisons cotées 7 cm sur plans. Cloisons Placostil avec un parement de BA13 de chaque côté, sur ossature rails, et montants doublés y compris traitement des joints.",
    "390,200",
    "M2",
    "C",
    "2 faces de BA13 : 780 m² de plaques pour 390 m² de cloison (avant chutes).",
  ),
  line("Plus value PPM pour pièces humides.", "116,500", "M2", "C", "Modifie la ligne précédente."),
  line(
    "Plafond Placostil en BA13 standard, sur fourrures F530 espacées tous les 50cm, y compris traitement des joints. Ensemble plafond droit sous plancher.",
    "390,000",
    "M2",
    "C",
    "Entraxe des fourrures écrit (50 cm) : ml de F530 calculables avec la règle Placo.",
  ),
  line(
    "Plafond Placostil en BA13 standard, sur fourrures F530 espacées tous les 50cm, y compris traitement des joints. Ensemble plafond rampants.",
    "314,230",
    "M2",
    "C",
  ),
  line(
    "Mise en place d'une isolation des combles aménagés sous rampant Typologie du chantier : Combles aménagées Fixé mécaniquement par ossature métallique Finition cité sur la ligne ci dessus 260mm d'isoconfort35 Revêtu kraft de chez ISOVER ACERMI N°02/018/408 permettant un coefficient R=7.40m²K/W. La résistance thermique est évaluée selon la norme NF EN 12677",
    "314,230",
    "M2",
    "C",
  ),
  line("Plus-value BA13 hydrofuge.", "22,400", "M2", "C", "Modifie la ligne de plafond rampant."),
  line("Jouées des lucarnes", "6,000", "U", "C", "Dimensions des jouées inconnues : impossible à quantifier sans plan."),
  line("Jouées des chassis de toit en BA13", "9,000", "U", "C", "Dimensions inconnues."),
  line(
    "Fourniture d'un bloc-porte EI30, pré-peint, dimension 83x204cm+joint isophonique 3 cotés, HUI 140, y compris béquillage. Portes d'accès aux logements posées dans les murs maçonnés ou dans les cloisons SAD.",
    "6,000",
    "U",
    "D",
  ),
  line("Fourniture d'un bloc-porte alvéolaire, pré-peint, dimension 73x204cm, HUI88, y compris béquillage.", "33,000", "U", "D"),
  line("Pose des portes dans murs intérieurs maçonnés", "7,000", "U", "L"),
  line("Fourniture d'une trappe isolée", "3,000", "U", "D", "Dimensions non précisées : question réelle."),
  line("Bande armée pour angles saillants.", "530,000", "ML", "C", "530 ml → rouleaux (longueur du rouleau à documenter)."),
  line("Pose des portes dans cloisons de distribution (fourniture par le lot menuiseries intérieures).", "30,000", "U", "L", "Fourniture par un autre lot : rien à commander."),
  line(
    "Renfort avec un parement en plaque de type HABITO hydrofuge de chez placo (ou équivalent) L'implantation des renforts se fera selon les plans transmis par mail par les lots techniques (sans plan de localisation des renforts, l'entreprise ne sera pas responsable de l'absence de renfort sur le chantier)",
    "20,000",
    "U",
    "C",
    "20 renforts : surface de plaque Habito par renfort inconnue.",
  ),
  line(
    "Prise en charge du chantier, approvisionnement EN CENTRE VILLE AVEC RETOURNEUR, et évacuation des gravats en centre de retraitement agréé.",
    "10,000",
    "ENS",
    "L",
  ),
  line(
    "CEE Prime versée sous forme de remise financée par Hellio Solutions (ex LEVEBVRE). Dans le cadre du dispositif des certificats d'énergie d'une valeur de ...... €TTC",
    "1,000",
    "F",
    "I",
  ),
];

/** Titres de section (information du document, pas des lignes). */
export const LEZARDRIEUX_SECTIONS = [
  "Doublage isolant",
  "Doublage technique",
  "BA13 collée",
  "Cloison SAD",
  "Cloison 72/48",
  "Plafond sous dalle",
  "Plafond rampant sous couverture",
  "Menuiseries intérieures",
  "Divers",
];
