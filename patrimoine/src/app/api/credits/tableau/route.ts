import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/guard";
import { aiEnabled } from "@/lib/server/bilan-ai";
import { readFile } from "@/lib/server/files";
import { readSchedule } from "@/lib/server/schedule-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Lecture d'un tableau d'amortissement déjà envoyé : renvoie une proposition, rien n'est enregistré. */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const mock = process.env.PATRIMOINE_AI_MOCK === "1" && !process.env.ANTHROPIC_API_KEY;
  if (!aiEnabled() && !mock) {
    return NextResponse.json({ error: "La lecture automatique n'est pas activée (clé ANTHROPIC_API_KEY absente)." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const fileId = typeof body.fileId === "string" ? body.fileId : "";
  const hint = typeof body.loanName === "string" ? body.loanName.slice(0, 120) : undefined;
  const file = await readFile(fileId).catch(() => undefined);
  if (!file) return NextResponse.json({ error: "Fichier introuvable ou incomplet." }, { status: 404 });
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.mime)) return NextResponse.json({ error: "Format non pris en charge : PDF, JPEG ou PNG." }, { status: 400 });
  try {
    const extraction = mock ? mockSchedule() : await readSchedule(file, hint);
    if (extraction.rows.length < 2) return NextResponse.json({ error: "Aucune échéance lisible dans ce document." }, { status: 422 });
    return NextResponse.json({ extraction });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Clé d'accès à l'IA invalide." }, { status: 502 });
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Service de lecture saturé, réessayez dans une minute." }, { status: 429 });
    if (err instanceof Anthropic.BadRequestError) return NextResponse.json({ error: `Document refusé : ${err.message}` }, { status: 400 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: "Le service de lecture est momentanément indisponible." }, { status: 502 });
    return NextResponse.json({ error: (err as Error).message || "Lecture impossible." }, { status: 500 });
  }
}

/** Tableau de démonstration (tests sans clé) : 100 000 € à 2,4 % sur 15 ans. */
function mockSchedule() {
  const rows = [];
  let b = 100_000;
  const r = 0.024 / 12;
  const pay = Math.round(((b * r) / (1 - Math.pow(1 + r, -180))) * 100) / 100;
  for (let i = 0; i < 180; i++) {
    const m = 2021 * 12 + i;
    const interest = Math.round(b * r * 100) / 100;
    const principal = i === 179 ? b : Math.round((pay - interest) * 100) / 100;
    b = Math.round((b - principal) * 100) / 100;
    rows.push({ month: `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`, payment: Math.round((principal + interest) * 100) / 100, interest, principal, insurance: 18.5, balance: Math.max(0, b) });
  }
  return { bank: "Banque de démonstration", reference: "Prêt test", rows, notes: ["Tableau de démonstration."], confidence: "haute" as const };
}
