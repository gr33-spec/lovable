import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { resolveShare } from "@/lib/server/shares";
import { currentMonth } from "@/lib/engine/dates";
import { project } from "@/lib/engine/projection";
import { DossierDocument, SECTIONS, type SectionId } from "@/lib/pdf/dossier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dossier PDF accessible par un lien de partage valide (lecture seule).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await resolveShare(token))) return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  const { data } = await loadDocument();
  const nowMonth = currentMonth();
  const sections = SECTIONS.map((s) => s.id).filter((id) => id !== "scenarios") as SectionId[];
  const buffer = await renderToBuffer(
    <DossierDocument data={data} projection={project(data, nowMonth)} nowMonth={nowMonth} sections={sections} scenarios={[]} generatedAt={new Date()} />,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dossier-patrimonial-${date}.pdf"`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
