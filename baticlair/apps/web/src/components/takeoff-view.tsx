"use client";

import type { Origin, ProofCriterion, TakeoffDecision, TakeoffViewItem } from "@/lib/api";

/** « Voir le calcul » d'une ligne de la liste, et les gestes de l'artisan sur la liste (DecisionHandlers). */

const ORIGIN_LABEL: Record<Origin, string> = {
  devis: "lu dans le devis",
  referential: "donnée vérifiée BatiClair",
  company: "habitude de ton entreprise",
  project: "choisi pour ce chantier",
  assumption: "hypothèse, modifiable",
};

const CRITERION_LABEL: Record<ProofCriterion["key"], string> = {
  reading: "Lecture du devis",
  work_item: "Article",
  product: "Produit",
  manufacturer_data: "Donnée fabricant",
  rule: "Règle de calcul",
  site_data: "Chantier",
  consistency: "Cohérence",
  packaging: "Conditionnement",
};

export interface DecisionHandlers {
  onDecide: (d: TakeoffDecision) => Promise<void>;
  /** « Tout est bon » : plusieurs lignes qui n'attendent qu'une confirmation, en un envoi. */
  onDecideMany?: (ds: readonly TakeoffDecision[]) => Promise<void>;
  onAnswer: (key: string, value: string | { value: string; unit: string } | null) => Promise<void>;
  onSaveLine: (lineId: string, fields: { designation: string; quantity: string | null; unit: string | null; reference: string | null }) => Promise<void>;
  onDeleteLine: (lineId: string) => Promise<void>;
}

/** « Voir le calcul » : la preuve, seulement si l'artisan la demande. */
export function Proof({ item }: { item: TakeoffViewItem }) {
  if (item.calculation) {
    return (
      <ul className="flex flex-col gap-1 rounded-2xl bg-ground p-3 text-sm">
        {item.calculation.trace.map((t, i) => (
          <li key={i}>
            <strong>{t.label}</strong> : {t.value} {t.unit} <span className="text-muted">— {t.from}{t.origin ? ` (${ORIGIN_LABEL[t.origin]})` : ""}</span>
            {t.url ? (
              <>
                {" "}
                <a href={t.url} target="_blank" rel="noreferrer" className="font-bold text-accent-text">
                  source
                </a>
              </>
            ) : null}
          </li>
        ))}
        {item.proof
          .filter((p) => p.key === "packaging")
          .map((p, i) => (
            <li key={`p${i}`}>
              <strong>Quantité de vente</strong> : {p.detail}
              {p.comparisonRisk ? <span className="text-muted"> — à surveiller en comparant les offres</span> : null}
            </li>
          ))}
        {item.calculation.exclusions ? <li className="text-muted">Non compté : {item.calculation.exclusions}</li> : null}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-1 rounded-2xl bg-ground p-3 text-sm">
      {item.proof
        .filter((p) => p.key !== "consistency" || p.status !== "established")
        .map((p, i) => (
          <li key={i}>
            <strong>{CRITERION_LABEL[p.key]}</strong> : {p.detail}
            {p.origin ? <span className="text-muted"> ({ORIGIN_LABEL[p.origin]})</span> : null}
            {p.status === "no_effect" ? <span className="text-muted"> — sans effet sur la liste</span> : null}
            {p.status === "supplier" && p.comparisonRisk ? <span className="text-muted"> — à surveiller en comparant les offres</span> : null}
          </li>
        ))}
    </ul>
  );
}
