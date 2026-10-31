import { croiser, produit, type ArticleCatalogue, type Fiche } from "../catalogue.js";

/**
 * COUVERTURE : LES RÉFÉRENCES DES FABRICANTS, VÉRIFIÉES À LEUR SOURCE (Greg, 31 octobre 2026 : « une recherche beaucoup
 * plus poussée pour la couverture […] un maximum de références : tuiles, ardoise naturelle, ardoise synthétique, canal,
 * plates »). Chaque article cite la page ou le document du fabricant consulté le 31 octobre 2026 ; rien n'est déduit.
 *
 * - Tuiles Edilians : les fiches produit d'edilians.com (index public `sitemap.xml`, une page par modèle, lue une fois) :
 *   le nom du modèle, sa référence (le numéro de sa fiche technique, « 104_fog_omega_10… » → réf. 104), ses coloris et
 *   leur code EAN publiés sur la fiche. Sans numéro de fiche, la référence est l'EAN du coloris.
 * - Ardoises fibres-ciment Cedral (Etex) : les pages modèle de cedral.world/fr-fr (formats, bords, coloris).
 * - Ardoises naturelles Cupa Pizarras : le catalogue couvreur (2024), carrières CUPA et formats de son tableau de pose ;
 *   un format se confirme auprès du négoce selon la carrière.
 *
 * Le détail des sources et la façon de compléter : `docs/catalogue-metier.md` §3.
 */
const M = "couverture" as const;
const LE = "2026-10-31";

/** Une tuile Edilians : sans coloris précisé (quand elle a une référence), puis chacun de ses coloris avec son EAN. */
function edilians(nom: string, reference: string | null, url: string, coloris: readonly (readonly [string, string])[], _tuilesAuM2?: string): ArticleCatalogue[] {
  const ean = new Map(coloris.map(([c, e]) => [c, e]));
  const mots = nom.toLowerCase().replace(/ (huguenot|ste foy|poudenx|gélis|jacob|phalempin)$/, "");
  return produit(M, "Tuiles terre cuite", `Tuile ${nom}`, "pièces", [...(reference ? [null] : []), ...coloris.map(([c]) => c)], {
    synonymes: [mots, mots.replace(/ (\d)/g, "$1"), "edilians"],
    designation: (v) => `Tuile ${nom}${reference ? `, réf. ${reference}` : ""} (Edilians)${v ? ` ${v}` : ""}`,
    fiche: (v): Fiche => ({
      marque: "Edilians",
      reference: reference ?? `EAN ${ean.get(v ?? "")}`,
      ...(v && ean.get(v) ? { ean: ean.get(v)! } : {}),
      statut: "verifie",
      source: { libelle: `Fiche Tuile ${nom} (Edilians)`, url, verifieLe: LE },
    }),
  });
}

/** Une ardoise fibres-ciment Cedral : ses formats (et bords) × ses coloris, tels que la page du modèle les donne. */
function cedral(modele: string, page: string, formats: readonly string[], coloris: readonly string[]): ArticleCatalogue[] {
  return produit(M, "Ardoises", `Ardoise fibres-ciment ${modele} (Cedral)`, "pièces", formats.length ? croiser(formats, coloris) : coloris, {
    synonymes: [modele.toLowerCase(), "cedral", "eternit", "ardoise synthétique", "ardoise fibro", "fibres ciment"],
    fiche: { marque: "Cedral", reference: modele, statut: "verifie", source: { libelle: `Page ${modele} (Cedral France)`, url: `https://www.cedral.world/fr-fr/toiture/ardoises-fibres-ciment/${page}/`, verifieLe: LE } },
  });
}

/** Les formats du tableau de pose du catalogue couvreur Cupa Pizarras (cm). */
const FORMATS_CUPA = ["50×25", "46×30", "46×25", "40×25", "40×22", "40×20", "35×25", "35×22", "33×23", "32×22", "30×22", "30×20", "27×18"];
const CATALOGUE_CUPA = { libelle: "Catalogue couvreur Cupa Pizarras (2024)", url: "https://www.cupapizarras.com/sites/default/files/catalogue_couvreur.pdf", verifieLe: LE };
const cupa = (n: number, carriere?: string): ArticleCatalogue[] =>
  produit(M, "Ardoises", `Ardoise naturelle CUPA ${n} (Cupa Pizarras)`, "pièces", FORMATS_CUPA, {
    synonymes: [`cupa ${n}`, `cupa${n}`, "cupa", "ardoise espagne", "ardoise naturelle", ...(carriere ? [carriere] : [])],
    fiche: { marque: "Cupa Pizarras", reference: `CUPA ${n}`, statut: "verifie", source: CATALOGUE_CUPA },
  });

export const COUVERTURE_FABRICANTS: readonly ArticleCatalogue[] = [
  // Tuiles terre cuite Edilians (les modèles déjà au catalogue — H 14, HP 10, canaux Poudenx — y gagnent leurs coloris).
  ...edilians("Alpha 10 Ste Foy", "200", "https://edilians.com/alpha-10-ste-foy.html", [["Rouge", "3661223192278"], ["Ardoisé", "3661223298741"], ["Rouge Ancien", "3661223171709"], ["Chevreuse", "3661223171846"], ["Rouge Nuancé", "3661223001785"], ["Sérac", "3661223179446"], ["Vieilli Masse", "3661223171860"]], "De 10 à 11.2"),
  ...edilians("Aquitaine Poudenx", "111", "https://edilians.com/aquitaine-poudenx.html", [["Pastel", "3661223086256"], ["Rouge", "3661223086294"], ["Saintonge", "3661223086331"], ["Flammé Rustique", "3661223239201"], ["Paysage", "3661223086270"]], "11"),
  ...edilians("Artoise Huguenot", "220", "https://edilians.com/artoise-huguenot.html", [["Terre Amarante", "3661223165883"], ["Ardoisé", "3661223187243"], ["Noir Brillant", "3661223237214"], ["Flammé Rustique", "3661223285598"], ["Rouge", "3661223168471"]], "10"),
  ...edilians("Beauvoise Graphite Huguenot", "312", "https://edilians.com/beauvoise-graphite-huguenot.html", [["Ardoisé", "3661223341522"]], "De 20.2 à 20.7"),
  ...edilians("Beauvoise Huguenot", "302", "https://edilians.com/beauvoise-huguenot.html", [["Ardoisé", "3661223313703"], ["Flammé Rustique", "3661223276206"], ["Terre de Beauce", "3661223276084"], ["Vallée de Chevreuse", "3661223276022"]], "De 20.2 à 20.7"),
  ...edilians("Canal 50 Poudenx à tenons", null, "https://edilians.com/canal-50-a-tenons.html", [["Littoral Flammé", "3661223304268"], ["Ancien", "3661223302301"], ["Emporda", "3661223346121"], ["Rouge", "3661223302325"], ["Vieilli", "3661223302349"]], "De 10.3 à 12.6"),
  ...edilians("Canal 50 Réabilis", null, "https://edilians.com/canal-50-reabilis.html", [["Historia", "3661223310436"], ["Sainte Madeleine", "3661223372236"]], "De 10.3 à 12.6"),
  ...edilians("Canal Quintescia", null, "https://edilians.com/canal-quintescia.html", [["Sarment", "3661223295955"], ["Sainte Madeleine", "3661223295955"]], "De 12.4 à 13.5"),
  ...edilians("Canal Restorial", null, "https://edilians.com/canal-restorial.html", [["Restorial", "3661223287516"]], "De 14.2 à 16.1"),
  ...edilians("Canal S", "112", "https://edilians.com/canal-s.html", [["Alezane", "3661223269048"], ["Pastel", "3661223237931"], ["Réthaise", "3661223243000"], ["Rouge", "3661223237313"], ["Saintonge", "3661223237986"], ["Paysage", "3661223237870"]], "11.5"),
  ...edilians("Canal Sablière", null, "https://edilians.com/canal-sabliere.html", [["Emporda", "3661223304145"], ["Ancien", "3661223307610"], ["Rouergue", "3661223309997"], ["Rouge", "3661223151367"], ["Terroir", "3661223151435"], ["Tradition", "3661223151411"], ["Saintonge", "3661223240672"], ["Ventoux", "3661223213607"]]),
  ...edilians("Delta 10 Ste Foy", "202", "https://edilians.com/delta-10-ste-foy.html", [["Rouge", "3661223003932"], ["Rouge Nuancé", "3661223003963"], ["Vieilli Masse", "3661223003949"]], "De 10.8 à 12"),
  ...edilians("Diamant Huguenot", "219", "https://edilians.com/diamant-huguenot.html", [["Argentique", "3661223148770"], ["Flammé Rustique", "3661223144963"]], "10"),
  ...edilians("Double HP 20 Huguenot", "209", "https://edilians.com/double-hp-20-huguenot.html", [["Ardoisé", "3661223314564"], ["Flammé Rustique", "3661223253030"], ["Terre de Beauce", "3661223268577"], ["Vallée de Chevreuse", "3661223268386"], ["Black Chevreuse", "3661223253030"]], "De 9.5 à 10.6"),
  ...edilians("Double Panne S Huguenot", "223", "https://edilians.com/double-panne-s-huguenot.html", [["Ardoisé", "3661223290783"], ["Flammé Rustique", "3661223302240"], ["Rouge", "3661223261011"]], "10"),
  ...edilians("Double Ténord Huguenot", "229", "https://edilians.com/double-tenord-huguenot.html", [], "9.35"),
  ...edilians("H 10 Huguenot", "203", "https://edilians.com/h-10-huguenot.html", [["Ardoisé", "3661223312812"], ["Flammé Rustique", "3661223029796"], ["Noir Brillant", "3661223270228"], ["Rouge", "3661223282573"], ["Vieilli Masse", "3661223314625"]], "De 10 à 12.4"),
  ...edilians("HP 13 Évolutive Huguenot", "226", "https://edilians.com/hp-13-evolutive-huguenot.html", [["Ardoisé", "3661223300758"], ["Flammé Rustique", "3661223300772"]], "De 13.2 à 15.3"),
  ...edilians("HP 17 Huguenot", "325", "https://edilians.com/hp-17-huguenot.html", [["Flammé Rustique", "3661223302073"], ["Terre de Beauce", "3661223302110"], ["Ardoisé", "3661223301519"], ["Vallée de Chevreuse", "3661223302134"], ["Vieilli Masse", "3661223302097"]]),
  ...edilians("Jura 10 Jacob", "207", "https://edilians.com/jura-10-jacob.html", [["Rouge", "3661223231786"], ["Ardoisé", "3661223231823"], ["Rouge Ancien", "3661223231823"]], "De 9.7 à 10.8"),
  ...edilians("Losangée Huguenot", "218", "https://edilians.com/losangee-huguenot.html", [["Flammé Rustique", "3661223279344"], ["Rouge", "3661223279399"]], "De 12.7 à 13.62"),
  ...edilians("Losangée Ste Foy", "228", "https://edilians.com/losangee-ste-foy.html", [["Rouge", "3661223303018"], ["Rouge Nuancé", "3661223303889"]], "De 11.5 à 13.3"),
  ...edilians("Marseille Poudenx", "208", "https://edilians.com/marseille-poudenx.html", [["Brun", "3661223163322"], ["Rouge", "3661223043938"], ["Rouge Vieilli", "3661223050004"]], "De 12.3 à 14.3"),
  ...edilians("Médiane Plus Gélis", null, "https://edilians.com/mediane-plus-gelis.html", [["Emporda", "3661223298369"], ["Littoral Flammé", "3661223296952"], ["Paysage", "3661223296976"], ["Rouergue", "3661223296990"], ["Rouge", "3661223296938"], ["Terroir", "3661223297010"], ["Tradition", "3661223297034"]], "De 11.3 à 13.6"),
  ...edilians("Médiane Réno Gélis", null, "https://edilians.com/mediane-reno-gelis.html", [["Paysage", "3661223371338"], ["Rouergue", "3661223371369"], ["Rouge", "3661223371321"], ["Terroir", "3661223371352"], ["Tradition", "3661223371345"], ["Terre de Vienne", "3661223371338"], ["Côte Vendéenne", "3661223371338"]], "De 11,1 à 13,6"),
  ...edilians("Méridionale Poudenx", "102", "https://edilians.com/meridionale-poudenx.html", [["Brun", "3661223038705"], ["Pastel", "3661223039269"], ["Paysage", "3661223038644"], ["Rose", "3661223038514"], ["Rouge", "3661223049480"], ["Saintonge", "3661223038644"]], "13.5"),
  ...edilians("Monopole N°1 Huguenot", "306", "https://edilians.com/monopole-n1-huguenot.html", [["Amarante Rustique", "3661223059250"], ["Nuancé", "3661223059311"], ["Noir Brillant", "3661223268829"], ["Vieux Nord", "3661223163414"], ["Flammé Rustique", "3661223285543"], ["Rouge", "3661223059274"], ["Vieilli", "3661223059335"]], "22"),
  ...edilians("Néoplate Ste Foy", "333", "https://edilians.com/neoplate-ste-foy.html", [["Chevreuse", "3661223295566"], ["Rouge Nuancé", "3661223295559"]], "19.5"),
  ...edilians("Oméga 10 Ste Foy", "104", "https://edilians.com/omega-10-ste-foy.html", [["Nuancé Paille", "3661223007213"], ["Mistral", "3661223079401"], ["Ardoisé", "3661223303056"], ["Terre d'Adhémar", "3661223222418"], ["Rouge", "3661223007220"], ["Rouge Nuancé", "3661223007237"], ["Vieux Toits", "3661223075465"], ["Vieilli Masse", "3661223007244"]], "De 10 à 11.7"),
  ...edilians("Oméga 13 Ste Foy", "105", "https://edilians.com/omega-13-ste-foy.html", [["Rouge", "3661223075502"], ["Rouge Nuancé", "3661223007367"], ["Vieux Toits", "3661223075489"]], "De 12.6 à 14.3"),
  ...edilians("Oméga Max", "113", "https://edilians.com/omega-max.html", [["Rouge Nuancé", "3661223328127"], ["Rouge", "3661223315844"], ["Vieux Toits", "3661223328097"]], "De 8.8 à 9.7"),
  ...edilians("Panne H2 Huguenot", "210", "https://edilians.com/panne-h2-huguenot.html", [["Vieilli Masse", "3661223025088"], ["Ardoisé", "3661223090468"], ["Flammé Rustique", "3661223069709"], ["Noir Brillant", "3661223258622"], ["Amarante Rustique", "3661223090444"], ["Rouge", "3661223024517"]], "14"),
  ...edilians("Panne S Huguenot", "323", "https://edilians.com/panne-s-huguenot.html", [["Ardoisé", "3661223290271"], ["Flammé Rustique", "3661223285642"], ["Rouge", "3661223264937"], ["Vieux Nord", "3661223262322"], ["Vintage Foncé", "3661223308471"]], "20"),
  ...edilians("Plate 16×24 Phalempin", "505", "https://edilians.com/plate-16x24-phalempin.html", [["Ambre", "3661223055603"], ["Vieilli", "3661223055702"]], "De 73.5 à 83.3"),
  ...edilians("Plate 17×27 Phalempin", "500", "https://edilians.com/plate-17x27-phalempin.html", [["Vintage", "3661223303438"], ["Amarante Rustique", "3661223055801"], ["Ambre", "3661223055788"], ["Val de Seine", "3661223161014"], ["Vieilli", "3661223055863"], ["Volcane", "3661223055726"]], "De 59 à 65"),
  ...edilians("Plate 20×30 Huguenot", "510", "https://edilians.com/plate-20x30-huguenot.html", [["Paysage", "3661223086492"], ["Alezane", "3661223168112"], ["Vieilli", "3661223194005"], ["Ardoisé", "3661223315905"], ["Flammé Rustique", "3661223086430"], ["Gabarre", "3661223296136"], ["Quercy", "3661223158755"]], "De 43.5 à 47.6"),
  ...edilians("Plate écaille pressée 17×27 Ste Foy", "551", "https://edilians.com/plate-ecaille-pressee-17x27-ste-foy.html", [["Chevreuse", "3661223017793"], ["Rouge Nuancé", "3661223013863"]], "De 59 à 65"),
  ...edilians("Plate pressée 17×27 Ste Foy", null, "https://edilians.com/plate-pressee-17x27-ste-foy.html", [["Rouge Etna", "3661223251968"], ["Vieilli Masse", "3661223340280"], ["Chevreuse", "3661223013481"], ["Rouge Nuancé", "3661223013405"], ["Terre de Beauce", "3661223081626"], ["Breteuil", "3661223340280"]], "De 59 à 65"),
  ...edilians("Plate Tradition 17×27 Phalempin", "507", "https://edilians.com/plate-tradition-17x27-phalempin.html", [["Hermitage", "3661223086225"], ["Muraille", "3661223055580"]], "De 59 à 65"),
  ...edilians("Plein Sud Gélis", null, "https://edilians.com/plein-sud-gelis.html", [["Littoral Flammé", "3661223041507"], ["Paysage", "3661223041460"], ["Emporda", "3661223288063"], ["Ancien", "3661223307399"], ["Méditerranea", "3661223232080"], ["Rouergue", "3661223286168"], ["Rouge", "3661223025491"], ["Terroir", "3661223041521"], ["Tradition", "3661223029659"]], "De 9.6 à 11.4"),
  ...edilians("Plein Sud Réabilis Gélis", "107", "https://edilians.com/plein-sud-reabilis-gelis.html", [["Ste Madeleine", "3661223374612"]], "De 9.6 à 11.4"),
  ...edilians("Provinciale Ste Foy", "212", "https://edilians.com/provinciale-ste-foy.html", [["Rouge", "3661223008371"]], "De 13.8 à 15.7"),
  ...edilians("PV 10 Huguenot", "214", "https://edilians.com/pv-10-huguenot.html", [["Flammé Rustique", "3661223059588"], ["Vieilli Masse", "3661223314595"], ["Ardoisé", "3661223030341"], ["Rouge", "3661223310832"]], "De 9.9 à 12"),
  ...edilians("PV 13 Huguenot", "215", "https://edilians.com/pv-13-huguenot.html", [["Flammé Rustique", "3661223249804"], ["Rouge", "3661223249736"], ["Vieilli Masse", "3661223249866"]], "De 12.6 à 14.9"),
  ...edilians("Rhôna 10 Ste Foy", "222", "https://edilians.com/rhona-10-ste-foy.html", [["Ardoisé", "3661223197600"], ["Rouge", "3661223187731"], ["Rouge Ancien", "3661223210989"], ["Rouge Nuancé", "3661223187762"], ["Serac", "3661223304640"], ["Vieilli Masse", "3661223279672"]], "De 9.3 à 10.1"),
  ...edilians("Romane Sans", "110", "https://edilians.com/romane-sans.html", [["Brun Rustique", "3661223085143"], ["Paysage", "3661223085129"], ["Ancien", "3661223313666"], ["Rose Flammé", "3661223030532"], ["Rouge", "3661223085105"], ["Rouge Vieilli", "3661223085082"], ["Terroir", "3661223074611"], ["Vieilli Masse", "3661223085167"]], "De 13.2 à 13.8"),
  ...edilians("Standard 14 Vario Jacob", "236", "https://edilians.com/standard-14-vario-jacob.html", [["Rouge Ancien", "3661223314120"], ["Vieilli Masse", "3661223314168"]], "De 14 à 17"),
  ...edilians("Standard 9 Jacob", "217", "https://edilians.com/standard-9-jacob.html", [["Ardoisé", "3661223303995"], ["Rouge", "3661223212730"], ["Rouge Ancien", "3661223212785"], ["Vieilli Masse", "3661223212839"]], "De 9.8 à 10.8"),
  ...edilians("Stretto Huguenot 26,5×37", "530", "https://edilians.com/stretto-huguenot.html", [["Flammé Rustique", "3661223352474"], ["Vallée De Chevreuse", "3661223352481"], ["Ardoisé", "3661223352498"]], "De 25 à 27"),
  ...edilians("Ténord Huguenot", "311", "https://edilians.com/tenord-huguenot.html", [["Anthracite", "3661223313949"], ["Flammé", "3661223313956"], ["Rouge", "3661223313963"], ["Terre D'Amarante", "3661223313987"]], "De 18.7 à 20.2"),
  ...edilians("Terroise Huguenot", "309", "https://edilians.com/terroise-huguenot.html", [["Flammé Rustique", "3661223064551"], ["Ardoisé", "3661223316001"], ["Vieilli Masse", "3661223022957"]], "20"),
  ...edilians("Valoise Huguenot", "310", "https://edilians.com/valoise-huguenot.html", [["Flammé Rustique", "3661223064360"], ["Vieilli Masse", "3661223064261"]], "20"),
  // Ardoises fibres-ciment Cedral
  ...cedral("Kergoat", "kergoat", ["33×23 bords droits", "40×22 bords arrondis", "40×24 bords droits", "45×30 bords droits", "60×30 bords droits"], ["anthracite"]),
  ...cedral("Orléane", "orleane", ["40×24 bords droits", "45×30 bords droits", "60×30 bords droits"], ["anthracite", "brun"]),
  ...cedral("Pommay", "pommay", ["40×24 bords droits"], ["flammé brun"]),
  ...cedral("Vertigo", "cedral-vertigo", ["60×30 bords droits"], ["anthracite", "gris zinc", "terre cuite", "brun"]),
  ...cedral("Vertigo Alterna", "vertigo-alterna", ["60×30 bords droits"], ["blanc", "rouge tuile", "brun foncé", "gris léger"]),
  ...cedral("Alterna", "alterna", ["40×40 losangée"], ["gris foncé", "gris perle"]),
  ...cedral("Tecta Texture", "cedral-tecta-texture", [], ["gris foncé mat, bords épaufrés"]),
  // Ardoises naturelles Cupa Pizarras (carrières du catalogue couvreur)
  ...cupa(3),
  ...cupa(4, "armadilla"),
  ...cupa(5, "valdacal"),
  ...cupa(6),
  ...cupa(7),
  ...cupa(9),
  ...cupa(10, "las arcas"),
  ...cupa(13),
  ...cupa(17),
];
