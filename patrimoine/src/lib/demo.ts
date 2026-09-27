import type { AppData, Unit } from "./types";
import { emptyData } from "./types";

// Jeu de démonstration : structure réelle (noms des sociétés) et chiffres
// fictifs. Tous les éléments portent `demo: true` pour être supprimés en un clic.

export function demoData(): AppData {
  const d = emptyData();
  d.settings = { onboardingDone: true, groupName: "Groupe SC DU GOELO" };

  const company = (id: string, name: string, extra: Partial<AppData["companies"][number]> = {}) =>
    d.companies.push({ id, name, kind: "SCI", parentId: "demo-goelo", ownershipPct: 99, demo: true, ...extra });

  d.companies.push({
    id: "demo-goelo",
    name: "SC DU GOELO",
    kind: "holding",
    cash: 85000,
    partners: [{ name: "Associé principal", pct: 100 }],
    notes: "Holding de tête (données de démonstration).",
    demo: true,
  });
  company("demo-ges", "GES INVEST", { cash: 32000, partnerAccounts: 60000 });
  company("demo-port", "DU PORT", { cash: 18000, partnerAccounts: 25000 });
  company("demo-armor", "ARMOR IMMO", { cash: 41000, partnerAccounts: 80000 });
  company("demo-tregor", "DU TRÉGOR", { cash: 9000 });
  company("demo-paso", "PASO IMMO", { cash: 22000, partnerAccounts: 40000 });
  company("demo-leff", "DU LEFF", { cash: 12000 });
  company("demo-mansarde", "MANSARDE", { cash: 15000, partnerAccounts: 30000 });

  const b = (x: AppData["buildings"][number]) => d.buildings.push({ ...x, demo: true });
  b({
    id: "demo-b-paimpol",
    name: "Immeuble de Paimpol",
    companyId: "demo-ges",
    address: "12 quai Morand",
    city: "Paimpol",
    acquisitionDate: "2019-04-15",
    acquisitionPrice: 520000,
    valueMode: "manual",
    value: 700000,
    surface: 380,
    propertyTax: 5200,
    insurance: 1400,
    accounting: 900,
    otherCharges: 1200,
    condition: "bon",
    recentWorks: "Toiture refaite en 2022",
  });
  b({
    id: "demo-b-port",
    name: "Immeuble du Port",
    companyId: "demo-port",
    city: "Saint-Quay-Portrieux",
    acquisitionDate: "2016-03-01",
    acquisitionPrice: 470000,
    value: 540000,
    rentMonthly: 3100,
    lotsCount: 4,
    propertyTax: 3900,
    insurance: 1100,
    accounting: 800,
    condition: "correct",
    plannedWorks: "Ravalement de façade",
  });
  b({
    id: "demo-b-armor",
    name: "Résidence Armor",
    companyId: "demo-armor",
    city: "Saint-Brieuc",
    acquisitionDate: "2014-06-01",
    acquisitionPrice: 610000,
    valueMode: "surface",
    surface: 420,
    pricePerSqm: 2100,
    rentMonthly: 5200,
    lotsCount: 8,
    propertyTax: 6800,
    insurance: 1900,
    accounting: 1000,
    otherCharges: 1500,
    condition: "bon",
  });
  b({
    id: "demo-b-treguier",
    name: "Maison de ville",
    companyId: "demo-tregor",
    city: "Tréguier",
    value: 260000,
    rentMonthly: 1900,
    lotsCount: 2,
    propertyTax: 1800,
    insurance: 600,
    condition: "correct",
  });
  b({
    id: "demo-b-guingamp",
    name: "Local commercial",
    companyId: "demo-paso",
    city: "Guingamp",
    value: 310000,
    rentMonthly: 2300,
    lotsCount: 1,
    propertyTax: 2600,
    insurance: 700,
    condition: "bon",
  });
  b({
    id: "demo-b-lannion",
    name: "Immeuble de Lannion",
    companyId: "demo-paso",
    city: "Lannion",
    value: 480000,
    rentMonthly: 3200,
    lotsCount: 5,
    propertyTax: 4100,
    insurance: 1000,
    otherCharges: 800,
    condition: "a_renover",
  });
  b({
    id: "demo-b-leff",
    name: "Longère du Leff",
    companyId: "demo-leff",
    city: "Plouha",
    acquisitionDate: "2021-09-01",
    acquisitionPrice: 330000,
    value: 390000,
    rentMonthly: 2100,
    lotsCount: 3,
    propertyTax: 2200,
    insurance: 800,
    condition: "neuf",
  });
  b({
    id: "demo-b-mansarde",
    name: "Immeuble Mansarde",
    companyId: "demo-mansarde",
    city: "Perros-Guirec",
    acquisitionDate: "2023-02-01",
    acquisitionPrice: 580000,
    value: 620000,
    rentMonthly: 3400,
    lotsCount: 5,
    propertyTax: 4800,
    insurance: 1300,
    accounting: 900,
    condition: "bon",
  });

  const u = (x: Omit<Unit, "buildingId" | "demo">) =>
    d.units.push({ buildingId: "demo-b-paimpol", status: "occupe", demo: true, ...x });
  u({ id: "demo-u1", name: "Appartement 1", type: "T2", surface: 48, rent: 620, charges: 40, tenantLastName: "Le Goff", tenantFirstName: "Marie", entryDate: "2021-09-01", condition: "bon" });
  u({ id: "demo-u2", name: "Appartement 2", type: "T3", surface: 66, rent: 780, charges: 50, tenantLastName: "Riou", tenantFirstName: "Yann", entryDate: "2020-03-01", condition: "bon" });
  u({ id: "demo-u3", name: "Appartement 3", type: "T2", surface: 50, rent: 640, charges: 40, tenantLastName: "Morvan", tenantFirstName: "Anne", entryDate: "2023-06-15", condition: "neuf" });
  u({ id: "demo-u4", name: "Appartement 4", type: "T3", surface: 70, rent: 790, charges: 50, status: "vacant", condition: "a_renover", plannedWorks: "Rénovation complète" });
  u({ id: "demo-u5", name: "Appartement 5", type: "studio", surface: 28, rent: 450, charges: 30, tenantLastName: "Guillou", tenantFirstName: "Erwan", entryDate: "2024-01-01", condition: "bon" });
  u({ id: "demo-u6", name: "Commerce RDC", type: "commerce", surface: 90, rent: 1250, tenantLastName: "Boulangerie du Quai", entryDate: "2019-06-01", condition: "correct" });

  const l = (x: AppData["loans"][number]) => d.loans.push({ kind: "amortissable", ...x, demo: true });
  l({ id: "demo-l-paimpol", name: "Prêt Paimpol", bank: "Crédit Agricole", buildingId: "demo-b-paimpol", remaining: 350000, monthlyPayment: 2450, endDate: "2041-06-05", insuranceMonthly: 45 });
  l({ id: "demo-l-port", name: "Prêt du Port", bank: "Crédit Mutuel de Bretagne", buildingId: "demo-b-port", initialAmount: 450000, ratePct: 1.6, startDate: "2016-03-10", durationMonths: 240, insuranceMonthly: 60 });
  l({ id: "demo-l-armor1", name: "Prêt Armor", bank: "Banque Populaire", buildingId: "demo-b-armor", initialAmount: 380000, ratePct: 1.9, startDate: "2014-06-01", durationMonths: 240 });
  l({ id: "demo-l-armor2", name: "Prêt in fine Armor", bank: "BNP Paribas", buildingId: "demo-b-armor", kind: "in_fine", remaining: 150000, ratePct: 2.5, endDate: "2038-03-01" });
  l({ id: "demo-l-treguier", name: "Prêt Tréguier", bank: "Crédit Agricole", buildingId: "demo-b-treguier", remaining: 95000, monthlyPayment: 1100, endDate: "2034-02-01" });
  l({ id: "demo-l-guingamp", name: "Prêt Guingamp", bank: "CIC", buildingId: "demo-b-guingamp", remaining: 210000, ratePct: 3.2, endDate: "2038-10-01" });
  l({ id: "demo-l-lannion", name: "Prêt Lannion", bank: "Crédit Mutuel de Bretagne", buildingId: "demo-b-lannion", remaining: 180000, monthlyPayment: 1450, endDate: "2038-04-01" });
  l({ id: "demo-l-leff", name: "Prêt du Leff", bank: "Banque Populaire", buildingId: "demo-b-leff", initialAmount: 320000, ratePct: 1.25, startDate: "2021-09-01", durationMonths: 300 });
  l({ id: "demo-l-mansarde", name: "Prêt Mansarde", bank: "Crédit Agricole", buildingId: "demo-b-mansarde", initialAmount: 500000, ratePct: 4.1, startDate: "2023-02-01", durationMonths: 300, insuranceMonthly: 80 });

  d.works.push(
    { id: "demo-w1", label: "Façade", amount: 40000, year: 2029, buildingId: "demo-b-port", companyId: "demo-port", priority: "haute", status: "prevu", demo: true },
    { id: "demo-w2", label: "Rénovation appartement 4", amount: 18000, year: 2028, buildingId: "demo-b-paimpol", unitId: "demo-u4", companyId: "demo-ges", priority: "normale", status: "prevu", demo: true },
    { id: "demo-w3", label: "Isolation des combles", amount: 25000, year: 2031, buildingId: "demo-b-lannion", companyId: "demo-paso", priority: "normale", status: "envisage", demo: true },
  );

  d.events.push({ id: "demo-e1", year: 2029, label: "Renouvellement du bail commercial de Guingamp", companyId: "demo-paso", demo: true });

  d.withdrawals.push({
    id: "demo-r1",
    kind: "cca",
    label: "Remboursement compte courant ARMOR IMMO",
    companyId: "demo-armor",
    annualAmount: 16000,
    startYear: 2027,
    endYear: 2031,
    taxRatePct: 0,
    demo: true,
  });

  d.scenarios.push({
    id: "demo-s1",
    name: "Vendre Paimpol en 2030",
    createdAt: new Date().toISOString(),
    actions: [{ id: "demo-s1-a1", type: "sale", buildingId: "demo-b-paimpol", year: 2030, price: 900000, fees: 25000 }],
  });

  return d;
}

/** Supprime les éléments de démonstration. Option : garder la structure (noms des sociétés). */
export function withoutDemo(data: AppData, keepStructure: boolean): AppData {
  const keep = <T extends { demo?: boolean }>(list: T[]) => list.filter((x) => !x.demo);
  const companies = keepStructure
    ? data.companies.map((c) =>
        c.demo ? { id: c.id, name: c.name, kind: c.kind, parentId: c.parentId, ownershipPct: c.ownershipPct } : c,
      )
    : keep(data.companies);
  const scenarios = data.scenarios.filter((s) => !s.id.startsWith("demo-"));
  return {
    ...data,
    companies,
    buildings: keep(data.buildings),
    units: keep(data.units),
    loans: keep(data.loans),
    works: keep(data.works),
    events: keep(data.events),
    withdrawals: keep(data.withdrawals),
    plans: data.plans.filter((a) => !a.id.startsWith("demo-")),
    scenarios,
  };
}

export function hasDemo(data: AppData): boolean {
  return [data.companies, data.buildings, data.loans, data.units].some((list) =>
    list.some((x: { demo?: boolean }) => x.demo),
  );
}
