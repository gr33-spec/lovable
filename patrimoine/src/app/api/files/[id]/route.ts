import { NextResponse } from "next/server";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { CHUNK_BYTES, deleteFile, fileCreatedAt, putChunk, readFile } from "@/lib/server/files";
import { loadDocument } from "@/lib/server/db";
import { referencedFileIds } from "@/lib/tenancy-files";
import { scopeForGestion } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Espace gestion : seulement les pièces de son périmètre (baux, cautions,
 * courriers, photos des états des lieux), ou un fichier qu'il vient d'envoyer
 * et qui n'est encore rattaché à rien. Jamais les bilans, tableaux, factures…
 * `write` : suppression — refusée si la pièce sert aussi ailleurs.
 */
async function gestionMayUse(id: string, write = false): Promise<boolean> {
  const { data } = await loadDocument();
  const all = referencedFileIds(data);
  if (!all.has(id)) {
    const created = await fileCreatedAt(id);
    return !!created && Date.now() - created.getTime() < 2 * 3600 * 1000;
  }
  const scoped = referencedFileIds(scopeForGestion(data));
  if (!scoped.has(id)) return false;
  if (!write) return true;
  const elsewhere = referencedFileIds({ ...data, tenancies: [], inspections: [] });
  return !elsewhere.has(id);
}

/** Envoi d'un morceau : PUT /api/files/:id?i=N (corps binaire). */
export async function PUT(request: Request, ctx: Ctx) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
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
  // L'espace gestion ne consulte que les pièces de son périmètre, jamais les bilans ni les pièces du patrimoine.
  if ((await currentSession())?.role === "gestion" && !(await gestionMayUse(id))) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
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
  // L'espace gestion ne supprime que les pièces des dossiers locataires qui ne servent nulle part ailleurs.
  if ((await currentSession())?.role === "gestion" && !(await gestionMayUse(id, true))) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  // Pièce encore citée par les données (annulation, autre rattachement…) : conservée.
  if (referencedFileIds((await loadDocument()).data).has(id)) return NextResponse.json({ ok: true, kept: true });
  await deleteFile(id);
  return NextResponse.json({ ok: true });
}
