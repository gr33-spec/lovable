import { normalizeText } from "../trades/trade-profile.js";
import type { SiteFact } from "./context.js";
import type { Question } from "./engine.js";
import { baseOf, type ParamDef, type Referential, type WorkItemType } from "./model.js";
import { readDimension, type QuotePlan } from "./plan.js";
import { parseRefUnit, sameDim } from "./units.js";

/**
 * §51 (fondateur, 2026-10-10) : LE MOTEUR VOIT LE CHANTIER AVANT DE COMPTER. Temps un : l'IA lit le devis entier et
 * construit la FICHE DE CHANTIER (type d'ouvrage, matériau, surface, dimensions, nombre d'éléments, accessoires), chaque
 * donnée avec son origine : lue au devis, déduite (avec la règle) ou manquante. Rien n'y entre qui ne vienne du devis ou
 * des réponses (règle numéro un). Temps deux : les questions viennent des trous de la fiche, une par donnée manquante,
 * jamais sur une donnée lue ou déduite. Temps trois : le calcul reste du code, ligne par ligne, mais chaque ligne puise
 * dans la fiche : les bacs, les pattes et les bandes d'un même toit sortent du même rampant et de la même largeur.
 */
export type FicheOrigine = "devis" | "deduite" | "reponse" | "manquante";

export interface FicheDonnee {
  /** Nom de la donnée (« rampant », « nombre de descentes ») ; la clé du paramètre quand elle en a un (« param:… »). */
  cle: string;
  /** Ce qu'on lit à l'écran : « Rampant ». */
  libelle: string;
  /** « 7 m », « joint debout », « Quartz-Zinc 0,65 mm » ; null pour une donnée manquante. */
  valeur: string | null;
  origine: FicheOrigine;
  /** Donnée déduite : la règle, en clair (« largeur = surface ÷ rampant »). */
  regle?: string | null;
  /** Où elle est écrite (« Devis, ligne 1 : « rampant de 7 m » »), ou la réponse de l'artisan. */
  preuve?: string | null;
  /** Donnée manquante : la question qui la demande (une seule par donnée). */
  question?: string | null;
}

export interface FicheChantier {
  donnees: FicheDonnee[];
}

/**
 * Les données d'un TOIT, partagées par tous ses ouvrages : la pente, le rampant, la zone, les descentes, le zinc. Une
 * donnée de pièce (le développé d'une bande, son façonnage) reste à sa ligne : la fiche ne la prête jamais à une autre.
 */
export const FICHE_PARAMS_CHANTIER = ["pente", "longueur_rampant", "nb_pans", "zone", "nb_descentes", "diametre_descente", "hauteur_descente", "epaisseur_zinc", "aspect_zinc", "entraxe_supports"] as const;

const singular = (t: string) =>
  normalizeText(t)
    .split(" ")
    .map((w) => w.replace(/s$/, ""))
    .join(" ")
    .replace(/^(?:nombre|nb) (?:de |d )?/, "nb ")
    .trim();

/** Le paramètre du référentiel que nomme une donnée de la fiche (« rampant », « nombre de descentes »), parmi ceux d'un toit. */
export function paramOfDonnee(ref: Referential, name: string): ParamDef | null {
  const n = singular(name);
  const defs = ref.workItems.flatMap((w) => w.params).filter((p) => (FICHE_PARAMS_CHANTIER as readonly string[]).includes(p.key));
  return (
    defs.find((p) => {
      const names = [p.key.replace(/_/g, " "), p.label, ...(p.textLabels ?? [])].map(singular);
      return names.includes(n) || names.some((x) => x.length > 3 && (n === `nb ${x}` || `${n}` === x.replace(/^longueur (?:du |de la |des )?/, "")));
    }) ?? null
  );
}

const ORIGINES: Record<string, FicheOrigine> = { lue: "devis", lu: "devis", devis: "devis", "lue au devis": "devis", deduite: "deduite", deduit: "deduite", manquante: "manquante", manquant: "manquante", reponse: "reponse" };

/** La fiche telle que l'IA la rend (format technique du §51.1) : une entrée par donnée, son origine, sa règle si déduite. */
export function parseFiche(raw: unknown): FicheChantier | null {
  if (!Array.isArray(raw)) return null;
  const donnees: FicheDonnee[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.donnee === "string" ? o.donnee.trim() : "";
    const origine = ORIGINES[normalizeText(typeof o.origine === "string" ? o.origine : "")];
    if (!name || !origine || name.length > 60) continue;
    const valeur = typeof o.valeur === "string" && o.valeur.trim() ? o.valeur.trim().slice(0, 120) : null;
    // Une donnée lue ou déduite sans valeur n'est qu'un trou.
    const kept: FicheOrigine = valeur === null ? "manquante" : origine === "manquante" ? "manquante" : origine;
    donnees.push({
      cle: normalizeText(name).replace(/\s+/g, "_"),
      libelle: name.charAt(0).toUpperCase() + name.slice(1),
      valeur: kept === "manquante" ? null : valeur,
      origine: kept,
      regle: kept === "deduite" && typeof o.regle === "string" ? o.regle.trim().slice(0, 160) : null,
      preuve: typeof o.preuve === "string" ? o.preuve.trim().slice(0, 200) : null,
    });
  }
  return { donnees };
}

/** « 1 » → « Quartz-Zinc » : la valeur codée d'un paramètre nommé, lue dans le texte de la fiche. */
function codedValue(def: ParamDef, text: string): string | null {
  const t = ` ${normalizeText(text)} `;
  const hits = (def.textValues ?? []).filter((v) => v.keywords.some((k) => t.includes(` ${normalizeText(k)} `) || t.includes(normalizeText(k))));
  return hits.length === 1 ? hits[0]!.value : null;
}

/**
 * Temps trois (§51.3) : les données d'un toit (lues ou déduites, ou répondues) deviennent des faits DU CHANTIER, sans
 * ouvrage ni ligne : chaque ouvrage du toit puise dans les mêmes. Une donnée de la fiche dont le devis donne une autre
 * valeur sur une ligne reste une contradiction (une question), jamais tranchée en silence.
 */
export function ficheFacts(ref: Referential, fiche: FicheChantier | null | undefined): SiteFact[] {
  const facts: SiteFact[] = [];
  for (const d of fiche?.donnees ?? []) {
    if (d.origine === "manquante" || !d.valeur) continue;
    const def = paramOfDonnee(ref, d.libelle) ?? paramOfDonnee(ref, d.cle.replace(/_/g, " "));
    if (!def) continue;
    const evidence = `Fiche de chantier : « ${d.libelle} : ${d.valeur} »${d.origine === "deduite" ? ` (déduit : ${d.regle ?? "règle non dite"})` : d.origine === "reponse" ? " (ta réponse)" : d.preuve ? ` (${d.preuve})` : ""}`;
    const origin = d.origine === "reponse" ? "artisan" : "devis";
    if (def.unit === "u" && def.textValues?.length) {
      const coded = codedValue(def, d.valeur);
      if (coded) {
        facts.push({ key: def.key, value: coded, unit: "u", evidence, origin });
        continue;
      }
    }
    const bare = /^\s*\d+(?:[.,]\d+)?\s*$/.test(d.valeur) && def.unit === "u" ? { value: d.valeur.trim().replace(",", "."), unit: "u" } : null;
    // « 0,65 » pour l'épaisseur du zinc : dans l'unité du paramètre.
    const first = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m²|m2|ml|m|°|%)?/.exec(d.valeur);
    const found = bare ?? readDimension(d.valeur) ?? (first ? (first[2] ? readDimension(`${first[1]} ${first[2]}`) : def.unit === "mm" || def.unit === "u" ? { value: first[1]!.replace(",", "."), unit: def.unit } : null) : null);
    if (!found) continue;
    try {
      if (!sameDim(parseRefUnit(found.unit).dim, parseRefUnit(def.unit).dim)) continue;
    } catch {
      continue;
    }
    facts.push({ key: def.key, value: found.value, unit: found.unit, evidence, origin });
  }
  return facts;
}

const shown = (v: string, unit: string) => `${v.replace(".", ",")}${unit === "u" ? "" : unit === "m2" ? " m²" : unit === "°" ? "°" : ` ${unit}`}`;

/** La valeur dite d'une réponse (« 2 » → « je commande façonné »), comme sur les boutons. */
function answerText(def: ParamDef, value: string | { value: string; unit: string }): string {
  const v = typeof value === "string" ? value : value.value;
  return def.display?.[v] ?? def.choices?.find((c) => c.value === v)?.label ?? (typeof value === "string" ? value : shown(value.value, value.unit));
}

type Answer = string | { value: string; unit: string } | null;

/**
 * LA FICHE À L'ÉCRAN (§51, §50.7) : ce que l'IA a lu et déduit, complété par ce que le code lit dans les lignes (une
 * donnée que l'IA aurait omise ne disparaît pas), les réponses de l'artisan, puis les trous : une donnée manquante par
 * question ouverte du calcul, jamais une deuxième pour la même donnée.
 */
export function ficheChantier(input: {
  ref: Referential;
  ai: FicheChantier | null | undefined;
  plan: QuotePlan;
  answers: Readonly<Record<string, Answer>>;
  /** Les questions encore ouvertes du calcul (écran des questions). */
  questions: readonly Question[];
  /** Le nom lisible de chaque ligne du devis (« ligne 1 ») pour les preuves, à la place de son identifiant. */
  lignes?: ReadonlyMap<string, string>;
}): FicheChantier {
  const { ref, plan } = input;
  const donnees: FicheDonnee[] = (input.ai?.donnees ?? []).map((d) => ({ ...d }));
  const keyOf = (d: FicheDonnee) => paramOfDonnee(ref, d.libelle)?.key ?? paramOfDonnee(ref, d.cle.replace(/_/g, " "))?.key ?? d.cle;
  const has = (key: string) => donnees.some((d) => keyOf(d) === key && d.origine !== "manquante");
  // Ce que le code a lu dans les lignes du devis pour le toit (rampant, pente, épaisseur…), si l'IA ne l'a pas dit.
  for (const key of FICHE_PARAMS_CHANTIER) {
    if (has(key)) continue;
    for (const inputWork of plan.inputs) {
      const p = inputWork.params[key];
      const def = ref.workItems.find((w) => w.id === baseOf(inputWork.workItemId))?.params.find((x) => x.key === key);
      if (!p || !def || p.origin !== "devis" || !/«/.test(p.evidence ?? "")) continue;
      const preuve = [...(input.lignes ?? new Map<string, string>())].reduce((t, [id, name]) => t.split(id).join(name), p.evidence ?? "");
      donnees.push({ cle: key, libelle: def.label, valeur: def.textValues?.length ? answerText(def, p.value) : shown(p.value, p.unit), origine: "devis", preuve: preuve || null });
      break;
    }
  }
  // Les réponses de l'artisan : la donnée prend sa valeur, origine « ta réponse ».
  for (const [key, value] of Object.entries(input.answers)) {
    const m = /^param:([a-z0-9_]+)(?:@(.+))?$/.exec(key);
    if (!m || value === null) continue;
    const work: WorkItemType | undefined = m[2] ? ref.workItems.find((w) => w.id === baseOf(m[2])) : ref.workItems.find((w) => w.params.some((p) => p.key === m[1]));
    const def = work?.params.find((p) => p.key === m[1]);
    if (!def) continue;
    const cle = m[2] ? key.slice("param:".length) : m[1]!;
    const libelle = m[2] && !(FICHE_PARAMS_CHANTIER as readonly string[]).includes(def.key) ? `${def.label} (${work!.label.replace(/\s*\(.*$/, "")})` : def.label;
    // La réponse écrite et relue (« les bacs façonnés, la bande je la plie ») dit déjà la donnée : elle reste, en clair.
    if (donnees.some((d) => d.origine === "reponse" && d.cle !== cle && normalizeText(d.libelle) === normalizeText(def.label))) continue;
    const at = donnees.findIndex((d) => keyOf(d) === cle || d.cle === cle);
    const entry: FicheDonnee = { cle, libelle: at >= 0 ? donnees[at]!.libelle : libelle, valeur: answerText(def, value), origine: "reponse", preuve: "Ta réponse" };
    if (at >= 0) donnees[at] = entry;
    else donnees.push(entry);
  }
  // Les trous : une donnée manquante par question ouverte, et une seule (§51.2) ; une donnée lue n'en a pas.
  for (const q of input.questions) {
    const m = /^param:([a-z0-9_]+)(?:@(.+))?$/.exec(q.key);
    // Les consommables (oui / non) ne sont pas une donnée du chantier.
    if (!m || m[1] === "consommables") continue;
    const cle = m[2] ? q.key.slice("param:".length) : m[1]!;
    if (donnees.some((d) => (keyOf(d) === cle || d.cle === cle) && d.origine === "manquante")) continue;
    if (has(cle)) continue;
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === m[1]);
    donnees.push({ cle, libelle: def?.label ?? q.text, valeur: null, origine: "manquante", question: q.text });
  }
  // Un trou déclaré par l'IA mais comblé depuis (réponse, lecture du code) ne reste pas.
  return { donnees: donnees.filter((d) => d.origine !== "manquante" || !donnees.some((x) => x !== d && x.origine !== "manquante" && keyOf(x) === keyOf(d))) };
}

/**
 * §51.2 : la relecture d'une réponse « Autre » par l'IA. Elle met la fiche à jour (une donnée changée ou ajoutée,
 * origine « ta réponse »), range ce qu'elle a compris dans les réponses du calcul, et peut ouvrir UNE donnée manquante
 * de plus (une question avant de calculer).
 */
export interface FicheRelecture {
  donnees: FicheDonnee[];
  /** Les réponses comprises : clé de question → valeur (« param:faconnage@couverture-zinc-joint-debout » → « 2 »). */
  reponses: { question: string; valeur: string; unite?: string | null }[];
  /** La donnée que la réponse ouvre, s'il y en a une : sa question. */
  manque?: { donnee: string; question: string } | null;
}

export function appliquerRelecture(fiche: FicheChantier | null | undefined, relecture: FicheRelecture): FicheChantier {
  const donnees = [...(fiche?.donnees ?? [])];
  for (const d of relecture.donnees) {
    const at = donnees.findIndex((x) => x.cle === d.cle || normalizeText(x.libelle) === normalizeText(d.libelle));
    const entry = { ...d, origine: d.origine === "manquante" ? ("manquante" as const) : ("reponse" as const) };
    if (at >= 0) donnees[at] = entry;
    else donnees.push(entry);
  }
  if (relecture.manque) {
    const cle = normalizeText(relecture.manque.donnee).replace(/\s+/g, "_");
    if (!donnees.some((d) => d.cle === cle)) donnees.push({ cle, libelle: relecture.manque.donnee, valeur: null, origine: "manquante", question: relecture.manque.question });
  }
  return { donnees };
}

/** La fiche en lignes courtes, dans l'ordre (le chantier en bref, §50.7) : « Rampant : 7 m ». */
export function ficheLignes(fiche: FicheChantier): string[] {
  return fiche.donnees.filter((d) => d.origine !== "manquante" && d.valeur).map((d) => `${d.libelle} : ${d.valeur}`);
}
