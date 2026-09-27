import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { BOTH, guardApi } from "@/lib/server/guard";
import { readFile } from "@/lib/server/files";
import { docContext, type LegalDoc } from "@/lib/legal/doc";
import { guaranteeDocument, leaseDocument } from "@/lib/legal/lease";
import { inspectionDocument, receiptDocument, statementDocument } from "@/lib/legal/documents";
import { monthReceipt, rentStatement } from "@/lib/legal/receipts";
import { monthKey, todayIso } from "@/lib/engine/leases";
import { LegalPdf, type PhotoMap } from "@/lib/pdf/legal-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Génération des documents de gestion locative. Les règles (quittance
// seulement si la période est intégralement payée, etc.) sont vérifiées
// ici côté serveur, quelle que soit l'interface.
export async function GET(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const { data } = await loadDocument();
  const tenancy = data.tenancies.find((t) => t.id === url.searchParams.get("tenancy"));
  if (!tenancy) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
  const ctx = docContext(data, tenancy);
  if (!ctx) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });
  const today = todayIso();
  let doc: LegalDoc | undefined;
  const photos: PhotoMap = new Map();

  if (type === "bail") doc = leaseDocument(ctx);
  else if (type === "caution") doc = guaranteeDocument(ctx, Number(url.searchParams.get("index") ?? 0));
  else if (type === "edl") {
    const inspection = data.inspections.find((i) => i.id === url.searchParams.get("inspection") && i.tenancyId === tenancy.id);
    if (!inspection) return NextResponse.json({ error: "État des lieux introuvable" }, { status: 404 });
    const entry = inspection.kind === "sortie" ? data.inspections.find((i) => i.id === inspection.entryId) : undefined;
    const list: { caption: string; fileId: string }[] = [];
    for (const room of inspection.rooms) for (const item of room.items) for (const id of item.photos ?? []) list.push({ caption: `${room.name} — ${item.name}`, fileId: id });
    for (const p of list.slice(0, 60)) {
      const f = await readFile(p.fileId).catch(() => undefined);
      if (f && /image\/(jpeg|png)/.test(f.mime)) photos.set(p.fileId, { data: f.data, format: f.mime === "image/png" ? "png" : "jpg" });
    }
    doc = inspectionDocument(ctx, inspection, entry, list.filter((p) => photos.has(p.fileId)));
  } else if (type === "quittance") {
    const month = url.searchParams.get("month") ?? "";
    if (!MONTH.test(month)) return NextResponse.json({ error: "Mois invalide" }, { status: 400 });
    const unit = ctx.unit;
    const r = monthReceipt(unit, tenancy, month);
    if (r.kind === "aucun") return NextResponse.json({ error: r.reason }, { status: 409 });
    doc = receiptDocument(ctx, r, today);
  } else if (type === "attestation") {
    const asOf = url.searchParams.get("asOf") ?? today;
    const from = url.searchParams.get("from") ?? "";
    if (!DAY.test(asOf) || !MONTH.test(from)) return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    const s = rentStatement(ctx.unit, tenancy, from, monthKey(asOf));
    if (s.kind === "incomplet") return NextResponse.json({ error: `Mois non pointés : ${s.unpointed.join(", ")}` }, { status: 409 });
    doc = statementDocument(ctx, s, asOf, today);
  }
  if (!doc) return NextResponse.json({ error: "Document inconnu" }, { status: 400 });

  const buffer = await renderToBuffer(<LegalPdf doc={doc} photos={photos} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
