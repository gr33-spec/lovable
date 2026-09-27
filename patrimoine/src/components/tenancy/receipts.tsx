"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tenancy, Unit } from "@/lib/types";
import { monthKey, shiftMonthKey, todayIso } from "@/lib/engine/leases";
import { monthReceipt, rentStatement } from "@/lib/legal/receipts";
import { monthLong } from "@/lib/legal/doc";
import { eur } from "@/lib/format";
import { DateField, SelectField, Segmented, Stack } from "../ui";
import { DocRow, documentUrl } from "./common";

/** « Obtenir une quittance » : un mois précis, ou attestation de loyers à jour à une date. */
export function ReceiptPicker({ unit, tenancy }: { unit: Unit; tenancy: Tenancy }) {
  const [mode, setMode] = useState<"mois" | "ajour">("mois");
  const today = todayIso();
  const current = monthKey(today);
  const start = tenancy.startDate ? monthKey(tenancy.startDate) : shiftMonthKey(current, -11);
  const months = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 24; i++) {
      const m = shiftMonthKey(current, -i);
      if (m < start) break;
      out.push(m);
    }
    return out;
  }, [current, start]);
  const firstPointed = Object.keys(unit.payments ?? {}).filter((k) => k >= start).sort()[0];
  const [asOf, setAsOf] = useState<string | undefined>(today);
  const [from, setFrom] = useState<string>(firstPointed ?? start);
  const statement = asOf ? rentStatement(unit, tenancy, from, monthKey(asOf)) : undefined;
  const fromOptions = [...months].reverse().map((m) => ({ value: m, label: monthLong(m) }));

  return (
    <Stack>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "mois", label: "Un mois" },
          { value: "ajour", label: "Loyers à jour" },
        ]}
      />
      {mode === "mois" ? (
        <div className="divide-y divide-line rounded-2xl bg-card px-3">
          {months.map((m) => {
            const r = monthReceipt(unit, tenancy, m);
            return (
              <DocRow
                key={m}
                title={monthLong(m).replace(/^./, (c) => c.toUpperCase())}
                status={r.kind === "quittance" ? "Quittance" : r.kind === "recu" ? `Reçu — ${eur(r.received)} reçus sur ${eur(r.total)}` : r.reason.startsWith("Le paiement") ? "Non pointé" : "Impayé"}
                subtitle={r.kind === "quittance" ? `Loyer ${eur(r.rent)} + charges ${eur(r.charges)}` : undefined}
                tone={r.kind === "quittance" ? "pos" : r.kind === "recu" ? "warn" : "neutral"}
                url={r.kind === "aucun" ? undefined : documentUrl({ type: "quittance", tenancy: tenancy.id, month: m })}
                fileName={`${r.kind === "quittance" ? "quittance" : "recu"}-${m}.pdf`}
                action={
                  r.kind === "aucun" ? (
                    <Link href={`/gestion?mois=${m}`} className="rounded-full bg-soft px-3 py-1.5 text-[12px] font-semibold text-series-1">
                      Pointer
                    </Link>
                  ) : undefined
                }
              />
            );
          })}
          {months.length === 0 && <div className="py-4 text-sm text-muted">Aucun mois échu pour ce bail.</div>}
        </div>
      ) : (
        <>
          <DateField label="À jour au" value={asOf} onChange={setAsOf} />
          <SelectField label="Depuis" value={from} options={fromOptions} allowEmpty={false} onChange={(v) => v && setFrom(v)} hint="Premier mois couvert par l'attestation." />
          {statement && (
            <div
              className={
                statement.kind === "attestation"
                  ? "rounded-2xl bg-pos/10 px-4 py-3 text-[14px] text-pos"
                  : statement.kind === "recu"
                    ? "rounded-2xl bg-warn/10 px-4 py-3 text-[14px] text-warn"
                    : "rounded-2xl bg-soft px-4 py-3 text-[14px] text-ink-2"
              }
            >
              {statement.kind === "attestation" && <>Locataire à jour : {eur(statement.totalPaid)} payés sur la période (loyers {eur(statement.totalRent)}, charges {eur(statement.totalCharges)}). Une attestation valant quittance peut être délivrée.</>}
              {statement.kind === "recu" && <>Locataire pas à jour : reste dû {eur(statement.remaining)}. Seul un reçu des sommes versées ({eur(statement.totalPaid)}) peut être délivré, pas une quittance.</>}
              {statement.kind === "incomplet" && (
                <>
                  Mois non pointés : {statement.unpointed.map(monthLong).join(", ")}.{" "}
                  <Link href={`/gestion?mois=${statement.unpointed[0]}`} className="font-semibold text-series-1 underline">
                    Les pointer
                  </Link>{" "}
                  avant d&apos;établir le document.
                </>
              )}
            </div>
          )}
          {statement && statement.kind !== "incomplet" && asOf && (
            <div className="rounded-2xl bg-card px-3">
              <DocRow
                title={statement.kind === "attestation" ? "Attestation de loyers à jour" : "Reçu des sommes versées"}
                subtitle={`${monthLong(statement.from)} → ${monthLong(statement.to)}`}
                url={documentUrl({ type: "attestation", tenancy: tenancy.id, from, asOf })}
                fileName={`${statement.kind}-${asOf}.pdf`}
              />
            </div>
          )}
        </>
      )}
      <p className="text-[12px] text-muted">Quittance délivrée gratuitement, avec le détail loyer / charges (art. 21 de la loi du 6 juillet 1989). En cas de paiement partiel, un reçu est établi à la place.</p>
    </Stack>
  );
}
