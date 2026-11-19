// Les fiches métier (`baticlair/referentiels/metiers/*.md`) deviennent un module du domaine à chaque build, test et
// vérification de types : ajouter un métier = ajouter un fichier, zéro code (mission du fondateur, 2026-10-19).
// Un fichier qui commence par « _ » (le modèle) n'est pas chargé.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dossier = join(here, "../../../referentiels/metiers");
const sortie = join(here, "../src/referential/fiches/sources.generated.ts");
const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();
const sources = fichiers.map((f) => ({ fichier: f, texte: readFileSync(join(dossier, f), "utf8") }));
mkdirSync(dirname(sortie), { recursive: true });
const contenu = `// Généré par scripts/gen-fiches.mjs depuis referentiels/metiers/*.md : ne pas modifier à la main.\nexport const FICHES_SOURCES: readonly { fichier: string; texte: string }[] = ${JSON.stringify(sources, null, 2)};\n`;
// Build, tests et types se lancent en parallèle (turbo) : on n'écrit que si le contenu change, d'un seul geste (rename).
if (!existsSync(sortie) || readFileSync(sortie, "utf8") !== contenu) {
  const tmp = `${sortie}.${process.pid}.tmp`;
  writeFileSync(tmp, contenu);
  renameSync(tmp, sortie);
}
console.log(`gen-fiches : ${sources.length} fiche(s) métier`);

// Les BASES DE RÉFÉRENCE métier (`baticlair/referentiels/<métier>/fiche-<métier>.json`, format commun
// `docs/format-base-metier.md`) et leur carte des régions deviennent un module du domaine, sous forme de texte : le code
// les lit par `lireBase` (schéma vérifié au chargement), jamais autrement.
const racine = join(here, "../../../referentiels");
const bases = [];
for (const metier of readdirSync(racine).sort()) {
  const fiche = join(racine, metier, `fiche-${metier}.json`);
  if (!existsSync(fiche)) continue;
  const carte = join(racine, metier, "carte-regions.json");
  bases.push({ metier, fiche: readFileSync(fiche, "utf8"), carte: existsSync(carte) ? readFileSync(carte, "utf8") : null });
}
const sortieBases = join(here, "../src/referential/base/sources.generated.ts");
mkdirSync(dirname(sortieBases), { recursive: true });
const contenuBases = `// Généré par scripts/gen-fiches.mjs depuis referentiels/<métier>/fiche-<métier>.json : ne pas modifier à la main.\nexport const BASES_SOURCES: readonly { metier: string; fiche: string; carte: string | null }[] = ${JSON.stringify(bases)};\n`;
if (!existsSync(sortieBases) || readFileSync(sortieBases, "utf8") !== contenuBases) {
  const tmp = `${sortieBases}.${process.pid}.tmp`;
  writeFileSync(tmp, contenuBases);
  renameSync(tmp, sortieBases);
}
console.log(`gen-fiches : ${bases.length} base(s) de référence`);
