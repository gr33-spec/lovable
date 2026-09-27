"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { StatementFigures } from "@/lib/types";
import { evolution, statementRatios } from "@/lib/engine/indicators";
import { eur, eurCompact, pct } from "@/lib/format";
import { BALANCE_FIELDS, BilanImport, FiguresForm, INCOME_FIELDS } from "./bilans";
import { Button, Card, ConfirmDelete, Empty, Kpi, Page, PageHeader, Pill, SectionTitle, Sheet, cx } from "./ui";

const HIGHER_BETTER: (keyof StatementFigures)[] = ["revenue", "otherIncome", "operatingResult", "exceptionalResult", "netResult", "cash", "equity"];
const LOWER_BETTER: (keyof StatementFigures)[] = ["externalCharges", "taxes", "financialCharges", "corporateTax", "bankDebt", "otherDebts"];

function evoColor(key: keyof StatementFigures, evo: number | undefined): string {
  if (evo === undefined || Math.abs(evo) < 0.5) return "text-muted";
  if (HIGHER_BETTER.includes(key)) return evo > 0 ? "text-pos" : "text-neg";
  if (LOWER_BETTER.includes(key)) return evo < 0 ? "text-pos" : "text-neg";
  return "text-muted";
}

export function StatementDetail({ id }: { id: string }) {
  const { data, upsert, remove } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const st = data.statements.find((s) => s.id === id);
  if (!st) {
    return (
      <>
        <PageHeader title="Bilan" back="/plus/bilans" />
        <Empty title="Bilan introuvable" />
      </>
    );
  }
  const company = data.companies.find((c) => c.id === st.companyId);
  const prev = data.statements.find((s) => s.companyId === st.companyId && s.year === st.year - 1);
  const r = statementRatios(st.figures);
  const f = st.figures;
  const row = (key: keyof StatementFigures, label: string) => {
    const v = f[key];
    const p = prev?.figures[key];
    const evo = evolution(v, p);
    if (v === undefined && p === undefined) return null;
    return (
      <div key={key} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 py-1.5 text-[14px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-semibold text-ink">{eur(v)}</span>
        <span className={cx("tabular w-16 text-right text-xs", evoColor(key, evo))}>
          {evo === undefined ? (prev ? eurCompact(p) : "") : `${evo >= 0 ? "+" : ""}${pct(evo, 0)}`}
        </span>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title={`Bilan ${st.year}`}
        subtitle={company?.name}
        back="/plus/bilans"
        action={
          <button onClick={() => setEditing(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-semibold text-navy">
            <Pencil size={15} /> Modifier
          </button>
        }
      />
      <Page>
        <div className="hero-card rounded-[26px] p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-white/65">Résultat net {st.year}</span>
            {st.source === "ia" ? (
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
                <Sparkles size={12} /> Lu par l&apos;IA{st.confidence ? ` · confiance ${st.confidence}` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">Saisi</span>
            )}
          </div>
          <div className="tabular mt-1 text-[36px] font-extrabold tracking-[-0.02em]">{eur(f.netResult)}</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["CAF", eurCompact(r.caf)],
              ["EBE", eurCompact(r.ebe)],
              ["Trésorerie", eurCompact(f.cash)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/[0.07] px-3 py-2 ring-1 ring-white/10">
                <div className="text-[11px] text-white/60">{l}</div>
                <div className="tabular text-[16px] font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>Ratios</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Marge nette" value={r.netMargin === undefined ? "—" : pct(r.netMargin)} />
            <Kpi label="Rentabilité des fonds propres" value={r.roe === undefined ? "—" : pct(r.roe)} />
            <Kpi label="Dettes bancaires / fonds propres" value={r.gearing === undefined ? "—" : `${r.gearing.toFixed(2).replace(".", ",")}×`} />
            <Kpi label="Capacité de remboursement" value={r.debtToCaf === undefined ? "—" : `${r.debtToCaf.toFixed(1).replace(".", ",")} ans`} />
            <Kpi label="Couverture des intérêts" value={r.interestCoverage === undefined ? "—" : `${r.interestCoverage.toFixed(1).replace(".", ",")}×`} />
          </div>
          <p className="mt-3 text-xs text-muted">EBE et CAF approchés : résultat + dotations aux amortissements.</p>
        </Card>

        <SectionTitle>Compte de résultat</SectionTitle>
        <Card className="py-3">
          {prev && <div className="mb-1 text-right text-[11px] text-muted">vs {prev.year}</div>}
          {INCOME_FIELDS.map((x) => row(x.key, x.label))}
        </Card>
        <SectionTitle>Bilan</SectionTitle>
        <Card className="py-3">{BALANCE_FIELDS.map((x) => row(x.key, x.label))}</Card>

        {st.aiNotes && st.aiNotes.length > 0 && (
          <>
            <SectionTitle>Points relevés</SectionTitle>
            <Card>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
                {st.aiNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <div className="mt-8 space-y-3">
          {st.fileId && (
            <Button full icon={<Sparkles size={18} />} onClick={() => setAnalyzing(true)}>
              {st.source === "ia" ? "Relancer la lecture du PDF" : "Lire ce PDF avec l'IA"}
            </Button>
          )}
          {st.fileId && (
            <a href={`/api/files/${st.fileId}`} target="_blank" rel="noopener" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-soft text-[16px] font-semibold text-navy">
              <FileText size={18} /> Voir le PDF {st.fileName ? `(${st.fileName})` : ""}
            </a>
          )}
          <ConfirmDelete
            label="Supprimer ce bilan"
            message="Supprimer ce bilan ? Le PDF joint reste dans l'historique de sauvegarde."
            onConfirm={() => {
              remove("statements", st.id);
              router.push("/plus/bilans");
            }}
          />
        </div>
      </Page>

      <Sheet open={analyzing} onClose={() => setAnalyzing(false)} title={`Lecture du bilan ${st.year}`}>
        {analyzing && <BilanImport existing={st} onDone={() => setAnalyzing(false)} />}
      </Sheet>
      <Sheet open={editing} onClose={() => setEditing(false)} title={`Bilan ${st.year}`} footer={<Button full onClick={() => setEditing(false)}>Terminé</Button>}>
        <FiguresForm figures={st.figures} onChange={(figures) => upsert("statements", { ...st, figures })} />
        <div className="mt-3">
          <Pill>Les modifications sont enregistrées automatiquement</Pill>
        </div>
      </Sheet>
    </>
  );
}
