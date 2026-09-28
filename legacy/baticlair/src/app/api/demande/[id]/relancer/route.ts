import { NextResponse } from "next/server";
import { relancerFournisseur, relancerTousFournisseurs } from "@/lib/demandes";
import { getCurrentUserId } from "@/lib/current-user";

interface RelancerRouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Relance manuelle depuis la fiche chantier : un fournisseur précis
 * (`destinataireId`) ou tous les fournisseurs n'ayant pas répondu (§5).
 */
export async function POST(request: Request, { params }: RelancerRouteParams) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Corps vide accepté : relance tous les fournisseurs manquants.
  }

  const destinataireId =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).destinataireId
      : undefined;

  if (typeof destinataireId === "string") {
    await relancerFournisseur(userId, id, destinataireId);
  } else {
    await relancerTousFournisseurs(userId, id);
  }

  return NextResponse.json({ ok: true });
}
