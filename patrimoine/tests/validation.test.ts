import { test } from "node:test";
import assert from "node:assert/strict";
import { validateData, validateItem } from "../src/lib/validation";
import { demoData } from "../src/lib/demo";

test("validation : valeurs manifestement fausses refusées, avec la raison", () => {
  assert.match(validateItem("loans", { id: "l", name: "Prêt 1", ratePct: 325 })!.message, /Crédit « Prêt 1 » : ratePct invalide/);
  assert.ok(validateItem("loans", { id: "l", monthlyPayment: -1200 }));
  assert.ok(validateItem("loans", { id: "l", durationMonths: 0 }));
  assert.ok(validateItem("loans", { id: "l", startDate: "31/12/2020" }));
  assert.ok(validateItem("buildings", { id: "b", name: "X", value: Number.NaN }));
  assert.ok(validateItem("buildings", { id: "b", name: "X", usage: "chateau" }));
  assert.ok(validateItem("units", { id: "u", buildingId: "b", name: "Lot 1", rent: "600" }));
  assert.ok(validateItem("loans", { id: "l", schedule: { rows: [{ month: "2026-01", payment: "x", interest: 0, principal: 0, balance: 0 }] } }));
});

test("validation : saisies normales, champs vides et champs inconnus acceptés", () => {
  assert.equal(validateItem("loans", { id: "l", name: "Prêt", ratePct: 3.25, initialAmount: 250000, startDate: "2020-05-01", endDate: "2040-05", durationMonths: 240, buildingId: null }), undefined);
  assert.equal(validateItem("loans", { id: "l", ratePct: null, monthlyPayment: undefined }), undefined);
  assert.equal(validateItem("buildings", { id: "b", name: "Immeuble", champFutur: { a: 1 } }), undefined);
  assert.equal(validateItem("companies", { id: "c", name: "SCI", cash: -1200 }), undefined, "trésorerie négative possible (découvert)");
  assert.equal(validateItem("scenarios", { id: "s", name: "x" }), undefined, "collection sans règle : acceptée");
  assert.deepEqual(validateData(demoData() as unknown as Record<string, unknown>), [], "démonstration valide");
});
