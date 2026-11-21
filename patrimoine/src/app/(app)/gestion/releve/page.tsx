"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, FileUp, Landmark, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { matchStatement, parseStatement, type BankMatch, type BankRow } from "@/lib/bank-statement";
import { dueFor } from "@/lib/payments";
import { monthKeyLabel } from "@/lib/engine/leases";
import { eur } from "@/lib/format";
import { toast } from "@/components/swipe";
import { Button, Card, Page, PageHeader, SectionTitle, cx } from "@/components/ui";
import type { RentPayment, Unit } from "@/lib/types";

// Rapprochement d'un relevé bancaire : le fichier est lu dans le navigateur,
// sans envoi à un service extérieur ; rien n'est enregistré sans validation.

/** Relevés français souvent en Windows-1252 : repli si l'UTF-8 est illisible. */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function RelevePage() {
  const { data, projection, upsertMany, role } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const [error, setError] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const matches = useMemo(() => (rows ? matchStatement(data, role === "owner" ? projection.snapshot : undefined, rows) : []), [rows, data, projection, role]);

  const open = async (file: File | undefined) => {
    if (!file) return;
    setDone(false);
    setSkipped(new Set());
    setFileName(file.name);
    const r = parseStatement(await readText(file));
    setError(r.error);
    setRows(r.rows.length ? r.rows : null);
  };

  const unitOf = (id: string) => data.units.find((u) => u.id === id);
  const buildingName = (u?: Unit) => data.buildings.find((b) => b.id === u?.buildingId)?.name ?? "";
  const rents = matches.map((m, i) => ({ m, i })).filter((x): x is { m: Extract<BankMatch, { kind: "rent" }>; i: number } => x.m.kind === "rent");
  const loans = matches.filter((m): m is Extract<BankMatch, { kind: "loan" }> => m.kind === "loan");
  const others = matches.filter((m) => m.kind === "none");
  const toRecord = rents.filter(({ m, i }) => !m.alreadyPaid && !skipped.has(i));

  const record = () => {
    const before = new Map<string, Unit>();
    const next = new Map<string, Unit>();
    for (const { m } of toRecord) {
      const u = next.get(m.unitId) ?? unitOf(m.unitId);
      if (!u) continue;
      if (!before.has(u.id)) before.set(u.id, u);
      const partial = m.row.amount < m.due - 1;
      const payment: RentPayment = { ...dueFor(data, u, m.month), status: partial ? "partiel" : "paye", paidDate: m.row.date, ...(partial ? { paid: m.row.amount } : {}), note: "Relevé bancaire" };
      next.set(u.id, { ...u, payments: { ...(u.payments ?? {}), [m.month]: payment } });
    }
    upsertMany([...next.values()].map((item) => ({ coll: "units" as const, item })));
    toast(`${toRecord.length} loyer${toRecord.length > 1 ? "s" : ""} pointé${toRecord.length > 1 ? "s" : ""}`, () => upsertMany([...before.values()].map((item) => ({ coll: "units" as const, item }))));
    setDone(true);
  };

  return (
    <>
      <PageHeader title="Relevé bancaire" back="/gestion?vue=loyers" subtitle="Pointer les loyers à partir du relevé" />
      <Page>
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-gold">
              <FileUp size={20} />
            </span>
            <div className="min-w-0 flex-1 text-[13.5px] text-ink-2">
              Exportez le relevé depuis le site de votre banque au format <b>CSV</b> (ou « Excel / tableur »), puis choisissez-le ici. Le fichier est lu sur votre appareil : il n&apos;est ni envoyé ni conservé.
            </div>
          </div>
          <input ref={input} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => open(e.target.files?.[0])} />
          <div className="mt-3">
            <Button full onClick={() => input.current?.click()} icon={<FileUp size={18} />}>
              {fileName ? "Choisir un autre relevé" : "Choisir le relevé (CSV)"}
            </Button>
          </div>
          {fileName && <div className="mt-2 truncate text-center text-[12.5px] text-muted">{fileName}{rows ? ` · ${rows.length} opérations` : ""}</div>}
          {error && <div className="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-[13px] text-warn">{error}</div>}
        </Card>

        {rows && (
          <>
            <SectionTitle>{`Loyers reconnus (${rents.length})`}</SectionTitle>
            {rents.length === 0 ? (
              <Card className="text-[14px] text-muted">Aucun virement ne correspond à un loyer attendu.</Card>
            ) : (
              <Card className="py-1">
                <div className="divide-y divide-line">
                  {rents.map(({ m, i }) => {
                    const u = unitOf(m.unitId);
                    const partial = m.row.amount < m.due - 1;
                    const on = !m.alreadyPaid && !skipped.has(i);
                    return (
                      <label key={i} className={cx("flex items-start gap-3 py-3", m.alreadyPaid && "opacity-60")}>
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
                          checked={on}
                          disabled={m.alreadyPaid || done}
                          onChange={() => setSkipped((s) => {
                            const n = new Set(s);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-semibold text-ink">
                            {u?.name} · <span className="capitalize">{monthKeyLabel(m.month)}</span>
                          </span>
                          <span className="block truncate text-[12.5px] text-muted">{buildingName(u)} · {dateFr(m.row.date)} · {m.row.label}</span>
                          <span className={cx("block text-[12px]", m.confidence === "sure" ? "text-pos" : "text-warn")}>
                            {m.alreadyPaid ? "Déjà pointé payé" : `${m.confidence === "sure" ? "Reconnu" : "Probable"} : ${m.why}`}
                            {partial && !m.alreadyPaid ? ` · partiel (attendu ${eur(m.due)})` : ""}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-[14.5px] font-bold text-pos">+{eur(m.row.amount)}</span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}
            {toRecord.length > 0 && !done && (
              <div className="mt-3">
                <Button full onClick={record} icon={<Wallet size={18} />}>
                  {`Pointer ${toRecord.length} loyer${toRecord.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            )}
            {done && (
              <Link href="/gestion?vue=loyers" className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-pos/10 px-4 py-3 text-[14px] font-semibold text-pos">
                <CircleCheck size={18} /> Loyers pointés · voir le suivi
              </Link>
            )}

            {loans.length > 0 && (
              <>
                <SectionTitle>{`Mensualités de crédit (${loans.length})`}</SectionTitle>
                <Card className="py-1">
                  <div className="divide-y divide-line">
                    {loans.map((m, i) => {
                      const l = data.loans.find((x) => x.id === m.loanId);
                      return (
                        <Link key={i} href={`/patrimoine/credit/${m.loanId}`} className="flex items-center gap-3 py-3">
                          <Landmark size={17} className="shrink-0 text-series-1" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-semibold text-ink">{l?.name || l?.bank || "Crédit"}</span>
                            <span className="block truncate text-[12.5px] text-muted">{dateFr(m.row.date)} · {m.row.label} · {m.why}</span>
                          </span>
                          <span className="tabular shrink-0 text-[14.5px] font-semibold text-ink">−{eur(-m.row.amount)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {others.length > 0 && (
              <details className="mt-5">
                <summary className="cursor-pointer px-1 text-[14px] font-semibold text-ink-2">{`Autres opérations non rapprochées (${others.length})`}</summary>
                <Card className="mt-2 py-1">
                  <div className="divide-y divide-line">
                    {others.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 text-[13px]">
                        <span className="w-11 shrink-0 text-muted">{dateFr(m.row.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-ink-2">{m.row.label}</span>
                        <span className={cx("tabular shrink-0 font-semibold", m.row.amount < 0 ? "text-ink" : "text-pos")}>{m.row.amount < 0 ? `−${eur(-m.row.amount)}` : `+${eur(m.row.amount)}`}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </details>
            )}
          </>
        )}
      </Page>
    </>
  );
}
