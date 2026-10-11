import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { CompanyPreferences, EngineAnswer, EngineOptions, LectureDevis, QuoteLineReading, Referential, SiteFact } from "../../src/index.js";
import type { QuoteLineInput } from "./read-quote.js";

/**
 * Les LECTURES ENREGISTRÉES des devis de test (§51.5) : ce que le modèle rend pour chaque devis du banc (fiche, questions,
 * fourniture par ligne), figé dans `test/lectures/` pour que les tests tournent sans appel. Une lecture se retrouve par
 * l'empreinte du devis et de ce qui l'accompagne (tiroir, faits du chantier, habitudes, options, lecture §41.1, rôles).
 * Les fichiers ont été enregistrés une fois depuis l'ancienne lecture (migration du 11 octobre) ; sans fichier, le test
 * échoue en nommant la lecture qui manque : elle s'écrit à la main, comme le modèle l'aurait rendue.
 */
const DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "lectures");

export function lectureEnregistree(
  ref: Referential,
  bench: readonly QuoteLineInput[],
  extraFacts: readonly SiteFact[] = [],
  preferences: CompanyPreferences = {},
  options: EngineOptions = {},
  readings?: ReadonlyMap<string, QuoteLineReading>,
  answers: Readonly<Record<string, EngineAnswer>> = {},
): LectureDevis {
  const roles = Object.fromEntries(Object.entries(answers).filter(([k]) => k.startsWith("role:")));
  const contexte = { ref: ref.id, bench, extraFacts, preferences, options, readings: readings ? [...readings.entries()] : null, roles };
  const empreinte = createHash("sha1").update(JSON.stringify(contexte)).digest("hex").slice(0, 12);
  const file = join(DIR, `${ref.id}-${empreinte}.json`);
  if (!existsSync(file)) throw new Error(`Lecture enregistrée absente : ${file} (devis : ${bench.map((l) => `${l.ref} ${l.designation}`).join(" | ")})`);
  return (JSON.parse(readFileSync(file, "utf8")) as { lecture: LectureDevis }).lecture;
}
