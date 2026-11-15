import request from "supertest";
import type { TestContext } from "./test-app.js";
import { signerJetonNegoce } from "../../src/modules/groupe/application/jetons-negoce.js";
import type { AppConfig } from "../../src/platform/config/config.js";
import { CONFIG } from "../../src/platform/tokens.js";

/**
 * L'ESPACE NÉGOCE EN TEST (Greg, 23 octobre 2026) : un négoce ajouté par un artisan reçoit son lien d'invitation par
 * e-mail ; il crée son accès (dépôt, paliers de livraison, départements). Les paliers « gratuite jusqu'à X km, Y € au-delà »
 * d'avant deviennent « gratuite jusqu'à X km, Y € jusqu'à 1 000 km ».
 */
export const lienInvitation = async (ctx: TestContext, email: string, maintenant?: string): Promise<string> => {
  // UN SEUL E-MAIL AU NÉGOCE (16 novembre 2026) : plus d'e-mail « créez votre accès » à part. Le lien arrive dans la première
  // demande de prix ; ici, on signe le même jeton que le serveur, pour le compte créé à l'ajout du négoce.
  const compte = await ctx.prisma.compteNegoce.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!compte) throw new Error(`Aucun compte négoce pour ${email}`);
  return signerJetonNegoce(ctx.app.get<AppConfig>(CONFIG).authSecret, { sorte: "invitation", compteId: compte.id }, maintenant ? new Date(maintenant) : new Date());
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
  /** Multimétier (25 octobre 2026) : généraliste, ou spécialiste de ses familles. */
  offre?: "generaliste" | "specialiste";
  familles?: string[];
}

/** Inscrit le négoce depuis son invitation ; rend son cookie de session et la réponse. */
export async function inscrireNegoce(ctx: TestContext, email: string, i: InscriptionTest) {
  const jeton = await lienInvitation(ctx, email, i.maintenant);
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
      ...(i.offre ? { offre: i.offre, familles: i.familles ?? [] } : {}),
    });
  if (res.status !== 201) throw new Error(`inscription négoce ${email} : ${res.status} ${res.text}`);
  const cookie = (res.headers["set-cookie"] as unknown as string[] | string | undefined) ?? [];
  const brut = Array.isArray(cookie) ? cookie[0] : cookie;
  return { cookie: brut ? brut.split(";")[0]! : "", body: res.body as { phrase: string; departements: string[] } };
}
