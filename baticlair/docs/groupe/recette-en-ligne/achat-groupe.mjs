// LA RECETTE EN LIGNE DE L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message), sur test.mobiiz.fr, les six cas
// de la méthode : 1. compte vide ; 2. liste depuis un devis (vraie lecture), suggestion puis « Tout cocher » ; 3. un 2e
// couvreur alerté qui ajoute sa liste avec la case d'engagement ; 4. validation admin, une offre incomplète et une offre
// PDF douteuse ; 5. publication, un artisan sans compte chez le gagnant (« transmettre mes coordonnées ») ; 6. sortie pour
// chantier annulé. L'admin de test (`delivered+admin-recette@resend.dev`) clôture et analyse tout de suite (geste réservé
// à la prévisualisation). Négoces : adresses de test Resend (aucun vrai négoce). Rien en production. Les deux passes se jouent
// l'une après l'autre dans le 22, seule zone ouverte. Les comptes sont supprimés à la fin.
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/achat-groupe.mjs <se|ordi> <dossier-captures>
//   SANS_IA=1 : quand l'IA de la prévisualisation est indisponible (crédit épuisé), la liste est notée à la main
//   (« Je la note moi-même ») et Y répond ligne par ligne au lieu du PDF ; la lecture IA reste couverte par l'e2e.
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

async function inscrire(page, email, entreprise, adresse, prenom = "Jean") {
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
  const p = await api(page, "PATCH", "/v1/company/profile", { name: entreprise, address: adresse, siret: "73282932000074", phone: null, email: null });
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
async function ajouterNegoce(page, n) {
  await page.getByLabel(/^(E-mail du négoce|Ou l'e-mail d'un autre négoce)$/).fill(n.email); await page.getByLabel("Nom du négoce").fill(n.nom);
  await page.getByLabel("Son téléphone (pour le prévenir)").fill(n.tel);
  await page.getByRole("button", { name: "Ajouter ce négoce" }).click();
}

// Le 22, seule zone ouverte sur la prévisualisation (ailleurs : « Les regroupements arrivent bientôt ») ; les deux passes
// (iPhone SE, ordinateur) se jouent l'une après l'autre : l'achat de la première est publié avant que la seconde commence.
const LIEU = APPAREIL === "se" ? { a: "3 rue des Ajoncs, 22300 Lannion", b: "22500 Paimpol" } : { a: "3 rue du Port, 22000 Saint-Brieuc", b: "22200 Guingamp" };
const FIX = path.join(path.dirname(new URL(import.meta.url).pathname), "../../../apps/web/e2e/fixtures");
const A = `delivered+ag-a-${APPAREIL}-${ts}@resend.dev`;
const B = `delivered+ag-b-${APPAREIL}-${ts}@resend.dev`;
const X = { nom: `Négoce X ${ts}`, email: `delivered+ag-x-${APPAREIL}-${ts}@resend.dev`, tel: "02 96 00 00 01" };
const Y = { nom: `Négoce Y ${ts}`, email: `delivered+ag-y-${APPAREIL}-${ts}@resend.dev`, tel: "02 96 00 00 02" };
const ADMIN = "delivered+admin-recette@resend.dev";
const SANS_IA = process.env.SANS_IA === "1";
const nouveau = async (qui) => surveiller(await (await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" })).newPage(), `${qui}-${APPAREIL}`);

const adm = await nouveau("admin");
await etape("Admin : code, mode « automatique »", adm, async () => {
  await inscrire(adm, ADMIN, "Mobiiz Admin Recette", "3 rue des Ajoncs, 22300 Lannion");
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const depuis = Date.now();
  await adm.getByRole("button", { name: "Recevoir mon code" }).click();
  await voir(adm.getByLabel("Code reçu par e-mail"));
  const mails = await emailsVers(ADMIN, (m) => /code d'accès/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000);
  const mail = mails.filter((m) => /code d'accès/.test(m.subject)).at(-1);
  verif(mail, "pas de code");
  await adm.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)[1]);
  await adm.getByRole("button", { name: /^Ouvrir/ }).click();
  // L'espace admin d'abord (le code est validé), puis le mode.
  await voir(adm.getByRole("region", { name: "Tous les achats" }), 30000);
  const m = await api(adm, "PUT", "/v1/admin/pilotage/mode-regroupement", { mode: "automatique" });
  verif(m.status === 200, `mode ${m.status}`);
  return "mode automatique";
});
const carteAdmin = (achatId) => adm.getByRole("region", { name: "Tous les achats" }).locator(`a[href="/admin/achats-groupes/${achatId}"]`).locator("xpath=..");

const a = await nouveau("artisanA");
await etape("Cas 1 : compte vide, gratuit, sans essai", a, async () => {
  await inscrire(a, A, `Toitures A ${APPAREIL}`, LIEU.a);
  await a.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await voir(a.getByText("Par où commencer ?"));
  await voir(a.getByRole("link", { name: /Achat groupé de ton métier/ }));
  await voir(a.getByRole("link", { name: /Ma liste de matériaux/ }));
  verif((await a.getByText(/Essai gratuit|jours d'essai/).count()) === 0, "essai encore visible");
});
await etape("Cas 2 : trois choix pour la liste", a, async () => {
  await a.getByRole("link", { name: /Ma liste de matériaux/ }).first().click();
  await voir(a.getByText("Depuis mon devis — on t'avance"));
  await voir(a.getByText("Photo de ma liste"));
  await voir(a.getByText("Je la note moi-même"));
});
if (SANS_IA)
  await etape("Cas 2 : liste notée à la main (sans IA), « Mettre en achat groupé »", a, async () => {
    // Point 1 (28 octobre 2026) : « Écris ta liste » en plein écran, une ligne par Entrée, puis « Terminé ».
    await a.getByRole("button", { name: /Je la note moi-même/ }).click();
    const ecran = a.getByRole("dialog", { name: "Écris ta liste" });
    const champ = ecran.getByLabel("Matériau et quantité");
    await champ.fill("Ardoise naturelle 32×22 Espagne 1er choix, 1800 pièces");
    await champ.press("Enter");
    await champ.fill("Liteaux 27×38 traités classe 2, 200 m");
    await champ.press("Enter");
    await ecran.getByRole("button", { name: "Terminé" }).click();
    await a.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60000 });
    // Point 8 : une seule suggestion d'achat groupé (« Acheter en groupe » en doublon a disparu).
    const bouton = a.getByRole("button", { name: "Mettre en achat groupé" });
    await voir(bouton, 60000);
    await bouton.first().scrollIntoViewIfNeeded();
    const suggestion = a.getByText(/mets-les en achat groupé pour payer moins cher\.$/);
    return (await suggestion.count()) ? await suggestion.first().innerText() : "pas de suggestion";
  });
else
  await etape("Cas 2 : liste depuis un devis (vraie lecture), bandeau, « à vérifier », suggestion", a, async () => {
    await a.getByLabel("Déposer mon devis").setInputFiles(path.join(FIX, "devis-achat-groupe.pdf"));
    await a.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60000 });
    const liste = a.getByRole("region", { name: "Liste des fournitures" });
    const questions = a.getByRole("region", { name: "Les questions" });
    await voir(liste.or(questions), 240000);
    if (await questions.isVisible()) {
      await a.getByRole("button", { name: /^Calculer ma liste/ }).click();
    }
    await voir(liste, 240000);
    await voir(a.getByText("Liste préparée à partir de ton devis. Vérifie les quantités avant d'envoyer."));
    const suggestion = a.getByText(/mets-les en achat groupé pour payer moins cher\.$/);
    await voir(suggestion, 60000);
    await suggestion.scrollIntoViewIfNeeded();
    return await suggestion.first().innerText();
  });
let besoinA = null;
let achatA = null;
await etape("Cas 2 : « Mettre en achat groupé », « Tout cocher », engagement", a, async () => {
  await a.getByRole("button", { name: "Mettre en achat groupé" }).first().click();
  const groupe = a.getByLabel("Acheter en groupe");
  await groupe.getByRole("button", { name: "Tout cocher" }).click();
  // Ultra intuitif (27 octobre) : une question par écran, « Continuer » entre chaque.
  await groupe.getByRole("button", { name: "Continuer" }).click();
  await groupe.getByLabel("Livraison avant le").fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  await groupe.getByRole("button", { name: "Continuer" }).click();
  await ajouterNegoce(a, X);
  await groupe.getByRole("button", { name: "Continuer" }).click();
  await voir(groupe.getByText("Ton premier achat groupé est offert."));
  await groupe.getByRole("checkbox", { name: /^Je commande ces quantités/ }).check();
  await groupe.getByRole("button", { name: /^Je m'engage et j'ajoute ces \d+ lignes$/ }).scrollIntoViewIfNeeded();
});
await etape("Cas 2 : la liste dans l'achat « Couverture · secteur … »", a, async () => {
  const groupe = a.getByLabel("Acheter en groupe");
  await groupe.getByRole("button", { name: /^Je m'engage et j'ajoute ces \d+ lignes$/ }).click();
  const phrase = a.getByText(/lignes? dans l'achat groupé : Couverture · secteur /);
  await voir(phrase, 30000);
  const texte = await phrase.first().innerText();
  await a.getByRole("link", { name: "Préviens ton négoce" }).click();
  await a.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  besoinA = a.url().split("/").pop();
  achatA = (await api(a, "GET", `/v1/achats-groupes/${besoinA}`)).body;
  verif(achatA?.achatId, "pas d'achatId");
  return texte;
});

const b = await nouveau("artisanB");
let besoinB = null;
await etape("Cas 3 : 2e couvreur alerté (achat ouvert dans son secteur)", b, async () => {
  await inscrire(b, B, `Couvertures B ${APPAREIL}`, `5 place du Marché, ${LIEU.b}`, "Paul");
  await b.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const ouverts = b.getByRole("region", { name: "Achats groupés ouverts dans ton secteur" });
  await voir(ouverts.getByText(/^Achat groupé couverture ouvert dans ton secteur/));
  await ouverts.scrollIntoViewIfNeeded();
});
await etape("Cas 3 : il ajoute sa liste avec la case d'engagement", b, async () => {
  const ouverts = b.getByRole("region", { name: "Achats groupés ouverts dans ton secteur" });
  await ouverts.getByRole("link", { name: "Ajouter ma liste" }).first().click();
  await voir(b.getByRole("heading", { name: "Ajouter ma liste" }));
  await b.getByRole("button", { name: "Ardoise", exact: true }).click();
  await b.getByRole("button", { name: "32×22", exact: true }).click();
  await b.getByRole("button", { name: "Espagne 1er choix" }).click();
  await b.getByLabel("Quantité de Ardoise naturelle 32×22 Espagne 1er choix").fill("900");
  await b.getByRole("button", { name: "Ajouter à ma liste" }).click();
  await b.getByRole("button", { name: "Continuer" }).click();
  await b.getByLabel("Commune de livraison").fill(LIEU.b);
  await b.getByRole("button", { name: "Continuer" }).click();
  await ajouterNegoce(b, Y);
  await b.getByRole("button", { name: "Continuer" }).click();
  const engagement = b.getByRole("region", { name: "Mon engagement" });
  await engagement.getByRole("checkbox", { name: /^Je commande ces quantités, chez le moins cher/ }).check();
  await engagement.scrollIntoViewIfNeeded();
});
await etape("Cas 3 : « Je m'engage et j'ajoute ma liste »", b, async () => {
  await b.getByRole("button", { name: "Je m'engage et j'ajoute ma liste" }).click();
  await voir(b.getByText(/^Ta liste est dans l'achat groupé : Couverture · secteur /), 30000);
  await b.getByRole("link", { name: "Voir mon achat groupé" }).click();
  await b.waitForURL(/\/achats-groupes\/[0-9a-f-]{36}$/);
  besoinB = b.url().split("/").pop();
});

await etape("Cas 4 : l'admin clôture (une liste propre par négoce)", adm, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const carte = carteAdmin(achatA.achatId);
  await carte.scrollIntoViewIfNeeded();
  await carte.getByRole("button", { name: "Clôturer maintenant" }).click();
  await voir(adm.getByText("Clôturé : les listes sont parties chez les négoces."));
});
const lien = (m) => /https?:\/\/[^\s]+\/achat-groupe\/[A-Za-z0-9_-]+/.exec(m.text)[0];
const demande = async (email) => (await emailsVers(email, (m) => /Demande de prix groupée/.test(m.subject))).filter((m) => /Demande de prix groupée/.test(m.subject)).at(-1);
const negoce = await nouveau("negoce");
await etape("Cas 4 : X chiffre ligne par ligne, « je ne fournis pas » les liteaux", negoce, async () => {
  const mailX = await demande(X.email);
  verif(mailX, "pas de demande chez X");
  verif(!/commission/i.test(mailX.text), "le mot commission est dans la demande");
  await negoce.goto(lien(mailX), { waitUntil: "networkidle" });
  await voir(negoce.getByRole("heading", { name: "Demande de prix groupée" }));
  // Page négoce (Greg, 28 octobre 2026, point 3) : PDF et Excel sous le titre ; « Déposer mon offre » puis trois façons.
  await voir(negoce.getByRole("link", { name: "Télécharger en PDF" }));
  await voir(negoce.getByRole("link", { name: "Exporter en Excel" }));
  await voir(negoce.getByText(/Ardoise 32×22 Espagne 1er choix/));
  await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
  await voir(negoce.getByRole("heading", { name: "Comment voulez-vous répondre ?" }));
  await negoce.getByRole("button", { name: /^Saisir mes prix ici/ }).click();
  await negoce.getByLabel("Prix de Ardoise 32×22 Espagne 1er choix").fill("1,10");
  await negoce.getByRole("listitem").filter({ hasText: "Liteaux 27×38" }).getByRole("checkbox", { name: "Je ne fournis pas" }).check();
  await negoce.getByRole("button", { name: "Continuer" }).click();
  await voir(negoce.getByText("Total HT livré"));
  await negoce.getByText("Pour ouvrir un compte chez vous").click();
  await negoce.getByRole("checkbox", { name: "Kbis de moins de 3 mois" }).check();
  await negoce.getByRole("checkbox", { name: "RIB" }).check();
  await negoce.getByRole("radio", { name: "Paiement comptant au départ" }).check();
  await negoce.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  await negoce.getByRole("button", { name: "Envoyer mon offre" }).scrollIntoViewIfNeeded();
  await negoce.getByRole("button", { name: "Envoyer mon offre" }).click();
  await voir(negoce.getByText(/^Offre envoyée le /));
});
await etape(SANS_IA ? "Cas 4 : Y répond ligne par ligne (sans IA)" : "Cas 4 : Y répond par un PDF (lu par l'IA)", negoce, async () => {
  const mailY = await demande(Y.email);
  verif(mailY, "pas de demande chez Y");
  await negoce.goto(lien(mailY), { waitUntil: "networkidle" });
  await negoce.getByRole("button", { name: "Déposer mon offre" }).click();
  // Sans IA : un prix sur chaque ligne reçue (la page refuse une ligne sans réponse).
  if (SANS_IA) {
    await negoce.getByRole("button", { name: /^Saisir mes prix ici/ }).click();
    const prix = negoce.getByLabel(/^Prix de /);
    for (let i = 0; i < (await prix.count()); i++) await prix.nth(i).fill(i === 0 ? "1,25" : "0,62");
  }
  else {
    await negoce.getByRole("button", { name: /^Déposer mon devis PDF/ }).click();
    await negoce.getByLabel("Votre devis PDF").setInputFiles(path.join(FIX, "devis-fournisseur-couvreur.pdf"));
  }
  await negoce.getByRole("button", { name: "Continuer" }).click();
  await negoce.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  await negoce.getByRole("button", { name: "Envoyer mon offre" }).click();
  await voir(negoce.getByText(/^Offre envoyée le /), 240000);
});
await etape("Cas 4 : l'admin analyse ; l'artisan voit « vérification en cours »", a, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const carte = carteAdmin(achatA.achatId);
  await carte.getByRole("button", { name: "Analyser maintenant" }).click();
  await voir(adm.getByText("Offres analysées : à valider."), 240000);
  const alerte = await emailsVers(ADMIN, (m) => /valider/i.test(m.subject) && /achat/i.test(m.subject), 60000);
  await a.goto(`${BASE}/achats-groupes/${besoinA}`, { waitUntil: "networkidle" });
  await voir(a.getByText("Offres reçues, vérification en cours"));
  return `e-mail admin : ${alerte.filter((m) => /valider/i.test(m.subject)).map((m) => `« ${m.subject} »`).at(-1) ?? "aucun"}`;
});
await etape(SANS_IA ? "Cas 4 : écran de validation (offre incomplète de X)" : "Cas 4 : écran de validation (offre incomplète, PDF douteux)", adm, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes/${achatA.achatId}`, { waitUntil: "networkidle" });
  await voir(adm.getByText(/^2 sur 2 négoces ont répondu/));
  const offreX = adm.getByLabel(`Offre ${X.nom}`);
  const offreY = adm.getByLabel(`Offre ${Y.nom}`);
  await voir(offreX.getByText("Non chiffrées : Liteaux 27×38"));
  if (!SANS_IA) await voir(offreY.getByRole("link", { name: /Ouvrir le devis d'origine/ }));
  const alertes = await offreY.getByRole("list", { name: "Alertes" }).count();
  await offreX.scrollIntoViewIfNeeded();
  return `${alertes ? "alertes IA sur Y" : "pas d'alerte IA sur Y"}`;
});
await etape("Cas 4 : écarter Y, Publier", adm, async () => {
  const offreY = adm.getByLabel(`Offre ${Y.nom}`);
  await offreY.getByRole("button", { name: "Écarter" }).click();
  await voir(offreY.getByText("Écartée"));
  await adm.getByRole("button", { name: "Publier" }).click();
  await voir(adm.getByText("Publié : chaque artisan a reçu sa comparaison."));
});
await etape("Cas 5 : B voit « Ta liste chez le meilleur négoce », sans compte chez X", b, async () => {
  await b.goto(`${BASE}/achats-groupes/${besoinB}`, { waitUntil: "networkidle" });
  const phrase = b.getByText(/^Ta liste chez le meilleur négoce : .+, livraison comprise\.$/);
  await voir(phrase);
  const offre = b.getByRole("region", { name: "Les offres" });
  await voir(offre.getByText("Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB, Paiement comptant au départ."));
  await offre.getByRole("checkbox", { name: /J'accepte que Mobiiz transmette/ }).check();
  await offre.getByRole("button", { name: "Je suis intéressé, transmettre mes coordonnées" }).scrollIntoViewIfNeeded();
  return await phrase.innerText();
});
await etape("Cas 5 : « transmettre mes coordonnées » (e-mail réel au négoce)", b, async () => {
  const offre = b.getByRole("region", { name: "Les offres" });
  await offre.getByRole("button", { name: "Je suis intéressé, transmettre mes coordonnées" }).click();
  await voir(offre.getByText(`Tes coordonnées sont parties : ${X.nom} te rappelle de la part de Mobiiz.`));
  const mx = await emailsVers(X.email, (m) => /^Ouverture de compte/.test(m.subject));
  const m = mx.find((x) => /^Ouverture de compte/.test(x.subject));
  verif(m, "pas d'e-mail « Ouverture de compte » chez X");
  verif(/73282932000074|732 829 320 00074/.test(m.text), "SIRET absent de l'e-mail");
  return `« ${m.subject} »`;
});
await etape("Cas 6 : A sort, « Mon client a annulé le chantier »", a, async () => {
  await a.goto(`${BASE}/achats-groupes/${besoinA}`, { waitUntil: "networkidle" });
  // Point 8 (28 octobre 2026) : les sorties sont dans le menu « ··· » en haut à droite.
  await a.getByRole("button", { name: "Plus d'actions sur l'achat groupé" }).click();
  await a.getByRole("menuitem", { name: "Sortir de l'achat groupé" }).click();
  await a.getByRole("button", { name: "Mon client a annulé le chantier" }).click();
  await voir(a.getByRole("alertdialog", { name: "Sortir de l'achat groupé" }));
});
await etape("Cas 6 : « Oui, sortir »", a, async () => {
  await a.getByRole("button", { name: "Oui, sortir" }).click();
  await voir(a.getByText("Tu es sorti de cet achat groupé", { exact: true }));
});
await etape("Admin : suivi de l'achat publié (vus, abonnés, commandé, sortis)", adm, async () => {
  await adm.goto(`${BASE}/admin/achats-groupes`, { waitUntil: "networkidle" });
  const carte = carteAdmin(achatA.achatId);
  await carte.scrollIntoViewIfNeeded();
  const suivi = carte.getByText(/^Vu \d+ · abonnés \d+ · commandé \d+ · sortis \d+/);
  await voir(suivi);
  return await suivi.innerText();
});
await etape("Nettoyage : comptes supprimés", a, async () => {
  for (const p of [a, b, adm]) await supprimer(p);
});

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ base: BASE, appareil: APPAREIL, journal, anomalies }, null, 2));
console.log(`\n${journal.filter((j) => j.statut === "ok").length}/${journal.length} étapes ; ${anomalies.length} anomalie(s)`);
for (const x of anomalies.slice(0, 20)) console.log(`  ! ${x.qui} ${x.type} ${x.texte}`);
await browser.close();
