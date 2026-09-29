"use client";

import { useRef, useState } from "react";
import { CircleAlert, FileCheck2, FileUp, LoaderCircle, Table2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Loan, LoanScheduleRow } from "@/lib/types";
import { checkSchedule, loanFieldsFromSchedule } from "@/lib/schedule";
import { monthIndex, monthLabel, parseMonth } from "@/lib/engine/dates";
import { dateFr, eur } from "@/lib/format";
import { ACCEPTED_FILES, uploadFile } from "@/lib/upload";
import { openDocument } from "@/components/pdf-viewer";
import { toast } from "@/components/swipe";
import { Button, Card, Pill, SectionTitle, Sheet, cx } from "@/components/ui";

// Tableau d'amortissement de la banque : importé en PDF ou photo, lu par
// l'IA, vérifié (continuité du capital, échéances) puis validé par
// l'utilisateur. Une fois enregistré, il fait foi pour tous les calculs :
// capital restant dû, intérêts, fin, projections, dossier banque, analyse.

interface Extraction {
  bank: string | null;
  reference: string | null;
  rows: LoanScheduleRow[];
  notes: string[];
  confidence: "haute" | "moyenne" | "faible";
}

export function LoanScheduleSection({ loan }: { loan: Loan }) {
  const { upsert, role, nowMonth } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<null | "upload" | "read">(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ fileId: string; fileName: string; extraction: Extraction } | null>(null);
  const [showRows, setShowRows] = useState(false);
  const schedule = loan.schedule;
  const readOnly = role !== "owner";

  const importFile = async (f: File) => {
    setError(null);
    setStep("upload");
    setProgress(0);
    let fileId: string | null = null;
    try {
      fileId = await uploadFile(f, setProgress);
      setStep("read");
      const res = await fetch("/api/credits/tableau", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileId, loanName: loan.name || loan.bank }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Lecture impossible.");
      setReview({ fileId, fileName: f.name, extraction: j.extraction });
    } catch (e) {
      setError((e as Error).message);
      if (fileId) void fetch(`/api/files/${fileId}`, { method: "DELETE" }).catch(() => undefined);
    } finally {
      setStep(null);
    }
  };

  const cancelReview = () => {
    if (review) void fetch(`/api/files/${review.fileId}`, { method: "DELETE" }).catch(() => undefined);
    setReview(null);
  };

  const save = () => {
    if (!review) return;
    const fields = loanFieldsFromSchedule(review.extraction.rows);
    const previous = loan;
    const next: Loan = {
      ...loan,
      ...fields,
      bank: loan.bank || review.extraction.bank || undefined,
      schedule: { rows: review.extraction.rows, fileId: review.fileId, fileName: review.fileName, importedAt: new Date().toISOString().slice(0, 10), source: "ia" },
    };
    upsert("loans", next);
    // L'ancien document est supprimé : un seul tableau en vigueur.
    const oldFile = previous.schedule?.fileId;
    setReview(null);
    toast("Tableau d'amortissement enregistré", () => upsert("loans", previous));
    if (oldFile && oldFile !== review.fileId) setTimeout(() => void fetch(`/api/files/${oldFile}`, { method: "DELETE" }).catch(() => undefined), 7000);
  };

  const removeSchedule = () => {
    const previous = loan;
    const rest: Loan = { ...loan };
    delete rest.schedule;
    upsert("loans", rest);
    let undone = false;
    toast("Tableau retiré : retour au calcul", () => {
      undone = true;
      upsert("loans", previous);
    });
    const fileId = previous.schedule?.fileId;
    if (fileId) setTimeout(() => !undone && void fetch(`/api/files/${fileId}`, { method: "DELETE" }).catch(() => undefined), 7000);
  };

  const check = schedule ? checkSchedule(schedule.rows) : null;
  const busy = step !== null;

  return (
    <>
      <SectionTitle>Tableau d&apos;amortissement</SectionTitle>
      <Card>
        {schedule && check ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pos/10 text-pos">
                <FileCheck2 size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">Tableau de la banque</div>
                <div className="text-[13px] text-muted">
                  {check.count} échéances · {monthName(check.firstMonth)} → {monthName(check.lastMonth)} · importé le {dateFr(schedule.importedAt)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-ink-2">Les calculs suivent ces échéances au centime : capital restant dû, intérêts, fin du crédit, projections, dossier banque et analyse IA.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowRows(true)} className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[13px] font-semibold text-white">
                <Table2 size={15} /> Voir les échéances
              </button>
              {schedule.fileId && (
                <button type="button" onClick={() => openDocument(`/api/files/${schedule.fileId}`, schedule.fileName)} className="rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold text-navy">
                  Voir le document
                </button>
              )}
              {!readOnly && (
                <>
                  <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold text-navy">
                    Remplacer
                  </button>
                  <button type="button" onClick={removeSchedule} className="rounded-full px-3 py-2 text-[13px] font-semibold text-neg">
                    Retirer
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-series-1/10 text-series-1">
                <FileUp size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">Chiffres exacts avec le tableau de la banque</div>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  Aujourd&apos;hui, le capital restant, les intérêts et la fin sont calculés à partir des informations saisies. Importez le tableau d&apos;amortissement (PDF ou photo) : chaque échéance est lue, vérifiée, puis utilisée telle quelle.
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="mt-3">
                <Button full disabled={busy} onClick={() => input.current?.click()} icon={busy ? <LoaderCircle size={18} className="animate-spin" /> : <FileUp size={18} />}>
                  {step === "upload" ? `Envoi… ${progress} %` : step === "read" ? "Lecture du tableau… (jusqu'à 2 min)" : "Importer le tableau d'amortissement"}
                </Button>
              </div>
            )}
          </>
        )}
        {busy && schedule && <p className="mt-2 flex items-center gap-1.5 text-[13px] text-series-1"><LoaderCircle size={14} className="animate-spin" /> {step === "upload" ? `Envoi… ${progress} %` : "Lecture du nouveau tableau…"}</p>}
        {error && <p className="mt-2 text-[13px] text-neg">{error}</p>}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </Card>

      {review && <ReviewSheet loan={loan} review={review} onCancel={cancelReview} onSave={save} />}
      {schedule && <RowsSheet rows={schedule.rows} open={showRows} onClose={() => setShowRows(false)} nowKey={monthKeyOf(nowMonth)} />}
    </>
  );
}

const monthKeyOf = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
function monthName(key?: string) {
  const m = parseMonth(key);
  return m === undefined ? "?" : monthLabel(m);
}

function ReviewSheet({ loan, review, onCancel, onSave }: { loan: Loan; review: { fileName: string; extraction: Extraction }; onCancel: () => void; onSave: () => void }) {
  const { rows, notes, confidence, bank } = review.extraction;
  const c = checkSchedule(rows);
  const f = loanFieldsFromSchedule(rows);
  const line = (label: string, before: string, after: string) => (
    <div className="flex items-center justify-between gap-3 py-2 text-[14px]">
      <span className="text-ink-2">{label}</span>
      <span className="text-right">
        {before !== after && before !== "—" && <span className="mr-2 text-muted line-through">{before}</span>}
        <span className="font-semibold text-ink">{after}</span>
      </span>
    </div>
  );
  const fmtRate = (v?: number) => (v === undefined ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`);
  return (
    <Sheet
      open
      onClose={onCancel}
      title="Vérifier le tableau"
      footer={
        <div className="space-y-2">
          <Button full onClick={onSave}>Enregistrer le tableau</Button>
          <Button full variant="ghost" onClick={onCancel}>Annuler</Button>
        </div>
      }
    >
      <div className="space-y-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={confidence === "haute" ? "pos" : confidence === "moyenne" ? "warn" : "neg"}>Lecture {confidence}</Pill>
          <span className="text-[13px] text-muted">{[bank, review.fileName].filter(Boolean).join(" · ")}</span>
        </div>
        {c.issues.length > 0 ? (
          <div className="rounded-2xl bg-warn/10 px-4 py-3 text-[13.5px] text-warn">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><CircleAlert size={15} /> À vérifier</div>
            {c.issues.map((i) => (
              <div key={i}>• {i}</div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-pos/10 px-4 py-3 text-[13.5px] font-semibold text-pos">Tableau cohérent : le capital restant dû suit chaque échéance.</div>
        )}
        <div className="divide-y divide-line rounded-2xl bg-card px-4">
          {line("Échéances lues", "—", `${c.count} (${monthName(c.firstMonth)} → ${monthName(c.lastMonth)})`)}
          {line("Montant emprunté", loan.initialAmount ? eur(loan.initialAmount) : "—", f.initialAmount ? eur(f.initialAmount) : "—")}
          {line("Échéance hors assurance", loan.monthlyPayment ? eur(loan.monthlyPayment) : "—", f.monthlyPayment ? eur(f.monthlyPayment) : "—")}
          {line("Assurance", loan.insuranceMonthly !== undefined ? eur(loan.insuranceMonthly) : "—", f.insuranceMonthly !== undefined ? eur(f.insuranceMonthly) : "—")}
          {line("Taux", fmtRate(loan.ratePct), fmtRate(f.ratePct))}
          {line("Fin", loan.endDate ? dateFr(loan.endDate) : "—", f.endDate ? monthName(f.endDate.slice(0, 7)) : "—")}
          {line("Intérêts sur toute la durée", "—", eur(c.totalInterest))}
        </div>
        {notes.length > 0 && (
          <ul className="space-y-1 text-[13px] text-ink-2">
            {notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
        <p className="text-[12.5px] text-muted">Les caractéristiques du crédit sont mises à jour d&apos;après le tableau. Vous pourrez consulter chaque échéance et revenir en arrière.</p>
      </div>
    </Sheet>
  );
}

function RowsSheet({ rows, open, onClose, nowKey }: { rows: LoanScheduleRow[]; open: boolean; onClose: () => void; nowKey: string }) {
  const years = new Map<string, LoanScheduleRow[]>();
  for (const r of rows) years.set(r.month.slice(0, 4), [...(years.get(r.month.slice(0, 4)) ?? []), r]);
  const thisYear = nowKey.slice(0, 4);
  return (
    <Sheet open={open} onClose={onClose} title="Échéances de la banque">
      <div className="space-y-4 pb-4">
        {[...years.entries()].map(([year, list]) => {
          const sum = (k: "payment" | "interest" | "principal") => list.reduce((a, r) => a + r[k], 0);
          return (
            <details key={year} open={year === thisYear} className="rounded-2xl bg-card px-4 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between py-1.5 text-[15px] font-semibold text-navy">
                <span>{year}</span>
                <span className="tabular text-[13px] font-medium text-muted">
                  intérêts {eur(sum("interest"))} · reste {eur(list[list.length - 1].balance)}
                </span>
              </summary>
              <table className="tabular mt-1 w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1 font-medium">Mois</th>
                    <th className="py-1 text-right font-medium">Échéance</th>
                    <th className="py-1 text-right font-medium">Intérêts</th>
                    <th className="py-1 text-right font-medium">Capital</th>
                    <th className="py-1 text-right font-medium">Restant dû</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.month} className={cx("border-t border-line", r.month === nowKey && "bg-series-1/10 font-semibold")}>
                      <td className="py-1">{monthLabel(parseMonth(r.month) ?? monthIndex(Number(year), 1)).replace(/ \d{4}$/, "")}</td>
                      <td className="py-1 text-right">{eur(r.payment + (r.insurance ?? 0))}</td>
                      <td className="py-1 text-right">{eur(r.interest)}</td>
                      <td className="py-1 text-right">{eur(r.principal)}</td>
                      <td className="py-1 text-right">{eur(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
      </div>
    </Sheet>
  );
}
