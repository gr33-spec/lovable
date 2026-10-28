import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";
import { dezip, ecrireXlsx, lireXlsx } from "../src/platform/xlsx/xlsx.js";

/**
 * PAGE NÉGOCE (Greg, 28 octobre 2026, point 3) : « Télécharger en PDF » (joint aussi à l'e-mail), « Exporter en Excel »,
 * l'Excel rempli lu par le code (ligne vide, fichier modifié, mauvais fichier), la confirmation avec le PDF de l'offre,
 * l'anonymat (un négoce ne voit jamais les clients d'un autre), et le suivi de l'admin (vu, PDF, Excel, répondu).
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "GROUPE_ADMINS", "CRON_SECRET", "PRIX_REPERES", "SEUIL_VOLUME_MIN", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "COMMISSION_DEFAUT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  delete process.env.COMMISSION_DEFAUT;
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.PRIX_REPERES = "ardoise:pieces=1.2";
  process.env.SEUIL_VOLUME_MIN = "couverture=1000";
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
  ctx.emails.sent.length = 0;
});

const A3222 = "Ardoise naturelle 32×22 Espagne 1er choix";
const LITEAU = "Liteaux 27×38";
const publique = () => request(ctx.app.getHttpServer());
const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const tache = (maintenant: string) => publique().get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const jetonDe = (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).filter((m) => m.subject.startsWith("Demande de prix groupée")).at(-1)!.text)![1]!;
const binaire = (jeton: string, fichier: string) => publique().get(`/v1/public/achat-groupe/${jeton}/${fichier}`).buffer(true).parse((res, cb) => {
  const morceaux: Buffer[] = [];
  res.on("data", (d: Buffer) => morceaux.push(d));
  res.on("end", () => cb(null, Buffer.concat(morceaux)));
});

/** Deux artisans, deux négoces : X (de Toitures 1) et Y (de Toitures 2) ; la clôture envoie les demandes. */
async function deuxNegoces() {
  const a = await couvreurAvecListe(ctx, "artisan1@toitures.fr", "Toitures 1", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: A3222, quantite: "100", unite: "pièces" }]);
  const b = await couvreurAvecListe(ctx, "artisan2@toitures.fr", "Toitures 2", "8 rue du Port, 22500 Paimpol", [{ libelle: A3222, quantite: "100", unite: "pièces" }]);
  const la = (
    await a.agent
      .post("/v1/achats-groupes")
      .send({ lignes: [{ designation: A3222, quantite: 1800, unite: "pièces" }, { designation: LITEAU, quantite: 400, unite: "m" }], livraison: "22300 Lannion", dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true })
      .expect(201)
  ).body;
  await b.agent
    .post("/v1/achats-groupes")
    .send({ achatId: la.achatId, lignes: [{ designation: A3222, quantite: 900, unite: "pièces" }], livraison: "22500 Paimpol", dateBesoin: null, negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }], engagement: true })
    .expect(201);
  const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } });
  await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString());
  return { achat, x: jetonDe("x@negoce.fr"), y: jetonDe("y@negoce.fr") };
}

describe("la page du négoce : PDF, Excel, trois façons de répondre", { timeout: 240_000 }, () => {
  it("la demande en PDF : jointe à l'e-mail, téléchargeable, sans le client d'un autre négoce ; l'admin voit vu / PDF / Excel / répondu", async () => {
    const { achat, x, y } = await deuxNegoces();
    const mailX = mailsVers(ctx, "x@negoce.fr").find((m) => m.subject.startsWith("Demande de prix groupée"))!;
    expect(mailX.attachments?.map((p) => [p.filename, p.contentType])).toEqual([["demande-mobiiz.pdf", "application/pdf"]]);
    expect(Buffer.from(mailX.attachments![0]!.contentBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");

    const pdf = (await binaire(x, "demande.pdf").expect(200)).body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const texte = execFileSync("/usr/bin/python3", ["-I", "-c", "import sys; from pypdf import PdfReader; print('\\n'.join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))", ecrire(pdf, "demande.pdf")]).toString();
    // Le titre, les dates, « De la part de », le tableau (référence, désignation, quantité cumulée, unité), les règles, le lien.
    expect(texte).toContain("Couverture · secteur");
    expect(texte).toMatch(/Livraison souhaitée avant le \d+ \S+/);
    expect(texte).toMatch(/Réponse attendue avant le \d+ \S+/);
    expect(texte).toContain("De la part de votre client Toitures 1, via Mobiiz");
    expect(texte).not.toContain("Toitures 2");
    expect(texte).not.toContain("Paimpol");
    expect(texte).toContain("Ardoise 32x22 Espagne 1er choix");
    expect(texte).toMatch(/2[\s\u00a0]700/);
    expect(texte).toContain("Une seule offre, sans deuxième tour");
    expect(texte).toContain(`/achat-groupe/${x}`);
    // Y ne voit que SON client, et jamais la commune de l'autre.
    const texteY = execFileSync("/usr/bin/python3", ["-I", "-c", "import sys; from pypdf import PdfReader; print('\\n'.join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))", ecrire((await binaire(y, "demande.pdf").expect(200)).body as Buffer, "demande-y.pdf")]).toString();
    expect(texteY).toContain("De la part de votre client Toitures 2, via Mobiiz");
    expect(texteY).not.toContain("Toitures 1");
    // Le secteur du titre est le nom public de l'achat (« secteur Lannion ») ; la commune de l'autre client n'est nulle part ailleurs.
    expect(texteY.split("\n").filter((l) => l.includes("Lannion"))).toEqual(["Couverture · secteur Lannion"]);
    const pageY = (await publique().get(`/v1/public/achat-groupe/${y}`).expect(200)).body;
    expect(JSON.stringify(pageY)).not.toContain("Toitures 1");

    // L'admin : X a vu la page (pas encore : le PDF ne compte pas comme une visite), téléchargé le PDF ; Y rien d'autre.
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    await publique().get(`/v1/public/achat-groupe/${x}`).expect(200);
    await binaire(x, "demande.xlsx").expect(200);
    const admin = (await greg.agent.get(`/v1/admin/pilotage/achats-groupes/${achat.id}`).expect(200)).body;
    const suivi = Object.fromEntries(admin.offres.map((o: { email: string; vu: boolean; pdfTelecharge: boolean; excelTelecharge: boolean; repondu: boolean }) => [o.email, [o.vu, o.pdfTelecharge, o.excelTelecharge, o.repondu]]));
    expect(suivi).toEqual({ "x@negoce.fr": [true, true, true, false], "y@negoce.fr": [true, true, false, false] });
  });

  it("l'Excel : les lignes, « Prix unitaire HT » et « Disponible » libres, le reste protégé, la feuille Conditions ; rempli, lu par le code ; une ligne vide ; un fichier modifié ; un fichier d'une autre demande ; puis l'offre envoyée avec sa confirmation", async () => {
    const { x, y } = await deuxNegoces();
    const xlsx = (await binaire(x, "demande.xlsx").expect(200)).body as Buffer;
    const feuilles = lireXlsx(xlsx);
    expect(feuilles.map((f) => f.nom)).toEqual(["Demande", "Conditions", "_mobiiz"]);
    const demande = feuilles[0]!;
    expect(demande.lignes[0]).toEqual(["Référence", "Désignation", "Quantité", "Unité", "Prix unitaire HT", "Disponible (oui/non)"]);
    // Des références courtes (R1, R2…), jamais la clé interne du catalogue ; « ml » s'écrit « m ».
    expect(demande.lignes[1]).toEqual(["R1", "Ardoise 32×22 Espagne 1er choix", 2700, "pièces", null, null]);
    expect(demande.lignes[2]).toEqual(["R2", "Liteaux 27×38", 400, "m", null, null]);
    const conditions = feuilles[1]!.lignes.map((l) => String(l[0]));
    expect(conditions.join("\n")).toMatch(/livraison incluse/i);
    expect(conditions.join("\n")).toMatch(/Réponse attendue avant le/);
    expect(conditions.join("\n")).toMatch(/validité/);
    expect(conditions.join("\n")).not.toContain("Toitures 2");
    const sheet = dezip(xlsx).get("xl/worksheets/sheet1.xml")!.toString("utf8");
    expect(sheet).toContain("<sheetProtection");
    expect(dezip(xlsx).get("xl/workbook.xml")!.toString("utf8")).toContain('state="hidden"');
    const [cleArdoise, cleLiteau] = (await publique().get(`/v1/public/achat-groupe/${x}`).expect(200)).body.lignes.map((l: { cle: string }) => l.cle) as [string, string];

    // Rempli dans un vrai tableur (openpyxl) : la ligne 2 avec un prix, la ligne 3 laissée vide.
    const dir = mkdtempSync(path.join(tmpdir(), "negoce-"));
    const gabarit = path.join(dir, "demande.xlsx");
    writeFileSync(gabarit, xlsx);
    const rempli = path.join(dir, "rempli.xlsx");
    execFileSync("/usr/bin/python3", ["-I", "-c", `
import openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb["Demande"]
ws["E2"] = 1.15
ws["F2"] = "oui"
wb.save(sys.argv[2])
`, gabarit, rempli]);
    const lecture = (await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: readFileSync(rempli).toString("base64") }).expect(200)).body;
    expect(lecture.lignes.map((l: { cle: string; prixHt: number | null; etat: string }) => [l.cle, l.prixHt, l.etat])).toEqual([
      [cleArdoise, 1.15, "ok"],
      [cleLiteau, null, "vide"],
    ]);
    expect(lecture.aCorriger).toBe(1);

    // « non » dans Disponible : « je ne fournis pas », rien à corriger ; un prix en texte avec virgule se lit.
    const complet = path.join(dir, "complet.xlsx");
    execFileSync("/usr/bin/python3", ["-I", "-c", `
import openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb["Demande"]
ws["E2"] = "1,15 €"
ws["F3"] = "non"
wb.save(sys.argv[2])
`, gabarit, complet]);
    const lecture2 = (await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: readFileSync(complet).toString("base64") }).expect(200)).body;
    expect(lecture2.lignes.map((l: { prixHt: number | null; etat: string }) => [l.prixHt, l.etat])).toEqual([
      [1.15, "ok"],
      [null, "non_fourni"],
    ]);
    expect(lecture2.aCorriger).toBe(0);

    // Un fichier modifié (colonne « Prix unitaire HT » retirée) est refusé avec une phrase claire.
    const modifie = path.join(dir, "modifie.xlsx");
    execFileSync("/usr/bin/python3", ["-I", "-c", `
import openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb["Demande"]
ws.protection.sheet = False
ws.delete_cols(5)
wb.save(sys.argv[2])
`, gabarit, modifie]);
    expect((await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: readFileSync(modifie).toString("base64") }).expect(400)).body.error.details).toMatchObject({ reason: "excel_modifie" });
    // L'Excel d'un autre négoce (Y) déposé sur la page de X : refusé ; un fichier qui n'est pas un classeur : refusé.
    const xlsxY = (await binaire(y, "demande.xlsx").expect(200)).body as Buffer;
    expect((await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: xlsxY.toString("base64") }).expect(400)).body.error.details).toMatchObject({ reason: "excel_inconnu" });
    expect((await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: Buffer.from("%PDF-1.4 pas un classeur").toString("base64") }).expect(400)).body.error.details).toMatchObject({ reason: "excel_invalide" });
    const faux = ecrireXlsx([{ nom: "Demande", lignes: [["Référence", "Prix unitaire HT"], [cleArdoise, 1]] }]);
    expect((await publique().post(`/v1/public/achat-groupe/${x}/excel`).send({ contenuBase64: faux.toString("base64") }).expect(400)).body.error.details).toMatchObject({ reason: "excel_inconnu" });

    // Les prix lus sont envoyés comme une réponse ligne par ligne : confirmation à l'écran et par e-mail, avec le PDF de l'offre.
    ctx.emails.sent.length = 0;
    const apres = (await publique().post(`/v1/public/achat-groupe/${x}`).send({ accepteConditions: true, prix: Object.fromEntries(lecture2.lignes.map((l: { cle: string; prixHt: number | null }) => [l.cle, l.prixHt])), delaiJours: 10 }).expect(200)).body;
    expect(apres.reponse.recap).toMatchObject({ totalHt: 3105, manquantes: ["Liteaux 27×38"], delaiJours: 10 });
    const confirmation = mailsVers(ctx, "x@negoce.fr").find((m) => m.subject.startsWith("Offre enregistrée"))!;
    expect(confirmation.text).toMatch(/Total HT livré : 3[\s\u00a0]105,00 €/);
    expect(confirmation.text).toContain("non fourni : Liteaux 27×38");
    expect(confirmation.attachments?.map((p) => p.filename)).toEqual(["mon-offre-mobiiz.pdf"]);
    const texteOffre = execFileSync("/usr/bin/python3", ["-I", "-c", "import sys; from pypdf import PdfReader; print('\\n'.join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))", ecrire(Buffer.from(confirmation.attachments![0]!.contentBase64, "base64"), "offre.pdf")]).toString();
    expect(texteOffre).toContain("Votre offre");
    expect(texteOffre).toContain("Négoce X");
    expect(texteOffre).toMatch(/3[\s\u00a0]105,00/);
    expect(texteOffre).toContain("non fourni");
    // Une seule offre : la deuxième est refusée.
    expect((await publique().post(`/v1/public/achat-groupe/${x}`).send({ accepteConditions: true, prix: { [cleArdoise]: 1, [cleLiteau]: 1 } }).expect(409)).body.error.details.reason).toBe("deja_repondu");
  });
});

function ecrire(buf: Buffer, nom: string): string {
  const f = path.join(mkdtempSync(path.join(tmpdir(), "pdf-")), nom);
  writeFileSync(f, buf);
  return f;
}
