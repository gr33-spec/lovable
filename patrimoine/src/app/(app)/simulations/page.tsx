"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, CircleCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Action, Scenario } from "@/lib/types";
import { yearOf } from "@/lib/engine/dates";
import { ACTION_ICONS, ACTION_LABELS, actionSummary, defaultAction } from "@/components/action-form";
import { Button, Card, Divided, Empty, Page, PageHeader, Pill, Row, RoundButton, SectionTitle, Sheet, ConfirmDelete } from "@/components/ui";

export default function SimulationsPage() {
  const { data, nowMonth, upsert, remove } = useStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const y0 = yearOf(nowMonth);
  const names = {
    building: (id?: string | null) => data.buildings.find((b) => b.id === id)?.name,
    loan: (id: string) => {
      const l = data.loans.find((x) => x.id === id);
      return l ? l.name || l.bank : undefined;
    },
  };

  const create = (type: Action["type"]) => {
    const action = defaultAction(type, y0, data);
    const scenario: Scenario = {
      id: newId(),
      name: ACTION_LABELS[type],
      actions: [action],
      createdAt: new Date().toISOString(),
    };
    upsert("scenarios", scenario);
    setCreating(false);
    router.push(`/simulations/${scenario.id}`);
  };

  return (
    <>
      <PageHeader title="Simulations" subtitle="Sans toucher à vos données réelles" action={<RoundButton label="Nouveau scénario" onClick={() => setCreating(true)}><Plus size={22} /></RoundButton>} />
      <Page>
        {data.scenarios.length === 0 ? (
          <Empty
            icon={<FlaskConical size={26} />}
            title="Aucun scénario"
            text="Testez une vente, un refinancement, un achat… et comparez avant / après."
            action={<Button onClick={() => setCreating(true)} icon={<Plus size={18} />}>Nouveau scénario</Button>}
          />
        ) : (
          <div className="space-y-3">
            {data.scenarios.map((s) => (
              <Card key={s.id} onClick={() => router.push(`/simulations/${s.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-semibold text-navy">{s.name}</div>
                    <div className="mt-1 space-y-0.5 text-sm text-ink-2">
                      {s.actions.slice(0, 3).map((a) => (
                        <div key={a.id} className="truncate">• {actionSummary(a, names)}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {s.appliedAt && <Pill tone="pos">Intégré</Pill>}
                    {s.includeInExport && <Pill tone="blue">Dossier banque</Pill>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {data.plans.length > 0 && (
          <>
            <SectionTitle>Opérations intégrées aux données réelles</SectionTitle>
            <Card className="py-1">
              <Divided>
                {data.plans.map((a) => (
                  <div key={a.id} className="py-2">
                    <Row icon={<CircleCheck size={18} />} title={actionSummary(a, names)} subtitle="Prise en compte dans toutes les projections" />
                    <ConfirmDelete label="Retirer" message="Retirer cette opération des données réelles ?" onConfirm={() => remove("plans", a.id)} />
                  </div>
                ))}
              </Divided>
            </Card>
          </>
        )}
      </Page>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Que voulez-vous simuler ?">
        <div className="space-y-2 pb-2">
          {(Object.keys(ACTION_LABELS) as Action["type"][]).map((t) => (
            <button key={t} onClick={() => create(t)} className="flex w-full items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left shadow-sm active:scale-[0.99]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-soft text-navy">{ACTION_ICONS[t]}</span>
              <span className="text-[16px] font-semibold text-ink">{ACTION_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
