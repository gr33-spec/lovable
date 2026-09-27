import { NextResponse } from "next/server";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "@/lib/server/db";
import {
  SESSION_COOKIE,
  checkPassword,
  createSessionToken,
  isConfigured,
  sessionCookieOptions,
} from "@/lib/server/session";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Mot de passe non configuré sur le serveur." }, { status: 503 });
  }
  const ip = clientIp(request);
  if (await isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }
  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  if (!checkPassword(password)) {
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await clearLoginFailures(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
