import type { AppData, Unit } from "./types";

// Ce qui manque au dossier d'un logement loué (affiché dans Gestion → Locataires).
// Uniquement des vérifications factuelles : aucune pièce n'est exigée si le
// bail n'en prévoit pas (pas de garant = pas de caution attendue).

export interface MissingItem {
  id: "tenant" | "lease" | "caution" | "entry" | "rent";
  label: string;
}

export function unitMissing(data: AppData, unit: Unit): MissingItem[] {
  if (unit.status === "vacant") return [];
  const active = data.tenancies.find((t) => t.unitId === unit.id && t.status === "actif");
  const out: MissingItem[] = [];
  const named = active?.tenants.some((p) => p.lastName || p.firstName) || !!(unit.tenantLastName || unit.tenantFirstName);
  if (!named) out.push({ id: "tenant", label: "Nom du locataire" });
  if (!active?.signedLease) out.push({ id: "lease", label: "Bail signé" });
  const missingCautions = (active?.guarantors ?? []).filter((g) => !g.signedFile).length;
  if (missingCautions) out.push({ id: "caution", label: missingCautions > 1 ? `${missingCautions} cautions signées` : "Caution signée" });
  if (!(active?.startDate ?? unit.leaseStart ?? unit.entryDate)) out.push({ id: "entry", label: "Date d'entrée" });
  if (!(active?.rent ?? unit.rent)) out.push({ id: "rent", label: "Loyer" });
  return out;
}

/** Nombre d'éléments manquants par logement (logements loués seulement). */
export function missingCount(data: AppData, units: Unit[] = data.units): number {
  return units.reduce((n, u) => n + unitMissing(data, u).length, 0);
}
