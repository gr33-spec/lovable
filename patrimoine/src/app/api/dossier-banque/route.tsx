import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { currentMonth } from "@/lib/engine/dates";
import { project } from "@/lib/engine/projection";
import { projectImpact } from "@/lib/engine/project-impact";
import { isOpen } from "@/lib/engine/projects";
import { companySubset } from "@/lib/engine/subset";
import { GroupDossier, ProjectDossier, scopeTitle } from "@/lib/pdf/bank";
import type { AppData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Dossier banque : groupe, une société (?societe=) ou un projet (?projet=). */
export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const { data } = await loadDocument();
  const nowMonth = currentMonth();
  const generatedAt = new Date();
  const date = generatedAt.toISOString().slice(0, 10);
  // Le groupe est présenté tel qu'il est aujourd'hui, sans projet en cours.
  const today: AppData = { ...data, projects: (data.projects ?? []).map((p) => ({ ...p, inProjection: false })) };

  const projectId = url.searchParams.get("projet");
  let doc: React.ReactElement;
  let fileName: string;
  if (projectId) {
    const p = (data.projects ?? []).find((x) => x.id === projectId);
    if (!p) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    doc = <ProjectDossier data={today} projection={project(today, nowMonth)} nowMonth={nowMonth} scopeName={scopeTitle(data)} generatedAt={generatedAt} project={p} impact={isOpen(p) ? projectImpact(data, nowMonth, p) : undefined} />;
    fileName = `dossier-financement-${date}.pdf`;
  } else {
    const companyId = url.searchParams.get("societe") ?? undefined;
    if (companyId && !data.companies.some((c) => c.id === companyId)) return NextResponse.json({ error: "Société introuvable" }, { status: 404 });
    const scoped = companyId ? companySubset(today, companyId) : today;
    doc = <GroupDossier data={scoped} projection={project(scoped, nowMonth)} nowMonth={nowMonth} scopeName={scopeTitle(data, companyId)} generatedAt={generatedAt} />;
    fileName = `presentation-patrimoniale-${date}.pdf`;
  }
  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
