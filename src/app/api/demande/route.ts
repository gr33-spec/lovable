import { NextResponse } from "next/server";
import { createDemande } from "@/lib/demandes";
import { getCurrentUserId } from "@/lib/current-user";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Crée une demande de devis et l'envoie aux fournisseurs sélectionnés (étape 7). */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { objet, produitsText, emails } = body as Record<string, unknown>;

  if (typeof objet !== "string" || !objet.trim()) {
    return NextResponse.json({ error: "Indique l'objet de la demande." }, { status: 400 });
  }
  if (typeof produitsText !== "string" || !produitsText.trim()) {
    return NextResponse.json(
      { error: "Décris les produits ou prestations demandés." },
      { status: 400 }
    );
  }
  if (!Array.isArray(emails)) {
    return NextResponse.json({ error: "Sélectionne au moins un fournisseur." }, { status: 400 });
  }

  const uniqueEmails = Array.from(
    new Set(
      emails
        .filter((email): email is string => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_REGEX.test(email))
    )
  );

  if (uniqueEmails.length === 0) {
    return NextResponse.json(
      { error: "Sélectionne au moins un fournisseur avec une adresse e-mail valide." },
      { status: 400 }
    );
  }

  const demandeId = await createDemande({
    userId,
    objet: objet.trim(),
    produitsText: produitsText.trim(),
    emails: uniqueEmails,
  });

  return NextResponse.json({ demandeId });
}
