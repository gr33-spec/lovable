import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { savePasskey } from "@/lib/server/passkeys";
import { CHALLENGE_COOKIE, readChallenge, relyingParty } from "@/lib/server/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const rp = relyingParty(request);
  const expectedChallenge = readChallenge(request, "register");
  if (!rp || !expectedChallenge) return NextResponse.json({ error: "Demande expirée, recommencez." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "iPhone";
  try {
    const result = await verifyRegistrationResponse({
      response: body?.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
    if (!result.verified || !result.registrationInfo) throw new Error("non vérifié");
    const { credential } = result.registrationInfo;
    const session = (await currentSession())!;
    await savePasskey({ id: credential.id, publicKey: credential.publicKey, counter: credential.counter, transports: credential.transports, name, rpId: rp.rpID, role: (session.role === "gestion" ? "gestion" : "owner"), av: session.av });
  } catch {
    return NextResponse.json({ error: "Enregistrement refusé." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CHALLENGE_COOKIE, "", { path: "/api/passkey", maxAge: 0 });
  return res;
}
