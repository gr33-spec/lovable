"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Check, CheckCheck, ChevronRight, FileSignature, Landmark, Trash2, TrendingUp, TriangleAlert, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { RentPayment, Unit } from "@/lib/types";
import { LEASE_TYPES, REVISIONS } from "@/lib/labels";
import { dateFr, eur, eurCompact } from "@/lib/format";
import {
  LEASE_END_NOTICE_MONTHS,
  leaseInfo,
  monthKey,
  monthKeyLabel,
  outstanding,
  shiftMonthKey,
  todayIso,
  type Reminder,
} from "@/lib/engine/leases";
import { RevisionSheet, revisionLetterUrl } from "./gestion/revision";
import { openDocument } from "./pdf-viewer";
import { upToDate } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { SwipeRow, useDismiss, useUndoableUpdate, type SwipeAction } from "./swipe";
import { settleUnpaid, skipRevision } from "@/lib/revision";
import { DateField, Details, Grid2, IconChip, NumberField, SelectField, TextField, cx, type ChipTone } from "./ui";

// ——— Bail d'un logement ———

export function LeaseSection({ unit }: { unit: Unit }) {
  const { data, upsert } = useStore();
  const tenancyId = data.tenancies.find((t) => t.unitId === unit.id && t.status === "actif")?.id;
  const set = (patch: Partial<Unit>) => upsert("units", { ...unit, ...patch });
  const today = todayIso();
  const info = leaseInfo(unit, today);
  return (
    <Details title="Bail et révision" defaultOpen={!!unit.leaseStart || !!unit.leaseEnd}>
      <SelectField label="Type de bail" value={unit.leaseType} options={LEASE_TYPES} onChange={(v) => set({ leaseType: v })} />
      <Grid2>
        <DateField label="Début du bail" value={unit.leaseStart} onChange={(v) => set({ leaseStart: v })} />
        <NumberField
          label="Durée"
          suffix="ans"
          value={unit.leaseDurationYears}
          onChange={(v) => set({ leaseDurationYears: v })}
          placeholder="Ex. 6"
        />
      </Grid2>
      <DateField
        label="Date de fin (si connue)"
        value={unit.leaseEnd}
        onChange={(v) => set({ leaseEnd: v })}
        hint="Sinon calculée : début + durée, reconduite pour la même durée."
      />
      <div className="rounded-2xl bg-soft px-4 py-3 text-[13px] text-ink-2">
        {info.end ? (
          <>
            <div>
              {info.expired ? "Échéance dépassée : " : "Prochaine échéance : "}
              <b className="text-ink">{dateFr(info.end)}</b>
            </div>
            {!info.expired && (
              <div>
                Rappel {LEASE_END_NOTICE_MONTHS} mois avant : <b className="text-ink">{dateFr(info.noticeDate)}</b>
              </div>
            )}
          </>
        ) : (
          <div>Renseignez le début et la durée (ou la date de fin) pour être prévenu {LEASE_END_NOTICE_MONTHS} mois avant l&apos;échéance.</div>
        )}
        {info.nextRevision && (
          <div>
            {info.nextRevision < today ? "Révision non faite depuis le " : "Prochaine révision du loyer : "}
            <b className="text-ink">{dateFr(info.nextRevision)}</b>
            {info.revisionDeadline && info.nextRevision < today && (
              <>
                {" "}— à demander avant le <b className="text-ink">{dateFr(info.revisionDeadline)}</b>, sans effet rétroactif
              </>
            )}
          </div>
        )}
      </div>
      <SelectField
        label="Révision du loyer"
        value={unit.revision ?? "annuelle"}
        options={REVISIONS}
        allowEmpty={false}
        onChange={(v) => set({ revision: v })}
        hint="À la date anniversaire du bail."
      />
      <Grid2>
        <TextField label="Indice de référence" value={unit.indexLabel} placeholder="Ex. IRL T2 2025" onChange={(v) => set({ indexLabel: v })} />
        <NumberField label="Valeur de l'indice" suffix="" value={unit.indexValue} onChange={(v) => set({ indexValue: v })} placeholder="Ex. 145,77" />
      </Grid2>
      <RevisionTool unit={unit} />
      {(unit.rentHistory?.length ?? 0) > 0 && (
        <div>
          <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Historique du loyer</div>
          <div className="divide-y divide-line rounded-2xl border border-line px-4">
            {[...unit.rentHistory!].reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-[13px]">
                <div>
                  <div className="font-medium text-ink">{dateFr(h.date)}</div>
                  <div className="text-muted">{[h.indexLabel, h.note].filter(Boolean).join(" · ") || "Révision"}</div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const url = h.previousRent && h.referenceValue && h.indexValue
                      ? revisionLetterUrl({ tenancyId, due: h.dueDate ?? h.date, effective: h.date, rent: h.previousRent, charges: unit.charges, reference: { label: h.referenceLabel ?? "", value: h.referenceValue }, index: { label: h.indexLabel ?? "", value: h.indexValue } })
                      : undefined;
                    return url ? (
                      <button type="button" onClick={() => openDocument(url)} className="rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-navy">
                        Courrier
                      </button>
                    ) : null;
                  })()}
                  <div className="tabular text-right">
                    <div className="font-semibold text-ink">{eur(h.rent)}</div>
                    {h.previousRent ? <div className="text-muted">avant {eur(h.previousRent)}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Details>
  );
}

function RevisionTool({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-series-1">
        <TrendingUp size={16} /> Réviser le loyer
      </button>
      <RevisionSheet unit={unit} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ——— Encaissements d'un logement (12 derniers mois) ———

export function PaymentStrip({ unit }: { unit: Unit }) {
  const { data, upsert } = useStore();
  const current = monthKey(todayIso());
  const months = Array.from({ length: 12 }, (_, i) => shiftMonthKey(current, i - 11));
  const unpaid = Object.values(unit.payments ?? {}).reduce((s, p) => s + outstanding(p), 0);
  // Locataire à jour : tous les mois non pointés depuis son entrée passent à « payé » (annulable).
  const markUpToDate = () => {
    const r = upToDate(data, unit, todayIso());
    if (!r.months.length) {
      toast("Tous les mois depuis l'entrée sont déjà pointés.");
      return;
    }
    upsert("units", { ...unit, payments: r.payments });
    toast(`À jour : ${r.months.length} mois marqués payés depuis ${monthKeyLabel(r.months[0])}`, () => upsert("units", unit));
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1 text-[13px] font-medium text-ink-2">
        <span>Encaissements (12 mois)</span>
        <span className="flex items-center gap-3">
          {unit.status !== "vacant" && (
            <button onClick={markUpToDate} className="flex items-center gap-1 rounded-full bg-pos/10 px-2.5 py-1 font-semibold text-pos">
              <CheckCheck size={14} /> À jour
            </button>
          )}
          <Link href={`/gestion?vue=loyers&mois=${current}`} className="font-semibold text-series-1">
            Pointer
          </Link>
        </span>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {months.map((k) => {
          const p = unit.payments?.[k];
          return (
            <div key={k} className="text-center">
              <div
                title={`${monthKeyLabel(k)} : ${p ? STATUS_LABEL[p.status] : "non pointé"}`}
                className={cx("h-6 rounded-md", p?.status === "paye" ? "bg-pos" : p?.status === "impaye" ? "bg-neg" : p?.status === "partiel" ? "bg-warn" : "bg-black/[0.06]")}
              />
              <div className="mt-0.5 text-[9px] text-muted">{monthKeyLabel(k).slice(0, 1).toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      {unpaid > 0 && <div className="mt-2 text-[13px] font-semibold text-neg">Impayé cumulé : {eur(unpaid)}</div>}
    </div>
  );
}

export const STATUS_LABEL: Record<RentPayment["status"], string> = {
  paye: "Payé",
  impaye: "Impayé",
  partiel: "Partiel",
};

// ——— Rappels ———

const REMINDER_STYLE: Record<Reminder["kind"], { icon: React.ReactNode; tone: ChipTone }> = {
  lease_end: { icon: <FileSignature size={18} />, tone: "violet" },
  revision: { icon: <TrendingUp size={18} />, tone: "blue" },
  loan_end: { icon: <Landmark size={18} />, tone: "green" },
  unpaid: { icon: <TriangleAlert size={18} />, tone: "rose" },
  deposit: { icon: <Landmark size={18} />, tone: "gold" },
};

/**
 * Rappel : un appui ouvre l'action (révision, fiche du logement…) ; un
 * balayage vers la gauche propose de l'ignorer ou de le régler directement.
 */
export function ReminderRow({ r, dismissable = r.kind !== "unpaid" && r.kind !== "deposit" }: { r: Reminder; dismissable?: boolean }) {
  const { data } = useStore();
  const style = REMINDER_STYLE[r.kind];
  const dismiss = useDismiss();
  const update = useUndoableUpdate();
  const [revising, setRevising] = useState(false);
  const unit = r.unitId ? data.units.find((u) => u.id === r.unitId) : undefined;

  const actions: SwipeAction[] = [];
  if (r.kind === "revision" && unit) actions.push({ label: "Pas cette année", icon: <X size={18} />, tone: "warn", onAction: () => update("units", unit, skipRevision(unit, todayIso()), "Révision passée pour cette année") });
  if (r.kind === "unpaid" && unit) actions.push({ label: "Payé", icon: <Check size={18} />, tone: "pos", onAction: () => update("units", unit, settleUnpaid(unit), "Loyers marqués payés") });
  if (dismissable) actions.push({ label: "Ignorer", icon: <Trash2 size={18} />, tone: "neg", onAction: () => dismiss(r.id) });

  const content = (
    <>
      <IconChip tone={style.tone} size={38}>{style.icon}</IconChip>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{r.title}</span>
          {r.late && <span className="shrink-0 rounded-full bg-neg/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neg">En retard</span>}
        </div>
        <div className="line-clamp-2 text-[13px] text-muted">{r.detail}</div>
      </div>
      {(r.kind === "unpaid" || r.kind === "deposit") && r.amount ? (
        <span className="tabular shrink-0 text-[14px] font-bold text-neg">{eurCompact(r.amount)}</span>
      ) : r.kind === "loan_end" && r.amount ? (
        <span className="tabular shrink-0 text-[13px] font-bold text-pos">+{eurCompact(r.amount)}/m</span>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-muted/70" />
      )}
    </>
  );
  return (
    <>
    <SwipeRow actions={actions}>
      {r.kind === "revision" && unit ? (
        <button type="button" onClick={() => setRevising(true)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
          {content}
        </button>
      ) : (
        <Link href={r.href} className="flex items-center gap-3 py-3 active:opacity-60">
          {content}
        </Link>
      )}
    </SwipeRow>
    {r.kind === "revision" && unit && <RevisionSheet unit={unit} open={revising} onClose={() => setRevising(false)} />}
    </>
  );
}

export function RemindersCard({ items, limit = 3 }: { items: Reminder[]; limit?: number }) {
  if (items.length === 0) return null;
  return (
    <div className="soft-card mt-4 rounded-[26px] px-5 pb-2 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-bold text-navy">
          <BellRing size={17} className="text-gold" /> Rappels
          <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold text-white">{items.length}</span>
        </div>
        <Link href="/gestion?vue=afaire" className="text-sm font-medium text-series-1">
          Tout voir
        </Link>
      </div>
      <div className="divide-y divide-line">
        {groupReminders(items)
          .slice(0, limit)
          .map((g) => (g.items.length === 1 ? <ReminderRow key={g.items[0].id} r={g.items[0]} /> : <ReminderGroupRow key={g.kind} kind={g.kind} items={g.items} />))}
      </div>
    </div>
  );
}

const GROUP_LABEL: Record<Reminder["kind"], [string, string]> = {
  revision: ["révision de loyer", "révisions de loyer"],
  lease_end: ["fin de bail", "fins de bail"],
  loan_end: ["fin de crédit", "fins de crédit"],
  unpaid: ["loyer impayé", "loyers impayés"],
  deposit: ["dépôt à restituer", "dépôts à restituer"],
};

/** Rappels regroupés par nature, dans l'ordre d'apparition (le plus urgent d'abord). */
function groupReminders(items: Reminder[]): { kind: Reminder["kind"]; items: Reminder[] }[] {
  const groups: { kind: Reminder["kind"]; items: Reminder[] }[] = [];
  for (const r of items) {
    const g = groups.find((x) => x.kind === r.kind);
    if (g) g.items.push(r);
    else groups.push({ kind: r.kind, items: [r] });
  }
  return groups;
}

function ReminderGroupRow({ kind, items }: { kind: Reminder["kind"]; items: Reminder[] }) {
  const style = REMINDER_STYLE[kind];
  const late = items.filter((r) => r.late).length;
  const amount = items.reduce((s, r) => s + (r.amount ?? 0), 0);
  return (
    <Link href="/gestion?vue=afaire" className="flex items-center gap-3 py-3 active:opacity-60">
      <IconChip tone={style.tone} size={38}>{style.icon}</IconChip>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink">
          {items.length} {GROUP_LABEL[kind][1]}
        </div>
        <div className="truncate text-[13px] text-muted">
          {late > 0 ? <span className="font-semibold text-neg">{late} en retard</span> : "À venir"}
          {` · la plus proche : ${items[0].detail.split(" — ")[0]}`}
        </div>
      </div>
      {amount > 0 && (kind === "unpaid" || kind === "deposit") ? <span className="tabular shrink-0 text-[14px] font-bold text-neg">{eurCompact(amount)}</span> : <ChevronRight size={16} className="shrink-0 text-muted/70" />}
    </Link>
  );
}
