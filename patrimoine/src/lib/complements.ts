import { z } from "zod";
import type { AppData, Building, Company, Unit } from "./types";

// Import de « compléments » : informations ajoutées à des éléments existants,
// retrouvés par leur nom. Rien n'est supprimé ni créé ; seuls les champs
// fournis sont renseignés. Un aperçu est présenté avant application.

const companyFields = z
  .object({
    address: z.string(),
    siren: z.string(),
    representative: z.string(),
    representativeRole: z.string(),
    email: z.string(),
    phone: z.string(),
    familySci: z.boolean(),
    partners: z.array(z.object({ name: z.string(), pct: z.number().optional() })),
  })
  .partial()
  .strict();

const buildingFields = z
  .object({
    address: z.string(),
    city: z.string(),
    legalRegime: z.enum(["copropriete", "monopropriete"]),
    constructionPeriod: z.enum(["avant_1949", "1949_1974", "1975_1989", "1990_2005", "apres_2005"]),
    condition: z.enum(["neuf", "bon", "correct", "a_renover"]),
    zoneTendue: z.boolean(),
    commonFacilities: z.string(),
    acquisitionDate: z.string(),
    acquisitionPrice: z.number(),
  })
  .partial()
  .strict();

const unitFields = z
  .object({
    habitatType: z.enum(["collectif", "individuel"]),
    heating: z.enum(["individuel", "collectif"]),
    heatingEnergy: z.string(),
    hotWater: z.enum(["individuel", "collectif"]),
    hotWaterEnergy: z.string(),
    equipments: z.string(),
  })
  .partial()
  .strict();

export const complementsSchema = z.object({
  type: z.literal("patrimoine-complements"),
  companies: z.array(z.object({ name: z.string(), set: companyFields })).default([]),
  buildings: z.array(z.object({ name: z.string(), set: buildingFields, units: unitFields.optional() })).default([]),
});

export type Complements = z.infer<typeof complementsSchema>;

export const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(SCI|SC|SARL|SAS)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");

export interface ComplementsPlan {
  data: AppData;
  lines: { label: string; ok: boolean; detail: string }[];
}

export function planComplements(data: AppData, patch: Complements): ComplementsPlan {
  const lines: ComplementsPlan["lines"] = [];
  const companies = data.companies.map((c) => ({ ...c }));
  const buildings = data.buildings.map((b) => ({ ...b }));
  let units = data.units;

  for (const c of patch.companies) {
    const target = companies.find((x) => normName(x.name) === normName(c.name));
    if (!target) {
      lines.push({ label: c.name, ok: false, detail: "Société introuvable (nom différent ?)" });
      continue;
    }
    Object.assign(target, c.set as Partial<Company>);
    lines.push({ label: target.name, ok: true, detail: `${Object.keys(c.set).length} information(s)` });
  }
  for (const b of patch.buildings) {
    const target = buildings.find((x) => normName(x.name) === normName(b.name));
    if (!target) {
      lines.push({ label: b.name, ok: false, detail: "Immeuble introuvable (nom différent ?)" });
      continue;
    }
    Object.assign(target, b.set as Partial<Building>);
    let count = 0;
    if (b.units) {
      units = units.map((u) => {
        if (u.buildingId !== target.id) return u;
        count += 1;
        return { ...u, ...(b.units as Partial<Unit>) };
      });
    }
    lines.push({ label: target.name, ok: true, detail: `${Object.keys(b.set).length} information(s)${count ? ` · ${count} logement(s)` : ""}` });
  }
  return { data: { ...data, companies, buildings, units }, lines };
}
