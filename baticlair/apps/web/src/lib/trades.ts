/**
 * Métiers proposés (même liste que packages/domain/src/trades/index.ts,
 * seule source des profils de lecture ; l'API ignore un identifiant inconnu).
 */
export const TRADES: readonly { id: string; label: string }[] = [
  { id: "roofing", label: "Couverture, charpente, zinguerie" },
  { id: "masonry", label: "Maçonnerie" },
  { id: "drywall", label: "Plâtrerie, isolation" },
  { id: "painting", label: "Peinture" },
  { id: "tiling", label: "Carrelage" },
  { id: "flooring", label: "Sols, parquet" },
  { id: "electrical", label: "Électricité" },
  { id: "plumbing", label: "Plomberie, chauffage" },
  { id: "joinery", label: "Menuiserie" },
  { id: "hvac", label: "Chauffage, ventilation" },
  { id: "other", label: "Autre métier" },
];
