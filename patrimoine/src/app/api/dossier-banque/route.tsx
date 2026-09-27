import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { currentMonth } from "@/lib/engine/dates";
import { project } from "@/lib/engine/projection";
import { DossierDocument, SECTIONS, type SectionId } from "@/lib/pdf/dossier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const valid = new Set<string>(SECTIONS.map((x) => x.id));
  const requested = url.searchParams.get("sections");
  const sections = (requested ? requested.split(",") : [...valid]).filter((x) => valid.has(x)) as SectionId[];
  const scenarioIds = new Set((url.searchParams.get("scenarios") ?? "").split(",").filter(Boolean));

  const { data } = await loadDocument();
  const nowMonth = currentMonth();
  const projection = project(data, nowMonth);
  const scenarios = data.scenarios.filter((s) => scenarioIds.has(s.id) && s.actions.length > 0);

  const buffer = await renderToBuffer(
    <DossierDocument data={data} projection={projection} nowMonth={nowMonth} sections={sections} scenarios={scenarios} generatedAt={new Date()} />,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dossier-patrimonial-${date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
