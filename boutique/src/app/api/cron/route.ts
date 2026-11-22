import { timingSafeEqual } from "node:crypto";
import { invalidateCatalog } from "@/lib/server/cached";
import { cronSecret } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { runNightly } from "@/lib/server/maintenance";

export const maxDuration = 60;

// Tâches nocturnes (Vercel Cron). Protégées par CRON_SECRET.
export async function GET(request: Request) {
  const secret = cronSecret();
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return json({ error: "Non autorisé" }, 401);
  const result = await runNightly();
  invalidateCatalog();
  return json({ ok: true, result });
}
