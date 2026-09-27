import { NextResponse } from "next/server";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "@/lib/server/db";
import { checkAccessPassword } from "@/lib/server/access";
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
  // Le mot de passe détermine l'espace : le propriétaire entre toujours dans
  // l'application complète, le mot de passe gestion dans l'espace gestion,
  // quel que soit l'accès sélectionné à l'écran.
  if (!checkPassword(password)) {
    const av = await checkAccessPassword(password).catch(() => null);
    if (av !== null) {
      await clearLoginFailures(ip);
      const response = NextResponse.json({ ok: true, home: "/gestion" });
      response.cookies.set(SESSION_COOKIE, createSessionToken({ role: "gestion", av }), sessionCookieOptions);
      return response;
    }
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: body?.space === "gestion" ? "Mot de passe incorrect ou accès gestion non activé." : "Mot de passe incorrect." }, { status: 401 });
  }
  await clearLoginFailures(ip);
  const response = NextResponse.json({ ok: true, home: "/" });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
