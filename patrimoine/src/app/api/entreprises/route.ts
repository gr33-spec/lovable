import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { searchRegistry } from "@/lib/server/registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 120) return NextResponse.json({ error: "Recherche trop courte" }, { status: 400 });
  try {
    return NextResponse.json({ results: await searchRegistry(q) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Annuaire indisponible" }, { status: 502 });
  }
}
