import { NextResponse } from "next/server";
import { z } from "zod";
import { applyDocumentOps } from "@/lib/server/db";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { sanitizeGestionOps } from "@/lib/scope";
import { COLLECTIONS, type Collection } from "@/lib/types";
import { validateItem } from "@/lib/validation";
import type { Op } from "@/lib/ops";
import { referencedFileIds } from "@/lib/tenancy-files";
import { restoreFiles } from "@/lib/server/files";

const collection = z.enum(COLLECTIONS as [string, ...string[]]);
const opSchema = z.union([
  z.object({ op: z.literal("upsert"), coll: collection, item: z.looseObject({ id: z.string().min(1).max(100) }), base: z.looseObject({ id: z.string().min(1).max(100) }).optional() }),
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
  // Valeurs manifestement fausses (taux de 300 %, montant négatif, date illisible…) : refusées, avec la raison.
  for (const op of parsed.data.ops) {
    if (op.op !== "upsert") continue;
    const invalid = validateItem(op.coll as Collection, op.item as { id: string } & Record<string, unknown>);
    if (invalid) return NextResponse.json({ error: invalid.message }, { status: 422 });
  }
  const session = await currentSession();
  const { version } = await applyDocumentOps(parsed.data.ops as Op[], session?.role === "gestion" ? sanitizeGestionOps : undefined);
  // Une pièce de nouveau citée (annulation d'une suppression…) quitte la corbeille.
  await restoreFiles([...referencedFileIds(parsed.data.ops)]).catch(() => undefined);
  return NextResponse.json({ ok: true, version });
}
