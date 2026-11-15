import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AbonnementService } from "../src/modules/abonnement/index.js";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";
import { horlogeAu } from "./support/horloge-decalee.js";

// Dates en dur dans ce fichier (novembre 2026) : l'horloge du test est fixée, il ne dépend plus du jour où on le lance.
horlogeAu("2026-11-05T09:00:00.000Z");

/**
 * LA DEMANDE PERSO (Greg, 25 octobre 2026, recentrage) : envoi immédiat à ses négoces, chiffrage en ligne sans compte,
 * comparaison livraison comprise, commande et suivi, relance à 48 h ouvrées, clôture à la date de besoin, « Mes prix »
 * qui ne montre que ses propres prix ; cinq négoces par demande pour toutes les formules (11 novembre 2026).
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, CRON_SECRET: process.env.CRON_SECRET, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.ZONES_ACTIVES = "22";
  // L'essai et le gratuit d'avant (25 octobre 2026) ne valent plus qu'hors du mode automatique (achat groupé par métier, 27 octobre 2026).
  process.env.MODE_REGROUPEMENT = "mois";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const LIGNES = [
  { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
  { libelle: LITEAU, quantite: "100", unite: "m" },
];
const lien = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)?.[1] ?? null;
const jetonPour = (email: string) => lien(mailsVers(ctx, email).at(-1)!.text)!;
const publique = () => request(ctx.app.getHttpServer());

/** Le 22 a franchi le seuil des 10 artisans depuis longtemps : plus de payant offert, le gratuit s'applique. */
async function zoneSansOffre() {
  await ctx.prisma.parametreGroupe.create({ data: { cle: "zone:22:seuil_franchi", valeur: "2026-01-01T00:00:00.000Z" } });
}

describe("la demande perso", () => {
  // RÈGLE CHANGÉE (Greg, 11 novembre 2026) : jusqu'à 5 négoces par demande pour toutes les formules, dans les anciens modes
  // aussi ; le sixième est une limite dite d'une phrase neutre, plus jamais un paywall.
  it("gratuit, ancien mode : cinq négoces par demande ; le sixième est une limite (400), jamais un paywall", async () => {
    await zoneSansOffre();
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    await ctx.app.get(AbonnementService).finirEssai(a.companyId);
    const droits = (await a.agent.get("/v1/droits").expect(200)).body;
    expect(droits).toMatchObject({ formule: "gratuit", negocesParDemande: 5, regroupements: false, zone: "22", zoneActive: true });
    const n = (k: number) => Array.from({ length: k }, (_, i) => ({ nom: `Négoce ${i + 1}`, email: `n${i + 1}@negoce.fr` }));
    const six = await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: n(6) }).expect(400);
    expect(six.body.error.code).toBe("validation_failed");
    expect(six.body.error.details).toMatchObject({ refus: "negoces", phrase: "Jusqu'à 5 négoces par demande." });
    expect(ctx.emails.sent.filter((m) => m.to.endsWith("@negoce.fr"))).toHaveLength(0);
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: n(5) }).expect(201);
    expect(lien(mailsVers(ctx, "n5@negoce.fr").at(-1)!.text)).toBeTruthy();
    // Sans l'accord pour transmettre son identité, rien ne part.
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: false, articles: a.articles, negoces: n(1) }).expect(400);
  });

  it("payant : cinq négoces, chiffrage en ligne, comparaison livrée, commande, confirmation, livrée", { timeout: 60_000 }, async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    // Un négoce inscrit de la zone, proposé à l'artisan (sans son e-mail).
    const compte = await ctx.prisma.compteNegoce.create({ data: { email: "zone@negoce.fr", enseigne: "Négoce de la Zone", inscritLe: new Date(), departements: ["22"] } });
    const zone = await ctx.prisma.negoce.create({ data: { nom: "Négoce de la Zone", email: "zone@negoce.fr", departement: "22", generaliste: true, compteId: compte.id } });
    const proposes = (await a.agent.get(`/v1/projects/${a.projectId}/demandes-perso/negoces`).expect(200)).body;
    expect(proposes).toMatchObject({ zone: "22", max: 5, zoneNegoces: [{ negoceId: zone.id, nom: "Négoce de la Zone", generaliste: true }] });
    expect(JSON.stringify(proposes.zoneNegoces)).not.toContain("zone@negoce.fr");

    const negoces = [{ negoceId: zone.id }, ...["b", "c", "d", "e"].map((x) => ({ nom: `Négoce ${x.toUpperCase()}`, email: `${x}@negoce.fr` }))];
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, negoces: [...negoces, { nom: "Six", email: "f@negoce.fr" }] }).expect(400);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces }).expect(201)).body;
    expect(envoi.destinataires).toHaveLength(5);
    const mail = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    expect(mail.text).toContain("Je compte commander");
    expect(mail.text).toContain("sans compte");

    // La page du négoce : la liste et le nom de l'artisan (il a donné son accord), sans aucun prix.
    const page = (await publique().get(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).expect(200)).body;
    expect(page).toMatchObject({ artisan: "Toitures A", but: "commander", etat: "a_chiffrer", validiteMin: 7 });
    const cles = (page.lignes as { cle: string; designation: string }[]).map((l) => l.cle);
    expect(cles.length).toBe(2);

    // Validité trop courte : refusée ; grille partielle : acceptée.
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1, [cles[1]!]: 1 }, livraisonHt: 80, delaiJours: 3, validiteJours: 6 }).expect(400);
    const b = (await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1, [cles[1]!]: 1 }, livraisonHt: 80, delaiJours: 3, validiteJours: 7 }).expect(200)).body;
    // Première réponse sans compte : l'invitation à créer son compte négoce.
    expect(b.compte).toMatchObject({ lien: expect.stringMatching(/\/negoce\/rejoindre\//) });
    // Recette du 13 novembre 2026 (B8) : le lien est une seule adresse, jamais « …/rejoindre/http… ».
    expect(b.compte.lien).toMatch(/^https?:\/\/[^/]+\/negoce\/rejoindre\/[^/:]+$/);
    await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}`).send({ prix: { [cles[0]!]: 1.05, [cles[1]!]: 1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("d@negoce.fr")}`).send({ prix: { [cles[0]!]: 0.5 }, livraisonHt: 0, delaiJours: null, validiteJours: 7 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("e@negoce.fr")}/refuser`).expect(200);
    // L'artisan est prévenu.
    expect(mailsVers(ctx, "a@toitures.fr").some((m) => /a chiffré ta demande/.test(m.subject))).toBe(true);

    const vue = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body;
    expect(vue.offres.map((o: { nom: string; totalLivreHt: number; ecartHt: number | null; complete: boolean }) => [o.nom, o.totalLivreHt, o.ecartHt, o.complete])).toEqual([
      ["Négoce C", 1150, 0, true],
      ["Négoce B", 1180, 30, true],
      ["Négoce D", 500, null, false],
    ]);
    expect(vue.destinataires.find((d: { nom: string }) => d.nom === "Négoce E").statut).toBe("refuse");

    // Commander chez C : le bon part au négoce, une seule commande par demande.
    const c = vue.offres[0].recipientId as string;
    // Greg, 16 novembre 2026 : l'artisan choisit une date de livraison souhaitée (jamais passée) ; avant toute commande,
    // « prévenir les autres » n'a pas de sens.
    expect((await a.agent.post(`/v1/demandes-perso/${envoi.id}/prevenir-autres`).send({ prevenir: true }).expect(409)).body.error.details.reason).toBe("sans_commande");
    expect((await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: c, livraisonSouhaitee: "2020-01-15" }).expect(400)).body.error.details.reason).toBe("date_passee");
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: c, livraisonSouhaitee: "31/12/2099" }).expect(400);
    expect(mailsVers(ctx, "c@negoce.fr").some((m) => /^Bon de commande/.test(m.subject))).toBe(false);
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: c, livraisonSouhaitee: "2099-12-03" }).expect(200);
    const bon = mailsVers(ctx, "c@negoce.fr").at(-1)!;
    expect(bon.subject).toMatch(/^Bon de commande de Toitures A \(1 150,00 € HT livré\)$/);
    expect(bon.text).toContain("C'est OK pour moi, livraison souhaitée le 3 décembre 2099, on s'appelle pour caler les détails.");
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: vue.offres[1].recipientId }).expect(409);
    // « Prévenir les autres négoces consultés ? » : B, D et le négoce de la zone (E a décliné, C est retenu). « Oui » : un e-mail poli à chacun,
    // jamais le prix ni le nom du retenu ; rappuyer (ou changer d'avis) ne renvoie rien.
    const apres = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body.commande;
    expect(apres).toMatchObject({ livraisonSouhaitee: "2099-12-03", autres: { nombre: 3, choix: null } });
    const polis = () => ["b", "c", "d", "e", "zone"].map((x) => mailsVers(ctx, `${x}@negoce.fr`).filter((m) => /suite à ma demande de prix/.test(m.subject)));
    expect(polis().flat()).toHaveLength(0);
    expect((await a.agent.post(`/v1/demandes-perso/${envoi.id}/prevenir-autres`).send({ prevenir: true }).expect(200)).body.commande.autres).toEqual({ nombre: 3, choix: "oui" });
    expect(polis().map((m) => m.length)).toEqual([1, 0, 1, 0, 1]);
    // Celui qui n'a jamais répondu n'est pas remercié pour une offre qu'il n'a pas faite : sa demande est close.
    expect(polis()[4]![0]!.text).toContain("ma demande de prix est close");
    expect(polis()[4]![0]!.text).not.toContain("Merci pour votre offre");
    for (const m of polis().flat()) {
      if (m !== polis()[4]![0]) expect(m.text).toContain("Merci pour votre offre, elle n'a pas été retenue cette fois. Je vous recontacte pour mes prochains chantiers.");
      expect(m.text + m.subject).not.toMatch(/Négoce C|1 150|1,05|€/);
      expect(m.replyTo).toBeTruthy();
    }
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/prevenir-autres`).send({ prevenir: true }).expect(200);
    expect((await a.agent.post(`/v1/demandes-perso/${envoi.id}/prevenir-autres`).send({ prevenir: false }).expect(200)).body.commande.autres.choix).toBe("oui");
    expect(polis().flat()).toHaveLength(3);
    await publique().post(`/v1/public/chiffrer/${lien(bon.text)}/confirmer`).expect(200);
    expect((await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body.commande).toMatchObject({ nom: "Négoce C", suivi: "confirmee" });
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/livree`).send({ recipientId: c }).expect(200);
    expect((await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body.commande.suivi).toBe("livree");
  });

  it("prix à vérifier : 620 € la pièce face à 1,10 € est signalé à l'artisan, n'entre pas dans « Mes prix », et rien n'est montré aux négoces", async () => {
    // Recette n° 2 du 14 novembre 2026 : « 620 € la pièce part sans alerte, s'affiche chez l'artisan et entre dans "Mes prix". »
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }, { nom: "Négoce C", email: "c@negoce.fr" }] }).expect(201)).body;
    const jetonDe = (email: string) => lien(mailsVers(ctx, email).at(-1)!.text);
    const pageB = (await publique().get(`/v1/public/chiffrer/${jetonDe("b@negoce.fr")}`).expect(200)).body as { lignes: { cle: string; designation: string }[] };
    const cles = pageB.lignes.map((l) => l.cle);
    const chiffrer = (email: string, pu: number) => publique().post(`/v1/public/chiffrer/${jetonDe(email)}`).send({ prix: Object.fromEntries(cles.map((k) => [k, pu])), livraisonHt: 0, delaiJours: 2, validiteJours: 30 });
    // Un seul prix reçu : aucun repère, rien n'est dit (on ne juge jamais sans repère réel).
    await chiffrer("c@negoce.fr", 620).expect(200);
    let vue = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body as { offres: { nom: string; prixAVerifier: { designation: string; prixHt: number }[] }[] };
    expect(vue.offres.find((o) => o.nom === "Négoce C")!.prixAVerifier).toEqual([]);
    // Le second négoce répond à 1,10 € : le 620 € est « à vérifier », le 1,10 € ne l'est pas ; le prix reste tel qu'écrit.
    await chiffrer("b@negoce.fr", 1.1).expect(200);
    vue = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body;
    const c = vue.offres.find((o) => o.nom === "Négoce C")!;
    expect(c.prixAVerifier).toHaveLength(cles.length);
    expect(c.prixAVerifier[0]).toMatchObject({ designation: pageB.lignes[0]!.designation, prixHt: 620 });
    expect(vue.offres.find((o) => o.nom === "Négoce B")!.prixAVerifier).toEqual([]);
    // « Mes prix » : seul le prix cohérent y entre.
    const mesPrix = JSON.stringify((await a.agent.get("/v1/mes-prix").expect(200)).body);
    expect(mesPrix).toContain("Négoce B");
    expect(mesPrix).not.toContain("Négoce C");
    expect(mesPrix).not.toMatch(/\b620\b/);
    // Aucun négoce n'apprend quoi que ce soit : ni sa page, ni un e-mail ne parlent du prix de l'autre ou d'un écart.
    const pageC = JSON.stringify((await publique().get(`/v1/public/chiffrer/${jetonDe("c@negoce.fr")}`).expect(200)).body);
    expect(pageC).not.toMatch(/1[.,]1\b|vérifier|éloigné|Négoce B/);
    expect(mailsVers(ctx, "c@negoce.fr").map((m) => m.subject + m.text).join("\n")).not.toMatch(/vérifier|éloigné|Négoce B/);
  });

  it("rappel de suivi : 7 jours après les réponses, sans commande, « Où en es-tu avec cette demande ? » une seule fois ; « C'est réglé » la sort de « À faire »", async () => {
    // Greg, 16 novembre 2026. Jamais avant 7 jours, jamais pour une demande commandée, un seul message par demande.
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const autre = await couvreurAvecListe(ctx, "z@toitures.fr", "Toitures Z", "8 rue du Port, 22500 Paimpol", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }, { nom: "Négoce C", email: "c@negoce.fr" }] }).expect(201)).body;
    const jetonDe = (email: string) => lien(mailsVers(ctx, email).at(-1)!.text);
    const cles = ((await publique().get(`/v1/public/chiffrer/${jetonDe("b@negoce.fr")}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle);
    const tache = (quand: Date) => publique().get(`/v1/internal/demandes-perso?maintenant=${encodeURIComponent(quand.toISOString())}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
    const rappels = () => mailsVers(ctx, "a@toitures.fr").filter((m) => m.subject.startsWith("Où en es-tu avec cette demande ?"));
    const resume = async () => ((await a.agent.get("/v1/projects?limit=30&resume=1").expect(200)).body.items as { id: string; resume: { statut: string; demande: { aSuivre: boolean; regle: boolean; choisi: boolean } } }[]).find((p) => p.id === a.projectId)!.resume;
    // Aucune réponse : jamais de rappel de suivi, même longtemps après.
    expect((await tache(new Date(Date.now() + 20 * 86_400_000))).body.suivis).toBe(0);
    await publique().post(`/v1/public/chiffrer/${jetonDe("b@negoce.fr")}`).send({ prix: Object.fromEntries(cles.map((k) => [k, 1])), livraisonHt: 0, delaiJours: 2, validiteJours: 30 }).expect(200);
    const reponduLe = (await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { priceRequestId: envoi.id, reponduLe: { not: null } } })).reponduLe!;
    // Six jours après la réponse : rien. Sept jours : un rappel, à l'artisan seul ; le lendemain : pas de second.
    expect((await tache(new Date(reponduLe.getTime() + 6 * 86_400_000))).body.suivis).toBe(0);
    expect(rappels()).toHaveLength(0);
    expect((await resume()).demande).toMatchObject({ aSuivre: false, regle: false });
    expect((await tache(new Date(reponduLe.getTime() + 7 * 86_400_000 + 60_000))).body.suivis).toBe(1);
    expect(rappels()).toHaveLength(1);
    expect(rappels()[0]!.text).toContain("C'est réglé");
    expect(mailsVers(ctx, "b@negoce.fr").concat(mailsVers(ctx, "c@negoce.fr"), mailsVers(ctx, "z@toitures.fr")).some((m) => /Où en es-tu/.test(m.subject + m.text))).toBe(false);
    expect((await tache(new Date(reponduLe.getTime() + 8 * 86_400_000))).body.suivis).toBe(0);
    expect(rappels()).toHaveLength(1);
    // Sans clic, la demande reste en rappel ; une autre entreprise ne peut pas la régler.
    expect((await resume()).demande).toMatchObject({ aSuivre: true, regle: false });
    expect((await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items[0].suivi).toMatchObject({ rappelLe: expect.any(String), regleLe: null });
    await autre.agent.post(`/v1/demandes-perso/${envoi.id}/regle`).expect(404);
    // « C'est réglé » : un seul bouton, rien ne part à personne, la demande sort de « À faire ».
    const avant = ctx.emails.sent.length;
    expect((await a.agent.post(`/v1/demandes-perso/${envoi.id}/regle`).expect(200)).body).toEqual({ regle: true });
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/regle`).expect(200);
    expect(ctx.emails.sent.length).toBe(avant);
    expect(await resume()).toMatchObject({ statut: "Réglée", demande: { aSuivre: false, regle: true, choisi: false } });
    expect((await tache(new Date(reponduLe.getTime() + 30 * 86_400_000))).body.suivis).toBe(0);
  });

  it("rappel de suivi : jamais pour une demande déjà commandée", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201)).body;
    const jeton = lien(mailsVers(ctx, "b@negoce.fr").at(-1)!.text);
    const cles = ((await publique().get(`/v1/public/chiffrer/${jeton}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle);
    await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: Object.fromEntries(cles.map((k) => [k, 1])), livraisonHt: 0, delaiJours: 2, validiteJours: 30 }).expect(200);
    const vue = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body;
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: vue.offres[0].recipientId, livraisonSouhaitee: "2099-12-03" }).expect(200);
    const r = await publique().get(`/v1/internal/demandes-perso?maintenant=${encodeURIComponent(new Date(Date.now() + 15 * 86_400_000).toISOString())}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect(r.body.suivis).toBe(0);
    expect(mailsVers(ctx, "a@toitures.fr").some((m) => /Où en es-tu/.test(m.subject))).toBe(false);
  });

  it("relance à 48 h ouvrées, une seule fois ; clôture à la date de besoin", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201)).body;
    const envoyeLe = (await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { priceRequestId: envoi.id } })).sentAt!;
    const tache = (quand: Date) => publique().get(`/v1/internal/demandes-perso?maintenant=${encodeURIComponent(quand.toISOString())}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect((await tache(new Date(envoyeLe.getTime() + 3_600_000))).body).toMatchObject({ relances: 0 });
    // Quatre jours plus tard (au moins 48 h ouvrées, week-end compris) : une relance, au nom de son client (lot final, point 6).
    expect((await tache(new Date(envoyeLe.getTime() + 4 * 86_400_000))).body).toMatchObject({ relances: 1 });
    const rappel = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    expect(rappel.subject).toBe("Toitures A : votre proposition tarifaire");
    // Greg, 12 novembre 2026 : le rappel d'une demande individuelle reste cordial et ne porte pas la signature des achats groupés.
    expect(rappel.text).toMatch(/^Bonjour,\n\nJe me permets de revenir vers vous au sujet de la demande de prix de Toitures A\. Dans la mesure du possible, une réponse avant le \d+(er)? \S+ lui rendrait service\./);
    expect(rappel.text).not.toMatch(/closes|achètent ensemble/);
    expect((await tache(new Date(envoyeLe.getTime() + 6 * 86_400_000))).body).toMatchObject({ relances: 0 });
    // La demande close, plus de chiffrage.
    await ctx.prisma.priceRequest.update({ where: { id: envoi.id }, data: { closLe: new Date(Date.now() - 1000) } });
    const r = await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { "0": 1 }, livraisonHt: 0, delaiJours: 1, validiteJours: 7 }).expect(409);
    expect(r.body.error.details.reason).toBe("demande_close");
  });

  it("« Mes prix » ne montre que ses propres prix ; le repère « Ton dernier prix » sur une nouvelle demande", { timeout: 60_000 }, async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const b = await couvreurAvecListe(ctx, "b@toitures.fr", "Toitures B", "8 rue du Port, 22500 Paimpol", LIGNES);
    const da = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] }).expect(201)).body;
    await publique().post(`/v1/public/chiffrer/${jetonPour("x@negoce.fr")}`).send({ prix: { "0": 1.12, "1": 0.9 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
    await b.agent.post(`/v1/projects/${b.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: b.articles, negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201);
    await publique().post(`/v1/public/chiffrer/${jetonPour("y@negoce.fr")}`).send({ prix: { "0": 0.77 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);

    const mesA = (await a.agent.get("/v1/mes-prix").expect(200)).body;
    expect(mesA.articles.map((x: { designation: string; dernier: { prixHt: number; negoce: string } }) => [x.designation, x.dernier.prixHt, x.dernier.negoce]).sort()).toEqual([
      [ARDOISE, 1.12, "Négoce X"],
      [LITEAU, 0.9, "Négoce X"],
    ]);
    expect(JSON.stringify(mesA)).not.toContain("0.77");
    expect(JSON.stringify(mesA)).not.toContain("Négoce Y");
    // La vue de la demande porte le repère sur chaque ligne.
    const vue = (await a.agent.get(`/v1/demandes-perso/${da.id}`).expect(200)).body;
    expect(vue.lignes[0].repere).toBe("Ton dernier prix pour cet article : 1,12 € HT / pièce");
    // Une autre entreprise ne voit jamais la demande de A.
    await b.agent.get(`/v1/demandes-perso/${da.id}`).expect(404);
  });
});
