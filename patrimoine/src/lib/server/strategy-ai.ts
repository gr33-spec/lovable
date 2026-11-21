import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Facts } from "@/lib/analysis/facts";
import { knownIds } from "@/lib/analysis/facts";
import type { AnalysisIdea, AnalysisResult, AnalysisTarget } from "@/lib/analysis/types";

// Analyse stratégique du patrimoine par Claude. Le modèle reçoit le dossier
// de faits calculé par l'application et rend une analyse structurée : il ne
// calcule ni n'invente aucun chiffre, et chaque piste peut être simulée par
// le moteur de l'application.

const TARGET = {
  type: "object",
  additionalProperties: false,
  required: ["type", "id"],
  properties: {
    type: { type: "string", enum: ["global", "societe", "immeuble", "credit"] },
    id: { type: "string", description: "Identifiant exact (champ id) tiré des faits ; chaîne vide pour global" },
  },
};

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["synthese", "sante", "forces", "risques", "pistes", "aCompleter", "reponse"],
  properties: {
    synthese: { type: "string", description: "3 à 5 phrases : situation d'ensemble, en français simple" },
    sante: {
      type: "object",
      additionalProperties: false,
      required: ["niveau", "explication"],
      properties: {
        niveau: { type: "string", enum: ["solide", "correct", "fragile"] },
        explication: { type: "string", description: "Une phrase, appuyée sur 2 ou 3 chiffres des faits" },
      },
    },
    forces: { type: "array", items: { type: "string" }, description: "2 à 5 points forts, courts et chiffrés" },
    risques: {
      type: "array",
      description: "Risques et points de vigilance, du plus grave au moins grave (5 au plus)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titre", "detail", "gravite", "cible"],
        properties: {
          titre: { type: "string" },
          detail: { type: "string" },
          gravite: { type: "string", enum: ["haute", "moyenne", "faible"] },
          cible: TARGET,
        },
      },
    },
    pistes: {
      type: "array",
      description: "3 à 6 pistes d'action classées par impact décroissant",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titre", "pourquoi", "impact", "horizon", "type", "cible", "simulation", "aValider"],
        properties: {
          titre: { type: "string", description: "Action concrète, 8 mots au plus" },
          pourquoi: { type: "string" },
          impact: { type: "string", description: "Effet attendu chiffré à partir des faits, ou « à estimer »" },
          horizon: { type: "string", enum: ["court", "moyen", "long"] },
          type: { type: "string", enum: ["vente", "refinancement", "achat", "travaux", "remboursement", "loyers", "structure", "autre"] },
          cible: TARGET,
          simulation: {
            type: "object",
            additionalProperties: false,
            required: ["action", "annee", "montant", "tauxPct", "dureeAns", "creditIds"],
            description: "Paramètres pour tester la piste dans les simulations de l'application ; 0 quand la valeur n'est pas connue",
            properties: {
              action: { type: "string", enum: ["vente", "refinancement", "achat", "travaux", "remboursement", "aucune"] },
              annee: { type: "number" },
              montant: { type: "number", description: "Prix, montant emprunté ou coût en euros ; 0 si non déductible des faits" },
              tauxPct: { type: "number", description: "0 si non connu" },
              dureeAns: { type: "number", description: "0 si non connue" },
              creditIds: { type: "array", items: { type: "string" }, description: "Identifiants de crédits concernés (refinancement, remboursement)" },
            },
          },
          aValider: { type: "string", description: "Ce qu'il faut vérifier et avec qui (expert-comptable, notaire, banque, agent immobilier)" },
        },
      },
    },
    aCompleter: { type: "array", items: { type: "string" }, description: "Données manquantes qui rendraient l'analyse plus sûre (5 au plus)" },
    reponse: { type: "string", description: "Réponse à la question posée ; chaîne vide s'il n'y a pas de question" },
  },
};

const target = z.object({ type: z.enum(["global", "societe", "immeuble", "credit"]), id: z.string() });
const schema = z.object({
  synthese: z.string(),
  sante: z.object({ niveau: z.enum(["solide", "correct", "fragile"]), explication: z.string() }),
  forces: z.array(z.string()),
  risques: z.array(z.object({ titre: z.string(), detail: z.string(), gravite: z.enum(["haute", "moyenne", "faible"]), cible: target })),
  pistes: z.array(
    z.object({
      titre: z.string(),
      pourquoi: z.string(),
      impact: z.string(),
      horizon: z.enum(["court", "moyen", "long"]),
      type: z.enum(["vente", "refinancement", "achat", "travaux", "remboursement", "loyers", "structure", "autre"]),
      cible: target,
      simulation: z.object({
        action: z.enum(["vente", "refinancement", "achat", "travaux", "remboursement", "aucune"]),
        annee: z.number(),
        montant: z.number(),
        tauxPct: z.number(),
        dureeAns: z.number(),
        creditIds: z.array(z.string()),
      }),
      aValider: z.string(),
    }),
  ),
  aCompleter: z.array(z.string()),
  reponse: z.string(),
});

const SYSTEM = `Tu es un conseiller en stratégie patrimoniale immobilière en France (SCI à l'IR et à l'IS, holding, SARL, crédits bancaires). Tu analyses le patrimoine d'un investisseur à partir d'un dossier de faits calculé par son application.

Règles impératives :
- Appuie-toi uniquement sur les faits fournis. Tous les chiffres que tu cites en viennent. Ne calcule pas de nouveaux montants au-delà d'opérations évidentes (différence, somme) et ne devine jamais un prix de marché, un taux bancaire ou une fiscalité précise : écris « à estimer » ou « à vérifier ».
- Une valeur null signifie « données insuffisantes » : dis-le plutôt que de supposer.
- Les remarques fiscales et juridiques restent générales et sont toujours à valider avec l'expert-comptable ou le notaire.
- Les identifiants (id) que tu cites dans cible et creditIds doivent être copiés exactement depuis les faits.
- Pour la simulation d'une piste, n'indique un montant que s'il découle des faits (valeur estimée d'un immeuble, capital restant d'un crédit, coût de travaux prévu) ; sinon 0. L'utilisateur complétera.
- Classe les pistes par impact sur la trésorerie et le patrimoine net ; pense aussi aux échéances (fins de crédit, DPE F et G interdits à la location progressivement, travaux prévus), à la vacance, à la concentration, à la capacité d'emprunt et à l'effet de levier.
- Écris en français simple, phrases courtes, compréhensibles sans être expert.
- Sois bref : synthèse en 3 phrases, 4 forces, 4 risques et 4 pistes au plus, chaque texte en une ou deux phrases.
- « aCompleter » : les informations manquantes les plus utiles, en disant où les saisir dans l'application (ex. « Immeuble du Port : valeur estimée — fiche de l'immeuble »).`;

export function strategyAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) || process.env.PATRIMOINE_AI_MOCK === "1";
}

/** Cibles inconnues ramenées au niveau global (l'IA ne peut pas désigner un élément qui n'existe pas). */
function sanitize(result: z.infer<typeof schema>, facts: Facts): AnalysisResult {
  const ids = knownIds(facts);
  const fix = (t: AnalysisTarget): AnalysisTarget => (t.type === "global" || !ids[t.type].has(t.id) ? { type: "global", id: "" } : t);
  const pistes: AnalysisIdea[] = result.pistes.slice(0, 6).map((p) => ({
    ...p,
    cible: fix(p.cible),
    simulation: { ...p.simulation, creditIds: p.simulation.creditIds.filter((id) => ids.credit.has(id)) },
  }));
  return {
    ...result,
    forces: result.forces.slice(0, 5),
    risques: result.risques.slice(0, 5).map((r) => ({ ...r, cible: fix(r.cible) })),
    pistes,
    aCompleter: result.aCompleter.slice(0, 5),
  };
}

/**
 * Faits sérialisés au plus court (économie de jetons) : valeurs nulles,
 * listes vides et objets vides retirés (l'absence signifie « inconnu »),
 * montants arrondis à l'euro, ratios à deux décimales.
 */
export function compactFacts(facts: Facts): string {
  const clean = (v: unknown): unknown => {
    if (v === null || v === undefined || v === "") return undefined;
    if (typeof v === "number") return Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
    if (Array.isArray(v)) {
      const list = v.map(clean).filter((x) => x !== undefined);
      return list.length ? list : undefined;
    }
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) {
        const c = clean(x);
        if (c !== undefined) out[k] = c;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return v;
  };
  return JSON.stringify(clean(facts) ?? {});
}

export async function analyzeStrategy(facts: Facts, question?: string): Promise<AnalysisResult> {
  if (process.env.PATRIMOINE_AI_MOCK === "1" && !process.env.ANTHROPIC_API_KEY) return sanitize(mock(facts, question), facts);
  const client = new Anthropic();
  // Coût maîtrisé : réflexion courte (effort bas), faits compacts mis en cache
  // (une deuxième question sur le même périmètre dans les minutes qui suivent
  // les relit à 10 % du prix), réponse plafonnée.
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 12000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: [{ type: "text", text: SYSTEM }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Faits du patrimoine (JSON ; un champ absent = inconnu) :\n${compactFacts(facts)}`, cache_control: { type: "ephemeral" } },
          {
            type: "text",
            text: question
              ? `Question de l'investisseur : « ${question} ». Réponds-y d'abord dans « reponse » (court), puis une analyse brève.`
              : "Fais l'analyse (sans question : « reponse » vide).",
          },
        ],
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("L'analyse a été refusée par le modèle.");
  if (message.stop_reason === "max_tokens") throw new Error("Analyse trop longue : réessayez sur un périmètre plus petit.");
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Réponse de l'analyse illisible.");
  return sanitize(parsed.data, facts);
}

/** Réponse de démonstration (tests sans clé) : reprend les faits sans rien inventer. */
function mock(facts: Facts, question?: string): z.infer<typeof schema> {
  const b = facts.immeubles[0];
  const loan = facts.credits[0];
  return {
    synthese: `Analyse de démonstration du périmètre « ${facts.perimetre.nom} » : ${facts.totaux.lots} lots, cash-flow mensuel ${facts.totaux.cashflowLocatifMensuel ?? "inconnu"} €.`,
    sante: { niveau: "correct", explication: `Dette bancaire ${facts.totaux.detteBancaire ?? "inconnue"} €.` },
    forces: ["Données issues du moteur de l'application."],
    risques: [{ titre: "Données à compléter", detail: `${facts.donneesManquantes.length} élément(s) manquant(s).`, gravite: "moyenne", cible: { type: "global", id: "" } }],
    pistes: [
      ...(b ? [{ titre: `Étudier la vente de ${b.nom}`, pourquoi: "Test.", impact: "à estimer", horizon: "moyen" as const, type: "vente" as const, cible: { type: "immeuble" as const, id: b.id }, simulation: { action: "vente" as const, annee: Number(facts.date) + 2, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] }, aValider: "Agent immobilier, notaire." }] : []),
      ...(loan ? [{ titre: "Renégocier un crédit", pourquoi: "Test.", impact: "à estimer", horizon: "court" as const, type: "refinancement" as const, cible: { type: "credit" as const, id: loan.id }, simulation: { action: "refinancement" as const, annee: Number(facts.date) + 1, montant: 0, tauxPct: 0, dureeAns: 20, creditIds: [loan.id, "inconnu"] }, aValider: "Banque." }] : []),
      { titre: "Cible inventée", pourquoi: "Test.", impact: "à estimer", horizon: "long", type: "autre", cible: { type: "immeuble", id: "n-existe-pas" }, simulation: { action: "aucune", annee: 0, montant: 0, tauxPct: 0, dureeAns: 0, creditIds: [] }, aValider: "" },
    ],
    aCompleter: facts.donneesManquantes.slice(0, 3),
    reponse: question ? `Réponse de démonstration à : ${question}` : "",
  };
}
