"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { companyTree } from "@/lib/engine/snapshot";
import { statementRatios } from "@/lib/engine/indicators";
import { eurCompact } from "@/lib/format";
import { BilanImport } from "@/components/bilans";
import { Avatar, Button, Card, Page, PageHeader, Pill, RoundButton, SectionTitle, Sheet, cx } from "@/components/ui";

export default function BilansPage() {
  const { data } = useStore();
  const [importFor, setImportFor] = useState<string | null>(null);
  const companies = companyTree(data.companies).map(({ company }) => company);
  const colorIndex = (id: string) => data.companies.filter((x) => x.kind !== "holding").findIndex((x) => x.id === id);

  return (
    <>
      <PageHeader title="Bilans" back="/plus" subtitle="Comptes annuels de chaque structure" action={<RoundButton label="Importer un bilan" onClick={() => setImportFor("")}><Plus size={22} /></RoundButton>} />
      <Page>
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-brand">
              <FileText size={20} />
            </span>
            <div className="flex-1 text-sm text-ink-2">
              <div className="text-[16px] font-bold text-ink">Ajouter un bilan</div>
              Saisissez les montants et joignez le PDF si vous voulez le garder. Trésorerie, comptes courants, indicateurs et dossier banque sont mis à jour. Plusieurs bilans d&apos;un coup : import JSON dans Plus › Sauvegardes.
            </div>
          </div>
          <div className="mt-4">
            <Button full onClick={() => setImportFor("")} icon={<Plus size={18} />}>
              Nouveau bilan
            </Button>
          </div>
        </Card>

        {companies.map((c) => {
          const list = data.statements.filter((s) => s.companyId === c.id).sort((a, b) => b.year - a.year);
          return (
            <div key={c.id}>
              <SectionTitle action={<button onClick={() => setImportFor(c.id)} className="text-sm font-semibold text-series-1">+ Ajouter</button>}>
                <span className="flex items-center gap-2">
                  {c.kind !== "holding" && <Avatar id={c.id} name={c.name} size={26} square index={colorIndex(c.id)} />}
                  {c.name}
                </span>
              </SectionTitle>
              {list.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted">Aucun bilan pour l&apos;instant.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {list.map((s) => {
                    const r = statementRatios(s.figures);
                    return (
                      <Link key={s.id} href={`/plus/bilans/${s.id}`} className="soft-card rounded-[20px] p-3.5 active:scale-[0.99]">
                        <div className="flex items-center justify-between">
                          <span className="text-[17px] font-extrabold text-navy">{s.year}</span>
                          {s.source === "ia" ? <Pill tone="blue">IA</Pill> : <Pill>Saisi</Pill>}
                        </div>
                        <div className="mt-2 text-[11px] text-muted">Résultat net</div>
                        <div className={cx("tabular text-[15px] font-bold", (s.figures.netResult ?? 0) < 0 ? "text-neg" : "text-ink")}>
                          {eurCompact(s.figures.netResult)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted">CAF {eurCompact(r.caf)}</div>
                        {s.fileId && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-series-1">
                            <FileText size={11} /> PDF joint
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Page>

      <Sheet open={importFor !== null} onClose={() => setImportFor(null)} title="Nouveau bilan">
        {importFor !== null && <BilanImport companyId={importFor || undefined} onDone={() => setImportFor(null)} />}
      </Sheet>
    </>
  );
}
