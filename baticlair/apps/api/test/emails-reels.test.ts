import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { EmailSortantSender } from "../src/platform/email/email-sortant.sender.js";
import { CapturingEmailSender } from "../src/platform/email/capturing-email.sender.js";
import { garder, lienDesabonnement, miseEnPage, PHRASE_REPONSES, PIED_LEGAL } from "../src/platform/email/mise-en-page.js";
import type { AppLogger } from "../src/platform/logging/logger.js";
import { ARDOISE, couvreurAvecListe, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

/**
 * LES E-MAILS RÉELS (Greg, 24 octobre 2026) : l'expéditeur vient d'EMAIL_DOMAINE et d'EMAIL_EXPEDITEUR ; en
 * prévisualisation, seuls les destinataires d'EMAILS_AUTORISES reçoivent leurs e-mails, les autres vont à l'adresse de
 * test avec l'objet « [TEST → destinataire réel] … » ; chaque e-mail qui part a le logo, le pied légal et un lien pour
 * ne plus en recevoir (celui de l'e-mail, sinon la page de ses réglages).
 */
const silencieux = { warn: () => undefined, error: () => undefined, info: () => undefined } as unknown as AppLogger;
const base = { DATABASE_URL: "postgresql://x@localhost/db", AUTH_SECRET: "a".repeat(32), NODE_ENV: "test" };

describe("la configuration des e-mails", () => {
  it("l'expéditeur est « Mobiiz <contact@domaine> » ; EMAIL_FROM l'emporte", () => {
    expect(loadConfig({ ...base, RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr" }).resend).toEqual({ apiKey: "re_test", from: "Mobiiz <contact@mobiiz.fr>", replyTo: "contact@mobiiz.fr" });
    expect(loadConfig({ ...base, RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr", EMAIL_EXPEDITEUR: "commande" }).resend?.from).toBe("Mobiiz <commande@mobiiz.fr>");
    expect(loadConfig({ ...base, RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr", EMAIL_FROM: "X <x@y.fr>" }).resend?.from).toBe("X <x@y.fr>");
    expect(() => loadConfig({ ...base, RESEND_API_KEY: "re_test" })).toThrow(/EMAIL_DOMAINE/);
  });

  it("en prévisualisation, de vrais e-mails exigent la liste blanche ; en production, la garde est éteinte", () => {
    expect(() => loadConfig({ ...base, VERCEL_ENV: "preview", RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr" })).toThrow(/EMAILS_AUTORISES/);
    const preview = loadConfig({ ...base, VERCEL_ENV: "preview", RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr", EMAILS_AUTORISES: "Greg@Exemple.fr, @demo.fr" });
    expect(preview.emailGarde).toEqual({ autorises: ["greg@exemple.fr", "@demo.fr"], redirigerVers: "greg@exemple.fr" });
    expect(loadConfig({ ...base, VERCEL_ENV: "production", RESEND_API_KEY: "re_test", EMAIL_DOMAINE: "mobiiz.fr", EMAILS_AUTORISES: "greg@exemple.fr", ABONNEMENT: "off" }).emailGarde).toBeNull();
  });
});

describe("la liste blanche", () => {
  const garde = { autorises: ["greg@exemple.fr", "@demo.fr"], redirigerVers: "greg@exemple.fr" };
  const mail = (to: string) => ({ to, subject: "Ta commande", text: "Bonjour" });
  it("une adresse ou un domaine autorisé reçoit son e-mail tel quel", () => {
    expect(garder(garde, mail("Greg@exemple.fr"))).toEqual(mail("Greg@exemple.fr"));
    expect(garder(garde, mail("artisan@demo.fr"))).toEqual(mail("artisan@demo.fr"));
  });
  it("les autres vont à l'adresse de test, objet « [TEST → destinataire réel] » ; sans adresse de test, rien ne part", () => {
    expect(garder(garde, mail("vrai@negoce.fr"))).toEqual({ to: "greg@exemple.fr", subject: "[TEST → vrai@negoce.fr] Ta commande", text: "Bonjour" });
    expect(garder({ autorises: ["@demo.fr"], redirigerVers: null }, mail("vrai@negoce.fr"))).toBeNull();
    expect(garder(null, mail("vrai@negoce.fr"))).toEqual(mail("vrai@negoce.fr"));
  });
  it("le décorateur applique la garde puis la mise en page", async () => {
    const inner = new CapturingEmailSender();
    const sortant = new EmailSortantSender(inner, WEB_ORIGIN, garde, silencieux);
    await sortant.send(mail("vrai@negoce.fr"));
    expect(inner.sent[0]).toMatchObject({ to: "greg@exemple.fr", subject: "[TEST → vrai@negoce.fr] Ta commande" });
    expect(inner.sent[0]!.html).toContain(`${WEB_ORIGIN}/marque/logo-clair.png`);
    await new EmailSortantSender(inner, WEB_ORIGIN, { autorises: ["@demo.fr"], redirigerVers: null }, silencieux).send(mail("vrai@negoce.fr"));
    expect(inner.sent).toHaveLength(1);
  });
});

describe("la mise en page", () => {
  it("logo, pied légal, lien de désabonnement de l'e-mail (en pied, une fois) et en-tête List-Unsubscribe", () => {
    const m = miseEnPage({ to: "a@b.fr", subject: "Grille", text: "Bonjour,\n\nVoici la grille : https://x.fr/grille/1\n\nSe désabonner : https://x.fr/stop/9" }, WEB_ORIGIN);
    expect(m.html).toContain('alt="Mobiiz"');
    expect(m.html).toContain("BATI INVEST");
    expect(m.html).toContain('<a href="https://x.fr/grille/1"');
    expect(m.html).toContain('href="https://x.fr/stop/9"');
    expect(m.html).toContain("Ne plus recevoir ces e-mails");
    expect(m.text.match(/https:\/\/x\.fr\/stop\/9/g)).toHaveLength(1);
    expect(m.text).toContain(PIED_LEGAL);
    // Greg, 26 octobre 2026 : le bloc légal complet (capital, RCS, contact) et l'information sur les réponses reçues.
    expect(m.text).toContain("BATI INVEST, SARL au capital de 1 000 €, RCS Saint-Brieuc 910 796 325, SIRET 910 796 325 00017, TVA FR61910796325, 6 impasse du Ouipoure, 22620 Ploubazlanec. Contact : contact@mobiiz.fr.");
    expect(m.text).toContain(PHRASE_REPONSES);
    expect(m.html).toContain("peut être reçue par Mobiiz (BATI INVEST)");
    expect(m.headers["List-Unsubscribe"]).toBe("<https://x.fr/stop/9>");
  });
  it("sans lien propre (un e-mail de compte), « Gérer tes e-mails » mène aux réglages ; le texte est échappé", () => {
    const m = miseEnPage({ to: "a@b.fr", subject: "Code", text: "Ton code : <123>" }, WEB_ORIGIN);
    expect(m.html).toContain("&lt;123&gt;");
    expect(m.html).toContain(`href="${WEB_ORIGIN}/compte"`);
    expect(m.html).toContain("Gérer tes e-mails");
  });
  it("chaque phrasé de désabonnement des services est reconnu", () => {
    for (const l of ["Ne plus recevoir ces e-mails", "Se désabonner", "Stop", "Pour ne plus rien recevoir"]) {
      expect(lienDesabonnement({ text: `Bonjour\n\n${l} : https://x.fr/s` }, WEB_ORIGIN)).toEqual({ url: "https://x.fr/s", propre: true });
    }
  });
});

describe("chaque e-mail d'un cycle, tel qu'il part", () => {
  let ctx: TestContext;
  const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
  beforeAll(async () => {
    process.env.GROUPE = "on";
    process.env.CRON_SECRET = "secret-de-la-tache";
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
    for (const [cle, v] of Object.entries(avant)) {
      if (v === undefined) delete process.env[cle];
      else process.env[cle] = v;
    }
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.emails.sent.length = 0;
  });

  it("inscription, négoce, clôture, rappels d'essai : logo et pied partout, et un vrai lien de désabonnement sur chaque relance", { timeout: 120_000 }, async () => {
    const AVANT = "2026-10-10T08:00:00.000Z";
    const A = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
    await A.agent.post(`/v1/groupe/negoces?maintenant=${encodeURIComponent(AVANT)}`).send({ nom: "Négoce Alpha", email: "alpha@negoce.fr", familles: ["couverture"] }).expect(201);
    await inscrireNegoce(ctx, "alpha@negoce.fr", { depot: "ZA de Kerverzot, 22300 Lannion", enseigne: "Négoce Alpha", departements: ["22"], maintenant: AVANT });
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${encodeURIComponent(AVANT)}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    await tacheDuMois(ctx, "2026-10-26T09:00:00.000Z");
    // Rappels de fin d'essai : une entreprise sans dépôt, inscrite il y a 53 jours (7 jours avant la fin).
    const B = await couvreurAvecListe(ctx, "b@toitures.fr", "Toitures B", "4 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "100", unite: "pièces" }]);
    await ctx.prisma.company.update({ where: { id: B.companyId }, data: { createdAt: new Date("2026-08-01T10:00:00.000Z") } });
    await request(ctx.app.getHttpServer()).get(`/v1/internal/abonnement?maintenant=${encodeURIComponent("2026-09-23T10:00:00.000Z")}`).set("authorization", "Bearer secret-de-la-tache").expect(200);

    const sujets = ctx.emails.sent.map((e) => e.subject);
    expect(sujets.length).toBeGreaterThanOrEqual(4);
    for (const e of ctx.emails.sent) {
      const m = miseEnPage(e, WEB_ORIGIN);
      expect(m.html, e.subject).toContain('alt="Mobiiz"');
      expect(m.html, e.subject).toContain(PIED_LEGAL.replace(/'/g, "&#39;"));
      expect(m.headers["List-Unsubscribe"], e.subject).toMatch(/^<https?:\/\//);
    }
    // Les relances (grille au négoce, rappel d'essai) portent leur propre lien, jamais seulement les réglages.
    const relances = ctx.emails.sent.filter((e) => /grille|essai/i.test(e.subject));
    expect(relances.length, sujets.join(" | ")).toBeGreaterThanOrEqual(2);
    for (const e of relances) expect(lienDesabonnement(e, WEB_ORIGIN).propre, e.subject).toBe(true);
  });
});
