// TEST RÉEL DU CIRCUIT ENTRANT (Greg, 11 novembre 2026 : « Réception des réponses négoces […] une vérification réelle »).
// Sur test.mobiiz.fr et api-test.mobiiz.fr SEULEMENT. De vrais e-mails partent par Resend, de `recette@mobiiz.fr` (notre
// domaine) vers l'adresse Mobiiz d'une entreprise DE TEST créée pour l'occasion : aucun vrai négoce, aucun paiement, aucun
// appel IA. Les « négoces » de la demande sont des boîtes de test Resend (`delivered+…@resend.dev`).
//
// SANS `--envoyer`, LE SCRIPT N'ENVOIE RIEN : il imprime le plan et vérifie seulement (en lecture) que le seul webhook
// entrant de Resend pointe vers api-test.mobiiz.fr.
//
//   RESEND_API_KEY=… node docs/groupe/recette-en-ligne/reception-negoce.mjs <dossier-captures> [--envoyer]
//
// Ce qui est vérifié avec `--envoyer` :
//   1. un vrai e-mail avec un PDF, écrit à l'adresse étiquetée du négoce 1, arrive sur LE BON quantitatif, LE BON négoce ;
//   2. son PDF devient le devis reçu du négoce 1, jamais du négoce 2 ; la cloche porte une alerte courte ;
//   3. le MÊME e-mail renvoyé (doublon) est gardé, mais ne remplace ni ne double le devis ;
//   4. une réponse au négoce 2 sans étiquette dans l'adresse, avec le repère dans l'objet, va au négoce 2 ;
//   5. un e-mail sans aucun repère arrive dans « Mes reçus », non rattaché, puis se rattache à la main ;
//   6. un e-mail à une adresse que personne n'a est mis de côté (admin), et n'apparaît chez aucun artisan ;
//   7. une autre entreprise ne lit ni l'e-mail ni son fichier (404) ;
//   8. la production n'a rien reçu : aucun webhook Resend ne pointe ailleurs que sur api-test.mobiiz.fr.
// Envois : environ 20 e-mails (confirmations, deux demandes, cinq e-mails de test, les avis à l'artisan) sur le plafond
// gratuit de 100 par jour ; coût : 0 €. Comptes de test supprimés à la fin (sauf GARDER=1).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const ENVOYER = args.includes("--envoyer");
const OUT = args.find((x) => !x.startsWith("--")) ?? "./captures-reception";
const BASE = "https://test.mobiiz.fr";
const API = "https://api-test.mobiiz.fr";
const DOMAINE = "mobiiz.fr";
const ts = Date.now().toString(36);
const t = (ms) => new Promise((r) => setTimeout(r, ms));
const verif = (cond, message) => {
  if (!cond) throw new Error(message);
};
const resend = (chemin, corps) =>
  JSON.parse(execFileSync("curl", ["-sS", "-H", `Authorization: Bearer ${process.env.RESEND_API_KEY}`, ...(corps ? ["-H", "Content-Type: application/json", "-d", JSON.stringify(corps)] : []), `https://api.resend.com${chemin}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

// 8 (et garde avant tout envoi) : le circuit entrant ne touche que le test.
const webhooks = (resend("/webhooks").data ?? []).filter((w) => (w.events ?? []).includes("email.received") && w.status !== "disabled");
console.log("Webhooks entrants Resend :", webhooks.map((w) => w.endpoint).join(", ") || "(aucun)");
const horsTest = webhooks.filter((w) => !w.endpoint.startsWith(`${API}/`));
if (horsTest.length) {
  console.log("ARRÊT : un webhook entrant pointe ailleurs que sur le test. Rien n'est envoyé.");
  process.exit(2);
}
if (!webhooks.length) {
  console.log("ARRÊT : aucun webhook entrant vers api-test.mobiiz.fr. Rien n'est envoyé.");
  process.exit(2);
}
if (!ENVOYER) {
  console.log("\nPLAN SEULEMENT (ajoute --envoyer pour l'exécuter, après l'accord de Greg). Voir l'en-tête de ce fichier.");
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const journal = [];
let n = 0;
async function etape(nom, page, fn) {
  n++;
  try {
    const note = await fn();
    await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, "0")}.png`) }).catch(() => {});
    journal.push({ n, etape: nom, statut: "ok", detail: note ?? "" });
    console.log(`✓ ${n} ${nom}${note ? ` : ${note}` : ""}`);
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, "0")}-BUG.png`) }).catch(() => {});
    const message = String(e?.message ?? e).split("\n").slice(0, 3).join(" ").slice(0, 400);
    journal.push({ n, etape: nom, statut: "bug", detail: message });
    console.log(`✗ ${n} ${nom} : ${message}`);
  }
}
async function api(page, method, url, body) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const companyId = localStorage.getItem("baticlair.companyId");
      const res = await fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    { method, url, body },
  );
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
    complets.sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
    if (complets.some(attendre) || Date.now() > fin) return complets;
    await t(4000);
  }
}
const voir = (loc, timeout = 30000) => loc.first().waitFor({ state: "visible", timeout });
async function inscrire(page, email, entreprise, prenom) {
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
  await voir(page.getByRole("heading", { name: new RegExp(`^Bonjour ${prenom}`) }));
  const p = await api(page, "PATCH", "/v1/company/profile", { name: entreprise, address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: null, email: null });
  verif(p.status === 200, `profil ${p.status}`);
  const mails = await emailsVers(email, (m) => m.subject === "Confirme ton adresse e-mail");
  const lien = /https?:\/\/\S+/.exec(mails.filter((m) => m.subject === "Confirme ton adresse e-mail").at(-1)?.text ?? "")?.[0];
  verif(lien, "lien de confirmation absent");
  const onglet = await page.context().newPage();
  await onglet.goto(lien, { waitUntil: "networkidle" });
  await onglet.close();
}
async function supprimer(page) {
  await page.goto(`${BASE}/compte/donnees`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: /Supprimer définitivement|Supprimer mon compte/ }).last().click();
  await page.waitForURL((u) => !/\/compte/.test(u.pathname), { timeout: 30000 });
}
/** Un PDF d'une page, valide, écrit à la main : aucune donnée de client. */
function petitPdf(texte) {
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const flux = `BT /F1 14 Tf 60 780 Td (${texte.replace(/[()\\]/g, "")}) Tj ET`;
  objets[3] = `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const positions = [];
  objets.forEach((o, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1").toString("base64");
}
function envoyer({ de, a, objet, texte, pdf }) {
  const r = resend("/emails", { from: `${de} <recette@${DOMAINE}>`, to: [a], subject: objet, text: texte, ...(pdf ? { attachments: [{ filename: pdf, content: petitPdf(`DEVIS DE TEST ${ts} - Total HT 1 200,00`) }] } : {}) });
  verif(r.id, `envoi refusé : ${JSON.stringify(r).slice(0, 200)}`);
  return r.id;
}
/** Attend que la liste des reçus de l'artisan remplisse la condition (le webhook met quelques secondes). */
async function recus(page, condition, timeout = 180000) {
  const fin = Date.now() + timeout;
  for (;;) {
    const r = await api(page, "GET", "/v1/recus");
    const items = r.body?.items ?? [];
    if (condition(items) || Date.now() > fin) return items;
    await t(5000);
  }
}
const demandes = async (page, projectId) => (await api(page, "GET", `/v1/projects/${projectId}/price-requests`)).body?.items ?? [];

const A = `delivered+rn-a-${ts}@resend.dev`;
const B = `delivered+rn-b-${ts}@resend.dev`;
const ADMIN = "delivered+admin-recette@resend.dev";
const N1 = `delivered+rn-n1-${ts}@resend.dev`;
const N2 = `delivered+rn-n2-${ts}@resend.dev`;
const nouveau = async () => (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" })).newPage();
const a = await nouveau();
const b = await nouveau();
const adm = await nouveau();
let projectId, r1, r2, adresseA, reponse1, reponse2, etiquette2;

await etape("Deux entreprises de test, e-mail confirmé ; l'adresse Mobiiz de A", a, async () => {
  await inscrire(a, A, `Toitures Reception ${ts}`, "Alain");
  await inscrire(b, B, `Couverture Autre ${ts}`, "Bruno");
  const ad = await api(a, "GET", "/v1/company/adresse-mobiiz");
  verif(ad.status === 200 && ad.body?.adresse, `adresse ${ad.status}`);
  adresseA = String(ad.body.adresse).includes("@") ? String(ad.body.adresse) : `${ad.body.adresse}@${DOMAINE}`;
  return adresseA;
});

await etape("A : un quantitatif, deux négoces de test, deux demandes parties avec deux adresses de réponse distinctes", a, async () => {
  const q = (await api(a, "POST", "/v1/quantitatifs", { reference: `Reception ${ts}`, adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  verif(q?.projetId, "quantitatif non créé");
  let courant = (await api(a, "GET", `/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && courant.questions?.length > 0; i++) courant = (await api(a, "POST", `/v1/quantitatifs/${q.id}/reponses`, { reponses: [{ question: courant.questions[0].id, valeur: courant.questions[0].boutons[0]?.valeur ?? "ok" }] })).body;
  verif((await api(a, "POST", `/v1/quantitatifs/${q.id}/validation`)).status === 200, "validation refusée");
  projectId = q.projetId;
  const s1 = (await api(a, "POST", "/v1/suppliers", { name: "Négoce Test Un", email: N1 })).body;
  const s2 = (await api(a, "POST", "/v1/suppliers", { name: "Négoce Test Deux", email: N2 })).body;
  for (const s of [s1, s2]) {
    const d = await api(a, "POST", `/v1/projects/${projectId}/price-requests`, { supplierIds: [s.id] });
    verif(d.status === 201, `demande ${d.status} ${JSON.stringify(d.body).slice(0, 200)}`);
    const id = d.body.recipients[0].id;
    await api(a, "POST", `/v1/price-request-recipients/${id}/send`);
    if (s === s1) r1 = id;
    else r2 = id;
  }
  const m1 = (await emailsVers(N1, (m) => m.reply_to)).at(-1);
  const m2 = (await emailsVers(N2, (m) => m.reply_to)).at(-1);
  reponse1 = [m1?.reply_to].flat()[0];
  reponse2 = [m2?.reply_to].flat()[0];
  verif(reponse1 && reponse2 && reponse1 !== reponse2, `adresses de réponse : ${reponse1} / ${reponse2}`);
  etiquette2 = /\[réf\. ([a-z0-9]+)\]/.exec(m2.subject ?? "")?.[1];
  verif(etiquette2, "repère absent de l'objet de la demande 2");
  return `${reponse1} ; ${reponse2}`;
});

await etape("1 et 2. Vrai e-mail avec PDF à l'adresse étiquetée du négoce 1 : bon quantitatif, bon négoce, devis reçu, cloche", a, async () => {
  envoyer({ de: "Négoce Test Un", a: reponse1, objet: `Re: demande de prix ${ts}`, texte: "Bonjour, voici notre devis en pièce jointe. Cordialement.", pdf: "devis-negoce-un.pdf" });
  const items = await recus(a, (l) => l.length >= 1);
  verif(items.length === 1, `${items.length} e-mail(s) reçu(s) au lieu de 1`);
  const e = items[0];
  verif(e.demande?.recipientId === r1 && e.demande?.projectId === projectId, `rattaché à ${JSON.stringify(e.demande)}`);
  verif(e.fichiers?.[0]?.nom === "devis-negoce-un.pdf" && e.fichiers[0].devisRecu === true, `fichier ${JSON.stringify(e.fichiers)}`);
  const ds = (await demandes(a, projectId)).flatMap((d) => d.recipients);
  verif(ds.find((x) => x.id === r1)?.document?.name === "devis-negoce-un.pdf", "le négoce 1 n'a pas son devis");
  verif(!ds.find((x) => x.id === r2)?.document, "le négoce 2 a reçu un devis qui n'est pas le sien");
  const f = await a.evaluate(async (u) => (await fetch(u)).headers.get("content-type"), `/v1/recus/${e.id}/fichiers/${e.fichiers[0].id}`);
  verif(/application\/pdf/.test(f ?? ""), `le PDF ne s'ouvre pas (${f})`);
  await a.goto(`${BASE}/notifications`, { waitUntil: "networkidle" });
  await voir(a.getByText(/Négoce Test Un/));
  await a.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  return `e-mail ${e.id} rattaché au négoce 1, PDF devenu le devis reçu`;
});

await etape("7. Une autre entreprise ne lit ni l'e-mail ni son fichier", b, async () => {
  const e = (await api(a, "GET", "/v1/recus")).body.items[0];
  const u = await api(b, "GET", `/v1/recus/${e.id}`);
  const f = await api(b, "GET", `/v1/recus/${e.id}/fichiers/${e.fichiers[0].id}`);
  const l = await api(b, "GET", "/v1/recus");
  verif(u.status === 404 && f.status === 404 && (l.body?.items ?? []).length === 0, `B : ${u.status}, ${f.status}, ${(l.body?.items ?? []).length} reçu(s)`);
  return "404, 404, liste vide";
});

await etape("3. Doublon : le même e-mail renvoyé est gardé, le devis du négoce 1 ne change pas", a, async () => {
  envoyer({ de: "Négoce Test Un", a: reponse1, objet: `Re: demande de prix ${ts}`, texte: "Bonjour, voici notre devis en pièce jointe. Cordialement.", pdf: "devis-negoce-un.pdf" });
  const items = await recus(a, (l) => l.length >= 2);
  verif(items.length === 2, `${items.length} e-mail(s) au lieu de 2`);
  verif(items.every((e) => e.demande?.recipientId === r1), "le doublon n'est pas sur la même demande");
  verif(items.flatMap((e) => e.fichiers).filter((x) => x.devisRecu).length === 1, "le devis reçu est compté deux fois");
  const ds = (await demandes(a, projectId)).flatMap((d) => d.recipients);
  verif(ds.filter((x) => x.document).length === 1, "un deuxième devis est apparu");
  return "deux e-mails gardés, un seul devis";
});

await etape("4. Réponse au négoce 2 par le repère de l'objet (adresse sans étiquette) : rattachée au négoce 2, sans devis", a, async () => {
  envoyer({ de: "Négoce Test Deux", a: adresseA, objet: `RE: Demande de prix [réf. ${etiquette2}]`, texte: "Bonjour, nous revenons vers vous demain." });
  const items = await recus(a, (l) => l.length >= 3);
  const e = items.find((x) => x.demande?.recipientId === r2);
  verif(e, "aucun e-mail rattaché au négoce 2");
  verif(!(await demandes(a, projectId)).flatMap((d) => d.recipients).find((x) => x.id === r2)?.document, "un devis est apparu sans PDF");
  return `e-mail ${e.id} rattaché au négoce 2`;
});

await etape("5. E-mail sans aucun repère : dans « Mes reçus », non rattaché, puis rattaché à la main au négoce 2", a, async () => {
  envoyer({ de: "Commercial Inconnu", a: adresseA, objet: `Bonjour ${ts}`, texte: "Bonjour, pouvez-vous me rappeler ?" });
  const items = await recus(a, (l) => l.length >= 4);
  const e = items.find((x) => !x.demande);
  verif(e, "l'e-mail sans repère n'est pas arrivé, ou a été rattaché à tort");
  await a.goto(`${BASE}/recus`, { waitUntil: "networkidle" });
  const r = await api(a, "POST", `/v1/recus/${e.id}/rattacher`, { recipientId: r2 });
  verif(r.status === 200 && r.body?.demande?.recipientId === r2, `rattachement ${r.status}`);
  return "arrivé non rattaché, rattaché d'un geste";
});

await etape("6. Adresse que personne n'a : mis de côté pour l'admin, invisible pour A et B", adm, async () => {
  const inconnue = `personne-${ts}@${DOMAINE}`;
  const avant = (await api(a, "GET", "/v1/recus")).body.items.length;
  envoyer({ de: "Négoce Perdu", a: inconnue, objet: `Devis perdu ${ts}`, texte: "Bonjour, voici notre devis." });
  await inscrire(adm, ADMIN, `Mobiiz Admin ${ts}`, "Admin").catch(() => {});
  const depuis = Date.now();
  verif((await api(adm, "POST", "/v1/admin/pilotage/code")).status < 300, "code admin refusé");
  const mail = (await emailsVers(ADMIN, (m) => /code d'accès/.test(m.subject) && Date.parse(m.created_at) >= depuis - 5000)).filter((m) => /code d'accès/.test(m.subject)).at(-1);
  verif((await api(adm, "POST", "/v1/admin/pilotage/code/verifier", { code: /(\d{6})/.exec(mail?.text ?? "")?.[1] })).status === 200, "vérification admin refusée");
  let cote = [];
  for (let i = 0; i < 36 && !cote.some((m) => String(m.adresse).startsWith(`personne-${ts}`)); i++) {
    cote = (await api(adm, "GET", "/v1/admin/emails-mis-de-cote")).body?.items ?? [];
    await t(5000);
  }
  verif(cote.some((m) => String(m.adresse).startsWith(`personne-${ts}`)), "l'e-mail n'est pas dans les mis de côté");
  verif((await api(a, "GET", "/v1/recus")).body.items.length === avant && (await api(b, "GET", "/v1/recus")).body.items.length === 0, "un artisan voit l'e-mail mis de côté");
  verif((await api(a, "GET", "/v1/admin/emails-mis-de-cote")).status === 403, "un artisan ouvre la liste de l'admin");
  return `mis de côté (${inconnue}), fermé aux artisans`;
});

if (process.env.GARDER !== "1")
  await etape("Nettoyage : comptes de test supprimés", a, async () => {
    for (const p of [a, b, adm]) await supprimer(p).catch(() => {});
  });

writeFileSync(path.join(OUT, "journal.json"), JSON.stringify({ quand: new Date().toISOString(), webhooks: webhooks.map((w) => w.endpoint), journal }, null, 2));
const ko = journal.filter((j) => j.statut !== "ok");
console.log(`\n${journal.length - ko.length}/${journal.length} étapes ok`);
await browser.close();
process.exit(ko.length ? 1 : 0);
