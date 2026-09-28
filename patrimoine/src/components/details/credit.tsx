"use client";

import { buildingCrumbs, companyCrumbs } from "@/lib/crumbs";
import { goBack } from "@/lib/nav";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { yearlyBalances } from "@/lib/engine/loan";
import { monthLabel } from "@/lib/engine/dates";
import { eur, eurCompact, pct } from "@/lib/format";
import { LoanForm } from "../forms";
import { LineChart } from "../charts";
import { Card, ConfirmDelete, Empty, Kpi, Page, PageHeader, Pill, SectionTitle } from "../ui";

export function LoanDetail({ id }: { id: string }) {
  const { data, projection, nowMonth, remove } = useStore();
  const router = useRouter();
  const loan = data.loans.find((l) => l.id === id);
  const r = projection.snapshot.resolvedLoans.get(id);
  const schedule = useMemo(() => (r ? yearlyBalances(r, nowMonth) : []), [r, nowMonth]);
  if (!loan || !r) {
    return (
      <>
        <PageHeader title="Crédit" back="/patrimoine" />
        <Empty title="Crédit introuvable" />
      </>
    );
  }
  const now = projection.snapshot.byLoan.get(id);
  const building = data.buildings.find((b) => b.id === loan.buildingId);
  const lastYear = schedule.findIndex((s) => s.balance < 1);
  const visible = lastYear >= 0 ? schedule.slice(0, lastYear + 2) : schedule;
  const totalInterest = schedule.reduce((s, x) => s + x.interest, 0);
  const back = building ? `/patrimoine/immeuble/${building.id}` : "/patrimoine";

  return (
    <>
      <PageHeader title={loan.name || loan.bank || "Crédit"} crumbs={building ? buildingCrumbs(data, building) : companyCrumbs(data, loan.companyId)} subtitle={loan.bank || undefined} back={back} />
      <Page>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div className="min-w-0">
        <Card>
          <div className="mb-3 flex gap-2">
            {r.finished ? <Pill tone="pos">Terminé</Pill> : r.quality === "complete" ? <Pill tone="blue">Projection calculée</Pill> : r.quality === "estimated" ? <Pill tone="warn">Projection estimée</Pill> : <Pill tone="neg">Données insuffisantes</Pill>}
            {loan.kind === "in_fine" && <Pill>In fine</Pill>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Capital restant dû" value={now?.balance === undefined ? <span className="text-[15px] text-muted">Données insuffisantes</span> : eur(now.balance)} />
            <Kpi label="Mensualité (avec assurance)" value={now?.paymentMonthly ? eur(now.paymentMonthly) : "—"} />
            <Kpi label="Fin du crédit" value={r.endMonth !== undefined ? monthLabel(r.endMonth) : <span className="text-[15px] text-muted">Données insuffisantes</span>} />
            <Kpi label="Taux" value={loan.ratePct !== undefined ? pct(loan.ratePct, 2) : r.impliedRatePct !== undefined ? `${pct(r.impliedRatePct, 2)} (déduit)` : "—"} />
          </div>
          {totalInterest > 0 && <div className="mt-3 text-xs text-muted">Intérêts restant à payer : {eur(totalInterest)}</div>}
          {r.notes.map((n) => (
            <div key={n} className="mt-2 text-xs text-warn">{n}</div>
          ))}
        </Card>

        {visible.length > 1 && (
          <>
            <SectionTitle>Capital restant dû dans le temps</SectionTitle>
            <Card>
              <LineChart years={visible.map((s) => s.year)} series={[{ label: "Capital restant dû", values: visible.map((s) => s.balance), color: "var(--series-1)" }]} height={170} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[5, 10, 15].map((h) => {
                  const row = schedule[h];
                  return (
                    <div key={h} className="rounded-2xl bg-soft py-2">
                      <div className="text-xs text-muted">Dans {h} ans</div>
                      <div className="tabular text-[15px] font-semibold text-ink">{row ? eurCompact(row.balance) : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        </div>
        <div className="min-w-0 lg:[&>*:first-child]:mt-0">
        <SectionTitle>Caractéristiques</SectionTitle>
        <Card>
          <LoanForm loan={loan} />
        </Card>

        </div>
        </div>
        <div className="mt-8">
          <ConfirmDelete label="Supprimer le crédit" message="Supprimer ce crédit ?" onConfirm={() => { remove("loans", id); goBack(router, back); }} />
        </div>
      </Page>
    </>
  );
}
