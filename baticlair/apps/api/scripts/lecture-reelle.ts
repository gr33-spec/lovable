/**
 * Temps un (directive du fondateur, 12 octobre 2026) : « Le double de test ne remplace pas le modèle. Avant de fusionner
 * le temps un, lance la vraie lecture Opus sur DE00000071 et sur 7954 […] et mets dans le rapport le bref et les
 * questions produits mot pour mot. »
 *
 * La vraie lecture d'un devis, hors base : le PDF lu comme au dépôt (texte par page, routage texte / image), un appel
 * au modèle de lecture (AnthropicLectureReader, le même qu'en production), puis le bref et les questions imprimés mot
 * pour mot et le contrôle du résultat attendu (§6 du référentiel électricité pour 7954, §51.5 pour DE00000071).
 *
 *   BATICLAIR_ANTHROPIC_KEY=… pnpm exec tsx scripts/lecture-reelle.ts <devis.pdf | fixture:DE00000071 | fixture:D.2026.105> <7954|DE00000071> [sortie.json]
 *
 * En CI : le workflow « Vraie lecture » (`.github/workflows/lecture-reelle.yml`), lancé par l'étiquette « lecture-reelle »
 * sur une PR, avec le secret BATICLAIR_ANTHROPIC_KEY ; le bref et les questions sont dans le journal du job.
 *
 * Le PDF reste hors du dépôt. La sortie JSON (lecture complète) est écrite là où on le demande, jamais commitée.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { controleLecture7954, controleLectureD2026105, controleLectureDe00000071, exportPourLecture, numberLines, referentialFor, routePage, tradeProfile, type LectureDevis, type LigneDuDevis } from "@baticlair/domain";
import { D2026_105_LINES } from "../../../packages/domain/test/devis-reels/d2026-105.js";
import { DE00000071_LINES } from "../../../packages/domain/test/devis-reels/de00000071.js";
import { DEVIS_7954 } from "../../../packages/domain/test/devis-reels/devis-7954.js";
import { extractPdfPages } from "../src/modules/documents/infrastructure/pdf-pages.js";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";
import { AnthropicLectureReader } from "../src/modules/takeoff/infrastructure/anthropic-lecture-reader.js";
import { D2026_105_PDF } from "../test/support/d2026105-pdf.js";
import { DE00000071_PDF } from "../test/support/de00000071-pdf.js";

const DEVIS: Record<string, { trade: string; lignes: readonly LigneDuDevis[]; controle: (l: LectureDevis, d: readonly LigneDuDevis[]) => string[] }> = {
  "7954": { trade: "electrical", lignes: DEVIS_7954, controle: controleLecture7954 },
  DE00000071: { trade: "roofing", lignes: DE00000071_LINES.map((l) => ({ ref: l.ref, designation: l.designation })), controle: controleLectureDe00000071 },
  "D.2026.105": { trade: "roofing", lignes: D2026_105_LINES.map((l) => ({ ref: l.ref, designation: l.designation })), controle: controleLectureD2026105 },
};

async function main(): Promise<number> {
  const [pdfPath, quel, sortie] = process.argv.slice(2);
  const devis = quel ? DEVIS[quel] : undefined;
  if (!pdfPath || !devis) {
    console.error(`Usage : tsx scripts/lecture-reelle.ts <devis.pdf | fixture:DE00000071 | fixture:D.2026.105> <${Object.keys(DEVIS).join("|")}> [sortie.json]`);
    return 2;
  }
  const apiKey = process.env.BATICLAIR_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("BATICLAIR_ANTHROPIC_KEY absente : la vraie lecture n'est pas lancée (aucun contournement, aucun double de test).");
    return 3;
  }
  const model = process.env.AI_EXTRACTION_MODEL ?? "claude-opus-5-5";
  const effort = (process.env.AI_EXTRACTION_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max";

  // Le devis lu comme au dépôt : texte numéroté des pages propres, image des autres, et le PDF entier.
  // « fixture:DE00000071 » : le devis anonymisé du dépôt (test/support), régénéré à la volée ; sinon un PDF hors dépôt.
  const bytes = pdfPath === "fixture:DE00000071" ? await DE00000071_PDF() : pdfPath === "fixture:D.2026.105" ? await D2026_105_PDF() : new Uint8Array(readFileSync(pdfPath));
  const content = await new PdfJsPdfReader().read(bytes, { maxPages: 60 });
  const profile = tradeProfile(devis.trade);
  const text: string[] = [];
  const vision: number[] = [];
  for (const page of content.pages) {
    const route = routePage(page, profile).route;
    if (route === "text") text.push(numberLines(page).map((l) => `[${l.ref}] ${l.text}`).join("\n"));
    else if (route === "vision") vision.push(page.pageNumber);
  }
  const pages = content.pages.map((p) => p.pageNumber);
  const ref = referentialFor(devis.trade);
  const rapide = process.env.AI_QUANTITATIF_MODEL || "claude-sonnet-5-5";
  const reader = new AnthropicLectureReader(apiKey, model, effort, undefined, rapide);
  // Le repérage des métiers avant la lecture (modèle rapide, texte seul) : il doit dire le métier du devis, vite.
  const debutReperage = Date.now();
  const reperage = await reader.reperer(text.join("\n"));
  const metiersReperes = reperage?.output ?? [];
  console.log(`Repérage ${rapide} — ${reperage?.status ?? "absent"} en ${Math.round((Date.now() - debutReperage) / 1000)} s : ${metiersReperes.join(", ") || "(rien)"}`);
  const started = Date.now();
  const attempt = await reader.lire({
    document: { numberedText: text.join("\n"), imagePdf: vision.length > 0 ? await extractPdfPages(bytes, pages) : bytes, imagePages: pages },
    trade: devis.trade,
    tradeLabel: profile.label,
    referentiel: ref ? exportPourLecture(ref) : "Aucun référentiel pour ce métier.",
  });
  const secondes = Math.round((Date.now() - started) / 1000);
  console.log(`Modèle ${model} (effort ${effort}) — ${attempt.status} en ${secondes} s — pages texte ${text.length}, image ${vision.length}`);
  const lecture = attempt.output;
  if (!lecture) {
    console.error(`Lecture en échec : ${attempt.status} ${attempt.errorCode ?? ""}`);
    return 1;
  }
  if (sortie) writeFileSync(sortie, JSON.stringify(lecture, null, 2));

  console.log(`\nMétier : ${lecture.metier ?? "(non dit)"}`);
  for (const lot of lecture.lots) console.log(`Lot ${lot.metier} « ${lot.libelle} » : ${lot.lignes.length} lignes`);
  console.log("\nBREF (mot pour mot)");
  for (const b of lecture.bref) console.log(`- ${b}`);
  console.log(`\nQUESTIONS (${lecture.questions.length}, mot pour mot)`);
  for (const q of lecture.questions) console.log(`- ${q.texte}${q.boutons.length > 0 ? `  [${q.boutons.map((b) => b.label).join(" | ")}]` : q.unite ? `  [case en ${q.unite}]` : ""}`);
  console.log("\nFICHE");
  for (const d of lecture.fiche.donnees) console.log(`- ${d.libelle} : ${d.valeur ?? "?"} (${d.origine})`);
  const sans = lecture.lignes.filter((l) => l.fournitures.length === 0).length;
  console.log(`\nLignes : ${lecture.lignes.length} (${sans} sans fourniture)`);

  const ecarts = devis.controle(lecture, devis.lignes);
  if (metiersReperes[0] !== devis.trade) ecarts.push(`Repérage : « ${metiersReperes.join(", ") || "rien"} » au lieu de « ${devis.trade} » en premier`);
  console.log(`\nCONTRÔLE (résultat attendu) : ${ecarts.length === 0 ? "aucun écart" : `${ecarts.length} écart(s)`}`);
  for (const e of ecarts) console.log(`- ${e}`);
  return ecarts.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
