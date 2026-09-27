import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Lecture d'un bilan (liasse fiscale, comptes annuels) par Claude.
// Le modèle ne fait qu'EXTRAIRE des montants présents dans le document :
// tout montant introuvable reste null. Le résultat est toujours relu et
// validé par l'utilisateur avant d'être enregistré.

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const FIGURE_KEYS = [
  "revenue",
  "otherIncome",
  "externalCharges",
  "taxes",
  "depreciation",
  "operatingResult",
  "financialCharges",
  "exceptionalResult",
  "corporateTax",
  "netResult",
  "fixedAssetsGross",
  "fixedAssetsNet",
  "cash",
  "totalAssets",
  "equity",
  "shareCapital",
  "bankDebt",
  "partnerAccounts",
  "otherDebts",
] as const;

const FIGURE_DESCRIPTIONS: Record<(typeof FIGURE_KEYS)[number], string> = {
  revenue: "Chiffre d'affaires net / production vendue / loyers facturés (compte de résultat)",
  otherIncome: "Autres produits d'exploitation (hors chiffre d'affaires)",
  externalCharges: "Autres achats et charges externes",
  taxes: "Impôts, taxes et versements assimilés",
  depreciation: "Dotations aux amortissements (et provisions) d'exploitation",
  operatingResult: "Résultat d'exploitation",
  financialCharges: "Charges financières (intérêts et charges assimilées)",
  exceptionalResult: "Résultat exceptionnel",
  corporateTax: "Impôt sur les bénéfices",
  netResult: "Résultat de l'exercice (bénéfice ou perte, négatif si perte)",
  fixedAssetsGross: "Total actif immobilisé brut",
  fixedAssetsNet: "Total actif immobilisé net",
  cash: "Disponibilités (et valeurs mobilières de placement si présentées ensemble)",
  totalAssets: "Total du bilan (total général actif)",
  equity: "Total capitaux propres",
  shareCapital: "Capital social",
  bankDebt: "Emprunts et dettes auprès des établissements de crédit",
  partnerAccounts: "Comptes courants d'associés / emprunts et dettes financières divers envers les associés",
  otherDebts: "Autres dettes (fournisseurs, fiscales et sociales, autres)",
};

// Schéma de sortie sans aucun champ « nullable » (l'API limite le nombre de
// types union) : chaque exercice est une liste de montants trouvés ; un
// montant absent du document n'apparaît simplement pas dans la liste.
function amountsSchema(description: string) {
  return {
    type: "array",
    description,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["field", "value"],
      properties: {
        field: { type: "string", enum: [...FIGURE_KEYS] },
        value: { type: "number", description: "Montant en euros, négatif si perte" },
      },
    },
  };
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["companyName", "siren", "closingDate", "durationMonths", "currentYear", "previousYear", "notes", "confidence"],
  properties: {
    companyName: { type: "string", description: "Dénomination de la société telle qu'écrite dans le document, chaîne vide si absente" },
    siren: { type: "string", description: "SIREN, chaîne vide si absent" },
    closingDate: { type: "string", description: "Date de clôture de l'exercice N au format AAAA-MM-JJ, chaîne vide si absente" },
    durationMonths: { type: "number", description: "Durée de l'exercice N en mois, 0 si inconnue" },
    currentYear: amountsSchema("Montants de l'exercice N (colonne la plus récente) réellement présents dans le document"),
    previousYear: amountsSchema("Montants de l'exercice N-1 réellement présents, liste vide si la colonne N-1 est absente"),
    notes: {
      type: "array",
      items: { type: "string" },
      description: "3 à 6 points d'attention factuels et courts, en français, utiles à un banquier (ex. perte, capitaux propres négatifs, forte hausse des charges)",
    },
    confidence: { type: "string", enum: ["haute", "moyenne", "faible"], description: "Confiance globale dans la lecture (faible si document illisible ou incomplet)" },
  },
};

type FigureKey = (typeof FIGURE_KEYS)[number];
type Figures = Record<FigureKey, number | null>;

const amounts = z.array(z.object({ field: z.enum(FIGURE_KEYS), value: z.number() }));

const rawSchema = z.object({
  companyName: z.string(),
  siren: z.string(),
  closingDate: z.string(),
  durationMonths: z.number(),
  currentYear: amounts,
  previousYear: amounts,
  notes: z.array(z.string()),
  confidence: z.enum(["haute", "moyenne", "faible"]),
});

function toFigures(list: z.infer<typeof amounts>): Figures {
  const out = Object.fromEntries(FIGURE_KEYS.map((k) => [k, null])) as Figures;
  for (const { field, value } of list) if (Number.isFinite(value)) out[field] = Math.round(value);
  return out;
}

export interface BilanExtraction {
  companyName: string | null;
  siren: string | null;
  closingDate: string | null;
  durationMonths: number | null;
  currentYear: Figures;
  previousYear: Figures | null;
  notes: string[];
  confidence: "haute" | "moyenne" | "faible";
}

const SYSTEM = `Tu es un expert-comptable français. Tu lis des comptes annuels (bilan, compte de résultat, liasse fiscale 2033/2065/2072, plaquette) de sociétés civiles immobilières et de sociétés commerciales.
Règles impératives :
- Extrais uniquement des montants réellement présents dans le document. N'invente, n'estime et ne calcule jamais un montant absent : ne le mets pas dans la liste.
- Montants en euros, sans séparateur, arrondis à l'euro. Une perte ou un montant négatif est un nombre négatif.
- Si le document présente les exercices N et N-1, remplis currentYear avec N (le plus récent) et previousYear avec N-1.
- Pour une SCI à l'IR (déclaration 2072), les loyers bruts vont dans revenue ; le revenu net foncier ou le résultat dans netResult.
- Les notes sont factuelles, courtes et en français.
Signification des champs (field) :
${FIGURE_KEYS.map((k) => `- ${k} : ${FIGURE_DESCRIPTIONS[k]}`).join("\n")}`;

export async function analyzeBilan(pdf: Buffer, companyHint?: string): Promise<BilanExtraction> {
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") } },
          {
            type: "text",
            text: `Voici les comptes annuels${companyHint ? ` de la société « ${companyHint} »` : ""}. Extrais les montants demandés.`,
          },
        ],
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("L'analyse a été refusée par le modèle.");
  if (message.stop_reason === "max_tokens") throw new Error("Document trop long pour être analysé en une fois.");
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = rawSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Réponse de l'analyse illisible.");
  const r = parsed.data;
  const previous = toFigures(r.previousYear);
  return {
    companyName: r.companyName.trim() || null,
    siren: r.siren.trim() || null,
    closingDate: /^\d{4}-\d{2}-\d{2}$/.test(r.closingDate) ? r.closingDate : null,
    durationMonths: r.durationMonths > 0 ? r.durationMonths : null,
    currentYear: toFigures(r.currentYear),
    previousYear: r.previousYear.length > 0 ? previous : null,
    notes: r.notes,
    confidence: r.confidence,
  };
}
