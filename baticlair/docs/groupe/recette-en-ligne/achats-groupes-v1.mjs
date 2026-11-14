// LA RECETTE EN LIGNE DES ACHATS GROUPÉS V1 (Greg, 7 novembre 2026 : « la V1 doit être réellement accessible sur
// test.mobiiz.fr pour que je puisse la tester »). Sur test.mobiiz.fr seulement, avec des adresses de test Resend
// (`delivered+…@resend.dev`) : aucun vrai négoce, aucun paiement, aucun appel IA, aucune acceptation de commande.
// Vérifie : santé, /v1/ag/etat, accueil (actions écrites en toutes lettres, aucun « + » seul, aucun débordement),
// « Ajouter un matériau » (direct), une 2e entreprise qui rejoint sans diviser, l'isolation, modifier / reporter,
// reconfirmer depuis « À faire », l'offre saisie par l'admin jusqu'à « Offre à examiner », « Depuis un quantitatif »
// (liteaux à préciser, famille non ouverte), le blocage de la demande individuelle, le retrait ; puis les MISSIONS (10 novembre
// 2026) : publier, répondre avec un document, cloche, conversation, non-lus, pièce jointe, coordonnées, isolation, compte.
// Comptes supprimés à la fin.
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/achats-groupes-v1.mjs <se|android|ordi> <dossier-captures> [décalage-jours]
import { chromium, devices } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , APPAREIL = "se", OUT = "./captures", DECALAGE = "0"] = process.argv;
const BASE = process.env.RECETTE_BASE ?? "https://test.mobiiz.fr";
const API = process.env.RECETTE_API ?? "https://api-test.mobiiz.fr";
mkdirSync(OUT, { recursive: true });
const options = APPAREIL === "se" ? { ...devices["iPhone SE"] } : APPAREIL === "android" ? { ...devices["Pixel 5"] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const browser = await chromium.launch();
const journal = [];
const anomalies = [];
let n = 0;
const ts = Date.now().toString(36);
const dec = Number(DECALAGE);
const t = (ms) => new Promise((r) => setTimeout(r, ms));
const jourDans = (j) => new Date(Date.now() + (j + dec) * 86_400_000).toISOString().slice(0, 10);
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

async function capture(page, nom) {
  const fichier = `${String(n).padStart(2, "0")}-${slug(nom)}.png`;
  try {
    await page.screenshot({ path: path.join(OUT, fichier), fullPage: false });
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
const sansDebordement = async (page, ou) => verif((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `débordement horizontal : ${ou}`);

function surveiller(page, qui) {
  page.on("pageerror", (e) => anomalies.push({ qui, url: page.url(), type: "exception", texte: String(e.message).slice(0, 300) }));
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 500) anomalies.push({ qui, url: page.url(), type: `http ${r.status()}`, texte: `${r.request().method()} ${u.slice(0, 160)}` });
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

async function inscrire(page, email, entreprise, adresse, prenom) {
  await page.goto(`${BASE}/inscription`, { waitUntil: "networkidle" });
  await page.getByLabel("Prénom et nom").fill(`${prenom} Recette`);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(`Recette-${ts}-solide`);
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await voir(page.getByRole("button", { name: "C'est compris" }), 60000);
  await page.getByRole("button", { name: "C'est compris" }).click();
  await voir(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }), 30000);
  const p = await api(page, "PATCH", "/v1/company/profile", { name: entreprise, address: adresse, siret: "73282932000074", phone: null, email: null });
  verif(p.status === 200, `profil ${p.status}`);
  const s = await api(page, "POST", "/v1/groupe/siret");
  verif(s.status === 200, `SIRET ${s.status} ${JSON.stringify(s.body)}`);
}
async function confirmerEmail(page, email) {
  const mails = await emailsVers(email, (m) => m.subject === "Confirme ton adresse e-mail");
  const mail = mails.filter((m) => m.subject === "Confirme ton adresse e-mail").at(-1);
  verif(mail, `pas d'e-mail de confirmation pour ${email}`);
  const lien = /https?:\/\/\S+/.exec(mail.text ?? "")?.[0];
  verif(lien, "lien de confirmation absent");
  const onglet = await page.context().newPage();
  await onglet.goto(lien, { waitUntil: "networkidle" });
  await onglet.close();
}
async function supprimer(page) {
  await page.goto(`${BASE}/compte`, { waitUntil: "networkidle" });
  const b = page.getByRole("button", { name: "Supprimer mon compte" });
  if (!(await b.count())) await page.goto(`${BASE}/compte/donnees`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: /Supprimer définitivement|Supprimer mon compte/ }).last().click();
  await page.waitForURL((u) => !/\/compte/.test(u.pathname), { timeout: 30000 });
}

const A = `delivered+agv1-a-${APPAREIL}-${ts}@resend.dev`;
const B = `delivered+agv1-b-${APPAREIL}-${ts}@resend.dev`;
const ADMIN = "delivered+admin-recette@resend.dev";
const NOM_A = `Toitures A ${ts}`;
const NOM_B = `Couverture B ${ts}`;
const nouveau = async (qui) => surveiller(await (await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" })).newPage(), `${qui}-${APPAREIL}`);
const a = await nouveau("A");
const b = await nouveau("B");
const adm = await nouveau("admin");
let besoinA = null;
let achatId = null;

await etape("Santé de l'API, /v1/ag/etat sans session", a, async () => {
  const h = JSON.parse(execFileSync("curl", ["-sS", `${API}/v1/health`], { encoding: "utf8" }));
  const e = execFileSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code}", `${API}/v1/ag/etat`], { encoding: "utf8" });
  verif(h.status === "ok" || h.ok === true || h.database === "ok" || /ok/i.test(JSON.stringify(h)), `health ${JSON.stringify(h).slice(0, 120)}`);
  verif(e === "401", `/v1/ag/etat sans session : ${e} (attendu 401 : réglage allumé, connexion exigée)`);
  return `health ok, /v1/ag/etat sans session ${e}`;
});

await etape("Entreprise A : compte, SIRET, e-mail confirmé ; /v1/ag/etat 200", a, async () => {
  await inscrire(a, A, NOM_A, "3 rue des Ajoncs, 22300 Lannion", "Alain");
  await confirmerEmail(a, A);
  const e = await api(a, "GET", "/v1/ag/etat");
  verif(e.status === 200 && e.body?.actif === true, `/v1/ag/etat ${e.status}`);
  verif(e.body.zone?.code === "22", `zone ${JSON.stringify(e.body.zone)}`);
  return `zone ${e.body.zone.nom} (${e.body.zone.code}), e-mail vérifié : ${e.body.verification.emailVerifie}`;
});

await etape("Accueil : trois activités (quantitatif, achats groupés, missions), « À faire » ; quatre onglets", a, async () => {
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const main = a.getByRole("main");
  for (const carte of [/^Créer un quantitatif/, /^Voir les achats groupés/, /^Missions entre entreprises/]) await voir(main.getByRole("link", { name: carte }).first());
  verif((await main.getByRole("link", { name: /^Ajouter un matériau|^Depuis un quantitatif|^Mes besoins groupés/ }).count()) === 0, "l'accueil propose encore plusieurs chemins vers les achats groupés");
  for (const l of await a.getByRole("link").all()) verif((await l.innerText()).trim() !== "+", "un lien « + » seul");
  for (const l of await a.getByRole("button").all()) verif((await l.innerText()).trim() !== "+", "un bouton « + » seul");
  const menu = a.getByRole("navigation", { name: "Navigation principale" });
  for (const onglet of ["Accueil", "Quantitatifs", "Achats groupés", "Missions"]) await voir(menu.getByRole("link", { name: onglet, exact: true }));
  if (APPAREIL === "ordi") await voir(menu.getByRole("link", { name: "Créer un quantitatif" }));
  else verif((await menu.getByRole("link", { name: "Créer un quantitatif" }).count()) === 0, "un bouton de création dans la barre du bas");
  verif((await a.getByText(/Achat en gros|collecte/i).count()) === 0, "« Achat en gros » ou « collecte » encore affiché");
  await sansDebordement(a, "accueil");
});

await etape("Onglet Achats groupés : « Mes besoins » puis « Achats ouverts » ; les autres entrées derrière un lien discret", a, async () => {
  await a.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Achats groupés" }).click();
  await voir(a.getByRole("heading", { name: "Mes besoins", exact: true }));
  await voir(a.getByRole("heading", { name: "Achats ouverts", exact: true }));
  await voir(a.getByRole("combobox", { name: "Filtrer par métier" }));
  await a.getByRole("button", { name: "Ajouter un matériau sans quantitatif" }).click();
  const ajout = a.getByRole("dialog", { name: "Ajouter un matériau" });
  for (const nom of [/^Parler à Mobiiz/, /^Depuis un quantitatif/]) await voir(ajout.getByRole("link", { name: nom }));
  verif((await ajout.getByRole("link").count()) === 2, "le catalogue est encore proposé");
  await sansDebordement(a, "onglet des achats groupés");
});

await etape("« Ajouter un matériau » avec Mobiiz : une phrase de comptoir, question suivante, besoin prérempli", a, async () => {
  await a.getByRole("dialog", { name: "Ajouter un matériau" }).getByRole("link", { name: /^Parler à Mobiiz/ }).click();
  const chat = a.getByRole("dialog", { name: "Ajouter un matériau en achat groupé" });
  await voir(chat.getByText(/Quel matériau veux-tu acheter en groupe/));
  await chat.getByRole("group", { name: "Réponses rapides" }).getByRole("button", { name: "Ardoise naturelle" }).click();
  await voir(chat.getByText("Ardoise naturelle : c'est noté. Format ?"));
  const [an, m, j] = jourDans(45).split("-");
  await chat.getByRole("textbox", { name: "Ton message" }).fill(`32 22 Espagne 1er choix 5 mm, 10 palettes livrées sur chantier pour le ${j}/${m}/${an}`);
  await chat.getByRole("button", { name: "Envoyer le message" }).click();
  await voir(chat.getByText(/^C'est complet : Ardoise naturelle · 32 × 22 · Espagne · 1er choix · 5 mm, 10 palettes, livraison sur chantier/));
  await sansDebordement(a, "conversation");
  await chat.getByRole("button", { name: "Continuer : vérifier et confirmer" }).click();
  await voir(a.getByRole("heading", { name: "Choisis précisément le produit" }));
  await a.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByRole("heading", { name: "Combien, où et pour quand ?" }));
  verif((await a.getByLabel("Quantité (palettes)").inputValue()) === "10", "quantité non préremplie");
});

await etape("Lieu privé ; aucun achat compatible : l'ouvrir ; entreprise ; confirmer", a, async () => {
  await voir(a.getByText("10 palettes = 4 800 pièces"));
  await a.getByLabel("Lieu de livraison (privé)").fill("12 rue du Port, 22300 Lannion");
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByRole("heading", { name: /Aucun achat groupé compatible|Un achat groupé correspond/ }), 30000);
  if (await a.getByRole("button", { name: "Ouvrir cet achat groupé" }).count()) await a.getByRole("button", { name: "Ouvrir cet achat groupé" }).click();
  else await a.getByRole("button", { name: "Rejoindre cet achat groupé" }).click();
  await voir(a.getByRole("heading", { name: "Ton entreprise" }));
  await a.getByText("Dirigeant", { exact: true }).click();
  await a.getByRole("button", { name: "Enregistrer" }).click();
  await voir(a.getByText("Tu as déclaré être : Dirigeant."));
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByText("Coche la case pour confirmer."));
  await a.getByRole("checkbox", { name: /Je confirme que cette quantité correspond à un besoin réel/ }).check();
  await a.getByRole("button", { name: "Confirmer mon besoin" }).click();
  await a.waitForURL(/\/achats-groupes\/besoins\/[0-9a-f-]{36}/, { timeout: 30000 });
  await voir(a.getByText("Besoin confirmé", { exact: true }));
  besoinA = a.url().split("?")[0];
  const id = besoinA.split("/").at(-1);
  const r = await api(a, "GET", `/v1/ag/besoins/${id}`);
  achatId = r.body?.achat?.id ?? r.body?.besoin?.achat?.id;
  verif(achatId, `achat introuvable : ${JSON.stringify(r.body).slice(0, 160)}`);
  return `besoin ${id}, achat n° ${r.body?.achat?.numero ?? r.body?.besoin?.achat?.numero}`;
});

await etape("Entreprise B : rejoint le même achat (« identique », pas de 2e achat)", b, async () => {
  await inscrire(b, B, NOM_B, "8 quai Morand, 22500 Paimpol", "Bruno");
  await confirmerEmail(b, B);
  await b.goto(`${BASE}/achats-groupes`, { waitUntil: "networkidle" });
  // La base de test garde les achats des recettes passées : on filtre sur le métier, comme un artisan.
  await b.getByRole("combobox", { name: "Filtrer par métier" }).selectOption({ label: "Couverture" });
  await b.waitForLoadState("networkidle");
  // Greg, 8 novembre 2026 : 5 achats visibles, les autres derrière « Voir les N autres achats ouverts ».
  const autres = b.getByRole("button", { name: /^Voir les \d+ autres achats ouverts$/ });
  if (await autres.count()) await autres.click();
  await b.getByRole("link", { name: /Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm/ }).first().click();
  // Le produit d'un achat ouvert par d'autres se rejoint sans se modifier.
  await voir(b.getByRole("heading", { name: "Ajoute ta quantité" }));
  verif((await b.getByRole("combobox").count()) === 0, "le produit d'un achat ouvert reste modifiable");
  await b.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await b.getByRole("button", { name: "Continuer" }).click();
  await b.getByLabel("Quantité (palettes)").fill("4");
  await b.getByText("Livraison sur chantier").click();
  await b.getByLabel("Lieu de livraison (privé)").fill("Paimpol");
  await b.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(47));
  await b.getByRole("button", { name: "Continuer" }).click();
  await voir(b.getByRole("heading", { name: "Un achat groupé correspond" }), 30000);
  verif((await b.getByText(NOM_A).count()) === 0, "le nom de A est visible chez B");
  verif((await b.getByText("Lannion").count()) === 0, "l'adresse de A est visible chez B");
  await b.getByRole("button", { name: "Rejoindre cet achat groupé" }).click();
  await b.getByText("Dirigeant", { exact: true }).click();
  await b.getByRole("button", { name: "Enregistrer" }).click();
  await b.getByRole("button", { name: "Continuer" }).click();
  await b.getByRole("checkbox", { name: /Je confirme que cette quantité/ }).check();
  await b.getByRole("button", { name: "Confirmer mon besoin" }).click();
  await voir(b.getByText("Besoin confirmé", { exact: true }), 30000);
  const id = b.url().split("?")[0].split("/").at(-1);
  const r = await api(b, "GET", `/v1/ag/besoins/${id}`);
  const achatB = r.body?.achat?.id ?? r.body?.besoin?.achat?.id;
  verif(achatB === achatId, `B est dans un autre achat (${achatB} ≠ ${achatId})`);
  return "même achat groupé, aucune division";
});

await etape("Isolation : B ne lit ni le besoin de A, ni ses données", b, async () => {
  const id = besoinA.split("/").at(-1);
  const r = await api(b, "GET", `/v1/ag/besoins/${id}`);
  verif(r.status === 404, `B lit le besoin de A : ${r.status}`);
  const m = await api(b, "POST", `/v1/ag/besoins/${id}/quantite`, { quantite: 1 });
  verif([400, 404].includes(m.status), `B modifie le besoin de A : ${m.status}`);
  const liste = JSON.stringify((await api(b, "GET", "/v1/ag/achats")).body);
  verif(!liste.includes(NOM_A) && !liste.includes("12 rue du Port"), "nom ou adresse de A dans la liste des achats");
  return `GET ${r.status}, modification ${m.status}`;
});

await etape("A modifie la quantité puis reporte : le besoin reste confirmé", a, async () => {
  await a.goto(besoinA, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Retirer ou modifier" }).click();
  await a.getByText("Quantité modifiée").click();
  await a.getByLabel(/Nouvelle quantité/).fill("12");
  await a.getByRole("button", { name: "Mettre à jour ma quantité" }).click();
  await voir(a.getByText("Quantité mise à jour. Ton besoin reste dans l'achat groupé."));
  await a.getByRole("button", { name: "Retirer ou modifier" }).click();
  await a.getByText("Chantier reporté").click();
  await a.getByLabel("Nouvelle date de besoin").fill(jourDans(48));
  await a.getByRole("button", { name: "Mettre à jour la date" }).click();
  await voir(a.getByText("Date mise à jour. Ton besoin reste dans l'achat groupé."));
  await voir(a.getByText("Besoin confirmé", { exact: true }));
});

await etape("Admin : code de pilotage, préparation de la consultation (72 h)", adm, async () => {
  await inscrire(adm, ADMIN, `Mobiiz Admin ${ts}`, "3 rue des Ajoncs, 22300 Lannion", "Admin");
  const depuis = Date.now();
  const c = await api(adm, "POST", "/v1/admin/pilotage/code");
  verif(c.status < 300, `code ${c.status}`);
  const mails = await emailsVers(ADMIN, (m) => /code d'accès/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000);
  const mail = mails.filter((m) => /code d'accès/.test(m.subject)).at(-1);
  verif(mail, "pas de code");
  const v = await api(adm, "POST", "/v1/admin/pilotage/code/verifier", { code: /(\d{6})/.exec(mail.text)[1] });
  verif(v.status === 200, `vérification ${v.status}`);
  const p = await api(adm, "POST", `/v1/admin/ag/achats/${achatId}/preparation`, { heures: 72 });
  verif(p.status === 200, `préparation ${p.status} ${JSON.stringify(p.body).slice(0, 120)}`);
  await adm.goto(`${BASE}/admin/achats-groupes-v1`, { waitUntil: "networkidle" });
});

await etape("A : « À faire » montre la reconfirmation ; A reconfirme", a, async () => {
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await voir(a.getByText(/Reconfirme ta quantité/), 30000);
  await a.goto(`${BASE}/achats-groupes/mes-besoins`, { waitUntil: "networkidle" });
  await a.getByRole("link", { name: "Reconfirmer ma quantité" }).first().click();
  await a.getByRole("button", { name: "Reconfirmer ma quantité" }).click();
  await voir(a.getByText("Quantité reconfirmée.", { exact: true }));
});

await etape("Admin : clôture de test, offre incomplète puis complète ; A : « Offre à examiner », bouton final grisé", a, async () => {
  const c = await api(adm, "POST", `/v1/admin/ag/achats/${achatId}/cloture`, { avantLHeure: true });
  verif(c.status === 200, `clôture ${c.status} ${JSON.stringify(c.body).slice(0, 160)}`);
  const offre = { fournisseur: "Négoce de test", prixUnitaireHt: 0.98, livraisonHt: 45, delai: "10 jours ouvrés", lieu: "Livraison sur chantier", paiement: "30 jours fin de mois", validite: "72 heures", annulation: null };
  verif((await api(adm, "PUT", `/v1/admin/ag/achats/${achatId}/offre`, offre)).status === 200, "offre incomplète");
  await a.goto(besoinA, { waitUntil: "networkidle" });
  await voir(a.getByText(/Offre reçue — vérification en cours/));
  verif((await api(adm, "PUT", `/v1/admin/ag/achats/${achatId}/offre`, { ...offre, annulation: "Sans frais jusqu'à 48 h avant la livraison" })).status === 200, "offre complète");
  await a.reload({ waitUntil: "networkidle" });
  await voir(a.getByRole("heading", { name: "Offre à examiner" }));
  await voir(a.getByText("5 760 × 0,98 € = 5 644,80 €"));
  verif(await a.getByRole("button", { name: "[bouton final : texte à fixer]" }).isDisabled(), "le bouton final est actif");
  await b.goto(`${BASE}/achats-groupes/mes-besoins`, { waitUntil: "networkidle" });
  await voir(b.getByText("Besoin indicatif"));
  return "B (non reconfirmé) : besoin indicatif";
});

let projetQ = null;
await etape("« Depuis un quantitatif » : liteaux à préciser, famille non ouverte, aucune ligne cachée", a, async () => {
  const q = await api(a, "POST", "/v1/quantitatifs", {
    lignes: [
      { libelle: "Gouttière zinc dév. 33", quantite: "40", unite: "m" },
      { libelle: "Liteaux", quantite: "300", unite: "m" },
      { libelle: "Câble R2V 3G2,5", quantite: "6", unite: "couronnes" },
      { libelle: "Parpaing creux 20x20x50", quantite: "200", unite: "u" },
    ],
  });
  verif(q.status === 201, `quantitatif ${q.status}`);
  let courant = (await api(a, "GET", `/v1/quantitatifs/${q.body.id}`)).body;
  for (let i = 0; i < 15 && courant.questions?.length > 0; i++) {
    const question = courant.questions[0];
    courant = (await api(a, "POST", `/v1/quantitatifs/${q.body.id}/reponses`, { reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  verif((await api(a, "POST", `/v1/quantitatifs/${q.body.id}/validation`)).status === 200, "validation");
  projetQ = q.body.projetId;
  // Le parcours principal : la fiche du quantitatif, « Ajouter aux achats groupés ».
  await a.goto(`${BASE}/chantiers/${projetQ}`, { waitUntil: "networkidle" });
  await a.getByRole("region", { name: "Achats groupés" }).getByRole("link", { name: "Ajouter aux achats groupés" }).click();
  await voir(a.getByRole("heading", { name: "Quels articles grouper ?" }));
  const liteaux = a.getByRole("listitem").filter({ has: a.getByText("Liteaux", { exact: true }) });
  await voir(liteaux.getByText("À préciser : section et essence manquantes"));
  verif(await liteaux.getByRole("checkbox").isDisabled(), "les liteaux sont cochables");
  await a.getByText(/ne peu(t|vent) pas être groupés?$/).click();
  await voir(a.getByRole("list", { name: "Articles qui ne peuvent pas être groupés" }).getByText(/Pas encore proposé en achat groupé/));
  await voir(a.getByText("Coche au moins un article pour continuer."));
  await sansDebordement(a, "sélection depuis un quantitatif");
});

await etape("Depuis un quantitatif : deux lignes confirmées, chacune dans son achat groupé", a, async () => {
  await a.getByRole("button", { name: "Cocher les articles conseillés" }).click().catch(() => undefined);
  for (const nom of ["Gouttière", "Câble"]) {
    const li = a.getByRole("listitem").filter({ hasText: nom }).getByRole("checkbox");
    if ((await li.count()) && !(await li.first().isChecked())) await li.first().check();
  }
  await a.getByRole("button", { name: /^Continuer avec \d+ articles?$/ }).click();
  await voir(a.getByRole("heading", { name: "Vérifie et valide" }));
  await a.getByText("Livraison sur chantier").click();
  await a.getByLabel("Lieu de livraison (privé)").fill("3 rue des Ajoncs, 22300 Lannion");
  await a.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(40));
  const conversions = a.getByRole("button", { name: /^Confirmer \d+ (pièces|m) par / });
  for (let i = 0; i < 4 && (await conversions.count()); i++) await conversions.first().click();
  await a.getByRole("checkbox", { name: /Je confirme qu'il s'agit de besoins réels|Je confirme que cette quantité/ }).check();
  await a.getByRole("button", { name: /^Valider( mes \d+ articles)?$/ }).click();
  await a.waitForURL(/\/achats-groupes\?ajoutes=\d+/, { timeout: 30000 });
  await voir(a.getByText(/^C'est fait/));
  const lignes = await api(a, "GET", `/v1/ag/projects/${projetQ}/lignes`);
  const groupees = (lignes.body?.lignes ?? []).filter((l) => l.texte === "Déjà dans un achat groupé").length;
  verif(groupees >= 1, `aucune ligne marquée « Déjà dans un achat groupé » (${JSON.stringify(lignes.body).slice(0, 160)})`);
  return `${groupees} ligne(s) dans un achat groupé`;
});

await etape("Une ligne, un seul circuit : la demande individuelle est refusée en nommant les lignes", a, async () => {
  const s = await api(a, "POST", "/v1/suppliers", { name: `Négoce test ${ts}`, email: `delivered+agv1-negoce-${APPAREIL}-${ts}@resend.dev` });
  verif(s.status === 201, `négoce ${s.status}`);
  const r = await api(a, "POST", `/v1/projects/${projetQ}/price-requests`, { supplierIds: [s.body.id] });
  verif(r.status === 409, `demande individuelle acceptée : ${r.status}`);
  return `409 : ${JSON.stringify(r.body?.message ?? r.body).slice(0, 140)}`;
});

await etape("Retrait : « Garder mon besoin » d'abord, puis « Confirmer le retrait »", a, async () => {
  await a.goto(besoinA, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Retirer ou modifier" }).click();
  await a.getByText("Besoin annulé").click();
  await voir(a.getByRole("button", { name: "Garder mon besoin" }));
  await a.getByRole("button", { name: "Confirmer le retrait" }).click();
  await voir(a.getByText(/Besoin retiré/));
});

// ---------------------------------------------------------------------------------------------------------------------
// MISSIONS ENTRE ENTREPRISES, « MESSAGES ET RÉPONSES », CLOCHE, COMPTE (Greg, 10 novembre 2026, prompt maître). Les deux
// entreprises de la recette (A publie, B répond) et le compte admin comme troisième partie : aucun vrai négoce, aucun
// e-mail hors des adresses de test.
const PDF_TEST = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n"), Buffer.alloc(300, 0x20), Buffer.from("\n%%EOF")]);
const VILLE = `Recette${ts.slice(-5)}`;
let missionId = null;
let convId = null;
await etape("Missions : réglage allumé, quatrième onglet, accueil des missions", a, async () => {
  const sante = await api(a, "GET", "/v1/health");
  verif(sante.body?.features?.missions === true, "le réglage MISSIONS_V1 n'est pas allumé sur cette prévisualisation");
  await a.goto(`${BASE}/missions`, { waitUntil: "networkidle" });
  await voir(a.getByRole("heading", { name: "Missions", exact: true }));
  await voir(a.getByText("Mise en relation entre entreprises du bâtiment."));
  await sansDebordement(a, "missions");
});
await etape("A publie une mission (trois étapes, aperçu) : conditions dites indicatives", a, async () => {
  await a.getByRole("link", { name: /^Je propose une mission/ }).click();
  await voir(a.getByRole("heading", { name: "De quelle aide as-tu besoin ?" }));
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByText("Choisis le métier recherché."));
  await a.getByLabel("Métier recherché").fill("Couverture - Toiture");
  await a.getByLabel("Lieu de la mission (commune)").fill(VILLE);
  await a.getByLabel("Code postal").fill("22580");
  await a.getByLabel("Du", { exact: true }).fill(jourDans(10));
  await a.getByLabel("Au", { exact: true }).fill(jourDans(12));
  await a.getByRole("button", { name: "Renfort ponctuel" }).click();
  await a.getByLabel("Description").fill("Recette : pose d'ardoises naturelles sur une maison individuelle.");
  await sansDebordement(a, "proposer une mission");
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByRole("heading", { name: "Précise le profil attendu" }));
  await a.getByLabel("Niveau souhaité").selectOption("autonome");
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByRole("heading", { name: "Informations proposées" }));
  await a.getByLabel("Mode de chiffrage proposé").selectOption("jour");
  await a.getByLabel(/^Budget indicatif, de/).fill("400");
  await a.getByLabel("à (€ HT)").fill("500");
  await voir(a.getByText("Mobiiz ne contractualise pas la mission."));
  await a.getByRole("button", { name: "Continuer vers l'aperçu" }).click();
  await voir(a.getByRole("region", { name: "Aperçu" }).getByText("400 à 500 € HT / jour"));
  await a.getByRole("button", { name: "Publier ma mission" }).click();
  await a.waitForURL(/\/missions\/[0-9a-f-]{36}$/, { timeout: 30000 });
  missionId = a.url().split("/").pop();
  await voir(a.getByRole("heading", { name: `Couverture - Toiture à ${VILLE}` }));
  await sansDebordement(a, "ma mission");
  return `mission ${missionId}`;
});
await etape("B : dossier professionnel (un fichier faux est refusé, un PDF est gardé), puis réponse à la mission", b, async () => {
  await b.goto(`${BASE}/compte/documents`, { waitUntil: "networkidle" });
  await voir(b.getByRole("heading", { name: "Ton dossier professionnel" }));
  await b.getByLabel("Ajouter : assurances").setInputFiles({ name: "faux.pdf", mimeType: "application/pdf", buffer: Buffer.from("ceci n'est pas un PDF") });
  await voir(b.getByRole("alert").filter({ hasText: "Format refusé" }));
  await b.getByLabel("Ajouter : cv ou dossier professionnel").setInputFiles({ name: "CV-recette.pdf", mimeType: "application/pdf", buffer: PDF_TEST });
  await voir(b.getByRole("list", { name: "Documents" }).getByText("CV-recette.pdf"));
  await sansDebordement(b, "documents et qualifications");
  await b.goto(`${BASE}/missions/${missionId}`, { waitUntil: "networkidle" });
  await voir(b.getByText(NOM_A));
  await b.getByRole("link", { name: "Contacter cette entreprise" }).click();
  await b.getByLabel(/^Ton niveau sur cette mission/).selectOption("confirme");
  await b.getByLabel("Expérience correspondante (années)").fill("8");
  await b.getByLabel("Équipe disponible (personnes)").fill("2");
  await b.getByRole("checkbox", { name: /CV-recette\.pdf/ }).check();
  await b.getByRole("button", { name: "Continuer" }).click();
  await b.getByLabel("Tarif proposé (€ HT / jour)").fill("420");
  await b.getByLabel("Message à l'entreprise").fill("Recette : équipe autonome, disponible les trois jours.");
  await voir(b.getByText("Aucun contrat n'est créé par Mobiiz."));
  await sansDebordement(b, "ma proposition");
  await b.getByRole("button", { name: "Envoyer ma proposition" }).click();
  await voir(b.getByRole("heading", { name: "Réponse envoyée" }));
  await voir(b.getByText("Tes coordonnées restent privées."));
});
await etape("A : la cloche porte une alerte courte ; réponses reçues, profil déclaré, document partagé, conversation ouverte", a, async () => {
  await a.goto(`${BASE}/notifications`, { waitUntil: "networkidle" });
  const alerte = a.getByRole("list", { name: "Notifications" }).getByRole("link", { name: /Nouvelle réponse à ta mission/ }).first();
  await voir(alerte);
  verif(!(await alerte.innerText()).includes("équipe autonome"), "la cloche montre le texte de la réponse");
  await sansDebordement(a, "notifications");
  await alerte.click();
  await voir(a.getByRole("heading", { name: "1 entreprise a répondu" }));
  await a.getByRole("list", { name: "Réponses reçues" }).getByRole("link").first().click();
  await voir(a.getByText("Informations déclarées par l'entreprise."));
  await voir(a.getByRole("region", { name: "Documents partagés" }).getByText("CV-recette.pdf"));
  await sansDebordement(a, "profil de l'entreprise");
  await a.getByRole("button", { name: "Démarrer une conversation" }).click();
  await a.waitForURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 30000 });
  convId = a.url().split("/").pop();
  await a.getByLabel("Écrire un message").fill("Bonjour, la mission est toujours disponible. Appelez-moi au 06 12 34 56 78.");
  await a.getByRole("button", { name: "Envoyer le message" }).click();
  await voir(a.getByRole("list", { name: "Messages" }).getByText("la mission est toujours disponible"));
  return `conversation ${convId}`;
});
await etape("B : « Messages et réponses » (non lu, filtres), numéro masqué, réponse, pièce jointe refusée puis acceptée", b, async () => {
  await b.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  const filtres = b.getByRole("group", { name: "Filtrer la boîte" });
  for (const f of ["Tous", "Missions", "Négoces", "Non lus"]) await voir(filtres.getByRole("button", { name: f, exact: true }));
  const element = b.getByRole("link", { name: new RegExp(`^Mission, ${NOM_A}, non lu`) });
  await voir(element);
  await sansDebordement(b, "messages et réponses");
  await filtres.getByRole("button", { name: "Non lus", exact: true }).click();
  await element.click();
  const messages = b.getByRole("list", { name: "Messages" });
  await voir(messages.getByText(/coordonnées masquées/));
  verif(!(await messages.innerText()).includes("06 12 34 56 78"), "le numéro est visible avant l'accord des deux entreprises");
  await b.getByLabel("Écrire un message").fill("Bonjour. Nous sommes disponibles.");
  await b.getByRole("button", { name: "Envoyer le message" }).click();
  await voir(messages.getByText("Nous sommes disponibles."));
  await b.getByLabel(/^Joindre un fichier/).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await voir(b.getByRole("alert").filter({ hasText: "Format refusé" }));
  await b.getByLabel(/^Joindre un fichier/).setInputFiles({ name: "references.pdf", mimeType: "application/pdf", buffer: PDF_TEST });
  await voir(messages.getByRole("button", { name: /references\.pdf/ }));
  await sansDebordement(b, "conversation");
  await b.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  await voir(b.getByRole("link", { name: new RegExp(`^Mission, ${NOM_A}$`) }));
});
await etape("Coordonnées : B propose, rien n'est montré ; A accepte, les deux les voient", b, async () => {
  await b.goto(`${BASE}/messages/${convId}`, { waitUntil: "networkidle" });
  await b.getByRole("button", { name: "Proposer l'échange des coordonnées" }).click();
  verif(await b.getByRole("button", { name: "Proposer le partage" }).isDisabled(), "le partage se propose sans cocher l'accord");
  await b.getByRole("checkbox", { name: /J'accepte de partager mes coordonnées/ }).check();
  await sansDebordement(b, "échange des coordonnées");
  await b.getByRole("button", { name: "Proposer le partage" }).click();
  await voir(b.getByText("En attente de l'accord de l'autre entreprise."));
  verif((await b.getByRole("region", { name: "Coordonnées partagées" }).count()) === 0, "coordonnées montrées après un seul accord");
  await a.goto(`${BASE}/messages/${convId}`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Répondre à la proposition d'échange" }).click();
  await a.getByRole("checkbox", { name: /J'accepte de partager mes coordonnées/ }).check();
  await a.getByRole("button", { name: "Accepter le partage" }).click();
  await voir(a.getByRole("region", { name: "Coordonnées partagées" }));
  await b.reload({ waitUntil: "networkidle" });
  await voir(b.getByRole("region", { name: "Coordonnées partagées" }).getByText(NOM_A));
});
await etape("Isolation : un troisième compte ne lit ni n'écrit rien de la conversation, des réponses, du document", adm, async () => {
  const essais = [
    ["GET", `/v1/missions/conversations/${convId}`],
    ["POST", `/v1/missions/conversations/${convId}/messages`, { texte: "Je m'invite", cle: `cle-recette-intrus-${ts}` }],
    ["GET", `/v1/missions/annonces/${missionId}/reponses`],
    ["POST", `/v1/missions/annonces/${missionId}/statut`, { action: "fermer" }],
  ];
  const statuts = [];
  for (const [m, u, corps] of essais) {
    const r = await api(adm, m, u, corps);
    statuts.push(r.status);
    verif(r.status === 404 || r.status === 403 || r.status === 401, `${m} ${u} accepté pour un tiers : ${r.status}`);
    verif(!JSON.stringify(r.body ?? "").includes("toujours disponible"), "un message d'une autre entreprise a fui");
  }
  const vue = await api(a, "GET", `/v1/missions/conversations/${convId}`);
  verif(vue.status === 200 && vue.body.messages.every((m) => m.texte !== "Je m'invite"), "le message d'un tiers a été écrit");
  return `refus : ${statuts.join(", ")}`;
});
await etape("Compte : menu sans administration pour un artisan, « Profil et paramètres », un réglage de notification gardé", a, async () => {
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Mon menu" }).click();
  const menu = a.getByRole("menu", { name: "Mon menu" });
  for (const l of ["Profil et paramètres", "Mon entreprise", "Documents et qualifications", "Mes négoces", "Messages et réponses", "Abonnement, factures et reçus", "Aide, guide et démonstration"]) await voir(menu.getByRole("menuitem", { name: l, exact: true }));
  verif((await menu.getByRole("menuitem", { name: /Espace administration/ }).count()) === 0, "l'administration est visible d'un artisan");
  const refus = await api(a, "GET", "/v1/admin/missions/signalements");
  verif(refus.status === 403, `route admin ouverte à un artisan : ${refus.status}`);
  await sansDebordement(a, "menu du compte");
  await menu.getByRole("menuitem", { name: "Profil et paramètres", exact: true }).click();
  for (const g of ["Entreprise", "Préférences", "Compte et services", "Données et aide"]) await voir(a.getByRole("region", { name: g, exact: true }));
  await sansDebordement(a, "profil et paramètres");
  await a.goto(`${BASE}/compte/notifications`, { waitUntil: "networkidle" });
  const conseils = a.getByRole("switch", { name: "Conseils Mobiiz" });
  await voir(conseils);
  verif((await conseils.getAttribute("aria-checked")) === "false", "« Conseils Mobiiz » allumé par défaut");
  await conseils.click();
  await a.reload({ waitUntil: "networkidle" });
  verif((await a.getByRole("switch", { name: "Conseils Mobiiz" }).getAttribute("aria-checked")) === "true", "le réglage n'est pas gardé");
  verif((await a.getByRole("switch", { name: "Demandes de prix" }).getAttribute("aria-checked")) === "true", "un autre réglage a bougé");
  await sansDebordement(a, "notifications");
});

if (process.env.GARDER !== "1")
  await etape("Nettoyage : comptes de test supprimés", a, async () => {
    for (const p of [a, b, adm]) await supprimer(p).catch((e) => anomalies.push({ qui: "nettoyage", type: "suppression", texte: String(e.message).slice(0, 160) }));
  });

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ appareil: APPAREIL, journal, anomalies }, null, 2));
const ko = journal.filter((j) => j.statut !== "ok");
console.log(`\n${journal.length - ko.length}/${journal.length} étapes ok ; ${anomalies.length} anomalie(s)`);
for (const x of anomalies) console.log(`  · ${x.qui} ${x.type} ${x.texte}`);
await browser.close();
process.exit(ko.length ? 1 : 0);
