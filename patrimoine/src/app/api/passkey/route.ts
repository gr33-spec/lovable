import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { listPasskeys } from "@/lib/server/passkeys";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
  const keys = await listPasskeys(host);
  return NextResponse.json({ passkeys: keys.map((k) => ({ id: k.id, name: k.name, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })) });
}
