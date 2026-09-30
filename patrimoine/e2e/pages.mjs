// Parcours des écrans (propriétaire) sur téléphone et ordinateur : chaque page
// s'affiche sans erreur, sans débordement horizontal, et les documents
// générés (dossier banque, export Excel) sont servis.
import { base, browserLogin, check, done, launch } from "./lib.mjs";

const browser = await launch();
const SIZES = [
  ["téléphone", { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }],
  ["ordinateur", { viewport: { width: 1440, height: 900 } }],
];
for (const [label, opts] of SIZES) {
  const page = await (await browser.newContext(opts)).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/401|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160));
  });
  await browserLogin(page);
  const d = (await (await page.request.get(base + "/api/data")).json()).data;
  const pages = [
    "/",
    "/patrimoine",
    "/gestion",
    "/gestion?onglet=loyers",
    "/gestion?onglet=locataires",
    "/documents",
    "/chronologie",
    "/simulations",
    "/plus",
    "/plus/a-completer",
    "/plus/indicateurs",
    "/plus/dossier-banque",
    "/plus/remuneration",
    "/plus/apparence",
    "/plus/securite",
    ...(d.buildings[0] ? [`/patrimoine/immeuble/${d.buildings[0].id}`] : []),
    ...(d.companies[1] ? [`/patrimoine/societe/${d.companies[1].id}`] : []),
    ...(d.loans[0] ? [`/patrimoine/credit/${d.loans[0].id}`] : []),
    ...(d.units[0] ? [`/patrimoine/lot/${d.units[0].id}`, `/patrimoine/logement/${d.units[0].id}?depuis=gestion`] : []),
  ];
  const overflow = [];
  for (const p of pages) {
    const r = await page.goto(base + p);
    await page.waitForTimeout(400);
    if (!r || r.status() >= 400) errors.push(`${p} → ${r?.status()}`);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (o > 1) overflow.push(`${p} +${o}px`);
  }
  check(`${label} : ${pages.length} écrans sans erreur`, errors.length === 0, errors.slice(0, 5).join(" | "));
  check(`${label} : aucun débordement horizontal`, overflow.length === 0, overflow.join(" | "));
  if (label === "ordinateur") {
    const dossier = await page.request.get(base + "/api/dossier-banque");
    check("dossier banque généré (PDF)", dossier.status() === 200 && (await dossier.body()).subarray(0, 5).toString() === "%PDF-", dossier.status());
    const excel = await page.request.get(base + "/api/export-excel");
    check("export Excel", excel.status() === 200, excel.status());
    // Le loyer affiché d'un logement loué est celui du bail en cours.
    const lease = d.tenancies.find((t) => t.status === "actif" && t.rent);
    const unit = lease && d.units.find((u) => u.id === lease.unitId);
    if (unit && unit.rent !== lease.rent) {
      await page.goto(base + `/patrimoine/lot/${unit.id}`);
      await page.waitForTimeout(600);
      const text = (await page.locator("main").innerText()).replace(/\s/g, "");
      check("loyer du lot = loyer du bail en cours", text.includes(`${lease.rent.toLocaleString("fr-FR").replace(/\s/g, "")}€`), `bail ${lease.rent} €, logement ${unit.rent} €`);
    }
  }
  await page.context().close();
}
await browser.close();
done("Écrans");
