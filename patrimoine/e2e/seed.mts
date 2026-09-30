// Prépare une base de test : données de démonstration, un bail en cours,
// un bilan et l'accès gestion locative. Refuse d'écraser une base qui
// contient déjà des données (sauf E2E_FORCE_SEED=1) : jamais sur la production.
import { demoData } from "../src/lib/demo";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const owner = process.env.E2E_OWNER_PASSWORD;
const gestion = process.env.E2E_GESTION_PASSWORD;
if (!owner || !gestion) throw new Error("E2E_OWNER_PASSWORD et E2E_GESTION_PASSWORD sont requis.");
const O = { origin: base, "content-type": "application/json" };

const res = await fetch(base + "/api/login", { method: "POST", headers: O, body: JSON.stringify({ password: owner }) });
const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).find((c) => c.startsWith("patrimoine_session="));
if (!cookie) throw new Error(`Connexion impossible (${res.status})`);
const H = { ...O, cookie };

const current = (await (await fetch(base + "/api/data", { headers: H })).json()).data;
const empty = !current.companies.length && !current.buildings.length && !current.loans.length;
if (!empty && process.env.E2E_FORCE_SEED !== "1") {
  console.log("Base déjà remplie : données conservées, seul l'accès gestion est préparé.");
} else {
  const d = demoData();
  const unit = d.units[0];
  d.tenancies.push({ id: "e2e-bail", unitId: unit.id, status: "actif", tenants: [{ firstName: "Test", lastName: "Locataire" }], startDate: "2024-01-01", rent: (unit.rent ?? 500) + 10, charges: 40 });
  d.statements.push({ id: "e2e-bilan", companyId: d.companies[1].id, year: 2025, figures: { revenue: 60_000, netResult: 8_000 }, source: "manuel" });
  const r = await fetch(base + "/api/replace", { method: "POST", headers: H, body: JSON.stringify({ data: d, reason: "tests" }) });
  if (!r.ok) throw new Error(`Chargement des données refusé : ${r.status} ${await r.text()}`);
  console.log("Données de démonstration chargées.");
}
const a = await fetch(base + "/api/access", { method: "POST", headers: H, body: JSON.stringify({ password: gestion, label: "Tests" }) });
if (!a.ok) throw new Error(`Accès gestion non créé : ${a.status}`);
console.log("Accès gestion prêt.");
