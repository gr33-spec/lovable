import type { Page } from "@playwright/test";

/**
 * CONFIRMER L'E-MAIL EN E2E (Greg, 1er novembre 2026 : un e-mail confirmé pour ajouter des quantités à un achat groupé).
 * Le vrai parcours : l'e-mail « Confirme ton adresse e-mail » est lu dans la boîte aux lettres de test (données de test,
 * jamais en ligne), puis son lien est ouvert dans une autre page ; la session de l'artisan reste ouverte.
 */
export async function confirmerEmail(page: Page, email: string, secret = "Bearer e2e-secret-de-la-tache"): Promise<void> {
  const r = await page.request.get(`/v1/internal/test/emails?to=${encodeURIComponent(email)}`, { headers: { authorization: secret } });
  const { emails } = (await r.json()) as { emails: { subject: string; text: string }[] };
  const mail = [...emails].reverse().find((m) => m.subject === "Confirme ton adresse e-mail");
  if (!mail) throw new Error(`aucun e-mail de confirmation pour ${email}`);
  const lien = /https?:\/\/\S+/.exec(mail.text)?.[0];
  if (!lien) throw new Error("lien de confirmation absent");
  const onglet = await page.context().newPage();
  await onglet.goto(lien);
  await onglet.close();
}
