import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * LA LANDING ET LES TROIS FAÇONS DE FAIRE SA LISTE (Greg, 27 octobre 2026, 2e message, points 29, 30, 31 et 34) : le titre
 * et la deuxième promesse, le bloc « On te file un coup de main » mot pour mot, les trois choix de l'app, la page Tarifs
 * sans montant ; jamais « précis », « exact », « automatique » ni « IA » dans ce que voit le visiteur.
 */
const src = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const lire = (p) => readFileSync(join(src, p), "utf8");
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const INTERDITS = /\b(IA|automatiques?|précise?s?|exacte?s?)\b/i;

test("la landing : le titre, la deuxième promesse, le coup de main mot pour mot, aucun mot interdit", () => {
  const landing = sansCommentaires(lire("app/(public)/decouvrir/landing.tsx"));
  for (const t of [
    "Achète tes matériaux <span className=\"mz-surligne\">au prix des gros.</span>",
    "Arrête de perdre du temps sur tes quantitatifs.",
    "Ta liste de matériaux ? On te file un coup de main.",
    "Pas besoin de tout taper. Choisis ce qui t'arrange.",
    "Donne-nous ton devis, on t'avance ta liste. C'est pas parfait, mais t'as plus qu'à vérifier et peaufiner.",
    "Tu as déjà ta liste sur papier ? Prends-la en photo, on la met dans l'app pour toi.",
    "Tu préfères la faire toi-même ? Note-la directement, ligne par ligne.",
  ])
    assert.ok(landing.includes(t), t);
  assert.doesNotMatch(landing, INTERDITS);
  assert.doesNotMatch(landing, /\d+\s?€/);
});

test("l'app : trois choix, dans le même ordre ; la page Tarifs sans montant", () => {
  const nouveau = sansCommentaires(lire("app/(app)/chantiers/nouveau/page.tsx"));
  const ordre = ["Depuis mon devis — on t'avance", "Photo de ma liste", "Je la note moi-même"].map((t) => nouveau.indexOf(t));
  assert.ok(ordre.every((i) => i > 0), JSON.stringify(ordre));
  assert.deepEqual([...ordre].sort((a, b) => a - b), ordre);
  assert.doesNotMatch(nouveau, INTERDITS);
  const tarifs = sansCommentaires(lire("app/(public)/tarifs/page.tsx"));
  assert.ok(tarifs.includes("Gratuit pour faire tes listes et les envoyer à tes négoces. Abonné pour profiter des achats groupés. Ton premier achat groupé est offert."));
  assert.doesNotMatch(tarifs, /\d+\s?€/);
});
