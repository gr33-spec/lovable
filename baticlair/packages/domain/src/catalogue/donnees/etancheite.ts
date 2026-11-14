import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * ÉTANCHÉITÉ (Greg, 12 novembre 2026 : « il manque énormément de choix : membrane, pax alu, EPDM, isolant, pare-vapeur… »).
 * Toiture-terrasse et toit plat : membranes bitume, chape aluminium, EPDM, membranes synthétiques, étanchéité liquide,
 * isolants supports d'étanchéité, pare-vapeur, évacuations, protection. Désignations génériques, SANS MARQUE : les noms
 * que les artisans emploient au comptoir (« pax alu », « mammouth »…) ne sont que des mots de recherche.
 *
 * Les formats écrits ici ont été relevés le 12 novembre 2026 sur des fiches de fabricants et de négoces (liste et liens :
 * `docs/catalogue/etancheite-sources.md`, qui marque « à confirmer » les quelques formats usuels non relevés). Sans
 * format sûr, le produit est proposé sans variante, et l'artisan précise.
 */
const M = "etancheite" as const;

const BITUME = "Membranes bitume";
const EPDM = "Étanchéité EPDM";
const SYNTHETIQUE = "Membranes PVC et TPO";
const LIQUIDE = "Étanchéité liquide";
const ISOLANT = "Isolants de toiture-terrasse";
const VAPEUR = "Pare-vapeur et écrans";
const EAUX = "Évacuations et relevés";
const PROTECTION = "Protection et finition";

const mm = (v: readonly number[]) => v.map((e) => `${e} mm`);

export const ETANCHEITE: readonly ArticleCatalogue[] = [
  // Membranes bitume (bicouche, monocouche, chape aluminium)
  ...produit(M, BITUME, "Membrane bitume SBS sous-couche soudable", "rouleaux", croiser(["armature voile de verre", "armature polyester"], ["rouleau 7 × 1 m", "rouleau 10 × 1 m"]), {
    synonymes: ["sous couche", "premiere couche", "bicouche", "elastomere", "membrane bitume", "feuille bitume", "sopralene", "elastophene", "paradiene", "chalumeau"],
  }),
  ...produit(M, BITUME, "Membrane bitume SBS autoprotégée ardoisée soudable", "rouleaux", croiser(["gris ardoise", "rouge", "vert"], ["rouleau 6 × 1 m", "rouleau 8 × 1 m", "rouleau 10 × 1 m"]), {
    synonymes: ["couche de finition", "deuxieme couche", "bicouche", "autoprotegee", "ardoisee", "paillettes d ardoise", "membrane bitume", "mammouth", "sopralene", "elastophene"],
  }),
  ...produit(M, BITUME, "Membrane bitume SBS monocouche autoprotégée", "rouleaux", ["soudable", "fixée mécaniquement"], { synonymes: ["monocouche", "membrane bitume", "ardoisee", "fixation mecanique"] }),
  ...produit(M, BITUME, "Membrane bitume autoadhésive", "rouleaux", ["sous-couche", "autoprotégée ardoisée"], { synonymes: ["autoadhesive", "auto adhesive", "autocollante", "pose a froid", "stick", "sans flamme"] }),
  ...produit(M, BITUME, "Chape bitume armée autoprotégée aluminium", "rouleaux", ["rouleau 6 × 1 m", "rouleau 8 × 1 m", "rouleau 10 × 1 m"], {
    synonymes: ["paxalu", "pax alu", "chape alu", "alu chape", "etanchalu", "bitume alu", "membrane alu", "feuille alu", "chape aluminium", "mammouth alu"],
  }),
  ...produit(M, BITUME, "Bande bitume aluminium soudable", "rouleaux", ["largeur 20 cm · rouleau 8 m"], { synonymes: ["bande alu", "bande de solin", "bande de releve", "bande chape alu", "paxalu bande"] }),
  ...produit(M, BITUME, "Bande d'étanchéité bitume aluminium autocollante", "rouleaux", ["7,5 cm × 10 m", "15 cm × 5 m"], { synonymes: ["bande autocollante", "bande alu", "bande adhesive", "bande bitumineuse", "reparation"] }),
  ...produit(M, BITUME, "Équerre de renfort bitume", "rouleaux", [null], { synonymes: ["equerre", "bande d equerre", "renfort de releve", "releve", "angle"] }),
  ...produit(M, BITUME, "Feuille bitume anti-racines", "rouleaux", [null], { synonymes: ["anti racine", "antiracine", "toiture vegetalisee", "jardiniere"] }),
  ...produit(M, BITUME, "Enduit d'imprégnation à froid (EIF)", "bidons", ["5 kg", "10 kg", "25 kg"], { synonymes: ["eif", "primaire bitume", "primaire d accrochage", "vernis bitumineux", "impression"] }),
  ...produit(M, BITUME, "Colle bitume à froid", "bidons", [null], { synonymes: ["colle a froid", "colle bitumineuse", "colle membrane"] }),
  ...produit(M, BITUME, "Mastic bitume", "cartouches", ["310 ml"], { synonymes: ["mastic bitumineux", "mastic toiture", "reparation"] }),
  ...produit(M, BITUME, "Bouteille de gaz propane", "bouteilles", ["13 kg", "35 kg"], { synonymes: ["propane", "gaz", "chalumeau", "bouteille gaz"] }),
  // EPDM
  ...produit(M, EPDM, "Membrane EPDM", "m²", croiser(["1,14 mm", "1,52 mm"], ["largeur 3,05 m", "largeur 4,57 m", "largeur 6,10 m"]), {
    synonymes: ["epdm", "caoutchouc", "bache epdm", "membrane caoutchouc", "toit plat", "rubbergard", "rubbercover", "firestone"],
  }),
  ...produit(M, EPDM, "Membrane EPDM autoadhésive", "m²", [null], { synonymes: ["epdm", "autoadhesive", "auto adhesive", "autocollante", "caoutchouc"] }),
  ...produit(M, EPDM, "Colle de contact pour EPDM", "bidons", ["bidon", "aérosol"], { synonymes: ["colle epdm", "colle contact", "bonding", "colle releve", "spray"] }),
  ...produit(M, EPDM, "Colle EPDM en phase aqueuse", "bidons", [null], { synonymes: ["colle epdm", "colle surface", "colle a l eau", "colle support bois"] }),
  ...produit(M, EPDM, "Primaire pour bandes EPDM", "bidons", [null], { synonymes: ["primaire epdm", "primer", "quickprime"] }),
  ...produit(M, EPDM, "Bande de jonction EPDM autoadhésive", "rouleaux", ["76 mm", "152 mm"], { synonymes: ["bande de jonction", "bande d assemblage", "splice tape", "jonction des les", "bande epdm"] }),
  ...produit(M, EPDM, "Bande de pontage EPDM autoadhésive", "rouleaux", ["152 mm", "229 mm", "305 mm"], { synonymes: ["bande de pontage", "couvre joint", "bande de finition", "formflash", "bande epdm", "releve"] }),
  ...produit(M, EPDM, "Angle EPDM préformé", "pièces", ["intérieur", "extérieur"], { synonymes: ["angle epdm", "coin epdm", "angle rentrant", "angle sortant"] }),
  ...produit(M, EPDM, "Manchon EPDM de traversée de toiture", "pièces", [null], { synonymes: ["manchon", "traversee", "sortie de toiture", "collerette", "passage de tuyau"] }),
  ...produit(M, EPDM, "Mastic pour EPDM", "cartouches", [null], { synonymes: ["mastic epdm", "lap sealant", "mastic de finition", "mastic d etancheite"] }),
  ...produit(M, EPDM, "Profil de rive aluminium pour EPDM", "longueurs", [null], { synonymes: ["profil de rive", "bande de rive", "profile de finition", "rive toit plat"] }),
  ...produit(M, EPDM, "Profil de serrage aluminium", "longueurs", [null], { synonymes: ["bande de serrage", "profil de terminaison", "solin alu", "barre de serrage"] }),
  // Membranes synthétiques
  ...produit(M, SYNTHETIQUE, "Membrane PVC armée", "m²", ["1,2 mm", "1,5 mm", "1,8 mm"], { synonymes: ["pvc", "membrane pvc", "membrane synthetique", "sikaplan", "flagon", "alkorplan", "toit plat"] }),
  ...produit(M, SYNTHETIQUE, "Membrane TPO", "m²", ["1,2 mm", "1,5 mm", "1,8 mm"], { synonymes: ["tpo", "fpo", "polyolefine", "membrane synthetique"] }),
  ...produit(M, SYNTHETIQUE, "Tôle colaminée PVC", "feuilles", [null], { synonymes: ["tole plastee", "tole colaminee", "tole pvc", "releve", "rive"] }),
  ...produit(M, SYNTHETIQUE, "Angle préformé pour membrane synthétique", "pièces", ["intérieur", "extérieur"], { synonymes: ["angle pvc", "coin pvc", "angle tpo"] }),
  ...produit(M, SYNTHETIQUE, "Écran de séparation non tissé", "rouleaux", [null], { synonymes: ["feutre de separation", "ecran de desolidarisation", "non tisse", "geotextile"] }),
  // Étanchéité liquide (relevés, balcons, points singuliers)
  ...produit(M, LIQUIDE, "Résine d'étanchéité bitume-polyuréthane pour relevés", "seaux", ["2,5 kg", "5 kg", "15 kg"], { synonymes: ["resine", "etancheite liquide", "sel", "flashing", "releve", "resine bitume", "alsan"] }),
  ...produit(M, LIQUIDE, "Résine d'étanchéité polyuréthane", "seaux", [null], { synonymes: ["resine", "etancheite liquide", "sel", "balcon", "terrasse", "polyurethane"] }),
  ...produit(M, LIQUIDE, "Voile de renfort pour résine", "rouleaux", ["10 cm × 10 m", "10 cm × 50 m"], { synonymes: ["voile", "armature", "renfort", "voile flashing", "toile de renfort"] }),
  ...produit(M, LIQUIDE, "Primaire pour résine d'étanchéité", "seaux", ["5 kg", "20 kg"], { synonymes: ["primaire", "primaire resine", "accrochage"] }),
  ...produit(M, LIQUIDE, "Silice de saupoudrage", "sacs", ["25 kg"], { synonymes: ["silice", "sable de silice", "antiderapant"] }),
  ...produit(M, LIQUIDE, "Enduit de protection aluminium", "bidons", [null], { synonymes: ["peinture alu", "finition aluminium", "reflechissant", "vernis alu"] }),
  // Isolants supports d'étanchéité
  ...produit(M, ISOLANT, "Panneau isolant PIR support d'étanchéité 600 × 600", "panneaux", mm([40, 60, 80, 100, 120, 140, 160]), {
    synonymes: ["pir", "polyurethane", "isolant toiture terrasse", "isolant toit plat", "panneau isolant", "mousse rigide", "efigreen", "thane"],
  }),
  ...produit(M, ISOLANT, "Panneau isolant PIR support d'étanchéité 1 200 × 1 000", "panneaux", mm([80, 100, 120, 140, 160]), {
    synonymes: ["pir", "polyurethane", "isolant toiture terrasse", "isolant toit plat", "panneau isolant", "1200x1000"],
  }),
  ...produit(M, ISOLANT, "Panneau laine de roche support d'étanchéité 1 200 × 1 000", "panneaux", croiser(["nu", "surfacé bitume soudable"], mm([60, 80, 100, 120, 140])), {
    synonymes: ["laine de roche", "isolant bac acier", "isolant toiture terrasse", "rockacier", "panneau soudable"],
  }),
  ...produit(M, ISOLANT, "Panneau PSE support d'étanchéité 1 200 × 1 000", "panneaux", mm([60, 80, 100, 120, 140, 160, 200]), { synonymes: ["pse", "polystyrene expanse", "isolant toiture terrasse", "polystyrene"] }),
  ...produit(M, ISOLANT, "Panneau polystyrène extrudé pour toiture inversée", "panneaux", mm([40, 60, 80, 100, 120]), { synonymes: ["xps", "polystyrene extrude", "toiture inversee", "isolation inversee"] }),
  ...produit(M, ISOLANT, "Panneau verre cellulaire", "panneaux", [null], { synonymes: ["verre cellulaire", "foamglas", "isolant incompressible"] }),
  ...produit(M, ISOLANT, "Panneau perlite expansée", "panneaux", [null], { synonymes: ["perlite", "fesco", "ecran thermique", "panneau surfacage"] }),
  ...produit(M, ISOLANT, "Isolant à pente intégrée", "m²", ["PIR", "PSE", "verre cellulaire"], { synonymes: ["forme de pente", "panneau penté", "pente integree", "isolant pente"] }),
  ...produit(M, ISOLANT, "Colle pour panneaux isolants", "pièces", ["cartouche mousse polyuréthane", "bidon colle à froid"], { synonymes: ["colle isolant", "colle pu", "mousse colle", "colle panneau"] }),
  ...produit(M, ISOLANT, "Fixation mécanique d'isolant (vis et plaquette)", "boîtes", [null], { synonymes: ["fixation isolant", "plaquette", "vis isolant", "attelage", "rondelle de repartition"] }),
  // Pare-vapeur et écrans
  ...produit(M, VAPEUR, "Pare-vapeur bitume SBS soudable", "rouleaux", ["rouleau 10 × 1 m"], { synonymes: ["pare vapeur", "parevapeur", "ecran pare vapeur", "irex", "voile de verre"] }),
  ...produit(M, VAPEUR, "Pare-vapeur bitume aluminium soudable", "rouleaux", ["rouleau 10 × 1 m"], { synonymes: ["pare vapeur", "parevapeur", "pare vapeur alu", "sopravap", "forte hygrometrie"] }),
  ...produit(M, VAPEUR, "Pare-vapeur aluminium autoadhésif", "rouleaux", ["rouleau 14 × 1,08 m", "rouleau 50 × 1,08 m"], { synonymes: ["pare vapeur", "parevapeur", "pare vapeur autocollant", "pare vapeur bac acier", "stick alu"] }),
  ...produit(M, VAPEUR, "Film pare-vapeur polyéthylène", "rouleaux", [null], { synonymes: ["pare vapeur", "film polyethylene", "polyane", "pare vapeur synthetique"] }),
  ...produit(M, VAPEUR, "Écran d'indépendance voile de verre", "rouleaux", [null], { synonymes: ["voile de verre", "ecran d independance", "ecran de separation", "100 g"] }),
  ...produit(M, VAPEUR, "Écran perforé de diffusion de vapeur", "rouleaux", [null], { synonymes: ["ecran perfore", "diffusion de vapeur", "semi independance"] }),
  // Évacuations et relevés
  ...produit(M, EAUX, "Entrée d'eau pluviale à platine", "pièces", croiser(["Ø 80", "Ø 100", "Ø 125", "Ø 140", "Ø 160"], ["platine bitume", "platine PVC", "platine plomb", "platine EPDM"]), {
    synonymes: ["eep", "naissance", "moignon", "evacuation", "descente", "avaloir", "entree d eau"],
  }),
  ...produit(M, EAUX, "Entrée d'eau pluviale latérale", "pièces", ["Ø 80", "Ø 100"], { synonymes: ["eep laterale", "sortie horizontale", "evacuation acrotere", "gargouille", "barbacane"] }),
  ...produit(M, EAUX, "Trop-plein à platine", "pièces", ["Ø 30", "Ø 40", "Ø 50", "Ø 60"], { synonymes: ["trop plein", "surverse", "gargouille"] }),
  ...produit(M, EAUX, "Crapaudine", "pièces", ["Ø 80", "Ø 100", "Ø 125", "Ø 160"], { synonymes: ["crapaudine", "pare feuilles", "grille d evacuation"] }),
  ...produit(M, EAUX, "Garde-grève", "pièces", [null], { synonymes: ["pare gravier", "garde gravier", "garde greve"] }),
  ...produit(M, EAUX, "Boîte à eau avec trop-plein", "pièces", [null], { synonymes: ["boite a eau", "cuvette", "trop plein"] }),
  ...produit(M, EAUX, "Sortie de ventilation à platine", "pièces", [null], { synonymes: ["crosse", "sortie de toiture", "ventilation", "chapeau de ventilation", "platine"] }),
  ...produit(M, EAUX, "Bande de solin aluminium", "longueurs", [null], { synonymes: ["solin", "bande solin", "porte solin", "solin alu", "bavette"] }),
  ...produit(M, EAUX, "Bande de rive aluminium pour toit plat", "longueurs", [null], { synonymes: ["bande de rive", "rive toit plat", "profil de rive", "acrotere"] }),
  ...produit(M, EAUX, "Costière métallique", "longueurs", [null], { synonymes: ["costiere", "releve", "costiere acier", "costiere de rive"] }),
  ...produit(M, EAUX, "Lanterneau", "pièces", ["fixe", "ouvrant", "de désenfumage"], { synonymes: ["lanterneau", "coupole", "skydome", "exutoire", "puits de lumiere"] }),
  ...produit(M, EAUX, "Fixation mécanique d'étanchéité (vis et plaquette)", "boîtes", [null], { synonymes: ["fixation mecanique", "plaquette", "vis etancheite", "attelage"] }),
  // Protection et finition
  ...produit(M, PROTECTION, "Géotextile non tissé", "rouleaux", [null], { synonymes: ["geotextile", "feutre", "non tisse", "couche filtrante", "bidim"] }),
  ...produit(M, PROTECTION, "Gravillons roulés de protection", "tonnes", [null], { synonymes: ["gravillon", "gravier", "protection lourde", "lestage", "galets"] }),
  ...produit(M, PROTECTION, "Plot réglable pour dalles", "pièces", [null], { synonymes: ["plot", "plots", "dalles sur plots", "plot terrasse", "verin"] }),
  ...produit(M, PROTECTION, "Dalle béton pour pose sur plots", "pièces", ["40 × 40", "50 × 50"], { synonymes: ["dalle", "dalle gravillonnee", "dalles sur plots", "dalle terrasse"] }),
  ...produit(M, PROTECTION, "Nappe drainante", "rouleaux", [null], { synonymes: ["couche drainante", "drain", "nappe a excroissances", "drainage"] }),
  ...produit(M, PROTECTION, "Substrat pour toiture végétalisée", "sacs", [null], { synonymes: ["substrat", "terre vegetale", "toiture vegetalisee", "vegetalisation"] }),
  ...produit(M, PROTECTION, "Tapis de sedum précultivé", "m²", [null], { synonymes: ["sedum", "toiture vegetalisee", "vegetalisation", "tapis vegetal"] }),
  ...produit(M, PROTECTION, "Bande de séparation des gravillons", "longueurs", [null], { synonymes: ["bande sterile", "profil de separation", "bordure gravier", "zone sterile"] }),
];
