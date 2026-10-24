import request from "supertest";
import type { TestContext } from "./test-app.js";

/**
 * L'ESPACE NÉGOCE EN TEST (Greg, 23 octobre 2026) : un négoce ajouté par un artisan reçoit son lien d'invitation par
 * e-mail ; il crée son accès (dépôt, paliers de livraison, départements). Les paliers « gratuite jusqu'à X km, Y € au-delà »
 * d'avant deviennent « gratuite jusqu'à X km, Y € jusqu'à 1 000 km ».
 */
export const lienInvitation = (ctx: TestContext, email: string): string => {
  const m = ctx.emails.sent.filter((x) => x.to.toLowerCase() === email.toLowerCase() && /\/negoce\/rejoindre\//.test(x.text)).at(-1);
  if (!m) throw new Error(`Aucune invitation reçue par ${email}`);
  return /\/negoce\/rejoindre\/([A-Za-z0-9_.-]+)/.exec(m.text)![1]!;
};

export interface InscriptionTest {
  depot: string;
  francoKm?: number;
  prixAuDela?: number;
  maxKm?: number;
  departements?: string[];
  enseigne?: string;
  siret?: string | null;
  maintenant?: string;
}

/** Inscrit le négoce depuis son invitation ; rend son cookie de session et la réponse. */
export async function inscrireNegoce(ctx: TestContext, email: string, i: InscriptionTest) {
  const jeton = lienInvitation(ctx, email);
  const res = await request(ctx.app.getHttpServer())
    .post(`/v1/negoce/inscription${i.maintenant ? `?maintenant=${encodeURIComponent(i.maintenant)}` : ""}`)
    .send({
      jeton,
      email,
      siret: i.siret ?? null,
      enseigne: i.enseigne ?? `Négoce ${email.split("@")[0]}`,
      telephone: "02 96 00 00 00",
      depots: [{ adresse: i.depot }],
      livraison: { gratuiteJusquaKm: i.francoKm ?? 30, paliers: [{ jusquaKm: i.maxKm ?? 1000, prixHt: i.prixAuDela ?? 80 }], maxKm: i.maxKm ?? 1000 },
      departements: i.departements ?? null,
      conditions: true,
    });
  if (res.status !== 201) throw new Error(`inscription négoce ${email} : ${res.status} ${res.text}`);
  const cookie = (res.headers["set-cookie"] as unknown as string[] | string | undefined) ?? [];
  const brut = Array.isArray(cookie) ? cookie[0] : cookie;
  return { cookie: brut ? brut.split(";")[0]! : "", body: res.body as { phrase: string; departements: string[] } };
}
