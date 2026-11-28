// Rend chaque devis.html en PDF (et en « photo » dégradée pour les supports photo) dans entrees/<ID>/ :
// c'est le SEUL dossier que voient les lecteurs (jamais la fiche vérité ni la lecture de référence).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const specs = JSON.parse(fs.readFileSync("chantiers/SPECS.json", "utf8"));
const seul = process.argv.slice(2);
const browser = await chromium.launch();
for (const c of specs) {
  if (seul.length && !seul.includes(c.id)) continue;
  const html = `chantiers/${c.id}/devis.html`;
  if (!fs.existsSync(html)) { console.log(c.id, "pas de devis.html"); continue; }
  const out = `entrees/${c.id}`;
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const page = await browser.newPage();
  await page.goto("file://" + fs.realpathSync(html));
  const pdf = `${out}/devis.pdf`;
  await page.pdf({ path: pdf, format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
  await page.close();
  // Le texte du PDF (l'appli le donne aussi au lecteur), gardé à part pour les contrôles par le code.
  execFileSync("pdftotext", ["-layout", pdf, `textes/${c.id}.txt`]);
  if (c.support === "photo") {
    execFileSync("pdftoppm", ["-r", "120", "-png", pdf, `${out}/page`]);
    execFileSync("python3", ["outils/photo.py", out, c.id]);
    fs.rmSync(pdf);
  } else {
    fs.copyFileSync(`textes/${c.id}.txt`, `${out}/devis.txt`);
  }
  console.log(c.id, c.support, fs.readdirSync(out).join(" "));
}
await browser.close();
