import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, paletteChecks, paletteFor, themeCss, themeDef, THEMES } from "../src/lib/theme";

test("contraste WCAG : valeurs de référence", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#777777", "#777777"), 1);
});

test("chaque thème reste lisible (AA pour les actions, AAA pour les titres)", () => {
  for (const t of THEMES) {
    for (const c of paletteChecks(paletteFor(t.base))) {
      assert.ok(c.ratio >= c.min, `${t.name} — ${c.label} : ${c.ratio.toFixed(2)} < ${c.min}`);
    }
  }
});

test("la couleur principale reste proche de la teinte demandée", () => {
  for (const t of THEMES) {
    const p = paletteFor(t.base);
    // Au plus un peu assombrie : l'écart de contraste avec l'originale reste faible.
    assert.ok(contrast(p.brand, t.base) < 1.35, `${t.name} : ${p.brand} trop éloignée de ${t.base}`);
    assert.ok(/^#[0-9a-f]{6}$/.test(p.brandSoft) && /^#[0-9a-f]{6}$/.test(p.deep));
  }
});

test("thème inconnu ou absent : teal par défaut", () => {
  assert.equal(themeDef(undefined).id, "teal");
  assert.equal(themeDef("inexistant").id, "teal");
  assert.match(themeCss(undefined), /^:root\{--brand:#[0-9a-f]{6};/);
});
