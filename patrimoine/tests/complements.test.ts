import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../src/lib/types";
import { complementsSchema, findLot, planComplements } from "../src/lib/complements";
import { activeTenancy } from "../src/lib/tenancy";

function sample() {
  const d = emptyData();
  d.companies.push({ id: "c", name: "DU LEFF", kind: "SCI" });
  d.buildings.push({ id: "b", name: "Immeuble du Leff", companyId: "c" });
  d.units.push(
    { id: "u1", buildingId: "b", name: "Lot 1 RDC droit", rent: 401.31, status: "occupe" },
    { id: "u3", buildingId: "b", name: "Lot 3 R+1 droit", rent: 432.52, status: "occupe", tenantLastName: "X" },
    { id: "u10", buildingId: "b", name: "Lot 10", rent: 500 },
    { id: "uc", buildingId: "b", name: "Local commercial", rent: 560 },
  );
  d.tenancies.push({ id: "t1", unitId: "u1", status: "actif", tenants: [{ lastName: "Ancien" }], rent: 401.31, paymentDay: 10 });
  return d;
}

test("compléments : lots retrouvés par numéro, sans confusion Lot 1 / Lot 10", () => {
  const d = sample();
  assert.equal(findLot(d.units, "Lot 1")?.id, "u1");
  assert.equal(findLot(d.units, "Lot 10")?.id, "u10");
  assert.equal(findLot(d.units, "Local commercial")?.id, "uc");
  assert.equal(findLot(d.units, "Lot 2"), undefined);
});

test("compléments : baux, garants et lot vacant, sans rien inventer", () => {
  const d = sample();
  const patch = complementsSchema.parse({
    type: "patrimoine-complements",
    companies: [{ name: "SCI DU LEFF", set: { siren: "951 723 196" } }],
    buildings: [
      {
        name: "Immeuble du Leff",
        lots: [
          { name: "Lot 1", lease: { tenants: [{ firstName: "Chantal", lastName: "PIGNARD" }], signDate: "2012-02-09", rent: 395.37, charges: 6 } },
          { name: "Lot 3", set: { status: "vacant" } },
          { name: "Lot 10", set: { surface: 35, type: "T2" }, lease: { tenants: [{ lastName: "HACCART" }], guarantors: [{ lastName: "HACCART", birthDate: "1965-03-11" }], startDate: "2024-04-13", rent: 510, deposit: 510 } },
          { name: "Local commercial", lease: { tenants: [{ lastName: "Le Royal Délice" }], leaseType: "commercial", durationYears: 9, rent: 560 } },
          { name: "Lot 9", set: { surface: 1 } },
        ],
      },
    ],
  });
  const { data, lines } = planComplements(d, patch);
  assert.equal(data.companies[0].siren, "951 723 196");
  // Bail existant mis à jour (conditions déjà saisies conservées), pas de doublon.
  assert.equal(data.tenancies.filter((t) => t.unitId === "u1").length, 1);
  const t1 = activeTenancy(data, "u1")!;
  assert.equal(t1.tenants[0].lastName, "PIGNARD");
  assert.equal(t1.paymentDay, 10);
  assert.equal(t1.startDate, undefined);
  const u1 = data.units.find((u) => u.id === "u1")!;
  assert.equal(u1.rent, 395.37);
  assert.equal(u1.charges, 6);
  // Vacant : locataire effacé.
  const u3 = data.units.find((u) => u.id === "u3")!;
  assert.equal(u3.status, "vacant");
  assert.equal(u3.tenantLastName, undefined);
  // Nouveau bail importé avec garant.
  const t10 = activeTenancy(data, "u10")!;
  assert.equal(t10.imported, true);
  assert.equal(t10.guarantors?.[0].kind, "personne");
  assert.equal(t10.deposit, 510);
  const u10 = data.units.find((u) => u.id === "u10")!;
  assert.equal(u10.surface, 35);
  assert.equal(u10.leaseStart, "2024-04-13");
  assert.equal(u10.charges, undefined);
  const uc = data.units.find((u) => u.id === "uc")!;
  assert.equal(uc.leaseType, "commercial");
  assert.equal(uc.revision, "triennale");
  assert.ok(lines.some((l) => !l.ok && l.label.endsWith("Lot 9")));
  // Données d'origine intactes (l'aperçu ne modifie rien).
  assert.equal(d.units[0].rent, 401.31);
  assert.equal(d.tenancies[0].tenants[0].lastName, "Ancien");
});

test("compléments : les actes signés déjà déposés sont conservés", () => {
  const d = sample();
  const file = { fileId: "f1", name: "caution.pdf" };
  d.tenancies[0] = { ...d.tenancies[0], signedLease: { fileId: "b1", name: "bail.pdf" }, guarantors: [{ kind: "personne", signedFile: file }, { kind: "personne", signedFile: { fileId: "f2", name: "c2.pdf" } }] };
  const patch = complementsSchema.parse({ type: "patrimoine-complements", buildings: [{ name: "Immeuble du Leff", lots: [{ name: "Lot 1", lease: { tenants: [{ lastName: "PIGNARD" }], guarantors: [{ lastName: "DUPONT", firstName: "Anne" }] } }] }] });
  const t = planComplements(d, patch).data.tenancies.find((x) => x.id === "t1")!;
  assert.equal(t.signedLease?.fileId, "b1");
  assert.equal(t.guarantors?.[0].lastName, "DUPONT");
  assert.equal(t.guarantors?.[0].signedFile?.fileId, "f1");
  assert.equal(t.guarantors?.[1].signedFile?.fileId, "f2");
});

test("encaissements : locataire à jour depuis son entrée, impayés conservés", async () => {
  const { upToDate } = await import("../src/lib/payments");
  const d = emptyData();
  d.buildings.push({ id: "b", name: "B" });
  const unit = { id: "u", buildingId: "b", name: "Lot 1", rent: 600, status: "occupe" as const, payments: { "2026-07": { status: "impaye" as const, due: 600 } } };
  d.units.push(unit);
  d.tenancies.push({ id: "t", unitId: "u", status: "actif", tenants: [{ lastName: "X" }], startDate: "2026-03-16", rent: 600 });
  const r = upToDate(d, unit, "2026-09-28");
  assert.deepEqual(r.months, ["2026-03", "2026-04", "2026-05", "2026-06", "2026-08", "2026-09"]);
  assert.equal(r.payments["2026-07"].status, "impaye");
  // Premier mois au prorata (entrée le 16 mars : 16 jours sur 31).
  assert.ok(r.payments["2026-03"].due! < 600 && r.payments["2026-03"].due! > 300);
  assert.equal(r.payments["2026-09"].status, "paye");
  // Entrée ancienne : 3 ans au plus.
  d.tenancies[0].startDate = "2012-02-09";
  assert.equal(upToDate(d, unit, "2026-09-28").months.length, 35);
  // Logement vacant : rien.
  assert.equal(upToDate(d, { ...unit, status: "vacant" }, "2026-09-28").months.length, 0);
});

test("gestion : éléments manquants d'un logement loué", async () => {
  const { unitMissing } = await import("../src/lib/missing");
  const d = emptyData();
  d.buildings.push({ id: "b", name: "B" });
  const u = { id: "u", buildingId: "b", name: "Lot 1", status: "occupe" as const };
  d.units.push(u);
  assert.deepEqual(unitMissing(d, u).map((m) => m.id), ["tenant", "lease", "entry", "rent"]);
  d.tenancies.push({ id: "t", unitId: "u", status: "actif", tenants: [{ lastName: "X" }], startDate: "2025-01-01", rent: 500, guarantors: [{ kind: "personne", lastName: "G" }, { kind: "personne", signedFile: { fileId: "f", name: "c.pdf" } }], signedLease: { fileId: "l", name: "b.pdf" } });
  assert.deepEqual(unitMissing(d, u).map((m) => m.label), ["Caution signée"]);
  // Pas de garant au bail : aucune caution attendue ; logement vacant : rien.
  d.tenancies[0].guarantors = [];
  assert.equal(unitMissing(d, u).length, 0);
  assert.equal(unitMissing(d, { ...u, status: "vacant" }).length, 0);
});
