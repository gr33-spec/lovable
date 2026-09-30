import { Decimal } from "../shared/decimal.js";

/**
 * Grille de prix des modèles d'IA, **datée et versionnée**.
 *
 * Chaque exécution enregistre la version de grille utilisée : quand un tarif
 * change, on ajoute une nouvelle grille (on ne modifie jamais une grille
 * publiée), et les coûts passés restent exacts.
 *
 * Prix en dollars US par million de tokens, tels que publiés par le
 * fournisseur. Source : https://platform.claude.com/docs/en/about-claude/pricing
 * (consultée le 2026-09-30).
 */
export interface ModelPrice {
  /** Entrée non mise en cache. */
  inputPerMTok: string;
  /** Sortie (y compris la réflexion interne facturée). */
  outputPerMTok: string;
  /** Écriture de cache 5 minutes. */
  cacheWrite5mPerMTok: string;
  /** Écriture de cache 1 heure. */
  cacheWrite1hPerMTok: string;
  /** Lecture de cache. */
  cacheReadPerMTok: string;
}

export interface PriceTable {
  /** Identifiant stable, enregistré avec chaque exécution. */
  version: string;
  /** Date (UTC) à partir de laquelle la grille s'applique. */
  effectiveFrom: string;
  currency: "USD";
  source: string;
  /** Tarifs par identifiant exact de modèle. */
  models: Readonly<Record<string, ModelPrice>>;
  /** Réduction du traitement différé (Batch API) : 0.5 = moitié prix. */
  batchMultiplier: string;
}

export const PRICE_TABLES: readonly PriceTable[] = [
  {
    version: "anthropic-2026-09-30",
    effectiveFrom: "2026-09-30",
    currency: "USD",
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
    batchMultiplier: "0.5",
    models: {
      "claude-haiku-4-5": {
        inputPerMTok: "1",
        outputPerMTok: "5",
        cacheWrite5mPerMTok: "1.25",
        cacheWrite1hPerMTok: "2",
        cacheReadPerMTok: "0.10",
      },
      "claude-sonnet-5-5": {
        inputPerMTok: "2",
        outputPerMTok: "10",
        cacheWrite5mPerMTok: "2.50",
        cacheWrite1hPerMTok: "4",
        cacheReadPerMTok: "0.20",
      },
      "claude-opus-5-5": {
        inputPerMTok: "4",
        outputPerMTok: "20",
        cacheWrite5mPerMTok: "5",
        cacheWrite1hPerMTok: "8",
        cacheReadPerMTok: "0.20",
      },
    },
  },
];

export class UnknownModelPriceError extends Error {
  constructor(model: string, version: string) {
    super(`Aucun tarif pour le modèle « ${model} » dans la grille ${version}`);
    this.name = "UnknownModelPriceError";
  }
}

/** Grille en vigueur à une date donnée (la plus récente dont la date d'effet est passée). */
export function priceTableAt(at: Date, tables: readonly PriceTable[] = PRICE_TABLES): PriceTable {
  const day = at.toISOString().slice(0, 10);
  const applicable = tables
    .filter((t) => t.effectiveFrom <= day)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  // Avant la première grille : on applique la plus ancienne plutôt que rien.
  const table = applicable[0] ?? [...tables].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))[0];
  if (!table) throw new RangeError("Aucune grille de prix définie");
  return table;
}

export function priceTableByVersion(version: string, tables: readonly PriceTable[] = PRICE_TABLES): PriceTable {
  const table = tables.find((t) => t.version === version);
  if (!table) throw new RangeError(`Grille de prix inconnue : ${version}`);
  return table;
}

/** Consommation d'un appel, telle que renvoyée par le fournisseur. */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWrite5mTokens?: number;
  cacheWrite1hTokens?: number;
  batch?: boolean;
}

export interface AiCost {
  priceTableVersion: string;
  /** Coût total en micro-dollars (1 $ = 1 000 000), arrondi à l'unité supérieure. */
  totalMicroUsd: number;
  inputMicroUsd: Decimal;
  outputMicroUsd: Decimal;
  cacheMicroUsd: Decimal;
}

function checkTokens(label: string, n: number | undefined): number {
  const v = n ?? 0;
  if (!Number.isInteger(v) || v < 0) throw new RangeError(`${label} invalide : ${n}`);
  return v;
}

/**
 * Coût d'un appel, calculé en décimal exact. Le total est arrondi au
 * micro-dollar supérieur : on ne sous-estime jamais un coût.
 */
export function computeAiCost(model: string, usage: AiUsage, table: PriceTable): AiCost {
  const price = table.models[model];
  if (!price) throw new UnknownModelPriceError(model, table.version);
  const input = checkTokens("inputTokens", usage.inputTokens);
  const output = checkTokens("outputTokens", usage.outputTokens);
  const cacheRead = checkTokens("cacheReadTokens", usage.cacheReadTokens);
  const cacheW5 = checkTokens("cacheWrite5mTokens", usage.cacheWrite5mTokens);
  const cacheW1 = checkTokens("cacheWrite1hTokens", usage.cacheWrite1hTokens);

  // $/MTok × tokens = micro-dollars (les millions se simplifient).
  const multiplier = new Decimal(usage.batch ? table.batchMultiplier : "1");
  const inputMicroUsd = new Decimal(price.inputPerMTok).times(input).times(multiplier);
  const outputMicroUsd = new Decimal(price.outputPerMTok).times(output).times(multiplier);
  const cacheMicroUsd = new Decimal(price.cacheReadPerMTok)
    .times(cacheRead)
    .plus(new Decimal(price.cacheWrite5mPerMTok).times(cacheW5))
    .plus(new Decimal(price.cacheWrite1hPerMTok).times(cacheW1))
    .times(multiplier);

  const total = inputMicroUsd.plus(outputMicroUsd).plus(cacheMicroUsd).toDecimalPlaces(0, Decimal.ROUND_CEIL);
  return {
    priceTableVersion: table.version,
    totalMicroUsd: total.toNumber(),
    inputMicroUsd,
    outputMicroUsd,
    cacheMicroUsd,
  };
}

/** Conversion d'affichage en euros (taux fourni par la configuration, jamais codé en dur). */
export function microUsdToEur(microUsd: number | bigint, usdToEurRate: string): Decimal {
  return new Decimal(microUsd.toString()).dividedBy(1_000_000).times(usdToEurRate);
}
