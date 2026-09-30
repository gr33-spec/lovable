import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Garde-fou : dans Next.js, la mise en page (layout) et la page sont rendues
// en parallèle. La vérification de session du layout ne suffit donc PAS à
// protéger les données d'une page : chaque page d'administration doit
// appeler requireAdminPage() elle-même, avant toute lecture.

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === "page.tsx" ? [full] : [];
  });
}

test("chaque page de l'administration vérifie la session avant de lire des données", () => {
  const root = path.join(__dirname, "..", "src", "app", "admin");
  const protectedPages = pages(root).filter((p) => !p.includes(`${path.sep}(auth)${path.sep}`));
  assert.ok(protectedPages.length >= 10);
  for (const file of protectedPages) {
    const source = readFileSync(file, "utf8");
    const body = source.slice(source.indexOf("export default"));
    const check = body.indexOf("requireAdminPage()");
    assert.ok(check > 0, `${path.relative(root, file)} : requireAdminPage() manquant`);
    for (const reader of ["await Promise.all(", "await query", "await groups(", "await list", "await admin", "await dashboard("]) {
      const at = body.indexOf(reader);
      assert.ok(at === -1 || at > check, `${path.relative(root, file)} : données lues avant la vérification de session`);
    }
  }
});

test("chaque action d'administration passe par la vérification de session", () => {
  const source = readFileSync(path.join(__dirname, "..", "src", "app", "admin", "actions.ts"), "utf8");
  const actions = source.split("\nexport async function ").slice(1);
  assert.ok(actions.length > 20);
  for (const a of actions) {
    const name = a.slice(0, a.indexOf("("));
    const body = a.slice(0, a.indexOf("\n}\n"));
    assert.ok(body.includes("guarded("), `${name} : non protégée`);
  }
});
