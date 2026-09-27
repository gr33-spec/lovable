"use client";

import { useState } from "react";
import { HandCoins, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Withdrawal } from "@/lib/types";
import { WITHDRAWAL_KINDS, labelOf } from "@/lib/labels";
import { eur, pct } from "@/lib/format";
import { yearOf } from "@/lib/engine/dates";
import { useCompanyOptions } from "@/components/forms";
import { Button, Card, ConfirmDelete, Divided, Empty, Grid2, NumberField, Page, PageHeader, Row, RoundButton, SectionTitle, SelectField, Sheet, Stack, TextField } from "@/components/ui";

export default function RemunerationPage() {
  const { data, upsert, remove, nowMonth } = useStore();
  const companies = useCompanyOptions();
  const [editId, setEditId] = useState<string | null>(null);
  const y0 = yearOf(nowMonth);
  const w = data.withdrawals.find((x) => x.id === editId);
  const set = (patch: Partial<Withdrawal>) => w && upsert("withdrawals", { ...w, ...patch });
  const add = () => {
    const item: Withdrawal = { id: newId(), kind: "cca", startYear: y0 + 1, taxRatePct: 0 };
    upsert("withdrawals", item);
    setEditId(item.id);
  };

  const years = Array.from({ length: 11 }, (_, i) => y0 + i);
  const perYear = years.map((year) => {
    let gross = 0;
    let net = 0;
    for (const x of data.withdrawals) {
      if (!x.annualAmount) continue;
      if (year < (x.startYear ?? y0) || year > (x.endYear ?? y0 + 30)) continue;
      gross += x.annualAmount;
      net += x.annualAmount * (1 - (x.taxRatePct ?? 0) / 100);
    }
    return { year, gross, net };
  });
  const cca = data.companies.filter((c) => (c.partnerAccounts ?? 0) > 0);

  return (
    <>
      <PageHeader title="Rémunération" back="/plus" subtitle="Sorties d'argent personnelles (simulation)" action={<RoundButton label="Ajouter" onClick={add}><Plus size={22} /></RoundButton>} />
      <Page>
        {data.withdrawals.length === 0 ? (
          <Empty
            icon={<HandCoins size={26} />}
            title="Aucune sortie prévue"
            text="Remboursement de compte courant, salaire, dividendes… avec votre propre taux de charges/fiscalité."
            action={<Button onClick={add}>Ajouter</Button>}
          />
        ) : (
          <Card className="py-1">
            <Divided>
              {data.withdrawals.map((x) => {
                const c = data.companies.find((cc) => cc.id === x.companyId);
                return (
                  <Row
                    key={x.id}
                    onClick={() => setEditId(x.id)}
                    icon={<HandCoins size={18} />}
                    title={x.label || labelOf(WITHDRAWAL_KINDS, x.kind)}
                    subtitle={`${c?.name ?? "Société ?"} · ${x.startYear ?? y0}${x.endYear ? `–${x.endYear}` : " →"}`}
                    right={`${eur(x.annualAmount)}/an`}
                    rightSub={`net ${eur((x.annualAmount ?? 0) * (1 - (x.taxRatePct ?? 0) / 100))}`}
                  />
                );
              })}
            </Divided>
          </Card>
        )}

        {data.withdrawals.length > 0 && (
          <>
            <SectionTitle>Par année</SectionTitle>
            <Card className="py-2">
              <div className="grid grid-cols-3 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <span>Année</span>
                <span className="text-right">Brut</span>
                <span className="text-right">Net estimé</span>
              </div>
              {perYear.map((r) => (
                <div key={r.year} className="tabular grid grid-cols-3 py-1.5 text-[15px]">
                  <span className="font-medium text-navy">{r.year}</span>
                  <span className="text-right text-ink-2">{eur(r.gross)}</span>
                  <span className="text-right font-semibold text-ink">{eur(r.net)}</span>
                </div>
              ))}
            </Card>
            <p className="mt-2 px-2 text-xs text-muted">
              Les montants bruts sont déduits de la trésorerie des sociétés dans les projections. Aucune règle fiscale automatique : seuls vos taux sont appliqués.
            </p>
          </>
        )}

        {cca.length > 0 && (
          <>
            <SectionTitle>Comptes courants d&apos;associés</SectionTitle>
            <Card className="py-1">
              <Divided>
                {cca.map((c) => {
                  const repaid = data.withdrawals
                    .filter((x) => x.kind === "cca" && x.companyId === c.id && x.annualAmount)
                    .reduce((s, x) => s + (x.annualAmount ?? 0) * ((x.endYear ?? y0 + 30) - (x.startYear ?? y0) + 1), 0);
                  return (
                    <Row
                      key={c.id}
                      title={c.name}
                      subtitle={repaid > 0 ? `Remboursements prévus : ${eur(repaid)}` : "Aucun remboursement prévu"}
                      right={eur(c.partnerAccounts)}
                      rightSub={repaid > (c.partnerAccounts ?? 0) ? "Dépassement du solde" : undefined}
                    />
                  );
                })}
              </Divided>
            </Card>
          </>
        )}
      </Page>

      <Sheet
        open={!!w}
        onClose={() => setEditId(null)}
        title="Sortie d'argent"
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setEditId(null)}>Terminé</Button>
            {w && <ConfirmDelete label="Supprimer" message="Supprimer cette sortie ?" onConfirm={() => { remove("withdrawals", w.id); setEditId(null); }} />}
          </div>
        }
      >
        {w && (
          <Stack>
            <SelectField label="Type" value={w.kind} options={WITHDRAWAL_KINDS} onChange={(v) => set({ kind: v ?? "autre" })} allowEmpty={false} />
            <TextField label="Libellé (facultatif)" value={w.label} onChange={(v) => set({ label: v })} />
            <SelectField label="Société qui verse" value={w.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} />
            <NumberField label="Montant brut annuel" value={w.annualAmount} onChange={(v) => set({ annualAmount: v })} />
            <Grid2>
              <NumberField label="De l'année" suffix="" integer value={w.startYear} onChange={(v) => set({ startYear: v ? Math.round(v) : undefined })} />
              <NumberField label="À l'année" suffix="" integer value={w.endYear} onChange={(v) => set({ endYear: v ? Math.round(v) : undefined })} placeholder="Sans fin" />
            </Grid2>
            <NumberField label="Taux de charges / fiscalité" suffix="%" value={w.taxRatePct} onChange={(v) => set({ taxRatePct: v })} hint="Saisi par vous. Net = brut × (1 − taux)." />
            {w.annualAmount ? (
              <div className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink-2">
                Net estimé : <b className="tabular text-ink">{eur(w.annualAmount * (1 - (w.taxRatePct ?? 0) / 100))}</b> par an ({pct(w.taxRatePct ?? 0)} de prélèvements)
              </div>
            ) : null}
          </Stack>
        )}
      </Sheet>
    </>
  );
}
