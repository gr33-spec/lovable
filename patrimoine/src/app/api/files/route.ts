import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { CHUNK_BYTES, MAX_FILE_BYTES, createFile } from "@/lib/server/files";

/** Déclare un fichier à envoyer par morceaux. */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "document.pdf";
  const size = Number(body.size);
  const mime = typeof body.mime === "string" ? body.mime : "application/pdf";
  if (mime !== "application/pdf") return NextResponse.json({ error: "Seuls les PDF sont acceptés." }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "Fichier vide." }, { status: 400 });
  if (size > MAX_FILE_BYTES) return NextResponse.json({ error: "PDF trop volumineux (24 Mo maximum)." }, { status: 413 });
  const id = await createFile(name, mime, size);
  return NextResponse.json({ id, chunkSize: CHUNK_BYTES });
}
