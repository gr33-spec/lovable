import type { Building, PropertyKind, PropertyUsage } from "./types";

// Nature et usage des biens. Le dossier banque ne parle d'« immeubles »
// que pour les biens déclarés comme tels ; un bien non précisé reste un
// « bien », jamais une catégorie devinée.

export const PROPERTY_KINDS: { value: PropertyKind; label: string; one: string; many: string }[] = [
  { value: "immeuble", label: "Immeuble de rapport", one: "immeuble de rapport", many: "immeubles de rapport" },
  { value: "maison", label: "Maison", one: "maison", many: "maisons" },
  { value: "appartement", label: "Appartement", one: "appartement", many: "appartements" },
  { value: "local", label: "Local commercial ou professionnel", one: "local commercial", many: "locaux commerciaux" },
  { value: "hangar", label: "Hangar / entrepôt", one: "hangar", many: "hangars" },
  { value: "terrain", label: "Terrain", one: "terrain", many: "terrains" },
  { value: "parking", label: "Parking / garage", one: "parking", many: "parkings" },
  { value: "autre", label: "Autre", one: "autre bien", many: "autres biens" },
];

export const PROPERTY_USAGES: { value: PropertyUsage; label: string }[] = [
  { value: "location", label: "Mis en location" },
  { value: "residence_principale", label: "Résidence principale" },
  { value: "residence_secondaire", label: "Résidence secondaire" },
  { value: "professionnel", label: "Usage professionnel" },
  { value: "vacant", label: "Vacant / non loué" },
];

export const kindLabel = (k?: PropertyKind) => PROPERTY_KINDS.find((x) => x.value === k)?.label;
export const usageLabel = (u?: PropertyUsage) => PROPERTY_USAGES.find((x) => x.value === u)?.label;

/** Biens à usage privé : présentés à part des biens locatifs. */
export const isPrivateUse = (b: Building) => b.usage === "residence_principale" || b.usage === "residence_secondaire";

/** Suggestion tirée du nom, proposée au propriétaire (jamais appliquée sans son accord). */
export function suggestNature(name: string): { kind?: PropertyKind; usage?: PropertyUsage } {
  const n = name.toLowerCase();
  const out: { kind?: PropertyKind; usage?: PropertyUsage } = {};
  if (/r[ée]sidence principale/.test(n)) out.usage = "residence_principale";
  else if (/r[ée]sidence secondaire/.test(n)) out.usage = "residence_secondaire";
  if (/\bimmeuble/.test(n)) out.kind = "immeuble";
  else if (/\bmaison|villa|long[èe]re|pavillon/.test(n)) out.kind = "maison";
  else if (/\bappartement|\bappart\b|\bstudio\b/.test(n)) out.kind = "appartement";
  else if (/\bhangar|entrep[ôo]t|b[âa]timent agricole/.test(n)) out.kind = "hangar";
  else if (/\blocal\b|commerce|boutique|bureaux?\b/.test(n)) out.kind = "local";
  else if (/\bterrain/.test(n)) out.kind = "terrain";
  else if (/\bparking|garage|box\b/.test(n)) out.kind = "parking";
  return out;
}

/** « 6 immeubles de rapport, 3 maisons et 1 hangar » ; les biens non précisés sont comptés à part. */
export function assetMix(buildings: Building[]): { total: number; text: string; unspecified: number } {
  const counts = new Map<PropertyKind, number>();
  let unspecified = 0;
  for (const b of buildings) {
    if (b.kind) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
    else unspecified++;
  }
  const parts = PROPERTY_KINDS.filter((k) => counts.has(k.value)).map((k) => {
    const n = counts.get(k.value)!;
    return `${n} ${n > 1 ? k.many : k.one}`;
  });
  if (unspecified) parts.push(`${unspecified} bien${unspecified > 1 ? "s" : ""} de nature non précisée`);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}` : (parts[0] ?? "");
  return { total: buildings.length, text, unspecified };
}

/** « bien » / « biens immobiliers » : le mot juste pour un total. */
export const biens = (n: number) => `${n} bien${n > 1 ? "s" : ""} immobilier${n > 1 ? "s" : ""}`;
