import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePdfPrefs, pdfColors, prefsFromUrl, prefsQuery, shows } from "../src/lib/pdf/prefs";
import { paletteFor, themeDef } from "../src/lib/theme";

test("réglages PDF : valeurs valides conservées, invalides ignorées", () => {
  assert.deepEqual(parsePdfPrefs({ color: "violet", cover: "bandeau", recipient: "  Banque  ", hide: ["comptes"] }), { color: "violet", cover: "bandeau", recipient: "Banque", hide: ["comptes"] });
  assert.deepEqual(parsePdfPrefs({ color: "<script>", cover: "x", hide: ["foo"], title: 12 }), {});
  assert.deepEqual(parsePdfPrefs(undefined), {});
  assert.deepEqual(parsePdfPrefs("n'importe quoi"), {});
  assert.equal(parsePdfPrefs({ title: "A".repeat(500) }).title?.length, 80);
  assert.equal(parsePdfPrefs({ message: "a\u0000b" }).message, "ab");
});

test("réglages PDF : aller-retour par l'adresse, repli sur l'enregistré", () => {
  const p = { cover: "epure" as const, recipient: "M. Martin & Cie" };
  const q = prefsQuery(p);
  const url = new URL(`http://x/api/dossier-banque?${q}`);
  assert.deepEqual(prefsFromUrl(url, { cover: "bandeau" }), p);
  assert.deepEqual(prefsFromUrl(new URL("http://x/api?o=%7Babc"), { cover: "bandeau" }), { cover: "bandeau" });
  assert.deepEqual(prefsFromUrl(new URL("http://x/api"), { cover: "bandeau" }), { cover: "bandeau" });
  assert.equal(prefsQuery({}), "");
});

test("réglages PDF : couleur de l'application par défaut, sinon celle choisie", () => {
  assert.equal(pdfColors(undefined, "sauge").brand, paletteFor(themeDef("sauge").base).brand);
  assert.equal(pdfColors({ color: "app" }, "prune").deep, paletteFor(themeDef("prune").base).deep);
  assert.equal(pdfColors({ color: "azur" }, "prune").brand, paletteFor(themeDef("azur").base).brand);
  assert.equal(pdfColors(undefined, undefined).brand, paletteFor(themeDef("teal").base).brand);
});

test("réglages PDF : parties masquées", () => {
  assert.equal(shows({ hide: ["credits"] }, "credits"), false);
  assert.equal(shows({}, "credits"), true);
});
