// Écrit le banc du calcul dans l'appli (baticlair/packages/domain/test/banc-couverture/) : pour chaque chantier,
// la lecture parfaite, les réponses du couvreur (par clé de question) et la liste juste.
// La liste juste = la liste du contrôleur, corrigée par l'arbitre, puis par les règles de Greg (21 novembre 2026) :
// un article non dit ne s'ajoute jamais d'office (la naissance de gouttière est une SUGGESTION, pas une ligne).
// Décisions de Greg du 21 novembre 2026 (après le premier rapport), qui passent avant le contrôleur :
//  2. tuiles à emboîtement : 5 % de casse ; 3. faîtières, arêtières, tuiles de rive : pas de 1 % en plus ;
//  4. bandes de zinc façonnées de 2 m : ml du devis ÷ 2, arrondi au-dessus, sans recouvrement ; 5. crochets d'ardoise en boîtes ;
//  6. tuiles de rive en deux lignes (gauches, droites), tuile canal en deux lignes (courants, couverts) ;
//  7. une équerre de gouttière ne retire rien ; 8. gouttière PVC ou alu : longueurs de 4 m sur le total ;
//  9. contre-liteaux : 5 % de chute comme les liteaux. Tuiles de rive : une par rang (longueur de rive ÷ pureau).
//  Un même article sorti par deux ouvrages est une seule ligne, avec le total (liteaux et contre-liteaux 27×40).
import fs from "node:fs";
import { decode } from "./moteur.mjs";
const OUT = "../baticlair/packages/domain/test/banc-couverture";
// [libellé, mots (tous présents dans le libellé du moteur ; « a|b » = l'un ou l'autre ; « !a » = absent), quantité (null = à chiffrer), unité, options]
// unités : n (un compte : pièces, longueurs, feuilles, tubes, plaques, bandes…), ml, m2, rl (rouleaux), bt (boîtes), sac.
const A = {
  // ARDOISES, règles de Greg du 21 novembre au soir : (surface + 0,66 m² par m d'arêtier + 0,50 m² par m de noue) × ardoises au
  // m², plus un rang (longueur ÷ largeur de l'ardoise) au faîtage et à l'égout (la gouttière écrite, sinon la réponse), puis 5 %.
  // C01 : (96 × 39,6 + 8 ÷ 0,22 + 16 ÷ 0,22) × 1,05 = 4 107. C05 : 7 771 (égout 20 m répondu, noues 7,2 m, faîtage 11 m).
  // C11 : 6 294 (arêtiers 30 m, noues 3 m, faîtage 4 m, gouttière 44 m). Crochets : un par ardoise, boîtes de 500.
  // C08, remaniage : aucune ardoise d'office ; le couvreur en demande 170.
  C01: [["Écran HPV", ["ecran"], 2, "rl"], ["Liteaux 18×40", ["liteau", "!contre"], 988, "ml"], ["Ardoises 32×22", ["ardoise", "!crochet"], 4107, "n"], ["Crochets d'ardoise", ["crochet", "!gouttiere"], 9, "bt"], ["Feuilles de zinc (faîtage)", ["feuille", "zinc"], 2, "n"], ["Gouttière de 25", ["gouttiere", "!crochet", "!naissance", "!talon"], 5, "n"], ["Tubes de descente Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 6, "n"], ["Dauphins fonte", ["dauphin"], 2, "n"]],
  // Greg, 21 novembre soir : faîtière sur HP 10 sans modèle écrit = demi-ronde, 2,5 au mètre (C02 : 8 m → 20 ; C12 : 9 m → 23).
  // Mortier de faîtage : 7,5 kg au mètre, en sacs de 25 kg (C06 : 9 m → 3 sacs). Vis de bac acier : 8 au m² (C07 : 12 boîtes).
  C02: [["Écran HPV", ["ecran"], 2, "rl"], ["Contre-liteaux 27×40", ["liteau"], 210, "ml", { groupe: "27x40" }], ["Liteaux 27×40", ["liteau"], 336, "ml", { groupe: "27x40" }], ["Tuiles HP 10", ["tuile", "!rive", "!faiti"], 1254, "n"], ["Tuiles de rive gauches", ["rive", "gauche"], 40, "n"], ["Tuiles de rive droites", ["rive", "droit|droite"], 40, "n"], ["Faîtières", ["faitiere"], 20, "n"], ["Closoir ventilé", ["closoir"], 2, "rl"]],
  C03: [["Gouttière de 33", ["gouttiere", "!crochet", "!naissance", "!talon", "!angle", "!equerre"], 8, "n"], ["Angles de gouttière", ["angle|equerre"], 2, "n"], ["Tubes de descente Ø100", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 9, "n"], ["Dauphins fonte", ["dauphin"], 3, "n"]],
  C04: [["Bobine zinc 650 (bacs)", ["bobine"], 78, "ml"], ["Tasseaux", ["tasseau", "!couvre"], 75, "ml"], ["Couvre-joints", ["couvre"], 75, "ml"], ["Feuille de zinc (solin)", ["feuille", "zinc"], 1, "n"], ["Bobineau zinc (chéneau)", ["bobineau"], 1, "n"], ["Tubes de descente Ø100", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 2, "n"]],
  C05: [["Ardoises 30×20", ["ardoise", "!crochet"], 7771, "n"], ["Crochets d'ardoise", ["crochet"], 16, "bt"], ["Feuilles de zinc", ["feuille", "zinc"], 4, "n"], ["Fenêtres GGL MK04", ["velux|ggl"], 2, "n"], ["Raccords MK04", ["raccord", "!velux", "!ggl"], 2, "n"], ["Faîtières", ["faitiere"], 33, "n"], ["Sorties de toit Ø125", ["sortie|chapeau|embase"], 2, "n", { ensemble: true }]],
  C06: [["Tuiles canal, courants", ["courant", "!couvert"], 972, "n"], ["Tuiles canal, couverts", ["couvert", "!courant"], 972, "n"], ["Liteaux 27×40", ["liteau"], 256, "ml"], ["Bardelis gauches", ["rive|bardelis", "gauche"], 17, "n"], ["Bardelis droits", ["rive|bardelis", "droit|droite"], 17, "n"], ["Faîtières canal", ["faitiere"], 27, "n"], ["Mortier de faîtage", ["mortier"], 3, "sac"]],
  C07: [["Plaques bac acier", ["plaque|bac", "!faitiere", "!closoir", "!vis"], 26, "n"], ["Vis autoperceuses", ["vis"], 12, "bt"], ["Closoirs mousse", ["closoir"], 52, "n"], ["Faîtières bac acier", ["faitiere"], 7, "n"], ["Gouttière PVC de 25", ["gouttiere", "!crochet", "!naissance", "!talon", "!jonction"], 7, "n"], ["Tubes de descente PVC Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 4, "n"]], // 2 descentes de 4 m en tubes de 2 m : la règle de Greg (fiche du 19 novembre 2026 : 2 m, zinc comme PVC) passe avant le contrôleur (2 tubes de 4 m)
  C08: [["Feuilles de zinc (noue)", ["feuille", "zinc"], 2, "n"], ["Ardoises 32×22", ["ardoise", "!crochet"], 170, "n"], ["Mortier pour solin", ["mortier"], 1, "sac"], ["Tubes de descente Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], null, ""]],
  C09: [["Voliges", ["volige"], 63, "m2"], ["Bacs joint debout", ["bac"], 28, "n"], ["Bande d'égout", ["egout"], 6, "n"], ["Faîtage zinc", ["faitage"], 4, "n"], ["Gouttière de 33", ["gouttiere", "!crochet", "!naissance", "!talon"], 4, "n"], ["Tubes de descente Ø100", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 6, "n"]],
  C10: [["Écran HPV", ["ecran"], 2, "rl"], ["Liteaux 18×40", ["liteau"], 770, "ml"], ["Ardoises fibres-ciment 40×24", ["ardoise", "!clou", "!crochet"], 3131, "n"], ["Faîtières fibres-ciment", ["faitiere"], null, ""], ["Feuilles de zinc (rives)", ["feuille", "zinc"], 3, "n"], ["Gouttière PVC de 25", ["gouttiere", "!crochet", "!naissance", "!talon", "!jonction"], 5, "n"], ["Tubes de descente PVC Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 6, "n"], ["Sortie de toit Ø100", ["sortie|chapeau|embase"], 1, "n", { ensemble: true }]],
  C11: [["Ardoises 35×25", ["ardoise", "!crochet"], 6294, "n"], ["Crochets à agrafe", ["crochet", "!pointe", "!gouttiere"], 13, "bt"], ["Crochets à pointe", ["crochet", "pointe"], 2, "bt", { incertain: "agrafe ou pointe : question pas encore tranchée par Greg (fiche : 20 % de crochets à pointe, boîtes de 700)" }], ["Feuilles de zinc (arêtiers)", ["feuille", "zinc"], 6, "n", { groupe: "feuilles" }], ["Feuilles de zinc (faîtage)", ["feuille", "zinc"], 1, "n", { groupe: "feuilles" }], ["Feuilles de zinc (noues)", ["feuille", "zinc"], 1, "n", { groupe: "feuilles" }], ["Gouttière de 25", ["gouttiere", "!crochet", "!naissance", "!talon", "!angle", "!equerre"], 12, "n"], ["Angles de gouttière", ["angle|equerre"], 4, "n"], ["Tubes de descente Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 12, "n"]],
  C12: [["Écran HPV", ["ecran"], 2, "rl"], ["Liteaux 27×40", ["liteau"], 266, "ml"], ["Tuiles HP 10", ["tuile", "!rive", "!faiti", "!douille"], 993, "n"], ["Tuiles de rive gauches", ["rive", "gauche"], 16, "n"], ["Tuiles de rive droites", ["rive", "droit|droite"], 16, "n"], ["Faîtières", ["faitiere"], 23, "n"], ["Fenêtres GGL SK06", ["sk06"], 2, "n"], ["Raccords SK06", ["raccord", "114", "!velux", "!ggl"], 2, "n"], ["Fenêtre GGL CK02", ["ck02"], 1, "n"], ["Raccord CK02", ["raccord", "55", "!velux", "!ggl"], 1, "n"], ["Tuile à douille", ["douille"], 1, "n"], ["Lanterne de sortie de toit Ø125", ["lanterne|sortie|chapeau", "!douille"], 1, "n"], ["Plomb en rouleau", ["plomb"], 1, "rl"]],
  C13: [["Bandes de rive zinc", ["rive"], 7, "n"], ["Bandes porte-solin", ["solin"], 2, "n"], ["Gouttière de 25", ["gouttiere", "!crochet", "!naissance", "!talon"], 4, "n"], ["Tubes de descente Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 3, "n"], ["Dauphin fonte", ["dauphin"], 1, "n"], ["Abergement de cheminée", ["abergement"], null, ""]],
  C14: [["Bobine zinc 650 (bacs)", ["bobine"], 47.5, "ml"], ["Bobineau zinc (chéneau)", ["bobineau"], 1, "n"], ["Tubes de descente Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 2, "n"], ["Feuille de zinc (solin)", ["feuille", "zinc"], 1, "n"]],
  // C15, tuiles : 942 et non 945. Même règle que C02 et C12 (fiche du 19 novembre) : un nombre entier de rangs sur le rampant
  // (6 m : 15 rangs de 0,40 m), 1 / (0,251 × 0,40) = 9,96 au m², × 90 m² × 1,05. Le contrôleur avait pris 10 au m² tout rond.
  C15: [["Tuiles à emboîtement", ["tuile|volnay", "!rive", "!faiti"], 942, "n"], ["Plaques bac acier", ["plaque|bac", "!faitiere", "!closoir", "!vis"], 7, "n"], ["Gouttière alu de 25", ["gouttiere", "!crochet", "!naissance", "!talon", "!jonction"], 6, "n"], ["Tubes de descente alu Ø80", ["tube|tuyau|descente", "!dauphin", "!coude", "!collier"], 6, "n"]],
};
// Les réponses du couvreur aux questions que le moteur corrigé pose en plus : lues dans la fiche vérité du chantier
// (`chantiers/<C>/verite.json`), jamais inventées ; ce que la fiche ne sait pas reste « je ne sais pas ».
const REPONSES_EN_PLUS = {
  // Greg, 21 novembre soir : sans gouttière écrite, « Tes m² d'ardoise comprennent déjà l'égout et les coupes ? ». La fiche
  // vérité de C05 : doublis d'ardoise à l'égout sur 20 m (non, 20 m) ; les jouées de lucarne n'ont pas d'égout (oui).
  C05: { "param:egout_compris@couverture-ardoises-crochet__4": { bouton: "Non" }, "param:egout_a_ajouter@couverture-ardoises-crochet__4": { valeur: "20", unite: "m" }, "param:egout_compris@couverture-ardoises-crochet__5": { bouton: "Oui" } },
  C06: { "product:tuile": { valeur: "edilians-canal-50" } }, // la fiche vérité : Edilians Canal 50 ; 85 m² × 11,1 au m² (recouvrement 150) + 3 % = 972 courants et 972 couverts
  C08: { "product:ardoise": { valeur: "ardoise-32x22" }, "param:qualite_ardoise": { bouton: "Espagne 1er choix" }, "param:ardoises_a_prevoir": { valeur: "170" } }, // remaniage : « environ 170 ardoises neuves » (fiche vérité) ; // la fiche vérité : ardoise naturelle d'Espagne 32×22
  C07: { "param:nb_descentes": { bouton: "2" }, "param:hauteur_descente": { valeur: "4", unite: "m" } },
  C15: { "product:tuile": { valeur: "terreal-volnay-pv" }, "param:hauteur_descente": { valeur: "4", unite: "m" }, "param:developpe_gouttiere": { bouton: "25" } },
  C11: { "param:qualite_ardoise": { bouton: "Espagne 1er choix" }, "param:developpe": { valeur: "330", unite: "mm" } },
};
// Ce qui doit rester une suggestion (règle de Greg), jamais une ligne.
const SUGGESTIONS = { C03: ["naissance"], C13: ["naissance"] };
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [c, lignes] of Object.entries(A)) {
  const carnet = JSON.parse(fs.readFileSync(`couvreur/${c}.json`, "utf8")), reponses = {};
  for (const [id, x] of Object.entries(carnet)) { const key = id.split(" ¦ ")[0]; if (reponses[key]) continue; const r = x.reponse; reponses[key] = r.ne_sait_pas ? { ne_sait_pas: true } : r.bouton ? { bouton: r.bouton } : { valeur: String(r.valeur), ...(r.unite ? { unite: r.unite } : {}) }; }
  Object.assign(reponses, REPONSES_EN_PLUS[c] ?? {});
  const verite = JSON.parse(fs.readFileSync(`chantiers/${c}/verite.json`, "utf8"));
  const o = { id: c, jeu: +c.slice(1) <= 10 ? "entrainement" : "examen", commune: verite.commune, code_postal: verite.code_postal, lecture: decode(JSON.parse(fs.readFileSync(`chantiers/${c}/lecture-or.json`, "utf8"))), reponses,
    attendu: lignes.map(([article, mots, quantite, unite, opt]) => ({ article, mots, quantite, unite, ...(opt ?? {}) })), suggestions: SUGGESTIONS[c] ?? [] };
  fs.writeFileSync(`${OUT}/${c}.json`, JSON.stringify(o, null, 1) + "\n"); n += lignes.length;
}
console.log(Object.keys(A).length, "chantiers,", n, "lignes attendues");
