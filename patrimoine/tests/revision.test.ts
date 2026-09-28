import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData, type Unit } from "../src/lib/types";
import type { IrlPoint } from "../src/lib/irl";
import { referenceQuarter, revisionIndices, revisionPlan, revisionsDue } from "../src/lib/revision";
import { revisionDocument } from "../src/lib/legal/documents";
import { docContext } from "../src/lib/legal/doc";

// Série fictive, régulière, pour vérifier les choix d'indices (pas de vraies valeurs INSEE).
const series: IrlPoint[] = [];
for (let y = 2019; y <= 2026; y++) for (const q of [1, 2, 3, 4] as const) series.push({ year: y, quarter: q, value: 130 + (y - 2019) * 2 + q * 0.5 });
const v = (y: number, q: number) => series.find((p) => p.year === y && p.quarter === q)!.value;

function data(unit: Partial<Unit>, signDate?: string): AppData {
  const d = emptyData();
  d.companies.push({ id: "c", name: "DU PORT", kind: "SCI", address: "6 impasse du Ouipoure, 22620 Ploubazlanec" });
  d.buildings.push({ id: "b", name: "Immeuble", companyId: "c", address: "33 rue du Port", city: "22740 Lézardrieux" });
  d.units.push({ id: "u", buildingId: "b", name: "Lot 5", rent: 670, status: "occupe", leaseStart: "2025-03-08", ...unit });
  d.tenancies.push({ id: "t", unitId: "u", status: "actif", tenants: [{ firstName: "Estia", lastName: "Salmon" }], signDate, startDate: unit.leaseStart ?? "2025-03-08", rent: unit.rent ?? 670 });
  return d;
}

test("révision : trimestre du bail, sinon dernier indice publié à la signature", () => {
  const d = data({ indexLabel: "IRL T4 2024" });
  assert.equal(referenceQuarter(d.units[0], d.tenancies[0], series), 4);
  // Sans indice au bail : signé le 8 mars 2025, dernier publié = T4 2024 (mi-janvier).
  const d2 = data({}, "2025-03-08");
  assert.equal(referenceQuarter(d2.units[0], d2.tenancies[0], series), 4);
  // Signé en mai : T1 publié mi-avril.
  const d3 = data({ leaseStart: "2023-05-20" }, "2023-05-20");
  assert.equal(referenceQuarter(d3.units[0], d3.tenancies[0], series), 1);
});

test("révision : variation sur un an, même après une révision omise", () => {
  const r = revisionIndices(series, 4, "2026-03-08");
  assert.equal(r.index?.value, v(2025, 4));
  assert.equal(r.reference?.value, v(2024, 4));
  assert.match(r.index!.label, /4e trimestre 2025/);
  // Au 8 janvier 2026, le T4 2025 n'est pas encore publié : T4 2024 / T4 2023.
  assert.equal(revisionIndices(series, 4, "2026-01-08").index?.value, v(2024, 4));
});

test("révision : plan complet, retard sans rétroactivité, DPE F/G bloquant", () => {
  const d = data({ indexLabel: "IRL T4 2024", indexValue: v(2024, 4) });
  const p = revisionPlan(d, d.units[0], series, "2026-09-28")!;
  assert.equal(p.due, "2026-03-08");
  assert.equal(p.late, true);
  assert.equal(p.effective, "2026-09-28");
  assert.equal(p.deadline, "2027-03-08");
  assert.equal(p.newRent, Math.round(((670 * v(2025, 4)) / v(2024, 4)) * 100) / 100);
  // À l'avance : effet à la date anniversaire.
  const early = revisionPlan(d, { ...d.units[0], lastRevisionDate: "2026-03-08" }, series, "2027-02-20")!;
  assert.equal(early.late, false);
  assert.equal(early.effective, "2027-03-08");
  // Dans la liste « à faire » un mois avant, pas avant.
  assert.equal(revisionsDue({ ...d, units: [{ ...d.units[0], lastRevisionDate: "2026-03-08" }] }, series, "2027-02-20").length, 1);
  assert.equal(revisionsDue({ ...d, units: [{ ...d.units[0], lastRevisionDate: "2026-03-08" }] }, series, "2027-01-20").length, 0);
  // Sans série INSEE : indices à saisir, rien d'inventé.
  const manual = revisionPlan(d, d.units[0], null, "2026-09-28")!;
  assert.equal(manual.newRent, undefined);
  assert.equal(manual.reference?.value, v(2024, 4));
  assert.equal(manual.quarter, 4);
  const blocked = revisionPlan(d, { ...d.units[0], dpeClass: "G" }, series, "2026-09-28")!;
  assert.ok(blocked.blocked);
  assert.equal(blocked.newRent, undefined);
});

test("révision : courrier au locataire", () => {
  const d = data({});
  const ctx = docContext(d, d.tenancies[0])!;
  const doc = revisionDocument(ctx, { due: "2026-03-08", effective: "2026-09-28", rent: 670, newRent: 680.5, charges: 10, referenceLabel: "IRL du 4e trimestre 2024", referenceValue: 144.64, indexLabel: "IRL du 4e trimestre 2025", indexValue: 146.9 }, "2026-09-28");
  const text = JSON.stringify(doc.blocks);
  assert.ok(text.includes("SCI DU PORT"));
  assert.ok(text.includes("Estia SALMON"));
  assert.ok(text.includes("680,50 €"));
  assert.ok(text.includes("690,50 €"));
  assert.ok(text.includes("sans effet rétroactif"));
  assert.equal(doc.fileName, "revision-loyer-lot-5-2026-09.pdf");
});
