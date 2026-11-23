import type { PurchaseItem } from "@/lib/api";

/**
 * L'ORIGINE D'UNE LIGNE (Greg, 16 novembre 2026 : « dit par toi », « calculé » (avec la règle) ou « à vérifier »).
 * RÈGLE CHANGÉE (Greg, 22 novembre 2026) : « À vérifier » seulement quand la ligne repose sur une valeur par défaut ou une
 * hypothèse incertaine (le serveur le dit, avec la raison) ; une ligne calculée avec des règles validées et les infos du
 * devis : « Calculé ». Une quantité réécrite par l'artisan : « Modifié par toi ». Avant : tout état « à confirmer ».
 */
export type Origine = "Dit par toi" | "Calculé" | "À vérifier" | "Modifié par toi";
export function origineDeLaLigne(item: Pick<PurchaseItem, "kind" | "state" | "verification"> & Partial<Pick<PurchaseItem, "postes">>): Origine {
  const v = item.verification?.etat;
  // Un poste du calcul corrigé dans « Calcul proposé » (Greg, 22 novembre 2026) : la ligne le dit aussi.
  if (v === "modifie" || item.postes?.some((x) => x.modifie)) return "Modifié par toi";
  if (v === "a_verifier") return "À vérifier";
  if (v === "calcule") return "Calculé";
  if (v === "dit") return "Dit par toi";
  if (item.state === "to_confirm") return "À vérifier";
  return item.kind === "computed" ? "Calculé" : "Dit par toi";
}

/** « 3 801,6 » : un nombre du calcul, lisible (deux décimales au plus, sans zéros inutiles). */
export function nombreDuCalcul(valeur: string): string {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return valeur;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: n >= 100 ? 0 : 2 });
}
