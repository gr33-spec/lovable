import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { guardApi } from "@/lib/server/guard";
import { listPasskeys } from "@/lib/server/passkeys";
import { challengeCookie, relyingParty } from "@/lib/server/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const rp = relyingParty(request);
  if (!rp) return NextResponse.json({ error: "Origine invalide" }, { status: 400 });
  const existing = await listPasskeys(rp.rpID);
  const options = await generateRegistrationOptions({
    rpName: "Patrimoine",
    rpID: rp.rpID,
    userName: "proprietaire",
    userDisplayName: "Patrimoine",
    userID: new TextEncoder().encode("patrimoine-owner"),
    attestationType: "none",
    excludeCredentials: existing.map((k) => ({ id: k.id, transports: k.transports as AuthenticatorTransport[] | undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const res = NextResponse.json(options);
  const c = challengeCookie(options.challenge, "register");
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
