import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/server/guard";
import { accessState, disableAccess, setAccessPassword } from "@/lib/server/access";
import { deleteRolePasskeys } from "@/lib/server/passkeys";

export const dynamic = "force-dynamic";

// Gestion de l'accès « gestion locative » : réservée au propriétaire.
export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  return NextResponse.json(await accessState());
}

const Body = z.object({ password: z.string().min(8).max(200), label: z.string().trim().max(60).optional() });

export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mot de passe de 8 caractères minimum" }, { status: 400 });
  // Nouveau mot de passe : les sessions et clés Face ID précédentes de l'accès gestion sont révoquées.
  await deleteRolePasskeys("gestion");
  return NextResponse.json(await setAccessPassword(parsed.data.password, parsed.data.label));
}

export async function DELETE(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  await disableAccess();
  await deleteRolePasskeys("gestion");
  return NextResponse.json({ ok: true });
}
