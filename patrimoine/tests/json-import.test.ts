import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScheduleJson } from "../src/lib/schedule";
import { complementsSchema, planComplements } from "../src/lib/complements";
import { guessPlacement } from "../src/lib/documents";
import { emptyData, type AppData } from "../src/lib/types";

/** Échéancier : 100 000 € à 2,4 % sur 180 mois à partir de janvier 2021. */
function rows(amount = 100_000, rate = 2.4, n = 180, start = 2021 * 12) {
  const r = rate / 1200;
  const pay = Math.round(((amount * r) / (1 - Math.pow(1 + r, -n))) * 100) / 100;
  const out = [];
  let b = amount;
  for (let i = 0; i < n; i++) {
    const m = start + i;
    const interest = Math.round(b * r * 100) / 100;
    const principal = i === n - 1 ? b : Math.round((pay - interest) * 100) / 100;
    b = Math.round((b - principal) * 100) / 100;
    out.push({ month: `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`, payment: principal + interest, interest, principal, balance: Math.max(0, b) });
  }
  return out;
}

function data(): AppData {
  const d = emptyData();
  d.companies = [{ id: "port", name: "SCI DU PORT", kind: "SCI", cash: 1000 }, { id: "tregor", name: "DU TRÉGOR", kind: "SCI" }];
  d.buildings = [{ id: "b-port", name: "Immeuble du Port", companyId: "port" }, { id: "b-paimpol", name: "Appartement de Paimpol", companyId: "tregor" }];
  d.loans = [{ id: "p2", name: "Prêt 2 DU PORT", buildingId: "b-port", remaining: 70_000 }];
  return d;
}

test("échéancier JSON : colonnes françaises, dates JJ/MM/AAAA, montants en texte", () => {
  const fr = rows().map((r) => ({ date: `05/${r.month.slice(5)}/${r.month.slice(0, 4)}`, echeance: `${r.payment}`.replace(".", ","), interets: r.interest, capital: r.principal, restant: r.balance }));
  const p = parseScheduleJson(JSON.stringify({ banque: "CIC", echeances: fr }));
  assert.equal(p.rows.length, 180);
  assert.equal(p.rows[0].month, "2021-01");
  assert.equal(p.bank, "CIC");
  assert.throws(() => parseScheduleJson("pas du json"), /illisible/);
  assert.throws(() => parseScheduleJson(JSON.stringify([{ mois: "2021-01" }])), /Moins de deux/);
});

test("compléments JSON : bilans (société retrouvée par son nom, trésorerie reportée)", () => {
  const patch = complementsSchema.parse({
    type: "patrimoine-complements",
    statements: [{ company: "DU PORT", year: 2025, figures: { revenue: 48_000, netResult: 9_500, cash: 12_345 } }],
  });
  const plan = planComplements(data(), patch);
  const st = plan.data.statements[0];
  assert.equal(st.companyId, "port");
  assert.equal(st.figures.revenue, 48_000);
  assert.equal(plan.data.companies.find((c) => c.id === "port")!.cash, 12_345);
  assert.ok(plan.lines.every((l) => l.ok));
  // Poste inconnu refusé (aucun champ inventé).
  assert.throws(() => complementsSchema.parse({ type: "patrimoine-complements", statements: [{ company: "X", year: 2025, figures: { inventé: 1 } }] }));
});

test("compléments JSON : échéancier rattaché au prêt par son nom, ou nouveau financement", () => {
  const patch = complementsSchema.parse({
    type: "patrimoine-complements",
    loans: [
      { name: "Prêt 2 DU PORT", schedule: { rows: rows() } },
      { company: "DU TRÉGOR", building: "Appartement de Paimpol", schedule: { meta: { bank: "CMB" }, rows: rows(80_000, 1.5, 240, 2020 * 12) } },
      { company: "INCONNUE", schedule: { rows: rows() } },
    ],
  });
  const plan = planComplements(data(), patch);
  const p2 = plan.data.loans.find((l) => l.id === "p2")!;
  assert.equal(p2.schedule?.rows.length, 180);
  assert.equal(p2.initialAmount, 100_000);
  const created = plan.data.loans.find((l) => l.id !== "p2")!;
  assert.equal(created.buildingId, "b-paimpol");
  assert.equal(created.bank, "CMB");
  assert.match(created.name!, /CMB 2019/);
  assert.equal(plan.lines.filter((l) => !l.ok).length, 1, "société inconnue signalée, rien créé");
  // Le même échéancier réimporté sans nom : reconnu, pas de doublon.
  const again = planComplements(plan.data, complementsSchema.parse({ type: "patrimoine-complements", loans: [{ company: "DU TRÉGOR", schedule: { rows: rows(80_000, 1.5, 240, 2020 * 12) } }] }));
  assert.equal(again.data.loans.length, plan.data.loans.length);
});

test("rangement pré-rempli d'après le nom du fichier (sans IA)", () => {
  const d = data();
  const a = guessPlacement(d, "Assurance_PNO_Immeuble-du-Port_2026.pdf");
  assert.equal(a.category, "assurance");
  assert.equal(a.buildingId, "b-port");
  assert.equal(a.companyId, "port");
  const t = guessPlacement(d, "tableau amortissement paimpol.pdf");
  assert.equal(t.category, "tableau_amortissement");
  assert.equal(t.buildingId, "b-paimpol");
  const u = guessPlacement(d, "scan123.jpg", { loanId: "p2" });
  assert.equal(u.category, "tableau_amortissement", "importé depuis la fiche d'un prêt");
  assert.equal(u.buildingId, "b-port");
  assert.equal(guessPlacement(d, "document.pdf").category, "autre");
});
