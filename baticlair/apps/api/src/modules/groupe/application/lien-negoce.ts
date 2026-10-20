import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Les liens de chaque e-mail au négoce (parcours groupé, section 5) : « pas concerné » décoche la famille du lot,
 * « stop » le désinscrit. Le jeton est signé (HMAC du secret de l'application) : il ne se fabrique pas, il ne change que
 * ce qu'il nomme, et il ne porte aucun nom d'artisan.
 */
export type ActionLien = { action: "stop"; negoceId: string } | { action: "pas_concerne"; negoceId: string; famille: string };

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function jetonDeLien(secret: string, lien: ActionLien): string {
  const corps = b64(JSON.stringify(lien.action === "stop" ? { a: "stop", n: lien.negoceId } : { a: "pas_concerne", n: lien.negoceId, f: lien.famille }));
  return `${corps}.${createHmac("sha256", secret).update(`lien-negoce:${corps}`).digest("base64url")}`;
}

export function lienDuJeton(secret: string, jeton: string): ActionLien | null {
  const [corps, signature] = jeton.split(".");
  if (!corps || !signature) return null;
  const attendue = createHmac("sha256", secret).update(`lien-negoce:${corps}`).digest();
  const recue = Buffer.from(signature, "base64url");
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const v = JSON.parse(Buffer.from(corps, "base64url").toString()) as { a?: unknown; n?: unknown; f?: unknown };
    if (typeof v.n !== "string") return null;
    if (v.a === "stop") return { action: "stop", negoceId: v.n };
    if (v.a === "pas_concerne" && typeof v.f === "string") return { action: "pas_concerne", negoceId: v.n, famille: v.f };
    return null;
  } catch {
    return null;
  }
}
