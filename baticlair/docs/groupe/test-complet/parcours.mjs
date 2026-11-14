// Le test complet du parcours (demande de Greg, 21 octobre 2026) : joué comme un utilisateur, iPhone ou ordinateur.
// Usage, depuis apps/web, API et site démarrés avec les réglages e2e (voir TEST-COMPLET.md) :
//   node ../../docs/groupe/test-complet/parcours.mjs <iphone|desktop> <dossier-captures> .
import { chromium, devices } from "@playwright/test";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , APPAREIL = "iphone", OUT = "./captures", WEB = "."] = process.argv;
const BASE = "http://localhost:3000";
const FIX = path.join(WEB, "e2e", "fixtures");
const SECRET = "e2e-secret-de-la-tache";
mkdirSync(OUT, { recursive: true });

const options = APPAREIL === "iphone" ? { ...devices["iPhone 13"], deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const journal = [];
let n = 0;
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
const t = (ms) => new Promise((r) => setTimeout(r, ms));
async function capture(page, nom) {
  const fichier = `${String(n).padStart(2, "0")}-${slug(nom)}.jpg`;
  try {
    await page.screenshot({ path: path.join(OUT, fichier), type: "jpeg", quality: 80 });
  } catch (e) {
    return null;
  }
  return fichier;
}
async function etape(nom, page, fn) {
  n++;
  const debut = Date.now();
  try {
    const note = await fn();
    const fichier = await capture(page, nom);
    journal.push({ n, etape: nom, statut: "ok", detail: note ?? "", capture: fichier, ms: Date.now() - debut });
    console.log(`✓ ${n} ${nom}${note ? ` : ${note}` : ""}`);
  } catch (e) {
    const fichier = await capture(page, `${nom} BUG`);
    const message = String(e?.message ?? e).split("\n").slice(0, 3).join(" ").slice(0, 300);
    journal.push({ n, etape: nom, statut: "bug", detail: message, capture: fichier, ms: Date.now() - debut });
    console.log(`✗ ${n} ${nom} : ${message}`);
  }
}
const voir = async (loc, timeout = 15000) => loc.first().waitFor({ state: "visible", timeout });
const absent = async (loc, timeout = 10000) => loc.first().waitFor({ state: "detached", timeout }).catch(() => loc.first().waitFor({ state: "hidden", timeout }));
const texte = async (loc) => (await loc.first().innerText()).replace(/\s+/g, " ").trim();
async function attendreQue(f, timeout = 20000, pas = 500) {
  const fin = Date.now() + timeout;
  for (;;) {
    const v = await f();
    if (v) return v;
    if (Date.now() > fin) throw new Error("attente dépassée");
    await t(pas);
  }
}
function verif(cond, message) {
  if (!cond) throw new Error(message);
}
async function sansDebordement(page) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  verif(sw <= iw + 1, `débordement horizontal : ${sw} > ${iw}`);
}

// L'API, comme le fait le navigateur de l'artisan (cookie de session, entreprise active).
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
async function emails(page, to) {
  const r = await page.evaluate(async ({ to, SECRET }) => {
    const res = await fetch(`/v1/internal/test/emails?to=${encodeURIComponent(to)}`, { headers: { authorization: `Bearer ${SECRET}` } });
    return (await res.json()).emails;
  }, { to, SECRET });
  return r;
}
async function reponseParEmail(page, from, to) {
  const corps = JSON.stringify({ type: "email.received", data: { from, to: [to], subject: "Re: demande de prix" } });
  const id = `msg_${Date.now()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from("e2e-secret-du-webhook-0000")).update(`${id}.${timestamp}.${corps}`).digest("base64");
  return page.evaluate(
    async ({ corps, id, timestamp, signature }) => {
      const res = await fetch("/v1/webhooks/resend", { method: "POST", headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` }, body: corps });
      return { status: res.status, body: await res.json() };
    },
    { corps, id, timestamp, signature },
  );
}

// Les gestes de l'artisan, comme à l'écran.
async function inscription(page, { nom, entreprise, email, metier = "Couverture, charpente, zinguerie" }) {
  await page.getByLabel("Prénom et nom").fill(nom);
  await page.getByLabel("Nom de ton entreprise").fill(entreprise);
  await page.getByRole("button", { name: metier }).click();
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  verif(await page.getByRole("button", { name: "Créer mon compte" }).isDisabled(), "le bouton devrait être gris tant que la case CGU n'est pas cochée");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await voir(page.getByRole("heading", { name: new RegExp(`^Bonjour ${nom.split(" ")[0]}`) }), 20000);
}
async function coordonnees(page, adresse, siret) {
  await page.goto(`${BASE}/compte`);
  await voir(page.getByLabel("Adresse"));
  await page.getByLabel("Adresse").fill(adresse);
  await page.getByLabel("SIRET").fill(siret);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await voir(page.getByRole("status").filter({ hasText: "Coordonnées enregistrées." }));
}
async function passerLesQuestions(page) {
  const liste = page.getByRole("region", { name: "Page des fournitures" });
  const questions = page.getByRole("region", { name: "Les questions" });
  await liste.or(questions).first().waitFor({ state: "visible", timeout: 90000 });
  let posees = 0;
  if (await questions.isVisible()) {
    posees = await questions.getByRole("group").count();
    const faconne = questions.getByRole("button", { name: /^Je façonne/ });
    const nb = await faconne.count();
    for (let i = 0; i < nb; i++) await faconne.nth(i).click();
    await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  }
  await liste.waitFor({ state: "visible", timeout: 90000 });
  return posees;
}
async function reglerLesOranges(page) {
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  let reglees = 0;
  for (let i = 0; i < 40; i++) {
    await attendreQue(async () => (await list.locator('[aria-busy="true"]').count()) === 0, 15000);
    const orange = list.getByRole("listitem").filter({ has: page.getByRole("img", { name: "à vérifier" }) }).first();
    if (!(await orange.isVisible().catch(() => false))) break;
    const opener = orange.getByRole("button", { name: /^(Modifier|Fermer) : / }).first();
    if ((await opener.getAttribute("aria-expanded")) !== "true") await opener.click();
    const card = orange.getByRole("group", { name: /^Régler : / });
    const yes = card.getByRole("button", { name: /^(C'est bon|Garder|Oui)/ }).first();
    const input = card.getByRole("textbox");
    if (await yes.isVisible().catch(() => false)) await yes.click();
    else if (await input.isVisible().catch(() => false)) {
      await input.fill("2");
      await card.getByRole("button", { name: "OK" }).click();
    } else await card.getByRole("group").getByRole("button").first().click();
    reglees++;
  }
  const voile = page.getByRole("button", { name: "Fermer la ligne ouverte" });
  if (await voile.isVisible().catch(() => false)) await voile.click({ position: { x: 5, y: 5 } });
  return reglees;
}
async function ouvrirLaListe(page) {
  const liste = page.getByRole("region", { name: "Page des fournitures" });
  if (await liste.isVisible().catch(() => false)) return;
  await page.getByRole("region", { name: "Liste de matériaux" }).getByRole("button").first().click();
  await voir(liste);
}
async function proposerAuGroupe(page, statut = "Chantier signé", adresse = null) {
  await ouvrirLaListe(page);
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  await list.getByRole("button", { name: "Proposer au groupé" }).click();
  const boxes = list.getByRole("checkbox", { name: /^Proposer au groupé : / }).and(page.locator(":enabled"));
  await boxes.first().check();
  // Deux régions portent ce nom (l'invitation en haut et la barre du bas) : la barre est celle qui a les boutons radio.
  const bar = page.getByRole("region", { name: "Proposer au groupé", exact: true }).filter({ has: page.getByRole("radio") });
  await bar.getByRole("radio", { name: statut }).click();
  if (statut === "Chantier signé") await bar.getByRole("checkbox", { name: /je m'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu/ }).check();
  await capture(page, `proposer ${statut}`);
  await bar.getByRole("button", { name: "Proposer" }).click();
  // Un chantier créé depuis le « + » n'a pas d'adresse : la barre la demande, l'artisan la tape là.
  const champ = bar.getByLabel("Adresse du chantier, avec le code postal");
  const demandee = await Promise.race([champ.waitFor({ state: "visible", timeout: 8000 }).then(() => true), bar.waitFor({ state: "hidden", timeout: 8000 }).then(() => false)]).catch(() => false);
  if (demandee) {
    verif(adresse, "la barre demande l'adresse du chantier");
    await champ.fill(adresse);
    await capture(page, `proposer adresse demandee`);
    await bar.getByRole("button", { name: "Proposer" }).click();
  }
  await absent(bar.getByRole("button", { name: "Proposer" }), 15000);
}
async function chantierDepuisLePlus(page, pdf) {
  await page.goto(`${BASE}/`);
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Nouveau chantier" }).click();
  await voir(page.getByText("Déposer mon devis", { exact: true }));
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(FIX, pdf));
}

const horodatage = Date.now();
const A = { nom: "Yann Le Goff", entreprise: "Couverture Le Goff", email: `yann-${horodatage}@example.fr`, adresse: "6 impasse du Ouipoure, 22620 Ploubazlanec" };
const B = { nom: "Marie Le Bihan", entreprise: "Toitures Le Bihan", email: `marie-${horodatage}@example.fr`, adresse: "4 rue du Port, 22500 Paimpol" };
const N1 = "ardoises@example.com";
const N2 = "general@example.com";
const ctxA = await browser.newContext({ ...options, locale: "fr-FR" });
const page = await ctxA.newPage();
page.setDefaultTimeout(15000);
const etat = {};

// 1. La landing, déconnecté, et la démo guidée du premier lancement.
await etape("Landing déconnecté, premier lancement", page, async () => {
  await page.goto(`${BASE}/`);
  await voir(page.getByRole("heading", { level: 1 }));
  const h1 = await texte(page.getByRole("heading", { level: 1 }));
  verif(/Tes devis deviennent tes bons de commande/.test(h1), `titre : ${h1}`);
  await sansDebordement(page);
  return h1;
});
await etape("Démo guidée : écran 1", page, async () => {
  const demo = page.getByRole("region", { name: /^Ton devis devient ta liste/ });
  await voir(demo);
  verif((await demo.getByText("Démo · écran 1 sur 3 · données fictives").count()) === 1, "mention « données fictives » absente");
  verif((await demo.getByRole("list", { name: "Liste de fournitures (exemple)" }).getByRole("listitem").count()) === 5, "5 lignes d'exemple attendues");
});
await etape("Démo guidée : écran 2", page, async () => {
  await page.getByRole("button", { name: "Suivant" }).click();
  await voir(page.getByRole("heading", { name: "Le groupé, avec les artisans du département" }));
});
await etape("Démo guidée : écran 3, puis Passer", page, async () => {
  await page.getByRole("button", { name: "Suivant" }).click();
  await voir(page.getByRole("heading", { name: "Ton offre, ton prix" }));
  await capture(page, "demo ecran 3");
  await page.getByRole("button", { name: "Passer" }).click();
  await absent(page.getByText("Démo · écran"));
  await page.reload();
  await voir(page.getByRole("heading", { level: 1 }));
  verif((await page.getByText("Démo · écran").count()) === 0, "la démo revient après « Passer »");
});
await etape("Landing : sections, liens, pied de page", page, async () => {
  for (const h of ["Du devis à la liste de fournitures, en trois étapes", "Les réponses reviennent dans l'app, comparées", "Le groupé : un seul négoce, un seul prix", "Gratuit pour l'artisan", "Les métiers couverts", "Ton premier devis, maintenant"]) verif((await page.getByRole("heading", { name: h }).count()) === 1, `section absente : ${h}`);
  verif((await page.getByRole("link", { name: "Créer un compte" }).count()) === 2, "deux « Créer un compte » attendus");
  verif((await page.getByRole("list", { name: "Métiers couverts" }).getByRole("listitem").count()) === 24, "24 métiers attendus");
  for (const l of ["Mentions légales", "CGU", "Conditions négoce", "Confidentialité", "Se connecter", "Revoir la démo."]) verif((await page.getByRole("link", { name: l }).count()) >= 1, `lien absent : ${l}`);
  const externes = await page.evaluate(() => [...document.querySelectorAll("script[src], img, link[rel=stylesheet], iframe")].map((e) => e.getAttribute("src") ?? e.getAttribute("href") ?? "").filter((u) => /^https?:\/\//.test(u)));
  verif(externes.length === 0, `ressources extérieures : ${externes.join(", ")}`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await t(400);
});
await etape("Pages légales depuis la landing", page, async () => {
  const vues = [];
  for (const [l, h] of [["Mentions légales", "Mentions légales"], ["CGU", "Conditions générales d'utilisation"], ["Conditions négoce", "Conditions négoce"], ["Confidentialité", "Confidentialité"]]) {
    await page.goto(`${BASE}/`);
    await page.getByRole("link", { name: l, exact: true }).first().click();
    await voir(page.getByRole("heading", { name: h }));
    await capture(page, `legal ${l}`);
    verif((await page.getByText(/avocat/).count()) === 0, `« avocat » visible sur ${l}`);
    vues.push(l);
  }
  await page.goto(`${BASE}/`);
  return vues.join(", ");
});

// 2. Création de compte.
await etape("Créer un compte : formulaire, 19 autres métiers, CGU obligatoire", page, async () => {
  await page.getByRole("link", { name: "Créer un compte" }).first().click();
  await voir(page.getByRole("heading", { name: "Créer un compte" }));
  verif(/Gratuit pour l'artisan/.test(await texte(page.locator("main"))), "la phrase sous le titre manque");
  await page.getByRole("button", { name: /^Voir les \d+ autres métiers$/ }).click();
  verif((await page.getByRole("button", { name: "Autre métier" }).count()) === 1, "« Autre métier » absent après dépliage");
  await capture(page, "inscription metiers deplies");
  await inscription(page, A);
});
await etape("Accueil après inscription", page, async () => {
  await voir(page.getByText("Crée ton premier chantier"));
  await sansDebordement(page);
});
await etape("PWA : manifeste, icônes, « Ajouter à l'écran d'accueil »", page, async () => {
  const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
  verif(manifest.display === "standalone" && manifest.start_url === "/", "manifeste : display/start_url");
  for (const f of ["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png", "/apple-touch-icon.png"]) verif(((await page.request.get(`${BASE}${f}`)).headers()["content-type"] ?? "").includes("image/png"), `icône absente : ${f}`);
  const aide = page.getByRole("region", { name: "Ajouter à l'écran d'accueil" });
  if (APPAREIL === "iphone") {
    await voir(aide);
    await capture(page, "pwa aide installation");
    await aide.getByRole("button", { name: "Compris" }).click();
    await absent(aide);
    return "aide d'installation vue puis fermée";
  }
  verif((await aide.count()) === 0, "l'aide d'installation ne doit pas apparaître sur ordinateur");
  return "pas d'aide sur ordinateur";
});

// 3. Compte : adresse, SIRET.
await etape("Compte : adresse et SIRET enregistrés", page, async () => {
  await coordonnees(page, A.adresse, "73282932000074");
});
await etape("Groupé : « Vérifier mon SIRET »", page, async () => {
  await page.goto(`${BASE}/groupe`);
  await voir(page.getByRole("heading", { name: "Groupé" }));
  await capture(page, "groupe avant siret");
  await page.getByRole("button", { name: "Vérifier mon SIRET" }).click();
  await attendreQue(async () => (await page.getByRole("button", { name: "Vérifier mon SIRET" }).count()) === 0, 15000);
  await sansDebordement(page);
});

// 4. Dépôt du devis, questions, liste.
await etape("Nouveau chantier depuis le + : dépôt du devis (lecture rejouée)", page, async () => {
  await chantierDepuisLePlus(page, "devis-client-couvreur.pdf");
  await t(1500);
});
await etape("Questions de comptoir", page, async () => {
  const q = await passerLesQuestions(page);
  return `${q} question(s) posée(s)`;
});
await etape("Ton chantier : la liste, lignes orange réglées", page, async () => {
  await voir(page.getByRole("region", { name: "Liste des fournitures" }));
  await capture(page, "liste avant reglage");
  const r = await reglerLesOranges(page);
  await voir(page.getByRole("button", { name: "Envoyer au fournisseur" }));
  await sansDebordement(page);
  return `${r} ligne(s) orange réglée(s)`;
});
await etape("Aide « ? » sur Ton chantier", page, async () => {
  await page.getByRole("region", { name: "Liste des fournitures" }).getByRole("button", { name: "Aide" }).click();
  await voir(page.getByRole("dialog", { name: "Aide : Ton chantier" }));
  await capture(page, "aide ton chantier");
  await page.getByRole("button", { name: "Fermer l'aide" }).click();
});
await etape("Envoi aux négoces : « À qui j'envoie ? », ajout d'un fournisseur", page, async () => {
  await page.getByRole("button", { name: "Envoyer au fournisseur" }).click();
  const apercu = page.getByRole("dialog", { name: "À qui j'envoie ?" });
  await voir(apercu);
  await apercu.getByRole("button", { name: "Ajouter un fournisseur" }).click();
  await apercu.getByLabel("Société").fill("Matériaux Côtes-d'Armor");
  await apercu.getByLabel("E-mail pour les demandes de prix").fill("devis@example.com");
  await apercu.getByRole("button", { name: "Ajouter", exact: true }).click();
  await voir(apercu.getByRole("checkbox", { name: /Matériaux Côtes-d'Armor/ }));
  await capture(page, "a qui j envoie");
  await apercu.getByRole("button", { name: "Envoyer", exact: true }).click();
  const prompt = page.getByRole("dialog", { name: "Activer les notifications" });
  if (await prompt.isVisible().catch(() => false)) await prompt.getByRole("button", { name: "Plus tard" }).click();
  await voir(page.getByRole("list", { name: "Tes fournisseurs" }));
  const m = await emails(page, "devis@example.com");
  verif(m.length >= 1, "aucun e-mail parti au fournisseur");
  return `e-mail : « ${m.at(-1).subject} », pièces : ${m.at(-1).attachments.join(", ")}`;
});

// 5. Proposer au groupé : signé, puis un second chantier en attente.
await etape("Proposer au groupé (chantier signé)", page, async () => {
  await proposerAuGroupe(page, "Chantier signé", A.adresse);
  const bloc = page.getByRole("region", { name: "Au groupé", exact: true });
  await voir(bloc);
  verif(/Chantier signé/.test(await texte(bloc)), `bloc « Au groupé » : ${await texte(bloc)}`);
  await sansDebordement(page);
});
await etape("Second chantier : proposer en « devis en attente »", page, async () => {
  await chantierDepuisLePlus(page, "devis-client-couvreur.pdf");
  await passerLesQuestions(page);
  await reglerLesOranges(page);
  await proposerAuGroupe(page, "Devis en attente", "8 rue de la Gare, 22300 Lannion");
  const bloc = page.getByRole("region", { name: "Au groupé", exact: true });
  await voir(bloc);
  verif(/attente/i.test(await texte(bloc)), `bloc « Au groupé » : ${await texte(bloc)}`);
});

// 6. Mes négoces, avec la suggestion Sirene.
await etape("Mes négoces : ajout par suggestion Sirene, favori", page, async () => {
  await page.goto(`${BASE}/fournisseurs?negoce`);
  const form = page.getByRole("form", { name: "Nouveau négoce" });
  await voir(form);
  await form.getByLabel("Nom du négoce").fill("Point");
  const sugg = page.getByRole("list", { name: "Négoces connus (Sirene)" });
  await voir(sugg);
  await capture(page, "suggestion sirene");
  await sugg.getByRole("button").first().click();
  verif(/Sirene/.test(await texte(form)), "la provenance Sirene n'est pas rappelée sous le nom");
  await form.getByLabel("E-mail où il reçoit les demandes").fill(N1);
  await form.getByLabel("Ton numéro de compte chez lui").fill("C-12");
  await form.getByRole("checkbox", { name: "Vend : Couverture" }).check();
  await form.getByRole("button", { name: "Ajouter", exact: true }).click();
  const liste = page.getByRole("list", { name: "Mes négoces" });
  await voir(liste);
  verif(/22/.test(await texte(liste)), "le département 22 n'apparaît pas");
  return await texte(liste);
});
await etape("Mes négoces : second négoce (généraliste), message type", page, async () => {
  await page.getByRole("button", { name: /Ajouter un négoce/ }).click();
  const form = page.getByRole("form", { name: "Nouveau négoce" });
  await voir(form);
  await form.getByLabel("Nom du négoce").fill("Négoce Généraliste");
  await form.getByLabel("E-mail où il reçoit les demandes").fill(N2);
  await form.getByRole("checkbox", { name: "Vend : Couverture" }).check();
  await form.getByRole("checkbox", { name: /Vend : Second/ }).check();
  await form.getByRole("button", { name: "Ajouter", exact: true }).click();
  const liste = page.getByRole("list", { name: "Mes négoces" });
  await attendreQue(async () => (await liste.getByRole("listitem").count()) === 2);
  await page.getByText("Le message à envoyer à ton négoce pour le prévenir").click();
  await page.getByRole("button", { name: "Copier le message" }).click();
  await capture(page, "message type negoce");
  await sansDebordement(page);
});
await etape("Aide « ? » sur Tes négoces, Le groupé, Ton compte, Tes chantiers", page, async () => {
  for (const [chemin, titre] of [["/fournisseurs", "Aide : Tes négoces"], ["/groupe", "Aide : Le groupé"], ["/compte", "Aide : Ton compte"], ["/chantiers", "Aide : Tes chantiers"]]) {
    await page.goto(`${BASE}${chemin}`);
    await page.getByRole("button", { name: "Aide" }).first().click();
    const aide = page.getByRole("dialog", { name: titre });
    await voir(aide);
    const lignes = (await texte(aide)).split(/(?<=\.)\s/).length;
    verif(lignes <= 4, `${titre} : ${lignes} phrases`);
    await capture(page, `aide ${chemin}`);
    await page.getByRole("button", { name: "Fermer l'aide" }).click();
  }
});
await etape("Groupé : les trois étapes cochées, « Mes lots »", page, async () => {
  await page.goto(`${BASE}/groupe`);
  await voir(page.getByRole("list", { name: "Mes lots" }));
  const lots = await texte(page.getByRole("list", { name: "Mes lots" }));
  verif(/Lot ouvert|Chantier signé/.test(lots), `Mes lots : ${lots}`);
  verif(/devis en attente, sans engagement/.test(lots), `le besoin « en attente » devrait se lire sans engagement : ${lots}`);
  return lots.slice(0, 240);
});

// 7. L'artisan B signe la même référence : le lot se forme, la demande part.
const ctxB = await browser.newContext({ ...options, locale: "fr-FR" });
const pageB = await ctxB.newPage();
pageB.setDefaultTimeout(15000);
etat.avantN1 = (await emails(page, N1)).length;
etat.avantN2 = (await emails(page, N2)).length;
await etape("Artisan B : compte, SIRET, devis, proposition signée", pageB, async () => {
  await pageB.goto(`${BASE}/inscription`);
  await inscription(pageB, B);
  await coordonnees(pageB, B.adresse, "73282932000074");
  const r = await api(pageB, "POST", "/v1/groupe/siret");
  verif(r.status === 200, `SIRET B : ${r.status}`);
  await chantierDepuisLePlus(pageB, "devis-client-couvreur.pdf");
  await passerLesQuestions(pageB);
  await reglerLesOranges(pageB);
  await proposerAuGroupe(pageB, "Chantier signé", B.adresse);
  await voir(pageB.getByRole("region", { name: "Au groupé", exact: true }));
});
await etape("Formation du lot : e-mail « Regroupement artisans » aux deux négoces", page, async () => {
  const demande = await attendreQue(async () => {
    const m = await emails(page, N1);
    return m.length > etat.avantN1 ? m.at(-1) : null;
  }, 30000);
  etat.demande = demande;
  verif(/Regroupement artisans/.test(demande.subject), `objet : ${demande.subject}`);
  verif(/^lot-\d+@reponses\.example\.com$/.test(demande.replyTo ?? ""), `reply-to : ${demande.replyTo}`);
  verif(/2\s?%/.test(demande.text) && /int[ée]grez/i.test(demande.text), "la phrase de commission manque dans l'e-mail");
  verif(demande.attachments.some((a) => /\.pdf$/.test(a)), "pas de PDF joint");
  verif(!demande.text.includes(A.entreprise) && !demande.text.includes(B.entreprise), "le nom d'un artisan apparaît dans l'e-mail négoce");
  const m2 = await attendreQue(async () => {
    const m = await emails(page, N2);
    return m.length > etat.avantN2 ? m.at(-1) : null;
  }, 20000);
  writeFileSync(path.join(OUT, "email-negoce.txt"), `À : ${N1}\nObjet : ${demande.subject}\nReply-To : ${demande.replyTo}\nPièces : ${demande.attachments.join(", ")}\n\n${demande.text}\n\n=====\nÀ : ${N2}\nObjet : ${m2.subject}\n\n${m2.text}`);
  await page.goto(`${BASE}/groupe`);
  const lots = page.getByRole("list", { name: "Mes lots" });
  await voir(lots);
  await attendreQue(async () => /Engagé, lot parti|parti/.test(await texte(lots)), 15000);
  return `objet : ${demande.subject} ; pièces : ${demande.attachments.join(", ")}`;
});
await etape("Notification artisan : « lot parti »", page, async () => {
  const m = await emails(page, A.email);
  const dernier = m.filter((x) => /groupé|lot/i.test(x.subject)).at(-1);
  verif(dernier, "aucun e-mail « lot parti » à l'artisan");
  verif(!/\bvous\b|\bvotre\b/i.test(dernier.text), `vouvoiement dans la notification : ${dernier.text.slice(0, 120)}`);
  return `${dernier.subject} : ${dernier.text.slice(0, 160)}`;
});

// 8. Les négoces répondent : page de dépôt, case 2 %, deux offres.
const ctxN = await browser.newContext({ ...options, locale: "fr-FR" });
const pageN = await ctxN.newPage();
pageN.setDefaultTimeout(15000);
async function depotNegoce(negoce, fixture, nomEtape) {
  await etape(nomEtape, pageN, async () => {
    const r = await reponseParEmail(page, `Négoce <${negoce}>`, etat.demande.replyTo);
    verif(r.status === 200 && r.body.traite === true, `webhook : ${r.status} ${JSON.stringify(r.body)}`);
    const relance = (await emails(page, negoce)).at(-1);
    verif(/n'est pas encore prise en compte/.test(relance.subject), `relance : ${relance.subject}`);
    const lien = /https?:\/\/[^\s]+\/reponse\/[A-Za-z0-9_-]+/.exec(relance.text)[0].replace(/^https?:\/\/[^/]+/, "");
    await pageN.goto(`${BASE}${lien}`);
    await voir(pageN.getByRole("heading", { name: /^Demande de prix, lot n° \d+/ }));
    const chantiers = pageN.getByRole("list", { name: "Chantiers à livrer" });
    const nbChantiers = await chantiers.getByRole("listitem").count();
    verif(nbChantiers >= 2, `au moins deux chantiers à livrer attendus, ${nbChantiers} vu(s)`);
    const corps = await texte(pageN.locator("main"));
    verif(!corps.includes(A.entreprise) && !corps.includes(B.entreprise) && !corps.includes("M. Client"), "un nom d'artisan ou de client apparaît sur la page négoce");
    const form = pageN.getByRole("form", { name: "Déposer mon devis" });
    verif(/contrat\.pdf$/.test((await form.getByRole("link", { name: /Lire le contrat/ }).getAttribute("href")) ?? ""), "le contrat PDF manque");
    await capture(pageN, `depot negoce ${negoce}`);
    await form.locator('input[type="file"]').setInputFiles(path.join(FIX, fixture));
    verif(await form.getByRole("button", { name: "Déposer mon devis" }).isDisabled(), "le dépôt devrait attendre la case 2 %");
    await form.getByRole("checkbox", { name: "J'accepte la commission" }).check();
    await capture(pageN, `depot negoce case cochee ${negoce}`);
    await form.getByRole("button", { name: "Déposer mon devis" }).click();
    await voir(pageN.getByRole("status"));
    verif(/Devis reçu, merci\./.test(await texte(pageN.getByRole("status"))), `statut : ${await texte(pageN.getByRole("status"))}`);
    await sansDebordement(pageN);
    return `${nbChantiers} chantiers à livrer sur la page`;
  });
}
await depotNegoce(N1, "devis-fournisseur-couvreur.pdf", "Négoce 1 : réponse par e-mail, lien, page de dépôt, case 2 %, offre");
await depotNegoce(N2, "devis-fournisseur-2.pdf", "Négoce 2 : seconde offre");

// 9. Négoce retenu, bons de commande, facture.
await etape("Négoce retenu, offre de A", page, async () => {
  await page.goto(`${BASE}/groupe`);
  const lots = page.getByRole("list", { name: "Mes lots" });
  await voir(lots);
  await attendreQue(async () => /Négoce retenu/.test(await texte(lots)), 30000);
  const txt = await texte(lots);
  verif(/€ HT l'unité chez/.test(txt), `offre : ${txt}`);
  verif(!txt.includes(B.entreprise), "le nom de B apparaît chez A");
  await sansDebordement(page);
  return txt.slice(0, 240);
});
await etape("Bons de commande et facture chez le négoce retenu, copie à l'artisan", page, async () => {
  const auNegoce = [...(await emails(page, N1)), ...(await emails(page, N2))];
  const bon = auNegoce.find((m) => /bons? de commande/i.test(m.subject));
  const facture = auNegoce.find((m) => /^Facture n°/.test(m.subject));
  verif(bon, "aucun bon de commande parti");
  verif(facture, "aucune facture partie");
  const copie = (await emails(page, A.email)).find((m) => /bon de commande|retenu/i.test(m.subject));
  verif(copie, "pas de copie du bon de commande ni d'offre à l'artisan");
  writeFileSync(path.join(OUT, "emails-bons-facture.txt"), [bon, facture, copie].map((m) => `À : ${m.to}\nObjet : ${m.subject}\nPièces : ${m.attachments.join(", ")}\n\n${m.text}`).join("\n\n=====\n\n"));
  return `bon : « ${bon.subject} » (${bon.attachments.length} PDF) ; facture : « ${facture.subject} » ; artisan : « ${copie.subject} »`;
});
await etape("Sur le chantier : « Mon offre », prix habituel, « Voir mon économie », « Problème »", page, async () => {
  // Depuis « Mes lots », le lien du chantier retenu ; sur « Ton chantier », le bloc « Au groupé » porte l'offre.
  const lots = page.getByRole("list", { name: "Mes lots" });
  await lots.getByRole("listitem").filter({ hasText: "Négoce retenu" }).first().getByRole("link").click();
  await ouvrirLaListe(page);
  const offre = page.getByRole("region", { name: /^Mon offre : / });
  await voir(offre);
  await offre.scrollIntoViewIfNeeded();
  await capture(page, "mon offre");
  await offre.getByLabel("Ton prix habituel chez ton négoce").fill("1,10");
  await offre.getByRole("button", { name: "Voir mon économie" }).click();
  await attendreQue(async () => /économ/i.test(await texte(offre)), 10000);
  const economie = (await texte(offre)).match(/[^.]*économ[^.]*\.?/i)?.[0] ?? "";
  await offre.getByRole("button", { name: "Problème" }).click();
  await offre.getByLabel("Quel est le problème ?").fill("Il manque 2 pièces sur le bon");
  await offre.getByRole("button", { name: "Signaler" }).click();
  await voir(offre.getByText(/Problème signalé/));
  await sansDebordement(page);
  return economie;
});
await etape("Mes lots : « Livré »", page, async () => {
  await page.goto(`${BASE}/groupe`);
  const lots = page.getByRole("list", { name: "Mes lots" });
  await voir(lots);
  const lot = lots.getByRole("listitem").filter({ hasText: "Négoce retenu" }).first();
  await lot.scrollIntoViewIfNeeded();
  verif(/Tout est arrivé \?/.test(await texte(lot)), `question de livraison absente : ${await texte(lot)}`);
  await lot.getByRole("button", { name: "Livré" }).click();
  await voir(lot.getByText("Livré, merci."));
  await sansDebordement(page);
});
await etape("Artisan B : désistement (premier : avertissement)", pageB, async () => {
  await pageB.goto(`${BASE}/groupe`);
  const lots = pageB.getByRole("list", { name: "Mes lots" });
  await voir(lots);
  await attendreQue(async () => /Négoce retenu/.test(await texte(lots)), 20000);
  verif(!(await texte(lots)).includes(A.entreprise), "le nom de A apparaît chez B");
  const lot = lots.getByRole("listitem").filter({ hasText: "Négoce retenu" }).first();
  await lot.getByRole("button", { name: "Je ne commande pas", exact: true }).click();
  await voir(lot.getByText(/deuxième fois sur 12 mois/));
  await lot.getByLabel("Pourquoi tu ne commandes pas").fill("Le client a annulé le chantier");
  await capture(pageB, "desistement avertissement");
  await lot.getByRole("button", { name: "Je ne commande pas, c'est sûr" }).click();
  await voir(lot.getByText("Tu ne commandes pas ce lot (désistement)."));
  const m = (await emails(pageB, N1)).concat(await emails(pageB, N2));
  const prevenu = m.find((x) => /désist|ne commande/i.test(x.subject + x.text));
  const avert = (await emails(pageB, B.email)).find((x) => /désist|avertissement/i.test(x.subject + x.text));
  return `${prevenu ? `négoce prévenu : « ${prevenu.subject} »` : "aucun e-mail de désistement au négoce"} ; ${avert ? `artisan averti : « ${avert.subject} »` : "aucun e-mail d'avertissement à l'artisan"}`;
});
await etape("Compte : « Économisé grâce au groupé »", page, async () => {
  await page.goto(`${BASE}/compte`);
  const carte = page.getByRole("region", { name: "Économisé grâce au groupé" });
  await voir(carte);
  await carte.scrollIntoViewIfNeeded();
  return await texte(carte);
});

// 10. Admin.
const ctxAdm = await browser.newContext({ ...options, locale: "fr-FR" });
const pageAdm = await ctxAdm.newPage();
pageAdm.setDefaultTimeout(15000);
await etape("Admin : compte Greg, lien « Admin groupé », lots et journal", pageAdm, async () => {
  await pageAdm.goto(`${BASE}/connexion`);
  await pageAdm.getByLabel("E-mail").fill("admin-groupe@example.fr");
  await pageAdm.getByLabel("Mot de passe").fill("motdepasse-solide");
  await pageAdm.getByRole("button", { name: "Se connecter" }).click();
  const connecte = await Promise.race([pageAdm.getByRole("heading", { name: /^Bonjour/ }).waitFor({ timeout: 10000 }).then(() => true), pageAdm.getByRole("alert").waitFor({ timeout: 10000 }).then(() => false)]).catch(() => false);
  if (!connecte) {
    await pageAdm.goto(`${BASE}/inscription`);
    await inscription(pageAdm, { nom: "Greg Admin", entreprise: "BATI INVEST", email: "admin-groupe@example.fr" });
  }
  await pageAdm.goto(`${BASE}/groupe`);
  await pageAdm.getByRole("link", { name: "Admin groupé" }).click();
  await voir(pageAdm.getByRole("heading", { name: "Admin groupé" }));
  const lots = pageAdm.getByRole("list", { name: "Lots" });
  await voir(lots);
  await lots.getByRole("button", { name: "Journal" }).first().click();
  await voir(pageAdm.getByRole("region", { name: /^Journal du lot n° \d+/ }));
  await sansDebordement(pageAdm);
  return (await texte(pageAdm.getByRole("region", { name: /^Journal du lot n° \d+/ }))).slice(0, 300);
});
for (const r of ["Négoces", "Accords", "Factures", "Exclusions"]) {
  await etape(`Admin : rubrique ${r}`, pageAdm, async () => {
    await pageAdm.getByRole("navigation", { name: "Rubriques de l'admin" }).getByRole("button", { name: r }).click();
    await t(600);
    if (r === "Factures") {
      const csv = await pageAdm.evaluate(async () => (await fetch("/v1/admin/groupe/factures.csv")).text());
      verif(csv.split("\n")[0].startsWith("mois;numero;negoce"), `CSV : ${csv.slice(0, 80)}`);
      return `${csv.split("\n").length - 1} ligne(s) de facture`;
    }
    await sansDebordement(pageAdm);
    return (await texte(pageAdm.locator("main"))).slice(0, 200);
  });
}

// 11. Rapport mensuel.
await etape("Rapport mensuel du 1er : e-mail à l'artisan", page, async () => {
  const now = new Date();
  const premier = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 7)).toISOString();
  const r = await page.evaluate(async ({ premier, SECRET }) => {
    const res = await fetch(`/v1/internal/rapport-mensuel?maintenant=${encodeURIComponent(premier)}`, { headers: { authorization: `Bearer ${SECRET}` } });
    return { status: res.status, body: await res.json() };
  }, { premier, SECRET });
  verif(r.status === 200, `rapport : ${r.status}`);
  const rapport = await attendreQue(async () => (await emails(page, A.email)).find((m) => /^Ton mois/.test(m.subject)), 10000);
  verif(!/\bvous\b|\bvotre\b/i.test(rapport.text), "vouvoiement dans le rapport");
  writeFileSync(path.join(OUT, "email-rapport-mensuel.txt"), `Objet : ${rapport.subject}\n\n${rapport.text}`);
  return `${rapport.subject}`;
});

// 12. Déconnexion, landing après coup, connexion.
await etape("Déconnexion puis reconnexion", page, async () => {
  await page.goto(`${BASE}/compte`);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await voir(page.getByRole("heading", { name: "Connexion" }));
  await page.getByLabel("E-mail").fill(A.email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await voir(page.getByRole("heading", { name: /^Bonjour Yann/ }));
});

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ appareil: APPAREIL, date: new Date().toISOString(), etapes: journal }, null, 2));
const bugs = journal.filter((j) => j.statut === "bug").length;
console.log(`\n${journal.length} étapes, ${bugs} bug(s)`);
await browser.close();
