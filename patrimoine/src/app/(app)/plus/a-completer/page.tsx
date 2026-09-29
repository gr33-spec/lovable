"use client";

import Link from "next/link";
import { Building2, ChevronRight, CircleCheck, Landmark, Briefcase, ListChecks } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePageState } from "@/lib/nav";
import { PRIORITY_LABEL, issueCounts, qualityIssues, type Priority, type QualityIssue } from "@/lib/engine/quality";
import { Card, Empty, Page, PageHeader, cx } from "@/components/ui";

// Ce qui manque vraiment, par priorité puis par élément (bien, crédit,
// société) : une ligne métier par sujet, pas une liste de champs vides.

const HINT: Record<Priority, string> = {
  important: "Un chiffre affiché serait faux ou manquant (cash-flow, mensualités, valeur) : à traiter avant d'envoyer un dossier.",
  utile: "Précise ou justifie les chiffres : pièces, dates, nature des biens, tableaux de la banque.",
  optionnel: "Confort : sans effet sur les montants.",
};

const ICON = { bien: <Building2 size={17} />, credit: <Landmark size={17} />, societe: <Briefcase size={17} />, autre: <ListChecks size={17} /> };

export default function ACompleterPage() {
  const { data, projection } = useStore();
  const issues = qualityIssues(data, projection.snapshot);
  const counts = issueCounts(issues);
  const first = (["important", "utile", "optionnel"] as Priority[]).find((p) => counts[p] > 0) ?? "important";
  const [tab, setTab] = usePageState<Priority>("priorite", first);
  const list = issues.filter((i) => i.priority === tab);
  const groups = new Map<string, { group: QualityIssue["group"]; items: QualityIssue[] }>();
  for (const i of list) {
    const g = groups.get(i.group.key) ?? { group: i.group, items: [] };
    g.items.push(i);
    groups.set(i.group.key, g);
  }

  return (
    <>
      <PageHeader title="À compléter" back subtitle={issues.length ? "Ce qui manque, par ordre d'importance" : "Tout est renseigné"} />
      <Page>
        {data.buildings.length === 0 && data.loans.length === 0 && data.companies.length === 0 ? (
          <Empty icon={<CircleCheck size={26} />} title="Rien à compléter pour l'instant" text="Ajoutez vos sociétés, immeubles et crédits : ce qui manque pour des chiffres fiables apparaîtra ici." />
        ) : issues.length === 0 ? (
          <Empty icon={<CircleCheck size={26} />} title="Tout est renseigné" text="Les chiffres reposent sur des données complètes." />
        ) : (
          <>
            <div className="flex gap-2" role="tablist">
              {(["important", "utile", "optionnel"] as Priority[]).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={tab === p}
                  onClick={() => setTab(p)}
                  className={cx("flex flex-1 flex-col items-center rounded-2xl py-2.5 transition", tab === p ? "bg-brand text-on-brand shadow-sm" : "bg-card text-ink-2 shadow-sm")}
                >
                  <span className="tabular text-[20px] font-extrabold leading-none">{counts[p]}</span>
                  <span className="mt-1 text-[12.5px] font-semibold">{PRIORITY_LABEL[p]}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 mt-3 px-1 text-[13px] text-muted">{HINT[tab]}</p>
            {list.length === 0 ? (
              <Card>
                <div className="flex items-center gap-2 text-[14px] font-semibold text-pos">
                  <CircleCheck size={18} /> Rien à signaler dans cette catégorie.
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...groups.values()].map(({ group, items }) => (
                  <Card key={group.key} className="py-1">
                    <div className="flex items-center gap-2 pb-1 pt-3 text-[14.5px] font-semibold text-ink">
                      <span className="text-brand">{ICON[group.kind]}</span>
                      <span className="min-w-0 flex-1 truncate">{group.name}</span>
                      {items.length > 1 && <span className="text-[12.5px] font-medium text-muted">{items.length}</span>}
                    </div>
                    <div className="divide-y divide-line">
                      {items.map((i) => (
                        <Link key={i.id} href={i.href} className="flex items-center gap-3 py-2.5">
                          <span className={cx("h-2 w-2 shrink-0 rounded-full", i.priority === "important" ? "bg-neg" : i.priority === "utile" ? "bg-warn" : "bg-black/20")} />
                          <span className="min-w-0 flex-1">
                            {i.label !== group.name && <span className="block truncate text-[12.5px] font-medium text-ink-2">{i.label.replace(`${group.name} · `, "")}</span>}
                            <span className="block text-[13.5px] leading-snug text-ink">{i.detail}</span>
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-muted" />
                        </Link>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Page>
    </>
  );
}
