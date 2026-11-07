// LA RECETTE EN LIGNE DES ACHATS GROUPÉS V1 (Greg, 7 novembre 2026 : « la V1 doit être réellement accessible sur
// test.mobiiz.fr pour que je puisse la tester »). Sur test.mobiiz.fr seulement, avec des adresses de test Resend
// (`delivered+…@resend.dev`) : aucun vrai négoce, aucun paiement, aucun appel IA, aucune acceptation de commande.
// Vérifie : santé, /v1/ag/etat, accueil (actions écrites en toutes lettres, aucun « + » seul, aucun débordement),
// « Ajouter un matériau » (direct), une 2e entreprise qui rejoint sans diviser, l'isolation, modifier / reporter,
// reconfirmer depuis « À faire », l'offre saisie par l'admin jusqu'à « Offre à examiner », « Depuis un quantitatif »
// (liteaux à préciser, famille non ouverte), le blocage de la demande individuelle, le retrait. Comptes supprimés à la fin.
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

await etape("Accueil : achat individuel à part, quatre actions écrites, aucun « + » seul", a, async () => {
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const ind = a.getByRole("region", { name: "Achat individuel" });
  await voir(ind.getByRole("link", { name: /^Créer un quantitatif/ }));
  const grp = a.getByRole("region", { name: "Achats groupés" });
  for (const nom of [/^Ajouter un matériau en achat groupé/, /^Depuis un quantitatif/, /^Mes besoins groupés/]) await voir(grp.getByRole("link", { name: nom }));
  for (const l of await a.getByRole("link").all()) verif((await l.innerText()).trim() !== "+", "un lien « + » seul");
  for (const l of await a.getByRole("button").all()) verif((await l.innerText()).trim() !== "+", "un bouton « + » seul");
  const menu = a.getByRole("navigation", { name: "Navigation principale" });
  await voir(menu.getByRole("link", { name: "Achats groupés" }));
  await voir(menu.getByRole("link", { name: "Créer un quantitatif" }));
  verif((await a.getByText(/Achat en gros|collecte/i).count()) === 0, "« Achat en gros » ou « collecte » encore affiché");
  await sansDebordement(a, "accueil");
});

await etape("Achats groupés : les deux entrées visibles tout de suite", a, async () => {
  await a.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Achats groupés" }).click();
  await voir(a.getByRole("heading", { name: "Achats groupés" }));
  await voir(a.getByRole("link", { name: /^Ajouter un matériau/ }));
  await voir(a.getByRole("link", { name: /^Depuis un quantitatif/ }));
  await sansDebordement(a, "accueil des achats groupés");
});

await etape("« Ajouter un matériau » : produit précis, raison du bouton grisé, conditionnement confirmé", a, async () => {
  await a.getByRole("link", { name: /^Ajouter un matériau/ }).click();
  await voir(a.getByRole("heading", { name: "Choisis précisément le produit" }));
  await a.getByRole("button", { name: /Ardoise naturelle/ }).first().click();
  await a.getByLabel("Format").selectOption("32x22");
  await a.getByLabel("Origine").selectOption("espagne");
  await a.getByLabel("Choix").selectOption("1");
  await voir(a.getByText("Choisis toutes les caractéristiques pour continuer."));
  verif(await a.getByRole("button", { name: "Continuer" }).isDisabled(), "Continuer devrait être grisé");
  await a.getByLabel("Épaisseur").selectOption("5");
  await a.getByRole("button", { name: "Confirmer 480 pièces par palette" }).click();
  await a.getByRole("button", { name: "Continuer" }).click();
  await voir(a.getByRole("heading", { name: "Combien, où et pour quand ?" }));
  await sansDebordement(a, "produit");
});

await etape("Quantité, livraison, date ; aucun achat compatible : l'ouvrir ; entreprise ; confirmer", a, async () => {
  await a.getByLabel("Quantité (palettes)").fill("10");
  await voir(a.getByText("10 palettes = 4 800 pièces"));
  await a.getByText("Livraison sur chantier").click();
  await a.getByLabel("Lieu de livraison (privé)").fill("12 rue du Port, 22300 Lannion");
  await a.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(45));
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
  await b.getByRole("link", { name: /Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm/ }).first().click();
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
  await a.goto(`${BASE}/achats-groupes`, { waitUntil: "networkidle" });
  await a.getByRole("link", { name: /^Depuis un quantitatif/ }).click();
  await voir(a.getByRole("heading", { name: "Depuis un quantitatif" }));
  await a.goto(`${BASE}/achats-groupes/quantitatif/${projetQ}`, { waitUntil: "networkidle" });
  const liteaux = a.getByRole("listitem").filter({ has: a.getByText("Liteaux", { exact: true }) });
  await voir(liteaux.getByText("À préciser : section et essence manquantes"));
  verif(await liteaux.getByRole("checkbox").isDisabled(), "les liteaux sont cochables");
  await voir(a.getByText("Pas encore ouvert aux achats groupés"));
  await voir(a.getByText("Coche au moins une ligne compatible pour continuer."));
  await sansDebordement(a, "sélection depuis un quantitatif");
});

await etape("Depuis un quantitatif : deux lignes confirmées, chacune dans son achat groupé", a, async () => {
  await a.getByRole("button", { name: "Sélectionner les recommandations" }).click().catch(() => undefined);
  for (const nom of ["Gouttière", "Câble"]) {
    const li = a.getByRole("listitem").filter({ hasText: nom }).getByRole("checkbox");
    if ((await li.count()) && !(await li.first().isChecked())) await li.first().check();
  }
  await a.getByRole("button", { name: /^Continuer avec \d+ lignes?$/ }).click();
  await voir(a.getByRole("heading", { name: /^Confirmer mes? \d* ?besoins?$/ }));
  await a.getByText("Livraison sur chantier").click();
  await a.getByLabel("Lieu de livraison (privé)").fill("3 rue des Ajoncs, 22300 Lannion");
  await a.getByLabel("J'ai besoin de ces matériaux avant le").fill(jourDans(40));
  const conversions = a.getByRole("button", { name: /^Confirmer \d+ (pièces|m) par / });
  for (let i = 0; i < 4 && (await conversions.count()); i++) await conversions.first().click();
  await a.getByRole("checkbox", { name: /Je confirme qu'il s'agit de besoins réels|Je confirme que cette quantité/ }).check();
  await a.getByRole("button", { name: /^Confirmer mes? \d* ?besoins?$/ }).click();
  await a.waitForURL(/\/achats-groupes\/mes-besoins/, { timeout: 30000 });
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
