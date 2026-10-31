/**
 * Temps un (directive du fondateur, 12 octobre 2026) : « Le double de test ne remplace pas le modèle. Avant de fusionner
 * le temps un, lance la vraie lecture Opus sur DE00000071 et sur 7954 […] et mets dans le rapport le bref et les
 * questions produits mot pour mot. »
 *
 * La vraie lecture d'un devis, hors base : le PDF lu comme au dépôt (texte par page, routage texte / image), un appel
 * au modèle de lecture (IaLectureReader sur l'adaptateur Anthropic, le même qu'en production), puis le bref et les questions imprimés mot
 * pour mot et le contrôle du résultat attendu (§6 du référentiel électricité pour 7954, §51.5 pour DE00000071).
 *
 *   BATICLAIR_ANTHROPIC_KEY=… pnpm exec tsx scripts/lecture-reelle.ts <devis.pdf | fixture:DE00000071 | fixture:D.2026.105 | fixture:7954 | fixture:fiche:<code>> <7954|DE00000071|fiche:<code>> [sortie.json]
 *
 * En CI : le workflow « Vraie lecture » (`.github/workflows/lecture-reelle.yml`), lancé par l'étiquette « lecture-reelle »
 * sur une PR, avec le secret BATICLAIR_ANTHROPIC_KEY ; le bref et les questions sont dans le journal du job.
 *
 * Le PDF reste hors du dépôt. La sortie JSON (lecture complète) est écrite là où on le demande, jamais commitée.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { anonymiserLigne, computeAiCost, controleLecture7954, controleLectureD2026105, controleLectureDe00000071, controleLectureFiche, exportPourLecture, FICHES, lectureParLots, numberLines, priceTableAt, referentialFor, routePage, tradeProfile, type AiUsage, type LectureDevis, type LigneDuDevis } from "@baticlair/domain";
import { D2026_105_LINES } from "../../../packages/domain/test/devis-reels/d2026-105.js";
import { DE00000071_LINES } from "../../../packages/domain/test/devis-reels/de00000071.js";
import { DEVIS_7954 } from "../../../packages/domain/test/devis-reels/devis-7954.js";
import { extractPdfPages } from "../src/modules/documents/infrastructure/pdf-pages.js";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";
import { IaLectureReader } from "../src/modules/takeoff/infrastructure/ia-lecture-reader.js";
import { AnthropicDocumentReader } from "../src/platform/ai/anthropic-document-reader.js";
import { D2026_105_PDF } from "../test/support/d2026105-pdf.js";
import { DEVIS_7954_PDF } from "../test/support/devis7954-pdf.js";
import { FICHE_PDF } from "../test/support/fiche-pdf.js";
import { DE00000071_PDF } from "../test/support/de00000071-pdf.js";
import { lireLotParLot } from "../src/modules/takeoff/application/lecture-par-lots.js";

const DEVIS: Record<string, { trade: string; lignes: readonly LigneDuDevis[]; controle: (l: LectureDevis, d: readonly LigneDuDevis[]) => string[] }> = {
  "7954": { trade: "electrical", lignes: DEVIS_7954, controle: controleLecture7954 },
  DE00000071: { trade: "roofing", lignes: DE00000071_LINES.map((l) => ({ ref: l.ref, designation: l.designation })), controle: controleLectureDe00000071 },
  "D.2026.105": { trade: "roofing", lignes: D2026_105_LINES.map((l) => ({ ref: l.ref, designation: l.designation })), controle: controleLectureD2026105 },
  // §52 : chaque fiche métier calculée, son devis de la section 6 (« fixture:fiche:terrassement fiche:terrassement »).
  ...Object.fromEntries(FICHES.filter((f) => f.moteur === "fiche").map((f) => [`fiche:${f.code}`, { trade: f.metier, lignes: [], controle: (l: LectureDevis) => controleLectureFiche(f, l) }])),
};

async function fichePdf(code: string): Promise<Uint8Array> {
  const f = FICHES.find((x) => x.code === code);
  if (!f) throw new Error(`Fiche métier inconnue : ${code}`);
  return FICHE_PDF(f);
}

async function main(): Promise<number> {
  const [pdfPath, quel, sortie] = process.argv.slice(2);
  const devis = quel ? DEVIS[quel] : undefined;
  if (!pdfPath || !devis) {
    console.error(`Usage : tsx scripts/lecture-reelle.ts <devis.pdf | fixture:DE00000071 | fixture:D.2026.105 | fixture:7954 | fixture:fiche:<code>> <${Object.keys(DEVIS).join("|")}> [sortie.json]`);
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
  const bytes =
    pdfPath === "fixture:DE00000071" ? await DE00000071_PDF() : pdfPath === "fixture:D.2026.105" ? await D2026_105_PDF() : pdfPath === "fixture:7954" ? await DEVIS_7954_PDF() : pdfPath.startsWith("fixture:fiche:") ? await fichePdf(pdfPath.slice("fixture:fiche:".length)) : new Uint8Array(readFileSync(pdfPath));
  const content = await new PdfJsPdfReader().read(bytes, { maxPages: 60 });
  const profile = tradeProfile(devis.trade);
  const text: string[] = [];
  const vision: number[] = [];
  for (const page of content.pages) {
    const route = routePage(page, profile).route;
    // Comme au dépôt (RGPD, 24 octobre 2026) : chaque ligne anonymisée avant d'être lue par l'IA.
    if (route === "text") text.push(numberLines(page).map((l) => `[${l.ref}] ${anonymiserLigne(l.text).texte}`).join("\n"));
    else if (route === "vision") vision.push(page.pageNumber);
  }
  const ref = referentialFor(devis.trade);
  const rapide = process.env.AI_QUANTITATIF_MODEL || "claude-sonnet-5-5";
  const reader = new IaLectureReader((choix) => new AnthropicDocumentReader(apiKey, choix.model, choix.effort), model, effort, rapide);
  // Le repérage des métiers avant la lecture (modèle rapide, texte seul) : il doit dire le métier du devis, vite.
  const debutReperage = Date.now();
  const reperage = await reader.reperer(text.join("\n"));
  const metiersReperes = reperage?.output?.metiers ?? [];
  const sections = reperage?.output?.sections ?? [];
  console.log(`Repérage ${rapide} — ${reperage?.status ?? "absent"} en ${Math.round((Date.now() - debutReperage) / 1000)} s : ${metiersReperes.join(", ") || "(rien)"}`);
  // Le coût de chaque appel, à la grille de prix du jour (le même calcul que le journal des appels de l'app).
  const grille = priceTableAt(new Date());
  let cout = 0;
  const compter = (m: string, usage: AiUsage) => (cout += computeAiCost(grille.models[m] ? m : model, usage, grille).totalMicroUsd);
  if (reperage) compter(rapide, reperage.usage);
  // Comme en production (`lireLeDevis`, RGPD) : le texte anonymisé, et l'image des seules pages scannées (plus le PDF entier).
  const document = { numberedText: text.join("\n"), imagePdf: vision.length > 0 ? await extractPdfPages(bytes, vision) : null, imagePages: vision };
  const started = Date.now();
  const exportDe = (m: string) => {
    const r = referentialFor(m);
    return r ? exportPourLecture(r) : "Aucun référentiel pour ce métier.";
  };
  let lecture: LectureDevis | null = null;
  let echec = "";
  if (lectureParLots(metiersReperes, document.numberedText)) {
    // Le chemin de la production (`lireLotParLot`) : tranches « lignes seulement » (modèle rapide), puis UNE synthèse.
    const r = await lireLotParLot(reader, document, metiersReperes, sections, null);
    console.log(`Sections repérées : ${sections.length} ; appels : ${r.appels.length} (tranches + synthèse) en ${Math.round(r.dureeMs / 1000)} s`);
    for (const a of r.appels) {
      if (!a.attempt) continue;
      compter(a.attempt.model, a.attempt.usage);
      const u = a.attempt.usage;
      console.log(`Appel ${a.nom} — ${a.attempt.model} — ${a.attempt.status}${a.attempt.errorCode ? ` (${a.attempt.errorCode})` : ""} en ${Math.round(a.attempt.durationMs / 1000)} s, ${u.outputTokens} jetons rendus, ${u.inputTokens} lus (+ ${u.cacheReadTokens ?? 0} en cache)`);
    }
    lecture = r.lecture;
    if (!lecture) echec = r.appels.map((a) => `${a.attempt?.status ?? "absent"} ${a.attempt?.errorCode ?? ""}`).join(" ; ");
  } else {
    const attempt = await reader.lire({
      document,
      trade: devis.trade,
      tradeLabel: profile.label,
      // Comme en production : plusieurs métiers repérés (petit devis), la lecture reçoit le référentiel de chacun.
      referentiel: metiersReperes.length > 1 ? metiersReperes.map((m) => `=== Référentiel ${tradeProfile(m).label} (${m}) ===\n${exportDe(m)}`).join("\n\n") : ref ? exportPourLecture(ref) : "Aucun référentiel pour ce métier.",
    });
    compter(model, attempt.usage);
    lecture = attempt.output;
    if (!lecture) echec = `${attempt.status} ${attempt.errorCode ?? ""}`;
  }
  const secondes = Math.round((Date.now() - started) / 1000);
  console.log(`Modèle ${model} (effort ${effort}) — ${lecture ? "success" : "échec"} en ${secondes} s — pages texte ${text.length}, image ${vision.length}`);
  console.log(`COÛT : ${(cout / 1_000_000).toFixed(2)} $ (grille ${grille.version}, repérage compris)`);
  if (!lecture) {
    console.error(`Lecture en échec : ${echec}`);
    return 1;
  }
  for (const l of lecture.lotsNonLus ?? []) console.log(`LOT NON LU : ${l.libelle}`);
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
