import { NextResponse } from "next/server";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { CHUNK_BYTES, deleteFile, putChunk, readFile } from "@/lib/server/files";
import { loadDocument } from "@/lib/server/db";
import { tenancyFileIds } from "@/lib/tenancy-files";

type Ctx = { params: Promise<{ id: string }> };

/** Envoi d'un morceau : PUT /api/files/:id?i=N (corps binaire). */
export async function PUT(request: Request, ctx: Ctx) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const { id } = await ctx.params;
  const idx = Number(new URL(request.url).searchParams.get("i"));
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length === 0 || data.length > CHUNK_BYTES) return NextResponse.json({ error: "Morceau invalide" }, { status: 400 });
  try {
    await putChunk(id, idx, data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** Consultation du PDF (ouvre dans le navigateur). */
export async function GET(request: Request, ctx: Ctx) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const { id } = await ctx.params;
  const file = await readFile(id).catch(() => undefined);
  if (!file) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  // L'espace gestion consulte les photos (états des lieux) et les baux / actes de caution signés, jamais les bilans.
  if ((await currentSession())?.role === "gestion" && !file.mime.startsWith("image/") && !tenancyFileIds((await loadDocument()).data).has(id))
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const { id } = await ctx.params;
  // L'espace gestion ne supprime que les documents signés des locataires (remplacement).
  if ((await currentSession())?.role === "gestion" && !tenancyFileIds((await loadDocument()).data).has(id)) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  await deleteFile(id);
  return NextResponse.json({ ok: true });
}
