import { crc32, deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { confirmerEmail } from "../e2e/confirmer-email";

/**
 * LOGO OU PHOTO DU PROFIL MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 12). Les initiales par
 * défaut ; une image choisie se recadre (au doigt ou par les réglages, donc aussi au clavier), s'enregistre en carré,
 * reste après actualisation, se remplace et se retire avec confirmation ; un fichier qui n'est pas une image est refusé
 * avec une phrase. Le serveur ne garde qu'un JPEG carré de 512 px.
 */
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Une vraie image PNG unie (large, pas carrée), fabriquée ici : rien n'est lu sur le disque. */
function png(largeur: number, hauteur: number, [r, v, b]: [number, number, number]): Buffer {
  const bloc = (nom: string, corps: Buffer) => {
    const tete = Buffer.alloc(4);
    tete.writeUInt32BE(corps.length);
    const type = Buffer.from(nom, "latin1");
    const somme = Buffer.alloc(4);
    somme.writeUInt32BE(crc32(Buffer.concat([type, corps])) >>> 0);
    return Buffer.concat([tete, type, corps, somme]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const ligne = Buffer.concat([Buffer.from([0]), Buffer.alloc(largeur * 3, 0).map((_, i) => [r, v, b][i % 3]!)]);
  const pixels = Buffer.concat(Array.from({ length: hauteur }, () => ligne));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloc("IHDR", ihdr), bloc("IDAT", deflateSync(pixels)), bloc("IEND", Buffer.alloc(0))]);
}

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Guide" }), async () => {
    await page.getByRole("button", { name: "Passer le guide" }).click();
  });
});

async function inscrire(page: Page) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Greg Exemple");
  await page.getByLabel("Nom de ton entreprise").fill(`Toits Martin ${unique()}`);
  await page.getByRole("button", { name: "Couverture, charpente, zinguerie" }).click();
  const email = `artisan-${unique()}@example.fr`;
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales d'utilisation/ }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await confirmerEmail(page, email);
}

/** L'image de MON entreprise telle que le serveur la rend : son type et son côté en pixels (lus dans le navigateur). */
async function imageServie(page: Page): Promise<{ statut: number; type: string | null; cote: number | null }> {
  return page.evaluate(async () => {
    const actif = localStorage.getItem("baticlair.companyId");
    const entetes: Record<string, string> = actif ? { "x-company-id": actif } : {};
    const moi = (await (await fetch("/v1/profil-public", { headers: { accept: "application/json", ...entetes }, cache: "no-store" })).json()) as { entreprise: { id: string } };
    const res = await fetch(`/v1/profil-public/${moi.entreprise.id}/image?t=${Date.now()}`, { headers: entetes, cache: "no-store" });
    if (!res.ok) return { statut: res.status, type: null, cote: null };
    const bitmap = await createImageBitmap(await res.blob());
    return { statut: res.status, type: res.headers.get("content-type"), cote: bitmap.width === bitmap.height ? bitmap.width : -1 };
  });
}

test("profil Missions : initiales par défaut, image recadrée et enregistrée en carré, gardée, remplacée, retirée ; faux fichier refusé", async ({ page }) => {
  test.setTimeout(180_000);
  await inscrire(page);
  await page.goto("/compte/profil-public");
  const bloc = page.getByRole("region", { name: "Logo ou photo de l'entreprise" });
  await expect(bloc).toContainText("Sans image, tes initiales sont affichées.");
  await expect(bloc.locator("img")).toHaveCount(0);
  expect((await imageServie(page)).statut).toBe(404);

  // Un fichier qui n'est pas une image : refusé avec une phrase, rien n'est envoyé.
  const choisir = bloc.getByLabel("Choisir une image");
  await choisir.setInputFiles({ name: "logo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(bloc.getByRole("alert")).toHaveText("Choisis une image JPEG, PNG ou WebP.");
  // Un fichier qui se dit image mais ne l'est pas : refusé aussi.
  await choisir.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("pas une image") });
  await expect(bloc.getByRole("alert")).toHaveText("Cette image n'a pas pu être lue. Essaie avec une autre.");

  // Une vraie image, large : l'aperçu apparaît, elle se recadre par les réglages (clavier compris).
  await choisir.setInputFiles({ name: "chantier.png", mimeType: "image/png", buffer: png(600, 300, [20, 90, 200]) });
  const recadrage = bloc.getByRole("group", { name: "Recadrer l'image" });
  await expect(recadrage.getByRole("img", { name: "Aperçu de l'image recadrée" })).toBeVisible();
  const zoom = recadrage.getByRole("slider", { name: "Zoom" });
  await zoom.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  expect(Number(await zoom.inputValue())).toBeGreaterThan(1);
  await recadrage.getByRole("slider", { name: "Horizontal" }).fill("20");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Double appui : une seule image enregistrée.
  await recadrage.getByRole("button", { name: "Utiliser cette image" }).dblclick();
  await expect(bloc.getByRole("status")).toHaveText("Image enregistrée.");
  await expect(bloc.locator("img")).toHaveCount(1);
  await expect(bloc).toContainText("Visible avec ton nom dans tes annonces");
  // Le serveur ne garde qu'un JPEG carré de 512 px.
  expect(await imageServie(page)).toEqual({ statut: 200, type: "image/jpeg", cote: 512 });

  // Gardée après actualisation, et montrée sur le profil tel que les autres le voient.
  await page.reload();
  await expect(bloc.locator("img")).toHaveCount(1);
  await page.getByRole("link", { name: "Prévisualiser mon profil public" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
  // Sur son propre profil, pas de « Signaler cette image ».
  await expect(page.getByRole("button", { name: "Signaler cette image" })).toHaveCount(0);

  // Remplacer, puis retirer avec confirmation : les initiales reviennent.
  await page.goto("/compte/profil-public");
  await bloc.getByLabel("Choisir une image").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png(320, 320, [254, 210, 6]) });
  await bloc.getByRole("button", { name: "Utiliser cette image" }).click();
  await expect(bloc.getByRole("status")).toHaveText("Image enregistrée.");
  await bloc.getByRole("button", { name: "Retirer l'image" }).click();
  await bloc.getByRole("group", { name: "Confirmer le retrait de l'image" }).getByRole("button", { name: "Annuler" }).click();
  await expect(bloc.locator("img")).toHaveCount(1);
  await bloc.getByRole("button", { name: "Retirer l'image" }).click();
  await bloc.getByRole("button", { name: "Oui, retirer l'image" }).click();
  await expect(bloc.getByRole("status")).toHaveText("Image retirée. Tes initiales sont affichées à la place.");
  await expect(bloc.locator("img")).toHaveCount(0);
  expect((await imageServie(page)).statut).toBe(404);
});
