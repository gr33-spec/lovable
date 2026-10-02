import { line, resetLines, type BenchLine } from "./truth.js";

/**
 * Devis client réel D-2026-011 : rénovation complète d'une salle de bain
 * (plomberie, carrelage, électricité, ventilation, peinture). Fourni par le
 * fondateur le 2026-10-01. ANONYMISÉ : désignation (titre + description),
 * quantité et unité seulement.
 */
resetLines();
export const D2026_011_LINES: BenchLine[] = [
  line("Dépose ancienne salle de bain - Dépose et évacuation des anciens équipements (hors baignoire), carrelage, faïence", "1", "unité", "L"),
  line("Dépose baignoire existante - Dépose et évacuation de l'ancienne baignoire", "1", "unité", "L"),
  line(
    "Receveur de douche à l'italienne extra-plat - Fourniture receveur de douche à l'italienne en résine aspect pierre, dimensions standards",
    "1",
    "unité",
    "D",
    "Dimensions non précisées (« standards ») : question réelle avant de commander.",
  ),
  line("Robinetterie de douche encastrée - Fourniture ensemble mitigeur thermostatique encastré avec douchette et tête de pluie", "1", "unité", "D"),
  line(
    "Installation douche à l'italienne - Pose du receveur, étanchéité, raccordements plomberie et installation robinetterie",
    "1",
    "unité",
    "LI",
    "« Étanchéité » : système d'étanchéité sous carrelage (kit) à acheter, non listé.",
  ),
  line(
    "Paroi de douche fixe vitrée - Fourniture paroi de douche en verre trempé sécurit 8mm, dimensions standards (ex: 90x200cm)",
    "1",
    "unité",
    "D",
    "Dimension donnée seulement en exemple : à confirmer.",
  ),
  line("Pose paroi de douche - Pose et fixation de la paroi de douche vitrée", "1", "unité", "L"),
  line(
    "Carrelage sol grès cérame 40x40 gris anthracite - Fourniture carrelage grès cérame 40x40 cm, coloris gris anthracite pour salle de bain",
    "9",
    "m²",
    "C",
    "9 m² de sol : à convertir en cartons (m² par carton) avec la marge de coupe.",
  ),
  line(
    "Pose carrelage sol avec joints noirs - Pose de carrelage au sol, y compris la préparation du support et réalisation des joints noirs",
    "9",
    "m²",
    "LI",
    "Colle et joint NOIR à acheter (couleur écrite ici seulement).",
  ),
  line(
    "Faïence murale salle de bain - Fourniture faïence murale blanche ou ton clair, format rectangulaire",
    "28",
    "m²",
    "C",
    "Coloris et format non arrêtés (« blanche ou ton clair », « rectangulaire ») : question réelle.",
  ),
  line(
    "Pose faïence murale - Pose de la faïence murale jusqu'au plafond (2.30m de hauteur), y compris préparation et joints",
    "28",
    "m²",
    "LI",
    "Colle et joints à acheter ; hauteur 2,30 m écrite ici.",
  ),
  line(
    "Meuble double vasque - Fourniture meuble de salle de bain suspendu avec double vasque intégrée et tiroirs, largeur 120cm",
    "1",
    "unité",
    "D",
  ),
  line(
    "Pose meuble double vasque et raccordements - Installation du meuble, fixation, raccordement eau chaude/froide et évacuations",
    "1",
    "unité",
    "LI",
    "Raccords, flexibles, siphon(s) à acheter, non listés.",
  ),
  line("Miroir salle de bain LED - Fourniture miroir de salle de bain avec éclairage LED intégré, dimensions adaptées", "1", "unité", "D", "Dimensions non précisées."),
  line("Pose miroir - Fixation du miroir au mur et raccordement électrique si LED", "1", "unité", "L"),
  line("Applique murale salle de bain - Fourniture applique murale design pour salle de bain, finition chromée", "1", "unité", "D"),
  line("Plafonnier LED salle de bain - Fourniture plafonnier LED étanche IP44, lumière blanche neutre", "1", "unité", "D"),
  line(
    "Spots LED encastrables pour douche (x3) - Fourniture de 3 spots LED encastrables IP65 pour zone douche",
    "1",
    "unité",
    "D",
    "PIÈGE : « 1 unité » = 3 spots. Commander 1 serait faux.",
  ),
  line(
    "Installation électrique et pose luminaires - Préparation des câblages, raccordements et pose des appliques, plafonnier et spots de douche",
    "1",
    "unité",
    "LI",
    "Câbles, gaines, boîtes à acheter, non listés.",
  ),
  line(
    "Réalisation niche de douche - Création d'une niche murale intégrée dans la douche, habillage carrelage",
    "1",
    "unité",
    "C",
    "Niche (prête à carreler ou plaques) + carrelage : dimensions inconnues.",
  ),
  line(
    "Fourniture sèche-serviette électrique Atlantic 750W - Fourniture d'un sèche-serviette électrique 750W de marque Atlantic pour salle de bain",
    "1",
    "unité",
    "D",
  ),
  line("Installation sèche-serviettes - Fixation du sèche-serviettes, raccordement électrique", "1", "unité", "L"),
  line(
    "VMC simple flux hygroréglable - Fourniture d'un système de Ventilation Mécanique Contrôlée simple flux hygroréglable adapté à la salle de bain",
    "1",
    "unité",
    "D",
  ),
  line(
    "Installation VMC - Mise en place de la bouche d'extraction, raccordement gaines et électrique de la VMC",
    "1",
    "unité",
    "LI",
    "Gaines et bouche à acheter si non comprises dans le kit.",
  ),
  line(
    "Ragréage du sol - Application d'une couche de ragréage fibré pour uniformiser et préparer le sol avant pose du carrelage",
    "9",
    "m²",
    "C",
    "Sacs de ragréage : consommation (kg/m²/mm) × épaisseur, épaisseur non écrite.",
  ),
  line(
    "Peinture plafond salle de bain - Fourniture peinture spéciale salle de bain (anti-humidité, anti-moisissure) pour plafond",
    "9",
    "m²",
    "C",
    "Litres = 9 m² × 2 couches (écrit sur la ligne suivante) ÷ rendement du produit.",
  ),
  line("Application peinture plafond - Préparation et application de deux couches de peinture sur le plafond", "9", "m²", "L", "Contient « deux couches », utile à la ligne précédente."),
];
