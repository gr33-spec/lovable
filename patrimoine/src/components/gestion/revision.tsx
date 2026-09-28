"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Share, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { dateFr, eurCents as eur, pct } from "@/lib/format";
import { revisedRent, todayIso } from "@/lib/engine/leases";
import { revisionPlan, type RevisionPlan } from "@/lib/revision";
import { useIrlSeries } from "@/lib/use-irl";
import { tenantsName } from "@/lib/tenancy";
import { Button, Grid2, NumberField, Sheet, TextField, cx } from "@/components/ui";
import { documentUrl, sharePdf } from "@/components/tenancy/common";

// Révision du loyer en une étape : indices INSEE et nouveau loyer calculés,
// courrier au locataire prêt à envoyer. Seul un indice introuvable est à saisir.

export function useRevisionPlan(unit: Unit | undefined): RevisionPlan | undefined {
  const { data } = useStore();
  const irl = useIrlSeries();
  return unit ? revisionPlan(data, unit, irl, todayIso()) : undefined;
}

/** URL du courrier de révision (montants recalculés côté serveur). */
export function revisionLetterUrl(p: {
  tenancyId?: string;
  due: string;
  effective: string;
  rent?: number;
  charges?: number;
  reference?: { label: string; value: number };
  index?: { label: string; value: number };
}): string | undefined {
  if (!p.tenancyId || !p.rent || !p.reference || !p.index) return undefined;
  return documentUrl({
    type: "revision",
    tenancy: p.tenancyId,
    due: p.due,
    effective: p.effective,
    rent: p.rent,
    charges: p.charges,
    ref: p.reference.value,
    refLabel: p.reference.label,
    idx: p.index.value,
    idxLabel: p.index.label,
  });
}

export function RevisionSheet({ unit, open, onClose }: { unit: Unit | undefined; open: boolean; onClose: () => void }) {
  const plan = useRevisionPlan(unit);
  return (
    <Sheet open={open && !!unit} onClose={onClose} title="Révision du loyer">
      {plan ? <RevisionForm key={plan.unit.id} plan={plan} onClose={onClose} /> : <p className="pb-4 text-[15px] text-muted">Aucune révision prévue pour ce logement (date de début du bail à renseigner).</p>}
    </Sheet>
  );
}

function RevisionForm({ plan, onClose }: { plan: RevisionPlan; onClose: () => void }) {
  const { data, upsert } = useStore();
  const { unit } = plan;
  // Valeurs proposées (INSEE), modifiables. Tant que rien n'est saisi, on suit la proposition.
  const [refLabel, setRefLabel] = useState<string | undefined>();
  const [refValue, setRefValue] = useState<number | undefined>();
  const [idxLabel, setIdxLabel] = useState<string | undefined>();
  const [idxValue, setIdxValue] = useState<number | undefined>();
  // Une fois enregistrée, la révision suivante (l'an prochain) remplace le plan : on garde le résultat.
  const [done, setDone] = useState<{ url?: string; rent?: number; effective: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reference = { label: refLabel ?? plan.reference?.label ?? "", value: refValue ?? plan.reference?.value };
  const index = { label: idxLabel ?? plan.index?.label ?? "", value: idxValue ?? plan.index?.value };
  const newRent = revisedRent(plan.rent, reference.value, index.value);
  const auto = !!plan.index && idxValue === undefined && refValue === undefined;
  const tenant = plan.tenancy ? tenantsName(plan.tenancy) : [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  const building = data.buildings.find((b) => b.id === unit.buildingId);

  const record = (rent: number | undefined) => {
    const history = [...(unit.rentHistory ?? [])];
    if (rent !== undefined) {
      history.push({
        date: plan.effective,
        rent,
        previousRent: plan.rent,
        indexLabel: index.label || undefined,
        indexValue: index.value,
        referenceLabel: reference.label || undefined,
        referenceValue: reference.value,
        dueDate: plan.due,
      });
    }
    upsert("units", {
      ...unit,
      rent: rent ?? unit.rent,
      indexLabel: rent !== undefined ? index.label || unit.indexLabel : unit.indexLabel,
      indexValue: rent !== undefined ? index.value ?? unit.indexValue : unit.indexValue,
      // Révision faite (ou abandonnée) pour l'échéance prévue : prochaine l'an prochain.
      lastRevisionDate: plan.effective,
      rentHistory: history,
    });
    if (plan.tenancy && rent !== undefined) upsert("tenancies", { ...plan.tenancy, rent, indexLabel: index.label || plan.tenancy.indexLabel, indexValue: index.value ?? plan.tenancy.indexValue });
  };

  if (done) {
    return (
      <div className="space-y-4 pb-3">
        <div className="flex flex-col items-center py-3 text-center">
          <CheckCircle2 size={36} className="text-pos" />
          <div className="mt-2 text-[17px] font-bold text-ink">{done.rent !== undefined ? `Nouveau loyer : ${eur(done.rent)}` : "Révision passée pour cette année"}</div>
          {done.rent !== undefined && <div className="text-[13px] text-muted">À compter du {dateFr(done.effective)}. Les prochains loyers appelés en tiennent compte.</div>}
        </div>
        {done.url && (
          <div className="grid gap-2">
            <Button href={done.url} icon={<FileText size={18} />} full>
              Ouvrir le courrier au locataire
            </Button>
            <Button variant="secondary" icon={<Share size={18} />} full onClick={async () => setError(await sharePdf(done.url!, `revision-loyer-${done.effective.slice(0, 7)}.pdf`))}>
              Envoyer (Mail, Messages…)
            </Button>
          </div>
        )}
        {error && <p className="text-center text-xs text-neg">{error}</p>}
        <Button variant="ghost" full onClick={onClose}>
          Terminé
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-3">
      <div>
        <div className="text-[15px] font-semibold text-ink">{[building?.name, unit.name].filter(Boolean).join(" · ")}</div>
        <div className="text-[13px] text-muted">{tenant || "Locataire"}</div>
      </div>

      <div className={cx("rounded-2xl px-4 py-3 text-[13.5px]", plan.late ? "bg-warn/10 text-warn" : "bg-soft text-ink-2")}>
        {plan.late ? (
          <>
            Prévue le <b>{dateFr(plan.due)}</b>, pas encore faite. Elle s&apos;applique à partir d&apos;aujourd&apos;hui, sans rattrapage
            {plan.deadline ? <> ; à faire avant le <b>{dateFr(plan.deadline)}</b>, sinon elle est perdue pour cette année</> : null}.
          </>
        ) : (
          <>
            À appliquer le <b>{dateFr(plan.due)}</b>. Prévenez le locataire avant avec le courrier.
          </>
        )}
      </div>

      {plan.blocked ? (
        <div className="rounded-2xl bg-neg/10 px-4 py-3 text-[14px] text-neg">{plan.blocked}</div>
      ) : plan.commercial ? (
        <p className="text-[13.5px] text-ink-2">
          Bail commercial : la révision triennale se demande par lettre recommandée avec accusé de réception, sur l&apos;indice prévu au bail (ILC ou ILAT). Le nouveau loyer court à partir de la demande. Saisissez les indices pour calculer le montant.
        </p>
      ) : null}

      {!plan.blocked && (
        <>
          <div className="rounded-[22px] bg-navy px-5 py-4 text-white">
            <div className="text-[12.5px] text-white/65">Nouveau loyer hors charges</div>
            {newRent !== undefined ? (
              <>
                <div className="tabular text-[30px] font-extrabold leading-tight">{eur(newRent)}</div>
                <div className="tabular text-[13px] text-white/70">
                  au lieu de {eur(plan.rent)} · {newRent - (plan.rent ?? 0) >= 0 ? "+" : ""}
                  {eur(newRent - (plan.rent ?? 0))} par mois ({pct(((newRent / (plan.rent || 1)) - 1) * 100, 2)})
                </div>
              </>
            ) : (
              <div className="mt-1 text-[14px] text-white/80">{plan.rent ? "Saisissez l'indice pour calculer le nouveau loyer." : "Loyer actuel non renseigné."}</div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between px-1 text-[13px] font-medium text-ink-2">
              <span>Indices</span>
              {auto && <span className="text-[12px] font-semibold text-pos">Repris de l&apos;INSEE</span>}
            </div>
            <Grid2>
              <TextField label="Indice de référence" value={reference.label} placeholder="IRL T2 2025" onChange={setRefLabel} />
              <NumberField label="Valeur" suffix="" value={reference.value} onChange={setRefValue} placeholder="146,68" />
              <TextField label="Nouvel indice" value={index.label} placeholder="IRL T2 2026" onChange={setIdxLabel} />
              <NumberField label="Valeur" suffix="" value={index.value} onChange={setIdxValue} placeholder="148,37" />
            </Grid2>
            <p className="mt-1.5 px-1 text-[12px] text-muted">
              Même trimestre à un an d&apos;écart
              {plan.quarter ? ` (trimestre ${plan.quarter}${parseQuarterFromBail(unit) ? ", celui du bail" : ", dernier indice publié à la signature du bail"})` : ""}. Calcul : loyer × nouvel indice ÷ indice de référence.
            </p>
          </div>
        </>
      )}

      <div className="grid gap-2">
        {!plan.blocked && (
          <Button
            full
            icon={<TrendingUp size={18} />}
            disabled={newRent === undefined}
            onClick={() => {
              record(newRent);
              const url = plan.commercial
                ? undefined
                : revisionLetterUrl({ tenancyId: plan.tenancy?.id, due: plan.due, effective: plan.effective, rent: plan.rent, charges: plan.charges, reference: reference.value ? { label: reference.label, value: reference.value } : undefined, index: index.value ? { label: index.label, value: index.value } : undefined });
              setDone({ url, rent: newRent, effective: plan.effective });
            }}
          >
            {plan.commercial ? "Appliquer le nouveau loyer" : "Appliquer et préparer le courrier"}
          </Button>
        )}
        <Button
          variant="secondary"
          full
          onClick={() => {
            record(undefined);
            setDone({ effective: plan.effective });
          }}
        >
          Pas de révision cette année
        </Button>
      </div>
      {!plan.tenancy && !plan.commercial && !plan.blocked && <p className="text-center text-[12px] text-muted">Courrier indisponible : aucun bail enregistré pour ce logement.</p>}
    </div>
  );
}

function parseQuarterFromBail(unit: Unit): boolean {
  return /T\s?[1-4]\b|trimestre/i.test(unit.indexLabel ?? "");
}
