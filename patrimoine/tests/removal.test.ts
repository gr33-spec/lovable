import { test } from "node:test";
import assert from "node:assert/strict";
import { expandRemoval, removalPlan, removalSummary } from "../src/lib/removal";
import { integrityReport } from "../src/lib/integrity";
import { applyOps } from "../src/lib/ops";
import { emptyData, type AppData } from "../src/lib/types";

function data(): AppData {
  const d = emptyData();
  d.companies = [
    { id: "holding", name: "Holding", kind: "holding" },
    { id: "sci", name: "SCI A", kind: "SCI", parentId: "holding" },
    { id: "fille", name: "SCI Fille", kind: "SCI", parentId: "sci" },
  ];
  d.buildings = [{ id: "b", name: "Immeuble", companyId: "sci" }];
  d.units = [{ id: "u1", buildingId: "b", name: "Lot 1" }, { id: "u2", buildingId: "b", name: "Lot 2" }] as AppData["units"];
  d.tenancies = [{ id: "t1", unitId: "u1", status: "actif", tenants: [] }] as unknown as AppData["tenancies"];
  d.inspections = [{ id: "i1", tenancyId: "t1", unitId: "u1", kind: "entree", rooms: [] }] as unknown as AppData["inspections"];
  d.loans = [{ id: "lb", buildingId: "b" }, { id: "lc", companyId: "sci" }, { id: "other", companyId: "holding" }];
  d.works = [{ id: "w", label: "Toiture", buildingId: "b" }, { id: "wu", label: "Cuisine", unitId: "u1" }];
  d.statements = [{ id: "s", companyId: "sci", year: 2025 }] as unknown as AppData["statements"];
  d.projects = [{ id: "p", name: "Extension", buildingId: "b", companyId: "sci", status: "etude", lots: [], costs: [], loans: [] }] as unknown as AppData["projects"];
  d.documents = [
    { id: "dlot", fileId: "f1", name: "diag.pdf", category: "diagnostic", unitId: "u1", addedAt: "", source: "ia" },
    { id: "dloan", fileId: "f2", name: "ancien.pdf", category: "tableau_amortissement", loanId: "lb", addedAt: "", source: "ia" },
    { id: "dsci", fileId: "f3", name: "statuts.pdf", category: "acte", companyId: "sci", addedAt: "", source: "ia" },
  ];
  return d;
}

const run = (d: AppData, items: { coll: "companies" | "buildings" | "units" | "loans"; id: string }[]) => {
  const p = expandRemoval(d, items);
  return applyOps(d, [...p.removes.map((r) => ({ op: "delete" as const, coll: r.coll, id: r.id })), ...p.updates.map((u) => ({ op: "upsert" as const, coll: u.coll, item: u.item as never }))]);
};

test("supprimer un lot : baux, EDL, travaux du lot partent ; son document remonte à l'immeuble", () => {
  const after = run(data(), [{ coll: "units", id: "u1" }]);
  assert.deepEqual(after.units.map((u) => u.id), ["u2"]);
  assert.equal(after.tenancies.length, 0);
  assert.equal(after.inspections.length, 0);
  assert.deepEqual(after.works.map((w) => w.id), ["w"]);
  const doc = after.documents.find((x) => x.id === "dlot")!;
  assert.equal(doc.unitId, null);
  assert.equal(doc.buildingId, "b");
  assert.equal(doc.companyId, "sci");
  assert.deepEqual(integrityReport(after), []);
});

test("supprimer un crédit : l'ancien tableau reste dans Documents, sur l'immeuble", () => {
  const after = run(data(), [{ coll: "loans", id: "lb" }]);
  const doc = after.documents.find((x) => x.id === "dloan")!;
  assert.equal(doc.loanId, null);
  assert.equal(doc.buildingId, "b");
  assert.equal(doc.companyId, "sci");
  assert.deepEqual(integrityReport(after), []);
});

test("supprimer une société : tout ce qui en dépend part, documents et filiales conservés, aucune relation cassée", () => {
  const d = data();
  const plan = removalPlan(d, "companies", "sci");
  for (const part of ["1 immeuble", "2 logements", "1 bail", "1 état des lieux", "2 crédits", "2 travaux", "1 bilan"]) assert.ok(removalSummary(plan).includes(part), part);
  assert.match(removalSummary(plan), /3 documents restent dans Documents/);
  const after = run(d, [{ coll: "companies", id: "sci" }]);
  assert.deepEqual(after.companies.map((c) => c.id).sort(), ["fille", "holding"]);
  assert.equal(after.companies.find((c) => c.id === "fille")!.parentId, "holding", "la filiale remonte d'un niveau");
  assert.deepEqual(after.loans.map((l) => l.id), ["other"], "le crédit d'une autre société est intact");
  assert.equal(after.statements.length, 0);
  assert.equal(after.documents.length, 3, "aucun document perdu");
  assert.ok(after.documents.every((x) => !x.companyId && !x.buildingId && !x.unitId && !x.loanId));
  const p = after.projects[0];
  assert.equal(p.buildingId, null);
  assert.equal(p.companyId, null);
  assert.deepEqual(integrityReport(after), []);
});

test("contrôle d'intégrité : relations cassées et contradictions détectées", () => {
  const d = data();
  d.units.push({ id: "orphelin", buildingId: "disparu", name: "X" } as AppData["units"][number]);
  d.inspections.push({ id: "i2", tenancyId: "t1", unitId: "u2", kind: "entree", rooms: [] } as unknown as AppData["inspections"][number]);
  d.companies.push({ id: "c1", name: "A", kind: "SCI", parentId: "c2" }, { id: "c2", name: "B", kind: "SCI", parentId: "c1" });
  d.loans.push({ id: "lb", buildingId: "b" });
  const r = integrityReport(d).map((i) => `${i.coll}:${i.id}:${i.message}`);
  assert.ok(r.some((x) => x.startsWith("units:orphelin:buildingId")));
  assert.ok(r.some((x) => x.startsWith("inspections:i2:État des lieux d'un autre logement")));
  assert.ok(r.some((x) => x.includes("Détention circulaire")));
  assert.ok(r.some((x) => x.startsWith("loans:lb:Identifiant en double")));
});
