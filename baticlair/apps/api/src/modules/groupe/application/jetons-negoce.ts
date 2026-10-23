import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LES JETONS DE L'ESPACE NÉGOCE (Greg, 23 octobre 2026) : signés par le secret de l'application, ils ne se fabriquent
 * pas, ne portent jamais un nom d'artisan et expirent. Quatre sortes : l'invitation (90 jours, liée au compte du négoce,
 * donc au SIRET ou à l'e-mail : le même négoce ajouté par trente artisans a un seul jeton), le lien magique de connexion
 * (30 minutes), la session (30 jours, dans un cookie HttpOnly) et le désabonnement (180 jours, dans chaque e-mail).
 */
export type SorteDeJeton = "invitation" | "connexion" | "session" | "desabonnement";

export const DUREES_JETON_S: Record<SorteDeJeton, number> = {
  invitation: 90 * 24 * 3600,
  connexion: 30 * 60,
  session: 30 * 24 * 3600,
  desabonnement: 180 * 24 * 3600,
};

export interface JetonNegoce {
  sorte: SorteDeJeton;
  compteId: string;
  /** Pour le désabonnement : un département, ou tout. */
  departement?: string | null;
  /** Expiration (secondes Unix). */
  exp: number;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signerJetonNegoce(secret: string, j: Omit<JetonNegoce, "exp">, maintenant = new Date(), duree = DUREES_JETON_S[j.sorte]): string {
  const exp = Math.floor(maintenant.getTime() / 1000) + duree;
  const corps = b64(JSON.stringify({ s: j.sorte, c: j.compteId, ...(j.departement ? { d: j.departement } : {}), e: exp }));
  return `${corps}.${createHmac("sha256", secret).update(`negoce:${j.sorte}:${corps}`).digest("base64url")}`;
}

export function lireJetonNegoce(secret: string, sorte: SorteDeJeton, jeton: string, maintenant = new Date()): JetonNegoce | null {
  if (typeof jeton !== "string" || jeton.length > 600) return null;
  const [corps, signature] = jeton.split(".");
  if (!corps || !signature) return null;
  const attendue = createHmac("sha256", secret).update(`negoce:${sorte}:${corps}`).digest();
  let recue: Buffer;
  try {
    recue = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const v = JSON.parse(Buffer.from(corps, "base64url").toString()) as { s?: unknown; c?: unknown; d?: unknown; e?: unknown };
    if (v.s !== sorte || typeof v.c !== "string" || typeof v.e !== "number") return null;
    if (v.e * 1000 < maintenant.getTime()) return null;
    return { sorte, compteId: v.c, departement: typeof v.d === "string" ? v.d : null, exp: v.e };
  } catch {
    return null;
  }
}

export const COOKIE_NEGOCE = "bc_negoce";

/** Le cookie de session du négoce, lu dans l'en-tête brut (aucun analyseur de cookies dans l'API). */
export function cookieNegoce(enTete: string | undefined): string | null {
  if (!enTete) return null;
  for (const part of enTete.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE_NEGOCE) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function enTeteCookieNegoce(jeton: string | null, secure: boolean, maxAgeS = DUREES_JETON_S.session): string {
  const base = `${COOKIE_NEGOCE}=${jeton ? encodeURIComponent(jeton) : ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${jeton ? maxAgeS : 0}`;
  return secure ? `${base}; Secure` : base;
}
