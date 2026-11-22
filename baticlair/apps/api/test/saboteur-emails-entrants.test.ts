import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { EmailRecu, LecteurEmailRecu } from "../src/platform/email/contact-entrant.js";
import { htmlExterne, miseEnPage } from "../src/platform/email/mise-en-page.js";
import type { Alerter, AlertKind } from "../src/platform/alerts/alerter.js";
import { ALERTER, EMAIL_RECU } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LE SABOTEUR CONTRE LE FILTRE DES E-MAILS ENTRANTS (Greg, 22 novembre 2026), EN LOCAL. Chaque `it` affirme le
 * comportement SÛR attendu : un test qui échoue = une attaque qui passe (gardée et signalée dans le rapport).
 * Aucun appel réseau : le lecteur Resend est simulé, les e-mails partent dans la boîte de test.
 */
let ctx: TestContext;
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-saboteur-000").toString("base64");
const CLES = ["GROUPE", "RESEND_WEBHOOK_SECRET", "EMAIL_DOMAINE", "GROUPE_ADMINS", "CONTACT_RENVOI_VERS"] as const;
const avant = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));
const OK = { spf: "pass", dkim: "pass", dmarc: "pass" };
let recuSimule: Partial<EmailRecu> = {};
const alertes: { kind: AlertKind; message: string }[] = [];
const alerter: Alerter = { enabled: true, alert: (kind, message) => void alertes.push({ kind, message }) };
const lecteur: LecteurEmailRecu = {
  lire(): Promise<EmailRecu | null> {
    return Promise.resolve({ from: "Négoce Dupont <ventes@dupont.example>", to: [], subject: "Re: votre demande", date: "2026-11-22T09:00:00.000Z", text: "Bonjour, voici notre devis.", html: null, attachments: [], tropLourdes: [], authentification: OK, ...recuSimule });
  },
};
function signe(corps: string, id = `msg_${Math.random().toString(36).slice(2)}`, ts = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${corps}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}`, "content-type": "application/json" };
}
const corpsDe = (to: string, subject: string, from: string) => JSON.stringify({ type: "email.received", data: { email_id: `em_${Math.random().toString(36).slice(2)}`, from, to: [to], subject } });
const webhook = (to: string, subject = "Re: votre demande", from = "ventes@dupont.example") => {
  const corps = corpsDe(to, subject, from);
  return request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(corps)).send(corps);
};
const pdf = async (titre = "DEVIS Négoce Dupont") => Buffer.from(await makePdf(["devis"], [], "Total HT 1 200,00", titre)).toString("base64");

beforeAll(async () => {
  process.env.GROUPE = "off";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.EMAIL_DOMAINE = "mobiiz.fr";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.CONTACT_RENVOI_VERS;
  ctx = await createTestApp((b) => b.overrideProvider(EMAIL_RECU).useValue(lecteur).overrideProvider(ALERTER).useValue(alerter));
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
  recuSimule = {};
  alertes.length = 0;
});

async function demandeEnvoyee(agent: Agent, negoce = { name: "Négoce Dupont", email: "ventes@dupont.example" }) {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send(negoce)).body;
  const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] });
  const recipientId = res.body.recipients[0].id as string;
  await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
  const etiquette = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: recipientId } })).etiquette!;
  ctx.emails.clear();
  return { projectId: q.projetId as string, recipientId, etiquette };
}
const statut = async (agent: Agent, projectId: string) => (await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items[0].recipients[0].status as string;

describe("1. faux négoce sur une vraie demande (l'étiquette a fuité : transfert, copie, boîte du négoce piratée)", () => {
  it("même nom affiché, AUTRE domaine, authentifié pour son propre domaine : jamais rattaché, jamais « Négoce Dupont t'a répondu »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { from: "Négoce Dupont <devis@autre-negoce.example>", authentification: OK, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: await pdf("FAUX DEVIS") }] };
    const r = (await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`, "Re: votre demande", "devis@autre-negoce.example")).body;
    expect(r.rattache).toBe(false);
    expect(await statut(agent, projectId)).toBe("sent");
    expect(ctx.emails.sent.some((e) => e.subject.includes("Négoce Dupont t'a répondu"))).toBe(false);
  });

  it("domaine sosie « dupont-example.com », authentifié : jamais rattaché", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { from: "Négoce Dupont <ventes@dupont-example.com>", authentification: OK, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: await pdf("FAUX DEVIS") }] };
    expect((await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`, "Re: votre demande", "ventes@dupont-example.com")).body.rattache).toBe(false);
    expect(await statut(agent, projectId)).toBe("sent");
  });

  it("la VRAIE adresse du négoce usurpée, SPF passé mais DKIM et DMARC gris : le PDF ne devient pas « devis reçu » d'office", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { authentification: { spf: "pass", dkim: "gray", dmarc: "gray" }, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: await pdf("FAUX DEVIS") }] };
    await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`);
    expect(await statut(agent, projectId)).toBe("sent");
  });

  it("la VRAIE adresse du négoce usurpée, DMARC absent (aucun résultat d'authentification) : le PDF ne devient pas « devis reçu » d'office", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { authentification: null, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: await pdf("FAUX DEVIS") }] };
    await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`);
    expect(await statut(agent, projectId)).toBe("sent");
  });

  it("SANS étiquette, adresse du négoce usurpée et non authentifiée : Mobiiz ne propose pas « l'e-mail vient de l'adresse de Négoce Dupont »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demandeEnvoyee(agent);
    recuSimule = { subject: "Votre devis", authentification: { spf: "fail", dkim: "gray", dmarc: "gray" } };
    const r = (await webhook("toitures-martin@mobiiz.fr", "Votre devis")).body;
    const s = (await agent.get(`/v1/recus/demandes?email=${r.id}`)).body;
    expect(s.suggestion).toBeNull();
  });

  it("adresse du négoce cachée dans le nom affiché (« \"Négoce Dupont <ventes@dupont.example>\" <pirate@x.example> ») : ni suggestion, ni expéditeur affiché « ventes@dupont.example »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await demandeEnvoyee(agent);
    const de = '"Négoce Dupont <ventes@dupont.example>" <pirate@x.example>';
    recuSimule = { from: de, subject: "Votre devis", authentification: OK };
    const r = (await webhook("toitures-martin@mobiiz.fr", "Votre devis", "pirate@x.example")).body;
    const s = (await agent.get(`/v1/recus/demandes?email=${r.id}`)).body;
    expect(s.suggestion).toBeNull();
    const recu = (await agent.get("/v1/recus")).body.items[0];
    expect(recu.expediteur).not.toContain("dupont.example");
  });
});

describe("2. usurpation de mobiiz.fr sur contact@", () => {
  it("bloqué : « MOBIIZ <Contact@MOBIIZ.FR> » sans DMARC, sous-domaine", async () => {
    recuSimule = { from: "MOBIIZ <Contact@MOBIIZ.FR>", subject: "Facture", authentification: { spf: "gray", dkim: "gray", dmarc: "gray" } };
    expect((await webhook("contact@mobiiz.fr", "Facture", "Contact@MOBIIZ.FR")).body).toEqual({ traite: true, raison: "indesirable" });
    recuSimule = { from: "Support <support@reponses.mobiiz.fr>", subject: "Facture", authentification: null };
    expect((await webhook("contact@mobiiz.fr", "Facture", "support@reponses.mobiiz.fr")).body).toEqual({ traite: true, raison: "indesirable" });
    expect(ctx.emails.sent).toHaveLength(0);
  });

  it("adresse mobiiz.fr cachée dans le nom affiché : « contact@mobiiz.fr <pirate@x.example> » n'arrive pas comme un message propre", async () => {
    recuSimule = { from: "contact@mobiiz.fr <pirate@x.example>", subject: "Facture", authentification: OK };
    expect((await webhook("contact@mobiiz.fr", "Facture", "pirate@x.example")).body.raison).toBe("indesirable");
  });

  it("nom affiché « Mobiiz » sur un domaine sosie unicode (mobíiz.fr) : n'arrive pas comme un message propre", async () => {
    recuSimule = { from: "Mobiiz <contact@mobíiz.fr>", subject: "Facture", authentification: OK };
    expect((await webhook("contact@mobiiz.fr", "Facture", "contact@mobíiz.fr")).body.raison).toBe("indesirable");
  });

  it("l'expéditeur se fait passer pour l'adresse admin (boucle) : le message n'est pas supprimé en silence, il est au journal", async () => {
    recuSimule = { from: "Client <client@client.example>", subject: "Bonjour", text: "Bonjour" };
    await webhook("contact@mobiiz.fr", "Bonjour", "client@client.example");
    const admin = ctx.emails.sent.at(-1)!.to;
    await ctx.prisma.emailEntrant.deleteMany();
    recuSimule = { from: admin, subject: "Facture", authentification: { spf: "fail", dkim: "fail", dmarc: "fail" } };
    const r = (await webhook("contact@mobiiz.fr", "Facture", admin)).body;
    expect(r.raison).toBe("boucle");
    expect(await ctx.prisma.emailEntrant.count()).toBe(1);
  });
});

describe("3. liens piégés : rien de cliquable chez l'admin ni chez l'artisan", () => {
  it("bloqué : liens du corps texte, liens HTML seulement (texte vide), javascript: et data: dans le HTML", async () => {
    recuSimule = {
      from: "Client <client@client.example>",
      subject: "Question",
      text: null,
      html: '<p>Bonjour</p><a href="https://piege.example/a"></a><a href="javascript:alert(1)">ici</a><a href="data:text/html,<script>x</script>">là</a><img src="https://piege.example/i.png">',
    };
    expect((await webhook("contact@mobiiz.fr", "Question", "client@client.example")).body).toEqual({ traite: true });
    const m = ctx.emails.sent.at(-1)!;
    const parti = miseEnPage(m, "https://test.mobiiz.fr");
    for (const t of [parti.text, parti.html ?? ""]) {
      expect(t).not.toContain("piege.example");
      expect(t).not.toMatch(/href=|javascript:|<img/i);
    }
  });

  it("le HTML produit par htmlExterne ne contient jamais de balise active, même avec un bandeau piégé", () => {
    const h = htmlExterne('<a href="javascript:x">bandeau</a>\n<script>alert(1)</script><a href="https://x.example">x</a>');
    expect(h).not.toMatch(/<a\s|<script/i);
  });

  it("contact@ : un lien écrit dans l'OBJET ou le nom affiché n'est jamais cliquable dans le renvoi", async () => {
    recuSimule = { from: "Cliquez www.evil-nom.example <client@client.example>", subject: "Payez sur https://evil-objet.example/pay", text: "Bonjour" };
    expect((await webhook("contact@mobiiz.fr", "Payez sur https://evil-objet.example/pay", "client@client.example")).body).toEqual({ traite: true });
    const parti = miseEnPage(ctx.emails.sent.at(-1)!, "https://test.mobiiz.fr");
    expect(parti.text).not.toMatch(/https:\/\/evil-objet|www\.evil-nom/);
    expect(parti.html).not.toMatch(/https:\/\/evil-objet|www\.evil-nom/);
  });

  it("adresse d'un artisan : un lien écrit dans l'OBJET n'est jamais cliquable dans la copie envoyée à l'artisan", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    ctx.emails.clear();
    recuSimule = { from: "Inconnu <x@inconnu.example>", subject: "Réglez ici https://evil-objet.example/pay", text: "Bonjour" };
    await webhook("toitures-martin@mobiiz.fr", "Réglez ici https://evil-objet.example/pay", "x@inconnu.example");
    const avis = ctx.emails.sent.find((e) => e.to === "artisan@example.fr" && e.externe)!;
    expect(avis).toBeDefined();
    const parti = miseEnPage(avis, "https://test.mobiiz.fr");
    expect(parti.text).not.toContain("https://evil-objet");
    expect(parti.html).not.toContain("https://evil-objet");
  });

  it("raccourcisseur dans le corps (bit.ly/…) : jamais cliquable dans le renvoi", async () => {
    recuSimule = { from: "Client <client@client.example>", subject: "Question", text: "Votre facture : bit.ly/3abcXYZ" };
    await webhook("contact@mobiiz.fr", "Question", "client@client.example");
    expect(ctx.emails.sent.at(-1)!.text).not.toContain("bit.ly/");
  });

});

describe("4. pièces jointes piégées", () => {
  it("bloqué : archive imbriquée, double extension, majuscules, points à la fin, .docm, .html, .svg, .iso, U+202E", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    for (const nom of ["devis.pdf.zip", "DEVIS.PDF.EXE", "devis.exe. .", "commande.docm", "page.html", "plan.svg", "disque.iso", "devis‮fdp.scr"]) {
      recuSimule = { attachments: [{ filename: nom, contentType: "application/pdf", contentBase64: Buffer.from("x").toString("base64") }] };
      expect((await webhook("toitures-martin@mobiiz.fr")).body.indesirable, nom).toBe(true);
    }
    expect(await ctx.prisma.emailRecuFichier.count()).toBe(0);
  });

  it("type MIME menteur « application/xhtml+xml » derrière un nom « devis.pdf » : jamais servi comme page web par l'API", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const page = '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Mobiiz : reconnecte-toi</h1><meta http-equiv="refresh" content="0;url=https://evil.example"/></body></html>';
    recuSimule = { from: "Inconnu <x@inconnu.example>", attachments: [{ filename: "devis.pdf", contentType: "application/xhtml+xml", contentBase64: Buffer.from(page).toString("base64") }] };
    const r = (await webhook("toitures-martin@mobiiz.fr", "Re: votre demande", "x@inconnu.example")).body;
    const fichier = (await agent.get(`/v1/recus/${r.id}`)).body.fichiers[0];
    // Soit la pièce est retenue, soit elle est servie comme un téléchargement neutre.
    if (fichier) {
      const res = await agent.get(`/v1/recus/${r.id}/fichiers/${fichier.id}`);
      expect(res.headers["content-type"]).not.toMatch(/html|xml|svg/i);
    }
  });

  it("un « devis.pdf » qui est en fait un exécutable Windows (MZ) : retenu", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    recuSimule = { attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: Buffer.concat([Buffer.from("MZ\x90\x00"), Buffer.alloc(64)]).toString("base64") }] };
    expect((await webhook("toitures-martin@mobiiz.fr")).body.indesirable).toBe(true);
  });

  it("un « devis.pdf » qui est en fait une archive ZIP (PK) : retenu", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    recuSimule = { attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(64)]).toString("base64") }] };
    expect((await webhook("toitures-martin@mobiiz.fr")).body.indesirable).toBe(true);
  });
});

describe("5. réponse à une demande qui n'existe pas, ou d'une autre entreprise", () => {
  it("bloqué : étiquette inventée, étiquette d'une AUTRE entreprise (adresse ou objet), faux repère dans l'objet", async () => {
    const { agent: a } = await signUpWithCompany(ctx.app, "artisan-a@example.fr", "Toitures Martin");
    const { agent: b } = await signUpWithCompany(ctx.app, "artisan-b@example.fr", "Couverture Bretonne");
    const demA = await demandeEnvoyee(a);
    await demandeEnvoyee(b, { name: "Négoce Breton", email: "ventes@breton.example" });
    // L'étiquette de A envoyée à l'adresse de B, dans l'adresse puis dans l'objet.
    expect((await webhook(`couverture-bretonne+r${demA.etiquette}@mobiiz.fr`)).body.rattache).toBe(false);
    expect((await webhook("couverture-bretonne@mobiiz.fr", `Re: devis [réf. ${demA.etiquette}]`)).body.rattache).toBe(false);
    // Inventée, ou faux repère.
    expect((await webhook("toitures-martin+rzzzzzzzz@mobiiz.fr")).body.rattache).toBe(false);
    expect((await webhook("toitures-martin@mobiiz.fr", "Re: devis [réf. abcdefgh]")).body.rattache).toBe(false);
    expect(await statut(a, demA.projectId)).toBe("sent");
    expect(await ctx.prisma.alerteCourte.count()).toBe(0);
  });
});

describe("6. rejeu, volume et autres contournements", () => {
  it("bloqué : même svix-id rejoué, signature fausse, horodatage trop vieux", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const corps = corpsDe("toitures-martin@mobiiz.fr", "Bonjour", "x@inconnu.example");
    const entetes = signe(corps, "msg_rejeu_1");
    await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(entetes).send(corps).expect(200);
    await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(entetes).send(corps);
    expect(await ctx.prisma.emailRecuArtisan.count()).toBe(1);
    const faux = { ...signe(corps), "svix-signature": "v1," + Buffer.alloc(32).toString("base64") };
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(faux).send(corps)).status).toBe(403);
    const vieux = signe(corps, "msg_vieux", Math.floor(Date.now() / 1000) - 3600);
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(vieux).send(corps)).status).toBe(403);
    // Corps modifié après signature.
    const modifie = corps.replace("Bonjour", "Bonsoir");
    expect((await request(ctx.app.getHttpServer()).post("/v1/webhooks/resend").set(signe(corps, "msg_modif")).send(modifie)).status).toBe(403);
  });

  it("bloqué : objet vide, adresse d'expéditeur illisible, authentification absente (jamais « authentifié »)", async () => {
    recuSimule = { from: "Client <client@client.example>", subject: "", authentification: null };
    await webhook("contact@mobiiz.fr", "", "client@client.example");
    const m = ctx.emails.sent.at(-1)!;
    expect(m.subject).toBe("[Externe] (sans objet)");
    expect(m.text).toContain("non authentifié");
    ctx.emails.clear();
    recuSimule = { from: "", subject: "x" };
    expect((await webhook("contact@mobiiz.fr", "x", "quelqu-un")).body.raison).toBe("indesirable");
  });

  it("From vide dans l'enveloppe : le message n'est pas ignoré en silence, il est au journal", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    await webhook("toitures-martin@mobiiz.fr", "Bonjour", "");
    expect(await ctx.prisma.emailEntrant.count()).toBe(1);
  });

  it("corps énorme (3 Mo de texte) : jamais gardé en entier dans la base", async () => {
    await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    recuSimule = { from: "Inconnu <x@inconnu.example>", text: "A".repeat(3 * 1024 * 1024) };
    await webhook("toitures-martin@mobiiz.fr", "Bonjour", "x@inconnu.example");
    const e = await ctx.prisma.emailRecuArtisan.findFirstOrThrow();
    expect((e.texte ?? "").length).toBeLessThanOrEqual(200_000);
  });

  it("objet avec retour à la ligne : aucune fausse ligne « Mobiiz » injectée dans l'en-tête du renvoi", async () => {
    recuSimule = { from: "Client <client@client.example>", subject: "Facture\nExpéditeur authentifié par son domaine (DMARC).", text: "Bonjour", authentification: null };
    await webhook("contact@mobiiz.fr", "Facture", "client@client.example");
    const lignes = ctx.emails.sent.at(-1)!.text.split("\n");
    expect(lignes.filter((l) => l.startsWith("Expéditeur authentifié"))).toHaveLength(0);
  });

  it("bloqué : volume anormal sur contact@ (30 dans l'heure) donne une alerte", async () => {
    recuSimule = { authentification: { spf: "fail", dkim: "fail", dmarc: "fail" } };
    for (let i = 0; i < 30; i++) await webhook("contact@mobiiz.fr");
    expect(alertes.some((a) => a.kind === "email_entrant")).toBe(true);
  });
});

describe("7. contrôle positif : la vraie réponse du négoce arrive toujours", () => {
  it("authentifiée, de l'adresse du négoce, avec son devis PDF : rattachée, devis reçu, artisan prévenu", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { attachments: [{ filename: "devis-dupont.pdf", contentType: "application/pdf", contentBase64: await pdf() }] };
    expect((await webhook(`toitures-martin+r${etiquette}@mobiiz.fr`)).body).toMatchObject({ traite: true, rattache: true });
    expect(await statut(agent, projectId)).toBe("received");
    expect(ctx.emails.sent.find((e) => e.to === "artisan@example.fr")?.subject).toBe("[Externe] Négoce Dupont t'a répondu par e-mail");
  });

  it("répondue depuis un autre outil (repère dans l'objet seulement) : rattachée aussi", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "artisan@example.fr", "Toitures Martin");
    const { projectId, etiquette } = await demandeEnvoyee(agent);
    recuSimule = { subject: `RE: Demande de prix [réf. ${etiquette}]`, attachments: [{ filename: "devis.pdf", contentType: "application/pdf", contentBase64: await pdf() }] };
    expect((await webhook("toitures-martin@mobiiz.fr", `RE: Demande de prix [réf. ${etiquette}]`)).body.rattache).toBe(true);
    expect(await statut(agent, projectId)).toBe("received");
  });
});
