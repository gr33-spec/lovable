/**
 * L'ASSISTANT MOBIIZ (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
 * interactif », points 2, 3, 11 et 13 ; `docs/assistant-mobiiz.md`). Tout est du CODE, aucun appel IA (point 14 : aucune
 * relecture par message, aucun crédit) :
 * - `questionsAssistant` : les questions courtes qui restent, par priorité, jamais une donnée déjà connue, jamais une
 *   quantité (règle « jamais une quantité demandée ») ;
 * - `interpreter` : ce que l'artisan écrit ou dicte devient des consignes (ajouter, retirer, changer une quantité,
 *   adresse, livraison, « je ne sais pas », « passer »), plusieurs dans un même message ; une quantité n'existe que si
 *   l'artisan l'a dite (règle numéro un : rien d'inventé) ; ce qui n'est pas compris le reste, et se dit.
 * Fichier sans dépendance : le site l'importe tel quel.
 */

export interface LigneAssistant {
  cle: string;
  libelle: string;
}

export type CleQuestion = "adresse" | "livraison" | "date";

export interface QuestionAssistant {
  cle: CleQuestion;
  texte: string;
  /** Réponses en un tap ; la saisie libre et « Passer » restent toujours là. */
  choix: string[];
}

export interface EtatAssistant {
  adresse: string | null;
  livraison: string | null;
  /** Les questions que l'artisan a passées (« Passer », « Je ne sais pas ») : jamais reposées. */
  passees: readonly CleQuestion[];
}

export const LIVRAISON_CHANTIER = "Livraison sur le chantier";
export const RETRAIT_DEPOT = "Retrait au dépôt";
const DATES = ["Dès que possible", "Cette semaine", "La semaine prochaine"];

/** Les questions qui restent, dans l'ordre : où, livré ou retiré, quand. */
export function questionsAssistant(e: EtatAssistant): QuestionAssistant[] {
  const q: QuestionAssistant[] = [];
  if (!e.adresse && !e.passees.includes("adresse")) q.push({ cle: "adresse", texte: "Adresse du chantier ?", choix: [] });
  if (!e.livraison && !e.passees.includes("livraison")) q.push({ cle: "livraison", texte: "Souhaites-tu une livraison ?", choix: ["Oui, sur le chantier", "Non, je passe au dépôt"] });
  if (e.livraison?.startsWith(LIVRAISON_CHANTIER) && !aUneDate(e.livraison) && !e.passees.includes("date")) q.push({ cle: "date", texte: "Pour quand ?", choix: DATES });
  return q;
}

/** Le premier message : ce qui est prêt, ce qui reste à vérifier, et toutes les questions d'un coup. */
export function messageOuverture(nbLignes: number, aVerifier: number, questions: readonly { texte: string }[]): string {
  const liste = `Ta liste est prête : ${nbLignes} ligne${nbLignes > 1 ? "s" : ""}${aVerifier > 0 ? `, dont ${aVerifier} à vérifier` : ""}.`;
  if (questions.length === 0) return `${liste} Je n'ai rien à te demander : tu peux relire le PDF et l'envoyer.`;
  // Toutes dans un seul message ; au-delà de quatre, le compte (les cartes les montrent toutes).
  const dites = questions.slice(0, 4).map((x) => x.texte).join(" ");
  const autres = questions.length > 4 ? ` Et ${questions.length - 4} autre${questions.length > 5 ? "s" : ""}, plus bas.` : "";
  return `${liste} Pour ta demande de prix, ${questions.length === 1 ? "une question" : `${questions.length} questions`} : ${dites}${autres} Tu peux répondre à tout d'un coup, ou passer.`;
}

export type Consigne =
  | { type: "ajouter"; libelle: string; quantite: string | null; unite: string | null }
  | { type: "retirer"; cle: string; libelle: string }
  | { type: "quantite"; cle: string; libelle: string; quantite: string; unite: string | null }
  | { type: "adresse"; texte: string }
  | { type: "livraison"; texte: string }
  | { type: "date"; texte: string }
  | { type: "ne_sait_pas" }
  | { type: "passer" }
  | { type: "annuler" }
  | { type: "ambigu"; texte: string; candidats: LigneAssistant[] }
  | { type: "incompris"; texte: string };

const UNITES = [
  "pièces?", "pcs", "u", "unités?", "m²", "m2", "m³", "m3", "ml", "m", "mètres?(?: linéaires?)?", "metres?", "kg", "kilos?", "l", "litres?",
  "sacs?", "rouleaux?", "palettes?", "boîtes?", "boites?", "bottes?", "plaques?", "seaux?", "cartouches?", "tubes?", "longueurs?", "barres?",
  "paquets?", "bidons?", "pots?", "feuilles?", "panneaux?", "tonnes?", "t", "carton?s?", "colis",
].join("|");
const NOMBRE = "\\d+(?:[.,]\\d+)?";
const MOTS_NOMBRES: Record<string, string> = { un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9", dix: "10", douze: "12", vingt: "20", cinquante: "50", cent: "100" };

/** Minuscules, sans accent, apostrophes droites, espaces simples. */
export function normaliser(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** « un sac » → « 1 sac » : seulement les nombres écrits en tête de groupe, jamais ailleurs. */
function chiffres(t: string): string {
  return t.replace(new RegExp(`(^|\\s)(${Object.keys(MOTS_NOMBRES).join("|")})(?=\\s)`, "gi"), (_, a: string, m: string) => `${a}${MOTS_NOMBRES[m.toLowerCase()]}`);
}

const VIDES = new Set(["le", "la", "les", "l", "de", "des", "du", "d", "un", "une", "pour", "en", "a", "au", "aux", "et", "mon", "ma", "mes", "ton", "ta", "tes", "ce", "cette", "ces", "sur"]);
function mots(t: string): string[] {
  return normaliser(t)
    .replace(/[^a-z0-9×x]+/g, " ")
    .split(" ")
    .filter((w) => w && !VIDES.has(w))
    .map((w) => (w.length > 3 ? w.replace(/(s|x)$/, "") : w));
}

/** La ligne visée par des mots (« les liteaux », « ligne 3 ») : une seule, sinon les candidates, sinon rien. */
export function ligneVisee(cible: string, lignes: readonly LigneAssistant[]): { ligne: LigneAssistant } | { candidats: LigneAssistant[] } | null {
  const n = /^(?:la )?ligne (\d+)$/.exec(normaliser(cible));
  if (n) {
    const l = lignes[Number(n[1]) - 1];
    return l ? { ligne: l } : null;
  }
  const q = mots(cible);
  if (q.length === 0) return null;
  const notes = lignes.map((l) => {
    const m = mots(l.libelle);
    const trouves = q.filter((w) => m.some((x) => x === w || (w.length >= 4 && (x.startsWith(w) || w.startsWith(x)) && Math.min(x.length, w.length) >= 4)));
    // Le nom de tête compte double : « les ardoises » vise l'ardoise, pas le crochet d'ardoise.
    const tete = m[0] !== undefined && q.some((w) => w === m[0] || (w.length >= 4 && m[0]!.length >= 4 && (m[0]!.startsWith(w) || w.startsWith(m[0]!))));
    return { l, score: trouves.length + (tete ? 0.5 : 0) };
  });
  const max = Math.max(0, ...notes.map((x) => x.score));
  if (max < 1 || Math.floor(max) < Math.ceil(q.length / 2)) return null;
  const meilleures = notes.filter((x) => x.score === max).map((x) => x.l);
  return meilleures.length === 1 ? { ligne: meilleures[0]! } : { candidats: meilleures };
}

/** « 10 sacs de colle C2 » → quantité, unité, désignation ; « colle C2 x10 » aussi ; sans nombre : la désignation seule. */
export function lireArticle(texte: string): { libelle: string; quantite: string | null; unite: string | null } {
  const t = chiffres(texte.trim()).replace(/\s+/g, " ");
  const devant = new RegExp(`^(${NOMBRE})\\s*(${UNITES})?\\s+(?:de |d'|d’)?(.+)$`, "i").exec(t);
  if (devant) return { libelle: propre(devant[3]!), quantite: devant[1]!.replace(".", ","), unite: devant[2] ? uniteCourte(devant[2]) : null };
  const derriere = new RegExp(`^(.+?)\\s*(?:[:×x*]\\s*)?(${NOMBRE})\\s*(${UNITES})?$`, "i").exec(t);
  if (derriere && /[a-z]/i.test(derriere[1]!)) return { libelle: propre(derriere[1]!), quantite: derriere[2]!.replace(".", ","), unite: derriere[3] ? uniteCourte(derriere[3]) : null };
  return { libelle: propre(t), quantite: null, unite: null };
}

function propre(t: string): string {
  const s = t.replace(/^(?:(?:de la|du|des|les?|la)\s+|(?:de l'|l'|d'))/i, "").replace(/[.\s]+$/, "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniteCourte(u: string): string {
  const n = normaliser(u);
  if (/^(m2|m²)$/.test(n)) return "m²";
  if (/^(m3|m³)$/.test(n)) return "m³";
  if (/^(ml|m|metres?( lineaires?)?)$/.test(n)) return "m";
  if (/^(u|unites?|pcs|pieces?)$/.test(n)) return "pièces";
  if (/^(kilos?)$/.test(n)) return "kg";
  if (/^(l|litres?)$/.test(n)) return "litres";
  return u;
}

const AJOUT = /^(?:\+|ajoute|ajouter|ajoutes|rajoute|rajouter|il me faut|il faut|j'ai besoin d[e']|j'ai besoin|prevois|prevoir|mets en plus|ajoute aussi)\s*/;
const RETRAIT = /^(?:retire|retirer|retires|enleve|enlever|enleves|supprime|supprimer|supprimes|vire|virer|pas besoin d[e']|pas de|plus de|sans)\s*/;
const CHANGE = /^(?:mets|met|mettre|passe|passer|change|changer|modifie|modifier|corrige|corriger)\s+/;

/** Un morceau de phrase. */
function uneConsigne(brut: string, lignes: readonly LigneAssistant[], attendu: CleQuestion | null): Consigne {
  const n = normaliser(brut);
  if (/^(passer|passe|je passe|skip|plus tard|on verra|suivant)$/.test(n)) return { type: "passer" };
  if (/^(annuler|annule|reviens en arriere|defaire)$/.test(n)) return { type: "annuler" };
  if (/(je (ne )?(le )?sais pas|aucune idee|je sais plus|pas encore|je ne sais pas encore)/.test(n)) return { type: "ne_sait_pas" };

  // La livraison et sa date se reconnaissent partout ; l'adresse, à sa question ou avec un code postal.
  if (/(livr|retrait|enlevement|au depot|je passe (le |les )?(prendre|chercher)|je recupere|a emporter)/.test(n) || (attendu === "livraison" && /^(oui|non)\b/.test(n))) {
    const depot = /(retrait|au depot|je passe|je recupere|a emporter|^non)/.test(n) && !/livraison sur/.test(n);
    const date = dateDite(brut);
    return { type: "livraison", texte: depot ? RETRAIT_DEPOT : `${LIVRAISON_CHANTIER}${date ? `, ${date}` : ""}` };
  }
  if (attendu === "date" && dateDite(brut)) return { type: "date", texte: dateDite(brut)! };
  const adresse = /^(?:l'?adresse|adresse)(?: du chantier)?\s*(?:est|:|,)?\s*(.+)$/i.exec(brut.trim());
  if (adresse) return { type: "adresse", texte: adresse[1]!.trim() };
  if (/\b\d{5}\b/.test(n) && !/^(\+|ajoute|retire|mets|met|change)/.test(n)) return { type: "adresse", texte: brut.trim() };

  const ajout = AJOUT.exec(n);
  if (ajout) {
    const a = lireArticle(brut.trim().slice(ajout[0].length));
    return a.libelle ? { type: "ajouter", ...a } : { type: "incompris", texte: brut.trim() };
  }
  const retrait = RETRAIT.exec(n);
  if (retrait) {
    const cible = brut.trim().slice(retrait[0].length);
    const v = ligneVisee(cible, lignes);
    if (!v) return { type: "incompris", texte: brut.trim() };
    return "ligne" in v ? { type: "retirer", cle: v.ligne.cle, libelle: v.ligne.libelle } : { type: "ambigu", texte: brut.trim(), candidats: v.candidats };
  }

  // Une quantité : « passe les liteaux à 200 m », « mets 12 ardoises », « 12 au lieu de 10 pour les ardoises », « ardoises : 1300 ».
  const t = chiffres(brut.trim());
  // Chaque forme rend [cible, quantité, unité].
  const formes: [RegExp, (m: RegExpExecArray) => [string, string, string | undefined]][] = [
    [new RegExp(`^(?:mets|met|mettre|passe|passer|change|changer|modifie|modifier|corrige|corriger)\\s+(.+?)\\s+(?:a|à|en|sur)\\s+(${NOMBRE})\\s*(${UNITES})?$`, "i"), (m) => [m[1]!, m[2]!, m[3]]],
    [new RegExp(`^(?:mets|met|mettre|passe|passer|change|changer)?\\s*(${NOMBRE})\\s*(${UNITES})?\\s+(?:au lieu de\\s+${NOMBRE}\\s*(?:${UNITES})?\\s+)?(?:pour|de|d'|d’)\\s*(.+)$`, "i"), (m) => [m[3]!, m[1]!, m[2]]],
    [new RegExp(`^(?:mets|met|mettre|passe|passer|change|changer)\\s+(${NOMBRE})\\s*(${UNITES})?\\s+(.+)$`, "i"), (m) => [m[3]!, m[1]!, m[2]]],
    [new RegExp(`^(.+?)\\s*[:=]\\s*(${NOMBRE})\\s*(${UNITES})?$`, "i"), (m) => [m[1]!, m[2]!, m[3]]],
  ];
  for (const [re, lire] of formes) {
    const m = re.exec(t);
    if (!m) continue;
    const [cible, quantite, unite] = lire(m);
    const v = ligneVisee(cible, lignes);
    if (v && "ligne" in v) return { type: "quantite", cle: v.ligne.cle, libelle: v.ligne.libelle, quantite: quantite.replace(".", ","), unite: unite ? uniteCourte(unite) : null };
    if (v) return { type: "ambigu", texte: brut.trim(), candidats: v.candidats };
  }
  // « mets 10 sacs de colle » sans ligne de colle : c'est un ajout, avec la quantité dite.
  const change = CHANGE.exec(n);
  if (change) {
    const a = lireArticle(t.slice(change[0].length));
    if (a.quantite && a.libelle) return { type: "ajouter", ...a };
  }
  if (attendu === "adresse" && /[a-z]/i.test(n) && n.length >= 4) return { type: "adresse", texte: brut.trim() };
  return { type: "incompris", texte: brut.trim() };
}

/** « demain », « lundi », « le 12 novembre », « semaine prochaine », « dès que possible » : tels que dits. */
export function dateDite(t: string): string | null {
  const n = normaliser(t);
  const m =
    /\b(des que possible|au plus vite|asap|aujourd'hui|demain|apres-demain|cette semaine|la semaine prochaine|semaine prochaine|en fin de semaine|fin de semaine|debut de semaine prochaine)\b/.exec(n) ??
    /\b((?:lundi|mardi|mercredi|jeudi|vendredi|samedi)(?: \d{1,2}(?: [a-z]+)?)?(?: matin| apres-midi)?)\b/.exec(n) ??
    /\b(le \d{1,2}(?:er)?(?: (?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre))?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/.exec(n);
  if (!m) return null;
  // Le texte d'origine (accents compris) à la même place.
  const i = n.indexOf(m[1]!);
  const orig = t.trim().normalize("NFC");
  const brut = orig.length === n.length ? orig.slice(i, i + m[1]!.length) : m[1]!;
  return brut === "asap" ? "dès que possible" : brut;
}

function aUneDate(livraison: string): boolean {
  return /, .+$/.test(livraison.slice(LIVRAISON_CHANTIER.length));
}

/**
 * Un message entier : chaque consigne qu'il contient, dans l'ordre (« retire les vis, ajoute 10 sacs de colle et passe les
 * liteaux à 200 m » = trois consignes). `attendu` : la question en cours, pour une réponse courte (« oui », « Lannion »).
 */
export function interpreter(message: string, lignes: readonly LigneAssistant[], attendu: CleQuestion | null = null): Consigne[] {
  const morceaux = message
    .split(/\n|;|\.(?=\s|$)|,(?=\s*(?:et\s+)?(?:\+|ajoute|rajoute|retire|enl[eè]ve|supprime|vire|mets|met|passe|change|modifie|corrige|livr|retrait|l'adresse|adresse|il me faut|pas de|plus de|je ne sais|je sais pas|demain|lundi|mardi|mercredi|jeudi|vendredi))|\s+et\s+(?=(?:\+|ajoute|rajoute|retire|enl[eè]ve|supprime|vire|mets|met|passe|change|modifie|corrige|livr|retrait|l'adresse|il me faut|pas de|plus de)\b)/i)
    .map((m) => m.trim())
    .filter(Boolean);
  const out: Consigne[] = [];
  let enCours = attendu;
  for (const m of morceaux) {
    const c = uneConsigne(m, lignes, enCours);
    out.push(c);
    // Après une réponse à une question, la suivante peut venir dans le même message (« oui, demain »).
    if (c.type === "livraison" && c.texte === LIVRAISON_CHANTIER) enCours = "date";
    else if (c.type === "adresse") enCours = "livraison";
  }
  // « oui, demain » : la date rejoint la livraison.
  const fusion: Consigne[] = [];
  for (const c of out) {
    const prev = fusion.at(-1);
    if (c.type === "date" && prev?.type === "livraison" && prev.texte === LIVRAISON_CHANTIER) prev.texte = `${LIVRAISON_CHANTIER}, ${c.texte}`;
    else fusion.push(c);
  }
  return fusion;
}

/** La réponse de l'assistant, courte : ce qui est fait, ce qui ne l'est pas. */
export function resumeConsignes(cs: readonly Consigne[]): string {
  const faits: string[] = [];
  const doutes: string[] = [];
  for (const c of cs) {
    if (c.type === "ajouter") faits.push(`ajouté « ${c.libelle} »${c.quantite ? `, ${c.quantite}${c.unite ? ` ${c.unite}` : ""}` : " (quantité à préciser)"}`);
    else if (c.type === "retirer") faits.push(`retiré « ${c.libelle} »`);
    else if (c.type === "quantite") faits.push(`« ${c.libelle} » passe à ${c.quantite}${c.unite ? ` ${c.unite}` : ""}`);
    else if (c.type === "adresse") faits.push(`adresse notée : ${c.texte}`);
    else if (c.type === "livraison") faits.push(c.texte === RETRAIT_DEPOT ? "retrait au dépôt noté" : `noté : ${c.texte.charAt(0).toLowerCase()}${c.texte.slice(1)}`);
    else if (c.type === "date") faits.push(`date notée : ${c.texte}`);
    else if (c.type === "ambigu") doutes.push(`« ${c.texte} » : laquelle ? ${c.candidats.map((x) => x.libelle).join(" ou ")}`);
    else if (c.type === "incompris") doutes.push(`je n'ai pas compris « ${c.texte} »`);
  }
  const phrase = faits.length ? `C'est fait : ${faits.join(", ")}.` : "";
  const doute = doutes.length ? `${doutes.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(". ")}. Dis-le autrement, ou touche la ligne dans le PDF.` : "";
  return [phrase, doute].filter(Boolean).join(" ") || "C'est noté.";
}

/**
 * « DÉCRIS TON CHANTIER » (Greg, 31 octobre 2026, point 1) : une description écrite ou dictée devient des lignes de liste.
 * RÈGLE NUMÉRO UN : seulement ce que l'artisan a dit ; une quantité n'existe que si elle est dite (« 40 m² de placo »).
 * Un morceau sans quantité est rendu à part (`aConfirmer`) : l'artisan le coche s'il s'agit bien d'un matériau, sinon il
 * ne devient rien (« je refais la salle de bain » n'est pas une fourniture). Aucun appel IA.
 */
export interface LigneDecrite {
  libelle: string;
  quantite: string | null;
  unite: string | null;
}

const VERBES_DE_CHANTIER = /^(?:je|j'|on|il faut|il me faut|faut|prevoir|prevois|pour|avec|plus|et|puis|aussi|ensuite|alors|donc)\b\s*(?:(?:vais|va|dois|doit|refais|refait|fais|fait|pose|poser|change|changer|remplace|remplacer|mets|mettre|ai besoin d[e']|aurai besoin d[e']|prends|prendre|commande|commander)\s*)?/;

export function lireDescription(texte: string): { lignes: LigneDecrite[]; aConfirmer: LigneDecrite[] } {
  const morceaux = texte
    .split(/\n|;|\.(?=\s|$)|,|\s+et\s+(?=\d|un\b|une\b|des\b|du\b|de la\b)|\s+(?:puis|plus|avec)\s+(?=\d)/i)
    .map((m) => m.trim())
    .filter((m) => m.length >= 2);
  const lignes: LigneDecrite[] = [];
  const aConfirmer: LigneDecrite[] = [];
  for (const brut of morceaux) {
    // « je vais poser 40 m² de placo » → « 40 m² de placo » : les mots de la phrase avant la quantité tombent.
    const n = normaliser(brut);
    const verbe = VERBES_DE_CHANTIER.exec(n);
    const reste = verbe && verbe[0].length > 0 ? brut.trim().slice(verbe[0].length).trim() : brut.trim();
    // Un nombre en chiffres : dit, la ligne est sûre. Un nombre en lettres (« un WC », « une salle de bain ») : proposé, à
    // cocher par l'artisan (« une salle de bain » n'est pas une fourniture).
    const enChiffres = new RegExp(`(^|\\s)${NOMBRE}\\s*(?:${UNITES})?\\s+(?:de |d'|d’)?\\S`, "i").exec(reste);
    if (enChiffres) {
      const a = lireArticle(reste.slice(enChiffres.index).trim());
      if (a.libelle && a.quantite) {
        lignes.push(a);
        continue;
      }
    }
    const enLettres = new RegExp(`(^|\\s)${NOMBRE}\\s*(?:${UNITES})?\\s+(?:de |d'|d’)?\\S`, "i").exec(chiffres(` ${reste}`).trim());
    if (enLettres) {
      const a = lireArticle(chiffres(` ${reste}`).trim().slice(enLettres.index).trim());
      if (a.libelle && a.quantite) {
        aConfirmer.push(a);
        continue;
      }
    }
    const sans = lireArticle(reste);
    if (sans.libelle && /[a-z]/i.test(sans.libelle) && sans.libelle.length <= 120) aConfirmer.push({ libelle: sans.libelle, quantite: null, unite: null });
  }
  return { lignes, aConfirmer };
}

/**
 * LES QUESTIONS DU DOCUMENT (Greg, 31 octobre 2026, contrôle de conformité, point 2) : l'assistant ne pose pas une liste
 * générique. Il reprend, ligne par ligne, ce que le moteur sait déjà manquer DANS CE DOCUMENT :
 * - `asks` (§49.8) : la donnée qui manque au calcul ou le défaut à confirmer (pente, développé, Ø…) ; une même question
 *   partagée par plusieurs lignes n'est posée qu'une fois (une réponse les règle toutes) ;
 * - `aPreciserPourGroupe` : ce que le comptoir demanderait sur la ligne (format, origine et choix d'une ardoise, matière et
 *   longueur d'un crochet, marque et teinte d'une tuile…), seulement quand la désignation ne le dit pas déjà.
 * Une ligne déjà précise n'a aucune question ; un document complet n'en a aucune.
 */
export interface ItemPourQuestions {
  key: string;
  label: string;
  asks?: readonly { key: string; text: string; unit: string | null; options: readonly { label: string; value: string }[] }[];
  aPreciserPourGroupe?: readonly { cle: string; question: string; options: readonly string[] }[];
}

export interface QuestionLigne {
  /** Identifiant stable de la question (pour « Passer »). */
  id: string;
  /** La ligne visée (son nom affiché), ou plusieurs quand la question est partagée. */
  lignes: string[];
  itemKeys: string[];
  texte: string;
  choix: { libelle: string; valeur: string }[];
  /** `reponse` : une réponse du moteur (clé, unité) ; `precision` : la réponse s'écrit dans la désignation. */
  sorte: { type: "reponse"; cle: string; unite: string | null } | { type: "precision"; cle: string };
}

const sansPoint = (t: string) => t.replace(/\s*\?\s*$/, "").trim();
const minuscule = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

export function questionsDuDocument(items: readonly ItemPourQuestions[]): QuestionLigne[] {
  const parReponse = new Map<string, QuestionLigne>();
  const precisions: QuestionLigne[] = [];
  for (const it of items) {
    for (const a of it.asks ?? []) {
      const deja = parReponse.get(a.key);
      if (deja) {
        deja.lignes.push(it.label);
        deja.itemKeys.push(it.key);
        continue;
      }
      parReponse.set(a.key, { id: `reponse:${a.key}`, lignes: [it.label], itemKeys: [it.key], texte: sansPoint(a.text), choix: a.options.map((o) => ({ libelle: o.label, valeur: o.value })), sorte: { type: "reponse", cle: a.key, unite: a.unit } });
    }
    for (const q of it.aPreciserPourGroupe ?? [])
      precisions.push({ id: `precision:${it.key}:${q.cle}`, lignes: [it.label], itemKeys: [it.key], texte: minuscule(sansPoint(q.question)), choix: q.options.map((o) => ({ libelle: o, valeur: o })), sorte: { type: "precision", cle: q.cle } });
  }
  // Ce qui bloque le calcul d'abord, puis les précisions du comptoir.
  return [...parReponse.values(), ...precisions];
}

/** Le texte d'une question de ligne, tel que l'assistant le dit : « Crochet ardoise : matière ? ». */
export function texteQuestionLigne(q: QuestionLigne): string {
  const ligne = q.lignes.length > 1 ? `${q.lignes[0]} (et ${q.lignes.length - 1} autre${q.lignes.length > 2 ? "s" : ""})` : q.lignes[0];
  return q.sorte.type === "reponse" ? `${ligne} : ${minuscule(q.texte)} ?` : `${ligne} : ${q.texte} ?`;
}

const formeOption = (t: string) =>
  normaliser(t)
    .replace(/[×*]/g, "x")
    .replace(/°|degres?/g, "")
    .replace(/ø/g, "")
    .replace(/[^a-z0-9x,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Une réponse libre aux questions du document (« naturelles, crochets inox de 100 mm, marque Edilians ») : chaque morceau
 * qui contient UN choix proposé répond aux questions qui l'offrent ; quand le morceau nomme une ligne, seulement à elle.
 * Rien n'est deviné : un morceau sans choix reconnu n'est pas une réponse (il passe à l'interprète des consignes).
 */
export function reponsesLibres(message: string, questions: readonly QuestionLigne[]): { reponses: { question: QuestionLigne; valeur: string; libelle: string }[]; reste: string[] } {
  // La virgule décimale (« 2,8×40 », « 0,65 mm ») ne coupe pas un morceau.
  const morceaux = message
    .split(/\n|;|\.(?=\s|$)|,(?!\d)|\s+et\s+/i)
    .map((m) => m.trim())
    .filter(Boolean);
  const reponses: { question: QuestionLigne; valeur: string; libelle: string }[] = [];
  const reste: string[] = [];
  const dejaRepondues = new Set<string>();
  for (const m of morceaux) {
    const f = ` ${formeOption(m)} `;
    const trouvees: { question: QuestionLigne; choix: { libelle: string; valeur: string } }[] = [];
    for (const q of questions) {
      if (dejaRepondues.has(q.id)) continue;
      // Le choix le plus long d'abord (« 1er choix » avant « choix »), mot entier.
      const c = [...q.choix].sort((a, b) => b.libelle.length - a.libelle.length).find((o) => formeOption(o.libelle).length > 0 && f.includes(` ${formeOption(o.libelle)} `));
      if (c) trouvees.push({ question: q, choix: c });
    }
    if (trouvees.length === 0) {
      reste.push(m);
      continue;
    }
    // Le morceau nomme-t-il une ligne ? Alors seulement ses questions.
    const nommees = trouvees.filter((t) => t.question.lignes.some((l) => ligneVisee(m, [{ cle: "x", libelle: l }]) !== null));
    for (const t of nommees.length > 0 ? nommees : trouvees) {
      reponses.push({ question: t.question, valeur: t.choix.valeur, libelle: t.choix.libelle });
      dejaRepondues.add(t.question.id);
    }
  }
  return { reponses, reste };
}

/** « Espagne et 1er choix pour « Ardoise naturelle 32×22 », développé de la gouttière 33 » : les réponses, par ligne. */
export function resumeReponses(reponses: readonly { question: QuestionLigne; libelle: string }[]): string {
  const parLigne = new Map<string, string[]>();
  for (const r of reponses) {
    const ligne = r.question.lignes[0]!;
    const dit = r.question.sorte.type === "reponse" ? `${minuscule(r.question.texte)} : ${r.libelle}` : r.libelle;
    parLigne.set(ligne, [...(parLigne.get(ligne) ?? []), dit]);
  }
  return [...parLigne.entries()].map(([l, v]) => `${v.length > 1 ? `${v.slice(0, -1).join(", ")} et ${v.at(-1)}` : v[0]} pour « ${l} »`).join(", ");
}
