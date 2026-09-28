"use client";

import { useMemo, useState } from "react";
import { Check, CheckCheck, CheckCircle2, ChevronRight, Coins, TrendingUp, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { dateFr, eur, eurCents } from "@/lib/format";
import { monthKey, monthKeyLabel, paidAmount, shiftMonthKey, todayIso, unpaidByUnit } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { revisionsDue, settleUnpaid, skipRevision, type RevisionPlan } from "@/lib/revision";
import { SwipeRow, toast, useUndoableUpdate } from "@/components/swipe";
import { useIrlSeries } from "@/lib/use-irl";
import { ReminderRow } from "@/components/leases";
import { Button, Card, SectionTitle, Sheet, cx } from "@/components/ui";
import { dueFor } from "./rents";
import { RevisionSheet } from "./revision";
import { TaskRow, managementTasks } from "./tenants";

// Vue « À faire » : tout ce qui demande une action, du plus courant au plus
// rare, avec l'action directement sur place.

const OTHER = new Set(["lease_end", "deposit"]);

export function useTodoCount(): number {
  const { data, projection } = useStore();
  const irl = useIrlSeries();
  return useMemo(() => {
    const today = todayIso();
    const others = allReminders(data, today, projection.snapshot.resolvedLoans).filter((r) => OTHER.has(r.kind)).length;
    return revisionsDue(data, irl, today).length + managementTasks(data).length + others + unpaidByUnit(data.units).length;
  }, [data, projection, irl]);
}

export function TodayView({ onOpen }: { onOpen: (view: "loyers" | "locataires", month?: string) => void }) {
  const { data, projection, upsertMany } = useStore();
  const update = useUndoableUpdate();
  const irl = useIrlSeries();
  const today = todayIso();
  const month = monthKey(today);
  const [confirm, setConfirm] = useState(false);
  const [revising, setRevising] = useState<string | null>(null);
  const [allRevisions, setAllRevisions] = useState(false);

  const rented = data.units.filter((u) => u.status !== "vacant");
  const unpointed = rented.filter((u) => !u.payments?.[month]);
  const previous = shiftMonthKey(month, -1);
  // Mois précédent incomplet (seulement si le pointage est utilisé).
  const pointing = data.units.some((u) => u.payments?.[previous]);
  const unpointedBefore = pointing ? rented.filter((u) => !u.payments?.[previous] && (!u.leaseStart || u.leaseStart <= `${previous}-31`)).length : 0;
  let expected = 0;
  let received = 0;
  for (const u of rented) {
    const p = u.payments?.[month];
    expected += p?.due ?? dueFor(data, u, month).due ?? 0;
    received += paidAmount(p);
  }
  const unpaid = unpaidByUnit(data.units);
  const unpaidTotal = unpaid.reduce((s, l) => s + l.amount, 0);
  const revisions = revisionsDue(data, irl, today);
  const revisionGain = revisions.reduce((t, p) => t + (p.newRent !== undefined && p.rent !== undefined ? p.newRent - p.rent : 0), 0);
  const tasks = managementTasks(data);
  const others = allReminders(data, today, projection.snapshot.resolvedLoans).filter((r) => OTHER.has(r.kind));

  const markAllPaid = (list: Unit[]) => {
    upsertMany(list.map((u) => ({ coll: "units" as const, item: { ...u, payments: { ...(u.payments ?? {}), [month]: { ...dueFor(data, u, month), status: "paye" as const } } } })));
    toast(`${list.length} loyer${list.length > 1 ? "s" : ""} marqué${list.length > 1 ? "s" : ""} payé${list.length > 1 ? "s" : ""}`, () => {
      upsertMany(list.map((u) => ({ coll: "units" as const, item: u })));
    });
  };

  const nothing = revisions.length + tasks.length + others.length + unpaid.length === 0 && unpointed.length === 0;

  return (
    <div className="space-y-4">
      {/* Loyers du mois : pointage en un geste */}
      <div className="hero-card rounded-[28px] p-5 text-white">
        <div className="flex items-baseline justify-between">
          <div className="text-[13px] text-white/65">Loyers de {monthKeyLabel(month)}</div>
          <div className="tabular text-[13px] text-white/65">
            {rented.length - unpointed.length}/{rented.length} pointés
          </div>
        </div>
        <div className="tabular mt-0.5 text-[30px] font-extrabold leading-tight tracking-[-0.02em]">{eur(received)}</div>
        <div className="text-[13px] text-white/60">encaissés sur {eur(expected)}</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#d4b483] to-[#b08d57]" style={{ width: `${expected > 0 ? Math.min(100, (received / expected) * 100) : 0}%` }} />
        </div>
        {unpointed.length > 0 ? (
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => setConfirm(true)} className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-4 text-[15px] font-bold text-navy active:scale-[0.98]">
              <CheckCheck size={18} /> Tout est encaissé
            </button>
            <button onClick={() => onOpen("loyers")} className="min-h-[48px] rounded-2xl bg-white/10 px-4 text-[14px] font-semibold text-white ring-1 ring-white/15">
              Un par un
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-[#d4b483]">
            <CheckCircle2 size={17} /> Tous les loyers du mois sont pointés
          </div>
        )}
      </div>

      {unpointedBefore > 0 && (
        <button onClick={() => onOpen("loyers", previous)} className="soft-card flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warn/10 text-warn">
            <Coins size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold capitalize text-ink">{monthKeyLabel(previous)}</span>
            <span className="block text-[13px] text-muted">
              {unpointedBefore} loyer{unpointedBefore > 1 ? "s" : ""} non pointé{unpointedBefore > 1 ? "s" : ""}
            </span>
          </span>
          <ChevronRight size={16} className="text-muted/70" />
        </button>
      )}

      {unpaid.length > 0 && (
        <>
          <SectionTitle action={<span className="tabular text-sm font-bold text-neg">{eur(unpaidTotal)}</span>}>Impayés</SectionTitle>
          <Card className="py-1">
            <div className="divide-y divide-line">
              {unpaid.map((l) => (
                <SwipeRow key={l.unit.id} actions={[{ label: "Payé", icon: <Check size={18} />, tone: "pos", onAction: () => update("units", l.unit, settleUnpaid(l.unit), "Loyers marqués payés") }]}>
                  <button onClick={() => onOpen("loyers", l.months[l.months.length - 1])} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{[l.unit.name, [l.unit.tenantFirstName, l.unit.tenantLastName].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</span>
                      <span className="block truncate text-[13px] text-muted">
                        <span className="font-semibold text-neg">{l.months.map(monthKeyLabel).join(", ")}</span> · {data.buildings.find((b) => b.id === l.unit.buildingId)?.name}
                      </span>
                    </span>
                    <span className="tabular text-[15px] font-bold text-neg">{eur(l.amount)}</span>
                  </button>
                </SwipeRow>
              ))}
            </div>
          </Card>
        </>
      )}

      {revisions.length > 0 && (
        <>
          <SectionTitle action={revisionGain > 0 ? <span className="tabular text-sm font-bold text-pos">+{eurCents(revisionGain)}/mois</span> : undefined}>
            Révisions de loyer ({revisions.length})
          </SectionTitle>
          <Card className="py-1">
            <div className="divide-y divide-line">
              {(allRevisions ? revisions : revisions.slice(0, 5)).map((p) => (
                <SwipeRow key={p.unit.id} actions={[{ label: "Pas cette année", icon: <X size={18} />, tone: "warn", onAction: () => update("units", p.unit, skipRevision(p.unit, today), "Révision passée pour cette année") }]}>
                  <RevisionRow plan={p} onOpen={() => setRevising(p.unit.id)} />
                </SwipeRow>
              ))}
            </div>
            {revisions.length > 5 && (
              <button onClick={() => setAllRevisions((v) => !v)} className="w-full border-t border-line py-3 text-center text-[14px] font-semibold text-series-1">
                {allRevisions ? "Réduire" : `Voir les ${revisions.length - 5} autres`}
              </button>
            )}
          </Card>
          <p className="-mt-2 px-2 text-[12px] text-muted">Touchez un logement : l&apos;indice INSEE et le nouveau loyer sont calculés, le courrier au locataire est prêt.</p>
        </>
      )}

      {tasks.length > 0 && (
        <>
          <SectionTitle>Démarches en cours</SectionTitle>
          <Card className="py-1">
            <div className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </Card>
        </>
      )}

      {others.length > 0 && (
        <>
          <SectionTitle>Échéances</SectionTitle>
          <Card className="py-1">
            <div className="divide-y divide-line">
              {others.map((r) => (
                <ReminderRow key={r.id} r={r} />
              ))}
            </div>
          </Card>
        </>
      )}

      {!nothing && <p className="px-2 text-center text-[12px] text-muted">Balayez une ligne vers la gauche : marquer payé, passer une révision, ignorer ou supprimer. Chaque action peut être annulée.</p>}

      {nothing && (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 size={34} className="text-pos" />
            <div className="mt-2 text-[16px] font-semibold text-ink">Tout est à jour</div>
            <div className="text-sm text-muted">Aucune démarche en attente.</div>
          </div>
        </Card>
      )}

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Tout est encaissé ?"
        footer={
          <Button
            full
            onClick={() => {
              markAllPaid(unpointed);
              setConfirm(false);
            }}
          >
            Marquer {unpointed.length} loyer{unpointed.length > 1 ? "s" : ""} payé{unpointed.length > 1 ? "s" : ""}
          </Button>
        }
      >
        <p className="pb-2 text-[15px] text-ink-2">
          Les {unpointed.length} loyers de {monthKeyLabel(month)} pas encore pointés seront marqués payés ({eur(unpointed.reduce((s, u) => s + (dueFor(data, u, month).due ?? 0), 0))}). Les impayés déjà signalés ne changent pas. Vous pourrez corriger un logement dans « Loyers ».
        </p>
      </Sheet>
      <RevisionSheet unit={data.units.find((u) => u.id === revising)} open={!!revising} onClose={() => setRevising(null)} />
    </div>
  );
}


function RevisionRow({ plan, onOpen }: { plan: RevisionPlan; onOpen: () => void }) {
  const { data } = useStore();
  const tenant = plan.tenancy?.tenants.map((t) => t.lastName).filter(Boolean).join(", ") || plan.unit.tenantLastName;
  const gain = plan.newRent !== undefined && plan.rent !== undefined ? plan.newRent - plan.rent : undefined;
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", plan.late ? "bg-warn/10 text-warn" : "bg-series-1/10 text-series-1")}>
        <TrendingUp size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{[plan.unit.name, tenant].filter(Boolean).join(" · ")}</span>
        <span className="block truncate text-[13px] text-muted">
          <span className={cx(plan.late && "font-semibold text-warn")}>
            {plan.blocked ? "DPE F/G : pas de révision" : plan.late ? (plan.deadline ? `Avant le ${dateFr(plan.deadline)}` : "En retard") : `Le ${dateFr(plan.due)}`}
          </span>
          {` · ${data.buildings.find((b) => b.id === plan.unit.buildingId)?.name ?? ""}`}
        </span>
      </span>
      {gain !== undefined ? (
        <span className="tabular shrink-0 text-[14px] font-bold text-pos">+{eurCents(gain)}</span>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-muted/70" />
      )}
    </button>
  );
}
