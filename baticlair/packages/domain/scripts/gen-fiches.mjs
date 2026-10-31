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

// BatiClair Groupé, étape 4 : les seuils de formation des lots (`baticlair/groupe/seuils.json`) deviennent un module de la
// même façon : changer un seuil = changer le fichier, zéro code.
const seuils = readFileSync(join(here, "../../../groupe/seuils.json"), "utf8");
const sortieSeuils = join(here, "../src/groupe/seuils.generated.ts");
const contenuSeuils = `// Généré par scripts/gen-fiches.mjs depuis groupe/seuils.json : ne pas modifier à la main.\nexport const SEUILS_SOURCE: string = ${JSON.stringify(seuils)};\n`;
if (!existsSync(sortieSeuils) || readFileSync(sortieSeuils, "utf8") !== contenuSeuils) {
  const tmp = `${sortieSeuils}.${process.pid}.tmp`;
  writeFileSync(tmp, contenuSeuils);
  renameSync(tmp, sortieSeuils);
}
