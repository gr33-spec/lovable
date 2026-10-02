import { z } from "zod";

/**
 * Formules en mots d'artisan : un nombre de chantiers. Valeurs par défaut
 * ici ; elles se remplacent sans toucher au code par la variable
 * d'environnement BILLING_PLANS (même forme, en JSON).
 */
export const planSchema = z.object({
  key: z.string().min(1).max(30),
  label: z.string().min(1).max(40),
  /** Chantiers autorisés (null = sans limite). */
  projectLimit: z.number().int().positive().nullable(),
  /** « trial » : limite sur toute la durée de l'essai ; « month » : par mois calendaire. */
  period: z.enum(["trial", "month"]),
  /** Prix HT par mois (null pour l'essai). */
  priceEurMonth: z.number().nonnegative().nullable(),
  /** Proposée sur l'écran des formules. */
  offered: z.boolean().default(true),
});

export type Plan = z.infer<typeof planSchema>;

/**
 * Bêta (décision du fondateur, 2026-10-02) : l'essai n'a PAS de limite de
 * chantiers, pour tester avec de vrais devis. Le mécanisme de limite reste en
 * place et testé ; pour le rétablir : `projectLimit: 3` (ou BILLING_PLANS).
 */
export const DEFAULT_PLANS: Plan[] = [
  { key: "trial", label: "Essai gratuit", projectLimit: null, period: "trial", priceEurMonth: null, offered: false },
  { key: "solo", label: "Solo", projectLimit: 10, period: "month", priceEurMonth: 39, offered: true },
  { key: "pro", label: "Pro", projectLimit: 30, period: "month", priceEurMonth: 79, offered: true },
];

export const TRIAL_PLAN = "trial";

export function parsePlans(json: string | undefined): Plan[] {
  if (!json) return DEFAULT_PLANS;
  const plans = z.array(planSchema).min(1).parse(JSON.parse(json));
  if (!plans.some((p) => p.key === TRIAL_PLAN)) throw new Error(`BILLING_PLANS doit contenir la formule « ${TRIAL_PLAN} »`);
  return plans;
}

/** « CODE-SOLO:solo,CODE-PRO:pro » → { "CODE-SOLO": "solo", … } (activation manuelle en test). */
export function parseActivationCodes(raw: string | undefined): Record<string, string> {
  const codes: Record<string, string> = {};
  for (const pair of (raw ?? "").split(",")) {
    const [code, plan] = pair.split(":").map((x) => x.trim());
    if (code && plan) codes[code] = plan;
  }
  return codes;
}
