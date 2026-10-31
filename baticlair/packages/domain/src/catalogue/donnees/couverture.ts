import { croiser, produit, type ArticleCatalogue, type Fiche } from "../catalogue.js";

/**
 * COUVERTURE (relecture de Greg en premier). Désignations génériques, sans marque ; formats et qualités usuels du comptoir.
 * Ardoises : format × origine et choix ; tuiles : par modèle (le négoce propose la marque) ; accessoires à l'unité.
 */
const M = "couverture" as const;
const ARDOISES = ["32×22", "35×25", "40×22", "40×25", "45×30", "50×25", "30×20", "27×18", "22×32 trapézoïdale"];
const CHOIX = ["Espagne 1er choix", "Espagne 2e choix", "Angers (France) 1er choix", "Pays de Galles 1er choix", "Brésil 1er choix"];

/**
 * LE CATALOGUE MÉTIER, COUVERTURE D'ABORD (Greg, 31 octobre 2026 : « une base fiable plutôt qu'un catalogue immense et
 * imprécis »). Seules des sources vérifiées : le référentiel du fondateur (`docs/referentiel-couverture.md`) et les fiches
 * des fabricants. Aucune référence inventée ; un coloris non publié par le fabricant n'est pas listé (l'artisan le précise).
 */
const REFERENTIEL = (section: string) => ({ libelle: `Référentiel couverture du fondateur, ${section}`, verifieLe: "2026-10-31" });
const EDILIANS_H14 = { libelle: "Fiche H 14 Huguenot, réf. 204 (Edilians)", url: "https://edilians.eu/h-14-huguenot.html", verifieLe: "2026-10-31" };
const EDILIANS_HP10 = { libelle: "Documentation HP 10 Huguenot, réf. 205 (Edilians)", url: "https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_19042024_bd.pdf", verifieLe: "2026-10-01" };
const EDILIANS_CANAL = { libelle: "Tuiles canal Poudenx (Edilians)", url: "https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf", verifieLe: "2026-10-04" };
/** Les sections de liteau du référentiel : §200 (tuile 27×40, ardoise 18×40 et 27×27) et §760 (selon l'entraxe des chevrons). */
const SECTIONS_LITEAU = ["18×40", "14×40", "27×40", "14×50", "18×50", "18×75", "25×50", "27×27"];
/**
 * Une tuile Edilians : sans coloris précisé, puis ses coloris publiés sur sa fiche produit avec leur EAN (relevés le
 * 31 octobre 2026, voir `couverture-fabricants.ts`).
 */
const tuileEdilians = (nom: string, reference: string, source: typeof EDILIANS_H14, synonymes: readonly string[], page?: string, coloris: readonly (readonly [string, string])[] = []) => {
  const ean = new Map(coloris);
  return produit(M, "Tuiles terre cuite", nom, "pièces", [null, ...coloris.map(([c]) => c)], {
    synonymes,
    designation: (v) => `${nom}, réf. ${reference} (Edilians)${v ? ` ${v}` : ""}`,
    fiche: (v): Fiche =>
      v && page ? { marque: "Edilians", reference, ...(ean.get(v) ? { ean: ean.get(v)! } : {}), statut: "verifie", source: { libelle: `Fiche ${nom} (Edilians)`, url: page, verifieLe: "2026-10-31" } } : { marque: "Edilians", reference, statut: "verifie", source },
  });
};

export const COUVERTURE: readonly ArticleCatalogue[] = [
  // Ardoises
  ...produit(M, "Ardoises", "Ardoise naturelle", "pièces", croiser(ARDOISES, CHOIX), { synonymes: ["ardoise", "ardoises", "schiste", "ardoise naturelle"] }),
  ...produit(M, "Ardoises", "Ardoise fibres-ciment", "pièces", croiser(["60×30", "40×40", "40×24", "60×40"], ["gris ardoise", "noir bleuté"]), { synonymes: ["ardoise synthétique", "ardoise fibro", "fibro ciment", "eternit"] }),
  ...produit(M, "Ardoises", "Ardoise de faîtage (lignolet)", "pièces", ["Espagne", "Angers (France)"], { synonymes: ["lignolet", "faîtage ardoise"] }),
  // Tuiles terre cuite : les modèles vérifiés chez le fabricant d'abord (Edilians), puis les désignations génériques.
  ...tuileEdilians("Tuile H 14 Huguenot", "204", EDILIANS_H14, ["h14", "h 14", "huguenot", "grand moule faiblement galbee"], "https://edilians.com/h-14-huguenot.html", [["Flammé Rustique", "3661223030822"], ["Rouge", "3661223024425"], ["Vieilli Masse", "3661223069723"]]),
  ...tuileEdilians("Tuile HP 10 Huguenot", "205", EDILIANS_HP10, ["hp10", "hp 10", "huguenot"], "https://edilians.com/hp-10-huguenot.html", [["Ardoisé", "3661223312263"], ["Flammé Rustique", "3661223022551"], ["Argentique", "3661223165999"], ["Gris Quartz", "3661223312270"], ["Rouge", "3661223311839"], ["Vieilli Masse", "3661223314571"]]),
  ...tuileEdilians("Tuile canal 50 Poudenx", "414 / 454", EDILIANS_CANAL, ["canal 50", "poudenx"], "https://edilians.com/canal-50-poudenx.html", [["Bastide", "3661223302523"], ["Littoral Flammé", "3661223303681"], ["Brun", "3661223307672"], ["Paysage", "3661223303032"], ["Ancien", "3661223302417"], ["Vieux Toits", "3661223303971"], ["Pastel", "3661223307689"], ["Emporda", "3661223302462"], ["Rose", "3661223307665"], ["Rouergue", "3661223303551"], ["Rouge", "3661223302431"], ["Terroir", "3661223302486"], ["Tradition", "3661223302509"]]),
  ...tuileEdilians("Tuile Canal Gironde 50 Poudenx", "406 / 456", EDILIANS_CANAL, ["canal gironde", "gironde 50", "poudenx"], "https://edilians.com/canal-gironde-50-poudenx.html", [["Paysage", "3661223049923"], ["Gabarre", "3661223339734"], ["Pastel", "3661223049947"], ["Réthaise", "3661223265507"], ["Rose", "3661223049909"], ["Rouge", "3661223049886"], ["Saintonge", "3661223049985"]]),
  ...tuileEdilians("Tuile Canal Gironde à blocage Poudenx", "409 / 459", EDILIANS_CANAL, ["gironde a blocage", "poudenx"], "https://edilians.com/canal-gironde-a-blocage.html", [["Saintonge", "3661223170252"]]),
  ...tuileEdilians("Tuile Canal Lyonnaise 40 Poudenx", "401 / 451", EDILIANS_CANAL, ["canal lyonnaise", "lyonnaise 40", "poudenx"], "https://edilians.com/canal-lyonnaise-40-poudenx.html", [["Rouge", "3661223029932"], ["Vieux Toits", "3661223029406"]]),
  ...tuileEdilians("Tuile Canal Charentaise Poudenx", "405 / 455", EDILIANS_CANAL, ["canal charentaise", "charentaise", "poudenx"], "https://edilians.com/canal-charentaise-poudenx.html", [["Gabarre", "3661223339932"], ["Paysage", "3661223033069"], ["Rouge", "3661223032239"], ["Saintonge", "3661223030129"]]),
  ...tuileEdilians("Tuile Canal Charentaise à blocage Poudenx", "410 / 460", EDILIANS_CANAL, ["charentaise a blocage", "poudenx"], "https://edilians.com/canal-charentaise-a-blocage.html", [["Paysage", "3661223186475"]]),
  ...produit(M, "Tuiles terre cuite", "Tuile mécanique à emboîtement petit moule", "pièces", ["rouge", "rouge vieilli", "brun", "ardoisé", "sablé"], { synonymes: ["tuile mécanique", "tuile emboîtement", "petit moule"] }),
  ...produit(M, "Tuiles terre cuite", "Tuile mécanique à emboîtement grand moule", "pièces", ["rouge", "rouge vieilli", "brun", "ardoisé", "sablé"], { synonymes: ["tuile mécanique", "grand moule", "tuile 10 au m²"] }),
  ...produit(M, "Tuiles terre cuite", "Tuile plate", "pièces", croiser(["17×27", "16×24"], ["rouge", "brun vieilli", "ardoisé"]), { synonymes: ["tuile plate", "petite tuile"] }),
  ...produit(M, "Tuiles terre cuite", "Tuile canal", "pièces", ["40 cm rouge", "40 cm vieilli", "50 cm rouge", "50 cm vieilli"], { synonymes: ["tuile ronde", "tige de botte", "tuile romaine"] }),
  ...produit(M, "Tuiles terre cuite", "Tuile romane", "pièces", ["rouge", "vieilli", "brun"], { synonymes: ["romane canal", "tuile du sud"] }),
  ...produit(M, "Tuiles terre cuite", "Tuile losangée", "pièces", ["rouge", "vieilli"], { synonymes: ["losangée"] }),
  // Tuiles béton
  ...produit(M, "Tuiles béton", "Tuile béton à emboîtement", "pièces", ["rouge", "brun", "ardoisé", "anthracite"], { synonymes: ["tuile ciment", "tuile beton"] }),
  ...produit(M, "Tuiles béton", "Tuile béton plate", "pièces", ["ardoisé", "anthracite", "brun"], {}),
  // Accessoires de tuiles
  ...produit(M, "Accessoires de tuiles", "Faîtière à emboîtement", "pièces", ["rouge", "rouge vieilli", "brun", "ardoisé"], { synonymes: ["faitiere", "faîtage", "faitage", "tuile faîtière"] }),
  ...produit(M, "Accessoires de tuiles", "Faîtière demi-ronde à sec", "pièces", ["rouge", "vieilli", "ardoisé"], { synonymes: ["faitiere ronde", "faîtage"] }),
  ...produit(M, "Accessoires de tuiles", "Arêtier", "pièces", ["rouge", "vieilli", "ardoisé"], { synonymes: ["aretier", "arêtière", "aretiere"] }),
  ...produit(M, "Accessoires de tuiles", "Rive à rabat", "pièces", ["gauche rouge", "droite rouge", "gauche ardoisé", "droite ardoisé"], { synonymes: ["tuile de rive", "rive"] }),
  ...produit(M, "Accessoires de tuiles", "Fronton de faîtière", "pièces", ["rouge", "ardoisé"], { synonymes: ["about de faîtage", "fronton"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile chatière", "pièces", ["rouge", "ardoisé"], { synonymes: ["chatiere", "ventilation", "tuile de ventilation"] }),
  ...produit(M, "Accessoires de tuiles", "Tuile à douille", "pièces", ["Ø100 rouge", "Ø125 rouge", "Ø100 ardoisé", "Ø125 ardoisé"], { synonymes: ["sortie de toit", "douille", "tuile douille"] }),
  ...produit(M, "Accessoires de tuiles", "Demi-tuile", "pièces", ["rouge", "ardoisé"], {}),
  ...produit(M, "Accessoires de tuiles", "Tuile de verre", "pièces", ["mécanique", "plate"], { synonymes: ["tuile verre", "tuile transparente"] }),
  // Bacs et plaques
  ...produit(M, "Bacs et plaques", "Bac acier nervuré", "m²", croiser(["0,63 mm", "0,75 mm"], ["galvanisé", "RAL 7016 anthracite", "RAL 8012 brun", "RAL 9006 alu"]), { synonymes: ["bac acier", "tole", "tôle", "bac nervuré", "tole bac"] }),
  ...produit(M, "Bacs et plaques", "Bac acier anticondensation", "m²", ["RAL 7016 anthracite", "RAL 8012 brun", "galvanisé"], { synonymes: ["bac feutre", "anti condensation", "anti-goutte"] }),
  ...produit(M, "Bacs et plaques", "Panneau sandwich couverture", "m²", ["40 mm", "60 mm", "80 mm", "100 mm"], { synonymes: ["panneau isolant", "sandwich"] }),
  ...produit(M, "Bacs et plaques", "Plaque fibres-ciment ondulée", "pièces", ["2,50 m", "2,00 m", "1,52 m"], { synonymes: ["fibro", "plaque ondulée", "ondulé"] }),
  ...produit(M, "Bacs et plaques", "Plaque polycarbonate ondulée", "pièces", ["2,00 m", "3,00 m"], { synonymes: ["polycarbonate", "plaque transparente", "translucide"] }),
  ...produit(M, "Bacs et plaques", "Plaque bitumée ondulée", "pièces", ["noir", "rouge", "vert"], { synonymes: ["plaque bitume", "onduline"] }),
  // Écrans
  ...produit(M, "Écrans et pare-vapeur", "Écran sous-toiture HPV", "rouleaux", ["rouleau 1,50 × 50 m (75 m²)", "rouleau 1,50 × 25 m (37,5 m²)"], { synonymes: ["ecran", "pare pluie", "pare-pluie", "sous toiture", "hpv"] }),
  ...produit(M, "Écrans et pare-vapeur", "Écran sous-toiture réfléchissant", "rouleaux", ["rouleau 1,50 × 25 m"], { synonymes: ["ecran reflechissant"] }),
  ...produit(M, "Écrans et pare-vapeur", "Pare-vapeur", "rouleaux", ["rouleau 1,50 × 50 m", "rouleau 2,00 × 50 m"], { synonymes: ["frein vapeur", "membrane"] }),
  ...produit(M, "Écrans et pare-vapeur", "Adhésif pour écran", "rouleaux", ["60 mm × 25 m"], { synonymes: ["scotch ecran", "ruban adhesif"] }),
  // Bois de couverture : les sections du référentiel du fondateur d'abord (§200, §760).
  ...produit(M, "Bois de couverture", "Liteau", "m", croiser(SECTIONS_LITEAU, ["sapin traité classe 2"]), { synonymes: ["latte", "liteaux", "lattes", "litonnage"], fiche: { statut: "generique", source: REFERENTIEL("§200 et §760") } }),
  ...produit(M, "Bois de couverture", "Liteau", "m", croiser(["27×38", "25×38", "30×40", "38×38", "18×38"], ["sapin traité classe 2", "sapin non traité"]), { synonymes: ["latte", "liteaux", "lattes", "litonnage"] }),
  ...produit(M, "Bois de couverture", "Contre-latte", "m", croiser(["27×38", "38×38", "40×40"], ["traité classe 2"]), { synonymes: ["contre liteau", "contre lattage", "contre-liteau", "contrelatte"] }),
  ...produit(M, "Bois de couverture", "Volige", "m²", croiser(["18×100", "18×120", "18×150", "22×100", "27×150"], ["sapin brut", "peuplier brut", "sapin traité"]), { synonymes: ["voliges", "voligeage", "planche de couverture"] }),
  ...produit(M, "Bois de couverture", "Chanlatte", "m", ["traité classe 2"], { synonymes: ["chanlate", "tringle d'égout"] }),
  // Fixations
  ...produit(M, "Fixations", "Crochet d'ardoise inox", "boîtes de 1000", ["à pointe 80 mm", "à pointe 100 mm", "à pointe 110 mm", "à agrafe 80 mm", "à agrafe 100 mm"], { synonymes: ["crochet", "crochets ardoise", "crochet inox", "agrafe"] }),
  ...produit(M, "Fixations", "Crochet d'ardoise inox teinté noir", "boîtes de 1000", ["à pointe 80 mm", "à pointe 100 mm"], { synonymes: ["crochet noir", "crochet teinté"] }),
  ...produit(M, "Fixations", "Clou d'ardoisier cuivre", "kg", ["2,7 × 30 mm"], { synonymes: ["clou cuivre", "clous ardoise"] }),
  ...produit(M, "Fixations", "Pointe tête plate galvanisée", "kg", ["2,5 × 50 mm", "2,8 × 60 mm", "3,1 × 70 mm"], { synonymes: ["pointe", "clou", "clous"] }),
  ...produit(M, "Fixations", "Pointe annelée inox", "kg", ["2,5 × 40 mm", "2,8 × 50 mm"], { synonymes: ["pointe crantée", "clou annelé"] }),
  ...produit(M, "Fixations", "Crochet de tuile", "boîtes de 250", ["à rabat", "à pince"], { synonymes: ["crochet tuile", "anti-tempête"] }),
  ...produit(M, "Fixations", "Vis autoperceuse bac acier", "boîtes de 100", croiser(["6,3 × 25", "6,3 × 70", "6,3 × 110"], ["avec rondelle EPDM"]), { synonymes: ["vis bac", "vis tole", "autoforeuse"] }),
  ...produit(M, "Fixations", "Cavalier pour bac acier", "pièces", ["galvanisé", "laqué"], { synonymes: ["cavalier"] }),
  // Faîtage et ventilation
  ...produit(M, "Faîtage et ventilation", "Closoir ventilé souple", "rouleaux", ["rouleau 5 m largeur 310 mm", "rouleau 5 m largeur 390 mm"], { synonymes: ["closoir", "rouleau faitage", "faîtage sec"] }),
  ...produit(M, "Faîtage et ventilation", "Closoir mousse pour bac", "pièces", ["haut", "bas"], { synonymes: ["closoir mousse"] }),
  ...produit(M, "Faîtage et ventilation", "Peigne d'égout", "m", ["PVC noir", "PVC rouge"], { synonymes: ["peigne", "grille anti-oiseaux", "closoir d'égout"] }),
  ...produit(M, "Faîtage et ventilation", "Support de faîtage (porte-panne)", "pièces", ["réglable"], { synonymes: ["support lisse faitage", "porte panne"] }),
  ...produit(M, "Faîtage et ventilation", "Lisse de faîtage", "m", ["40×40 traité"], { synonymes: ["lisse faitage"] }),
  // Étanchéité des points singuliers
  ...produit(M, "Étanchéité", "Bande d'étanchéité plombée", "rouleaux", croiser(["300 mm", "450 mm"], ["rouleau 5 m"]), { synonymes: ["bande plomb", "bande alu plombée", "solin souple", "wakaflex"] }),
  ...produit(M, "Étanchéité", "Plomb laminé", "rouleaux", croiser(["1,5 mm", "2 mm"], ["largeur 300 mm", "largeur 500 mm"]), { synonymes: ["plomb", "feuille de plomb"] }),
  ...produit(M, "Étanchéité", "Mastic d'étanchéité toiture", "cartouches", ["310 ml"], { synonymes: ["mastic", "colle mastic", "silicone toiture"] }),
  ...produit(M, "Étanchéité", "Mortier de solin", "sacs", ["25 kg"], { synonymes: ["mortier solin", "solin"] }),
  // Fenêtres de toit (génériques)
  ...produit(M, "Fenêtres de toit", "Fenêtre de toit à rotation", "pièces", ["55×78", "66×98", "78×98", "78×118", "78×140", "114×118"], { synonymes: ["velux", "fenetre de toit", "chassis de toit", "vasistas"] }),
  ...produit(M, "Fenêtres de toit", "Raccord d'étanchéité fenêtre de toit", "pièces", croiser(["55×78", "66×98", "78×98", "78×118", "114×118"], ["tuiles", "ardoises"]), { synonymes: ["raccord velux", "raccord fenetre"] }),
  ...produit(M, "Fenêtres de toit", "Châssis de toit tabatière", "pièces", ["45×55", "45×73"], { synonymes: ["tabatiere", "chassis tabatière"] }),
  // Sécurité
  ...produit(M, "Sécurité et accès", "Crochet de sécurité", "pièces", ["ardoise", "tuile"], { synonymes: ["crochet securite", "point d'ancrage"] }),
  ...produit(M, "Sécurité et accès", "Crochet d'échelle de couvreur", "pièces", ["galvanisé"], { synonymes: ["crochet échelle", "échelle de toit"] }),
  ...produit(M, "Sécurité et accès", "Échelle de couvreur", "pièces", ["2 m", "3 m", "4 m"], { synonymes: ["echelle de toit", "echelle plate"] }),
  ...produit(M, "Sécurité et accès", "Arrêt de neige", "pièces", ["tuile", "ardoise"], { synonymes: ["crochet arret neige", "barre a neige"] }),
];
