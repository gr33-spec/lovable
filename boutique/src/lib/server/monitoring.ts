import "server-only";
import { query, type Queryable } from "./db";

// Signalement des incidents : journal serveur (Vercel) + table system_event
// affichée dans le tableau de bord et exposée par /api/health. Aucune donnée
// sensible (mot de passe, carte, jeton, adresse) n'est jamais enregistrée.

const SENSITIVE = /(password|secret|token|authorization|cookie|card|iban|address|phone|email)/i;

export function scrub(details: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (SENSITIVE.test(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 300) : typeof v === "number" || typeof v === "boolean" || v === null ? v : String(v).slice(0, 300);
  }
  return out;
}

export function errorMessage(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 300);
}

export async function reportEvent(
  level: "info" | "warning" | "error",
  source: string,
  message: string,
  details: Record<string, unknown> = {},
  client?: Queryable,
): Promise<void> {
  const safe = scrub(details);
  const line = `[${source}] ${message} ${JSON.stringify(safe)}`;
  if (level === "error") console.error(line);
  else if (level === "warning") console.warn(line);
  else console.info(line);
  try {
    await query("INSERT INTO system_event (level, source, message, details) VALUES ($1, $2, $3, $4)", [level, source, message.slice(0, 500), safe], client);
  } catch (err) {
    console.error("[monitoring] impossible d'enregistrer l'incident", errorMessage(err));
  }
}

export async function audit(
  adminId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
  ip = "",
  client?: Queryable,
): Promise<void> {
  await query(
    "INSERT INTO audit_log (admin_id, action, entity_type, entity_id, details, ip) VALUES ($1, $2, $3, $4, $5, $6)",
    [adminId, action, entityType, entityId, scrub(details), ip.slice(0, 64)],
    client,
  );
}
