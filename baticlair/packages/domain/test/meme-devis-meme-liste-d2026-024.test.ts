import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designationsDuDevis, ecranDeLecture, parseLecture, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis } from "../src/index.js";

/**
 * LE MÊME DEVIS DONNE TOUJOURS LA MÊME LISTE ET LES MÊMES QUESTIONS (Greg, 20 novembre 2026, devis D-2026-024, zinc à
 * tasseaux) : « Les questions sont décidées par le code à partir de la fiche métier (ce que le négoce exige pour chaque
 * ligne), pas par la lecture IA. Toute ligne « à chiffrer » vient obligatoirement avec la question qui la débloque. »
 * Avant (constat du 18 novembre) : trois lectures du même devis donnaient trois listes et trois séries de questions.
 * Les huit lectures RÉELLES du site de test (trois des 19 et 20 novembre, puis D-2026-024 rejoué cinq fois en ligne le
 * 20 novembre sur la version 62), le nom du client retiré, rejouées par le moteur seul : à l'ouverture, puis chaque
 * question reçoit la même réponse (premier bouton, sinon 3) jusqu'à n'en plus avoir. Comme sur le serveur, la
 * désignation de chaque ligne est reprise du texte du devis (`designationsDuDevis`), jamais des mots du modèle.
 */
const TEXTE = readFileSync(new URL("./devis-reels/d2026-024-texte.txt", import.meta.url), "utf8");
const LECTURES = (JSON.parse(readFileSync(new URL("./devis-reels/d2026-024-lectures.json", import.meta.url), "utf8")) as unknown[]).map((l) => designationsDuDevis(parseLecture(l) as LectureDevis, TEXTE));
const ref = ROOFING_REFERENTIAL;
const ecran = (i: number, answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref, lecture: LECTURES[i]!, answers, preferences: {} });

const ouverture = (i: number) => {
  const e = ecran(i);
  return {
    questions: e.questions.map((q) => `${q.key} « ${q.text} »${q.options ? ` [${q.options.map((o) => o.label).join(" / ")}]` : ""}`),
    liste: e.purchase.toBuy.map((b) => `${b.label} | ${b.quantity}`),
    aChiffrer: e.purchase.toQuote.map((c) => c.label),
  };
};
const finale = (i: number) => {
  const answers: Record<string, EngineAnswer> = {};
  for (let tour = 0; tour < 8; tour++) {
    const ouvertes = ecran(i, answers).questions.filter((q) => answers[q.key] === undefined);
    if (ouvertes.length === 0) break;
    for (const q of ouvertes) answers[q.key] = q.options?.length ? { value: q.options[0]!.value, unit: q.unit ?? "u" } : { value: "3", unit: q.unit ?? "m" };
  }
  const e = ecran(i, answers);
  return {
    reponses: Object.keys(answers).sort(),
    liste: e.purchase.toBuy.map((b) => `${b.label} | ${b.quantity} | ${b.state}`),
    aChiffrer: e.purchase.toQuote.map((c) => `${c.label} | ${c.reason}`),
    reste: e.purchase.questions.length,
  };
};

describe("D-2026-024 : huit lectures réelles, une seule liste", () => {
  it("à l'ouverture : les mêmes questions, dans le même ordre, et la même liste", () => {
    expect(LECTURES).toHaveLength(8);
    const [a, ...autres] = LECTURES.map((_, i) => ouverture(i));
    for (const x of autres) expect(x).toEqual(a);
    // Le pliage une fois pour le devis, puis les données du calcul. Les rives (« 2 côtés ») sont écrites au devis : la
    // finition ne se demande pas, et les tasseaux sont chiffrés dès l'ouverture (13 bacs − 1 + 2 rives = 14 rangs × 4 m).
    expect(a!.questions[0]).toMatch(/^param:faconnage@pieces-pliees /);
    expect(a!.questions.some((q) => q.startsWith("param:nb_rives_tasseau"))).toBe(false);
    expect(a!.liste).toContain("Tasseaux bois trapézoïdaux de 50 mm | 56 ml");
  });

  it("toutes questions répondues : la même liste finale, rien à chiffrer sans sa question, plus aucune question", () => {
    const [a, ...autres] = LECTURES.map((_, i) => finale(i));
    for (const x of autres) expect(x).toEqual(a);
    expect(a!.reste).toBe(0);
    // Tasseaux et couvre-joints chiffrés (rangs = bacs − 1 + rives sur tasseau), le chéneau en bobineau.
    expect(a!.liste.join("\n")).toMatch(/tasseau/i);
    expect(a!.liste.join("\n")).toMatch(/Bobineau/);
  });
});
