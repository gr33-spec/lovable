// DISCRÉTION DES INFOS SOCIÉTÉ (Greg, 28 novembre 2026) : l'adresse du siège, le SIRET, le RCS et le capital de l'éditeur
// n'apparaissent QUE sur la page « Mentions légales » (et dans les factures, que la loi oblige à les porter, côté API).
// Partout ailleurs dans le site (accueil, landing, pieds de page, sites des artisans, e-mails), seulement « Mobiiz » et
// contact@mobiiz.fr. Ce test lit le code du site et refuse toute autre utilisation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = new URL("../src", import.meta.url).pathname;
const SEULES_PERMISES = ["app/(public)/mentions-legales/page.tsx", "lib/legal.ts"];
const INTERDITS = [/Ouipoure/, /910 ?796 ?325/, /FR61910796325/, /EDITEUR\.(adresse|siret|siren|rcs|capital|tva)\b/, /\bBLOC_LEGAL\b/];

function fichiers(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? fichiers(p) : /\.(tsx?|css)$/.test(n) ? [p] : [];
  });
}

test("l'adresse, le SIRET, le RCS et le capital de l'éditeur ne sont que dans les mentions légales", () => {
  const fautes = [];
  for (const f of fichiers(RACINE)) {
    const r = relative(RACINE, f);
    if (SEULES_PERMISES.includes(r)) continue;
    const texte = readFileSync(f, "utf8");
    for (const motif of INTERDITS) if (motif.test(texte)) fautes.push(`${r} : ${motif}`);
  }
  assert.deepEqual(fautes, []);
});
