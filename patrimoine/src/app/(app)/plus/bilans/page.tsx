"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { companyTree } from "@/lib/engine/snapshot";
import { statementRatios } from "@/lib/engine/indicators";
import { eurCompact } from "@/lib/format";
import { BilanImport } from "@/components/bilans";
import { Avatar, Card, Page, PageHeader, Pill, RoundButton, SectionTitle, Sheet, cx } from "@/components/ui";

export default function BilansPage() {
  const { data } = useStore();
  const [importFor, setImportFor] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/bilans/status")
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((j) => alive && setAiOn(Boolean(j.ai)))
      .catch(() => alive && setAiOn(false));
    return () => {
      alive = false;
    };
  }, []);
  const companies = companyTree(data.companies).map(({ company }) => company);
  const colorIndex = (id: string) => data.companies.filter((x) => x.kind !== "holding").findIndex((x) => x.id === id);

  return (
    <>
      <PageHeader title="Bilans" back="/plus" subtitle="Comptes annuels de chaque structure" action={<RoundButton label="Importer un bilan" onClick={() => setImportFor("")}><Plus size={22} /></RoundButton>} />
      <Page>
        <div className="hero-card rounded-[26px] p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#e8d3ad]">
              <Sparkles size={22} />
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-bold">Import intelligent</div>
              <div className="text-sm text-white/70">
                Déposez le PDF d&apos;un bilan : les chiffres sont lus automatiquement, vous vérifiez, puis tout est mis à jour (trésorerie, comptes courants, indicateurs, dossier banque).
              </div>
            </div>
          </div>
          <button onClick={() => setImportFor("")} className="mt-4 w-full rounded-2xl bg-white py-3 text-[15px] font-semibold text-navy active:scale-[0.99]">
            Importer un bilan PDF
          </button>
          {aiOn === false && <div className="mt-3 text-xs text-[#f5d9a8]">Lecture automatique à activer (voir en bas de page). En attendant, la saisie manuelle fonctionne.</div>}
        </div>

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

        <SectionTitle>Activer l&apos;analyse IA</SectionTitle>
        <Card className="text-sm text-ink-2">
          {aiOn ? (
            <div className="text-pos">Lecture automatique active.</div>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Créez une clé sur <b>console.anthropic.com</b> → API Keys → Create Key (quelques centimes par bilan analysé).</li>
              <li>Dans Vercel : projet <b>patrimoine</b> → Settings → Environment Variables → ajoutez <b>ANTHROPIC_API_KEY</b> avec cette clé.</li>
              <li>Deployments → ⋯ → Redeploy.</li>
            </ol>
          )}
          <p className="mt-3 text-xs text-muted">
            L&apos;IA ne fait que lire les montants présents dans le document ; rien n&apos;est enregistré sans votre validation. Les PDF restent stockés dans votre base privée.
          </p>
        </Card>
      </Page>

      <Sheet open={importFor !== null} onClose={() => setImportFor(null)} title="Importer un bilan">
        {importFor !== null && <BilanImport companyId={importFor || undefined} onDone={() => setImportFor(null)} />}
      </Sheet>
    </>
  );
}
