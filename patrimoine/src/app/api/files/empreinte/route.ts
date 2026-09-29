import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { findByHash } from "@/lib/server/files";

/** Ce contenu est-il déjà stocké ? Renvoie les fichiers identiques (anti-doublon). */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const sha256 = typeof body.sha256 === "string" ? body.sha256.toLowerCase() : "";
  return NextResponse.json({ files: await findByHash(sha256) });
}
