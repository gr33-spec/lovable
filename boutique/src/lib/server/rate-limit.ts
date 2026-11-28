import "server-only";
import { headers } from "next/headers";
import { queryOne, query } from "./db";

// Limitation de débit stockée en base (partagée entre toutes les instances
// serverless). Fenêtre fixe : simple, suffisant pour freiner la force brute.

export async function hit(bucket: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const start = new Date(Math.floor(now / windowMs) * windowMs);
  const row = await queryOne<{ hits: number }>(
    `INSERT INTO rate_limit (bucket, window_start, hits) VALUES ($1, $2, 1)
     ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limit.hits + 1
     RETURNING hits`,
    [bucket.slice(0, 200), start],
  );
  const hits = row?.hits ?? 1;
  return { allowed: hits <= limit, remaining: Math.max(0, limit - hits), retryAfter: Math.ceil((start.getTime() + windowMs - now) / 1000) };
}

export async function resetBucket(bucket: string): Promise<void> {
  await query("DELETE FROM rate_limit WHERE bucket = $1", [bucket]);
}

export async function purgeRateLimits(): Promise<void> {
  await query("DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'");
}

/** Adresse IP de la requête (en-tête fixé par Vercel ; non falsifiable derrière son proxy). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders(h);
}

export function ipFromHeaders(h: Headers): string {
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "local").trim().slice(0, 64);
}
