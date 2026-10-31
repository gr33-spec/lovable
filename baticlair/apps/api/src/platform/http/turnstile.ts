import { DomainError } from "../errors/domain-error.js";

/**
 * TURNSTILE (Cloudflare, gratuit ; Greg, 26 octobre 2026) : le défi anti-robots des pages ouvertes à tous. Le site met
 * le jeton du défi dans l'en-tête `x-captcha-response` ; l'API le fait vérifier par Cloudflare (siteverify) avant d'agir.
 * Sans clé secrète (`TURNSTILE_SECRET_KEY`), rien n'est demandé.
 */
export const ENDPOINTS_TURNSTILE = ["/sign-up/email", "/request-password-reset"] as const;
export const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Post = (url: string, init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Le jeton est-il valide ? Une panne de Cloudflare refuse (fermé par défaut). */
export async function jetonTurnstileValide(secret: string, jeton: string | undefined, ip: string | undefined, fetchImpl: Post = fetch as unknown as Post): Promise<boolean> {
  if (!jeton || jeton.length > 2048) return false;
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: jeton, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}

/** Pour un contrôleur : refuse sans jeton valide quand Turnstile est branché. */
export async function exigerTurnstile(secret: string | null, jeton: string | undefined, ip: string | undefined): Promise<void> {
  if (!secret) return;
  if (!(await jetonTurnstileValide(secret, jeton, ip))) throw new DomainError("validation_failed", "Captcha required", { reason: "captcha_requis" });
}
