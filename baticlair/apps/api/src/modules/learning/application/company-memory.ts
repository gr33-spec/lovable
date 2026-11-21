import {
  DEFAULT_PREFERENCE_POLICIES,
  disablePreference,
  normalizeText,
  enginePreferences,
  learnFromChoice,
  resolvePreference,
  setPreference,
  type CompanyPreference,
  type PreferenceKind,
  type PreferencePolicy,
} from "@baticlair/domain";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { CorrectionJournal } from "./correction-journal.js";

/** Port : la mémoire d'UNE entreprise (toutes les requêtes sont filtrées par l'entreprise active). */
export interface CompanyMemoryStore {
  list(tenant: TenantContext, filter?: { kind?: PreferenceKind; key?: string }): Promise<CompanyPreference[]>;
  /** Enregistre l'état complet d'un ensemble de préférences (création des nouvelles, mise à jour des autres). */
  save(tenant: TenantContext, preferences: CompanyPreference[]): Promise<void>;
}

export const COMPANY_MEMORY_STORE = Symbol("COMPANY_MEMORY_STORE");

/** Une clé s'écrit d'une seule façon (« Écran Maison » = « ecran maison ») : pas de doublon de préférence. */
const canonical = <T extends { key: string }>(x: T): T => ({ ...x, key: normalizeText(x.key) });

/**
 * « Votre entreprise utilise habituellement » : apprise des choix faits sur
 * les chantiers, ou réglée par l'artisan. Les règles (seuils, péremption,
 * prudence par type) sont celles du domaine ; les seuils sont des paramètres
 * de bêta (PD-045), passés ici pour pouvoir les changer sans toucher au code.
 */
export class CompanyMemory {
  constructor(
    private readonly store: CompanyMemoryStore,
    private readonly journal: CorrectionJournal,
    private readonly policies: Readonly<Record<PreferenceKind, PreferencePolicy>> = DEFAULT_PREFERENCE_POLICIES,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** L'artisan a fait un choix sur un chantier : il compte pour la mémoire de SON entreprise. */
  async recordChoice(tenant: TenantContext, raw: { kind: PreferenceKind; key: string; value: string; projectId: string }): Promise<void> {
    assertCanWrite(tenant);
    const choice = canonical(raw);
    const current = await this.store.list(tenant, { kind: choice.kind, key: choice.key });
    await this.store.save(tenant, learnFromChoice(current, { ...choice, at: this.clock().toISOString() }, this.policies));
  }

  /** « Désormais, c'est Y » : établi tout de suite, l'ancien choix gardé et marqué remplacé. */
  async set(tenant: TenantContext, raw: { kind: PreferenceKind; key: string; value: string; projectId: string | null }): Promise<void> {
    assertCanWrite(tenant);
    const pref = canonical(raw);
    const current = await this.store.list(tenant, { kind: pref.kind, key: pref.key });
    const before = await this.resolve(tenant, pref.kind, pref.key);
    await this.store.save(tenant, setPreference(current, { ...pref, at: this.clock().toISOString() }));
    await this.journal.record(tenant, {
      projectId: pref.projectId,
      takeoffId: null,
      takeoffLineId: null,
      action: "preference",
      before: before ? { designation: pref.key, quantity: null, unit: null, reference: before.value } : null,
      after: { designation: pref.key, quantity: null, unit: null, reference: pref.value },
      documentExcerpt: [],
      context: { kind: pref.kind },
    });
  }

  /** « Ne plus utiliser » : gardée dans l'historique, plus jamais appliquée. */
  async disable(tenant: TenantContext, raw: { kind: PreferenceKind; key: string }): Promise<void> {
    assertCanWrite(tenant);
    const target = canonical(raw);
    const current = await this.store.list(tenant, target);
    const before = await this.resolve(tenant, target.kind, target.key);
    await this.store.save(tenant, disablePreference(current, target));
    await this.journal.record(tenant, {
      projectId: null,
      takeoffId: null,
      takeoffLineId: null,
      action: "preference",
      before: before ? { designation: target.key, quantity: null, unit: null, reference: before.value } : null,
      after: null,
      documentExcerpt: [],
      context: { kind: target.kind, disabled: true },
    });
  }

  async resolve(tenant: TenantContext, kind: PreferenceKind, rawKey: string) {
    const key = normalizeText(rawKey);
    return resolvePreference(await this.store.list(tenant, { kind, key }), { kind, key }, this.clock(), this.policies);
  }

  /** Produits habituels (établis sans question, ou seulement proposés) et réponses d'habitude établies, prêts pour le moteur. */
  async forEngine(tenant: TenantContext) {
    return enginePreferences(await this.store.list(tenant), this.clock(), this.policies);
  }

  list(tenant: TenantContext): Promise<CompanyPreference[]> {
    return this.store.list(tenant);
  }
}
