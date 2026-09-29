import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { loadDocument } from "@/lib/server/db";
import { readFile } from "@/lib/server/files";
import { aiEnabled } from "@/lib/server/bilan-ai";
import { classifyDocument, mockClassify, type Classification } from "@/lib/server/doc-ai";
import { readSchedule } from "@/lib/server/schedule-ai";
import { checkSchedule } from "@/lib/schedule";
import type { AppData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Identifiants inconnus retirés, rattachements complétés vers le haut (lot → immeuble → société). */
function sanitize(c: Classification, data: AppData): Classification {
  const has = (list: { id: string }[], id: string) => (id && list.some((x) => x.id === id) ? id : "");
  const tenancyId = has(data.tenancies, c.tenancyId);
  const tenancy = data.tenancies.find((t) => t.id === tenancyId);
  const unitId = has(data.units, c.unitId) || tenancy?.unitId || "";
  const unit = data.units.find((u) => u.id === unitId);
  const loanId = has(data.loans, c.loanId);
  const loan = data.loans.find((l) => l.id === loanId);
  const buildingId = unit?.buildingId || has(data.buildings, c.buildingId) || loan?.buildingId || "";
  const building = data.buildings.find((b) => b.id === buildingId);
  const companyId = building?.companyId || has(data.companies, c.companyId) || loan?.companyId || "";
  // Incohérence (lot d'un autre immeuble…) : on n'est plus sûr.
  const incoherent = (c.buildingId && buildingId && c.buildingId !== buildingId) || (c.unitId && !unitId) || (c.tenancyId && !tenancyId) || (c.loanId && !loanId);
  return {
    ...c,
    companyId,
    buildingId,
    unitId,
    tenancyId,
    loanId,
    placementConfidence: incoherent ? "faible" : c.placementConfidence,
    alternatives: c.alternatives.filter((a) => (!a.buildingId || data.buildings.some((b) => b.id === a.buildingId)) && (!a.unitId || data.units.some((u) => u.id === a.unitId))).slice(0, 3),
  };
}

/** Lecture d'une pièce déposée : type, rattachement proposé, et échéances s'il s'agit d'un tableau. Rien n'est enregistré. */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const mock = process.env.PATRIMOINE_AI_MOCK === "1" && !process.env.ANTHROPIC_API_KEY;
  if (!aiEnabled() && !mock) return NextResponse.json({ error: "Classement automatique indisponible (clé ANTHROPIC_API_KEY absente) : choisissez le rangement vous-même.", manual: true }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const fileId = typeof body.fileId === "string" ? body.fileId : "";
  const file = await readFile(fileId).catch(() => undefined);
  if (!file) return NextResponse.json({ error: "Fichier introuvable ou incomplet." }, { status: 404 });
  const data = (await loadDocument()).data;
  try {
    const raw = mock ? mockClassify(file, data) : await classifyDocument(file, data);
    const suggestion = sanitize(raw, data);
    let schedule: { rows: unknown[]; issues: string[] } | undefined;
    if (suggestion.category === "tableau_amortissement") {
      // Les échéances sont lues dans la foulée : le tableau pourra alimenter le crédit.
      const rows = mock ? [] : (await readSchedule(file, suggestion.title).catch(() => undefined))?.rows;
      if (rows && rows.length >= 2) schedule = { rows, issues: checkSchedule(rows).issues };
    }
    return NextResponse.json({ suggestion, schedule });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Service saturé, réessayez dans une minute." }, { status: 429 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: "Lecture momentanément indisponible : choisissez le rangement vous-même.", manual: true }, { status: 502 });
    return NextResponse.json({ error: (err as Error).message || "Lecture impossible.", manual: true }, { status: 500 });
  }
}
