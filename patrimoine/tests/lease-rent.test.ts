import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSnapshot, leasedUnits } from "../src/lib/engine/snapshot";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData } from "../src/lib/types";

test("le bail en cours est la source du loyer ; le logement sert de référence sinon", () => {
  const d = emptyData();
  d.buildings = [{ id: "b", name: "Immeuble", value: 300_000 }];
  d.units = [
    { id: "u1", buildingId: "b", name: "T1", rent: 500, status: "occupe" },
    { id: "u2", buildingId: "b", name: "T2", rent: 600, status: "vacant" },
    { id: "u3", buildingId: "b", name: "T3", rent: 700, status: "occupe" },
  ];
  d.tenancies = [
    { id: "t0", unitId: "u1", tenants: [], status: "clos", rent: 400, startDate: "2018-01-01" },
    { id: "t1", unitId: "u1", tenants: [], status: "actif", rent: 520, charges: 30, startDate: "2024-01-01" },
    // Bail en cours sur un logement marqué vacant : le bail fait foi.
    { id: "t2", unitId: "u2", tenants: [], status: "actif", rent: 610, startDate: "2025-01-01" },
  ];
  const units = leasedUnits(d);
  assert.deepEqual(units.map((u) => [u.rent, u.status]), [[520, "occupe"], [610, "occupe"], [700, "occupe"]]);
  assert.equal(units[0].charges, 30);
  // Données d'origine intactes.
  assert.equal(d.units[0].rent, 500);
  assert.equal(d.units[1].status, "vacant");
  const snap = computeSnapshot(d, monthIndex(2026, 9));
  assert.equal(snap.byBuilding.get("b")!.rentMonthly, 520 + 610 + 700);
});
