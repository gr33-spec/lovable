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
  { id: "carpentry", label: "Charpente" },
  { id: "waterproofing", label: "Étanchéité" },
  { id: "cladding", label: "Bardage" },
  { id: "facade", label: "Façade, ravalement" },
  { id: "ceiling", label: "Plafonds suspendus" },
  { id: "interior_joinery", label: "Menuiserie intérieure, agencement" },
  { id: "kitchen", label: "Cuisine" },
  { id: "solar", label: "Photovoltaïque" },
  { id: "other", label: "Autre métier" },
];
