"use client";

import { useRef, useState } from "react";
import { CircleAlert, FileCheck2, FileUp, LoaderCircle, Table2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AppDocument, Loan, LoanSchedule, LoanScheduleRow, ScheduleMeta } from "@/lib/types";
import { checkSchedule, loanFieldsFromSchedule, parseScheduleJson, scheduleStart } from "@/lib/schedule";
import { monthIndex, monthLabel, parseMonth } from "@/lib/engine/dates";
import { dateFr, eur } from "@/lib/format";
import { openDocument } from "@/components/pdf-viewer";
import { toast } from "@/components/swipe";
import { Button, Card, Pill, SectionTitle, Sheet, cx } from "@/components/ui";

// Tableau d'amortissement de la banque : échéances importées en JSON,
// vérifiées (continuité du capital, échéances) puis validées par
// l'utilisateur. Une fois enregistré, il fait foi pour tous les calculs :
// capital restant dû, intérêts, fin, projections, dossier banque, analyse.

interface Extraction {
  bank: string | null;
  reference: string | null;
  meta?: ScheduleMeta;
  rows: LoanScheduleRow[];
  notes: string[];
  confidence: "haute" | "moyenne" | "faible";
}

export function LoanScheduleSection({ loan }: { loan: Loan }) {
  const { upsert, upsertMany, remove, role, nowMonth } = useStore();
  const [showRows, setShowRows] = useState(false);
  const schedule = loan.schedule;
  const readOnly = role !== "owner";

  const save = ({ rows, fileId, fileName, bank, meta }: ImportedSchedule) => {
    const fields = loanFieldsFromSchedule(rows, undefined, meta);
    const previous = loan;
    const next: Loan = { ...loan, ...fields, bank: loan.bank || bank || meta?.bank || undefined, reference: loan.reference || meta?.reference || undefined, schedule: scheduleOf(rows, fileId, fileName, meta) };
    // L'ancien tableau n'est pas supprimé : il reste consultable dans les documents du prêt.
    const old = previous.schedule;
    const archive: AppDocument | undefined =
      old?.fileId && old.fileId !== fileId
        ? { id: crypto.randomUUID(), fileId: old.fileId, name: old.fileName ?? "Tableau d'amortissement", category: "tableau_amortissement", title: `Ancien tableau d'amortissement — ${loan.name || loan.bank || "Crédit"}`, date: old.importedAt, loanId: loan.id, buildingId: loan.buildingId ?? null, companyId: loan.companyId ?? null, addedAt: new Date().toISOString().slice(0, 10), source: "manuel" }
        : undefined;
    upsertMany([{ coll: "loans", item: next }, ...(archive ? [{ coll: "documents" as const, item: archive }] : [])]);
    toast("Tableau d'amortissement enregistré", () => {
      upsert("loans", previous);
      if (archive) remove("documents", archive.id);
    });
  };
  const importer = useScheduleImport({ hint: loan.name || loan.bank, compare: loan, onConfirm: save });
  const busy = importer.busy;

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
              <button type="button" onClick={() => setShowRows(true)} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-semibold text-on-brand">
                <Table2 size={15} /> Voir les échéances
              </button>
              {schedule.fileId && (
                <button type="button" onClick={() => openDocument(`/api/files/${schedule.fileId}`, schedule.fileName)} className="rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold text-brand">
                  Voir le document
                </button>
              )}
              {!readOnly && (
                <>
                  <button type="button" disabled={busy} onClick={importer.pick} className="rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold text-brand">
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
                  Aujourd&apos;hui, le capital restant, les intérêts et la fin sont calculés à partir des informations saisies. Importez les échéances de la banque en fichier JSON : elles sont vérifiées, puis utilisées telles quelles. Le PDF du tableau se joint dans « Autres documents du prêt ».
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="mt-3">
                <Button full disabled={busy} onClick={importer.pick} icon={busy ? <LoaderCircle size={18} className="animate-spin" /> : <FileUp size={18} />}>
                  {importer.label ?? "Importer les échéances (JSON)"}
                </Button>
              </div>
            )}
          </>
        )}
        {busy && schedule && <p className="mt-2 flex items-center gap-1.5 text-[13px] text-series-1"><LoaderCircle size={14} className="animate-spin" /> {importer.label}</p>}
        {importer.element}
      </Card>

      {schedule && <RowsSheet rows={schedule.rows} open={showRows} onClose={() => setShowRows(false)} nowKey={monthKeyOf(nowMonth)} />}
    </>
  );
}

export interface ImportedSchedule {
  rows: LoanScheduleRow[];
  /** PDF de la banque éventuellement joint (sinon l'échéancier vient d'un fichier JSON). */
  fileId?: string;
  fileName: string;
  bank: string | null;
  /** En-tête (emprunteur, référence, montant, début…). */
  meta?: ScheduleMeta;
}

export function scheduleOf(rows: LoanScheduleRow[], fileId: string | undefined, fileName: string, meta?: ScheduleMeta): LoanSchedule {
  return { rows, ...(fileId ? { fileId } : {}), fileName, importedAt: new Date().toISOString().slice(0, 10), source: "manuel", ...(meta && Object.keys(meta).length ? { meta } : {}) };
}

/**
 * Import d'un tableau d'amortissement, commun à tous les écrans (création de
 * crédit, fiche crédit, prêts d'un projet) : fichier JSON des échéances (aucune
 * lecture de PDF par une IA), vérification par l'utilisateur, puis `onConfirm`.
 * Le PDF de la banque se joint à part, comme document du prêt.
 */
export function useScheduleImport({ compare, onConfirm }: { hint?: string; compare?: Partial<Loan>; onConfirm: (s: ImportedSchedule) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ fileName: string; extraction: Extraction } | null>(null);

  const importFile = async (f: File) => {
    setError(null);
    try {
      const parsed = parseScheduleJson(await f.text());
      setReview({ fileName: f.name, extraction: { bank: parsed.bank, reference: parsed.meta?.reference ?? null, meta: parsed.meta, rows: parsed.rows, notes: parsed.notes, confidence: "haute" } });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const cancel = () => setReview(null);
  const confirm = () => {
    if (!review) return;
    onConfirm({ rows: review.extraction.rows, fileName: review.fileName, bank: review.extraction.bank, meta: review.extraction.meta });
    setReview(null);
  };
  const element = (
    <>
      {error && <p className="mt-2 text-[13px] text-neg">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }}
      />
      {review && <ReviewSheet loan={compare ?? {}} review={review} onCancel={cancel} onSave={confirm} />}
    </>
  );
  return {
    pick: () => input.current?.click(),
    busy: false,
    label: undefined as string | undefined,
    element,
  };
}

/** Carte d'invitation à importer le tableau (création de crédit, projet). */
export function ScheduleImportCard({ title, text, importer }: { title: string; text: string; importer: ReturnType<typeof useScheduleImport> }) {
  return (
    <div className="rounded-2xl bg-series-1/5 p-4 ring-1 ring-series-1/15">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-series-1/10 text-series-1">
          <FileUp size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          <p className="mt-0.5 text-[13px] text-ink-2">{text}</p>
        </div>
      </div>
      <div className="mt-3">
        <Button full disabled={importer.busy} onClick={importer.pick} icon={importer.busy ? <LoaderCircle size={18} className="animate-spin" /> : <FileUp size={18} />}>
          {importer.label ?? "Importer les échéances (JSON)"}
        </Button>
      </div>
      {importer.element}
    </div>
  );
}

const monthKeyOf = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
function monthName(key?: string) {
  const m = parseMonth(key);
  return m === undefined ? "?" : monthLabel(m);
}

function ReviewSheet({ loan, review, onCancel, onSave }: { loan: Partial<Loan>; review: { fileName: string; extraction: Extraction }; onCancel: () => void; onSave: () => void }) {
  const { rows, notes, bank, meta } = review.extraction;
  const c = checkSchedule(rows);
  const f = loanFieldsFromSchedule(rows, undefined, meta);
  const start = scheduleStart(rows, meta);
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
          <Pill tone="blue">{rows.length} échéances</Pill>
          <span className="text-[13px] text-muted">{[meta?.borrower, bank, meta?.reference ? `réf. ${meta.reference}` : undefined, review.fileName].filter(Boolean).join(" · ")}</span>
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
        {start !== "first" && (
          <div className="rounded-2xl bg-warn/10 px-4 py-3 text-[13.5px] text-warn">
            {start === "partial"
              ? `Tableau édité en cours de prêt (première ligne : ${monthName(c.firstMonth)}) : montant emprunté et déblocage repris de l'en-tête du document.`
              : `Le tableau commence en ${monthName(c.firstMonth)} avec un capital non rond : il a sans doute été édité en cours de prêt. Le montant emprunté et la date de déblocage ne sont pas déduits du tableau ; saisissez-les depuis l'offre de prêt (fiche du crédit, « Détails du prêt »).`}
          </div>
        )}
        <div className="divide-y divide-line rounded-2xl bg-card px-4">
          {line("Échéances lues", "—", `${c.count} (${monthName(c.firstMonth)} → ${monthName(c.lastMonth)})`)}
          {line("Montant emprunté", loan.initialAmount ? eur(loan.initialAmount) : "—", f.initialAmount ? eur(f.initialAmount) : "—")}
          {line("Départ", loan.startDate ? monthName(loan.startDate.slice(0, 7)) : "—", f.startDate ? monthName(f.startDate.slice(0, 7)) : "—")}
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
