"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { latentGains, valueHistory } from "@/lib/engine/history";
import { yearOf } from "@/lib/engine/dates";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { Card, Divided, Empty, Kpi, Page, PageHeader, Row, SectionTitle } from "@/components/ui";

export default function HistoriquePage() {
  const { data, nowMonth } = useStore();
  const year = yearOf(nowMonth);
  const rows = useMemo(() => valueHistory(data, year), [data, year]);
  const gains = useMemo(() => latentGains(data, year), [data, year]);
  const complete = rows.filter((r) => r.missing === 0 && r.owned > 0);

  return (
    <>
      <PageHeader title="Historique" back="/plus" subtitle="Valeurs passées et plus-values latentes" />
      <Page>
        {data.buildings.length === 0 ? (
          <Empty icon={<Building2 size={26} />} title="Aucun immeuble" text="Ajoutez vos immeubles avec leur prix et date d'acquisition." />
        ) : (
          <>
            <div className="hero-card rounded-[28px] p-5 text-white">
              <div className="text-[13px] text-white/65">Plus-value latente totale</div>
              <div className="tabular text-[34px] font-extrabold leading-tight tracking-[-0.02em]">
                {gains.known > 0 ? eurSigned(gains.gain) : <span className="text-xl text-white/75">Données insuffisantes</span>}
              </div>
              {gains.known > 0 && (
                <div className="mt-1 text-[13px] text-white/60">
                  {gains.gainPct !== undefined && `${gains.gainPct >= 0 ? "+" : ""}${pct(gains.gainPct)} sur ${eurCompact(gains.purchase)} d'achat`}
                  {gains.missing > 0 && ` · ${gains.missing} bien(s) non comptés (prix d'achat ou valeur manquant)`}
                </div>
              )}
            </div>

            <SectionTitle>Valeur des biens, année par année</SectionTitle>
            <Card>
              {complete.length >= 2 ? (
                <LineChart years={complete.map((r) => r.year)} series={[{ label: "Valeur des biens", values: complete.map((r) => r.value), color: "var(--brand)" }]} />
              ) : (
                <div className="py-6 text-center text-sm text-muted">
                  Données insuffisantes : renseignez les dates et prix d&apos;acquisition (et les valeurs passées connues) de chaque immeuble.
                </div>
              )}
              {rows.some((r) => r.missing > 0) && (
                <div className="mt-2 text-xs text-warn">
                  Années incomplètes non tracées ({rows.filter((r) => r.missing > 0).map((r) => r.year).slice(0, 8).join(", ")}
                  {rows.filter((r) => r.missing > 0).length > 8 ? "…" : ""}) : un immeuble détenu n&apos;a pas de valeur connue.
                </div>
              )}
              <div className="mt-1 text-xs text-muted">Entre deux valeurs connues, la dernière valeur saisie est conservée (aucune interpolation).</div>
            </Card>

            <SectionTitle>Par immeuble</SectionTitle>
            <Card className="py-1">
              <Divided>
                {gains.lines.map((l) => (
                  <Row
                    key={l.building.id}
                    href={`/patrimoine/immeuble/${l.building.id}`}
                    icon={<Building2 size={18} />}
                    title={l.building.name}
                    subtitle={l.purchase ? `Achat ${eur(l.purchase)}${l.current !== undefined ? ` · valeur ${eurCompact(l.current)}` : ""}` : "Prix d'achat manquant"}
                    right={l.gain === undefined ? "—" : <span className={l.gain >= 0 ? "text-pos" : "text-neg"}>{eurSigned(l.gain)}</span>}
                    rightSub={l.gainPct !== undefined ? `${l.gainPct >= 0 ? "+" : ""}${pct(l.gainPct)}${l.cagrPct !== undefined ? ` · ${pct(l.cagrPct)}/an` : ""}` : undefined}
                  />
                ))}
              </Divided>
            </Card>
            <Card className="mt-4">
              <Kpi label="Prix d'achat cumulé (immeubles comptés)" value={eur(gains.purchase)} />
            </Card>
            <p className="mt-6 px-2 text-center text-xs text-muted">Plus-value latente = valeur estimée actuelle − prix d&apos;achat, avant frais, travaux et fiscalité.</p>
          </>
        )}
      </Page>
    </>
  );
}
