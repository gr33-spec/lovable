import { normalizeText } from "../trades/trade-profile.js";

/**
 * MÉMOIRE D'UNE ENTREPRISE : ce que « votre entreprise utilise
 * habituellement ». Jamais une connaissance générale (le référentiel), jamais
 * une décision de chantier : une troisième chose, propre à UNE entreprise.
 *
 * Une préférence ne contient qu'un CHOIX (un produit du référentiel, un
 * fournisseur, un nom) : jamais une caractéristique fabricant ni une règle.
 * Elle ne passe jamais outre le référentiel ni une incompatibilité technique :
 * c'est au moteur de l'écarter (voir engine.ts, « preferenceIgnored »).
 */
export type PreferenceKind =
  /** Fournisseur habituel pour une famille. Risque faible. */
  | "supplier"
  /** Appellation interne de l'entreprise (« écran maison » = produit X). Risque faible. */
  | "naming"
  /** Produit habituel pour un emplacement ou une famille. Plus important. */
  | "product"
  /** Marque ou gamme habituelle. Plus important. */
  | "brand"
  /** Conditionnement habituel (rouleau de 50 m plutôt que 25 m). Plus important. */
  | "packaging"
  /** Marge de casse ou de coupe. Sensible : peut changer fortement le quantitatif. */
  | "waste"
  /** Réponse habituelle à un paramètre d'entreprise (« param:faconnage » = « 1 »). Apprise à la 2e confirmation. */
  | "param";

/**
 * Politique d'un type de préférence. PARAMÈTRES EXPÉRIMENTAUX de la bêta
 * (PD-045) : ils seront ajustés d'après ce que la bêta montre. Rien ailleurs
 * dans le code ne suppose leurs valeurs.
 */
export interface PreferencePolicy {
  /** Chantiers DIFFÉRENTS où le même choix est fait avant d'être utilisé sans question. */
  confirmationsToActivate: number;
  /** Au-delà, sans nouvelle confirmation, la préférence est reproposée (jamais appliquée en silence). */
  staleAfterDays: number;
  /**
   * false : jamais apprise des choix faits sur les chantiers ; seulement réglée
   * explicitement par l'artisan (ex. la marge, trop sensible pour être devinée).
   */
  learnable: boolean;
}

export const DEFAULT_PREFERENCE_POLICIES: Readonly<Record<PreferenceKind, PreferencePolicy>> = {
  supplier: { confirmationsToActivate: 1, staleAfterDays: 365, learnable: true },
  naming: { confirmationsToActivate: 1, staleAfterDays: 365, learnable: true },
  product: { confirmationsToActivate: 2, staleAfterDays: 365, learnable: true },
  brand: { confirmationsToActivate: 2, staleAfterDays: 365, learnable: true },
  packaging: { confirmationsToActivate: 2, staleAfterDays: 365, learnable: true },
  waste: { confirmationsToActivate: 1, staleAfterDays: 365, learnable: false },
  param: { confirmationsToActivate: 2, staleAfterDays: 365, learnable: true },
};

export interface CompanyPreference {
  /** Identifiant de stockage, quand la préférence est déjà enregistrée. */
  id?: string;
  kind: PreferenceKind;
  /** Ce que la préférence concerne : « slot:ecran », « family:underlay », « name:ecran maison ». */
  key: string;
  /** Le choix : identifiant de produit du référentiel, de fournisseur, ou valeur réglée. */
  value: string;
  /** « active » : peut servir ; « replaced » : remplacée par une autre ; « disabled » : l'artisan n'en veut plus. */
  status: "active" | "replaced" | "disabled";
  /** Chantiers où ce choix a été fait ou confirmé (un chantier compte une fois). */
  confirmations: { projectId: string; at: string }[];
  /** Réglée explicitement par l'artisan (« désormais ») : active sans attendre plusieurs chantiers. */
  explicit: boolean;
  /** Dernier chantier où l'artisan a choisi AUTRE CHOSE pour la même clé. */
  lastContradictedAt: string | null;
  createdAt: string;
}

/** Où en est une préférence aujourd'hui. */
export type PreferenceStanding =
  /** Établie : utilisée sans question (« Écran habituel de votre entreprise : X [Modifier] »). */
  | "active"
  /** Pas encore établie (pas assez de chantiers) : proposée en une question. */
  | "trial"
  /** Établie autrefois, mais trop ancienne ou contredite depuis : proposée en une question. */
  | "to_reconfirm"
  /** Remplacée ou abandonnée : ignorée. */
  | "inactive";

const DAY = 86_400_000;
const lastConfirmation = (p: CompanyPreference) => p.confirmations.map((c) => c.at).sort().at(-1) ?? p.createdAt;

export function preferenceStanding(p: CompanyPreference, now: Date, policies = DEFAULT_PREFERENCE_POLICIES): PreferenceStanding {
  if (p.status !== "active") return "inactive";
  const policy = policies[p.kind];
  const last = lastConfirmation(p);
  if (p.lastContradictedAt && p.lastContradictedAt > last) return "to_reconfirm";
  if (now.getTime() - new Date(last).getTime() > policy.staleAfterDays * DAY) return "to_reconfirm";
  const projects = new Set(p.confirmations.map((c) => c.projectId)).size;
  if (!p.explicit && projects < policy.confirmationsToActivate) return "trial";
  return "active";
}

const sameKey = (a: { kind: PreferenceKind; key: string }, b: { kind: PreferenceKind; key: string }) => a.kind === b.kind && normalizeText(a.key) === normalizeText(b.key);

/**
 * L'artisan a fait un choix sur un chantier (répondu, confirmé, corrigé).
 * Renvoie la nouvelle mémoire (fonction pure). Le choix ne devient la
 * préférence établie qu'après assez de chantiers différents ; un choix
 * différent de la préférence établie la fait reproposer (jamais d'effacement
 * silencieux) et, s'il se répète, la remplace.
 */
export function learnFromChoice(
  memory: readonly CompanyPreference[],
  choice: { kind: PreferenceKind; key: string; value: string; projectId: string; at: string },
  policies = DEFAULT_PREFERENCE_POLICIES,
): CompanyPreference[] {
  const policy = policies[choice.kind];
  if (!policy.learnable) return [...memory];
  const out = memory.map((p) => ({ ...p, confirmations: [...p.confirmations] }));
  const live = out.filter((p) => sameKey(p, choice) && p.status === "active");
  // Les autres préférences actives sur la même clé sont contredites par ce choix.
  for (const p of live) if (p.value !== choice.value) p.lastContradictedAt = choice.at;
  let mine = live.find((p) => p.value === choice.value);
  if (!mine) {
    mine = { kind: choice.kind, key: choice.key, value: choice.value, status: "active", confirmations: [], explicit: false, lastContradictedAt: null, createdAt: choice.at };
    out.push(mine);
  }
  if (!mine.confirmations.some((c) => c.projectId === choice.projectId)) mine.confirmations.push({ projectId: choice.projectId, at: choice.at });
  else mine.confirmations = mine.confirmations.map((c) => (c.projectId === choice.projectId ? { ...c, at: choice.at } : c));
  // Le nouveau choix a atteint le seuil : il remplace l'ancien (gardé, marqué « remplacé »).
  if (new Set(mine.confirmations.map((c) => c.projectId)).size >= policy.confirmationsToActivate) {
    for (const p of live) if (p !== mine) p.status = "replaced";
  }
  return out;
}

/** « Désormais, c'est Y » : réglage explicite de l'artisan. Établi tout de suite ; l'ancien est gardé, remplacé. */
export function setPreference(
  memory: readonly CompanyPreference[],
  pref: { kind: PreferenceKind; key: string; value: string; projectId: string | null; at: string },
): CompanyPreference[] {
  const out = memory.map((p) => (sameKey(p, pref) && p.status === "active" ? { ...p, status: "replaced" as const } : { ...p }));
  out.push({
    kind: pref.kind,
    key: pref.key,
    value: pref.value,
    status: "active",
    confirmations: pref.projectId ? [{ projectId: pref.projectId, at: pref.at }] : [],
    explicit: true,
    lastContradictedAt: null,
    createdAt: pref.at,
  });
  return out;
}

/** « Ne plus utiliser » : la préférence est gardée dans l'historique, désactivée. */
export function disablePreference(memory: readonly CompanyPreference[], target: { kind: PreferenceKind; key: string }): CompanyPreference[] {
  return memory.map((p) => (sameKey(p, target) && p.status === "active" ? { ...p, status: "disabled" as const } : { ...p }));
}

/** La préférence à utiliser pour une clé, et COMMENT : sans question (établie) ou proposée (à confirmer). */
export function resolvePreference(
  memory: readonly CompanyPreference[],
  target: { kind: PreferenceKind; key: string },
  now: Date,
  policies = DEFAULT_PREFERENCE_POLICIES,
): { value: string; use: "silent" | "propose"; standing: PreferenceStanding } | null {
  const candidates = memory
    .filter((p) => sameKey(p, target))
    .map((p) => ({ p, standing: preferenceStanding(p, now, policies) }))
    .filter((c) => c.standing !== "inactive")
    // L'établie d'abord ; sinon la plus récemment confirmée.
    .sort((a, b) => Number(b.standing === "active") - Number(a.standing === "active") || lastConfirmation(b.p).localeCompare(lastConfirmation(a.p)));
  const best = candidates[0];
  if (!best) return null;
  return { value: best.p.value, use: best.standing === "active" ? "silent" : "propose", standing: best.standing };
}

/**
 * Préférences de produit prêtes pour le moteur : les établies sont utilisées
 * sans question, les autres (en essai, à reconfirmer) seulement PROPOSÉES.
 * Une préférence périmée ne produit donc jamais un ✓ en silence.
 */
export function enginePreferences(
  memory: readonly CompanyPreference[],
  now: Date,
  policies = DEFAULT_PREFERENCE_POLICIES,
): { products: Record<string, string>; proposals: Record<string, string>; params: Record<string, string> } {
  const products: Record<string, string> = {};
  const proposals: Record<string, string> = {};
  const keys = new Set(memory.filter((p) => p.kind === "product").map((p) => normalizeText(p.key)));
  for (const key of keys) {
    const r = resolvePreference(memory, { kind: "product", key }, now, policies);
    if (!r) continue;
    const engineKey = key.replace(/^(slot|family):/, "");
    (r.use === "silent" ? products : proposals)[engineKey] = r.value;
  }
  // Habitudes de paramètre (« je façonne ») : seulement ÉTABLIES (deux chantiers), jamais proposées en silence sinon.
  const params: Record<string, string> = {};
  for (const key of new Set(memory.filter((p) => p.kind === "param").map((p) => normalizeText(p.key)))) {
    const r = resolvePreference(memory, { kind: "param", key }, now, policies);
    if (r?.use === "silent") params[key.replace(/^param:/, "")] = r.value;
  }
  return { products, proposals, params };
}
