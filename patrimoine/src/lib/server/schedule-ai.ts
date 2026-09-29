import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LoanScheduleRow } from "@/lib/types";
import { normalizeRows } from "@/lib/schedule";

// Lecture d'un tableau d'amortissement bancaire (PDF ou photo) par Claude.
// Le modèle recopie les lignes présentes dans le document, sans en calculer
// ni en compléter aucune ; les contrôles de cohérence sont faits ensuite par
// l'application et le résultat est relu par l'utilisateur avant d'être
// enregistré.

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["bank", "reference", "insuranceIncludedInPayment", "rows", "notes", "confidence"],
  properties: {
    bank: { type: "string", description: "Nom de la banque, chaîne vide si absent" },
    reference: { type: "string", description: "Numéro ou intitulé du prêt, chaîne vide si absent" },
    insuranceIncludedInPayment: { type: "boolean", description: "Vrai si la colonne « échéance » du document inclut l'assurance" },
    rows: {
      type: "array",
      description: "Toutes les échéances du tableau, dans l'ordre, recopiées telles quelles",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["month", "payment", "interest", "principal", "insurance", "balance"],
        properties: {
          month: { type: "string", description: "Mois de l'échéance au format AAAA-MM" },
          payment: { type: "number", description: "Échéance HORS assurance (capital + intérêts) en euros" },
          interest: { type: "number", description: "Intérêts de l'échéance" },
          principal: { type: "number", description: "Capital amorti par l'échéance" },
          insurance: { type: "number", description: "Assurance de l'échéance, 0 si absente du tableau" },
          balance: { type: "number", description: "Capital restant dû APRÈS l'échéance" },
        },
      },
    },
    notes: { type: "array", items: { type: "string" }, description: "Remarques courtes en français (paliers, différé, taux variable, pages manquantes…)" },
    confidence: { type: "string", enum: ["haute", "moyenne", "faible"] },
  },
};

const schema = z.object({
  bank: z.string(),
  reference: z.string(),
  insuranceIncludedInPayment: z.boolean(),
  rows: z.array(z.object({ month: z.string(), payment: z.number(), interest: z.number(), principal: z.number(), insurance: z.number(), balance: z.number() })),
  notes: z.array(z.string()),
  confidence: z.enum(["haute", "moyenne", "faible"]),
});

export interface ScheduleExtraction {
  bank: string | null;
  reference: string | null;
  rows: LoanScheduleRow[];
  notes: string[];
  confidence: "haute" | "moyenne" | "faible";
}

const SYSTEM = `Tu lis des tableaux d'amortissement de prêts immobiliers de banques françaises.
Règles impératives :
- Recopie chaque échéance présente dans le document, dans l'ordre, sans en sauter ni en ajouter. N'invente et ne calcule aucune ligne manquante : signale-la dans les notes.
- Dates : convertis la date d'échéance en mois AAAA-MM.
- Montants en euros avec les centimes (nombres, point décimal).
- payment est l'échéance hors assurance = capital + intérêts. Si la colonne échéance du document inclut l'assurance, retire l'assurance pour obtenir payment et indique insuranceIncludedInPayment = true.
- balance est le capital restant dû après l'échéance.
- En période de différé, capital amorti = 0.`;

const MEDIA: Record<string, "image/jpeg" | "image/png"> = { "image/jpeg": "image/jpeg", "image/png": "image/png" };

export async function readSchedule(file: { mime: string; data: Buffer }, hint?: string): Promise<ScheduleExtraction> {
  const client = new Anthropic();
  const b64 = file.data.toString("base64");
  const doc: Anthropic.Beta.BetaContentBlockParam =
    file.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: MEDIA[file.mime] ?? "image/jpeg", data: b64 } };
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: [doc, { type: "text", text: `Voici le tableau d'amortissement${hint ? ` du prêt « ${hint} »` : ""}. Recopie toutes les échéances.` }] }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("La lecture a été refusée par le modèle.");
  if (message.stop_reason === "max_tokens") throw new Error("Tableau trop long pour être lu en une fois : importez-le en plusieurs parties.");
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Lecture du tableau illisible.");
  const r = parsed.data;
  return {
    bank: r.bank.trim() || null,
    reference: r.reference.trim() || null,
    rows: normalizeRows(r.rows.map((x) => ({ ...x, insurance: x.insurance || undefined }))),
    notes: r.notes,
    confidence: r.confidence,
  };
}
