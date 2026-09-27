import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/server/guard";
import { createShare, listShares } from "@/lib/server/shares";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  return NextResponse.json({ shares: await listShares() });
}

const Body = z.object({ label: z.string().trim().min(1).max(80), days: z.number().int().min(1).max(366) });

export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const expires = new Date(Date.now() + parsed.data.days * 24 * 3600 * 1000);
  const { link, token } = await createShare(parsed.data.label, expires);
  return NextResponse.json({ link, token });
}
