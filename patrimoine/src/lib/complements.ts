import { z } from "zod";
import type { AppData, Building, Company, Tenancy, Unit } from "./types";
import { activeTenancy, unitVacated, unitWithTenancy } from "./tenancy";

// Import de « compléments » : informations ajoutées à des éléments existants,
// retrouvés par leur nom (les lots par « Lot N » dans leur immeuble). Rien
// n'est supprimé ni créé, sauf le bail en cours d'un lot qui n'en a pas ;
// seuls les champs fournis sont renseignés. Un aperçu est présenté avant.

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

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const lotFields = z
  .object({
    type: z.enum(["studio", "T1", "T2", "T3", "T4", "T5+", "commerce", "bureau", "parking", "autre"]),
    surface: z.number(),
    mainRooms: z.number(),
    floor: z.string(),
    equipments: z.string(),
    accessories: z.string(),
    dpeClass: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
    status: z.enum(["occupe", "vacant"]),
  })
  .partial()
  .strict();

const person = z
  .object({ firstName: z.string(), lastName: z.string(), birthDate: date, birthPlace: z.string(), email: z.string(), phone: z.string(), address: z.string() })
  .partial()
  .strict();

const lease = z
  .object({
    tenants: z.array(person).min(1),
    guarantors: z.array(person),
    leaseType: z.enum(["nue", "meuble", "commercial", "professionnel", "autre"]),
    signDate: date,
    startDate: date,
    durationYears: z.number(),
    rent: z.number(),
    charges: z.number(),
    deposit: z.number(),
    indexLabel: z.string(),
    indexValue: z.number(),
    notes: z.string(),
  })
  .partial()
  .strict();

const lot = z.object({ name: z.string(), set: lotFields.optional(), lease: lease.optional() }).strict();

export const complementsSchema = z.object({
  type: z.literal("patrimoine-complements"),
  companies: z.array(z.object({ name: z.string(), set: companyFields })).default([]),
  buildings: z.array(z.object({ name: z.string(), set: buildingFields.default({}), units: unitFields.optional(), lots: z.array(lot).optional() })).default([]),
});

export type Complements = z.infer<typeof complementsSchema>;

export const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(SCI|SC|SARL|SAS)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");

/** Lot d'un immeuble : nom identique, sinon même numéro (« Lot 2 » ↔ « Lot 2 · jardinet », jamais « Lot 20 »). */
export function findLot(units: Unit[], name: string): Unit | undefined {
  const exact = units.find((u) => normName(u.name) === normName(name));
  if (exact) return exact;
  const n = /^\s*lot\s*(\d+)\s*$/i.exec(name)?.[1];
  if (!n) return undefined;
  const hits = units.filter((u) => new RegExp(`^\\s*lot\\s*0*${n}(?!\\d)`, "i").test(u.name));
  return hits.length === 1 ? hits[0] : undefined;
}

const euro = (n?: number) => (n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`);
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const drop = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as T;

export interface ComplementsPlan {
  data: AppData;
  lines: { label: string; ok: boolean; detail: string }[];
}

export function planComplements(data: AppData, patch: Complements): ComplementsPlan {
  const lines: ComplementsPlan["lines"] = [];
  const companies = data.companies.map((c) => ({ ...c }));
  const buildings = data.buildings.map((b) => ({ ...b }));
  let units = data.units;
  let tenancies = data.tenancies;

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
    if (Object.keys(b.set).length || count) lines.push({ label: target.name, ok: true, detail: `${Object.keys(b.set).length} information(s)${count ? ` · ${count} logement(s)` : ""}` });

    const own = units.filter((u) => u.buildingId === target.id);
    for (const l of b.lots ?? []) {
      const unit = findLot(own, l.name);
      if (!unit) {
        lines.push({ label: `${target.name} · ${l.name}`, ok: false, detail: "Lot introuvable dans l'immeuble" });
        continue;
      }
      let next: Unit = { ...unit, ...(l.set as Partial<Unit>) };
      const details: string[] = [];
      if (l.set && Object.keys(l.set).length) details.push(`${Object.keys(l.set).length} information(s) du logement`);
      if (l.set?.status === "vacant") {
        next = unitVacated(next);
        details.push("vacant");
      }
      if (l.lease) {
        const current = activeTenancy({ ...data, tenancies }, unit.id);
        const { leaseType, guarantors, tenants, ...rest } = l.lease;
        const t: Tenancy = {
          ...(current ?? { id: uid(), unitId: unit.id, status: "actif", chargesMode: "provision", paymentDay: 5, paymentTerm: "a_echoir", createdAt: new Date().toISOString() }),
          imported: current?.imported ?? true,
          ...drop(rest),
          tenants: (tenants ?? current?.tenants ?? [{}]).map(drop),
          ...(guarantors ? { guarantors: guarantors.map((g) => ({ kind: "personne" as const, wholeLease: true, ...drop(g) })) } : {}),
        };
        tenancies = current ? tenancies.map((x) => (x.id === current.id ? t : x)) : [...tenancies, t];
        const linked = unitWithTenancy(next, t);
        next = {
          ...linked,
          // Ce qui n'est pas dans le bail reste tel quel sur le logement.
          rent: t.rent ?? next.rent,
          charges: t.charges ?? next.charges,
          entryDate: t.startDate ?? next.entryDate,
          leaseStart: t.startDate ?? next.leaseStart,
          leaseDurationYears: t.durationYears ?? next.leaseDurationYears,
          indexLabel: t.indexLabel ?? next.indexLabel,
          indexValue: t.indexValue ?? next.indexValue,
          lastRevisionDate: next.lastRevisionDate,
          leaseType: leaseType ?? next.leaseType ?? "nue",
          revision: leaseType === "commercial" ? "triennale" : (next.revision ?? "annuelle"),
        };
        const who = [t.tenants.map((p) => p.lastName).filter(Boolean).join(", "), t.guarantors?.length ? `${t.guarantors.length} garant(s)` : ""].filter(Boolean).join(" · ");
        details.push(`${current ? "bail mis à jour" : "bail ajouté"} : ${who}`);
        if (t.rent !== undefined && t.rent !== unit.rent) details.push(`loyer ${euro(unit.rent)} → ${euro(t.rent)}`);
        if (t.charges !== undefined && t.charges !== unit.charges) details.push(`charges ${euro(unit.charges)} → ${euro(t.charges)}`);
      }
      units = units.map((u) => (u.id === unit.id ? next : u));
      lines.push({ label: `${target.name} · ${unit.name}`, ok: true, detail: details.join(" · ") || "rien à changer" });
    }
  }
  return { data: { ...data, companies, buildings, units, tenancies }, lines };
}
