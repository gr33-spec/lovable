import { test } from "node:test";
import assert from "node:assert/strict";
import { assetMix, suggestNature } from "../src/lib/assets";
import { qualityIssues } from "../src/lib/engine/quality";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { currentMonth } from "../src/lib/engine/dates";
import { emptyData, type Building } from "../src/lib/types";

const b = (id: string, name: string, extra: Partial<Building> = {}): Building => ({ id, name, ...extra });

test("nature des biens : décompte exact, jamais d'« immeuble » deviné", () => {
  const list = [b("1", "Immeuble A", { kind: "immeuble" }), b("2", "Immeuble B", { kind: "immeuble" }), b("3", "Maison", { kind: "maison" }), b("4", "Hangar", { kind: "hangar" }), b("5", "Résidence principale")];
  const m = assetMix(list);
  assert.equal(m.total, 5);
  assert.equal(m.unspecified, 1);
  assert.equal(m.text, "2 immeubles de rapport, 1 maison, 1 hangar et 1 bien de nature non précisée");
  assert.equal(assetMix([b("1", "x", { kind: "maison" })]).text, "1 maison");
});

test("nature des biens : suggestions tirées du nom", () => {
  assert.deepEqual(suggestNature("Résidence principale"), { usage: "residence_principale" });
  assert.deepEqual(suggestNature("Maison de Paimpol – 5 rue Bécot"), { kind: "maison" });
  assert.deepEqual(suggestNature("Hangar Tournebride"), { kind: "hangar" });
  assert.deepEqual(suggestNature("Appartement de Paimpol"), { kind: "appartement" });
  assert.deepEqual(suggestNature("Immeuble du Port"), { kind: "immeuble" });
  assert.deepEqual(suggestNature("Les Tilleuls"), {});
});

test("contrôle : restant dû supérieur au montant emprunté signalé comme critique", () => {
  const data = emptyData();
  data.buildings.push(b("b1", "Immeuble", { kind: "immeuble", usage: "location" }));
  data.loans.push({ id: "l1", name: "Prêt 2", buildingId: "b1", initialAmount: 61000, remaining: 230000, monthlyPayment: 1535, ratePct: 1.8, endDate: "2045-01-01" });
  const issues = qualityIssues(data, computeSnapshot(data, currentMonth()));
  const i = issues.find((x) => x.id === "li-l1");
  assert.ok(i, "incohérence détectée");
  assert.equal(i!.severity, "critical");
});

test("contrôle : nature et usage à préciser, date d'acquisition postérieure au crédit", () => {
  const data = emptyData();
  data.buildings.push(b("b1", "Hangar", { acquisitionDate: "2026-03-01" }));
  data.loans.push({ id: "l1", buildingId: "b1", initialAmount: 100000, startDate: "2019-05-01", monthlyPayment: 800, ratePct: 2, durationMonths: 240 });
  const ids = qualityIssues(data, computeSnapshot(data, currentMonth())).map((x) => x.id);
  assert.ok(ids.includes("k-b1"));
  assert.ok(ids.includes("u-b1"));
  assert.ok(ids.includes("a-b1"));
});

test("PDF : aucun symbole hors des polices embarquées", async () => {
  const { pdfSafe } = await import("../src/lib/format");
  assert.equal(pdfSafe("≈ 1 200 € ≤ 3 ≥ 2"), "env. 1 200 € max. 3 min. 2");
});
