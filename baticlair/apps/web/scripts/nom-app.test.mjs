import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * LE NOM DE L'APP EST MOBIIZ (Greg, 24 octobre 2026) : il passe par la seule constante `NOM_APP`
 * (`packages/domain/src/groupe/marque.ts`). Ce test échoue si l'ancien nom reste dans ce que voit quelqu'un : le site,
 * l'app, l'espace négoce, la PWA, et les textes des e-mails et des PDF écrits par l'API et le domaine. Les commentaires,
 * les identifiants techniques (paquets, variables, base) et les référentiels (`verifiedBy`) ne comptent pas (DETTE.md).
 */
const depot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const ANCIEN = /BatiClair|BATICLAIR(?!_ANTHROPIC)|baticlair-(?:mes|negoce)/;

const fichiers = (dossier) =>
  readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    if (statSync(p).isDirectory()) return n === "node_modules" ? [] : fichiers(p);
    return /\.(tsx?|mjs|js|json|css|html)$/.test(n) && !/\.generated\.ts$/.test(n) ? [p] : [];
  });

/** Le code sans ses commentaires (bloc, JSX et fin de ligne ; jamais « https:// »). */
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** Les seuls endroits où l'ancien nom reste écrit, et pourquoi. */
const PERMIS = [
  // La liste des mots qui ne partent jamais chez un négoce : l'ancien nom y reste interdit, comme le nouveau.
  { fichier: "apps/api/src/modules/price-requests/application/supplier-packet.ts", raison: "mot interdit" },
];

const DOSSIERS = ["apps/web/src", "apps/web/public", "apps/api/src", "packages/domain/src"];

test("l'ancien nom n'apparaît plus dans le visible", () => {
  const fautes = [];
  for (const d of DOSSIERS) {
    for (const f of fichiers(join(depot, d))) {
      const chemin = relative(depot, f);
      if (chemin.startsWith("packages/domain/src/referential/data/")) continue;
      if (PERMIS.some((p) => p.fichier === chemin)) continue;
      sansCommentaires(readFileSync(f, "utf8"))
        .split("\n")
        .forEach((l, i) => ANCIEN.test(l) && fautes.push(`${chemin}:${i + 1} ${l.trim()}`));
    }
  }
  assert.deepEqual(fautes, []);
});

test("le nom vient d'une seule constante", () => {
  const marque = readFileSync(join(depot, "packages/domain/src/groupe/marque.ts"), "utf8");
  assert.match(marque, /export const NOM_APP = "Mobiiz";/);
});
