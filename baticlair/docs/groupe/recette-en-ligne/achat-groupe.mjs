// LA RECETTE EN LIGNE DE L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026), sur test.mobiiz.fr, les cinq cas :
// 1. compte vide ; 2. lancement et « Préviens ton négoce » ; 3. un 2e artisan qui rejoint ; 4. deux offres (une douteuse),
// la meilleure, la commande ; 5. le plan B. L'admin de test (`delivered+admin-recette@resend.dev`) clôture et analyse
// tout de suite (geste réservé à la prévisualisation). Négoces : adresses de test Resend (aucun vrai négoce). Rien en
// production. Les comptes sont supprimés à la fin.
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/achat-groupe.mjs <se|ordi> <dossier-captures>
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
    await page.screenshot({ path: path.join(OUT, fichier), type: "jpeg", quality: 72, fullPage: false });
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
async function emailsVers(adresse, attendre, timeout = 120000) {
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

async function inscrire(page, email, entreprise, prenom = "Jean") {
  await page.goto(`${BASE}/inscription`, { waitUntil: "networkidle" });
  await page.getByLabel("Prénom et nom").fill(`${prenom} Recette`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(`Recette-${ts}-solide`);
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await voir(page.getByRole("heading", { name: "Voici ton adresse Mobiiz :" }), 60000);
  await page.getByRole("button", { name: "C'est compris" }).click();
  await voir(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }), 30000);
  const p = await api(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: null, email: null });
  verif(p.status === 200, `profil ${p.status}`);
  const s = await api(page, "POST", "/v1/groupe/siret");
  verif(s.status === 200 && s.body?.verifie, `SIRET ${s.status} ${JSON.stringify(s.body)}`);
}
async function supprimer(page) {
  await page.goto(`${BASE}/compte`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: /Supprimer définitivement|Supprimer mon compte/ }).last().click();
  await page.waitForURL((u) => !/\/compte$/.test(u.pathname), { timeout: 30000 });
}
async function lancer(page, o) {
  await page.getByLabel("Quantité").fill(o.quantite);
  await page.getByLabel("Commune de livraison").fill(o.commune);
  await page.getByRole("button", { name: "Ajouter un autre négoce" }).click();
  await page.getByLabel("Nom du négoce").fill(o.negoce.nom);
  await page.getByLabel("Son e-mail").fill(o.negoce.email);
  await page.getByLabel("Son téléphone (pour le prévenir)").fill(o.negoce.tel);
  await page.getByRole("button", { name: "Ajouter ce négoce" }).click();
  await page.getByRole("button", { name: o.bouton }).click();
  await voir(page.getByRole("heading", { name: "Préviens ton négoce" }), 30000);
}

// Chaque appareil sa référence : les deux passes ne se regroupent pas entre elles.
const REF = APPAREIL === "se" ? { libelle: "Ardoise 32×22 Espagne 1er choix", designation: "Ardoise naturelle 32×22 Espagne 1er choix", q: "ardoise 32" } : { libelle: "Ardoise 40×22 Espagne 1er choix", designation: "Ardoise naturelle 40×22 Espagne 1er choix", q: "ardoise 40×22" };
const REF_B = APPAREIL === "se" ? { libelle: "Ardoise 40×25 Espagne 1er choix", designation: "Ardoise naturelle 40×25 Espagne 1er choix", q: "ardoise 40×25" } : { libelle: "Ardoise 30×20 Espagne 1er choix", designation: "Ardoise naturelle 30×20 Espagne 1er choix", q: "ardoise 30" };
const A = `delivered+ag-a-${APPAREIL}-${ts}@resend.dev`;
const B = `delivered+ag-b-${APPAREIL}-${ts}@resend.dev`;
const C = `delivered+ag-c-${APPAREIL}-${ts}@resend.dev`;
const X = { nom: `Négoce X ${ts}`, email: `delivered+ag-x-${APPAREIL}-${ts}@resend.dev`, tel: "02 96 00 00 01" };
const Y = { nom: `Négoce Y ${ts}`, email: `delivered+ag-y-${APPAREIL}-${ts}@resend.dev`, tel: "02 96 00 00 02" };
const Z = { nom: `Négoce Z ${ts}`, email: `delivered+ag-z-${APPAREIL}-${ts}@resend.dev`, tel: "02 96 00 00 03" };
const ADMIN = "delivered+admin-recette@resend.dev";
const nouveau = async (qui) => surveiller(await (await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" })).newPage(), `${qui}-${APPAREIL}`);

const adm = await nouveau("admin");
const carteAdmin = (libelle, statut) => adm.getByRole("region", { name: "Tous les achats groupés" }).locator("div").filter({ hasText: libelle }).filter({ hasText: statut }).last();
await etape("Admin : code, mode « automatique »", adm, async () => {
  await inscrire(adm, ADMIN, "Mobiiz Admin Recette");
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const depuis = Date.now();
  await adm.getByRole("button", { name: "Recevoir mon code" }).click();
  await voir(adm.getByLabel("Code reçu par e-mail"));
  const mails = await emailsVers(ADMIN, (m) => /code d'accès/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000);
  const mail = mails.filter((m) => /code d'accès/.test(m.subject)).at(-1);
  verif(mail, "pas de code");
  await adm.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)[1]);
  await adm.getByRole("button", { name: /^Ouvrir/ }).click();
  const m = await api(adm, "PUT", "/v1/admin/pilotage/mode-regroupement", { mode: "automatique" });
  verif(m.status === 200, `mode ${m.status}`);
  await voir(adm.getByRole("heading", { name: /Volume minimum par famille/ }));
  return "mode automatique";
});

const a = await nouveau("artisanA");
await etape("Cas 1 : compte vide (les deux portes)", a, async () => {
  await inscrire(a, A, `Toitures A ${APPAREIL}`);
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await voir(a.getByText("Par où commencer ?"));
  await voir(a.getByRole("link", { name: /Lancer un achat groupé/ }));
  await voir(a.getByRole("link", { name: /Ma liste de matériaux/ }));
});
await etape("Le « + » jaune : les deux mêmes portes", a, async () => {
  await a.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: /Nouveau/ }).click();
  await voir(a.getByRole("dialog", { name: "Que veux-tu faire ?" }));
});
await etape("Cas 2 : lancer (catalogue, au moins un négoce)", a, async () => {
  await a.keyboard.press("Escape");
  await a.goto(`${BASE}/achats-groupes/lancer`, { waitUntil: "networkidle" });
  await a.getByLabel("Quel matériau ?").fill(REF.q);
  await a.getByRole("button", { name: REF.designation }).click();
  await a.getByLabel("Quantité").fill("1800");
  await a.getByRole("button", { name: "Lancer l'achat groupé" }).click();
  await voir(a.getByText("Ajoute au moins un négoce à qui envoyer la demande."));
});
await etape("Cas 2 : « Préviens ton négoce »", a, async () => {
  await lancer(a, { quantite: "1800", commune: "22300 Lannion", negoce: X, bouton: "Lancer l'achat groupé" });
  await voir(a.getByText(/^Ton négoce va recevoir une grosse demande : 1 800 pièces d/));
  const sms = await a.getByRole("link", { name: "SMS" }).first().getAttribute("href");
  verif(/^sms:0296000001\?&body=Bonjour/.test(sms ?? ""), `SMS : ${sms}`);
  return "texte exact, Appeler, SMS";
});
let besoinA = null;
await etape("Cas 2 : « Je l'ai prévenu », la carte « Seul jusqu'au … »", a, async () => {
  await a.getByRole("button", { name: "Je l'ai prévenu" }).first().click();
  await a.getByRole("link", { name: "Voir mon achat groupé" }).click();
  await a.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  besoinA = a.url().split("/").pop();
  await voir(a.getByText(/^Seul jusqu'au \d+ \S+$/));
});

const b = await nouveau("artisanB");
let besoinB = null;
await etape("Cas 3 : 2e artisan, l'achat ouvert dans son secteur", b, async () => {
  await inscrire(b, B, `Couvertures B ${APPAREIL}`, "Paul");
  await b.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await voir(b.getByRole("region", { name: /Achats groupés (ouverts dans ton secteur|près de chez toi)/ }).getByText(REF.libelle));
});
await etape("Cas 3 : Rejoindre (matériau déjà rempli)", b, async () => {
  const carte = b.getByRole("region", { name: /Achats groupés (ouverts dans ton secteur|près de chez toi)/ }).locator("div").filter({ hasText: REF.libelle }).filter({ has: b.getByRole("link", { name: "Rejoindre" }) }).last();
  await carte.getByRole("link", { name: "Rejoindre" }).click();
  await voir(b.getByRole("heading", { name: "Rejoindre l'achat groupé" }));
  await voir(b.getByText(REF.libelle));
  await lancer(b, { quantite: "900", commune: "22500 Paimpol", negoce: Y, bouton: "Rejoindre l'achat groupé" });
  await b.getByRole("button", { name: "Je l'ai prévenu" }).first().click();
  await b.getByRole("link", { name: "Voir mon achat groupé" }).click();
  await b.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  besoinB = b.url().split("/").pop();
});
await etape("Cas 3 : la carte de A « Regroupé avec d'autres entreprises »", a, async () => {
  await a.goto(`${BASE}/achats-groupes/${besoinA}`, { waitUntil: "networkidle" });
  await voir(a.getByText("Regroupé avec d'autres entreprises"));
  verif((await a.getByText("Paimpol").count()) === 0, "la commune de B est visible");
});

await etape("Cas 4 : l'admin clôture (une demande par négoce)", adm, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const carte = carteAdmin(REF.libelle, "en_collecte");
  await carte.scrollIntoViewIfNeeded();
  await carte.getByRole("button", { name: "Clôturer maintenant (test)" }).click();
  await voir(adm.getByText("Clôturé : les demandes sont parties chez les négoces."));
});
let mailX = null;
await etape("Cas 4 : e-mail réel au négoce X, de la part de SES clients", adm, async () => {
  const mx = await emailsVers(X.email, (m) => /Demande de prix groupée/.test(m.subject));
  mailX = mx.find((m) => /Demande de prix groupée/.test(m.subject));
  verif(mailX, "pas de demande chez X");
  verif(/De la part de votre client Toitures A/.test(mailX.text), "pas « De la part de votre client »");
  verif(!/Couvertures B/.test(mailX.text), "X voit le client de Y");
  const my = await emailsVers(Y.email, (m) => /Demande de prix groupée/.test(m.subject));
  verif(my.some((m) => /De la part de votre client Couvertures B/.test(m.text)), "Y : mauvais clients");
  const vue = await adm.context().newPage();
  await vue.setContent(mailX.html ?? `<pre style="white-space:pre-wrap;font:15px sans-serif">${mailX.text}</pre>`);
  const f = await capture(vue, "E-mail au négoce X");
  await vue.close();
  return `« ${mailX.subject} » (${f})`;
});
const negoce = await nouveau("negoce");
const lien = (m) => /https?:\/\/[^\s]+\/achat-groupe\/[A-Za-z0-9_-]+/.exec(m.text)[0];
await etape("Cas 4 : X répond sans inscription (1,10 € livré)", negoce, async () => {
  await negoce.goto(lien(mailX), { waitUntil: "networkidle" });
  await voir(negoce.getByRole("heading", { name: "Demande de prix groupée" }));
  await negoce.getByLabel(/Prix unitaire HT livré/).fill("1,10");
  await negoce.getByRole("checkbox").check();
  await negoce.getByRole("button", { name: "Déposer mon offre" }).scrollIntoViewIfNeeded();
  await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
  await voir(negoce.getByText(/Votre offre est enregistrée/));
});
await etape("Cas 4 : Y répond moins cher mais livre trop tard (douteuse)", negoce, async () => {
  const my = await emailsVers(Y.email, (m) => /Demande de prix groupée/.test(m.subject));
  await negoce.goto(lien(my.find((m) => /Demande de prix groupée/.test(m.subject))), { waitUntil: "networkidle" });
  await negoce.getByLabel(/Prix unitaire HT livré/).fill("0,95");
  await negoce.getByLabel(/Délai de livraison/).fill("40");
  await negoce.getByRole("checkbox").check();
  await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
  await voir(negoce.getByText(/Votre offre est enregistrée/));
});
await etape("Cas 4 : l'admin analyse ; la douteuse va à l'admin", adm, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const carte = carteAdmin(REF.libelle, "consultation");
  await carte.scrollIntoViewIfNeeded();
  await carte.getByRole("button", { name: /Analyser les offres maintenant/ }).click();
  await voir(adm.getByText("Offres analysées."));
  await adm.reload({ waitUntil: "networkidle" });
  const d = adm.getByRole("region", { name: "Offres douteuses" }).getByText(Y.nom);
  await voir(d);
  await d.scrollIntoViewIfNeeded();
});
await etape("Cas 4 : A voit son négoce, la meilleure offre", a, async () => {
  await a.goto(`${BASE}/achats-groupes/${besoinA}`, { waitUntil: "networkidle" });
  await voir(a.getByText("Offre reçue", { exact: true }));
  await a.getByRole("region", { name: "Les offres" }).scrollIntoViewIfNeeded();
  await voir(a.getByText("La meilleure offre du groupe"));
});
await etape("Cas 4 : Commander (bon de commande au négoce)", a, async () => {
  await a.getByRole("button", { name: `Commander chez ${X.nom}` }).click();
  await voir(a.getByText(`C'est commandé chez ${X.nom}.`, { exact: false }));
  const mx = await emailsVers(X.email, (m) => /^Bon de commande n° /.test(m.subject));
  verif(mx.some((m) => /^Bon de commande n° /.test(m.subject)), "pas de bon chez X");
  return mx.filter((m) => /^Bon de commande/.test(m.subject)).map((m) => `« ${m.subject} »`).join("");
});
await etape("Cas 4 : B (essai) voit la meilleure offre sans le nom", b, async () => {
  await b.goto(`${BASE}/achats-groupes/${besoinB}`, { waitUntil: "networkidle" });
  await voir(b.getByText("un négoce du secteur"));
  verif((await b.getByText(X.nom).count()) === 0, "nom du négoce visible pour B");
  await b.getByText("un négoce du secteur").scrollIntoViewIfNeeded();
});

const c = await nouveau("artisanC");
let besoinC = null;
await etape("Cas 5 : un achat sans réponse de négoce", c, async () => {
  await inscrire(c, C, `Toitures C ${APPAREIL}`, "Luc");
  await c.goto(`${BASE}/achats-groupes/lancer`, { waitUntil: "networkidle" });
  await c.getByLabel("Quel matériau ?").fill(REF_B.q);
  await c.getByRole("button", { name: REF_B.designation }).click();
  await lancer(c, { quantite: "400", commune: "22300 Lannion", negoce: Z, bouton: "Lancer l'achat groupé" });
  await c.getByRole("link", { name: "Voir mon achat groupé" }).click();
  await c.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  besoinC = c.url().split("/").pop();
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  await carteAdmin(REF_B.libelle, "en_collecte").getByRole("button", { name: "Clôturer maintenant (test)" }).click();
  await voir(adm.getByText("Clôturé"));
  await adm.reload({ waitUntil: "networkidle" });
  await carteAdmin(REF_B.libelle, "consultation").getByRole("button", { name: /Analyser les offres maintenant/ }).click();
  await voir(adm.getByText("Offres analysées."));
});
await etape("Cas 5 : « Pas assez de volume cette fois »", c, async () => {
  await c.goto(`${BASE}/achats-groupes/${besoinC}`, { waitUntil: "networkidle" });
  await voir(c.getByText("Pas assez de volume cette fois"));
});
await etape("Cas 5 : « Envoyer à mes négoces » en un clic", c, async () => {
  await c.getByRole("button", { name: "Envoyer à mes négoces" }).click();
  await voir(c.getByText(/Ta demande est partie chez tes négoces/), 60000);
  const mz = await emailsVers(Z.email, (m) => !/Demande de prix groupée/.test(m.subject) && /Toitures C/.test(`${m.from} ${m.subject} ${m.text}`));
  return `${mz.length} e-mail(s) chez Z`;
});
await etape("Profil : Mes prix, SIRET, alertes, essai", a, async () => {
  await a.goto(`${BASE}/compte`, { waitUntil: "networkidle" });
  await voir(a.getByRole("heading", { name: "Profil" }));
  await voir(a.getByText("SIRET vérifié"));
  await voir(a.getByRole("link", { name: "Mes prix" }));
});
await etape("Nettoyage : comptes supprimés", a, async () => {
  for (const p of [a, b, c, adm]) await supprimer(p);
});

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ base: BASE, appareil: APPAREIL, journal, anomalies }, null, 2));
console.log(`\n${journal.filter((j) => j.statut === "ok").length}/${journal.length} étapes ; ${anomalies.length} anomalie(s)`);
for (const x of anomalies.slice(0, 20)) console.log(`  ! ${x.qui} ${x.type} ${x.texte}`);
await browser.close();
