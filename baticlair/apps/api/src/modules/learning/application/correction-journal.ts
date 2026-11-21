import { classifyCorrection, correctionPattern, type CorrectionAction, type CorrectionCause, type LineSnapshot } from "@baticlair/domain";
import type { TenantContext } from "../../tenancy/index.js";

/** Un geste de l'artisan sur une proposition de BatiClair, tel qu'il est journalisé. */
export interface CorrectionEntry {
  projectId: string | null;
  takeoffId: string | null;
  takeoffLineId: string | null;
  action: CorrectionAction;
  before: LineSnapshot | null;
  after: LineSnapshot | null;
  /** Lignes du devis citées : ce que contenait le document. */
  documentExcerpt: string[];
  /** Métier, section, version de la lecture IA et du référentiel. */
  context: Record<string, unknown>;
  reason?: string | null;
}

export interface CorrectionRecord extends CorrectionEntry {
  id: string;
  cause: CorrectionCause | null;
  patternKey: string;
  userId: string | null;
  createdAt: Date;
}

/**
 * Port : le journal. AJOUTER et LIRE seulement — aucune modification ni
 * suppression : une correction garde toujours son avant et son après.
 */
export interface CorrectionJournalStore {
  append(tenant: TenantContext, record: Omit<CorrectionRecord, "id" | "createdAt">): Promise<void>;
  /** Journal de l'entreprise active (jamais celui d'une autre). */
  list(tenant: TenantContext, filter?: { projectId?: string; takeoffLineId?: string }): Promise<CorrectionRecord[]>;
}

export const CORRECTION_JOURNAL_STORE = Symbol("CORRECTION_JOURNAL_STORE");

export class CorrectionJournal {
  constructor(private readonly store: CorrectionJournalStore) {}

  async record(tenant: TenantContext, entry: CorrectionEntry): Promise<void> {
    const input = { action: entry.action, before: entry.before, after: entry.after, reason: entry.reason ?? null };
    const cause = classifyCorrection(input);
    await this.store.append(tenant, { ...entry, reason: entry.reason ?? null, cause, patternKey: correctionPattern(input, cause), userId: tenant.userId });
  }

  list(tenant: TenantContext, filter?: { projectId?: string; takeoffLineId?: string }): Promise<CorrectionRecord[]> {
    return this.store.list(tenant, filter);
  }
}
