import { normalizeText } from "../trades/trade-profile.js";
import type { LectureDevis } from "./lecture.js";

/**
 * TEMPS UN : le contrôle d'une lecture contre le résultat attendu du fondateur, écrit d'après son texte (référentiel
 * électricité §6 pour le devis 7954, référentiel couverture §51.5 pour DE00000071). Il s'applique aux lectures de test
 * comme à la vraie lecture d'Opus (`apps/api/scripts/lecture-reelle.ts`). Il rend la liste des écarts, chacun en une
 * phrase ; vide : la lecture est conforme. Ce n'est pas une règle de lecture : rien de l'app ne l'appelle.
 */
export interface LigneDuDevis {
  ref: string;
  designation: string;
}

const n = (t: string) => normalizeText(t).replace(/\s+/g, " ").trim();

/** Chaque ligne du devis est reprise par la lecture, autant de fois qu'elle est écrite (désignation à peu près égale). */
function lignesAbsentes(lecture: LectureDevis, devis: readonly LigneDuDevis[]): string[] {
  const lues = lecture.lignes.map((l) => n(l.designation));
  const pris = new Set<number>();
  const out: string[] = [];
  for (const d of devis) {
    const cible = n(d.designation);
    const debut = cible.slice(0, 24);
    const i = lues.findIndex((x, k) => !pris.has(k) && (x === cible || x.startsWith(debut) || cible.startsWith(x.slice(0, 24))));
    if (i < 0) out.push(`Ligne absente : ${d.designation} (ligne ${d.ref} du devis)`);
    else pris.add(i);
  }
  return out;
}

/** Les faits du bref : chacun doit s'y lire (§6 / §51.5). */
function brefManquant(lecture: LectureDevis, faits: readonly [string, RegExp][]): string[] {
  const bref = n(lecture.bref.join(". "));
  return faits.filter(([, re]) => !re.test(bref)).map(([label]) => `Bref : il manque « ${label} »`);
}

/** Les lignes sans fourniture attendues, et les lignes qui doivent en avoir une. */
function fournitures(lecture: LectureDevis, sans: RegExp, exceptions: RegExp | null): string[] {
  const out: string[] = [];
  for (const l of lecture.lignes) {
    const d = n(l.designation);
    if (sans.test(d)) {
      if (l.fournitures.length > 0) out.push(`Sans fourniture attendue : ${l.designation}`);
    } else if (l.fournitures.length === 0 && !(exceptions && exceptions.test(d))) out.push(`Fourniture attendue : ${l.designation}`);
  }
  return out;
}

const QUESTIONS_7954: readonly [string, (t: string) => boolean][] = [
  ["teinte de l'appareillage Essensya", (t) => /teinte|finition|blanc|noir/.test(t)],
  ["mètres de gaine Ø80 et Ø125 par logement", (t) => /gaine/.test(t) && /80/.test(t) && /125/.test(t)],
  ["répartition des 890 m de PER entre 10×12 et 13×16", (t) => /\bper\b|890/.test(t) && /12/.test(t) && /16/.test(t)],
  ["modèle des parois de douche « à définir »", (t) => /paroi/.test(t)],
  ["usage des 10 alimentations radiateur en plus des 49 appareils", (t) => /alimentation|radiateur/.test(t) && /59|49|10/.test(t)],
  ["logement de rattachement du bloc chambre / dégagement de la page 12", (t) => /(page 12|chambre|degagement)/.test(t) && /logement|rattach/.test(t)],
];

/** §6 du référentiel électricité : « Aucune question sur une marque, un modèle ou une contenance écrits au devis. Aucune question sur la composition des tableaux (déduite, § 4). » */
const ECRIT_7954 = /\b(marque|hager|essensya|atoll|aldes|bahia|malicio|litres?|contenance|porcelanosa|ancoflash|rondo|grade|coffret|connecteur)\b/;

export function controleLecture7954(lecture: LectureDevis, devis: readonly LigneDuDevis[]): string[] {
  const out: string[] = [];
  if (lecture.metier !== "electrical") out.push(`Métier : « ${lecture.metier ?? "rien"} » au lieu de « electrical » (électricité)`);
  const lots = new Set(lecture.lots.map((l) => l.metier));
  for (const [m, label] of [["electrical", "électricité"], ["hvac", "chauffage et VMC"], ["plumbing", "plomberie"]] as const) {
    if (!lots.has(m)) out.push(`Lots : il manque le lot ${label} (${m})`);
  }
  out.push(...lignesAbsentes(lecture, devis));
  out.push(
    ...brefManquant(lecture, [
      ["10 logements", /10 logements/],
      ["Paimpol", /paimpol/],
      ["hôtel-restaurant", /hotel.?restaurant/],
      ["monophasé", /monophase/],
      ["Hager Essensya", /essensya/],
      ["un tableau Hager par logement", /tableau/],
      ["un coffret de communication par logement", /coffret de communication/],
      ["chauffage électrique Atoll", /atoll/],
      ["sèche-serviettes", /seche.?serviette/],
      ["VMC hygro B Aldes", /vmc/],
      ["10 WC suspendus", /wc suspendu/],
      ["10 meubles vasque", /meubles? (vasque|60)/],
      ["10 douches", /douche/],
      ["10 chauffe-eau", /chauffe.?eau/],
      ["PER en dalle", /\bper\b/],
      ["évacuation PVC 100", /pvc 100|pvc d ?100/],
    ]),
  );
  out.push(
    ...fournitures(
      lecture,
      /^(depose de l.installation|pose d.une prise de chantier|plan electrique|percement|mesure de la valeur|demande de consuel|formation utilisateur|installation et mise en service du coffret|pose, mise en service et percement)/,
      /^chapeau prevu par le couvreur/,
    ),
  );
  const textes = lecture.questions.map((q) => n(q.texte));
  if (lecture.questions.length !== QUESTIONS_7954.length) out.push(`Questions : ${lecture.questions.length} au lieu de ${QUESTIONS_7954.length}`);
  for (const [label, test] of QUESTIONS_7954) if (!textes.some(test)) out.push(`Question absente : ${label}`);
  for (const [i, t] of textes.entries()) {
    const texte = lecture.questions[i]!.texte;
    if (/composition|disjoncteur|differentiel/.test(t)) out.push(`Question sur la composition des tableaux (déduite, §4) : ${texte}`);
    else if (ECRIT_7954.test(t) && !QUESTIONS_7954[0]![1](t)) out.push(`Question sur une donnée écrite : ${texte}`);
  }
  return out;
}

const QUESTIONS_DE00000071: readonly [string, (t: string) => boolean][] = [
  ["développé de gouttière 25 ou 33", (t) => /developpe/.test(t) && /25/.test(t) && /33/.test(t)],
  ["nombre de descentes", (t) => /descente/.test(t)],
  ["chéneau EPDM ou PVC et largeur développée", (t) => /cheneau/.test(t) && /epdm/.test(t) && /pvc/.test(t)],
  ["raccord Velux ZWC ou Pratikal", (t) => /zwc/.test(t) && /pratikal/.test(t)],
  ["tôles bac acier : 10 tôles ou 10 m², et longueur", (t) => /toles?/.test(t) && /10/.test(t)],
];

export function controleLectureDe00000071(lecture: LectureDevis, devis: readonly LigneDuDevis[]): string[] {
  const out: string[] = [];
  if (lecture.metier !== "roofing") out.push(`Métier : « ${lecture.metier ?? "rien"} » au lieu de « roofing » (couverture)`);
  if (lecture.lots.length > 1) out.push(`Lots : ${lecture.lots.length} lots pour un devis d'un seul métier`);
  out.push(...lignesAbsentes(lecture, devis));
  out.push(
    ...brefManquant(lecture, [
      ["bac acier isolé", /bac acier isole/],
      ["pas de couverture neuve", /pas de couverture neuve/],
      ["gouttière demi-ronde zinc naturel 17,40 m", /gouttiere demi.ronde zinc naturel 17,40 m/],
      ["crochets Négrafix", /negrafix/],
      ["chéneau 11,70 m", /cheneau 11,70 m/],
      ["membrane", /membrane/],
      ["4 Velux SK06 114×118 GGL white finish", /4 velux sk06 114 ?x ?118 ggl white finish/],
      ["1 MK04 78×98 GGU ever finish", /1 mk04 78 ?x ?98 ggu ever finish/],
      ["raccords pour bac acier", /raccords pour bac acier/],
      ["tôles bac acier en étanchéité au-dessus des Velux", /toles bac acier en etancheite au.dessus des velux/],
    ]),
  );
  out.push(...fournitures(lecture, /^(depose|realisation des tremies|pose de vel)/, null));
  const textes = lecture.questions.map((q) => n(q.texte));
  if (lecture.questions.length !== QUESTIONS_DE00000071.length) out.push(`Questions : ${lecture.questions.length} au lieu de ${QUESTIONS_DE00000071.length}`);
  for (const [label, test] of QUESTIONS_DE00000071) if (!textes.some(test)) out.push(`Question absente : ${label}`);
  for (const [i, t] of textes.entries()) {
    // §51.5 : « Aucune question sur les Velux » (écrits au devis), hors le raccord que le devis dit de deux façons.
    if (/velux|sk06|mk04|fenetre/.test(t) && !/zwc|pratikal|raccord|toles?/.test(t)) out.push(`Question sur une donnée écrite : ${lecture.questions[i]!.texte}`);
  }
  return out;
}
