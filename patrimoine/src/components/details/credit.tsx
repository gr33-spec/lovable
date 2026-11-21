"use client";

import { removalPlan, removalSummary } from "@/lib/removal";
import { useUndoableRemove } from "@/components/swipe";
import { DocumentsCard } from "@/components/documents/library";
import { buildingCrumbs, companyCrumbs } from "@/lib/crumbs";
import { goBack } from "@/lib/nav";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { yearlyBalances } from "@/lib/engine/loan";
import { auditLoans } from "@/lib/engine/loan-audit";
import { SOURCE_LABEL, balanceSource, endSource, paymentSource, rateSource } from "@/lib/engine/provenance";
import { reliableInitial } from "@/lib/schedule";
import { monthLabel } from "@/lib/engine/dates";
import { eur, eurCompact, pct } from "@/lib/format";
import { LoanForm } from "../forms";
import { LoanScheduleSection } from "./loan-schedule";
import { LineChart } from "../charts";
import { Card, ConfirmDelete, Empty, Kpi, Page, PageHeader, Pill, SectionTitle } from "../ui";

export function LoanDetail({ id }: { id: string }) {
  const { data, projection, nowMonth } = useStore();
  const removeUndoable = useUndoableRemove();
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
  const findings = auditLoans(data, projection.snapshot).filter((f) => f.loanId === id);
  const initial = reliableInitial(loan);
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
            {r.finished ? <Pill tone="pos">Terminé</Pill> : loan.schedule ? <Pill tone="pos">Tableau de la banque</Pill> : r.quality === "complete" ? <Pill tone="blue">Projection calculée</Pill> : r.quality === "estimated" ? <Pill tone="warn">Projection estimée</Pill> : <Pill tone="neg">Données insuffisantes</Pill>}
            {loan.kind === "in_fine" && <Pill>In fine</Pill>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Capital restant dû" value={now?.balance === undefined ? <span className="text-[15px] text-muted">Données insuffisantes</span> : eur(now.balance)} hint={SOURCE_LABEL[balanceSource(loan, r)]} />
            <Kpi label="Mensualité (avec assurance)" value={now?.paymentMonthly ? eur(now.paymentMonthly) : "—"} hint={SOURCE_LABEL[paymentSource(loan, r)]} />
            <Kpi label="Fin du crédit" value={r.endMonth !== undefined ? monthLabel(r.endMonth) : <span className="text-[15px] text-muted">Données insuffisantes</span>} hint={SOURCE_LABEL[endSource(loan, r)]} />
            <Kpi label="Taux" value={loan.ratePct !== undefined ? pct(loan.ratePct, 2) : r.impliedRatePct !== undefined ? pct(r.impliedRatePct, 2) : "—"} hint={rateSource(loan, r) === "calcul" ? "Déduit de la mensualité" : SOURCE_LABEL[rateSource(loan, r)]} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-line pt-3">
            <Kpi label="Montant emprunté" value={initial.value !== undefined ? eur(initial.value) : "—"} hint={initial.partialFrom ? "À saisir (offre de prêt)" : undefined} />
            <Kpi label="N° de prêt" value={loan.reference || loan.schedule?.meta?.reference || "—"} hint={loan.bank || loan.schedule?.meta?.bank || undefined} />
          </div>
          {totalInterest > 0 && <div className="mt-3 text-xs text-muted">Intérêts restant à payer : {eur(totalInterest)}</div>}
          {!loan.schedule && r.notes.map((n) => (
            <div key={n} className="mt-2 text-xs text-warn">{n}</div>
          ))}
          {findings.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-2xl bg-black/[0.03] px-3 py-2.5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Vérification des chiffres</div>
              {findings.map((f) => (
                <div key={f.text} className={`text-[13px] leading-snug ${f.severity === "critical" ? "text-neg" : "text-warn"}`}>
                  {f.text}
                </div>
              ))}
            </div>
          )}
        </Card>

        {visible.length > 1 && (
          <>
            <SectionTitle>Capital restant dû dans le temps</SectionTitle>
            <Card>
              <LineChart years={visible.map((s) => s.year)} series={[{ label: "Capital restant dû", values: visible.map((s) => s.balance), color: "var(--brand)" }]} height={170} />
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
        <LoanScheduleSection loan={loan} />

        <DocumentsCard scope={{ loanId: loan.id }} href={`/documents?credit=${loan.id}`} title="Autres documents du prêt" onlyLoose />

        <SectionTitle>Caractéristiques</SectionTitle>
        <Card>
          {loan.schedule && <p className="mb-3 rounded-xl bg-soft px-3 py-2 text-[12.5px] text-ink-2">Repris du tableau de la banque, qui fait foi pour les calculs.</p>}
          <LoanForm loan={loan} />
        </Card>

        </div>
        </div>
        <div className="mt-8">
          <ConfirmDelete label="Supprimer le crédit" message={`Supprimer ce crédit ? ${removalSummary(removalPlan(data, "loans", id))}`} onConfirm={() => { removeUndoable([{ coll: "loans", id }], "Crédit supprimé"); goBack(router, back); }} />
        </div>
      </Page>
    </>
  );
}
