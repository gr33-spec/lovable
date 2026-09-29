import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { loadDocument } from "@/lib/server/db";
import { analyzeStrategy, strategyAiEnabled } from "@/lib/server/strategy-ai";
import { buildFacts, scopeLabel } from "@/lib/analysis/facts";
import type { AnalysisScope } from "@/lib/analysis/types";
import { currentMonth } from "@/lib/engine/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** L'analyse est-elle activée (clé configurée) ? */
export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  return NextResponse.json({ enabled: strategyAiEnabled() });
}

/**
 * Analyse IA du patrimoine (propriétaire uniquement ; refusée en consultation
 * et dans l'espace gestion). Les faits sont recalculés ici à partir des
 * données enregistrées : rien de ce qu'envoie le navigateur n'est chiffré.
 */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  if (!strategyAiEnabled()) {
    return NextResponse.json({ error: "L'analyse IA n'est pas encore activée (clé ANTHROPIC_API_KEY absente).", setup: true }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const doc = await loadDocument();
  const data = doc.data;
  const raw = body?.scope;
  let scope: AnalysisScope = { type: "global" };
  if (raw?.type === "company" && data.companies.some((c) => c.id === raw.id)) scope = { type: "company", id: raw.id };
  if (raw?.type === "building" && data.buildings.some((b) => b.id === raw.id)) scope = { type: "building", id: raw.id };
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 600) : "";
  try {
    const facts = buildFacts(data, currentMonth(), scope);
    const result = await analyzeStrategy(facts, question || undefined);
    return NextResponse.json({ result, scope, scopeLabel: scopeLabel(data, scope) });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Clé d'accès à l'IA invalide." }, { status: 502 });
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Service d'analyse saturé, réessayez dans une minute." }, { status: 429 });
    if (err instanceof Anthropic.BadRequestError) return NextResponse.json({ error: `Analyse refusée : ${err.message}` }, { status: 400 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: "Le service d'analyse est momentanément indisponible." }, { status: 502 });
    return NextResponse.json({ error: (err as Error).message || "Analyse impossible." }, { status: 500 });
  }
}
