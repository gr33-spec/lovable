"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Check, ChevronRight, FileSignature, Landmark, TrendingUp, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import type { RentPayment, Unit } from "@/lib/types";
import { LEASE_TYPES, REVISIONS } from "@/lib/labels";
import { dateFr, eur, eurCompact, pct } from "@/lib/format";
import {
  LEASE_END_NOTICE_MONTHS,
  leaseInfo,
  monthKey,
  monthKeyLabel,
  outstanding,
  revisedRent,
  shiftMonthKey,
  todayIso,
  type Reminder,
} from "@/lib/engine/leases";
import { Button, DateField, Details, Grid2, IconChip, NumberField, SelectField, TextField, cx, type ChipTone } from "./ui";

// ——— Bail d'un logement ———

export function LeaseSection({ unit }: { unit: Unit }) {
  const { upsert } = useStore();
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
            Prochaine révision du loyer : <b className="text-ink">{dateFr(info.nextRevision)}</b>
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
      <RevisionTool unit={unit} nextRevision={info.nextRevision} />
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
                <div className="tabular text-right">
                  <div className="font-semibold text-ink">{eur(h.rent)}</div>
                  {h.previousRent ? <div className="text-muted">avant {eur(h.previousRent)}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Details>
  );
}

function RevisionTool({ unit, nextRevision }: { unit: Unit; nextRevision?: string }) {
  const { upsert } = useStore();
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState<string | undefined>();
  const [newValue, setNewValue] = useState<number | undefined>();
  const today = todayIso();
  const proposal = revisedRent(unit.rent, unit.indexValue, newValue);
  const date = nextRevision && nextRevision <= today ? nextRevision : today;

  const apply = (rent: number | undefined, note?: string) => {
    const history = [...(unit.rentHistory ?? [])];
    if (rent !== undefined) {
      history.push({ date, rent, previousRent: unit.rent, indexLabel: newLabel, indexValue: newValue, note });
    }
    upsert("units", {
      ...unit,
      rent: rent ?? unit.rent,
      indexLabel: rent !== undefined ? newLabel ?? unit.indexLabel : unit.indexLabel,
      indexValue: rent !== undefined ? newValue ?? unit.indexValue : unit.indexValue,
      lastRevisionDate: date,
      rentHistory: history,
    });
    setOpen(false);
    setNewLabel(undefined);
    setNewValue(undefined);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-series-1">
        <TrendingUp size={16} /> Réviser le loyer
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-series-1/30 bg-series-1/[0.04] p-4">
      <div className="text-[14px] font-semibold text-ink">Révision au {dateFr(date)}</div>
      <div className="text-[13px] text-ink-2">
        Loyer actuel : <b>{eur(unit.rent)}</b>
        {unit.indexValue ? ` · indice de référence ${unit.indexLabel ?? ""} ${unit.indexValue.toLocaleString("fr-FR")}` : " · indice de référence non renseigné"}
      </div>
      <Grid2>
        <TextField label="Nouvel indice" value={newLabel} placeholder="Ex. IRL T2 2026" onChange={setNewLabel} />
        <NumberField label="Valeur" suffix="" value={newValue} onChange={setNewValue} />
      </Grid2>
      <div className="rounded-xl bg-card px-3 py-2.5 text-[13px]">
        {proposal !== undefined ? (
          <>
            Nouveau loyer : <b className="tabular text-[15px] text-ink">{eur(proposal)}</b>{" "}
            <span className="tabular text-muted">
              ({proposal - (unit.rent ?? 0) >= 0 ? "+" : ""}
              {eur(proposal - (unit.rent ?? 0))} · {pct(((proposal / (unit.rent ?? 1)) - 1) * 100, 2)})
            </span>
          </>
        ) : (
          <span className="text-muted">Données insuffisantes : loyer, indice de référence et nouvel indice nécessaires.</span>
        )}
      </div>
      <p className="text-[12px] text-muted">
        Calcul : loyer × nouvel indice ÷ indice de référence. Vérifiez la clause du bail et les éventuels plafonnements en vigueur : aucune règle n&apos;est appliquée automatiquement.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={proposal === undefined} onClick={() => apply(proposal)}>
          Appliquer
        </Button>
        <Button variant="secondary" onClick={() => apply(undefined)}>
          Pas de révision cette fois
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ——— Encaissements d'un logement (12 derniers mois) ———

export function PaymentStrip({ unit }: { unit: Unit }) {
  const current = monthKey(todayIso());
  const months = Array.from({ length: 12 }, (_, i) => shiftMonthKey(current, i - 11));
  const unpaid = Object.values(unit.payments ?? {}).reduce((s, p) => s + outstanding(p), 0);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-1 text-[13px] font-medium text-ink-2">
        <span>Encaissements (12 mois)</span>
        <Link href={`/loyers?mois=${current}`} className="font-semibold text-series-1">
          Pointer
        </Link>
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

export function ReminderRow({ r, onDismiss }: { r: Reminder; onDismiss?: () => void }) {
  const style = REMINDER_STYLE[r.kind];
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={r.href} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
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
      </Link>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Marquer comme traité" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-ink-2 active:scale-95">
          <Check size={16} />
        </button>
      )}
    </div>
  );
}

export function RemindersCard({ items, limit = 3 }: { items: Reminder[]; limit?: number }) {
  const { data, setSettings } = useStore();
  if (items.length === 0) return null;
  const dismiss = (id: string) => setSettings({ dismissedReminders: [...(data.settings.dismissedReminders ?? []), id] });
  return (
    <div className="soft-card mt-4 rounded-[26px] px-5 pb-2 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-bold text-navy">
          <BellRing size={17} className="text-gold" /> Rappels
          <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold text-white">{items.length}</span>
        </div>
        <Link href="/plus/rappels" className="text-sm font-medium text-series-1">
          Tout voir
        </Link>
      </div>
      <div className="divide-y divide-line">
        {items.slice(0, limit).map((r) => (
          <ReminderRow key={r.id} r={r} onDismiss={r.kind === "unpaid" || r.kind === "deposit" ? undefined : () => dismiss(r.id)} />
        ))}
      </div>
    </div>
  );
}
