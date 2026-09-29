import { NextResponse } from "next/server";
import { z } from "zod";
import { applyDocumentOps } from "@/lib/server/db";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { sanitizeGestionOps } from "@/lib/scope";
import { COLLECTIONS } from "@/lib/types";
import type { Op } from "@/lib/ops";
import { referencedFileIds } from "@/lib/tenancy-files";
import { restoreFiles } from "@/lib/server/files";

const collection = z.enum(COLLECTIONS as [string, ...string[]]);
const opSchema = z.union([
  z.object({ op: z.literal("upsert"), coll: collection, item: z.looseObject({ id: z.string().min(1).max(100) }) }),
  z.object({ op: z.literal("delete"), coll: collection, id: z.string().min(1).max(100) }),
  z.object({ op: z.literal("settings"), patch: z.record(z.string(), z.unknown()) }),
]);
const bodySchema = z.object({ ops: z.array(opSchema).min(1).max(500) });

export async function POST(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > 2_000_000) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Modification invalide" }, { status: 400 });
  const session = await currentSession();
  const { version } = await applyDocumentOps(parsed.data.ops as Op[], session?.role === "gestion" ? sanitizeGestionOps : undefined);
  // Une pièce de nouveau citée (annulation d'une suppression…) quitte la corbeille.
  await restoreFiles([...referencedFileIds(parsed.data.ops)]).catch(() => undefined);
  return NextResponse.json({ ok: true, version });
}
