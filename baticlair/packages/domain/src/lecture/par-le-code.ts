import type { ParamDef, Referential, Slot, WorkItemType } from "../referential/model.js";
import { normalizeText } from "../trades/trade-profile.js";
import { withoutLabour } from "../trust/marchandise.js";
import type { LectureDevis, LectureFourniture, LectureLigne } from "./lecture.js";

/**
 * LE MÊME DEVIS DONNE TOUJOURS LA MÊME LISTE ET LES MÊMES QUESTIONS (Greg, 20 novembre 2026, D-2026-024 lu trois fois,
 * trois listes) : « Les questions sont décidées par le code à partir de la fiche métier (ce que le négoce exige pour chaque
 * ligne), pas par la lecture IA. Toute ligne "à chiffrer" vient obligatoirement avec la question qui la débloque. »
 *
 * Le modèle lit les lignes du devis (repère, texte, quantité, unité) : c'est ce qu'il fait de façon stable. Tout le reste
 * est décidé ici, par le code, à partir des mots de la fiche du métier :
 * - l'ouvrage d'une ligne : la famille de la fiche dont les mots sont dans son titre (avant « : »), sinon dans son texte ;
 * - ses articles : l'emplacement mesuré par la ligne, plus ceux dont les mots sont écrits sur la ligne ;
 * - ses données écrites : « bacs de 4 m », « Ø125 », « pour les 2 côtés », d'après les mots de chaque donnée (`textLabels`,
 *   `textValues`) ;
 * - et les questions : celles que le calcul réclame ; une question du modèle n'est gardée que si elle porte sur une donnée
 *   de la fiche, avec les mots et les boutons de la fiche (voir `ecranDeLecture`).
 * Une ligne dont aucun mot n'est dans la fiche garde la lecture du modèle, telle qu'écrite.
 */
export function lectureParLeCode(ref: Referential, lecture: LectureDevis): LectureDevis {
  if (ref.workItems.length === 0) return lecture;
  const lignes = lecture.lignes.map((l) => sansMesureEnPieces(ref, ligneParLeCode(ref, l, lecture.lignes)));
  return { ...lecture, lignes };
}

/** Les mots, sans accent ni pluriel (« Chéneaux » = « cheneau », « bacs » = « bac »), pour chercher un mot de la fiche. */
/** Une donnée qui est une quantité (une longueur, une surface, un nombre) : l'app ne la demande jamais à l'artisan. */
export const QUANTITE_DEMANDEE = /^(?:longueur|surface|nombre|nb|quantite|metrage|lineaire)(?:_|$)/;
export function motsDeLaFiche(raw: string): string {
  return normalizeText(raw)
    .replace(/[^a-z0-9.,/ ]/g, " ")
    // Une virgule ou un point de ponctuation (« couvre-joints, bacs ») ; « 0,65 » et « 2.5 » restent.
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && /[sx]$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}

const contient = (texte: string, mot: string) => mot.length > 0 && ` ${texte} `.includes(` ${mot} `);

/** Le titre d'une ligne : ce qui précède « : » ou « — » (« Fourniture et pose chéneau zinc anthracite »). */
function titreDe(designation: string): string {
  return designation.split(/\s*[:—–]\s*/)[0] ?? designation;
}

const motsDeFamille = (ref: Referential, code: string) => (ref.families.find((f) => f.code === code)?.keywords ?? []).map(motsDeLaFiche).filter(Boolean);

/**
 * L'ouvrage que nomme un texte : celui dont la fiche trouve le plus de mots (puis le plus long) ; deux ouvrages à égalité,
 * aucun (jamais deviner).
 */
export function ouvrageNomme(ref: Referential, texte: string): WorkItemType | null {
  const t = motsDeLaFiche(texte);
  let best: { w: WorkItemType; n: number; len: number }[] = [];
  for (const w of ref.workItems) {
    const hits = [...new Set(w.triggers.flatMap((f) => motsDeFamille(ref, f)))].filter((k) => contient(t, k));
    if (hits.length === 0) continue;
    const score = { w, n: hits.length, len: Math.max(...hits.map((h) => h.length)) };
    const top = best[0];
    if (!top || score.n > top.n || (score.n === top.n && score.len > top.len)) best = [score];
    else if (score.n === top.n && score.len === top.len) best.push(score);
  }
  return best.length === 1 ? best[0]!.w : null;
}

const motsDEmplacement = (ref: Referential, w: WorkItemType, s: Slot) =>
  [...(s.keywords ?? []).map(motsDeLaFiche), ...(w.triggers.includes(s.family) ? [] : motsDeFamille(ref, s.family))].filter(Boolean);

/** Les données d'un ouvrage écrites dans un texte, par le code : « bacs de 4 m », « Ø125 », « pour les 2 côtés ». */
export function donneesEcrites(params: readonly ParamDef[], texte: string): Record<string, string> {
  const t = motsDeLaFiche(texte);
  const out: Record<string, string> = {};
  for (const p of params) {
    // Un diamètre écrit en chiffres (« Ø125 ») passe devant un mot (« pour VMC ») : c'est le plus précis.
    if (/^diametre_/.test(p.key)) {
      const d = [...new Set([...texte.matchAll(/[øØ]\s*(\d{2,3})\b/g)].map((m) => m[1]!))];
      if (d.length === 1) {
        out[p.key] = d[0]!;
        continue;
      }
    }
    const v = p.textValues?.filter((x) => x.keywords.some((k) => contient(t, motsDeLaFiche(k))));
    if (v && new Set(v.map((x) => x.value)).size === 1) {
      out[p.key] = v[0]!.value;
      continue;
    }
    if (!/^(?:m|cm|mm)$/.test(p.unit) || !p.textLabels?.length) continue;
    const labels = p.textLabels.map(motsDeLaFiche).filter((x) => x.length > 2);
    const lus = new Set<string>();
    for (const label of labels) {
      const re = new RegExp(`(?:^| )${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:de |d |: |= )?(\\d+(?:[.,]\\d+)?) ?(ml|m|cm|mm)(?= |$|[,.;)])`, "g");
      for (const m of t.matchAll(re)) lus.add(`${m[1]!.replace(",", ".")} ${m[2] === "ml" ? "m" : m[2]}`);
    }
    if (lus.size === 1) out[p.key] = [...lus][0]!;
  }
  return out;
}

// Seule une ligne d'OUVRAGE (« Fourniture et pose chéneau zinc… ») se décompose par le code ; une ligne qui écrit déjà
// son article (« Ardoises naturelles 32×22, 1 940 pièces ») garde la lecture telle quelle.
const ACHAT = new Set(["fourniture_et_pose"]);
const PIECES = /^(?:u|unite|piece|pce|pc|ens|tole|plaque)?$/;

/**
 * Des pièces rangées sur l'emplacement qui MESURE un ouvrage compté en surface ou en longueur (« tôles bacs acier, 10 u »
 * sur la couverture bac acier, D-2022-071) : ce n'est pas la mesure de l'ouvrage, c'est l'article tel qu'écrit. Il part
 * tel quel, sans « Surface du toit ? » derrière (§49.2).
 */
function sansMesureEnPieces(ref: Referential, l: LectureLigne): LectureLigne {
  let change = false;
  const fournitures = l.fournitures.map((f) => {
    const w = ref.workItems.find((x) => x.id === f.ouvrage);
    const s = w?.slots.find((x) => x.key === f.emplacement) ?? (f.emplacement === null ? w?.slots[0] : undefined);
    const unite = motsDeLaFiche(f.unite ?? l.unite ?? "");
    if (!w || !s?.measureOnly || !(f.quantite ?? l.quantite) || !PIECES.test(unite) || !(f.unite ?? l.unite)) return f;
    if (w.params.some((x) => x.fromLineQuantity && x.unit === "u")) return f;
    change = true;
    return { ...f, ouvrage: null, emplacement: null };
  });
  return change ? { ...l, fournitures } : l;
}
// Les mêmes gestes que `SANS_ACHAT` de la lecture (une ligne qui commence ainsi n'achète rien d'elle-même).
const GESTE = /^(?:pose|repose|depose|demontage|main d ?oeuvre|installation|location|evacuation|nettoyage|echafaudage|transport|deplacement|mise en oeuvre|refection|reprise|remplacement)\b/;

function ligneParLeCode(ref: Referential, l0: LectureLigne, toutes: readonly LectureLigne[]): LectureLigne {
  // Le titre et sa description, séparés par « : » (le modèle écrit parfois « — ») : une seule écriture.
  const l = { ...l0, designation: l0.designation.replace(/\s+[—–]\s+/, " : ") };
  // Une ligne sans unité (« 10 » tôles, DE00000071) ne dit pas ce qu'elle mesure : elle garde la lecture, et son unité se
  // demande sur la ligne (§51.6).
  // Une ligne qui commence par un geste (« Pose de gouttière Havraise sur chevrons », D-2026-020) est la pose d'un article
  // qu'une autre ligne fournit : elle ne fait que citer (l'étain, les colliers), la lecture reste.
  if (!ACHAT.has(l.role) || !l.unite?.trim() || GESTE.test(normalizeText(l.designation))) return l;
  const titre = titreDe(l.designation);
  const w = ouvrageNomme(ref, titre) ?? ouvrageNomme(ref, l.designation);
  if (!w || w.slots.length === 0) return l;
  const texte = motsDeLaFiche(l.designation);
  const titreMots = motsDeLaFiche(titre);
  // L'article mesuré : l'emplacement que le titre nomme (« crochets de gouttière »), sinon le premier de l'ouvrage.
  const nommeAuTitre = w.slots.filter((s) => motsDEmplacement(ref, w, s).some((k) => contient(titreMots, k)));
  // Une ligne qui MESURE l'ouvrage (32 m², 8 m) se range sur son emplacement mesuré, même si son titre cite un article
  // (« couverture zinc à tasseaux ») ; une ligne en pièces (« 40 crochets de gouttière ») sur l'article qu'elle nomme.
  const mesure = !/^(?:u|unite|unites|piece|pieces|pce|pcs|ens)?$/.test(motsDeLaFiche(l.unite ?? ""));
  const premier = w.slots[0]!;
  const principal = nommeAuTitre.length === 1 && !(mesure && premier.measureOnly) ? nommeAuTitre[0]! : premier;
  // Des pièces (« 10 tôles bac acier », D-2022-071) ne mesurent pas un ouvrage qui se compte en surface ou en longueur :
  // la lecture reste, jamais une question « Surface du toit ? » derrière.
  const compteEnPieces = w.params.some((x) => x.fromLineQuantity && x.unit === "u");
  if (!mesure && principal.measureOnly && !compteEnPieces) return l;
  // Les autres articles écrits sur la ligne (« sur tasseaux bois et couvre-joints ») : cités, le calcul les compte.
  const cites = w.slots.filter((s) => s.key !== principal.key && motsDEmplacement(ref, w, s).some((k) => contient(texte, k)));
  // Une donnée dite sur une autre ligne par ses mots exacts (« bandes de rive pour les 2 côtés ») vaut pour l'ouvrage,
  // quand une seule ligne la dit ; un nombre lu sur la ligne (« bacs de 4 m ») ne vaut que pour elle.
  const donnees: Record<string, string> = {};
  // Jamais une qualité qui se nomme (l'aspect du zinc d'une bande n'est pas celui de la couverture).
  for (const p of w.params.filter((x) => x.textValues?.length && !x.named)) {
    const ailleurs = toutes.filter((o) => o.ref !== l.ref).map((o) => donneesEcrites([p], o.designation)[p.key]).filter((v): v is string => v !== undefined);
    if (new Set(ailleurs).size === 1) donnees[p.key] = ailleurs[0]!;
  }
  Object.assign(donnees, donneesEcrites(w.params, l.designation));
  const description = l.designation.slice(titre.length).replace(/^\s*[:—–]\s*/, "").trim() || l.designation.trim();
  // Une ligne qui compte l'ouvrage (« descente, 1 unité ») : l'article se calcule et prend le nom de la fiche (« Tubes de
  // descente »), que le calcul complète (Ø, longueur) ; un article écrit tel quel garde les mots du devis.
  const compte = principal.measureOnly || mesure || w.params.some((x) => x.fromLineQuantity && x.unit === "u" && (x.forSlots?.includes(principal.key) || principal.piecesFrom?.count === x.key || (!x.forSlots && principal.key === premier.key)));
  const propre = withoutLabour(description).replace(/\s*[–—-]\s*$/, "").trim() || description;
  const ecrit = propre.charAt(0).toUpperCase() + propre.slice(1);
  // Une pièce prise ligne par ligne (une bande de rive, une bande de ventilation) se nomme comme le devis l'écrit, sans la
  // pose : « Habillages de rive » ; c'est le nom de sa question (« Habillages de rive : développé ? »).
  const piece = withoutLabour(titre).trim();
  const nom = w.perLine && piece ? piece.charAt(0).toUpperCase() + piece.slice(1) : compte && !principal.measureOnly ? principal.label : ecrit;
  const article = (s: Slot, f: Partial<LectureFourniture>): LectureFourniture => ({ nom: s.label, quantite: null, unite: null, ouvrage: w.id, emplacement: s.key, donnees: {}, attend: [], aPreciser: [], precision: null, ...f });
  // Une ligne d'ouvrage comptée en pièces quand l'ouvrage se mesure autrement (« 20 tuiles », « bandes porte-solin, 2
  // unités ») : le nombre écrit se commande tel quel (§49.2) ; la ligne garde le nom de l'article et ce qu'il attend
  // (« Quelle tuile ? », D.2026.105), jamais une question de surface derrière.
  const premiere = l.fournitures[0];
  // Ce que l'article attend d'une question que la fiche ne sait pas poser (une contradiction du devis, la matière d'une
  // descente) reste : la question de la lecture est gardée, la ligne l'attend. Le reste (les « à préciser », les précisions
  // libres) varie d'une lecture à l'autre : le code le décide.
  const connues = new Set(ref.workItems.flatMap((w) => w.params.map((p) => p.key)));
  // Jamais une quantité demandée (« longueur totale du porte-solin ? » pour « 2 unités ») : la ligne ne l'attend pas.
  const attend = [...new Set(l.fournitures.flatMap((f) => f.attend))].filter((k) => !connues.has(k) && !QUANTITE_DEMANDEE.test(k));
  const telQuel = !compte && !mesure && premiere ? { attend: [...new Set([...premiere.attend, ...attend])], aPreciser: premiere.aPreciser } : { attend };
  return {
    ...l,
    fournitures: [article(principal, { nom, quantite: l.quantite, unite: l.unite, donnees, ...telQuel }), ...cites.map((s) => article(s, {}))],
  };
}
