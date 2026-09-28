import { NextResponse } from "next/server";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { deletePasskey } from "@/lib/server/passkeys";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const { id } = await params;
  await deletePasskey(id, ((await currentSession())!.role === "gestion" ? "gestion" : "owner"));
  return NextResponse.json({ ok: true });
}
