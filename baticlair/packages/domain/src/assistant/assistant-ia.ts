/**
 * L'ASSISTANT CONNECTÉ À L'IA (Greg, 12 novembre 2026, capture de l'assistant : « Ici, je veux une IA connectée. Quand
 * je parle ça doit retranscrire et convertir en quantitatif, l'IA doit poser des questions si besoin, comme le ferait
 * un salarié de comptoir chez un négoce »). La phrase dictée « 52 m² d'ardoise 32 22 premier choix d'Espagne j'ai besoin
 * d'une gouttière de 25 » sortait en UNE ligne : le modèle la découpe en articles et pose les questions du comptoir.
 *
 * RÈGLE NUMÉRO UN, tenue ICI par le code, après le modèle :
 *  - une quantité n'existe que si son nombre a été DIT par l'artisan (sinon la ligne sort sans quantité) ;
 *  - un nombre écrit dans une désignation (format, développé, épaisseur) doit avoir été DIT (sinon la ligne est écartée) ;
 *  - une désignation doit reprendre au moins un mot de l'artisan (sinon la ligne est écartée) ;
 *  - trois questions au plus, courtes, avec leurs choix ; la quantité qui manque se demande (elle n'est jamais devinée) ;
 *    jamais l'adresse, la date ni le prix (ils se règlent ailleurs).
 * Éteint (`ASSISTANT_IA=off`), en panne ou au-delà du plafond : le code seul lit la phrase (`lireDescription`).
 *
 * LA PHOTO (Greg, 12 novembre 2026, capture de la feuille « Ajouter » : « un artisan doit pouvoir donner une photo pour
 * aider l'IA à comprendre le contexte du chantier et analyser les matériaux […] et poser les questions nécessaires […] La
 * partie photo servira aussi à prendre en photo une liste de matériaux. L'IA devra s'adapter »). Le modèle dit d'abord ce
 * que montre la photo (`nature`) : une LISTE ou un DEVIS partent à la lecture de document, comme avant ; un CHANTIER donne
 * les matériaux reconnus, proposés « vus sur la photo », à confirmer par l'artisan.
 * RÈGLE CHANGÉE (règle numéro un, assistant seulement) : avant, un article ne venait que des mots de l'artisan ; maintenant
 * il peut aussi venir d'une photo de chantier, TOUJOURS sans quantité ni dimension (une photo ne mesure rien), toujours à
 * confirmer. Une quantité ou un format ne viennent jamais que de ce que l'artisan dit.
 */

export const ASSISTANT_IA_PROMPT = { id: "assistant_description", version: 1 } as const;

/** La consigne système (envoyée telle quelle ; testée). */
export const ASSISTANT_IA_SYSTEM = [
  "Tu es le vendeur de comptoir d'un négoce de matériaux du bâtiment (couverture, zinguerie, étanchéité d'abord). Un artisan te dit, à la voix ou à l'écrit, ce dont il a besoin. Sa phrase est souvent dictée : sans ponctuation, avec des mots mal transcrits (« gouttières à braise » pour « gouttière havraise », « Lito » pour « liteaux »).",
  "Ta tâche : découper ce qu'il dit en articles à commander, un article par ligne, et poser les questions qu'un vendeur poserait pour pouvoir chiffrer.",
  "Règles absolues :",
  "- N'ajoute JAMAIS un article que l'artisan n'a pas dit, même s'il va de soi (pas de crochets, de clous ni d'accessoires ajoutés).",
  "- N'invente JAMAIS une quantité, une dimension, une épaisseur, une teinte, une marque ou une référence. Une quantité non dite vaut null. Ne convertis jamais une quantité ni une unité.",
  "- Recopie les nombres tels qu'ils ont été dits. « 32 22 » pour une ardoise s'écrit « 32×22 ».",
  "- Corrige seulement un mot visiblement mal transcrit, quand le métier ne laisse aucun doute ; garde les autres mots de l'artisan.",
  "- La désignation est courte, comme sur un bon de commande : le produit, puis ses caractéristiques dites (« Ardoise naturelle 32×22 Espagne 1er choix »). Jamais de phrase (« j'ai besoin de… »).",
  "- L'unité est celle que l'artisan a dite (m², m, pièces, sacs, rouleaux…), sinon null.",
  "- Pose au plus trois questions, seulement celles sans lesquelles un vendeur ne peut pas chiffrer (matière, développé, diamètre, épaisseur, format, teinte). Chaque question tient en une phrase courte, au tutoiement, nomme l'article, et propose 2 à 5 choix courts quand ils existent.",
  "- Si l'artisan n'a pas dit la quantité d'un article, demande-la, avec son unité (« Gouttière : quelle longueur, en mètres ? »). Ne la devine jamais.",
  "- Ne demande jamais une adresse, une date de livraison ni un prix.",
  "- Si l'artisan répond à une de tes questions, intègre sa réponse dans la désignation de l'article concerné et rends la liste complète, à jour.",
  "- Si rien de ce qu'il dit n'est un matériau, rends une liste vide et une phrase courte dans « message ».",
  "« nature » : « texte » quand l'artisan n'a joint aucune photo. Avec une photo, dis ce qu'elle montre : « liste » (liste de matériaux écrite, bon de commande, note manuscrite), « devis » (devis ou facture), « chantier » (toiture, façade, ouvrage, matériau en place ou posé au sol), « autre » (rien d'utile).",
  "- Photo « liste » ou « devis » : ne recopie rien ; rends « lignes » et « questions » vides : le document sera lu à part.",
  "- Photo « chantier » : nomme seulement les matériaux que tu reconnais avec certitude (ardoise, tuile, bac acier, zinc, gouttière, descente, solin, fenêtre de toit…), un par ligne, SANS quantité et SANS dimension : une photo ne donne ni mesure ni quantité. Si tu hésites entre deux matériaux, ne le nomme pas : pose la question. Dans « message », dis en une phrase ce que tu vois.",
  "- Après une photo « chantier », tes questions (trois au plus) demandent d'abord ce que l'artisan veut faire (refaire, réparer, quelle partie), puis les formats et les mesures qu'il connaît (surface de couverture, longueur de gouttière, format de l'ardoise).",
  "« message » : une phrase courte au tutoiement, ou une chaîne vide. Réponds seulement avec le JSON demandé.",
].join("\n");

export const NATURES_ASSISTANT = ["texte", "chantier", "liste", "devis", "autre"] as const;
export type NatureAssistant = (typeof NATURES_ASSISTANT)[number];

export interface AssistantIaWire {
  nature: NatureAssistant;
  lignes: { designation: string; quantite: string | null; unite: string | null }[];
  questions: { texte: string; choix: string[] }[];
  message: string;
}

/** Un échange de la conversation en cours (ce que l'artisan a dit, les questions posées). */
export interface EchangeAssistant {
  /** « photo » : ce que le code a retenu d'une photo de chantier déjà analysée (les matériaux vus), rendu par le serveur. */
  de: "artisan" | "assistant" | "photo";
  texte: string;
}

export interface LigneAssistantIa {
  libelle: string;
  quantite: string | null;
  unite: string | null;
  /** Vu sur une photo de chantier, jamais dit par l'artisan : à confirmer. */
  vuSurPhoto?: boolean;
}

export interface ResultatAssistantIa {
  /** Ce que montre la photo jointe (« texte » sans photo). */
  nature: NatureAssistant;
  lignes: LigneAssistantIa[];
  questions: { texte: string; choix: string[] }[];
  message: string;
  /** Les lignes du modèle que le code a écartées (nombre non dit, aucun mot de l'artisan). */
  ecartees: number;
}

/** Le message envoyé au modèle : la conversation, dans l'ordre. */
export function assistantIaDossier(echanges: readonly EchangeAssistant[]): string {
  return echanges
    .slice(-12)
    .map((e) => `${e.de === "artisan" ? "ARTISAN" : e.de === "photo" ? "PHOTO DE CHANTIER DÉJÀ VUE (matériaux reconnus)" : "VENDEUR"} : ${e.texte.slice(0, 1500)}`)
    .join("\n");
}

const MOTS_NOMBRES: Readonly<Record<string, number>> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, mille: 1000,
};

const aPlat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Les nombres DITS par l'artisan : en chiffres (« 1 000 », « 0,65 », « 32 22 », « 32x22 ») ou en lettres simples. */
export function nombresDits(texte: string): Set<number> {
  const t = aPlat(texte).replace(/(?<![\d,.])(\d{1,3})(?:[   ](\d{3}))+(?!\d)/g, (m) => m.replace(/[   ]/g, ""));
  const dits = new Set<number>();
  for (const m of t.match(/\d+(?:[.,]\d+)?/g) ?? []) dits.add(Number(m.replace(",", ".")));
  for (const m of t.match(/[a-z]+/g) ?? []) if (m in MOTS_NOMBRES) dits.add(MOTS_NOMBRES[m]!);
  return dits;
}

const nombresDe = (s: string) => (aPlat(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(",", ".")));
const VIDES = new Set(["pour", "avec", "sans", "dans", "sous", "naturel", "naturelle", "premier", "choix", "piece", "pieces", "rouleau", "rouleaux"]);
const motsDe = (s: string) => (aPlat(s).match(/[a-z]{4,}/g) ?? []).filter((m) => !VIDES.has(m));
/** Deux mots se ressemblent : même début (4 lettres), comme « gouttieres » et « gouttiere », « ardoise » et « ardoises ». */
const proches = (a: string, b: string) => a.slice(0, 4) === b.slice(0, 4);

/**
 * Revalide la sortie du modèle : seul ce qui passe les règles du code devient une ligne ou une question. `echanges` : toute
 * la conversation en cours ; seuls les messages de l'ARTISAN comptent pour « dit ».
 */
export function validerAssistantIa(echanges: readonly EchangeAssistant[], wire: AssistantIaWire, o: { photo?: boolean } = {}): ResultatAssistantIa {
  // Sans photo jointe, la nature est « texte », quoi que dise le modèle ; avec une photo, jamais « texte ».
  const nature: NatureAssistant = o.photo ? (wire.nature === "texte" ? "autre" : wire.nature) : "texte";
  // Une liste ou un devis en photo : rien n'est recopié ici, le document part à la lecture de document.
  if (nature === "liste" || nature === "devis" || nature === "autre") return { nature, lignes: [], questions: [], message: wire.message.replace(/\s+/g, " ").trim().slice(0, 300), ecartees: 0 };
  // Les matériaux vus sur une photo de chantier (celle-ci, ou une précédente de la conversation) comptent comme nommés.
  const vus = motsDe(echanges.filter((e) => e.de === "photo").map((e) => e.texte).join(" "));
  const dit = echanges
    .filter((e) => e.de === "artisan")
    .map((e) => e.texte)
    .join(" \n ");
  // Un choix proposé par le vendeur puis repris par l'artisan (« 33 ») est dit par l'artisan : seul son texte compte.
  const nombres = nombresDits(dit);
  const mots = motsDe(dit);
  const lignes: LigneAssistantIa[] = [];
  let ecartees = 0;
  for (const l of wire.lignes.slice(0, 40)) {
    const libelle = l.designation.replace(/\s+/g, " ").trim().slice(0, 160);
    if (libelle.length < 2 || !/[a-zà-ü]/i.test(libelle)) {
      ecartees++;
      continue;
    }
    // Un nombre de la désignation que l'artisan n'a pas dit : la ligne est écartée (jamais un format inventé).
    if (nombresDe(libelle).some((n) => !nombres.has(n))) {
      ecartees++;
      continue;
    }
    // Aucun mot de l'artisan : un article qu'il n'a pas dit. (Un mot corrigé garde son début : « Lito » → « liteaux » passe par
    // les trois premières lettres quand le mot dit est court.)
    const ms = motsDe(libelle);
    const repris = ms.some((m) => mots.some((d) => proches(m, d))) || ms.some((m) => new RegExp(`\\b${m.slice(0, 3)}`).test(aPlat(dit)));
    const vu = !repris && (o.photo === true || ms.some((m) => vus.some((d) => proches(m, d))));
    if (!repris && !vu) {
      ecartees++;
      continue;
    }
    const q = l.quantite === null ? NaN : Number(String(l.quantite).replace(/\s/g, "").replace(",", "."));
    const quantite = Number.isFinite(q) && q > 0 && nombres.has(q) ? String(q).replace(".", ",") : null;
    const unite = quantite && l.unite ? l.unite.trim().slice(0, 20) || null : null;
    lignes.push({ libelle, quantite, unite, ...(vu ? { vuSurPhoto: true } : {}) });
  }
  const questions = wire.questions
    .map((q) => ({ texte: q.texte.replace(/\s+/g, " ").trim().slice(0, 200), choix: q.choix.map((c) => c.replace(/\s+/g, " ").trim().slice(0, 60)).filter(Boolean).slice(0, 6) }))
    // Jamais une question d'adresse, de date ou de prix : elles se règlent ailleurs.
    .filter((q) => q.texte.length >= 4 && !/\b(adresse|prix|tarif|livraison|livre|quand)\b/.test(aPlat(q.texte)))
    .slice(0, 3);
  return { nature, lignes, questions, message: wire.message.replace(/\s+/g, " ").trim().slice(0, 300), ecartees };
}

/**
 * Le coût estimé d'un message (pour le dire à Greg AVANT d'allumer) : environ 700 jetons de consigne, la conversation
 * (≈ 1 jeton pour 3,5 caractères), 60 jetons de sortie par ligne et par question. Le prix vient de la grille du domaine.
 */
export function jetonsEstimesAssistant(longueurConversation: number, nbLignes: number): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Math.ceil(700 + longueurConversation / 3.5), outputTokens: Math.ceil(60 + 60 * nbLignes) };
}
