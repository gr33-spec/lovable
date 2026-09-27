"use client";

import { useState } from "react";
import { Hammer, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { WORK_STATUSES, labelOf } from "@/lib/labels";
import { eur, eurCompact } from "@/lib/format";
import { WorkForm } from "@/components/forms";
import { QuickWork } from "@/components/quick-add";
import { Button, Card, ConfirmDelete, Divided, Empty, Page, PageHeader, Pill, Row, RoundButton, SectionTitle, Sheet } from "@/components/ui";

export default function TravauxPage() {
  const { data, remove } = useStore();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const work = data.works.find((w) => w.id === editId);
  const groups = new Map<string, typeof data.works>();
  for (const w of [...data.works].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))) {
    const key = w.status === "termine" ? "Terminés" : w.year ? String(w.year) : "Sans année";
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  const place = (w: (typeof data.works)[number]) => {
    const b = data.buildings.find((x) => x.id === w.buildingId);
    const u = data.units.find((x) => x.id === w.unitId);
    const c = data.companies.find((x) => x.id === (b?.companyId ?? w.companyId));
    return [u?.name, b?.name, c?.name].filter(Boolean).join(" · ");
  };
  const upcoming = data.works.filter((w) => w.status !== "termine").reduce((s, w) => s + (w.amount ?? 0), 0);

  return (
    <>
      <PageHeader title="Travaux" back="/plus" subtitle={`${eurCompact(upcoming)} programmés`} action={<RoundButton label="Ajouter" onClick={() => setAdding(true)}><Plus size={22} /></RoundButton>} />
      <Page>
        {data.works.length === 0 ? (
          <Empty icon={<Hammer size={26} />} title="Aucun travaux" text="Les travaux prévus apparaissent dans la chronologie et les projections de trésorerie." action={<Button onClick={() => setAdding(true)}>Ajouter des travaux</Button>} />
        ) : (
          [...groups.entries()].map(([key, list]) => (
            <div key={key}>
              <SectionTitle action={<span className="tabular text-sm font-semibold text-ink-2">{eur(list.reduce((s, w) => s + (w.amount ?? 0), 0))}</span>}>{key}</SectionTitle>
              <Card className="py-1">
                <Divided>
                  {list.map((w) => (
                    <Row
                      key={w.id}
                      onClick={() => setEditId(w.id)}
                      icon={<Hammer size={18} />}
                      title={
                        <span className="flex items-center gap-2">
                          {w.label}
                          {w.priority === "haute" && <Pill tone="neg">Prioritaire</Pill>}
                        </span>
                      }
                      subtitle={`${labelOf(WORK_STATUSES, w.status ?? "prevu")}${place(w) ? ` · ${place(w)}` : ""}`}
                      right={eur(w.amount)}
                    />
                  ))}
                </Divided>
              </Card>
            </div>
          ))
        )}
      </Page>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Nouveaux travaux">
        <QuickWork onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet
        open={!!work}
        onClose={() => setEditId(null)}
        title="Travaux"
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setEditId(null)}>Terminé</Button>
            {work && <ConfirmDelete label="Supprimer" message="Supprimer ces travaux ?" onConfirm={() => { remove("works", work.id); setEditId(null); }} />}
          </div>
        }
      >
        {work && <WorkForm work={work} />}
      </Sheet>
    </>
  );
}
