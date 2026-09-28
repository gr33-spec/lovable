"use client";

import { goBack } from "@/lib/nav";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Action, Scenario } from "@/lib/types";
import { compareScenario, totalWealth } from "@/lib/engine/scenario";
import { yearOf } from "@/lib/engine/dates";
import { eur, eurCompact, eurSigned } from "@/lib/format";
import { ACTION_ICONS, ACTION_LABELS, SIMULATION_TYPES, ActionForm, defaultAction } from "../action-form";
import { LineChart } from "../charts";
import { Button, Card, ConfirmDelete, Empty, Page, PageHeader, Pill, SectionTitle, Segmented, Sheet, TextField, cx } from "../ui";

type Metric = "wealth" | "treasury" | "debt" | "cashflow";

const METRICS: { value: Metric; label: string }[] = [
  { value: "wealth", label: "Patrimoine" },
  { value: "treasury", label: "Trésorerie" },
  { value: "debt", label: "Dette" },
  { value: "cashflow", label: "Cash-flow" },
];

export function ScenarioDetail({ id }: { id: string }) {
  const { data, projection, nowMonth, upsert, remove } = useStore();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [metric, setMetric] = useState<Metric>("wealth");
  const [applying, setApplying] = useState(false);
  const scenario = data.scenarios.find((s) => s.id === id);
  const cmp = useMemo(
    () => (scenario && scenario.actions.length ? compareScenario(data, nowMonth, scenario, projection) : null),
    [data, nowMonth, scenario, projection],
  );

  if (!scenario) {
    return (
      <>
        <PageHeader title="Scénario" back="/simulations" />
        <Empty title="Scénario introuvable" />
      </>
    );
  }
  const save = (patch: Partial<Scenario>) => upsert("scenarios", { ...scenario, ...patch });
  const setAction = (a: Action) => save({ actions: scenario.actions.map((x) => (x.id === a.id ? a : x)) });
  const y0 = yearOf(nowMonth);

  const apply = () => {
    for (const a of scenario.actions) upsert("plans", { ...a, id: newId() });
    save({ appliedAt: new Date().toISOString() });
    setApplying(false);
  };

  const value = (r: { net: number; treasury: number; debt: number; cashflow: number }) =>
    metric === "wealth" ? r.net + r.treasury : metric === "treasury" ? r.treasury : metric === "debt" ? r.debt : r.cashflow;

  return (
    <>
      <PageHeader title={scenario.name || "Scénario"} subtitle="Simulation — données réelles inchangées" back="/simulations" />
      <Page>
        <Card>
          <TextField label="Nom du scénario" value={scenario.name} onChange={(v) => save({ name: v ?? "" })} />
        </Card>

        <SectionTitle
          action={
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm font-semibold text-series-1">
              <Plus size={16} /> Opération
            </button>
          }
        >
          Opérations simulées
        </SectionTitle>
        <div className="space-y-3">
          {scenario.actions.map((a) => (
            <Card key={a.id}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-navy">{ACTION_ICONS[a.type]}</span>
                <div className="flex-1 text-[16px] font-semibold text-navy">{ACTION_LABELS[a.type]}</div>
                <button onClick={() => save({ actions: scenario.actions.filter((x) => x.id !== a.id) })} aria-label="Retirer l'opération" className="rounded-full p-2 text-muted active:bg-black/5">
                  <Trash2 size={18} />
                </button>
              </div>
              <ActionForm action={a} onChange={setAction} />
            </Card>
          ))}
          {scenario.actions.length === 0 && <Empty title="Aucune opération" text="Ajoutez une vente, un achat, des travaux…" />}
        </div>

        {cmp && (
          <>
            {cmp.sim.sales.map((s) => {
              const b = data.buildings.find((x) => x.id === s.buildingId);
              const cfDelta = -s.rentLostMonthly + s.paymentsRemovedMonthly + s.chargesRemovedAnnual / 12;
              return (
                <div key={s.actionId}>
                  <SectionTitle>Vente de {b?.name ?? "l'immeuble"} en {s.year}</SectionTitle>
                  <Card>
                    <Line label="Prix de vente" value={s.price !== undefined ? eur(s.price) : "Données insuffisantes"} />
                    <Line label="Dette remboursée (estimée)" value={`− ${eur(s.debtRepaid)}`} />
                    {s.fees > 0 && <Line label="Frais" value={`− ${eur(s.fees)}`} />}
                    {s.tax > 0 && <Line label="Impôt estimé" value={`− ${eur(s.tax)}`} />}
                    <div className="mt-2 flex items-end justify-between border-t border-line pt-3">
                      <span className="text-[15px] font-semibold text-ink">Trésorerie dégagée</span>
                      <span className={cx("tabular text-[22px] font-bold", (s.netCash ?? 0) >= 0 ? "text-pos" : "text-neg")}>
                        {s.netCash !== undefined ? eur(s.netCash) : "Données insuffisantes"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                      <Mini label="Loyers perdus" value={`− ${eur(s.rentLostMonthly)}/mois`} tone="neg" />
                      <Mini label="Mensualités supprimées" value={`+ ${eur(s.paymentsRemovedMonthly)}/mois`} tone="pos" />
                      <Mini label="Charges supprimées" value={`+ ${eur(s.chargesRemovedAnnual / 12)}/mois`} tone="pos" />
                      <Mini label="Effet sur le cash-flow" value={`${eurSigned(cfDelta)}/mois`} tone={cfDelta >= 0 ? "pos" : "neg"} />
                    </div>
                  </Card>
                </div>
              );
            })}

            <SectionTitle>Avant / après</SectionTitle>
            {projection.snapshot.total.unvalued > 0 && (
              <div className="mb-3 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">
                {projection.snapshot.total.unvalued} immeuble(s) sans valeur estimée : les lignes « Patrimoine » et « Valeur » sont incomplètes. Dette, loyers, cash-flow et trésorerie restent fiables.
              </div>
            )}
            <Card className="p-0">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                <span />
                <span className="w-[72px] text-right">Avant</span>
                <span className="w-[72px] text-right">Après</span>
              </div>
              {cmp.points.map((p) => (
                <div key={p.year} className="border-t border-line px-5 py-3">
                  <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-navy">
                    {p.year} {p.year === cmp.keyYear && <Pill tone="gold">année de l&apos;opération</Pill>}
                  </div>
                  <Compare label="Patrimoine total" a={totalWealth(p.before)} b={totalWealth(p.after)} />
                  <Compare label="Valeur des biens" a={p.before.value} b={p.after.value} />
                  <Compare label="Dette" a={p.before.debt} b={p.after.debt} invert />
                  <Compare label="Loyers/mois" a={p.before.rent / 12} b={p.after.rent / 12} />
                  <Compare label="Crédits/mois" a={p.before.payments / 12} b={p.after.payments / 12} invert />
                  <Compare label="Cash-flow/mois" a={p.before.cashflow / 12} b={p.after.cashflow / 12} />
                  <Compare label="Trésorerie" a={p.before.treasury} b={p.after.treasury} />
                </div>
              ))}
            </Card>

            <SectionTitle>Évolution comparée</SectionTitle>
            <Card>
              <Segmented value={metric} onChange={setMetric} options={METRICS} />
              <div className="mt-4">
                <LineChart
                  years={cmp.base.years.map((r) => r.year)}
                  area={false}
                  series={[
                    { label: "Sans le scénario", values: cmp.base.years.map((r) => value(r)), color: "var(--series-1)" },
                    { label: "Avec le scénario", values: cmp.sim.years.map((r) => value(r)), color: "var(--series-2)", dashed: true },
                  ]}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Patrimoine total = valeur des biens − dette + trésorerie cumulée (loyers, charges, crédits, travaux, opérations).
              </p>
            </Card>
          </>
        )}

        <div className="mt-8 space-y-3">
          {scenario.appliedAt ? (
            <div className="rounded-2xl bg-pos/10 px-4 py-3 text-sm text-pos">
              Intégré aux données réelles le {new Date(scenario.appliedAt).toLocaleDateString("fr-FR")}. Les opérations se retirent depuis l&apos;onglet Simulations.
            </div>
          ) : applying ? (
            <div className="rounded-2xl bg-gold/10 p-4">
              <div className="mb-3 text-sm text-ink">
                Les opérations de ce scénario seront prises en compte dans le tableau de bord, la chronologie et le dossier banque. Vos fiches (immeubles, crédits) ne sont pas modifiées.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setApplying(false)}>Annuler</Button>
                <Button onClick={apply}>Valider</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" full onClick={() => setApplying(true)} disabled={scenario.actions.length === 0}>
              Intégrer aux données réelles
            </Button>
          )}
          <ConfirmDelete label="Supprimer le scénario" message="Supprimer ce scénario ?" onConfirm={() => { remove("scenarios", id); goBack(router, "/simulations"); }} />
        </div>
      </Page>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ajouter une opération">
        <div className="space-y-2 pb-2">
          {SIMULATION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                save({ actions: [...scenario.actions, defaultAction(t, y0, data)] });
                setAdding(false);
              }}
              className="flex w-full items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-soft text-navy">{ACTION_ICONS[t]}</span>
              <span className="text-[16px] font-semibold text-ink">{ACTION_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[15px]">
      <span className="text-ink-2">{label}</span>
      <span className="tabular font-medium text-ink">{value}</span>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={cx("tabular font-semibold", tone === "pos" ? "text-pos" : "text-neg")}>{value}</div>
    </div>
  );
}

function Compare({ label, a, b, invert }: { label: string; a: number; b: number; invert?: boolean }) {
  const diff = b - a;
  const good = invert ? diff < 0 : diff > 0;
  const changed = Math.abs(diff) > 1;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 py-0.5 text-[13px]">
      <span className="truncate text-ink-2">{label}</span>
      <span className="tabular w-[72px] text-right text-ink-2">{eurCompact(a)}</span>
      <span className={cx("tabular w-[72px] text-right font-semibold", !changed ? "text-ink" : good ? "text-pos" : "text-neg")}>{eurCompact(b)}</span>
    </div>
  );
}
