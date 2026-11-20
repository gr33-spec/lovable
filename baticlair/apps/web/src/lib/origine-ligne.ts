import type { PurchaseItem } from "@/lib/api";

/**
 * L'ORIGINE D'UNE LIGNE (Greg, 16 novembre 2026 : « Chaque ligne de la liste finale indique son origine : "dit par toi",
 * "calculé" (avec la règle) ou "à vérifier" »). Une ligne reprise telle qu'écrite ou dite : « Dit par toi » ; une ligne
 * que le code a calculée avec une règle du métier : « Calculé » (sa règle est la précision de la ligne) ; une ligne qui
 * attend une réponse ou une confirmation : « À vérifier ».
 */
export function origineDeLaLigne(item: Pick<PurchaseItem, "kind" | "state">): "Dit par toi" | "Calculé" | "À vérifier" {
  if (item.state === "to_confirm") return "À vérifier";
  return item.kind === "computed" ? "Calculé" : "Dit par toi";
}
