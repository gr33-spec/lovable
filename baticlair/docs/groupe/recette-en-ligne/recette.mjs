// LA RECETTE EN LIGNE (Greg, 24 octobre 2026 : « Recette complète sur test.mobiiz.fr, comme un vrai utilisateur, sur
// iPhone SE et sur ordinateur »). Joue le site public de la prévisualisation, de vrais comptes, la vraie lecture IA, le
// vrai Stripe en mode test et les vrais e-mails (adresses de test Resend `delivered+…@resend.dev`, lus par l'API Resend).
// Rien en production. Chaque étape est notée « ok » ou « bug » avec sa capture ; une étape en panne n'arrête pas la suite.
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/recette.mjs <se|ordi> <dossier-captures>
//
// RECETTE_ADMIN=1 : le compte est l'admin de test de la prévisualisation (`delivered+admin-recette@resend.dev`, dans
// GROUPE_ADMINS de la branche seulement, à retirer avant la production : MISE-EN-PROD.md, section 0) et le cycle complet
// se joue en ligne : tableau de bord (code par e-mail), jeu de test, clôture, réponses, résultats, commande, recommande,
// fin d'essai, paywall, paiement, échec de paiement, puis tout est effacé.
//
// Le navigateur doit faire confiance au certificat du proxy de la session s'il y en a un (magasin NSS), jamais
// `ignoreHTTPSErrors`.
import { chromium, devices } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , APPAREIL = "se", OUT = "./captures"] = process.argv;
const BASE = process.env.RECETTE_BASE ?? "https://test.mobiiz.fr";
const ICI = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ICI, "../../../apps/web/e2e/fixtures");
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

/** Chaque page suivie : erreurs de la console, exceptions, réponses en erreur de l'API (5xx toujours ; 4xx inattendues). */
function surveiller(page, qui) {
  page.on("console", (m) => {
    // La page de paiement hébergée par Stripe a ses propres erreurs (Amazon Pay, carte refusée) : hors de l'app.
    if (m.type() === "error" && !page.url().startsWith("https://checkout.stripe.com")) anomalies.push({ qui, url: page.url(), type: "console", texte: m.text().slice(0, 300) });
  });
  page.on("pageerror", (e) => anomalies.push({ qui, url: page.url(), type: "exception", texte: String(e.message).slice(0, 300) }));
  page.on("response", (r) => {
    const u = r.url();
    const apiInattendue = r.status() >= 400 && r.status() !== 401 && u.startsWith(BASE) && /\/v1\//.test(u);
    if (r.status() >= 500 || apiInattendue || (r.status() >= 400 && /\/_next\/|\.js$|\.css$|\.png$|\.jpg$|\.svg$|\.woff2?$/.test(u))) anomalies.push({ qui, url: page.url(), type: `http ${r.status()}`, texte: `${r.request().method()} ${u.replace(BASE, "").slice(0, 160)}` });
    if (r.status() >= 500 && u.startsWith(BASE)) void r.text().then((t) => anomalies.push({ qui, url: page.url(), type: `corps ${r.status()}`, texte: t.slice(0, 300) })).catch(() => {});
  });
  return page;
}

/** ZÉRO RESTE : ni « BatiClair », ni marque de travail ou de test, ni valeur cassée à l'écran (hors mode démo et mode test Stripe). */
const RESTES = [
  [/batiClair/i, "« BatiClair » visible"],
  [/A_COMPLETER|\[A COMPL/i, "information légale à compléter"],
  [/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b(?! *€)/, "valeur cassée"],
  [/lorem ipsum|\bTODO\b|\bFIXME\b/i, "texte provisoire"],
  [/\be2e\b|fixture|@example\.(fr|com)/i, "texte de test"],
];
async function zeroReste(page, ecran) {
  const corps = await page.evaluate(() => document.body.innerText);
  for (const [re, quoi] of RESTES) {
    const m = re.exec(corps);
    if (m) anomalies.push({ qui: ecran, url: page.url(), type: "reste", texte: `${quoi} : « ${corps.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ")} »` });
  }
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (sw > iw + 1) anomalies.push({ qui: ecran, url: page.url(), type: "débordement", texte: `${sw} px > ${iw} px` });
}

/** Les liens de la page : un lien interne répond (< 400), une ancre existe, un lien externe est connu. */
const vus = new Map();
const EXTERNES = /^(mailto:|tel:|sms:|https:\/\/(wa\.me|api\.whatsapp\.com|www\.legifrance\.gouv\.fr|www\.cnil\.fr|ec\.europa\.eu|www\.economie\.gouv\.fr|vercel\.com|stripe\.com|resend\.com|www\.anthropic\.com|neon\.tech|annuaire-entreprises\.data\.gouv\.fr|www\.service-public\.fr|www\.mediateur-conso\.fr|cm2c\.net|www\.cm2c\.net|www\.sirene\.fr|recherche-entreprises\.api\.gouv\.fr|support\.apple\.com|support\.google\.com))/;
async function liens(page, ecran) {
  const hrefs = await page.locator("a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href") ?? ""))]);
  for (const href of hrefs) {
    if (!href || href.startsWith("#")) {
      if (href.length > 1 && !(await page.locator(href).count())) anomalies.push({ qui: ecran, url: page.url(), type: "lien mort", texte: `ancre ${href} absente` });
      continue;
    }
    if (href.startsWith("/") || href.startsWith(BASE)) {
      const url = href.startsWith("/") ? BASE + href : href;
      if (/\/v1\/me\/export|\/v1\/abonnement\/factures\/|\/v1\/.*\.pdf/.test(url)) continue; // téléchargements derrière la session : vérifiés à part
      if (!vus.has(url)) {
        const r = await page.request.get(url, { maxRedirects: 5 }).catch(() => null);
        vus.set(url, r ? r.status() : 0);
      }
      if (!(vus.get(url) < 400)) anomalies.push({ qui: ecran, url: page.url(), type: "lien mort", texte: `${href} → ${vus.get(url)}` });
    } else if (!EXTERNES.test(href)) anomalies.push({ qui: ecran, url: page.url(), type: "lien externe inattendu", texte: href });
  }
}
async function ouvrir(page, chemin, ecran) {
  await page.goto(chemin.startsWith("http") ? chemin : BASE + chemin, { waitUntil: "networkidle", timeout: 60000 });
  if (await page.getByText(/Oups, cet écran a eu un souci|Page introuvable/).count()) throw new Error(`${ecran} : écran d'erreur`);
  await zeroReste(page, ecran);
  await liens(page, ecran);
}

/** L'API de l'app, comme le navigateur (session, entreprise active). */
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

/** Les e-mails réellement envoyés par Resend à cette adresse, du plus ancien au plus récent (texte compris). */
function resend(chemin) {
  const out = execFileSync("curl", ["-sS", "-H", `Authorization: Bearer ${process.env.RESEND_API_KEY}`, `https://api.resend.com${chemin}`], { encoding: "utf8" });
  return JSON.parse(out);
}
const lus = new Map();
async function emailsVers(adresse, attendre = null, timeout = 90000) {
  const fin = Date.now() + timeout;
  for (;;) {
    const liste = (resend("/emails?limit=100").data ?? []).filter((e) => (e.to ?? []).map((x) => x.toLowerCase()).includes(adresse.toLowerCase()));
    const complets = [];
    for (const e of liste) {
      if (!lus.has(e.id)) lus.set(e.id, resend(`/emails/${e.id}`));
      complets.push(lus.get(e.id));
    }
    complets.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (!attendre || complets.some(attendre) || Date.now() > fin) return complets;
    await t(4000);
  }
}
const lienDans = (mail, motif) => {
  const s = `${mail.text ?? ""}\n${mail.html ?? ""}`;
  const m = new RegExp(`https://[^\\s"'<>]*(?:${motif})[^\\s"'<>]*`).exec(s);
  return m ? m[0].replace(/&amp;/g, "&") : null;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const contexte = await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris", acceptDownloads: true });
const page = surveiller(await contexte.newPage(), `artisan-${APPAREIL}`);
const ADMIN = process.env.RECETTE_ADMIN === "1";
const EMAIL = ADMIN ? "delivered+admin-recette@resend.dev" : `delivered+artisan-${APPAREIL}-${ts}@resend.dev`;
const NEGOCE = `delivered+negoce-${APPAREIL}-${ts}@resend.dev`;
const ENTREPRISE = `Toitures Recette ${APPAREIL === "se" ? "SE" : "Ordi"}`;

// 1. Le visiteur : chaque page publique, liens, zéro reste.
for (const [nom, chemin] of [
  ["landing", "/"],
  ["tarifs", "/tarifs"],
  ["inscription", "/inscription"],
  ["connexion", "/connexion"],
  ["mot de passe oublié", "/mot-de-passe-oublie"],
  ["CGU", "/cgu"],
  ["mentions légales", "/mentions-legales"],
  ["confidentialité", "/confidentialite"],
  ["conditions négoce", "/conditions-negoce"],
  ["connexion négoce", "/negoce/connexion"],
  ["adresse inconnue", "/nulle-part"],
]) {
  await etape(`Visiteur : ${nom}`, page, async () => {
    if (nom === "adresse inconnue") {
      await page.goto(BASE + chemin, { waitUntil: "networkidle" });
      verif(await page.getByText("Page introuvable").count(), "la page introuvable ne s'affiche pas en français");
      return "« Page introuvable »";
    }
    await ouvrir(page, chemin, `visiteur ${nom}`);
    const robots = (await page.request.get(BASE + chemin)).headers()["x-robots-tag"] ?? "";
    verif(/noindex/.test(robots), `pas de noindex (${robots})`);
  });
}

await etape("Landing : accroche, prix, inscription, aucune démo d'office", page, async () => {
  await ouvrir(page, "/", "landing");
  verif(!(await page.getByText("Démo · écran").count()), "la démo s'ouvre d'office");
  await voir(page.getByText("Par un artisan, pour les artisans."));
  await voir(page.getByRole("heading", { level: 1 }));
  await voir(page.getByRole("link", { name: "Je rejoins le mouvement" }));
  await voir(page.getByText(/^Dès 29 € par mois/));
});
await etape("Landing : « Voir comment ça marche (30 s) », trois métiers, Passer", page, async () => {
  await page.getByRole("button", { name: "Voir comment ça marche (30 s)" }).click();
  const demo = page.getByRole("dialog", { name: "Démo" });
  await voir(demo);
  for (const m of ["Plomberie", "Placo", "Couverture"]) {
    await demo.getByRole("tab", { name: m }).click();
    await voir(demo.getByRole("list", { name: `Liste de fournitures (exemple ${m.toLowerCase()})` }));
  }
  await demo.getByRole("button", { name: "Suivant" }).click();
  await demo.getByRole("button", { name: "Suivant" }).click();
  await voir(demo.getByRole("link", { name: "Je rejoins le mouvement" }));
  await zeroReste(page, "démo");
  await demo.getByRole("button", { name: "Passer" }).click();
});

// 2. L'inscription artisan, le guide.
await etape("Inscription artisan", page, async () => {
  await page.getByRole("link", { name: "Je rejoins le mouvement" }).first().click();
  await page.waitForURL(/\/inscription/);
  await page.getByLabel("Prénom et nom").fill("Jean Recette");
  await page.getByLabel("Nom de ton entreprise").fill(ENTREPRISE);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  await page.getByLabel("E-mail professionnel").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(`Recette-${ts}-solide`);
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await voir(page.getByRole("dialog", { name: "Guide" }), 30000);
  return EMAIL;
});
await etape("Guide : trois écrans, prochaine clôture, « Déposer ma première liste »", page, async () => {
  const guide = page.getByRole("dialog", { name: "Guide" });
  await voir(guide.getByRole("heading", { name: "Dépose ta liste ou ton devis" }));
  const cloture = await guide.getByText(/^Prochaine clôture :/).innerText();
  await zeroReste(page, "guide 1");
  await guide.getByRole("button", { name: "Suivant" }).click();
  await voir(guide.getByRole("heading", { name: "On la regroupe avec celles des autres artisans du secteur" }));
  await guide.getByRole("button", { name: "Suivant" }).click();
  await voir(guide.getByRole("heading", { name: "Tu reçois les prix le jour J et tu commandes si ça te va" }));
  await guide.getByRole("link", { name: "Déposer ma première liste" }).click();
  await page.waitForURL(/\/chantiers\/nouveau/);
  return cloture.replace(/\s+/g, " ");
});
await etape("Guide : ne revient pas ; « Revoir le guide » dans le menu", page, async () => {
  await ouvrir(page, "/", "accueil");
  await t(1500);
  verif(!(await page.getByRole("dialog", { name: "Guide" }).count()), "le guide revient");
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menuitem", { name: "Revoir le guide" }).click();
  await voir(page.getByRole("dialog", { name: "Guide" }));
  await page.getByRole("button", { name: "Passer le guide" }).click();
});

// 3. Les e-mails d'inscription, la confirmation de l'adresse.
await etape("E-mail réel : confirmer l'adresse", page, async () => {
  const mails = await emailsVers(EMAIL, (m) => !!lienDans(m, "verif|confirm|verify"));
  verif(mails.length > 0, "aucun e-mail reçu");
  const mail = mails.find((m) => lienDans(m, "verif|confirm|verify"));
  verif(mail, `pas de lien de confirmation (reçus : ${mails.map((m) => m.subject).join(" / ")})`);
  verif(/mobiiz\.fr/.test(mail.from ?? ""), `expéditeur ${mail.from}`);
  verif(!/BatiClair/i.test(`${mail.subject} ${mail.text} ${mail.html}`), "« BatiClair » dans l'e-mail");
  await page.goto(lienDans(mail, "verif|confirm|verify"), { waitUntil: "networkidle" });
  await zeroReste(page, "confirmation e-mail");
  return `${mails.length} e-mail(s) : ${mails.map((m) => `« ${m.subject} »`).join(", ")}`;
});

// 4. L'entreprise au groupe (SIRET, adresse), comme dans « Regroupement ».
await etape("Regroupement : SIRET et adresse", page, async () => {
  await ouvrir(page, "/groupe", "regroupement");
  const p = await api(page, "PATCH", "/v1/company/profile", { name: ENTREPRISE, address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: null, email: null });
  verif(p.status === 200, `profil ${p.status}`);
  const s = await api(page, "POST", "/v1/groupe/siret");
  verif(s.status === 200, `SIRET ${s.status} ${JSON.stringify(s.body)}`);
  await ouvrir(page, "/groupe", "regroupement");
});

// 5. Dépôt d'une liste (photo), vraie lecture.
let projetListe = null;
await etape("Dépôt d'une liste (photo manuscrite), vraie lecture", page, async () => {
  await ouvrir(page, "/chantiers/nouveau", "nouvelle liste");
  await page.getByLabel("Déposer ma liste").setInputFiles(path.join(FIX, "liste-manuscrite.png"));
  await page.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 120000 });
  projetListe = new URL(page.url()).pathname.split("/")[2];
  await voir(page.getByRole("region", { name: "Liste des fournitures" }), 180000);
  await zeroReste(page, "liste lue");
  return `${await page.getByRole("region", { name: "Liste des fournitures" }).getByRole("listitem").count()} lignes`;
});
await etape("Liste : ajouter au regroupement", page, async () => {
  const bloc = page.getByRole("region", { name: /^Regroupement d/ });
  await voir(bloc);
  await bloc.getByRole("button", { name: /^Ajouter à la commande d/ }).click();
  const list = page.getByRole("region", { name: "Liste des fournitures" });
  const boxes = list.getByRole("checkbox", { name: /^Ajouter à la commande : / }).and(page.locator(":enabled"));
  verif((await boxes.count()) > 0, "aucune ligne à cocher (lignes vagues ?)");
  for (const box of await boxes.all()) await box.check();
  const bar = page.getByRole("region", { name: /^Ajouter à la commande/ }).last();
  await bar.getByRole("radio", { name: "Un chantier signé" }).click();
  const adresse = bar.getByLabel(/Adresse du chantier/);
  if (await adresse.count()) await adresse.fill("3 rue des Ajoncs, 22300 Lannion");
  await bar.getByRole("button", { name: "Ajouter" }).click();
  await voir(page.getByRole("region", { name: /^Dans la commande d/ }));
  await zeroReste(page, "dans la commande");
});

// 6. Dépôt d'un devis (PDF), vraie lecture, questions, liste.
await etape("Dépôt d'un devis (PDF), vraie lecture, questions, liste", page, async () => {
  await ouvrir(page, "/chantiers/nouveau", "nouvelle liste");
  await voir(page.getByText("Je n'ai qu'un devis", { exact: true }));
  await page.getByLabel("Déposer mon devis").setInputFiles(path.join(FIX, "devis-client-couvreur.pdf"));
  await page.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 120000 });
  const liste = page.getByRole("region", { name: /Page des fournitures|Liste des fournitures/ });
  const questions = page.getByRole("region", { name: "Les questions" });
  await voir(liste.or(questions), 240000);
  if (await questions.isVisible()) {
    await zeroReste(page, "questions");
    const faconne = questions.getByRole("button", { name: /^Je façonne/ });
    for (let i = 0; i < (await faconne.count()); i++) await faconne.nth(i).click();
    await page.getByRole("button", { name: /^Calculer ma liste/ }).click();
  }
  await voir(page.getByRole("region", { name: "Liste des fournitures" }), 240000);
  await zeroReste(page, "ton chantier");
  return `${await page.getByRole("region", { name: "Liste des fournitures" }).getByRole("listitem").count()} lignes`;
});
await etape("Ton chantier : aperçu du PDF fournisseur", page, async () => {
  const apercu = page.getByRole("button", { name: "Aperçu" });
  if (!(await apercu.count())) return "pas d'aperçu sur cet écran";
  await apercu.first().click();
  await t(1500);
  await zeroReste(page, "aperçu");
  await page.keyboard.press("Escape");
});

// 7. Le négoce dans la boucle, son invitation réelle, son inscription, son espace.
let lienNegoce = null;
await etape("Accueil : mettre son négoce dans la boucle", page, async () => {
  await ouvrir(page, "/", "accueil");
  const bloc = page.getByRole("region", { name: "Mets ton négoce dans la boucle" });
  await voir(bloc);
  await bloc.getByLabel("E-mail de ton négoce").fill(NEGOCE);
  await bloc.getByRole("button", { name: "Ajouter mon négoce" }).click();
  await voir(bloc.getByRole("list", { name: "Négoces dans la boucle" }).getByRole("listitem"));
  await zeroReste(page, "boucle négoce");
});
await etape("E-mail réel : invitation du négoce", page, async () => {
  const mails = await emailsVers(NEGOCE, (m) => !!lienDans(m, "/negoce/rejoindre/"));
  const mail = mails.find((m) => lienDans(m, "/negoce/rejoindre/"));
  verif(mail, `pas d'invitation (reçus : ${mails.map((m) => m.subject).join(" / ")})`);
  verif(!(`${mail.text}${mail.html}`.includes(ENTREPRISE)), "le nom de l'artisan est dans l'invitation");
  lienNegoce = lienDans(mail, "/negoce/rejoindre/");
  verif(lienNegoce.startsWith(BASE), `lien vers ${lienNegoce}`);
  return `« ${mail.subject} »`;
});
const ctxN = await browser.newContext({ ...options, locale: "fr-FR", timezoneId: "Europe/Paris" });
const pageN = surveiller(await ctxN.newPage(), `negoce-${APPAREIL}`);
await etape("Négoce : créer son accès depuis l'invitation", pageN, async () => {
  verif(lienNegoce, "pas de lien");
  await ouvrir(pageN, lienNegoce, "négoce rejoindre");
  const form = pageN.getByRole("form", { name: "Créer mon accès" });
  await form.getByLabel("Nom de l'enseigne").fill(`Négoce Recette ${APPAREIL}`);
  await form.getByLabel("Adresse du dépôt 1").fill("Zone de Kerampont, 22300 Lannion");
  await form.getByLabel("Livraison gratuite jusqu'à, en km").fill("20");
  await form.getByLabel("Prix du palier 1, en euros HT").fill("50");
  await form.getByLabel("Distance du palier 1, en km").fill("1000");
  await form.getByLabel("Distance maximale de livraison, en km").fill("1000");
  await form.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  // Multimétier (25 octobre 2026) : le négoce dit ce qu'il chiffre ; ici un spécialiste couverture et second œuvre.
  verif(await form.getByRole("button", { name: "Créer mon accès" }).isDisabled(), "l'accès se crée sans choix généraliste / spécialiste");
  await form.getByRole("radio", { name: "Spécialiste : je chiffre seulement mes familles" }).check();
  const familles = form.getByRole("group", { name: "Mes familles" });
  await familles.getByRole("checkbox", { name: "Couverture" }).check();
  await familles.getByRole("checkbox", { name: /^Second œuvre/ }).check();
  await zeroReste(pageN, "négoce : ce que vous chiffrez");
  await form.getByRole("button", { name: "Créer mon accès" }).click();
  await voir(pageN.getByRole("status"));
  return (await pageN.getByRole("status").first().innerText()).replace(/\s+/g, " ");
});
await etape("Négoce : son espace (prochaine clôture, aucun nom d'artisan)", pageN, async () => {
  await ouvrir(pageN, "/negoce", "espace négoce");
  await voir(pageN.getByRole("region", { name: "Prochaine clôture" }));
  verif(!(await pageN.getByText(ENTREPRISE).count()), "nom d'artisan visible");
  for (const [nom, chemin] of [["conditions négoce", "/negoce/conditions"]]) await ouvrir(pageN, chemin, nom);
});
await ctxN.close();

// 7 bis. L'admin de test : le cycle complet en ligne (Greg, 25 octobre 2026 : « autorisé en prévisualisation seulement »).
const demo = () => page.getByRole("region", { name: "Démo" });
async function geste(label, attendu) {
  await demo().getByRole("button", { name: label }).click();
  await voir(demo().getByRole("status").filter({ hasText: attendu }), 90000);
  return (await demo().getByRole("status").innerText()).replace(/\s+/g, " ");
}
if (ADMIN) {
  await etape("Admin : tableau de bord, code reçu par e-mail", page, async () => {
    await ouvrir(page, "/admin/pilotage", "pilotage");
    const depuis = Date.now();
    await page.getByRole("button", { name: "Recevoir mon code" }).click();
    await voir(page.getByLabel("Code reçu par e-mail"));
    const mails = await emailsVers(EMAIL, (m) => /code d'accès au pilotage/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000);
    const mail = mails.filter((m) => /code d'accès au pilotage/.test(m.subject)).at(-1);
    verif(mail, "pas de code reçu");
    await page.getByLabel("Code reçu par e-mail").fill(/(\d{6})/.exec(mail.text)[1]);
    await page.getByRole("button", { name: "Ouvrir le tableau de bord" }).click();
    for (const titre of ["Utilisateurs actifs", "Abonnés payants", "Revenu mensuel récurrent", "Coût IA du mois"]) await voir(page.getByText(titre, { exact: true }));
    await voir(demo());
    await zeroReste(page, "tableau de bord");
  });
  await etape("Admin : jeu de test (5 faux artisans, 3 faux négoces)", page, async () => {
    await demo().getByRole("button", { name: "Tout effacer" }).click();
    await voir(demo().getByRole("status").filter({ hasText: "Effacé" }), 60000);
    return geste("Créer un jeu de test", "faux artisans");
  });
  await etape("Admin : clôturer maintenant (grilles envoyées aux négoces)", page, async () => geste("Clôturer maintenant", "grilles envoyées"));
  await etape("Admin : faire répondre les négoces", page, async () => geste("Faire répondre les négoces", "ont répondu"));
  await etape("Admin : publier les résultats", page, async () => geste("Publier les résultats", "publié"));
  await etape("Résultats : e-mail réel et prix classés dans l'app", page, async () => {
    const mails = await emailsVers(EMAIL, (m) => /résultat|prix/i.test(m.subject) && !/code/.test(m.subject), 90000);
    const mail = mails.filter((m) => /résultat|prix/i.test(m.subject) && !/code/.test(m.subject)).at(-1);
    verif(mail, `pas d'e-mail de résultats (reçus : ${mails.map((m) => m.subject).join(" / ")})`);
    await ouvrir(page, "/groupe", "résultats");
    const prix = page.getByRole("region", { name: "Tes prix" });
    await voir(prix.getByRole("radio"), 30000);
    await zeroReste(page, "tes prix");
    return `« ${mail.subject} » ; ${await prix.getByRole("radio").count()} négoces classés`;
  });
  await etape("Commande : la meilleure combinaison, chaque négoce reçoit sa part", page, async () => {
    // Multimétier (25 octobre 2026) : les 2 ou 3 meilleures options livrées, « Tout chez … » parmi elles.
    const prix = page.getByRole("region", { name: "Tes prix" });
    await voir(prix.getByRole("radio", { name: /^Tout chez / }).first(), 30000);
    await voir(prix.getByText("La moins chère"));
    const options = (await prix.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.closest("label")?.textContent ?? ""))).map((t) => t.replace(/\s+/g, " ").trim());
    await prix.getByRole("button", { name: /^Commander : / }).first().click();
    const confirmation = prix.getByRole("group", { name: "Confirmer la commande" });
    await voir(confirmation.getByText(/tu transmets tes coordonnées/));
    await confirmation.getByRole("button", { name: "Confirmer la commande" }).click();
    await voir(prix.getByRole("status").filter({ hasText: /^Commandé : / }), 60000);
    console.log(`   options : ${options.join(" | ")}`);
    return (await prix.getByRole("status").innerText()).replace(/\s+/g, " ");
  });
  await etape("Recommande : au prix garanti 30 jours", page, async () => {
    await ouvrir(page, "/groupe", "garantie");
    const garantie = page.getByRole("region", { name: /^Prix garantis jusqu'au/ }).first();
    await voir(garantie, 30000);
    await garantie.getByRole("button", { name: "Recommander à ce prix" }).click();
    const form = garantie.getByRole("form", { name: "Recommander à ce prix" });
    await form.getByRole("spinbutton").or(form.getByRole("textbox", { name: /^(?!Adresse)/ })).first().fill("10");
    await form.getByLabel("Adresse de livraison (avec le code postal)").fill("3 rue des Ajoncs, 22300 Lannion");
    await form.getByRole("button", { name: /^Commander chez / }).click();
    await form.getByRole("group", { name: "Confirmer la commande" }).getByRole("button", { name: "Confirmer la commande" }).click();
    await voir(garantie.getByRole("status").filter({ hasText: /^C'est commandé : bon n° / }), 60000);
    return (await garantie.getByRole("status").innerText()).replace(/\s+/g, " ");
  });
  await etape("Admin : finir l'essai, puis le paywall au dépôt", page, async () => {
    await ouvrir(page, "/admin/pilotage", "pilotage");
    await geste("Finir l'essai", "essai est terminé");
    // Le paywall s'ouvre au geste payant : déposer une liste.
    await ouvrir(page, "/chantiers/nouveau", "nouvelle liste");
    await page.getByLabel("Déposer ma liste").setInputFiles(path.join(FIX, "liste-manuscrite.png"));
    await voir(page.getByText(/Ton essai est terminé/), 60000);
    await zeroReste(page, "paywall");
    await ouvrir(page, "/groupe", "résultats après l'essai");
    await voir(page.getByRole("region", { name: "Tes prix" }));
    return "paywall au dépôt, résultats publiés toujours visibles";
  });
}

// 8. L'abonnement, en vrai Stripe (mode test) : refusé, payé, factures, annuel, résiliation.
async function payerStripe(carte) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
  // La page de Stripe range les moyens de paiement en liste : « Carte » d'abord, puis le numéro.
  await t(3000);
  if (!(await page.locator("#cardNumber").isVisible())) {
    const radio = page.getByRole("radio", { name: /^Carte/ });
    if (await radio.count()) await radio.first().check({ force: true }).catch(() => undefined);
  }
  if (!(await page.locator("#cardNumber").isVisible())) await page.getByText("Carte", { exact: true }).first().click({ force: true }).catch(() => undefined);
  await voir(page.locator("#cardNumber"), 60000);
  await page.locator("#cardNumber").fill(carte);
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  const nom = page.locator("#billingName");
  if (await nom.count()) await nom.fill("Jean Recette");
  const pays = page.locator("#billingCountry");
  if (await pays.count()) await pays.selectOption("FR").catch(() => undefined);
  for (const [id, v] of [["#billingAddressLine1", "3 rue des Ajoncs"], ["#billingLocality", "Lannion"]]) {
    const champ = page.locator(id);
    if ((await champ.count()) && (await champ.isVisible())) await champ.fill(v);
  }
  const cp = page.locator("#billingPostalCode");
  if ((await cp.count()) && (await cp.isVisible())) await cp.fill("22300");
  await page.locator('[data-testid="hosted-payment-submit-button"]').click();
}
await etape("Abonnement : essai et deux formules", page, async () => {
  await ouvrir(page, "/abonnement", "abonnement");
  await voir(page.getByText("Essai gratuit", { exact: true }).or(page.getByText(/essai est terminé/i)));
  await voir(page.getByRole("radio", { name: /Annuel/ }));
  await page.getByRole("radio", { name: /Mensuel/ }).click();
});
await etape("Stripe : carte refusée (4000 0000 0000 0002)", page, async () => {
  await page.getByRole("button", { name: /^(M'abonner dès maintenant|Je continue)$/ }).first().click();
  await payerStripe("4000000000000002");
  await voir(page.getByText(/refusée|declined/i), 60000);
  return "Stripe dit le refus ; rien n'est payé";
});
await etape("Stripe : carte acceptée (4242), retour « Abonné au mois »", page, async () => {
  await page.locator("#cardNumber").fill("");
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator('[data-testid="hosted-payment-submit-button"]').click();
  await page.waitForURL((u) => u.toString().startsWith(BASE), { timeout: 90000 });
  for (let i = 0; i < 12 && !(await page.getByText("Abonné au mois", { exact: true }).count()); i++) {
    await t(5000);
    await page.reload({ waitUntil: "networkidle" });
  }
  await voir(page.getByText("Abonné au mois", { exact: true }), 5000);
  await zeroReste(page, "abonné au mois");
});
await etape("Factures : la facture du mois, téléchargeable", page, async () => {
  await page.getByRole("tab", { name: "Mes factures" }).click();
  const factures = page.getByRole("list", { name: "Mes factures" });
  await voir(factures.getByRole("listitem"), 30000);
  const lien = factures.getByRole("link", { name: "Télécharger" }).first();
  const href = await lien.getAttribute("href");
  const r = await page.request.get(href.startsWith("http") ? href : BASE + href);
  verif(r.ok() && /pdf/.test(r.headers()["content-type"] ?? ""), `facture ${r.status()} ${r.headers()["content-type"]}`);
  await zeroReste(page, "factures");
  return (await factures.innerText()).replace(/\s+/g, " ").slice(0, 160);
});
await etape("Passage à l'annuel au prorata", page, async () => {
  await page.getByRole("tab", { name: "Mon abonnement" }).click();
  await page.getByRole("button", { name: "Passer à l'annuel" }).click();
  await page.getByRole("button", { name: /^Oui, payer / }).click();
  for (let i = 0; i < 12 && !(await page.getByText("Abonné à l'année", { exact: true }).count()); i++) {
    await t(5000);
    await page.reload({ waitUntil: "networkidle" });
  }
  await voir(page.getByText("Abonné à l'année", { exact: true }), 5000);
  await voir(page.getByText(/348 € HT par an/));
});
if (ADMIN) {
  await etape("Admin : simuler un échec de paiement (grâce de 7 jours)", page, async () => {
    await ouvrir(page, "/admin/pilotage", "pilotage");
    await geste("Simuler un échec de paiement", "7 jours de grâce");
    const mails = await emailsVers(EMAIL, (m) => /n'est pas passé/.test(m.subject), 60000);
    verif(mails.some((m) => /n'est pas passé/.test(m.subject)), "pas d'e-mail d'échec");
    await ouvrir(page, "/abonnement", "abonnement en grâce");
    return (await page.getByRole("main").innerText()).replace(/\s+/g, " ").slice(0, 160);
  });
}
await etape("Résiliation en deux clics", page, async () => {
  await page.getByRole("button", { name: "Résilier" }).click();
  await page.getByRole("button", { name: "Oui, résilier" }).click();
  await voir(page.getByText(/^Résilié : ton accès reste jusqu'au/), 30000);
});
await etape("E-mails réels de l'abonnement", page, async () => {
  const mails = await emailsVers(EMAIL, (m) => /résili/i.test(m.subject), 60000);
  return mails.map((m) => `« ${m.subject} »`).join(", ");
});

// 9. Le chantier fictif (démo), le compte : export, e-mails, suppression.
await etape("Menu : « Essayer avec un chantier fictif »", page, async () => {
  await ouvrir(page, "/", "accueil");
  await page.getByRole("button", { name: "Mon menu" }).click();
  await page.getByRole("menuitem", { name: "Essayer avec un chantier fictif" }).click();
  await page.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 60000 });
  await voir(page.getByRole("region", { name: /^(Liste des fournitures|Les questions)$/ }), 60000);
  await zeroReste(page, "chantier fictif");
});
for (const [nom, chemin] of [["mes chantiers", "/chantiers"], ["fournisseurs", "/fournisseurs"], ["formules", "/formules"], ["compte", "/compte"]]) {
  await etape(`Écran : ${nom}`, page, async () => ouvrir(page, chemin, nom));
}
await etape("Compte : export JSON et PDF", page, async () => {
  await ouvrir(page, "/compte", "compte");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  const nom = (await download).suggestedFilename();
  verif(/^mobiiz-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/.test(nom), nom);
  const pdf = await page.request.get(`${BASE}/v1/me/export.pdf`);
  verif(/pdf/.test(pdf.headers()["content-type"] ?? ""), `export PDF ${pdf.status()}`);
  return nom;
});
if (ADMIN) {
  await etape("Admin : tout effacer (faux comptes)", page, async () => {
    await ouvrir(page, "/admin/pilotage", "pilotage");
    await demo().getByRole("button", { name: "Tout effacer" }).click();
    await voir(demo().getByRole("status").filter({ hasText: "Effacé" }), 60000);
    return (await demo().getByRole("status").innerText()).replace(/\s+/g, " ");
  });
}
await etape("Compte : suppression (en tapant SUPPRIMER)", page, async () => {
  if (!/\/compte$/.test(new URL(page.url()).pathname)) await ouvrir(page, "/compte", "compte");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await voir(page.getByText("Ton compte et toutes ses données ont été supprimés."), 30000);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  verif((await page.getByRole("link", { name: "Je rejoins le mouvement" }).count()) || /\/connexion/.test(page.url()), "toujours connecté");
  verif(!(await page.getByRole("button", { name: "Mon menu" }).count()), "l'app s'ouvre encore");
});

await browser.close();
const bilan = { appareil: APPAREIL, base: BASE, date: new Date().toISOString(), etapes: journal, anomalies };
writeFileSync(path.join(OUT, "journal.json"), JSON.stringify(bilan, null, 2));
console.log(`\n${journal.filter((j) => j.statut === "ok").length}/${journal.length} étapes ok ; ${anomalies.length} anomalies`);
for (const a of anomalies) console.log(`  · [${a.type}] ${a.qui} ${a.url.replace(BASE, "")} : ${a.texte}`);
