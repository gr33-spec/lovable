import { createHash } from "node:crypto";
/**
 * La vitesse (Greg, 23 novembre 2026 : « Ne recalcule que ce qui change ») : le calcul de l'écran est une fonction pure de
 * la fiche du métier (sa version), de la lecture, des réponses, des habitudes, des faits du chantier et des lignes. Le même
 * état redonne le même écran : il est gardé (les 64 derniers), et rendu en copie pour que personne ne touche l'original.
 * Rien ne change dans le résultat : seuls les recalculs du même état sont évités (début de chaque requête, tours de clôture).
 */
export const ECRANS = new Map<string, unknown>();
const ECRANS_MAX = 64;
export function ecranGarde<T>(ref: { id: string; version: string }, entree: object, calcul: () => T): T {
  const cle = createHash("sha256")
    .update(`${ref.id}@${ref.version}\n`)
    .update(JSON.stringify(entree, (k, v: unknown) => (k === "ref" ? undefined : v instanceof Map ? { __map: [...v] } : v instanceof Set ? { __set: [...v].sort() } : v)))
    .digest("hex");
  const deja = ECRANS.get(cle);
  if (deja !== undefined) {
    ECRANS.delete(cle);
    ECRANS.set(cle, deja);
    return copieProfonde(deja) as T;
  }
  const e = calcul();
  ECRANS.set(cle, copieProfonde(e));
  if (ECRANS.size > ECRANS_MAX) ECRANS.delete(ECRANS.keys().next().value!);
  return e;
}

/** Une copie des objets et des tableaux ; les valeurs d'une classe (Decimal, immuable) sont partagées telles quelles. */
export function copieProfonde(o: unknown): unknown {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(copieProfonde);
  if (o instanceof Map) return new Map([...o].map(([k, v]) => [k, copieProfonde(v)]));
  if (o instanceof Set) return new Set([...o].map(copieProfonde));
  const proto = Object.getPrototypeOf(o) as unknown;
  if (proto !== Object.prototype && proto !== null) return o;
  const r: Record<string, unknown> = {};
  for (const k of Object.keys(o)) r[k] = copieProfonde((o as Record<string, unknown>)[k]);
  return r;
}
