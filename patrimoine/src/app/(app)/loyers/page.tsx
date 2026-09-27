"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, CircleDashed, Coins, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { RentPayment, Unit } from "@/lib/types";
import { eur, eurCompact } from "@/lib/format";
import { expectedMonthly, monthKey, monthKeyLabel, outstanding, paidAmount, shiftMonthKey, todayIso, unpaidByUnit } from "@/lib/engine/leases";
import { Button, Card, Empty, Grid2, NumberField, Page, PageHeader, SectionTitle, Segmented, Sheet, Stack, TextField, cx } from "@/components/ui";
import { STATUS_LABEL } from "@/components/leases";

export default function LoyersPage() {
  return (
    <Suspense>
      <Loyers />
    </Suspense>
  );
}

function Loyers() {
  const { data, upsert } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const current = monthKey(todayIso());
  const param = params.get("mois");
  const month = param && /^\d{4}-\d{2}$/.test(param) ? param : current;
  const [editId, setEditId] = useState<string | null>(null);

  const go = (delta: number) => router.replace(`/loyers?mois=${shiftMonthKey(month, delta)}`, { scroll: false });

  // Logements concernés : occupés, ou déjà pointés pour ce mois.
  const units = data.units.filter((u) => u.status !== "vacant" || u.payments?.[month]);
  const buildings = data.buildings
    .map((b) => ({ building: b, units: units.filter((u) => u.buildingId === b.id) }))
    .filter((g) => g.units.length > 0);

  let expected = 0;
  let received = 0;
  let unpaidMonth = 0;
  let unpointed = 0;
  for (const u of units) {
    const p = u.payments?.[month];
    expected += p?.due ?? expectedMonthly(u);
    received += paidAmount(p);
    unpaidMonth += outstanding(p);
    if (!p) unpointed += 1;
  }
  const unpaid = unpaidByUnit(data.units);
  const unpaidTotal = unpaid.reduce((s, l) => s + l.amount, 0);

  const setPayment = (unit: Unit, payment: RentPayment | undefined) => {
    const payments = { ...(unit.payments ?? {}) };
    if (payment) payments[month] = payment;
    else delete payments[month];
    upsert("units", { ...unit, payments });
  };

  const toggle = (unit: Unit, status: RentPayment["status"]) => {
    const p = unit.payments?.[month];
    if (p?.status === status) setPayment(unit, undefined);
    else setPayment(unit, { ...p, status, due: p?.due ?? expectedMonthly(unit) });
  };

  const allPaid = (list: Unit[]) => {
    for (const u of list) if (!u.payments?.[month]) setPayment(u, { status: "paye", due: expectedMonthly(u) });
  };

  const editing = data.units.find((u) => u.id === editId);

  return (
    <>
      <PageHeader title="Loyers" subtitle="Pointage des encaissements" />
      <Page>
        <div className="soft-card flex items-center justify-between rounded-[22px] px-2 py-2">
          <button onClick={() => go(-1)} aria-label="Mois précédent" className="flex h-10 w-10 items-center justify-center rounded-full text-navy active:bg-black/5">
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <div className="text-[17px] font-bold capitalize text-navy">{monthKeyLabel(month)}</div>
            {month !== current && (
              <button onClick={() => router.replace(`/loyers?mois=${current}`, { scroll: false })} className="text-xs font-medium text-series-1">
                Revenir au mois en cours
              </button>
            )}
          </div>
          <button onClick={() => go(1)} aria-label="Mois suivant" className="flex h-10 w-10 items-center justify-center rounded-full text-navy active:bg-black/5">
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="hero-card mt-4 rounded-[28px] p-5 text-white">
          <div className="text-[13px] text-white/65">Encaissé ce mois</div>
          <div className="tabular text-[34px] font-extrabold leading-tight tracking-[-0.02em]">{eur(received)}</div>
          <div className="mt-1 text-[13px] text-white/60">sur {eur(expected)} attendus (loyers + charges)</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#d4b483] to-[#b08d57]" style={{ width: `${expected > 0 ? Math.min(100, (received / expected) * 100) : 0}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <div className="text-[12px] text-white/60">Impayé ce mois</div>
              <div className="tabular text-[18px] font-bold">{eur(unpaidMonth)}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <div className="text-[12px] text-white/60">À pointer</div>
              <div className="tabular text-[18px] font-bold">{unpointed} lot{unpointed > 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>

        {unpaid.length > 0 && (
          <>
            <SectionTitle action={<span className="tabular text-sm font-bold text-neg">{eur(unpaidTotal)}</span>}>Impayés cumulés</SectionTitle>
            <Card className="py-1">
              <div className="divide-y divide-line">
                {unpaid.map((l) => {
                  const b = data.buildings.find((x) => x.id === l.unit.buildingId);
                  const tenant = [l.unit.tenantFirstName, l.unit.tenantLastName].filter(Boolean).join(" ");
                  return (
                    <button key={l.unit.id} onClick={() => setEditId(l.unit.id)} className="flex w-full items-center gap-3 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium text-ink">{[b?.name, l.unit.name].filter(Boolean).join(" · ")}</div>
                        <div className="truncate text-[13px] text-muted">{[tenant, l.months.map(monthKeyLabel).join(", ")].filter(Boolean).join(" — ")}</div>
                      </div>
                      <span className="tabular text-[15px] font-bold text-neg">{eur(l.amount)}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {buildings.length === 0 ? (
          <Empty icon={<Coins size={26} />} title="Aucun logement loué" text="Détaillez les logements de vos immeubles pour pointer les loyers chaque mois." />
        ) : (
          buildings.map(({ building, units: list }) => {
            const left = list.filter((u) => !u.payments?.[month]).length;
            return (
              <div key={building.id}>
                <SectionTitle
                  action={
                    left > 0 ? (
                      <button onClick={() => allPaid(list)} className="text-sm font-semibold text-series-1">
                        Tout payé ({left})
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-pos">Pointé</span>
                    )
                  }
                >
                  {building.name}
                </SectionTitle>
                <Card className="py-1">
                  <div className="divide-y divide-line">
                    {list.map((u) => (
                      <PaymentRow key={u.id} unit={u} payment={u.payments?.[month]} onToggle={(s) => toggle(u, s)} onOpen={() => setEditId(u.id)} />
                    ))}
                  </div>
                </Card>
              </div>
            );
          })
        )}
        <p className="mt-6 px-2 text-center text-xs text-muted">
          Touchez ✓ ou ✗ pour pointer, touchez à nouveau pour annuler. Touchez le logement pour un paiement partiel.
        </p>
      </Page>

      <Sheet open={!!editing} onClose={() => setEditId(null)} title={editing ? `${editing.name} · ${monthKeyLabel(month)}` : ""} footer={<Button full onClick={() => setEditId(null)}>Terminé</Button>}>
        {editing && <PaymentEditor unit={editing} month={month} onChange={(p) => setPayment(editing, p)} />}
      </Sheet>
    </>
  );
}

function PaymentRow({ unit, payment, onToggle, onOpen }: { unit: Unit; payment?: RentPayment; onToggle: (s: RentPayment["status"]) => void; onOpen: () => void }) {
  const tenant = [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  const due = payment?.due ?? expectedMonthly(unit);
  return (
    <div className="flex items-center gap-3 py-3">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left active:opacity-60">
        <div className="truncate text-[15px] font-medium text-ink">
          {unit.name}
          {tenant && <span className="text-muted"> · {tenant}</span>}
        </div>
        <div className="tabular text-[13px] text-muted">
          {due > 0 ? eur(due) : "Loyer non renseigné"}
          {payment?.status === "partiel" && <span className="font-semibold text-warn"> · reçu {eur(payment.paid)}</span>}
          {payment?.note && <span> · {payment.note}</span>}
        </div>
      </button>
      {payment?.status === "partiel" ? (
        <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-bold text-warn">Partiel</span>
      ) : null}
      <button
        onClick={() => onToggle("impaye")}
        aria-label="Impayé"
        className={cx("flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95", payment?.status === "impaye" ? "bg-neg text-white" : "bg-soft text-muted")}
      >
        <X size={18} />
      </button>
      <button
        onClick={() => onToggle("paye")}
        aria-label="Payé"
        className={cx("flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95", payment?.status === "paye" ? "bg-pos text-white" : "bg-soft text-muted")}
      >
        <Check size={18} />
      </button>
    </div>
  );
}

function PaymentEditor({ unit, month, onChange }: { unit: Unit; month: string; onChange: (p: RentPayment | undefined) => void }) {
  const p = unit.payments?.[month];
  const due = p?.due ?? expectedMonthly(unit);
  const status = p?.status ?? "none";
  return (
    <Stack>
      <Segmented
        value={status}
        onChange={(s) => onChange(s === "none" ? undefined : { ...p, status: s, due })}
        options={[
          { value: "none", label: "Non pointé" },
          { value: "paye", label: STATUS_LABEL.paye },
          { value: "partiel", label: STATUS_LABEL.partiel },
          { value: "impaye", label: STATUS_LABEL.impaye },
        ]}
      />
      {p && (
        <>
          <Grid2>
            <NumberField label="Montant attendu" value={p.due} onChange={(v) => onChange({ ...p, due: v })} />
            {p.status === "partiel" && <NumberField label="Montant reçu" value={p.paid} onChange={(v) => onChange({ ...p, paid: v })} />}
          </Grid2>
          {outstanding(p) > 0 && <div className="rounded-2xl bg-neg/10 px-4 py-3 text-sm font-semibold text-neg">Reste dû : {eur(outstanding(p))}</div>}
          <TextField label="Note" value={p.note} placeholder="Ex. relance envoyée le…" onChange={(v) => onChange({ ...p, note: v })} />
        </>
      )}
      {!p && (
        <div className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 text-sm text-ink-2">
          <CircleDashed size={16} /> Attendu : {eurCompact(due)} (loyer + charges)
        </div>
      )}
    </Stack>
  );
}
