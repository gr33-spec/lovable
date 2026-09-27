"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Coins, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { RentPayment, Unit } from "@/lib/types";
import { eur, eurCompact } from "@/lib/format";
import { expectedMonthly, monthKey, monthKeyLabel, outstanding, paidAmount, shiftMonthKey, todayIso, unpaidByUnit } from "@/lib/engine/leases";
import { Button, Card, Empty, Grid2, NumberField, Page, PageHeader, SectionTitle, Segmented, Sheet, Stack, TextField, cx } from "@/components/ui";
import { STATUS_LABEL } from "@/components/leases";
import { DateField } from "@/components/ui";
import type { AppData } from "@/lib/types";
import { monthDue } from "@/lib/legal/receipts";

/** Bail couvrant le mois (le montant appelé est alors calculé au prorata des jours d'occupation). */
function tenancyForMonth(data: AppData, unit: Unit, month: string) {
  const first = `${month}-01`;
  const last = `${month}-31`;
  return data.tenancies.find(
    (t) => t.unitId === unit.id && t.status !== "brouillon" && (!t.startDate || t.startDate <= last) && (!t.endDate || t.endDate >= first),
  );
}

/** Montant attendu pour le mois, avec le détail loyer / charges. */
function dueFor(data: AppData, unit: Unit, month: string): Pick<RentPayment, "due" | "rent" | "charges" | "tenancyId"> {
  const t = tenancyForMonth(data, unit, month);
  if (!t) return { due: expectedMonthly(unit), rent: unit.rent, charges: unit.charges };
  const d = monthDue(t, month);
  return { due: d.total, rent: d.rent, charges: d.charges, tenancyId: t.id };
}

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
  const [open, setOpen] = useState<Set<string>>(() => new Set());

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
    expected += p?.due ?? dueFor(data, u, month).due ?? 0;
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
    else setPayment(unit, { ...dueFor(data, unit, month), ...p, status });
  };

  // Annule les « payé » du mois pour un immeuble (les impayés et paiements partiels sont conservés).
  const unpayAll = (list: Unit[]) => {
    for (const u of list) if (u.payments?.[month]?.status === "paye") setPayment(u, undefined);
  };

  const allPaid = (list: Unit[]) => {
    for (const u of list) if (!u.payments?.[month]) setPayment(u, { ...dueFor(data, u, month), status: "paye" });
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
          <div className="mt-5 space-y-3">
            {buildings.map(({ building, units: list }) => {
              const paidCount = list.filter((u) => u.payments?.[month]?.status === "paye").length;
              const pointed = list.filter((u) => u.payments?.[month]).length;
              const issues = list.filter((u) => ["impaye", "partiel"].includes(u.payments?.[month]?.status ?? "")).length;
              const allDone = paidCount === list.length;
              const exp = list.reduce((a, u) => a + (u.payments?.[month]?.due ?? dueFor(data, u, month).due ?? 0), 0);
              const got = list.reduce((a, u) => a + paidAmount(u.payments?.[month]), 0);
              const isOpen = open.has(building.id);
              return (
                <div key={building.id} className="soft-card overflow-hidden rounded-[24px]">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                      onClick={() => setOpen((cur) => { const next = new Set(cur); if (next.has(building.id)) next.delete(building.id); else next.add(building.id); return next; })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-bold text-navy">{building.name}</div>
                        <div className="text-[12.5px] text-muted">
                          <span className={cx("font-semibold", allDone ? "text-pos" : "text-ink-2")}>{paidCount}/{list.length} payés</span>
                          {issues > 0 && <span className="font-semibold text-neg"> · {issues} impayé{issues > 1 ? "s" : ""}</span>}
                          {pointed < list.length && <span> · {list.length - pointed} à pointer</span>}
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-soft">
                          <div className={cx("h-full rounded-full", allDone ? "bg-pos" : "bg-series-1")} style={{ width: `${exp > 0 ? Math.min(100, (got / exp) * 100) : 0}%` }} />
                        </div>
                        <div className="tabular mt-1 text-[11.5px] text-muted">{eur(got)} / {eur(exp)}</div>
                      </div>
                      <ChevronDown size={18} className={cx("shrink-0 text-muted transition", isOpen && "rotate-180")} />
                    </button>
                    <button
                      onClick={() => (allDone ? unpayAll(list) : allPaid(list))}
                      aria-label={allDone ? `Annuler « payé » pour ${building.name}` : `Tout marquer payé pour ${building.name}`}
                      className={cx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95",
                        allDone ? "bg-pos text-white shadow-sm" : "border-2 border-pos/40 text-pos",
                      )}
                    >
                      <CheckCheck size={20} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="divide-y divide-line border-t border-line px-5">
                      {list.map((u) => (
                        <PaymentRow key={u.id} unit={u} expected={dueFor(data, u, month).due ?? 0} payment={u.payments?.[month]} onToggle={(st) => toggle(u, st)} onOpen={() => setEditId(u.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-6 px-2 text-center text-xs text-muted">
          ✓✓ à droite d&apos;un immeuble : tout marquer payé (touchez à nouveau pour annuler). Ouvrez l&apos;immeuble pour pointer logement par logement ou saisir un paiement partiel.
        </p>
      </Page>

      <Sheet open={!!editing} onClose={() => setEditId(null)} title={editing ? `${editing.name} · ${monthKeyLabel(month)}` : ""} footer={<Button full onClick={() => setEditId(null)}>Terminé</Button>}>
        {editing && <PaymentEditor unit={editing} month={month} defaults={dueFor(data, editing, month)} onChange={(p) => setPayment(editing, p)} />}
      </Sheet>
    </>
  );
}

function PaymentRow({ unit, expected, payment, onToggle, onOpen }: { unit: Unit; expected: number; payment?: RentPayment; onToggle: (s: RentPayment["status"]) => void; onOpen: () => void }) {
  const tenant = [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  const due = payment?.due ?? expected;
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

function PaymentEditor({ unit, month, defaults, onChange }: { unit: Unit; month: string; defaults: Pick<RentPayment, "due" | "rent" | "charges" | "tenancyId">; onChange: (p: RentPayment | undefined) => void }) {
  const p = unit.payments?.[month];
  const due = p?.due ?? defaults.due ?? 0;
  const status = p?.status ?? "none";
  return (
    <Stack>
      <Segmented
        value={status}
        onChange={(s) => onChange(s === "none" ? undefined : { ...defaults, ...p, status: s, due })}
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
          <DateField label="Encaissé le" value={p.paidDate} onChange={(v) => onChange({ ...p, paidDate: v })} hint="Facultatif — repris sur la quittance." />
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
