#!/usr/bin/env node
/**
 * LA GARDE « [A COMPLETER] » (Greg, 24 octobre 2026) : une information légale que seul Greg peut donner (capital, RCS,
 * directeur de la publication, contact, adresse de l'hébergeur de la base) porte ce repère. La construction de
 * PRODUCTION échoue tant qu'il en reste un dans le code des pages (`src/`) ; en prévisualisation et en local, elle le dit
 * et continue. Production = `VERCEL_ENV=production`, ou `GARDE_A_COMPLETER=stricte` (pour le tester).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPERE = "[A COMPLETER]";
/** La déclaration de la constante elle-même ne compte pas : seuls ses usages et le texte brut comptent. */
const DECLARATION = /export const A_COMPLETER\s*=/;

/** Les endroits où le repère reste : `fichier:ligne` et la ligne. */
export function reperesRestants(racine) {
  const trouves = [];
  const parcourir = (dossier) => {
    for (const nom of readdirSync(dossier)) {
      const chemin = join(dossier, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (/\.(tsx?|mjs|js|md|json)$/.test(nom)) {
        readFileSync(chemin, "utf8")
          .split("\n")
          .forEach((ligne, i) => {
            // La déclaration de la constante et les commentaires ne s'affichent pas : seuls les usages comptent.
            if (DECLARATION.test(ligne) || /^\s*(\*|\/\/|\/\*)/.test(ligne)) return;
            if (ligne.includes(REPERE) || /\bA_COMPLETER\b/.test(ligne)) trouves.push({ ou: `${relative(racine, chemin)}:${i + 1}`, ligne: ligne.trim() });
          });
      }
    }
  };
  parcourir(racine);
  return trouves;
}

export function verifier(env, racine) {
  const restants = reperesRestants(racine);
  const stricte = env.VERCEL_ENV === "production" || env.GARDE_A_COMPLETER === "stricte";
  return { ok: !(stricte && restants.length > 0), stricte, restants };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const racine = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
  const { ok, stricte, restants } = verifier(process.env, racine);
  if (restants.length > 0) {
    const liste = restants.map((r) => `  ${r.ou}  ${r.ligne}`).join("\n");
    console[ok ? "warn" : "error"](`${restants.length} information(s) légale(s) à compléter (${REPERE}) :\n${liste}${stricte ? "\nConstruction de production refusée : complète docs/groupe/CONFORMITE.md, section « À faire par Greg »." : ""}`);
  }
  process.exit(ok ? 0 : 1);
}
