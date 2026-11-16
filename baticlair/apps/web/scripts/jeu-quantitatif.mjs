// LE JEU DE TEST DU QUANTITATIF PAR L'IA (Greg, 16 novembre 2026 : « un jeu de test rejouable de cas réels […] taux de
// lignes justes, nombre de questions posées, temps, coût exact. Rejoue-le à chaque changement de prompt »).
//
// Il joue les cas de `jeu-quantitatif/cas.json` contre un site Mobiiz (le site de TEST, jamais la production), avec un
// compte artisan, par les mêmes routes que l'écran. Le coût exact vient du relevé de consommation du compte
// (`GET /v1/ai-usage`), lu avant et après chaque cas ; le temps est mesuré ici.
//
//   JEU_BASE=https://test.mobiiz.fr JEU_EMAIL=… JEU_MOT_DE_PASSE=… node scripts/jeu-quantitatif.mjs [sortie.json] [reponses|textes]
//
// Chaque appel réel à l'IA coûte : le jeu complet fait une vingtaine d'appels courts (quelques centimes).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ici = path.dirname(fileURLToPath(import.meta.url));
const cas = JSON.parse(readFileSync(path.join(ici, "jeu-quantitatif", "cas.json"), "utf8"));
const BASE = process.env.JEU_BASE ?? "https://test.mobiiz.fr";
if (/(^|\/\/)(www\.)?mobiiz\.fr/.test(BASE)) throw new Error("Le jeu de test ne se joue jamais sur la production.");
const [sortie, seulement] = process.argv.slice(2);
const b = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const page = await (await b.newContext()).newPage();
await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
await page.getByLabel("E-mail").fill(process.env.JEU_EMAIL);
await page.getByLabel("Mot de passe").fill(process.env.JEU_MOT_DE_PASSE);
await page.getByRole("button", { name: "Se connecter" }).click();
await page.getByRole("heading", { name: /^Bonjour/ }).first().waitFor({ timeout: 30_000 });
const appel = (chemin, body) =>
  page.evaluate(
    async ({ chemin, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const debut = performance.now();
      const res = await fetch(chemin, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const texte = await res.text();
      let json = null;
      try {
        json = JSON.parse(texte);
      } catch {
        json = null;
      }
      return { status: res.status, json, ms: Math.round(performance.now() - debut) };
    },
    { chemin, body },
  );
/**
 * Le coût cumulé du compte ce mois-ci et le nombre d'appels, lus dans son relevé (`actual.costEur`, au dix-millième
 * d'euro ; `usdToEur` est le taux du relevé). Rendu en millionièmes de dollar pour les calculs.
 */
const releve = async () => {
  const r = (await appel("/v1/ai-usage")).json ?? {};
  const taux = Number(r.usdToEur ?? 0.92) || 0.92;
  return { cout: Math.round((Number(r.actual?.costEur ?? 0) / taux) * 1e6), appels: Number(r.actual?.calls ?? 0), echecs: Number(r.actual?.failedCalls ?? 0), brut: r };
};
const plat = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[×*x]/g, " ").replace(/[^a-z0-9,.]+/g, " ").trim();
const memeValeur = (attendu, recu) => {
  if (attendu === null) return recu === null;
  if (recu === null) return false;
  const [a, r] = [String(attendu), String(recu)];
  return /^\d+(?:[.,]\d+)?$/.test(a) ? Number(a.replace(",", ".")) === Number(r.replace(",", ".")) : plat(a) === plat(r);
};

const resultats = { base: BASE, le: new Date().toISOString(), reponses: [], textes: [] };
const depart = await releve();
if (process.env.JEU_VOIR_RELEVE) console.log("relevé :", JSON.stringify(depart.brut).slice(0, 600));

if (!seulement || seulement === "reponses")
  for (const c of cas.reponses) {
    const questions = cas.questions[c.questions];
    const avant = await releve();
    const r = await appel("/v1/assistant/interpretation", { questions, texte: c.texte });
    const apres = await releve();
    const recues = questions.map((q) => {
      const x = (r.json?.reponses ?? []).find((y) => y.numero === q.numero);
      return x && x.statut === "compris" ? x.valeur : null;
    });
    const justes = c.attendu.filter((a, i) => memeValeur(a, recues[i])).length;
    // Une réponse FAUSSE (une valeur là où rien n'était attendu, ou une autre valeur) est plus grave qu'une réponse manquée.
    const fausses = c.attendu.filter((a, i) => recues[i] !== null && !memeValeur(a, recues[i])).length;
    resultats.reponses.push({ nom: c.nom, attendues: c.attendu.length, justes, fausses, ia: r.json?.ia === true, ms: r.ms, coutMicroUsd: apres.cout - avant.cout, recues, statut: r.status });
    console.log(`${justes}/${c.attendu.length}${fausses ? ` (${fausses} fausse${fausses > 1 ? "s" : ""})` : ""} · ${r.ms} ms · ${((apres.cout - avant.cout) / 1e6).toFixed(5)} $ · IA ${r.json?.ia ? "oui" : "non"} · ${c.nom}`);
  }

if (!seulement || seulement === "textes")
  for (const c of cas.textes) {
    const avant = await releve();
    const r = await appel("/v1/assistant/description", { echanges: [{ de: "artisan", texte: c.texte }] });
    const apres = await releve();
    const lignes = (r.json?.lignes ?? []).map((l) => ({ designation: l.designation ?? l.libelle ?? "", quantite: l.quantite === null || l.quantite === undefined ? null : Number(String(l.quantite).replace(",", ".")), unite: l.unite ?? null }));
    const prises = new Set();
    let justes = 0;
    for (const a of c.lignes) {
      const i = lignes.findIndex((l, k) => !prises.has(k) && l.quantite === a.quantite && a.mots.every((m) => ` ${plat(l.designation)} `.includes(plat(m))));
      if (i >= 0) {
        prises.add(i);
        justes++;
      }
    }
    const enTrop = lignes.length - prises.size;
    const questions = (r.json?.questions ?? []).length;
    const questionOk = c.questionAttendue ? questions > 0 : true;
    resultats.textes.push({ nom: c.nom, attendues: c.lignes.length, justes, enTrop, questions, questionOk, ia: r.json?.ia === true, ms: r.ms, coutMicroUsd: apres.cout - avant.cout, lignes, question: r.json?.questions?.[0]?.texte ?? null, statut: r.status });
    console.log(`${justes}/${c.lignes.length} ligne(s)${enTrop ? `, ${enTrop} en trop` : ""} · ${questions} question(s)${questionOk ? "" : " (ATTENDUE)"} · ${r.ms} ms · ${((apres.cout - avant.cout) / 1e6).toFixed(5)} $ · IA ${r.json?.ia ? "oui" : "non"} · ${c.nom}`);
  }

const somme = (t, f) => t.reduce((s, x) => s + f(x), 0);
const bilan = (t, attendues, justes) => (t.length ? `${somme(t, justes)}/${somme(t, attendues)} (${Math.round((100 * somme(t, justes)) / Math.max(1, somme(t, attendues)))} %)` : "non joué");
resultats.bilan = {
  reponsesJustes: bilan(resultats.reponses, (x) => x.attendues, (x) => x.justes),
  reponsesFausses: somme(resultats.reponses, (x) => x.fausses),
  lignesJustes: bilan(resultats.textes, (x) => x.attendues, (x) => x.justes),
  lignesEnTrop: somme(resultats.textes, (x) => x.enTrop),
  questionsPosees: somme(resultats.textes, (x) => x.questions),
  tempsMoyenMs: Math.round(somme([...resultats.reponses, ...resultats.textes], (x) => x.ms) / Math.max(1, resultats.reponses.length + resultats.textes.length)),
  coutTotalUsd: Number((((await releve()).cout - depart.cout) / 1e6).toFixed(4)),
  appelsIa: (await releve()).appels - depart.appels,
  appelsIaEnEchec: (await releve()).echecs - depart.echecs,
};
console.log("\nBILAN", JSON.stringify(resultats.bilan, null, 1));
if (sortie) writeFileSync(sortie, JSON.stringify(resultats, null, 1));
await b.close();
