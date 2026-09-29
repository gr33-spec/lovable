import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, readSessionToken } from "../src/lib/server/session";
import { referencedFileIds } from "../src/lib/tenancy-files";
import { scopeForGestion, sanitizeGestionOps } from "../src/lib/scope";
import { emptyData, type AppData } from "../src/lib/types";

process.env.APP_PASSWORD = "test-secret-password";

test("session : signature vérifiée, identifiant conservé quand elle est prolongée", () => {
  const t = createSessionToken({ role: "owner" });
  const s = readSessionToken(t)!;
  assert.equal(s.role, "owner");
  assert.ok(s.jti && s.iat);
  const renewed = readSessionToken(createSessionToken(s))!;
  assert.equal(renewed.jti, s.jti, "la déconnexion révoque aussi la version prolongée");
  assert.equal(renewed.iat, s.iat);
  // Falsification : rôle changé dans le contenu, signature d'origine.
  const [payload, sig] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), role: "gestion" })).toString("base64url");
  assert.equal(readSessionToken(`${forged}.${sig}`), null);
  assert.equal(readSessionToken("n'importe.quoi"), null);
  // Expirée
  assert.equal(readSessionToken(createSessionToken({ role: "owner" }, Date.now() - 61 * 24 * 3600 * 1000)), null);
});

function data(): AppData {
  const d = emptyData();
  d.units = [{ id: "u", buildingId: "b", name: "Lot 1" } as AppData["units"][number]];
  d.tenancies = [{ id: "t", unitId: "u", status: "actif", tenants: [], signedLease: { fileId: "bail", name: "b.pdf", uploadedAt: "2026-01-01" } } as unknown as AppData["tenancies"][number]];
  d.inspections = [{ id: "i", tenancyId: "t", kind: "entree", rooms: [{ name: "Séjour", items: [{ name: "Mur", photos: ["photo"] }] }] } as unknown as AppData["inspections"][number]];
  d.loans = [{ id: "l", schedule: { rows: [], fileId: "tableau", importedAt: "2026-01-01", source: "ia" } }];
  d.statements = [{ id: "s", companyId: "c", year: 2025, fileId: "bilan" } as unknown as AppData["statements"][number]];
  d.documents = [{ id: "d", fileId: "facture", name: "f.pdf", category: "facture", addedAt: "2026-01-01", source: "ia" }];
  return d;
}

test("espace gestion : seules les pièces des dossiers locataires lui sont ouvertes", () => {
  const d = data();
  const all = referencedFileIds(d);
  assert.deepEqual([...all].sort(), ["bail", "bilan", "facture", "photo", "tableau"]);
  const scoped = referencedFileIds(scopeForGestion(d));
  assert.deepEqual([...scoped].sort(), ["bail", "photo"]);
});

test("espace gestion : ne peut ni créer de prêt, ni lire/écrire les réglages sensibles", () => {
  const d = data();
  const ops = sanitizeGestionOps(d, [
    { op: "upsert", coll: "loans", item: { id: "x" } },
    { op: "upsert", coll: "documents", item: { id: "y" } },
    { op: "upsert", coll: "units", item: { id: "nouveau", buildingId: "b" } },
    { op: "upsert", coll: "units", item: { id: "u", buildingId: "autre", value: 1 } },
    { op: "delete", coll: "loans", id: "l" },
    { op: "settings", patch: { theme: "violet", analyses: [] } },
  ]);
  assert.equal(ops.length, 1, "seule la mise à jour du logement existant passe");
  const u = (ops[0] as { item: Record<string, unknown> }).item;
  assert.equal(u.buildingId, "b", "le logement ne change pas d'immeuble");
  assert.equal(u.value, undefined, "la valeur du bien reste masquée");
});
