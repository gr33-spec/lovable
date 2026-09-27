import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { aiEnabled } from "@/lib/server/bilan-ai";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  return NextResponse.json({ ai: aiEnabled() });
}
