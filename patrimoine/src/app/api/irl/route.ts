import { NextResponse } from "next/server";
import { BOTH, guardApi } from "@/lib/server/guard";
import { irlSeries } from "@/lib/server/irl";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  try {
    return NextResponse.json({ series: await irlSeries() }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
