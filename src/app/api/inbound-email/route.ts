import { NextResponse } from "next/server";
import { recordSupplierReply } from "@/lib/demandes";

interface InboundAttachment {
  filename: string;
  contentType: string;
  content: string;
}

function isInboundAttachment(value: unknown): value is InboundAttachment {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as InboundAttachment).filename === "string" &&
    typeof (value as InboundAttachment).contentType === "string" &&
    typeof (value as InboundAttachment).content === "string"
  );
}

/**
 * Webhook e-mail entrant : enregistre la réponse d'un fournisseur à une
 * demande de devis (étape 7). Si INBOUND_EMAIL_SECRET est configuré, l'appel
 * doit fournir l'en-tête `Authorization: Bearer <secret>`.
 */
export async function POST(request: Request) {
  const inboundSecret = process.env.INBOUND_EMAIL_SECRET;
  if (inboundSecret && request.headers.get("authorization") !== `Bearer ${inboundSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { to, from, subject, text, attachments } = body as Record<string, unknown>;

  if (typeof to !== "string" || typeof from !== "string") {
    return NextResponse.json({ error: "Champs 'to' et 'from' requis." }, { status: 400 });
  }

  const matched = await recordSupplierReply({
    to,
    from,
    subject: typeof subject === "string" ? subject : "",
    bodyText: typeof text === "string" ? text : "",
    attachments: Array.isArray(attachments) ? attachments.filter(isInboundAttachment) : [],
  });

  return NextResponse.json({ matched });
}
