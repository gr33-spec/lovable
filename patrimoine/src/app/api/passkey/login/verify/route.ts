import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { clearLoginFailures } from "@/lib/server/db";
import { findPasskey, touchPasskey } from "@/lib/server/passkeys";
import { accessState } from "@/lib/server/access";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { CHALLENGE_COOKIE, readChallenge, relyingParty } from "@/lib/server/webauthn";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rp = relyingParty(request);
  const expectedChallenge = readChallenge(request, "login");
  if (!rp || !expectedChallenge) return NextResponse.json({ error: "Demande expirée, recommencez." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const response = body?.response;
  const key = typeof response?.id === "string" ? await findPasskey(response.id, rp.rpID) : undefined;
  // Un échec Face ID n'est pas une tentative de mot de passe : il ne compte pas
  // dans le blocage anti-essais (la clé est protégée cryptographiquement).
  if (!key) {
    return NextResponse.json({ error: "Face ID non reconnu : connectez-vous avec le mot de passe puis réactivez Face ID." }, { status: 401 });
  }
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: { id: key.id, publicKey: key.publicKey, counter: key.counter, transports: key.transports as AuthenticatorTransport[] | undefined },
    });
    if (!result.verified) throw new Error("non vérifié");
    // Clé de l'espace gestion : valable seulement si l'accès n'a pas été modifié ou coupé depuis.
    if (key.role === "gestion") {
      const state = await accessState();
      if (!state.enabled || state.version !== key.av) throw new Error("accès révoqué");
    }
    await touchPasskey(key.id, result.authenticationInfo.newCounter);
  } catch {
    return NextResponse.json({ error: "Face ID refusé : connectez-vous avec le mot de passe puis réactivez Face ID (icône compte ou Plus → Connexion Face ID)." }, { status: 401 });
  }
  await clearLoginFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken({ role: key.role, av: key.av }), sessionCookieOptions);
  res.cookies.set(CHALLENGE_COOKIE, "", { path: "/api/passkey", maxAge: 0 });
  return res;
}
