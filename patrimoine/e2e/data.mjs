// Enregistrement des données : les valeurs impossibles sont refusées par le
// serveur avec une explication, les valeurs correctes sont acceptées, et
// le loyer retenu est celui du bail en cours.
import { check, done, json, login, ownerPassword, req } from "./lib.mjs";

const owner = (await login(ownerPassword)).cookie;
const read = async () => (await (await req("/api/data", owner)).json()).data;
const before = await read();

const bad = await json("/api/ops", owner, { ops: [{ op: "upsert", coll: "loans", item: { id: "e2e-faux", name: "Faux", ratePct: 250 } }] });
const badBody = await bad.json().catch(() => ({}));
check("taux de 250 % refusé (422)", bad.status === 422, bad.status);
check("refus expliqué (champ nommé)", /ratePct/.test(badBody.error ?? ""), badBody.error);
const badDate = await json("/api/ops", owner, { ops: [{ op: "upsert", coll: "buildings", item: { id: "e2e-faux-b", name: "Faux", acquisitionDate: "31/12/2020" } }] });
check("date mal formée refusée", badDate.status === 422, badDate.status);
const neg = await json("/api/ops", owner, { ops: [{ op: "upsert", coll: "units", item: { id: "e2e-faux-u", buildingId: "x", name: "Faux", rent: -5 } }] });
check("loyer négatif refusé", neg.status === 422, neg.status);
const after = await read();
check("aucune donnée modifiée par les refus", after.loans.length === before.loans.length && after.buildings.length === before.buildings.length && after.units.length === before.units.length);

const ok = await json("/api/ops", owner, { ops: [{ op: "upsert", coll: "works", item: { id: "e2e-travaux", label: "Test", amount: 1000, year: 2027, status: "envisage", future: "champ inconnu conservé" } }] });
check("valeurs correctes acceptées", ok.status === 200, ok.status);
const withWork = await read();
check("champ inconnu conservé", withWork.works.find((w) => w.id === "e2e-travaux")?.future === "champ inconnu conservé");
await json("/api/ops", owner, { ops: [{ op: "delete", coll: "works", id: "e2e-travaux" }] });

done("Données");
