import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * JAMAIS UNE ERREUR SANS SA RAISON (retour de Greg, 24 octobre 2026 : « Ça n'a pas marché. Réessaie dans un instant. » en
 * ajoutant son négoce, sans dire pourquoi). Un refus dit son motif (`messageErreur`, `lib/api.ts`), une panne donne son
 * code support. Ce test échoue si une phrase vague revient dans un écran.
 */
const web = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const VAGUES = [/Ça n'a pas marché/i, /n'a pas pu se charger\. Réessa/, /n'a pas abouti, réessaie/, /n'a pas pu s'ouvrir\. Réessaie/, /Une erreur est survenue/i, /Something went wrong/i];

const fichiers = (dossier) =>
  readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    if (statSync(p).isDirectory()) return fichiers(p);
    return /\.(tsx?)$/.test(n) ? [p] : [];
  });
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("aucune phrase d'erreur vague dans les écrans", () => {
  const fautes = [];
  for (const f of fichiers(join(web, "src"))) {
    const texte = sansCommentaires(readFileSync(f, "utf8"));
    for (const v of VAGUES) if (v.test(texte)) fautes.push(`${relative(web, f)} : ${v}`);
  }
  assert.deepEqual(fautes, []);
});

test("le message d'une panne porte toujours le code support ou le numéro d'erreur", () => {
  const api = readFileSync(join(web, "src/lib/api.ts"), "utf8");
  assert.match(api, /export function messageErreur/);
  assert.match(api, /Code support : \$\{err\.supportId\}/);
  assert.match(api, /Erreur \$\{err\.status\}/);
});
