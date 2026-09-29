import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOps, mergeChanges, normalizeData } from "../src/lib/ops";
import { sanitizeGestionOps } from "../src/lib/scope";
import { auditLoans } from "../src/lib/engine/loan-audit";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData, type AppData, type Loan } from "../src/lib/types";

// Audit de fiabilité : données incomplètes, modifications concurrentes,
// périmètre de l'accès gestion, saisies de crédit impossibles.

test("un élément incomplet est complété au lieu de faire planter les écrans", () => {
  const d = normalizeData({ companies: [{ id: "c" }], statements: [{ id: "s", companyId: "c", year: 2025 }], scenarios: [{ id: "x" }], tenancies: [{ id: "t" }], inspections: [{ id: "i" }], projects: [{ id: "p" }] });
  assert.equal(d.companies[0].name, "");
  assert.deepEqual(d.statements[0].figures, {});
  assert.deepEqual(d.scenarios[0].actions, []);
  assert.deepEqual(d.tenancies[0].tenants, []);
  assert.deepEqual([d.inspections[0].rooms, d.inspections[0].meters, d.inspections[0].keys], [[], [], []]);
  assert.deepEqual([d.projects[0].lots, d.projects[0].costs, d.projects[0].loans], [[], [], []]);
  // Même réparation pour une modification envoyée directement à l'API.
  const after = applyOps(emptyData(), [{ op: "upsert", coll: "statements", item: { id: "s2", companyId: "c", year: 2025 } }]);
  assert.deepEqual(after.statements[0].figures, {});
});

test("deux onglets : seuls les champs modifiés sont appliqués, rien n'est écrasé ailleurs", () => {
  const d = emptyData();
  d.loans.push({ id: "l", name: "Prêt", bank: "Banque A", ratePct: 1.5 } as Loan);
  // Onglet 1 : taux modifié (état de départ connu).
  const t1 = applyOps(d, [{ op: "upsert", coll: "loans", base: { ...d.loans[0] }, item: { ...d.loans[0], ratePct: 1.8 } }]);
  // Onglet 2, resté sur l'ancienne version : change la banque.
  const t2 = applyOps(t1, [{ op: "upsert", coll: "loans", base: { ...d.loans[0] }, item: { ...d.loans[0], bank: "Banque B" } }]);
  assert.equal(t2.loans[0].ratePct, 1.8, "le taux changé dans l'autre onglet est conservé");
  assert.equal(t2.loans[0].bank, "Banque B");
  // Champ vidé volontairement : bien supprimé.
  const t3 = applyOps(t2, [{ op: "upsert", coll: "loans", base: { ...t2.loans[0] }, item: { id: "l", name: "Prêt", ratePct: 1.8 } }]);
  assert.equal(t3.loans[0].bank, undefined);
  // Sans état de départ (ancienne version de l'application) : remplacement complet, comme avant.
  const t4 = applyOps(t3, [{ op: "upsert", coll: "loans", item: { id: "l", name: "Autre" } }]);
  assert.deepEqual(t4.loans[0], { id: "l", name: "Autre" });
  assert.deepEqual(mergeChanges({ id: "a", x: 1, y: 2 }, { id: "a", x: 1, y: 2 }, { id: "a", x: 1, y: 3 }), { id: "a", x: 1, y: 3 });
});

test("accès gestion : un dossier locataire ne peut pas citer une pièce du patrimoine", () => {
  const d = emptyData();
  d.units.push({ id: "u", buildingId: "b", name: "Lot 1" });
  d.statements.push({ id: "s", companyId: "c", year: 2025, figures: {}, source: "manuel", fileId: "bilan-secret" });
  const ops = sanitizeGestionOps(d, [
    { op: "upsert", coll: "tenancies", item: { id: "t1", unitId: "u", status: "brouillon", tenants: [], signedLease: { fileId: "bilan-secret" } } },
    { op: "upsert", coll: "tenancies", item: { id: "t2", unitId: "u", status: "brouillon", tenants: [], signedLease: { fileId: "nouveau-bail" } } },
  ]);
  assert.deepEqual(ops.map((o) => (o.op === "upsert" ? o.item.id : "")), ["t2"], "seul le dossier citant sa propre pièce est accepté");
});

test("crédits : les saisies impossibles sont signalées, même si le crédit paraît terminé", () => {
  const now = monthIndex(2026, 9);
  const base: Loan = { id: "l", name: "Prêt", bank: "B", kind: "amortissable", initialAmount: 200000, ratePct: 2, startDate: "2020-01-10", durationMonths: 240 } as Loan;
  const findings = (patch: Partial<Loan>) => {
    const d: AppData = { ...emptyData(), loans: [{ ...base, ...patch }] };
    return auditLoans(d, computeSnapshot(d, now)).map((f) => f.short);
  };
  assert.deepEqual(findings({}), [], "crédit cohérent : aucune alerte");
  assert.ok(findings({ remaining: -5 }).some((s) => s.startsWith("Capital restant dû négatif")));
  assert.ok(findings({ insuranceMonthly: -10 }).some((s) => s.startsWith("Assurance négatif")));
  assert.ok(findings({ endDate: "2015-01-01" }).some((s) => s.includes("antérieure au déblocage")));
  assert.ok(findings({ durationMonths: 1200 }).some((s) => s.includes("Durée improbable")));
  assert.ok(findings({ monthlyPayment: 900000 }).some((s) => s.includes("Soldé avant sa date de fin")), "mensualité géante : le crédit ne disparaît plus en silence");
  assert.ok(findings({ ratePct: 400 }).some((s) => s.includes("Taux improbable")));
});
