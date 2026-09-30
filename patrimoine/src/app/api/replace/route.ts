import { NextResponse } from "next/server";
import { replaceDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { isValidBackup, normalizeData } from "@/lib/ops";
import { COLLECTIONS } from "@/lib/types";
import { validateData } from "@/lib/validation";
import { referencedFileIds } from "@/lib/tenancy-files";
import { restoreFiles } from "@/lib/server/files";

// Remplacement complet : import d'une sauvegarde, chargement ou suppression
// de la démonstration. Un instantané est toujours pris avant.
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > 10_000_000) return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  let body: { data?: unknown; reason?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Fichier illisible" }, { status: 400 });
  }
  const raw = body.data && typeof body.data === "object" && "data" in (body.data as object)
    ? (body.data as { data: unknown }).data
    : body.data;
  if (!isValidBackup(raw)) return NextResponse.json({ error: "Ce fichier n'est pas une sauvegarde valide" }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 40) : "import";
  const data = normalizeData(raw);
  // Garde-fou : refuse un remplacement qui ferait disparaître des éléments du fichier.
  const src = raw as Record<string, unknown>;
  const lost = COLLECTIONS.some((c) => Array.isArray(src[c]) && (src[c] as unknown[]).length !== (data[c] as unknown[]).length);
  if (lost) return NextResponse.json({ error: "Fichier incompatible : import refusé, vos données sont intactes" }, { status: 400 });
  // Une sauvegarde est toujours restaurable : les valeurs suspectes sont signalées, pas bloquantes.
  const warnings = validateData(data as unknown as Record<string, unknown>).slice(0, 10).map((e) => e.message);
  const { version } = await replaceDocument(data, reason);
  await restoreFiles([...referencedFileIds(data)]).catch(() => undefined);
  return NextResponse.json({ ok: true, version, data, warnings });
}
