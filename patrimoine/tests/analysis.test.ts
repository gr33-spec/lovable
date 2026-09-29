import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFacts, knownIds } from "../src/lib/analysis/facts";
import { ideaToAction } from "../src/lib/analysis/to-scenario";
import type { AnalysisIdea } from "../src/lib/analysis/types";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData } from "../src/lib/types";

const NOW = monthIndex(2026, 9);

function fixture() {
  const d = emptyData();
  d.companies = [
    { id: "h", name: "Holding", kind: "holding" },
    { id: "c", name: "SCI A", kind: "SCI", parentId: "h" },
  ];
  d.buildings = [
    { id: "b1", name: "Immeuble 1", companyId: "c", value: 300_000, acquisitionPrice: 200_000, city: "Paimpol" },
    { id: "b2", name: "Immeuble 2", companyId: "c", value: 150_000 },
  ];
  d.units = [
    { id: "u1", buildingId: "b1", name: "Lot 1", status: "occupe", rent: 600, tenantLastName: "DUPONT", tenantFirstName: "Jean", dpeClass: "G" },
    { id: "u2", buildingId: "b1", name: "Lot 2", status: "vacant", rent: 500 },
    { id: "u3", buildingId: "b2", name: "Lot 1", status: "occupe", rent: 700 },
  ];
  d.loans = [{ id: "l1", buildingId: "b1", remaining: 120_000, remainingDate: "2026-09-01", monthlyPayment: 900, ratePct: 2, endDate: "2039-12-01" }];
  d.tenancies = [{ id: "t", unitId: "u1", status: "actif", tenants: [{ firstName: "Jean", lastName: "DUPONT", email: "jean@exemple.fr" }] }];
  return d;
}

test("faits : chiffres du moteur, aucune donnée personnelle des locataires", () => {
  const d = fixture();
  const facts = buildFacts(d, NOW);
  const json = JSON.stringify(facts);
  assert.ok(!json.includes("DUPONT") && !json.includes("jean@exemple.fr"), "noms et e-mails des locataires absents");
  const snap = computeSnapshot(d, NOW);
  assert.equal(facts.totaux.loyersMensuels, Math.round(snap.total.rentMonthly));
  assert.equal(facts.totaux.detteBancaire, Math.round(snap.total.debt));
  assert.equal(facts.immeubles.length, 2);
  const b1 = facts.immeubles.find((b) => b.id === "b1")!;
  assert.equal(b1.plusValueLatente, 100_000);
  assert.deepEqual(b1.dpeParClasse, { G: 1 });
  assert.equal(facts.credits[0].id, "l1");
  assert.ok(facts.projection.length > 3);
});

test("faits : périmètre immeuble ou société", () => {
  const d = fixture();
  const one = buildFacts(d, NOW, { type: "building", id: "b2" });
  assert.equal(one.perimetre.nom, "Immeuble 2");
  assert.deepEqual(one.immeubles.map((b) => b.id), ["b2"]);
  assert.equal(one.credits.length, 0);
  const sci = buildFacts(d, NOW, { type: "company", id: "c" });
  assert.deepEqual(sci.societes.map((c) => c.id), ["c"]);
  const ids = knownIds(buildFacts(d, NOW));
  assert.ok(ids.immeuble.has("b1") && ids.credit.has("l1") && ids.societe.has("h"));
});

const idea = (over: Partial<AnalysisIdea>): AnalysisIdea => ({
  titre: "Piste",
  pourquoi: "",
  impact: "",
  horizon: "moyen",
  type: "autre",
  cible: { type: "global", id: "" },
  simulation: { action: "aucune", annee: 2027, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] },
  aValider: "",
  ...over,
});

test("piste → simulation : montants connus repris, rien d'inventé", () => {
  const d = fixture();
  const snap = computeSnapshot(d, NOW);
  const sale = ideaToAction(idea({ cible: { type: "immeuble", id: "b1" }, simulation: { action: "vente", annee: 2028, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] } }), d, snap, 2026);
  assert.equal(sale?.type, "sale");
  assert.equal(sale?.type === "sale" && sale.price, 300_000);
  assert.equal(sale?.type === "sale" && sale.year, 2028);
  const refi = ideaToAction(idea({ cible: { type: "immeuble", id: "b1" }, simulation: { action: "refinancement", annee: 2027, montant: 0, tauxPct: 3.1, dureeAns: 20, creditIds: [] } }), d, snap, 2026);
  assert.equal(refi?.type, "refinance");
  assert.deepEqual(refi?.type === "refinance" && refi.loanIds, ["l1"]);
  assert.equal(refi?.type === "refinance" && refi.durationYears, 20);
  const purchase = ideaToAction(idea({ titre: "Acheter un T2", cible: { type: "societe", id: "c" }, simulation: { action: "achat", annee: 2027, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] } }), d, snap, 2026);
  assert.equal(purchase?.type === "purchase" && purchase.price, undefined, "prix d'achat inconnu : à saisir");
  assert.equal(purchase?.type === "purchase" && purchase.companyId, "c");
  assert.equal(ideaToAction(idea({ simulation: { action: "vente", annee: 2027, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] } }), d, snap, 2026), null, "vente sans immeuble");
  assert.equal(ideaToAction(idea({}), d, snap, 2026), null);
  const past = ideaToAction(idea({ cible: { type: "immeuble", id: "b2" }, simulation: { action: "vente", annee: 1990, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] } }), d, snap, 2026);
  assert.equal(past?.year, 2027, "année invalide ramenée à l'an prochain");
});
