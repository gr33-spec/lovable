import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { isConfigured } from "@/lib/server/session";
import { challengeCookie, relyingParty } from "@/lib/server/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  const rp = relyingParty(request);
  if (!rp) return NextResponse.json({ error: "Origine invalide" }, { status: 400 });
  // Clés « découvrables » : l'appareil propose lui-même la clé enregistrée.
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required" });
  const res = NextResponse.json(options);
  const c = challengeCookie(options.challenge, "login");
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
