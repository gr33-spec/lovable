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
  const lues = lecture.lignes.map((l) => motsJamaisDemandes(ref, sansMesureEnPieces(ref, ligneParLeCode(ref, l, lecture.lignes, lecture.source === "dictee"))));
  const lignes = sansRediteDeLaQuantite(ref, donneesDesAutresOuvrages(ref, lues));
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
export function ouvrageNomme(ref: Referential, texte: string, lu?: string | null): WorkItemType | null {
  // Un mot qui finit par « é » dit une façon ou une teinte, jamais le nom d'un ouvrage : « tuiles HP10 ardoisé » est une
  // tuile de teinte ardoisée, pas une ardoise (banc du calcul, C12, 21 novembre 2026). Il est retiré avant de chercher.
  // Un nom en « ée » que la fiche connaît (« jouée », « cheminée ») reste : c'est un ouvrage, pas une façon.
  const connus = new Set([...ref.families.flatMap((f) => f.keywords ?? []), ...ref.workItems.flatMap((x) => x.slots.flatMap((sl) => sl.keywords ?? []))].map(motsDeLaFiche));
  const t = motsDeLaFiche(texte.replace(/[\p{L}]+é(?:e|s|es)?(?![\p{L}])/gu, (m) => (/ées?$/u.test(m) && connus.has(motsDeLaFiche(m)) ? m : " ")));
  let best: { w: WorkItemType; n: number; len: number }[] = [];
  for (const w of ref.workItems) {
    const hits = [...new Set(w.triggers.flatMap((f) => motsDeFamille(ref, f)))].filter((k) => contient(t, k));
    if (hits.length === 0) continue;
    const score = { w, n: hits.length, len: Math.max(...hits.map((h) => h.length)) };
    const top = best[0];
    if (!top || score.n > top.n) best = [score];
    else if (score.n === top.n) best.push(score);
  }
  if (best.length === 0) return null;
  // Plusieurs ouvrages nommés par autant de mots (« gouttières PVC » : la gouttière zinc par « gouttière », la gouttière PVC
  // par « PVC ») : celui que la lecture a rangé départage, s'il est l'un d'eux (banc du calcul, C10, 21 novembre 2026) ; sinon
  // le mot le plus long, et à égalité aucun (jamais deviner). Un ouvrage que la ligne ne nomme pas n'est jamais retenu.
  const choisi = lu ? best.find((b) => b.w.id === lu) : undefined;
  if (choisi) return choisi.w;
  const len = Math.max(...best.map((b) => b.len));
  const longs = best.filter((b) => b.len === len);
  return longs.length === 1 ? longs[0]!.w : null;
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
    // Les mots écrits de chaque valeur ; un mot contenu dans un mot plus long d'une autre valeur ne compte pas (« gris »
    // dans « gris anthracite » : la teinte est anthracite ; banc du calcul, C15, 21 novembre 2026).
    const dits = (p.textValues ?? []).flatMap((x) => x.keywords.map(motsDeLaFiche).filter((k) => contient(t, k)).map((k) => ({ value: x.value, k })));
    const v = dits.filter((d) => !dits.some((o) => o.value !== d.value && o.k !== d.k && ` ${o.k} `.includes(` ${d.k} `)));
    if (v.length > 0 && new Set(v.map((x) => x.value)).size === 1) {
      out[p.key] = v[0]!.value;
      continue;
    }
    if (!/^(?:m|cm|mm)$/.test(p.unit) || !p.textLabels?.length) continue;
    const labels = p.textLabels.map(motsDeLaFiche).filter((x) => x.length > 1); // « ht 4,00 m » : deux lettres suffisent à un couvreur (banc du calcul, C07)
    const lus = new Set<string>();
    for (const label of labels) {
      const re = new RegExp(`(?:^| )${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:de |d |: |= )?(\\d+(?:[.,]\\d+)?) ?(ml|m|cm|mm)(?= |$|[,.;)])`, "g");
      for (const m of t.matchAll(re)) lus.add(`${m[1]!.replace(",", ".")} ${m[2] === "ml" ? "m" : m[2]}`);
      // « crochets de 11 » : une donnée qui se dit sans son unité au comptoir (`bareNumber`), dans ses bornes (`textRange`).
      if (p.bareNumber && p.textRange) {
        const nu = new RegExp(`(?:^| )${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:de |d )(\\d+(?:[.,]\\d+)?)(?= |$|[,.;)])`, "g");
        for (const m of t.matchAll(nu)) {
          const n = Number(m[1]!.replace(",", "."));
          if (n >= Number(p.textRange.min) && n <= Number(p.textRange.max)) lus.add(`${m[1]!.replace(",", ".")} ${p.unit}`);
        }
      }
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
/**
 * DEUX LIGNES D'UN MÊME OUVRAGE QUI NE DISENT PAS LA MÊME MESURE (« Liteaux, 100 m² » et « Ardoises, 110 m² ») : la lecture
 * recopie la quantité de chaque ligne dans ses données, et la première recopiée passait devant les autres : 100 m² partout,
 * sans rien demander (banc du calcul, C10, 22 novembre 2026). Dans ce cas seulement, la redite est retirée : il reste les
 * quantités des lignes, qui ne concordent pas, et la question se pose (« en cas de doute, on demande », Greg). Une seule
 * ligne, ou des lignes d'accord : rien ne change.
 */
function sansRediteDeLaQuantite(ref: Referential, lignes: readonly LectureLigne[]): LectureLigne[] {
  const nombre = (x: string | null | undefined) => (x ? Number(x.replace(/\s/g, "").replace(",", ".")) : NaN);
  // Par ouvrage et par donnée : les mesures que les lignes redisent.
  const redites = new Map<string, Set<number>>();
  const redite = (l: LectureLigne, f: LectureLigne["fournitures"][number], cle: string) => {
    const q = nombre(f.quantite ?? l.quantite);
    return Number.isFinite(q) && f.donnees[cle] !== undefined && nombre(f.donnees[cle]) === q ? q : null;
  };
  for (const l of lignes) for (const f of l.fournitures) {
    const w = ref.workItems.find((x) => x.id === f.ouvrage);
    for (const p of w?.params ?? []) {
      const q = p.fromLineQuantity ? redite(l, f, p.key) : null;
      if (q === null) continue;
      const k = `${w!.id}/${p.key}`;
      redites.set(k, (redites.get(k) ?? new Set()).add(q));
    }
  }
  return lignes.map((l) => {
    let change = false;
    const fournitures = l.fournitures.map((f) => {
      const w = ref.workItems.find((x) => x.id === f.ouvrage);
      if (!w) return f;
      const donnees = { ...f.donnees };
      let ici = false;
      for (const p of w.params) {
        if (!p.fromLineQuantity || (redites.get(`${w.id}/${p.key}`)?.size ?? 0) < 2 || redite(l, f, p.key) === null) continue;
        delete donnees[p.key];
        ici = true;
      }
      if (!ici) return f;
      change = true;
      return { ...f, donnees };
    });
    return change ? { ...l, fournitures } : l;
  });
}
/**
 * Une donnée qui se lit sur les AUTRES ouvrages du devis (`fromWorks` : la couverture autour d'une sortie de toit) est posée
 * par le code, d'après les ouvrages rangés : une seule valeur possible, elle est prise (elle passe avant ce que la lecture a
 * noté) ; deux valeurs possibles dans le même devis, rien n'est déduit, la question se pose. Un mot de la ligne elle-même
 * (« sur zinc ») passe avant.
 */
function donneesDesAutresOuvrages(ref: Referential, lignes: readonly LectureLigne[]): LectureLigne[] {
  const presents = new Set(lignes.flatMap((l) => l.fournitures.flatMap((f) => (f.ouvrage ? [f.ouvrage] : []))));
  return lignes.map((l) => {
    const t = motsDeLaFiche(l.designation);
    let change = false;
    const fournitures = l.fournitures.map((f) => {
      const w = ref.workItems.find((x) => x.id === f.ouvrage);
      if (!w) return f;
      const donnees = { ...f.donnees };
      for (const p of w.params) {
        if (!p.fromWorks?.length) continue;
        if ((p.textValues ?? []).some((v) => v.keywords.some((k) => contient(t, motsDeLaFiche(k))))) continue;
        const valeurs = [...new Set(p.fromWorks.filter((x) => x.workItems.some((id) => presents.has(id))).map((x) => x.value))];
        if (valeurs.length === 1 && donnees[p.key] !== valeurs[0]) {
          donnees[p.key] = valeurs[0]!;
          change = true;
        } else if (valeurs.length > 1 && donnees[p.key] !== undefined) {
          delete donnees[p.key];
          change = true;
        }
      }
      return { ...f, donnees };
    });
    return change ? { ...l, fournitures } : l;
  });
}
/**
 * Une donnée que l'app ne demande jamais et qu'un mot du devis dit (« HP 10 » sur la ligne des tuiles) est lue par le code
 * sur toute ligne rangée dans son ouvrage, même une ligne de fourniture seule que le code ne décompose pas : elle ne
 * dépend pas de ce que la lecture a pensé à noter. Un seul mot trouvé, sinon rien.
 */
function motsJamaisDemandes(ref: Referential, l: LectureLigne): LectureLigne {
  const t = motsDeLaFiche(l.designation);
  let change = false;
  const fournitures = l.fournitures.map((f) => {
    const w = ref.workItems.find((x) => x.id === f.ouvrage);
    if (!w) return f;
    const donnees = { ...f.donnees };
    for (const p of w.params) {
      if (!p.neverAsk || !p.textValues?.length || donnees[p.key] !== undefined) continue;
      const dits = p.textValues.filter((v) => v.keywords.some((k) => contient(t, motsDeLaFiche(k))));
      if (dits.length !== 1) continue;
      donnees[p.key] = dits[0]!.value;
      change = true;
    }
    return change ? { ...f, donnees } : f;
  });
  return change ? { ...l, fournitures } : l;
}
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

/**
 * UNE LIGNE « 1 ens » DONT LA MESURE EST DANS LE TEXTE (Greg, 21 novembre 2026, banc du calcul C05 et C12 : « 4 noues de
 * 1,80 m », « 2 rives de 6 m », « 4 ml en tout ») : la mesure écrite est celle de la ligne. De l'arithmétique seulement,
 * aucun métier : un produit « N × L m » ou « N <mot> de L m », sinon une seule longueur ou une seule surface écrite avec son
 * unité. Deux mesures différentes dans le texte : rien n'est choisi, la ligne reste telle qu'écrite.
 */
const AU_FORFAIT = /^(?:en|ens|ensemble|forfait|ft|fft|f)$/;
export function mesureDansLeTexte(l: LectureLigne): LectureLigne {
  if (!AU_FORFAIT.test(motsDeLaFiche(l.unite ?? ""))) return l;
  const t = l.designation.replace(/(\d),(\d)/g, "$1.$2");
  const produits = [...t.matchAll(/(\d+)\s*(?:x|×|\*|\p{L}+ de)\s*(\d+(?:\.\d+)?)\s*(?:ml|m)(?![²2\p{L}])/giu)];
  const dans = (i: number) => produits.some((p) => p.index! <= i && i < p.index! + p[0].length);
  const simples = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(m²|m2|ml|m)(?![\p{L}\d])/giu)].filter((m) => !dans(m.index!));
  const mesure = (quantite: string, unite: string) => ({ ...l, quantite, unite, fournitures: l.fournitures.map((f) => (f.quantite === l.quantite && f.unite === l.unite ? { ...f, quantite, unite } : f)) });
  if (produits.length === 1 && simples.length === 0) return mesure(String(+(Number(produits[0]![1]) * Number(produits[0]![2])).toFixed(2)), "ml");
  if (produits.length === 0 && simples.length === 1) return mesure(simples[0]![1]!, /m[²2]/i.test(simples[0]![2]!) ? "m²" : "ml");
  return l;
}

function ligneParLeCode(ref: Referential, l0: LectureLigne, toutes: readonly LectureLigne[], dictee = false): LectureLigne {
  // Le titre et sa description, séparés par « : » (le modèle écrit parfois « — ») : une seule écriture.
  const l = mesureDansLeTexte({ ...l0, designation: l0.designation.replace(/\s+[—–]\s+/, " : ") });
  // Une ligne sans unité (« 10 » tôles, DE00000071) ne dit pas ce qu'elle mesure : elle garde la lecture, et son unité se
  // demande sur la ligne (§51.6).
  // Une ligne qui commence par un geste (« Pose de gouttière Havraise sur chevrons », D-2026-020) est la pose d'un article
  // qu'une autre ligne fournit : elle ne fait que citer (l'étain, les colliers), la lecture reste.
  if (!ACHAT.has(l.role) || !l.unite?.trim() || GESTE.test(normalizeText(l.designation))) return l;
  const titre = titreDe(l.designation);
  // L'ouvrage rangé par la lecture ne départage que s'il se mesure comme la ligne : des « jouées de lucarnes en zinc », 2 m²,
  // ne sont pas une bande de zinc, qui se mesure au mètre (test de l'API `demande-de-devis-45`, 21 novembre 2026).
  const dimension = (u: string) => (/^m ?(?:2|²)$|^m2$/.test(u) ? "m2" : /^(?:ml|m)$/.test(u) ? "m" : "u");
  const dimLigne = dimension(motsDeLaFiche(l.unite ?? "").replace("²", "2"));
  const ouvrageLu = ref.workItems.find((x) => x.id === l.fournitures[0]?.ouvrage);
  const lu = ouvrageLu && (dimLigne === "u" || ouvrageLu.params.some((p) => p.fromLineQuantity && dimension(p.unit) === dimLigne)) ? ouvrageLu.id : null;
  const w = ouvrageNomme(ref, titre, lu) ?? ouvrageNomme(ref, l.designation, lu);
  if (!w || w.slots.length === 0) return l;
  const texte = motsDeLaFiche(l.designation);
  const titreMots = motsDeLaFiche(titre);
  // L'article mesuré : l'emplacement que le titre nomme (« crochets de gouttière »), sinon le premier de l'ouvrage.
  // « Sans dauphin », « hors crochets » : l'article est écarté par le devis, il n'est ni nommé ni cité (banc du calcul, C15).
  const sansLesExclus = (mots: string) => mots.replace(/(?:^| )(?:sans?|hors?|non compris?) (?:les? |le |la |l )?[a-z0-9]+/g, " ");
  // Une forme d'achat (les feuilles d'une bande, les rives gauches et droites) n'est jamais l'article écrit : elle ne se nomme pas.
  // Ce qui suit « avec », « y compris » est cité, jamais mesuré par la ligne : « fenêtres de toit GGL MK04, avec raccords
  // d'étanchéité », 2 u, compte les fenêtres ; les raccords sont cités (banc du calcul, C05 et C12, 21 novembre 2026).
  const avantAvec = (mots: string) => mots.split(/ (?:avec|y compri|y compris|compri|compris|dont|incluant|inclu|inclus|au|aux) /)[0]!;
  const nommeAuTitre = w.slots.filter((s) => !s.formOf && motsDEmplacement(ref, w, s).some((k) => contient(avantAvec(sansLesExclus(titreMots)), k)));
  // Une ligne qui MESURE l'ouvrage (32 m², 8 m) se range sur son emplacement mesuré, même si son titre cite un article
  // (« couverture zinc à tasseaux ») ; une ligne en pièces (« 40 crochets de gouttière ») sur l'article qu'elle nomme.
  const mesure = !/^(?:u|unite|unites|piece|pieces|pce|pcs|ens)?$/.test(motsDeLaFiche(l.unite ?? ""));
  const premier = w.slots[0]!;
  // Une ligne mesurée en mètres ne mesure jamais un article qui se compte en pièces : « gouttière de 25 sur le pourtour, y
  // compris 4 angles », 44 ml, mesure la gouttière ; les angles sont cités (banc du calcul, C11, 21 novembre 2026).
  // (Sauf l'article dont la fiche lit la longueur dans la ligne : « tuiles de rive, 12 ml » mesure bien les rives.)
  const mesureEnMetres = (s: Slot) => w.params.some((p) => p.fromLineQuantity && p.forSlots?.includes(s.key) && /^(?:m|cm|mm|m2)$/.test(p.unit));
  const formes = (s: Slot) => w.slots.filter((x) => x.key === s.key || x.formOf === s.key).map((x) => x.key);
  const enPieces = (s: Slot) => !mesureEnMetres(s) && w.needs.some((n) => formes(s).includes(n.slot)) && w.needs.filter((n) => formes(s).includes(n.slot)).every((n) => n.unit === "u");
  const principal = nommeAuTitre.length === 1 && !(mesure && (premier.measureOnly || enPieces(nommeAuTitre[0]!))) ? nommeAuTitre[0]! : premier;
  // Des pièces (« 10 tôles bac acier », D-2022-071) ne mesurent pas un ouvrage qui se compte en surface ou en longueur :
  // la lecture reste, jamais une question « Surface du toit ? » derrière.
  const compteEnPieces = w.params.some((x) => x.fromLineQuantity && x.unit === "u");
  if (!mesure && principal.measureOnly && !compteEnPieces) return l;
  // Les autres articles écrits sur la ligne (« sur tasseaux bois et couvre-joints ») : cités, le calcul les compte.
  // Une dictée : l'article qui suit toujours son ouvrage (`dicteAvec` : 1 crochet par ardoise) est cité même s'il n'est pas dit.
  const cites = w.slots.filter((s) => s.key !== principal.key && !s.formOf && (motsDEmplacement(ref, w, s).some((k) => contient(sansLesExclus(texte), k)) || (dictee && s.dicteAvec === true && principal.key !== s.key)));
  // Une donnée dite sur une autre ligne par ses mots exacts (« bandes de rive pour les 2 côtés ») vaut pour l'ouvrage,
  // quand une seule ligne la dit ; un nombre lu sur la ligne (« bacs de 4 m ») ne vaut que pour elle.
  const donnees: Record<string, string> = {};
  // Jamais une qualité qui se nomme (l'aspect du zinc d'une bande n'est pas celui de la couverture).
  // Ni une donnée propre à sa ligne (`ownOnly` : l'égout d'une jouée n'est pas celui du toit).
  for (const p of w.params.filter((x) => x.textValues?.length && !x.named && !x.ownOnly)) {
    const ailleurs = toutes.filter((o) => o.ref !== l.ref).map((o) => donneesEcrites([p], o.designation)[p.key]).filter((v): v is string => v !== undefined);
    if (new Set(ailleurs).size === 1) donnees[p.key] = ailleurs[0]!;
  }
  Object.assign(donnees, donneesEcrites(w.params, l.designation));
  // La quantité de la ligne mesure déjà l'ouvrage (30 ml d'arêtier) : un détail du texte (« 4 arêtiers de 7,50 m ») ne la
  // remplace jamais (banc du calcul, C11, 21 novembre 2026).
  if (mesure) for (const p of w.params) if (p.fromLineQuantity && /^(?:m|cm|mm|m2)$/.test(p.unit)) delete donnees[p.key];
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
