// LA RECETTE EN LIGNE DU REGROUPEMENT NÉGOCIÉ (business model final, Greg, 25 octobre 2026) : sur test.mobiiz.fr, un
// artisan envoie une demande perso (écran « Préviens ton négoce »), déclare un gros besoin, l'admin de test (chasseur de
// la prévisualisation, `delivered+admin-recette@resend.dev`) le prend en charge et envoie l'offre, l'artisan l'accepte.
// Vrais e-mails (adresses de test Resend, lues par l'API Resend). Rien en production. Les deux comptes sont supprimés à
// la fin (« Supprimer mon compte »).
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/negocie.mjs <se|ordi> <dossier-captures>
import { chromium, devices } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , APPAREIL = "se", OUT = "./captures"] = process.argv;
const BASE = process.env.RECETTE_BASE ?? "https://test.mobiiz.fr";
mkdirSync(OUT, { recursive: true });
const options = APPAREIL === "se" ? { ...devices["iPhone SE"] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const browser = await chromium.launch();
const journal = [];
const anomalies = [];
let n = 0;
const ts = Date.now().toString(36);
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
const t = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(page, nom) {
  const fichier = `${String(n).padStart(2, "0")}-${slug(nom)}.jpg`;
  try {
    await page.screenshot({ path: path.join(OUT, fichier), type: "jpeg", quality: 70, fullPage: false });
    return fichier;
  } catch {
    return null;
  }
}
async function etape(nom, page, fn) {
  n++;
  const debut = Date.now();
  try {
    const note = await fn();
    const fichier = await capture(page, nom);
    journal.push({ n, etape: nom, statut: "ok", detail: note ?? "", capture: fichier, ms: Date.now() - debut });
    console.log(`✓ ${n} ${nom}${note ? ` : ${note}` : ""}`);
    return true;
  } catch (e) {
    const fichier = await capture(page, `${nom} BUG`);
    const message = String(e?.message ?? e).split("\n").slice(0, 4).join(" ").slice(0, 400);
    journal.push({ n, etape: nom, statut: "bug", detail: message, capture: fichier, ms: Date.now() - debut });
    console.log(`✗ ${n} ${nom} : ${message}`);
    return false;
  }
}
const verif = (cond, message) => {
  if (!cond) throw new Error(message);
};
const voir = (loc, timeout = 20000) => loc.first().waitFor({ state: "visible", timeout });

function surveiller(page, qui) {
  page.on("console", (m) => {
    if (m.type() === "error") anomalies.push({ qui, url: page.url(), type: "console", texte: m.text().slice(0, 300) });
  });
  page.on("pageerror", (e) => anomalies.push({ qui, url: page.url(), type: "exception", texte: String(e.message).slice(0, 300) }));
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 500 || (r.status() >= 400 && r.status() !== 401 && u.startsWith(BASE) && /\/v1\//.test(u))) anomalies.push({ qui, url: page.url(), type: `http ${r.status()}`, texte: `${r.request().method()} ${u.replace(BASE, "").slice(0, 160)}` });
  });
  page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
  return page;
}
async function api(page, method, url, body) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      let json = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status, body: json };
    },
    { method, url, body },
  );
}
function resend(chemin) {
  return JSON.parse(execFileSync("curl", ["-sS", "-H", `Authorization: Bearer ${process.env.RESEND_API_KEY}`, `https://api.resend.com${chemin}`], { encoding: "utf8" }));
}
const lus = new Map();
async function emailsVers(adresse, attendre, timeout = 90000) {
  const fin = Date.now() + timeout;
  for (;;) {
    const liste = (resend("/emails?limit=100").data ?? []).filter((e) => (e.to ?? []).map((x) => x.toLowerCase()).includes(adresse.toLowerCase()));
    const complets = [];
    for (const e of liste) {
      if (!lus.has(e.id)) lus.set(e.id, resend(`/emails/${e.id}`));
      complets.push(lus.get(e.id));
    }
    complets.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (complets.some(attendre) || Date.now() > fin) return complets;
    await t(4000);
  }
}

async function inscrire(page, email, entreprise) {
  await page.goto(`${BASE}/inscription`, { waitUntil: "networkidle" });
  await page.getByLabel("Prénom et nom").fill("Jean Recette");
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(`Recette-${ts}-solide`);
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await voir(page.getByRole("heading", { name: /^Bonjour Jean/ }), 30000);
  const p = await api(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: null, email: null });
  verif(p.status === 200, `profil ${p.status}`);
  const s = await api(page, "POST", "/v1/groupe/siret");
  verif(s.status === 200, `SIRET ${s.status}`);
}
async function supprimer(page) {
  await page.goto(`${BASE}/compte`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: /Supprimer définitivement|Supprimer mon compte/ }).last().click();
  await page.waitForURL((u) => !/\/compte$/.test(u.pathname), { timeout: 30000 });
}

const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const ARTISAN = `delivered+neg-artisan-${APPAREIL}-${ts}@resend.dev`;
const NEGOCE = `delivered+neg-negoce-${APPAREIL}-${ts}@resend.dev`;
const CHASSEUR = "delivered+admin-recette@resend.dev";
const dans3semaines = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);

const ctxA = await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = surveiller(await ctxA.newPage(), `artisan-${APPAREIL}`);
let projet = null;

await etape("Landing /couvreurs : chasseurs d'opportunités", page, async () => {
  await page.goto(`${BASE}/couvreurs`, { waitUntil: "networkidle" });
  await voir(page.getByText("Pour les couvreurs"));
  await page.getByText("Des chasseurs d'opportunités négocient pour toi.").scrollIntoViewIfNeeded();
  await voir(page.getByText("Des chasseurs d'opportunités négocient pour toi."));
});
await etape("Artisan : inscription, SIRET, adresse dans le 22", page, async () => {
  await inscrire(page, ARTISAN, `Toitures Négocié ${APPAREIL === "se" ? "SE" : "Ordi"}`);
  const q = await api(page, "POST", "/v1/quantitatifs", { lignes: [
    { libelle: ARDOISE, quantite: "1800", unite: "pièces" },
    { libelle: "Crochet inox 100 mm", quantite: "1900", unite: "pièces" },
  ] });
  verif(q.status === 201, `liste ${q.status}`);
  projet = q.body.projetId;
  const a = await api(page, "PATCH", `/v1/projects/${projet}`, { address: "8 rue de Kerampont, 22300 Lannion" });
  verif(a.status === 200, `adresse ${a.status}`);
  return ARTISAN;
});
await etape("Demande perso : choisir son négoce (accord coché d'office)", page, async () => {
  await page.goto(`${BASE}/chantiers/${projet}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Envoyer à mes négoces" }).click();
  const form = page.getByLabel("Envoyer à mes négoces").first();
  await form.getByLabel("Nom du négoce").fill("Négoce Recette");
  await form.getByLabel("E-mail").fill(NEGOCE);
  await form.getByRole("button", { name: "Ajouter ce négoce" }).click();
  verif(await form.getByRole("checkbox", { name: /J'accepte que mon nom/ }).isChecked(), "accord non coché");
  await form.getByRole("button", { name: /^Envoyer/ }).last().scrollIntoViewIfNeeded();
});
await etape("Préviens ton négoce", page, async () => {
  await page.getByLabel("Envoyer à mes négoces").first().getByRole("button", { name: /^Envoyer/ }).last().click();
  const p = page.getByLabel("Préviens ton négoce");
  await voir(p.getByText(/Ton négoce ne connaît pas encore Mobiiz/), 30000);
  await p.scrollIntoViewIfNeeded();
  const sms = await p.getByRole("link", { name: "SMS" }).getAttribute("href");
  verif(/bonjour%40mobiiz\.fr/.test(sms ?? ""), `SMS : ${sms}`);
  return "SMS prérempli";
});
await etape("E-mail réel au négoce (demande de prix)", page, async () => {
  const mails = await emailsVers(NEGOCE, () => true);
  verif(mails.length > 0, "aucun e-mail au négoce");
  verif(/mobiiz\.fr/.test(mails[0].from ?? ""), `expéditeur ${mails[0].from}`);
  await page.getByLabel("Préviens ton négoce").getByRole("button", { name: "Je l'ai déjà prévenu" }).click();
  await voir(page.getByRole("status").filter({ hasText: "Ta demande est partie" }));
  return `« ${mails[0].subject} »`;
});
await etape("Besoin déclaré (ardoise, le crochet refusé)", page, async () => {
  await page.getByRole("button", { name: /Tenter un prix de groupe/ }).click();
  const carte = page.getByRole("region", { name: "Tenter un prix de groupe" });
  await carte.getByLabel("Pour quand ?").fill(dans3semaines);
  await carte.getByRole("button", { name: "Déclarer mes besoins" }).click();
  await voir(page.getByRole("status").filter({ hasText: "besoin déclaré" }), 30000);
});
await etape("Regroupements : en cours", page, async () => {
  await page.goto(`${BASE}/regroupements`, { waitUntil: "networkidle" });
  await voir(page.getByRole("region", { name: "Tes besoins" }).getByText("Regroupement en cours"));
});

const ctxC = await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" });
const ch = surveiller(await ctxC.newPage(), `chasseur-${APPAREIL}`);
const lot = () => ch.getByRole("listitem").filter({ hasText: "Ardoise 32×22" }).filter({ hasText: "dans le 22" }).first();
await etape("Chasseur : code par e-mail", ch, async () => {
  await inscrire(ch, CHASSEUR, "Mobiiz Chasseur Recette");
  await ch.goto(`${BASE}/admin/chasseur`, { waitUntil: "networkidle" });
  const depuis = Date.now();
  await ch.getByRole("button", { name: "Recevoir mon code" }).click();
  await voir(ch.getByLabel("Code reçu par e-mail"));
  const mails = await emailsVers(CHASSEUR, (m) => /code d'accès/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000);
  const mail = mails.filter((m) => /code d'accès/.test(m.subject)).at(-1);
  verif(mail, "pas de code");
  await ch.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)[1]);
  await ch.getByRole("button", { name: "Ouvrir tes regroupements" }).click();
  await voir(lot());
});
await etape("Chasseur : tableau des regroupements", ch, async () => {
  await lot().scrollIntoViewIfNeeded();
  return (await lot().innerText()).split("\n").slice(0, 3).join(" · ");
});
await etape("Chasseur : je prends en charge", ch, async () => {
  await lot().getByRole("button", { name: "Je prends en charge" }).click();
  await voir(lot().getByText("En négociation"));
});
await etape("Chasseur : offre saisie (commission incluse)", ch, async () => {
  await lot().getByLabel("Négoce", { exact: true }).fill("Ardoisière de l'Ouest (recette)");
  await lot().getByLabel("E-mail du négoce").fill(NEGOCE);
  await lot().getByLabel(/Prix négocié HT/).fill("1,10");
  await lot().getByLabel("Valable jusqu'au").fill(dans3semaines);
  await voir(lot().getByText(/Prix affiché aux artisans : 1,12/));
  await lot().getByText(/Prix affiché aux artisans/).scrollIntoViewIfNeeded();
});
await etape("Chasseur : offre envoyée à tous", ch, async () => {
  await lot().getByRole("button", { name: "Enregistrer l'offre" }).click();
  await lot().getByRole("button", { name: "Envoyer l'offre à tous" }).click();
  await voir(lot().getByText(/0 acceptation sur 1/));
});
await etape("Artisan : offre reçue (négoce masqué)", page, async () => {
  await page.reload({ waitUntil: "networkidle" });
  const offre = page.getByLabel("Offre négociée");
  await voir(offre.getByText("Négoce vérifié dans le 22"));
  verif(!(await offre.getByText("Ardoisière").count()), "nom du négoce visible avant l'acceptation");
  await offre.scrollIntoViewIfNeeded();
});
await etape("Artisan : j'accepte, bon de commande", page, async () => {
  await page.getByLabel("Offre négociée").getByRole("button", { name: "J'accepte" }).click();
  await voir(page.getByRole("button", { name: "Mon bon de commande" }));
  const mails = await emailsVers(ARTISAN, (m) => /bon de commande|commande/i.test(m.subject));
  return mails.map((m) => `« ${m.subject} »`).slice(-1).join("");
});
await etape("Chasseur : acceptation vue, lot transmis au négoce", ch, async () => {
  await ch.reload({ waitUntil: "networkidle" });
  await voir(lot().getByText(/1 acceptation sur 1/));
  await lot().getByRole("button", { name: "Transmettre la commande au négoce" }).click();
  const mails = await emailsVers(NEGOCE, (m) => /Commande groupée/.test(m.subject));
  verif(mails.some((m) => /Commande groupée/.test(m.subject)), "pas d'e-mail de lot au négoce");
  return mails.filter((m) => /Commande groupée/.test(m.subject)).map((m) => `« ${m.subject} »`).join("");
});
await etape("Nettoyage : comptes supprimés", page, async () => {
  await supprimer(page);
  await supprimer(ch);
});

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ base: BASE, appareil: APPAREIL, journal, anomalies }, null, 2));
console.log(`\n${journal.filter((j) => j.statut === "ok").length}/${journal.length} étapes ; ${anomalies.length} anomalie(s)`);
for (const a of anomalies.slice(0, 20)) console.log(`  ! ${a.qui} ${a.type} ${a.texte}`);
await browser.close();
