import { test } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../src/lib/engine/explain";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { monthIndex } from "../src/lib/engine/dates";
import { demoData } from "../src/lib/demo";

const sum = (xs: (number | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
const close = (a: number, b: number) => Math.abs(a - b) < 0.01;

test("le détail d'un chiffre clé redonne exactement le chiffre affiché", () => {
  const d = demoData();
  const snap = computeSnapshot(d, monthIndex(2026, 10));
  for (const kind of ["net", "value", "debt", "cashflow"] as const) {
    const e = explain(kind, d, snap);
    assert.ok(e.total !== undefined, kind);
    const lines = sum(e.groups.flatMap((g) => g.lines.map((l) => l.amount)));
    assert.ok(close(lines, e.total!), `${kind} : lignes ${lines} ≠ total ${e.total}`);
    for (const g of e.groups) if (g.subtotal !== undefined) assert.ok(close(sum(g.lines.map((l) => l.amount)), g.subtotal), `${kind} / ${g.title}`);
  }
});

test("cash-flow : résidence principale exclue et signalée", () => {
  const d = demoData();
  d.buildings[0] = { ...d.buildings[0], usage: "residence_principale" };
  const snap = computeSnapshot(d, monthIndex(2026, 10));
  const e = explain("cashflow", d, snap);
  // Ses charges et ses mensualités ne sont pas celles de l'activité locative.
  assert.ok(!e.groups[1].lines.some((l) => l.label === d.buildings[0].name));
  assert.ok(e.notes.some((n) => /Résidence principale/.test(n)));
  assert.ok(close(sum(e.groups.flatMap((g) => g.lines.map((l) => l.amount))), e.total!));
});
