"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { KEY_INDICATORS, KEY_STATEMENT_INDICATORS, groupStatementIndicators, keyIndicators, portfolioIndicators, type Indicator } from "@/lib/engine/indicators";
import { IndicatorTile } from "@/components/indicators";
import { Page, PageHeader, SectionTitle } from "@/components/ui";

export default function IndicateursPage() {
  const { data, projection } = useStore();
  const all = useMemo(() => [...keyIndicators(portfolioIndicators(data, projection), KEY_INDICATORS), ...keyIndicators(groupStatementIndicators(data, projection), KEY_STATEMENT_INDICATORS)], [data, projection]);
  const groups = new Map<string, Indicator[]>();
  // Deux blocs lisibles : la dette (ce que regarde d'abord la banque), puis les revenus.
  const section = (i: Indicator) => (i.group === "Comptes annuels" ? i.group : ["gross-yield", "occupancy"].includes(i.id) ? "Revenus" : "Dette");
  for (const i of all) groups.set(section(i), [...(groups.get(section(i)) ?? []), i]);
  const hasStatements = data.statements.length > 0;

  return (
    <>
      <PageHeader title="Indicateurs" back="/plus" subtitle="Ce que regarde un banquier" />
      <Page>
        <div className="flex flex-wrap gap-3 px-1 text-xs text-ink-2">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pos" /> Solide</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warn" /> À surveiller</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-neg" /> Point d&apos;attention</span>
        </div>
        {[...groups.entries()].map(([group, list]) => (
          <div key={group}>
            <SectionTitle>{group}</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {list.map((i) => (
                <IndicatorTile key={i.id} ind={i} />
              ))}
            </div>
          </div>
        ))}
        {!hasStatements && (
          <Link href="/plus/bilans" className="mt-6 flex items-center gap-3 rounded-2xl bg-navy px-4 py-4 text-white">
            <Sparkles size={20} className="text-[#e8d3ad]" />
            <span className="flex-1 text-sm">Saisissez vos bilans pour ajouter la CAF et la capacité de remboursement.</span>
          </Link>
        )}
        <p className="mt-6 px-2 text-center text-xs text-muted">
          Repères indicatifs usuels, pas des critères bancaires officiels. Tous les calculs utilisent vos données enregistrées.
        </p>
      </Page>
    </>
  );
}
