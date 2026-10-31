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

// Le bloc « coup de main » n'est plus affiché sur l'accueil (Greg, 29 octobre 2026 : doublons) ; son texte reste mot pour
// mot dans `CoupDeMain`, prêt à revenir.
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
  // Ce que voit l'artisan : les lignes d'import (« coup-de-main-ia ») ne s'affichent pas.
  assert.doesNotMatch(nouveau.replace(/^import .*$/gm, ""), INTERDITS);
  const tarifs = sansCommentaires(lire("app/(public)/tarifs/page.tsx"));
  // Greg, 29 octobre 2026 : la phrase vient de `TARIFS` (domaine), la même partout.
  assert.ok(tarifs.includes("TARIFS.enUneLigne"));
  assert.doesNotMatch(tarifs, /\d+\s?€/);
});

// La landing « premium V3 » (Greg, 30 octobre 2026) : les conditions en vigueur, jamais les mots interdits, jamais une
// adresse écrite en dur (les liens restent ceux du site où elle est servie), l'abonnement dit à côté du premier offert.
test("la landing premium V3 : conditions en vigueur, aucun mot interdit, aucun lien en dur", () => {
  const landing = sansCommentaires(lire("app/(public)/decouvrir/landing-premium.tsx"));
  const client = sansCommentaires(lire("components/landing-premium.tsx"));
  for (const texte of [landing, client]) {
    assert.doesNotMatch(texte, INTERDITS);
    assert.doesNotMatch(texte, /automatisée?s?/i);
    assert.doesNotMatch(texte, /https?:\/\/[a-z.-]*mobiiz\.fr/);
  }
  // Greg, 30 octobre 2026 (décision 1) : les achats groupés sont gratuits ; plus d'abonnement ni de « premier offert ».
  assert.ok(landing.includes("Gratuit, pour tous les artisans"));
  assert.doesNotMatch(landing, /premier achat groupé est offert|Sur abonnement/);
  assert.ok(landing.includes("TARIFS.question.r"));
  assert.ok(landing.includes("BLOC_LEGAL") && landing.includes("PAGES_LEGALES"));
  assert.match(client, /EXEMPLE FICTIF/);
  assert.match(client, /Aucun prix ni pourcentage d’économie garanti/);
});
