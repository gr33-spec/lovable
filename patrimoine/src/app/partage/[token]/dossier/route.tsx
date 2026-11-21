import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { resolveShare } from "@/lib/server/shares";
import { currentMonth } from "@/lib/engine/dates";
import { project } from "@/lib/engine/projection";
import { GroupDossier, renderDossier, scopeTitle } from "@/lib/pdf/bank";
import { parsePdfPrefs } from "@/lib/pdf/prefs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dossier PDF accessible par un lien de partage valide (lecture seule).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await resolveShare(token))) return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  const { data } = await loadDocument();
  const nowMonth = currentMonth();
  const today = { ...data, projects: (data.projects ?? []).map((p) => ({ ...p, inProjection: false })) };
  const prefs = parsePdfPrefs(data.settings.pdf);
  const buffer = await renderDossier(<GroupDossier data={today} projection={project(today, nowMonth)} nowMonth={nowMonth} scopeName={scopeTitle(data)} generatedAt={new Date()} prefs={prefs} />, prefs, data.settings.theme);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presentation-patrimoniale-${date}.pdf"`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
