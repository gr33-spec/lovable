import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LoanScheduleRow, ScheduleMeta } from "@/lib/types";
import { normalizeRows } from "@/lib/schedule";

// Lecture d'un tableau d'amortissement bancaire (PDF ou photo) par Claude.
// Le modèle recopie les lignes présentes dans le document, sans en calculer
// ni en compléter aucune ; les contrôles de cohérence sont faits ensuite par
// l'application et le résultat est relu par l'utilisateur avant d'être
// enregistré.

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["borrower", "bank", "reference", "address", "initialAmount", "startDate", "durationMonths", "ratePct", "insuranceIncludedInPayment", "rows", "notes", "confidence"],
  properties: {
    borrower: { type: "string", description: "Emprunteur tel qu'imprimé (ex. « SCI DU TRÉGOR »), chaîne vide si absent" },
    bank: { type: "string", description: "Nom de la banque prêteuse, chaîne vide si absent" },
    reference: { type: "string", description: "Numéro du prêt ou du contrat tel qu'imprimé, chaîne vide si absent" },
    address: { type: "string", description: "Adresse du bien financé si le document l'indique, chaîne vide sinon" },
    initialAmount: { type: "number", description: "Montant emprunté indiqué dans l'en-tête, 0 si absent" },
    startDate: { type: "string", description: "Date de début du prêt indiquée (déblocage, mise en place ou signature) au format AAAA-MM-JJ, chaîne vide si absente" },
    durationMonths: { type: "number", description: "Durée totale indiquée en mois, 0 si absente" },
    ratePct: { type: "number", description: "Taux nominal annuel indiqué en % (pas le TAEG), 0 si absent" },
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
  borrower: z.string(),
  bank: z.string(),
  reference: z.string(),
  address: z.string(),
  initialAmount: z.number(),
  startDate: z.string(),
  durationMonths: z.number(),
  ratePct: z.number(),
  insuranceIncludedInPayment: z.boolean(),
  rows: z.array(z.object({ month: z.string(), payment: z.number(), interest: z.number(), principal: z.number(), insurance: z.number(), balance: z.number() })),
  notes: z.array(z.string()),
  confidence: z.enum(["haute", "moyenne", "faible"]),
});

export interface ScheduleExtraction {
  bank: string | null;
  reference: string | null;
  /** En-tête du document (emprunteur, banque, référence, montant, début…). */
  meta: ScheduleMeta;
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
- En période de différé, capital amorti = 0.
- En-tête : recopie l'emprunteur, la banque, la référence du prêt, l'adresse du bien, le montant emprunté, la date de début, la durée et le taux nominal tels qu'ils sont imprimés. Laisse vide (ou 0) ce qui n'y figure pas : ne déduis rien des lignes.
- Si le tableau commence en cours de prêt (édité à une date donnée), recopie seulement les lignes présentes.`;

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
    meta: cleanMeta(r),
    rows: normalizeRows(r.rows.map((x) => ({ ...x, insurance: x.insurance || undefined }))),
    notes: r.notes,
    confidence: r.confidence,
  };
}

/** En-tête sans champs vides ni valeurs aberrantes. */
export function cleanMeta(r: { borrower: string; bank: string; reference: string; address: string; initialAmount: number; startDate: string; durationMonths: number; ratePct: number }): ScheduleMeta {
  const meta: ScheduleMeta = {};
  if (r.borrower.trim()) meta.borrower = r.borrower.trim();
  if (r.bank.trim()) meta.bank = r.bank.trim();
  if (r.reference.trim()) meta.reference = r.reference.trim();
  if (r.address.trim()) meta.address = r.address.trim();
  if (r.initialAmount > 0) meta.initialAmount = r.initialAmount;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(r.startDate)) meta.startDate = r.startDate.length === 7 ? `${r.startDate}-01` : r.startDate;
  if (r.durationMonths > 0 && r.durationMonths <= 600) meta.durationMonths = Math.round(r.durationMonths);
  if (r.ratePct > 0 && r.ratePct < 20) meta.ratePct = r.ratePct;
  return meta;
}

/**
 * Tableau de démonstration (tests sans clé IA), décrit par le nom du fichier :
 * montant (≥ 10 000), premier mois AAAA-MM, taux (1.65), durée (240m),
 * banque (bq-Nom), « partiel-AAAA-MM » pour un tableau édité en cours de prêt.
 * Par défaut : 100 000 € à 2,4 % sur 180 mois à partir de janvier 2021.
 */
export function mockScheduleFromName(name: string): ScheduleExtraction {
  const n = name.replace(/\.[a-z0-9]+$/i, "");
  const amount = Number(n.match(/(?:^|[^0-9.,])(\d{5,7})(?![0-9.,-])/)?.[1] ?? 100_000);
  const start = n.match(/(?<!partiel-)(20\d{2})-(\d{2})/);
  const rate = Number((n.match(/(?:^|[_ ])(\d{1,2}[.,]\d{1,3})(?=$|[_ ])/)?.[1] ?? "2.4").replace(",", "."));
  const months = Number(n.match(/(\d{2,3})m(?:$|[_ ])/)?.[1] ?? 180);
  const bank = n.match(/bq-([A-Za-z]+)/)?.[1];
  const from = n.match(/partiel-(20\d{2})-(\d{2})/);
  const m0 = start ? Number(start[1]) * 12 + Number(start[2]) - 1 : 2021 * 12;
  const r = rate / 1200;
  const pay = Math.round(((amount * r) / (1 - Math.pow(1 + r, -months))) * 100) / 100;
  const rows: LoanScheduleRow[] = [];
  let b = amount;
  for (let i = 0; i < months; i++) {
    const m = m0 + i;
    const interest = Math.round(b * r * 100) / 100;
    const principal = i === months - 1 ? b : Math.round((pay - interest) * 100) / 100;
    b = Math.round((b - principal) * 100) / 100;
    rows.push({ month: `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`, payment: Math.round((principal + interest) * 100) / 100, interest, principal, insurance: 18.5, balance: Math.max(0, b) });
  }
  const kept = from ? rows.filter((x) => x.month >= `${from[1]}-${from[2]}`) : rows;
  const startDate = `${Math.floor((m0 - 1) / 12)}-${String(((m0 - 1) % 12) + 1).padStart(2, "0")}-01`;
  return {
    bank: bank ?? "Banque de démonstration",
    reference: null,
    meta: cleanMeta({ borrower: n.replace(/[_-]+/g, " "), bank: bank ?? "Banque de démonstration", reference: "", address: "", initialAmount: amount, startDate, durationMonths: months, ratePct: rate }),
    rows: kept,
    notes: ["Tableau de démonstration."],
    confidence: "haute",
  };
}
