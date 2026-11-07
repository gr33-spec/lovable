import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { reperesRestants, verifier } from "./garde-a-completer.mjs";

/** Aucune page publique ne part en production avec « [A COMPLETER] » (Greg, 24 octobre 2026). */
const src = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");

test("le code d'aujourd'hui ne porte plus aucun repère (Kbis donné par Greg, 26 octobre 2026) : la production passe", () => {
  assert.deepEqual(reperesRestants(src), []);
  assert.equal(verifier({ VERCEL_ENV: "production" }, src).ok, true);
  assert.equal(verifier({ GARDE_A_COMPLETER: "stricte" }, src).ok, true);
});

test("une fois tout complété, la production passe ; la déclaration de la constante ne compte pas", () => {
  const dossier = mkdtempSync(join(tmpdir(), "garde-"));
  mkdirSync(join(dossier, "lib"));
  writeFileSync(join(dossier, "lib", "legal.ts"), 'export const A_COMPLETER = "[A COMPLETER]";\nexport const EDITEUR = { capital: "1 000" };\n');
  assert.deepEqual(reperesRestants(dossier), []);
  assert.equal(verifier({ VERCEL_ENV: "production" }, dossier).ok, true);
  writeFileSync(join(dossier, "page.tsx"), "<p>Capital : [A COMPLETER]</p>\n");
  assert.equal(verifier({ VERCEL_ENV: "production" }, dossier).ok, false);
});
