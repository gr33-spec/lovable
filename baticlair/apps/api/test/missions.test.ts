/**
 * MISSIONS ENTRE ENTREPRISES, « MESSAGES ET RÉPONSES », LA CLOCHE (Greg, 10 novembre 2026, prompt maître). Les tests
 * obligatoires côté serveur : isolation entre TROIS entreprises (accès croisés = 404) ; jamais de contact libre ; un message
 * rejoué ou envoyé deux fois en même temps n'est écrit qu'une fois ; non-lus par côté ; coordonnées après l'accord des DEUX ;
 * pièces jointes : type, taille, contenu, propriété, lien expiré ; documents du dossier visibles dans le seul cadre autorisé ;
 * blocage et signalement ; les deux circuits (Missions, négoces) séparés dans la boîte ; réglages de notification.
 */
import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { SIRET_ARTISAN } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["MISSIONS_V1", "GROUPE_ADMINS", "EMAIL_DOMAINE"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.MISSIONS_V1 = "on";
  process.env.GROUPE_ADMINS = "greg@mobiiz.test";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
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
  ctx.emails.clear();
});

const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
let compteur = 0;
const cle = () => `cle-test-${Date.now()}-${compteur++}`;
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(200, 0x20), Buffer.from("\n%%EOF")]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

async function entreprise(email: string, nom: string, options: { verifiee?: boolean } = {}) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { address: "12 rue du Port, 22300 Lannion", phone: "06 12 34 56 78", contactEmail: `contact-${companyId.slice(-4)}@exemple.fr`, ...(options.verifiee === false ? {} : { siret: SIRET_ARTISAN, siretVerifieLe: new Date(Date.now() - 60_000) }) } });
  return { agent, companyId, email, nom };
}
const MISSION = { type: "mission", metier: "Couverture - Toiture", lieu: "Plouha", codePostal: "22580", debut: jour(10), fin: jour(12), types: ["sous-traitance", "renfort"], description: "Pose d'ardoises naturelles sur une maison individuelle.", niveau: "autonome", experience: "3", qualifications: ["Travail en hauteur"], equipe: "1-2", modeChiffrage: "jour", budgetMin: 400, budgetMax: 500, frais: "a-convenir" };
const DISPO = { type: "disponibilite", metier: "Zinguerie", autreMetier: "Couverture - Toiture", ville: "Lannion", codePostal: "22300", rayonKm: 40, debut: jour(5), types: ["renfort", "lot-complet"], presentation: "Équipe de 2 personnes disponible pour zinguerie.", tarifJour: 420, tarifUnite: "personne", dureeMinJours: 2, negociable: true };
const REPONSE = { niveau: "confirme", experienceAns: 8, equipe: 2, message: "Disponibles les 15 et 16 novembre.", tarifJour: 420, tarifUnite: "personne", deplacement: "inclus" };

/** A publie une mission, B y répond, A ouvre la conversation. */
async function scenario() {
  const a = await entreprise("a@exemple.fr", "Toitures Martin");
  const b = await entreprise("b@exemple.fr", "Armor Littoral");
  const c = await entreprise("c@exemple.fr", "Couverture Bretagne");
  const mission = (await a.agent.post("/v1/missions/annonces").send(MISSION).expect(201)).body as { id: string };
  await b.agent.put(`/v1/missions/annonces/${mission.id}/reponse`).send(REPONSE).expect(200);
  const conv = (await a.agent.post(`/v1/missions/annonces/${mission.id}/conversation`).send({ autreId: b.companyId }).expect(200)).body as { id: string };
  return { a, b, c, missionId: mission.id, convId: conv.id };
}
const ecrire = (agent: Agent, convId: string, texte: string, c = cle()) => agent.post(`/v1/missions/conversations/${convId}/messages`).send({ texte, cle: c });

describe("Missions : annonces et réponses", () => {
  it("publier demande une entreprise vérifiée et une saisie complète ; la faute est nommée", async () => {
    const nonVerifiee = await entreprise("n@exemple.fr", "Sans SIRET", { verifiee: false });
    const refus = await nonVerifiee.agent.post("/v1/missions/annonces").send(MISSION).expect(403);
    expect(refus.body.error.details.reason).toBe("non_verifie");
    const a = await entreprise("a@exemple.fr", "Toitures Martin");
    const incomplet = await a.agent.post("/v1/missions/annonces").send({ ...MISSION, description: "court", fin: jour(2) }).expect(400);
    expect(incomplet.body.error.details.fautes.map((f: { champ: string }) => f.champ)).toEqual(["fin", "description"]);
    expect(await ctx.prisma.annonceMission.count()).toBe(0);
  });

  it("une annonce se lit par les autres, jamais dans sa propre recherche ; le lieu exact n'existe pas, le tarif masqué reste privé", async () => {
    const a = await entreprise("a@exemple.fr", "Toitures Martin");
    const b = await entreprise("b@exemple.fr", "Armor Littoral");
    const m = (await a.agent.post("/v1/missions/annonces").send(MISSION).expect(201)).body;
    const d = (await b.agent.post("/v1/missions/annonces").send({ ...DISPO, tarifVisible: false }).expect(201)).body;
    expect(m.budget).toBe("400 à 500 € HT / jour");
    expect(d.tarif).toBe("420 € HT / jour / personne"); // son auteur le voit
    const pourA = (await a.agent.get("/v1/missions/annonces").expect(200)).body.items as { id: string; tarif: string | null; tarifJour: number | null }[];
    expect(pourA.map((x) => x.id)).toEqual([d.id]);
    expect(pourA[0]!.tarif).toBeNull();
    expect(pourA[0]!.tarifJour).toBeNull();
    const pourB = (await b.agent.get("/v1/missions/annonces?type=mission").expect(200)).body.items as { id: string; entreprise: Record<string, unknown> }[];
    expect(pourB.map((x) => x.id)).toEqual([m.id]);
    // Ce qu'on voit d'une autre entreprise : son nom, ses initiales, « vérifiée », son département. Jamais ses coordonnées.
    expect(Object.keys(pourB[0]!.entreprise).sort()).toEqual(["departement", "id", "initiales", "nom", "verifiee"]);
    expect(JSON.stringify(pourB)).not.toMatch(/06 12|contact-|rue du Port/);
  });

  it("suspendre, reprendre, fermer : par son auteur seulement ; une annonce fermée ne se rouvre pas", async () => {
    const { a, b, missionId } = await scenario();
    await b.agent.post(`/v1/missions/annonces/${missionId}/statut`).send({ action: "fermer" }).expect(404);
    await b.agent.patch(`/v1/missions/annonces/${missionId}`).send({ ...MISSION, lieu: "Volé" }).expect(404);
    await a.agent.post(`/v1/missions/annonces/${missionId}/statut`).send({ action: "suspendre" }).expect(200);
    expect((await b.agent.get("/v1/missions/annonces").expect(200)).body.items).toHaveLength(0);
    await a.agent.post(`/v1/missions/annonces/${missionId}/statut`).send({ action: "reprendre" }).expect(200);
    await a.agent.post(`/v1/missions/annonces/${missionId}/statut`).send({ action: "fermer" }).expect(200);
    const refus = await a.agent.post(`/v1/missions/annonces/${missionId}/statut`).send({ action: "reprendre" }).expect(400);
    expect(refus.body.error.details.reason).toBe("action_impossible");
    expect((await ctx.prisma.historiqueMission.findMany({ where: { annonceId: missionId } })).map((h) => h.action)).toEqual(expect.arrayContaining(["publiee", "suspendre", "reprendre", "fermer"]));
  });

  it("une réponse par entreprise et par mission ; lue par son auteur et par l'auteur de la mission, personne d'autre", async () => {
    const { a, b, c, missionId } = await scenario();
    await b.agent.put(`/v1/missions/annonces/${missionId}/reponse`).send({ ...REPONSE, equipe: 3 }).expect(200);
    expect(await ctx.prisma.reponseMission.count()).toBe(1);
    const recues = (await a.agent.get(`/v1/missions/annonces/${missionId}/reponses`).expect(200)).body.items;
    expect(recues).toHaveLength(1);
    expect(recues[0]).toMatchObject({ equipe: 3, niveauLibelle: "Confirmé", tarif: "420 € HT / jour / personne", entreprise: { nom: "Armor Littoral" } });
    await c.agent.get(`/v1/missions/annonces/${missionId}/reponses`).expect(404);
    await b.agent.get(`/v1/missions/annonces/${missionId}/reponses`).expect(404);
    await c.agent.get(`/v1/missions/reponses/${recues[0].id}`).expect(404);
    await b.agent.get(`/v1/missions/reponses/${recues[0].id}`).expect(200);
    // On ne répond ni à sa propre mission, ni à une disponibilité, ni sans entreprise vérifiée.
    await a.agent.put(`/v1/missions/annonces/${missionId}/reponse`).send(REPONSE).expect(400);
    // Une alerte courte pour l'auteur, une seule, sans le texte de la réponse.
    const alertes = (await a.agent.get("/v1/alertes").expect(200)).body.items;
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatchObject({ titre: "Nouvelle réponse à ta mission", categorie: "missions", lue: false });
    expect(JSON.stringify(alertes)).not.toContain("Disponibles les 15");
  });
});

describe("Missions : conversations (jamais de contact libre)", () => {
  it("une conversation n'existe qu'après une réponse à la mission, ouverte par son auteur ; rappelée, c'est la même", async () => {
    const { a, b, c, missionId, convId } = await scenario();
    const sansReponse = await a.agent.post(`/v1/missions/annonces/${missionId}/conversation`).send({ autreId: c.companyId }).expect(400);
    expect(sansReponse.body.error.details.reason).toBe("sans_reponse");
    // C, qui n'a pas répondu, ne peut pas écrire à l'auteur d'une mission.
    expect((await c.agent.post(`/v1/missions/annonces/${missionId}/conversation`).send({ autreId: null }).expect(400)).body.error.details.reason).toBe("sans_reponse");
    expect((await a.agent.post(`/v1/missions/annonces/${missionId}/conversation`).send({ autreId: b.companyId }).expect(200)).body).toEqual({ id: convId, nouvelle: false });
    // Deux ouvertures en même temps : une seule conversation.
    const d = (await b.agent.post("/v1/missions/annonces").send(DISPO).expect(201)).body;
    const [x, y] = await Promise.all([c.agent.post(`/v1/missions/annonces/${d.id}/conversation`).send({ autreId: null }), c.agent.post(`/v1/missions/annonces/${d.id}/conversation`).send({ autreId: null })]);
    expect(x.body.id).toBe(y.body.id);
    expect(await ctx.prisma.conversationMission.count({ where: { annonceId: d.id } })).toBe(1);
    // L'auteur d'une disponibilité ne s'écrit pas à lui-même, et n'ouvre pas vers une entreprise de son choix.
    await b.agent.post(`/v1/missions/annonces/${d.id}/conversation`).send({ autreId: a.companyId }).expect(400);
    expect(await ctx.prisma.conversationMission.count()).toBe(2);
  });

  it("une entreprise non vérifiée ne contacte personne", async () => {
    const b = await entreprise("b@exemple.fr", "Armor Littoral");
    const n = await entreprise("n@exemple.fr", "Sans SIRET", { verifiee: false });
    const d = (await b.agent.post("/v1/missions/annonces").send(DISPO).expect(201)).body;
    const refus = await n.agent.post(`/v1/missions/annonces/${d.id}/conversation`).send({ autreId: null }).expect(403);
    expect(refus.body.error.details.reason).toBe("non_verifie");
  });

  it("isolation : une troisième entreprise ne lit ni n'écrit rien d'une conversation (404)", async () => {
    const { a, c, convId } = await scenario();
    await ecrire(a.agent, convId, "Bonjour, la mission est toujours disponible.").expect(201);
    await c.agent.get(`/v1/missions/conversations/${convId}`).expect(404);
    await ecrire(c.agent, convId, "Je m'invite").expect(404);
    for (const route of ["coordonnees", "archive", "blocage", "signalement"]) {
      await c.agent.post(`/v1/missions/conversations/${convId}/${route}`).send({ accepte: true, archive: true, confirmer: true, motif: "autre" }).expect(404);
    }
    expect((await c.agent.get("/v1/missions/conversations").expect(200)).body.items).toHaveLength(0);
    expect((await c.agent.get("/v1/boite").expect(200)).body.items).toHaveLength(0);
    expect(await ctx.prisma.messageMission.count()).toBe(1);
  });

  it("un message rejoué, ou envoyé deux fois en même temps, n'est écrit qu'une fois ; une seule alerte, un seul e-mail", async () => {
    const { a, b, convId } = await scenario();
    ctx.emails.clear();
    const c1 = cle();
    const premier = (await ecrire(a.agent, convId, "Bonjour", c1).expect(201)).body;
    expect(premier.nouveau).toBe(true);
    expect((await ecrire(a.agent, convId, "Bonjour", c1).expect(201)).body).toEqual({ id: premier.id, nouveau: false });
    const c2 = cle();
    const [x, y] = await Promise.all([ecrire(a.agent, convId, "Deuxième", c2), ecrire(a.agent, convId, "Deuxième", c2)]);
    expect(x.body.id).toBe(y.body.id);
    expect(await ctx.prisma.messageMission.count()).toBe(2);
    const alertes = (await b.agent.get("/v1/alertes").expect(200)).body;
    expect(alertes.items.filter((x: { titre: string }) => x.titre === "Nouveau message")).toHaveLength(2);
    expect(alertes.nonLues).toBe(2);
    // L'e-mail ne part qu'au premier message de la conversation, et ne contient jamais le texte du message.
    const mails = ctx.emails.sent.filter((m) => /Nouveau message/.test(m.subject));
    expect(mails).toHaveLength(1);
    expect(mails[0]!.text).not.toContain("Bonjour");
    await ecrire(a.agent, convId, "   ").expect(400);
    await ecrire(a.agent, convId, "x".repeat(2001)).expect(400);
  });

  it("non-lus : pour celui qui reçoit seulement, jusqu'à ce qu'il ouvre la conversation", async () => {
    const { a, b, convId } = await scenario();
    await ecrire(a.agent, convId, "Bonjour, la mission est toujours disponible.").expect(201);
    const nonLu = async (agent: Agent) => ((await agent.get("/v1/missions/conversations").expect(200)).body.items as { nonLu: boolean }[])[0]!.nonLu;
    expect(await nonLu(a.agent)).toBe(false);
    expect(await nonLu(b.agent)).toBe(true);
    expect((await b.agent.get("/v1/missions/etat").expect(200)).body.nonLus).toBe(1);
    expect((await b.agent.get("/v1/missions/conversations?filtre=non-lues").expect(200)).body.items).toHaveLength(1);
    await b.agent.get(`/v1/missions/conversations/${convId}`).expect(200);
    expect(await nonLu(b.agent)).toBe(false);
    expect((await b.agent.get("/v1/missions/etat").expect(200)).body.nonLus).toBe(0);
    await ecrire(b.agent, convId, "Nous sommes disponibles les 15 et 16.").expect(201);
    expect(await nonLu(a.agent)).toBe(true);
    expect(await nonLu(b.agent)).toBe(false);
    // Archiver ne vaut que pour son côté ; un nouveau message de l'autre la fait revenir.
    await a.agent.post(`/v1/missions/conversations/${convId}/archive`).send({ archive: true }).expect(200);
    expect((await a.agent.get("/v1/missions/conversations").expect(200)).body.items).toHaveLength(0);
    expect((await a.agent.get("/v1/missions/conversations?filtre=archivees").expect(200)).body.items).toHaveLength(1);
    expect((await b.agent.get("/v1/missions/conversations").expect(200)).body.items).toHaveLength(1);
    await ecrire(b.agent, convId, "Toujours partants ?").expect(201);
    expect((await a.agent.get("/v1/missions/conversations").expect(200)).body.items).toHaveLength(1);
  });

  it("coordonnées : privées jusqu'à l'accord des DEUX ; un numéro écrit dans un message est masqué d'ici là", async () => {
    const { a, b, convId } = await scenario();
    await ecrire(a.agent, convId, "Appelle-moi au 06 12 34 56 78 ou martin@toitures.fr").expect(201);
    let vueB = (await b.agent.get(`/v1/missions/conversations/${convId}`).expect(200)).body;
    expect(vueB.coordonnees).toEqual({ etat: "privees" });
    expect(vueB.messages[0].texte).not.toMatch(/06 12|martin@/);
    expect(vueB.messages[0].texte).toContain("coordonnées masquées");
    expect((await b.agent.get("/v1/missions/conversations").expect(200)).body.items[0].extrait).not.toMatch(/06 12|martin@/);
    expect((await a.agent.post(`/v1/missions/conversations/${convId}/coordonnees`).send({ accepte: true }).expect(200)).body.etat).toBe("proposees_par_moi");
    vueB = (await b.agent.get(`/v1/missions/conversations/${convId}`).expect(200)).body;
    expect(vueB.coordonnees).toEqual({ etat: "proposees_par_l_autre" });
    expect(JSON.stringify(vueB)).not.toMatch(/06 12/);
    expect((await b.agent.post(`/v1/missions/conversations/${convId}/coordonnees`).send({ accepte: true }).expect(200)).body.etat).toBe("partagees");
    vueB = (await b.agent.get(`/v1/missions/conversations/${convId}`).expect(200)).body;
    expect(vueB.coordonnees).toMatchObject({ etat: "partagees", nom: "Toitures Martin", telephone: "06 12 34 56 78" });
    expect(vueB.messages[0].texte).toContain("06 12 34 56 78");
    // Une fois partagées, elles le restent.
    await a.agent.post(`/v1/missions/conversations/${convId}/coordonnees`).send({ accepte: false }).expect(400);
  });

  it("bloquer ferme tout échange entre les deux ; signaler arrive chez l'admin, jamais chez une entreprise", async () => {
    const { a, b, missionId, convId } = await scenario();
    await b.agent.post(`/v1/missions/conversations/${convId}/signalement`).send({ motif: "demarchage", precision: "Publicité" }).expect(200);
    expect((await b.agent.post(`/v1/missions/conversations/${convId}/signalement`).send({ motif: "demarchage" }).expect(200)).body.deja).toBe(true);
    await b.agent.post(`/v1/missions/conversations/${convId}/blocage`).send({ confirmer: true }).expect(200);
    expect((await ecrire(a.agent, convId, "Encore moi").expect(403)).body.error.details.reason).toBe("bloquee");
    await ecrire(b.agent, convId, "Moi non plus").expect(403);
    // Leurs annonces ne se voient plus, et A ne rouvre rien vers B.
    expect((await b.agent.get("/v1/missions/annonces").expect(200)).body.items).toHaveLength(0);
    await b.agent.get(`/v1/missions/annonces/${missionId}`).expect(404);
    expect((await a.agent.get(`/v1/missions/annonces/${missionId}/reponses`).expect(200)).body.items).toHaveLength(0);
    await a.agent.get("/v1/admin/missions/signalements").expect(403);
    const admin = await entreprise("greg@mobiiz.test", "Mobiiz");
    await doubleAuthentification(ctx, admin.agent, "greg@mobiiz.test");
    const liste = (await admin.agent.get("/v1/admin/missions/signalements").expect(200)).body.items;
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ de: "Armor Littoral", cible: "Toitures Martin", motif: "Démarchage ou publicité" });
  });
});

describe("Missions : pièces jointes et dossier professionnel", () => {
  const joindre = (agent: Agent, url: string, contenu: Buffer, nom: string, type: string, champs: Record<string, string> = {}) => {
    let r = agent.post(url);
    for (const [k, v] of Object.entries(champs)) r = r.field(k, v);
    return r.attach("file", contenu, { filename: nom, contentType: type });
  };

  it("type, taille et contenu : un fichier refusé dit pourquoi et n'est jamais gardé", async () => {
    const { a, convId } = await scenario();
    const url = `/v1/missions/conversations/${convId}/fichiers`;
    const raison = async (contenu: Buffer, nom: string, type: string) => (await joindre(a.agent, url, contenu, nom, type, { cle: cle() })).body.error?.details?.reason;
    expect(await raison(Buffer.from("MZ exécutable"), "virus.exe", "application/x-msdownload")).toBe("fichier_type_refuse");
    expect(await raison(PNG, "faux.pdf", "application/pdf")).toBe("fichier_contenu_different");
    expect(await raison(Buffer.from("<html><script>alert(1)</script>"), "page.pdf", "application/pdf")).toBe("fichier_type_refuse");
    expect(await raison(Buffer.alloc(0), "vide.pdf", "application/pdf")).toBe("fichier_vide");
    const lourd = await joindre(a.agent, url, Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(4 * 1024 * 1024 + 10)]), "lourd.pdf", "application/pdf", { cle: cle() });
    expect(lourd.status).toBeGreaterThanOrEqual(400);
    expect(await ctx.prisma.fichierPro.count()).toBe(0);
    expect(await ctx.prisma.messageMission.count()).toBe(0);
  });

  it("une pièce jointe d'un message : les deux entreprises l'ouvrent par un lien privé et temporaire ; une troisième, jamais", async () => {
    const { a, b, c, convId } = await scenario();
    const k = cle();
    const envoi = await joindre(a.agent, `/v1/missions/conversations/${convId}/fichiers`, PDF, "plans-plouha.pdf", "application/pdf", { cle: k, texte: "Voici les plans." }).expect(201);
    // Rejoué avec la même clé : ni second message ni second fichier.
    await joindre(a.agent, `/v1/missions/conversations/${convId}/fichiers`, PDF, "plans-plouha.pdf", "application/pdf", { cle: k }).expect(201);
    expect(await ctx.prisma.fichierPro.count()).toBe(1);
    const vue = (await b.agent.get(`/v1/missions/conversations/${convId}`).expect(200)).body;
    const fichier = vue.messages.find((m: { id: string }) => m.id === envoi.body.id).fichiers[0];
    expect(fichier).toMatchObject({ nom: "plans-plouha.pdf", type: "application/pdf" });
    const lien = (await b.agent.get(`/v1/fichiers-pro/${fichier.id}/lien`).expect(200)).body as { url: string };
    const ouvert = await b.agent.get(lien.url).expect(200);
    expect(ouvert.headers["content-type"]).toContain("application/pdf");
    expect(ouvert.headers["cache-control"]).toContain("no-store");
    // Une troisième entreprise : pas de lien ; et le lien de B ne lui sert à rien (il est lié à l'entreprise de B).
    await c.agent.get(`/v1/fichiers-pro/${fichier.id}/lien`).expect(404);
    await c.agent.get(lien.url).expect(404);
    await request(ctx.app.getHttpServer()).get(lien.url).expect(401);
    // Lien expiré (même signature valide) : refusé ; signature modifiée : introuvable.
    const expire = Date.now() - 1000;
    const signature = createHmac("sha256", "test-secret-test-secret-test-secret-000").update(`fichier-pro.${fichier.id}.${b.companyId}.${expire}`).digest("base64url");
    const refus = await b.agent.get(`/v1/fichiers-pro/ouvrir/${fichier.id}.${expire}.${signature}`).expect(403);
    expect(refus.body.error.details.reason).toBe("lien_expire");
    await b.agent.get(`${lien.url.slice(0, -3)}abc`).expect(404);
    // Bloquée, la conversation ne donne plus accès à ses pièces.
    await b.agent.post(`/v1/missions/conversations/${convId}/blocage`).send({ confirmer: true }).expect(200);
    await b.agent.get(lien.url).expect(404);
    await a.agent.get(`/v1/fichiers-pro/${fichier.id}/lien`).expect(200); // son propriétaire le garde
  });

  it("un document du dossier ne se voit que dans le cadre choisi par son propriétaire : partagé dans une réponse, puis retiré", async () => {
    const a = await entreprise("a@exemple.fr", "Toitures Martin");
    const b = await entreprise("b@exemple.fr", "Armor Littoral");
    const c = await entreprise("c@exemple.fr", "Couverture Bretagne");
    const cv = (await joindre(b.agent, "/v1/dossier-pro", PDF, "CV-couvreur.pdf", "application/pdf", { categorie: "cv", titre: "CV" }).expect(201)).body as { id: string };
    const prive = (await joindre(b.agent, "/v1/dossier-pro", PDF, "decennale.pdf", "application/pdf", { categorie: "assurance" }).expect(201)).body as { id: string };
    await joindre(b.agent, "/v1/dossier-pro", PDF, "x.pdf", "application/pdf", { categorie: "inconnue" }).expect(400);
    expect((await a.agent.get("/v1/dossier-pro").expect(200)).body.items).toHaveLength(0);
    await a.agent.get(`/v1/fichiers-pro/${cv.id}/lien`).expect(404);
    const mission = (await a.agent.post("/v1/missions/annonces").send(MISSION).expect(201)).body as { id: string };
    // Partager le document d'une autre entreprise est refusé, jamais ignoré.
    const cvDeC = (await joindre(c.agent, "/v1/dossier-pro", PDF, "cv-c.pdf", "application/pdf", { categorie: "cv" }).expect(201)).body as { id: string };
    expect((await b.agent.put(`/v1/missions/annonces/${mission.id}/reponse`).send({ ...REPONSE, documentIds: [cvDeC.id] }).expect(400)).body.error.details.reason).toBe("document_inconnu");
    await b.agent.put(`/v1/missions/annonces/${mission.id}/reponse`).send({ ...REPONSE, documentIds: [cv.id] }).expect(200);
    const recue = (await a.agent.get(`/v1/missions/annonces/${mission.id}/reponses`).expect(200)).body.items[0];
    expect(recue.documents.map((d: { id: string }) => d.id)).toEqual([cv.id]);
    const lien = (await a.agent.get(`/v1/fichiers-pro/${cv.id}/lien`).expect(200)).body as { url: string };
    await a.agent.get(lien.url).expect(200);
    await a.agent.get(`/v1/fichiers-pro/${prive.id}/lien`).expect(404); // non partagé
    await c.agent.get(`/v1/fichiers-pro/${cv.id}/lien`).expect(404);
    await a.agent.delete(`/v1/fichiers-pro/${cv.id}`).expect(404); // A ne supprime pas le document de B
    await a.agent.patch(`/v1/dossier-pro/${cv.id}`).send({ titre: "Volé" }).expect(404);
    // B retire sa réponse : le lien déjà émis se ferme aussi.
    await b.agent.delete(`/v1/missions/annonces/${mission.id}/reponse`).expect(200);
    await a.agent.get(lien.url).expect(404);
    await a.agent.get(`/v1/fichiers-pro/${cv.id}/lien`).expect(404);
  });

  it("profil public : invisible par défaut ; une réalisation ne se montre que profil visible, à une entreprise vérifiée", async () => {
    const b = await entreprise("b@exemple.fr", "Armor Littoral");
    const c = await entreprise("c@exemple.fr", "Couverture Bretagne");
    const n = await entreprise("n@exemple.fr", "Sans SIRET", { verifiee: false });
    const photo = (await joindre(b.agent, "/v1/dossier-pro", PNG, "chantier.png", "image/png", { categorie: "realisation" }).expect(201)).body as { id: string };
    await b.agent.patch(`/v1/dossier-pro/${photo.id}`).send({ surProfil: true }).expect(200);
    await c.agent.get(`/v1/profil-public/${b.companyId}`).expect(404);
    await c.agent.get(`/v1/fichiers-pro/${photo.id}/lien`).expect(404);
    await b.agent.put("/v1/profil-public").send({ visible: true, presentation: "Couvreur-zingueur, équipe de 3.", metiers: ["Zinguerie"], services: null, equipe: "3 personnes", ville: "Lannion" }).expect(200);
    const profil = (await c.agent.get(`/v1/profil-public/${b.companyId}`).expect(200)).body;
    expect(profil).toMatchObject({ visible: true, presentation: "Couvreur-zingueur, équipe de 3.", entreprise: { nom: "Armor Littoral" } });
    expect(profil.realisations.map((r: { id: string }) => r.id)).toEqual([photo.id]);
    expect(JSON.stringify(profil)).not.toMatch(/06 12|contact-|rue du Port/);
    await c.agent.get(`/v1/fichiers-pro/${photo.id}/lien`).expect(200);
    await n.agent.get(`/v1/fichiers-pro/${photo.id}/lien`).expect(404);
    await n.agent.put("/v1/profil-public").send({ visible: true, presentation: null, metiers: [], services: null, equipe: null, ville: null }).expect(403);
  });
});

describe("« Messages et réponses » et la cloche : deux circuits séparés", () => {
  it("une conversation Missions et un e-mail de négoce se lisent côte à côte, chacun dans son circuit ; lire l'un ne lit pas l'autre", async () => {
    const { a, b, convId } = await scenario();
    await ecrire(b.agent, convId, "Nous sommes disponibles.").expect(201);
    const email = await ctx.prisma.emailRecuArtisan.create({ data: { companyId: a.companyId, adresse: "toitures-martin", de: "Point.P Lannion <devis@pointp.example>", objet: "Votre demande", texte: "Bonjour, vous trouverez notre proposition.", recuLe: new Date() } });
    const boite = (await a.agent.get("/v1/boite").expect(200)).body.items as { cle: string; sorte: string; titre: string; nonLu: boolean; href: string }[];
    expect(boite.map((i) => [i.sorte, i.titre, i.nonLu]).sort()).toEqual([["mission", "Armor Littoral", true], ["negoce", "Point.P Lannion", true]]);
    expect(boite.find((i) => i.sorte === "negoce")!.href).toBe(`/messages/negoce/${email.id}`);
    // B ne voit rien de l'e-mail de A et ne peut pas le marquer lu.
    expect((await b.agent.get("/v1/boite").expect(200)).body.items.map((i: { sorte: string }) => i.sorte)).toEqual(["mission"]);
    await b.agent.post("/v1/boite/lu").send({ cle: `negoce:${email.id}` }).expect(404);
    await a.agent.post("/v1/boite/lu").send({ cle: `negoce:${email.id}` }).expect(200);
    const apres = (await a.agent.get("/v1/boite").expect(200)).body.items as { sorte: string; nonLu: boolean }[];
    expect(apres.find((i) => i.sorte === "negoce")!.nonLu).toBe(false);
    expect(apres.find((i) => i.sorte === "mission")!.nonLu).toBe(true);
    // Aucun message Missions n'est né de l'e-mail, aucun e-mail d'un message.
    expect(await ctx.prisma.messageMission.count()).toBe(1);
    expect(await ctx.prisma.emailRecuArtisan.count()).toBe(1);
  });

  it("la cloche : alertes courtes, lues une à une ou toutes, jamais celles d'une autre entreprise", async () => {
    const { a, b, convId } = await scenario();
    await ecrire(a.agent, convId, "Bonjour").expect(201);
    const alertes = (await b.agent.get("/v1/alertes").expect(200)).body;
    expect(alertes.items[0]).toMatchObject({ titre: "Nouveau message", detail: expect.stringContaining("Toitures Martin"), action: "Ouvrir la conversation", href: `/messages/${convId}`, genre: "action" });
    await a.agent.post(`/v1/alertes/${alertes.items[0].id}/lue`).send({}).expect(404);
    await b.agent.post(`/v1/alertes/${alertes.items[0].id}/lue`).send({}).expect(200);
    expect((await b.agent.get("/v1/alertes").expect(200)).body.nonLues).toBe(0);
    await ecrire(a.agent, convId, "Encore").expect(201);
    await a.agent.post("/v1/alertes/lues").send({ avant: new Date(Date.now() + 1000).toISOString() }).expect(200);
    expect((await b.agent.get("/v1/alertes").expect(200)).body.nonLues).toBe(1);
    await b.agent.post("/v1/alertes/lues").send({ avant: new Date(Date.now() + 1000).toISOString() }).expect(200);
    expect((await b.agent.get("/v1/alertes").expect(200)).body.nonLues).toBe(0);
  });

  it("réglages : la catégorie Missions coupée, plus d'e-mail ; l'alerte reste dans la cloche", async () => {
    const { a, b, convId } = await scenario();
    expect((await b.agent.get("/v1/alertes/reglages").expect(200)).body).toEqual({ prix: true, groupe: true, missions: true, conseils: false, email: true, push: true });
    await b.agent.put("/v1/alertes/reglages").send({ prix: true, groupe: true, missions: false, conseils: false, email: true, push: true }).expect(200);
    ctx.emails.clear();
    await ecrire(a.agent, convId, "Bonjour").expect(201);
    expect(ctx.emails.sent).toHaveLength(0);
    expect((await b.agent.get("/v1/alertes").expect(200)).body.nonLues).toBe(1);
    // Les réglages de B ne touchent pas A.
    expect((await a.agent.get("/v1/alertes/reglages").expect(200)).body.missions).toBe(true);
    await b.agent.put("/v1/alertes/reglages").send({ missions: "oui" }).expect(400);
  });
});

describe("Demande individuelle : trois négoces au plus par envoi (prompt maître, parcours 1, point 7)", () => {
  it("le serveur refuse un envoi à quatre négoces et dit pourquoi ; rien n'est créé", async () => {
    const { agent } = await entreprise("a@exemple.fr", "Toitures Martin");
    const projet = (await agent.post("/v1/projects").send({ name: "Chantier Plouha" }).expect(201)).body as { id: string };
    const ids: string[] = [];
    for (const n of ["Point.P", "Larivière", "Quéguiner", "Dupont"]) ids.push((await agent.post("/v1/suppliers").send({ name: n, email: `${n.toLowerCase().replace(/[^a-z]/g, "")}@negoce.example` }).expect(201)).body.id as string);
    const refus = await agent.post(`/v1/projects/${projet.id}/price-requests`).send({ supplierIds: ids });
    expect(refus.status).toBe(400);
    expect(refus.body.error.details).toMatchObject({ reason: "trop_de_negoces", phrase: "Choisis 3 négoces au plus pour cette demande." });
    expect(await ctx.prisma.priceRequest.count()).toBe(0);
  });
});
