import type { Referential } from "../referential/model.js";
import { normalizeText } from "../trades/trade-profile.js";
import type { LectureDevis, LectureLigne } from "./lecture.js";
import { cleDeSon, corrigerTexte, vocabulaireDuMetier, type Doute } from "./orthographe.js";
import { ouvrageNomme } from "./par-le-code.js";

/**
 * LE QUANTITATIF À LA VOIX (Greg, 28 novembre 2026, test réel sur iPhone : « je dois environ 50 m² d'ardoise 32x22, j'ai une
 * gouttière bandeau avec les crochets, gouttière bandeau de 25, et je dois prévoir également deux chatières ») :
 * 1. la dictée recopie des sons (« châtia » pour « chatière ») : le texte est remis au propre avec les mots DU MÉTIER, comme
 *    les fautes d'un devis ; un vrai doute devient des boutons (« chatière », « châssis », Autre), jamais « tu veux dire quoi ? » ;
 * 2. on n'envoie JAMAIS des m² à un fournisseur : la dictée devient des lignes, rangées comme celles d'un devis, et passe par
 *    le moteur (questions, calcul, suggestions, liste), exactement comme un devis ;
 * 3. jamais une caractéristique inventée : chaque ligne garde les mots de l'artisan, ce qui manque se demande.
 * Le code seul, sans IA, sans coût.
 */

/** Les mots courants d'une phrase dite : jamais pris pour un mot du métier mal entendu. */
const MOTS_COURANTS = new Set(
  "alors aussi autre autres avec avoir beaucoup bien cela cette ceux chaque chez combien comme dans deja deux donc dois doit elle encore entre environ etre faire faut leur mais meme metre metres moins nous notre pour pourquoi prevoir puis quand quelque sans selon tout toute toutes tous tres trois quatre cinq vingt cent mille voila vous ensuite egalement voudrais besoin chantier maison toiture toit".split(" "),
);

/** Le nombre de lettres à changer pour passer d'une clé de son à l'autre (Levenshtein). */
function ecart(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface DicteeAuPropre {
  /** Le texte remis au propre, montré dans la bulle (corrigeable avant l'envoi). */
  texte: string;
  /** Les vrais doutes : des boutons. */
  doutes: Doute[];
}

/**
 * La dictée remise au propre. D'abord les fautes « d'écriture » (comme un devis : même son, écrit autrement) ; puis les mots
 * que la dictée a mal entendus : un mot inconnu dont le SON est à une lettre d'un mot du métier (« châtia », « chatière ») ;
 * un seul candidat : remplacé ; plusieurs : un doute à boutons. Les chiffres, les sigles et les mots courants ne bougent pas.
 * `choix` : les réponses de l'artisan aux doutes (mot tel qu'entendu → mot choisi).
 */
export function dicteeAuPropre(ref: Referential, brut: string, choix: Readonly<Record<string, string>> = {}): DicteeAuPropre {
  const vocab = vocabulaireDuMetier(ref);
  const doutes: Doute[] = [];
  // Un format dit « 30 par 20 », « 32 22 » ou « 32 x 22 » s'écrit comme au comptoir : « 30x20 » (jamais une longueur dite).
  const formats = brut.replace(/\s+/g, " ").trim().replace(/\b(\d{2})\s*(?:x|par|fois|×|\s)\s*(\d{2})\b(?!\s*(?:m²|m2|ml|m\b|mètres?|metres?|cm|mm|%))/giu, "$1x$2");
  const ecrit = corrigerTexte(formats, vocab, doutes, choix);
  const texte = ecrit.replace(/[\p{L}]+/gu, (mot) => {
    if (mot.length < 4 || mot === mot.toUpperCase()) return mot;
    const cle = sansAccent(mot.toLowerCase());
    if (vocab.connus.has(cle) || MOTS_COURANTS.has(cle) || doutes.some((d) => d.mot === mot)) return mot;
    const choisi = choix[mot];
    if (choisi !== undefined) return choisi;
    // À l'oral, « ai », « ei » et « è » se disent « é » : « fêtage » est « faîtage ».
    const parle = (w: string) => cleDeSon(w).replace(/ai|ei/g, "e");
    const son = parle(cle);
    if (son.length < 3) return mot;
    // Une autre forme du même mot (« naturelles » et « naturel », « liteaux » et « liteau ») n'est jamais une erreur d'écoute.
    const racine = (w: string) => w.replace(/(?:ees|ee|es|e|s|x)$/, "");
    const proches = [...vocab.connus.values()].filter((f) => {
      const c = sansAccent(f);
      if (cle.startsWith(c) || c.startsWith(cle) || racine(c) === racine(cle)) return false;
      const s = parle(c);
      return s[0] === son[0] && Math.abs(s.length - son.length) <= 2 && ecart(s, son) <= 1;
    });
    const candidats = [...new Set(proches)].filter((f) => !MOTS_COURANTS.has(sansAccent(f))).sort();
    if (candidats.length === 0) return mot;
    if (candidats.length === 1) {
      const c = candidats[0]!;
      return mot[0] === mot[0]!.toUpperCase() ? c[0]!.toUpperCase() + c.slice(1) : c;
    }
    doutes.push({ mot, candidats, question: `Tu as dit « ${mot} » : c'est ${candidats.map((c) => `« ${c} »`).join(" ou ")} ?` });
    return mot;
  });
  // Après un nombre (« deux chatière »), le mot remis au propre prend le pluriel : « deux chatières ».
  const auPluriel = texte.replace(/\b(\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|vingt|cent)\s+([\p{L}]+?)(?<![sx])(?=[\s,.;]|$)/giu, (m, n: string, w: string) => (n === "1" || vocab.connus.has(sansAccent(w.toLowerCase())) === false ? m : `${n} ${w}s`));
  return { texte: auPluriel, doutes };
}

const NOMBRES: Record<string, number> = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, cent: 100 };

/** Ce qui s'entend avant l'article et ne dit rien de lui (« je dois environ », « j'ai une », « il me faut »). */
const DEBUT_PARLE =
  /^(?:(?:et|puis|alors|donc|aussi|ensuite)\s+)*(?:(?:je|j|il|on|nous)\s*(?:'|\s)\s*(?:dois|doit|vais|veux|voudrais|ai|aurai|faut|me faut|nous faut|a|y a|prevoir|prévoir|compte|pense|refais|refait|change|remplace|pose|mets|monte|fais|fait)\s+)*(?:(?:prevoir|prévoir|commander|mettre|poser|avoir|faire|refaire|changer|remplacer)\s+)?(?:(?:egalement|également|aussi|environ|a peu pres|à peu près|en gros|a peu pres|au moins)\s+)*/i;

/** Une quantité dite : « 50 m² », « 12 mètres », « deux chatières ». */
function quantiteDite(segment: string): { quantite: string | null; unite: string | null; reste: string } {
  const t = segment.trim();
  // Un nombre de pièces se dit EN TÊTE (« deux chatières », « 2 descentes de 5 mètres ») ; « gouttière de 25 », « 32x22 »
  // ne comptent rien. Une longueur dite après lui reste dans les mots de la ligne (la hauteur des descentes).
  const n = /^(\d{1,3}(?:[  ]\d{3})+|\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|cinquante|cent)\s+(?=[\p{L}])(?!(?:m²|m2|ml|m|mètres?|metres?)(?![\p{L}]))/iu.exec(t);
  if (n) {
    const v = /^\d/.test(n[1]!) ? n[1]!.replace(/[  ]/g, "") : String(NOMBRES[n[1]!.toLowerCase()]);
    return { quantite: v, unite: "u", reste: t.slice(n[0].length).replace(/(\d+(?:[.,]\d+)?)\s*(?:mètres?|metres?)(?![\p{L}])/iu, "$1 m").trim() };
  }
  const m = /(?:\s(?:sur|de|d'|d’|à|en))?\s*(\d+(?:[.,]\d+)?)\s*(m²|m2|mètres? carrés?|metres? carres?|ml|mètres? linéaires?|metres? lineaires?|mètres?|metres?|m)(?![\p{L}\d])/iu.exec(` ${t}`);
  if (m) {
    const u = normalizeText(m[2]!);
    const unite = /carre|²|m2/.test(u) ? "m²" : "ml";
    const avec = ` ${t}`;
    const reste = (avec.slice(0, m.index) + " " + avec.slice(m.index + m[0].length)).replace(/^\s*(?:de|des|du)\s+|^\s*d['’]\s*/i, "").replace(/\s+/g, " ").trim();
    return { quantite: m[1]!.replace(",", "."), unite, reste };
  }
  return { quantite: null, unite: null, reste: t };
}

/** Le nom de la ligne : les mots de l'artisan, sans ce qui s'entend autour (« une », « les », la quantité). */
function motsDeLArticle(reste: string): string {
  const t = reste
    .replace(DEBUT_PARLE, "")
    .replace(/^(?:une|un|des|les|le|la|de|du)\s+|^(?:l|d)['’]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** L'unité où se mesure un ouvrage (la donnée lue dans la quantité de sa ligne). */
function uniteDeLOuvrage(ref: Referential, id: string): string | null {
  const w = ref.workItems.find((x) => x.id === id);
  const p = w?.params.find((x) => x.fromLineQuantity && /^(?:m|m2)$/.test(x.unit));
  return p ? (p.unit === "m2" ? "m²" : "ml") : null;
}

/**
 * La dictée devient une lecture, rangée comme un devis : une ligne par article dit (deux bouts de phrase sur le même ouvrage
 * se rejoignent : « une gouttière bandeau avec les crochets, gouttière bandeau de 25 »). La quantité dite fait la mesure de
 * l'ouvrage (50 m² de couverture, jamais 50 m² d'ardoises) ; un ouvrage mesuré sans quantité garde son unité et le moteur
 * demande la mesure (« Longueur de gouttière ? »).
 */
export function lectureDeLaDictee(ref: Referential, texte: string): LectureDevis {
  const segments = texte
    .split(/[,;.\n](?!\d)|\s+(?:et|puis|ensuite|plus)\s+/i)
    .map((s) => s.trim())
    .filter((s) => /\p{L}{3,}/u.test(s));
  const lignes: { ouvrage: string | null; mots: string[]; quantite: string | null; unite: string | null }[] = [];
  for (const seg of segments) {
    const parle = seg.replace(DEBUT_PARLE, "");
    const unSeul = /^(?:une|un|l['’]|le|la)\s*(?=\p{L})/iu.test(parle);
    const lu = quantiteDite(parle.replace(/^(?:une|un)\s+(?=\p{L})/iu, ""));
    const mots = motsDeLArticle(lu.reste);
    if (!mots) continue;
    const w = ouvrageNomme(ref, mots);
    // « l'abergement de la cheminée », « une sortie de toit » : un ouvrage qui se compte en pièces, dit au singulier, en vaut un.
    const enPieces = w ? w.params.some((x) => x.fromLineQuantity && x.unit === "u") && !w.params.some((x) => x.fromLineQuantity && /^(?:m|m2)$/.test(x.unit)) : false;
    const { quantite, unite } = lu.quantite === null && unSeul && enPieces ? { quantite: "1", unite: "u" } : lu;
    const deja = w ? lignes.find((l) => l.ouvrage === w.id) : undefined;
    if (deja) {
      deja.mots.push(mots.charAt(0).toLowerCase() + mots.slice(1));
      if (!deja.quantite && quantite) Object.assign(deja, { quantite, unite });
      continue;
    }
    // Ce qui n'est ni un ouvrage, ni une quantité, ni un mot du métier (« bonjour », « voilà ») n'est pas un article.
    const vocab = vocabulaireDuMetier(ref);
    if (!w && quantite === null && !mots.split(/[^\p{L}]+/u).some((x) => x.length >= 4 && vocab.connus.has(sansAccent(x.toLowerCase())))) continue;
    lignes.push({ ouvrage: w?.id ?? null, mots: [mots], quantite, unite });
  }
  return {
    source: "dictee",
    metier: ref.trade ?? null,
    lots: [],
    fiche: { donnees: [] },
    bref: [],
    questions: [],
    contexte: null,
    notes: [],
    lignes: lignes.map((l, i): LectureLigne => {
      // Une quantité en pièces (« deux chatières ») reste en pièces ; un ouvrage mesuré dit sans sa mesure prend son unité.
      const unite = l.unite ?? (l.ouvrage ? uniteDeLOuvrage(ref, l.ouvrage) : null);
      const designation = l.mots.join(", ");
      return {
        ref: `voix:${i + 1}`,
        dite: true,
        role: "fourniture_et_pose",
        designation,
        quantite: l.quantite,
        unite,
        fournitures: [{ nom: designation, quantite: null, unite: null, ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }],
      };
    }),
  };
}

/** Les lignes enregistrées d'une dictée (une par ligne de la lecture), pour le serveur. */
export function lignesDeLaDictee(lecture: LectureDevis): { ref: string; designation: string; quantity: string | null; unit: string | null }[] {
  return lecture.lignes.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantite, unit: l.unite }));
}

/**
 * Une dictée qui a quelque chose à CALCULER part au moteur : un ouvrage du métier dit avec sa mesure (« 50 m² d'ardoise »,
 * « 12 mètres de gouttière ») ; ce qui l'accompagne (« une gouttière bandeau de 25 ») part avec lui. Des articles comptés en
 * pièces (« 1 000 ardoises et 950 crochets ») ou flous (« Ardoise 5 et fruitier ») restent dans la conversation, qui les
 * demande ou les prend tels quels.
 */
export function dicteeVaAuMoteur(ref: Referential, texte: string): boolean {
  return lectureDeLaDictee(ref, texte).lignes.some((l) => ouvrageNomme(ref, l.designation) !== null && l.quantite !== null && (l.unite === "m²" || l.unite === "ml"));
}

/**
 * UNE VRAIE CONVERSATION, TOUJOURS OUVERTE (Greg, 28 novembre 2026 : « Ajoute un Velux » en fin de parcours, impossible) :
 * ce que l'artisan ajoute en cours de route (écrit ou dicté) rejoint la lecture comme une dictée, à la suite, sous des repères
 * neufs (« dit2:1 ») ; le moteur le range, pose seulement les questions de cet article, puis recalcule.
 */
export function ajouterALaLecture(ref: Referential, lecture: LectureDevis, texte: string): { lecture: LectureDevis; nouvelles: LectureLigne[] } {
  const numero = new Set(lecture.lignes.filter((l) => /^dit\d+:/.test(l.ref)).map((l) => l.ref.split(":")[0])).size + 1;
  const nouvelles = lectureDeLaDictee(ref, dicteeAuPropre(ref, texte).texte).lignes.map((l, i) => ({ ...l, ref: `dit${numero}:${i + 1}` }));
  return { lecture: { ...lecture, lignes: [...lecture.lignes, ...nouvelles] }, nouvelles };
}
