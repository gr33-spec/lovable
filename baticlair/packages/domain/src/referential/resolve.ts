import { containsKeyword, normalizeText } from "../trades/trade-profile.js";
import type { Product, Referential } from "./model.js";

/**
 * Reconnaissance d'un produit dans un texte (ligne de devis client ou de
 * devis fournisseur), par ses appellations chantier et fournisseur.
 *
 * Elle propose, elle ne décide pas : un seul produit reconnu par une
 * appellation reste « à confirmer » par l'artisan (« J'ai identifié une
 * tuile HP10. C'est bien ce modèle ? ») ; plusieurs produits = une question
 * de choix, jamais le premier de la liste.
 */
export interface Identification {
  /** Produits dont une appellation figure dans le texte, avec l'appellation trouvée. */
  candidates: { product: Product; alias: string }[];
}

export function identifyProducts(text: string, ref: Referential, family?: string): Identification {
  const normalized = normalizeText(text);
  const candidates: Identification["candidates"] = [];
  for (const product of ref.products) {
    if (family && product.family !== family) continue;
    // L'appellation la plus longue l'emporte (« hp 10 huguenot » plutôt que « hp 10 »).
    const alias = [...product.aliases].sort((a, b) => b.length - a.length).find((a) => containsKeyword(normalized, a));
    if (alias) candidates.push({ product, alias });
  }
  return { candidates };
}
