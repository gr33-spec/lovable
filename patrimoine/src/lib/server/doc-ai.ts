import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AppData, DocCategory } from "@/lib/types";
import { DOC_CATEGORIES } from "@/lib/documents";

// Classement d'une pièce déposée : Claude lit le document et le rapproche
// des éléments existants (sociétés, immeubles, lots, locataires, prêts),
// dont il reçoit la liste avec leurs identifiants. Il ne rattache qu'à un
// élément de cette liste et dit quand il hésite : l'application demande
// alors une confirmation au lieu de ranger au hasard.

const CATS = DOC_CATEGORIES.map((c) => c.value) as [DocCategory, ...DocCategory[]];

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "title", "date", "summary", "companyId", "buildingId", "unitId", "tenancyId", "loanId", "categoryConfidence", "placementConfidence", "reason", "alternatives"],
  properties: {
    category: { type: "string", enum: CATS },
    title: { type: "string", description: "Titre court et parlant, en français (ex. « Assurance PNO 2026 — Immeuble du Port »)" },
    date: { type: "string", description: "Date du document AAAA-MM-JJ, chaîne vide si absente" },
    summary: { type: "string", description: "Une à deux phrases : de quoi il s'agit, parties, montants et références utiles à la recherche" },
    companyId: { type: "string", description: "id de la société concernée, chaîne vide si inconnue" },
    buildingId: { type: "string", description: "id de l'immeuble, chaîne vide si inconnu" },
    unitId: { type: "string", description: "id du lot, chaîne vide si inconnu ou si le document concerne tout l'immeuble" },
    tenancyId: { type: "string", description: "id du bail (locataire), chaîne vide si sans objet" },
    loanId: { type: "string", description: "id du prêt, chaîne vide si sans objet" },
    categoryConfidence: { type: "string", enum: ["haute", "moyenne", "faible"] },
    placementConfidence: { type: "string", enum: ["haute", "moyenne", "faible"], description: "haute seulement si le document désigne sans ambiguïté l'élément (adresse, numéro de lot, nom du locataire, référence du prêt…)" },
    reason: { type: "string", description: "Indices utilisés pour le rattachement, en une phrase" },
    alternatives: {
      type: "array",
      description: "Autres rattachements plausibles si tu hésites (3 au plus)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["buildingId", "unitId", "tenancyId", "loanId"],
        properties: { buildingId: { type: "string" }, unitId: { type: "string" }, tenancyId: { type: "string" }, loanId: { type: "string" } },
      },
    },
  },
};

const target = { buildingId: z.string(), unitId: z.string(), tenancyId: z.string(), loanId: z.string() };
const schema = z.object({
  category: z.enum(CATS),
  title: z.string(),
  date: z.string(),
  summary: z.string(),
  companyId: z.string(),
  ...target,
  categoryConfidence: z.enum(["haute", "moyenne", "faible"]),
  placementConfidence: z.enum(["haute", "moyenne", "faible"]),
  reason: z.string(),
  alternatives: z.array(z.object(target)),
});

export type Classification = z.infer<typeof schema>;

/** Éléments auxquels une pièce peut être rattachée (identifiants compris). */
export function classificationContext(data: AppData) {
  const tenantsOf = (unitId: string) =>
    data.tenancies
      .filter((t) => t.unitId === unitId && t.status !== "clos")
      .map((t) => ({ tenancyId: t.id, locataires: t.tenants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean), garants: (t.guarantors ?? []).map((g) => [g.firstName, g.lastName].filter(Boolean).join(" ")).filter(Boolean), debut: t.startDate ?? null, statut: t.status }));
  return {
    societes: data.companies.map((c) => ({ id: c.id, nom: c.name, siren: c.siren ?? null, adresse: c.address ?? null })),
    immeubles: data.buildings.map((b) => ({
      id: b.id,
      nom: b.name,
      societeId: b.companyId ?? null,
      adresse: [b.address, b.city].filter(Boolean).join(", ") || null,
      lots: data.units.filter((u) => u.buildingId === b.id).map((u) => ({ id: u.id, nom: u.name, type: u.type ?? null, surface: u.surface ?? null, loyer: u.rent ?? null, baux: tenantsOf(u.id) })),
    })),
    prets: data.loans.map((l) => ({ id: l.id, banque: l.bank ?? null, reference: l.reference ?? null, immeubleId: l.buildingId ?? null, societeId: l.companyId ?? null, montant: l.initialAmount ?? null, debut: l.startDate ?? null, fin: l.endDate ?? null, echeance: l.monthlyPayment ?? null, taux: l.ratePct ?? null })),
  };
}

const SYSTEM = `Tu classes les documents d'un investisseur immobilier français (SCI, immeubles, lots, locataires, prêts).
Règles impératives :
- Rattache uniquement à des identifiants présents dans la liste fournie. Si le document ne permet pas de choisir, laisse le champ vide.
- Ne devine pas : un bail ne se rattache à un lot et à un locataire que si le document les désigne (adresse, numéro ou description du lot, nom du locataire, loyer…). En cas de doute, confiance « moyenne » ou « faible » et propose les alternatives.
- Tableau d'amortissement ou offre de prêt : la société est l'emprunteur imprimé sur le document, l'immeuble est le bien financé (adresse). Ne choisis un prêt (loanId) que si ses caractéristiques (montant, date de départ, échéance, taux, banque, référence) correspondent aux chiffres du document ; le nom donné au prêt dans l'application n'est jamais un indice. Les chiffres sont vérifiés ensuite par l'application.
- Un document qui concerne tout l'immeuble (assurance PNO, taxe foncière, diagnostic des parties communes…) n'a pas de lot.
- Catégories : bail (contrat de location signé), caution (acte de cautionnement), etat_des_lieux, courrier (lettre au ou du locataire : révision, relance, congé…), identite (pièces du dossier locataire : identité, justificatifs), tableau_amortissement, offre_pret, banque (relevés, attestations, contrats bancaires), assurance, facture, devis, diagnostic (DPE, amiante, plomb, électricité…), acte (acte notarié, statuts, PV d'assemblée de la société), fiscal (taxe foncière, impôts), copropriete (AG, appels de fonds), bilan (comptes annuels), autre.
- Écris le titre, le résumé et la raison en français, courts.`;

const MEDIA: Record<string, "image/jpeg" | "image/png"> = { "image/jpeg": "image/jpeg", "image/png": "image/png" };

export async function classifyDocument(file: { name: string; mime: string; data: Buffer }, data: AppData): Promise<Classification> {
  const client = new Anthropic();
  const b64 = file.data.toString("base64");
  const doc: Anthropic.Beta.BetaContentBlockParam =
    file.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: MEDIA[file.mime] ?? "image/jpeg", data: b64 } };
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          doc,
          { type: "text", text: `Nom du fichier : « ${file.name} ».\nÉléments existants (JSON) :\n${JSON.stringify(classificationContext(data))}\n\nClasse ce document.` },
        ],
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle.");
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Classement illisible.");
  return parsed.data;
}

/** Démonstration sans clé (tests) : indices tirés du nom du fichier seulement. */
export function mockClassify(file: { name: string }, data: AppData): Classification {
  const n = file.name.toLowerCase();
  const category: DocCategory = n.includes("bail") ? "bail" : n.includes("tableau") ? "tableau_amortissement" : n.includes("assurance") ? "assurance" : n.includes("caution") ? "caution" : "autre";
  const b = data.buildings.find((x) => n.includes(x.name.toLowerCase().split(" ").pop() ?? "§"));
  const u = b ? data.units.find((x) => x.buildingId === b.id && n.includes(x.name.toLowerCase().split(" ").slice(0, 2).join(" "))) : undefined;
  const t = u ? data.tenancies.find((x) => x.unitId === u.id && x.status === "actif") : undefined;
  // Tableaux : le financement est retrouvé par l'application à partir des chiffres lus.
  const c = b ? undefined : data.companies.find((x) => x.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3).some((w) => n.includes(w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
  const l = undefined as { id: string } | undefined;
  const sure = (!!b || !!c) && (category !== "bail" || !!t);
  return {
    category,
    title: `${category} ${b?.name ?? ""}`.trim(),
    date: "",
    summary: `Démonstration : ${file.name}`,
    companyId: b?.companyId ?? c?.id ?? "",
    buildingId: b?.id ?? "",
    unitId: u?.id ?? "",
    tenancyId: t?.id ?? "",
    loanId: l?.id ?? "",
    categoryConfidence: category === "autre" ? "faible" : "haute",
    placementConfidence: sure ? "haute" : "faible",
    reason: "Nom du fichier",
    alternatives: [],
  };
}
