import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { aiEnabled, analyzeBilan } from "@/lib/server/bilan-ai";
import { readFile } from "@/lib/server/files";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Analyse d'un bilan déjà envoyé : renvoie une proposition, rien n'est enregistré. */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  if (!aiEnabled()) {
    return NextResponse.json({ error: "L'analyse automatique n'est pas configurée (clé ANTHROPIC_API_KEY absente)." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const fileId = typeof body.fileId === "string" ? body.fileId : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.slice(0, 120) : undefined;
  const file = await readFile(fileId).catch(() => undefined);
  if (!file) return NextResponse.json({ error: "Fichier introuvable ou incomplet." }, { status: 404 });
  try {
    const extraction = await analyzeBilan(file.data, companyName);
    return NextResponse.json({ extraction });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé d'accès à l'IA invalide." }, { status: 502 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Service d'analyse saturé, réessayez dans une minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: `Document refusé par l'analyse : ${err.message}` }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Le service d'analyse est momentanément indisponible." }, { status: 502 });
    }
    return NextResponse.json({ error: (err as Error).message || "Analyse impossible." }, { status: 500 });
  }
}
