import { NextResponse } from "next/server";
import { createManualSnapshot, listSnapshots } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  return NextResponse.json({ snapshots: await listSnapshots() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  await createManualSnapshot();
  return NextResponse.json({ ok: true });
}
