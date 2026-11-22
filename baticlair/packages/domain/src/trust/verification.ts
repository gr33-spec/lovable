import type { Assumption } from "../referential/engine.js";
import { DEFAUTS_AFFICHES, type PurchaseItem } from "./purchase-view.js";

/**
 * « À VÉRIFIER » OU « CALCULÉ » (Greg, 22 novembre 2026) : « À vérifier seulement quand la ligne repose sur une valeur par
 * défaut ou une hypothèse incertaine. La flèche dit laquelle. Une ligne calculée avec des règles validées et les infos du
 * devis affiche seulement Calculé. » Avant : toute ligne calculée pouvait se dire « à vérifier ».
 * Une valeur par défaut compte seulement si c'en est une vraie : ni lue au devis, ni déduite d'autres données, ni une donnée
 * que la fiche affiche sans jamais la demander (la largeur de bobine de 650).
 */
export type EtatDeLaLigne = "calcule" | "a_verifier" | "dit" | "modifie";

export function verificationDeLaLigne(item: Pick<PurchaseItem, "kind" | "state" | "toConfirm" | "waitsOn" | "assumptionKeys" | "edited">, assumptions: readonly Assumption[]): { etat: EtatDeLaLigne; raisons: string[] } {
  if (item.edited?.includes("quantity")) return { etat: "modifie", raisons: [] };
  const raisons: string[] = [];
  for (const r of item.toConfirm ?? []) raisons.push(r.text);
  if ((item.waitsOn ?? []).length > 0) raisons.push("Une réponse est attendue");
  for (const key of item.assumptionKeys) {
    const a = assumptions.find((x) => x.key === key);
    // Une valeur déduite des données (`derived:` : la largeur d'un pan), lue au devis, calculée, affichée sans jamais être
    // demandée, ou validée par le fondateur n'est pas une hypothèse à vérifier.
    if (!a || a.key.startsWith("derived:") || a.fromQuote || a.computed || a.shownOnly || a.sur || DEFAUTS_AFFICHES.has(a.key)) continue;
    // Déjà dite par sa règle « Valeur par défaut à confirmer : … » : une seule fois.
    if ((item.toConfirm ?? []).some((r) => r.key.startsWith(`defaut:${a.key}`))) continue;
    const unite = !a.unit || a.unit === "u" || !/\d/.test(a.value) ? "" : a.unit === "°" ? "°" : ` ${a.unit.replace("m2", "m²")}`;
    const texte = `${a.label} ${a.value}${unite} : valeur par défaut`;
    if (!raisons.includes(texte)) raisons.push(texte);
  }
  if (raisons.length > 0) return { etat: "a_verifier", raisons };
  return { etat: item.kind === "computed" ? "calcule" : "dit", raisons: [] };
}
