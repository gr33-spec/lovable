import { NextResponse } from "next/server";
import { getSnapshot, replaceDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { referencedFileIds } from "@/lib/tenancy-files";
import { restoreFiles } from "@/lib/server/files";

/** Restaure un instantané (l'état actuel est lui-même sauvegardé avant). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const data = await getSnapshot(Number(id));
  if (!data) return NextResponse.json({ error: "Sauvegarde introuvable" }, { status: 404 });
  const { version } = await replaceDocument(data, "avant restauration");
  // Les pièces de la sauvegarde encore dans la corbeille reviennent en service.
  await restoreFiles([...referencedFileIds(data)]).catch(() => undefined);
  return NextResponse.json({ ok: true, version, data });
}
