import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { listPasskeys } from "@/lib/server/passkeys";
import { challengeCookie, relyingParty } from "@/lib/server/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const rp = relyingParty(request);
  if (!rp) return NextResponse.json({ error: "Origine invalide" }, { status: 400 });
  const session = (await currentSession())!;
  const existing = await listPasskeys(rp.rpID, (session.role === "gestion" ? "gestion" : "owner"));
  const options = await generateRegistrationOptions({
    rpName: "Patrimoine",
    rpID: rp.rpID,
    userName: session.role === "gestion" ? "gestion-locative" : "proprietaire",
    userDisplayName: session.role === "gestion" ? "Gestion locative" : "Patrimoine",
    userID: new TextEncoder().encode(session.role === "gestion" ? "patrimoine-gestion" : "patrimoine-owner"),
    attestationType: "none",
    excludeCredentials: existing.map((k) => ({ id: k.id, transports: k.transports as AuthenticatorTransport[] | undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const res = NextResponse.json(options);
  const c = challengeCookie(options.challenge, "register");
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
