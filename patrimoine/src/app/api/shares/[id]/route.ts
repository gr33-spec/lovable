import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { revokeShare } from "@/lib/server/shares";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const { id } = await params;
  await revokeShare(id);
  return NextResponse.json({ ok: true });
}
