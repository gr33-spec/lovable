"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Building, ValuePoint } from "@/lib/types";
import { eurCompact, eurSigned, pct } from "@/lib/format";
import { latentGain, valueMarks } from "@/lib/engine/history";
import { yearOf } from "@/lib/engine/dates";
import { Button, Card, Grid2, Kpi, NumberField, SectionTitle, Sheet, Stack, TextField, cx } from "./ui";

const SOURCE_LABEL = { achat: "Prix d'achat", historique: "Estimation", actuelle: "Valeur actuelle" } as const;

/** Section « Valeur dans le temps » d'un immeuble. */
export function BuildingValueHistory({ building }: { building: Building }) {
  const { data, nowMonth, upsert } = useStore();
  const year = yearOf(nowMonth);
  const [editing, setEditing] = useState<{ index: number; point: ValuePoint } | null>(null);
  const marks = valueMarks(data, building, year);
  const g = latentGain(data, building, year);
  const history = building.valueHistory ?? [];

  const save = (index: number, point: ValuePoint) => {
    const list = [...history];
    if (index >= 0) list[index] = point;
    else list.push(point);
    upsert("buildings", { ...building, valueHistory: list.sort((a, b) => a.year - b.year) });
  };
  const del = (index: number) => {
    upsert("buildings", { ...building, valueHistory: history.filter((_, i) => i !== index) });
    setEditing(null);
  };

  const max = Math.max(...marks.map((m) => m.value), 1);

  return (
    <>
      <SectionTitle
        action={
          <button onClick={() => setEditing({ index: -1, point: { year: year - 1, value: 0 } })} className="flex items-center gap-1 text-sm font-semibold text-series-1">
            <Plus size={15} /> Valeur passée
          </button>
        }
      >
        Valeur dans le temps
      </SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Kpi
            label="Plus-value latente"
            value={g.gain === undefined ? <span className="text-[15px] text-muted">Données insuffisantes</span> : eurSigned(g.gain)}
            tone={g.gain === undefined ? undefined : g.gain >= 0 ? "pos" : "neg"}
            hint={g.gainPct !== undefined ? `${g.gainPct >= 0 ? "+" : ""}${pct(g.gainPct)} vs prix d'achat` : !g.purchase ? "Prix d'achat manquant" : "Valeur actuelle manquante"}
          />
          <Kpi label="Évolution annuelle" value={g.cagrPct !== undefined ? `${g.cagrPct >= 0 ? "+" : ""}${pct(g.cagrPct)}` : "—"} hint="moyenne depuis l'achat" />
        </div>
        {marks.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {marks.map((m) => {
              const idx = m.source === "historique" ? history.findIndex((h) => h.year === m.year) : -1;
              return (
                <button
                  key={`${m.year}-${m.source}`}
                  disabled={idx < 0}
                  onClick={() => idx >= 0 && setEditing({ index: idx, point: history[idx] })}
                  className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                >
                  <span className="tabular w-11 text-[14px] font-bold text-navy">{m.year}</span>
                  <span className="relative h-6 flex-1 overflow-hidden rounded-lg bg-soft">
                    <span
                      className={cx("absolute inset-y-0 left-0 rounded-lg", m.source === "achat" ? "bg-[#b08d57]/45" : m.source === "actuelle" ? "bg-series-1/70" : "bg-series-1/35")}
                      style={{ width: `${Math.max(3, (m.value / max) * 100)}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-ink-2">{SOURCE_LABEL[m.source]}</span>
                  </span>
                  <span className="tabular w-20 text-right text-[14px] font-semibold text-ink">{eurCompact(m.value)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted">Renseignez le prix et la date d&apos;acquisition, puis les estimations passées si vous les avez.</div>
        )}
        {g.current !== undefined && !history.some((h) => h.year === year) && (
          <button
            onClick={() => save(-1, { year, value: g.current!, note: "Valeur enregistrée" })}
            className="mt-4 text-sm font-semibold text-series-1"
          >
            Figer la valeur actuelle ({eurCompact(g.current)}) pour {year}
          </button>
        )}
      </Card>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && editing.index >= 0 ? "Valeur passée" : "Ajouter une valeur passée"}
        footer={
          <div className="space-y-2">
            <Button
              full
              disabled={!editing || !editing.point.value || !editing.point.year || editing.point.year > year}
              onClick={() => {
                if (editing) save(editing.index, editing.point);
                setEditing(null);
              }}
            >
              Enregistrer
            </Button>
            {editing && editing.index >= 0 && (
              <Button full variant="danger" icon={<Trash2 size={16} />} onClick={() => del(editing.index)}>
                Supprimer
              </Button>
            )}
          </div>
        }
      >
        {editing && (
          <Stack>
            <Grid2>
              <NumberField label="Année" suffix="" integer value={editing.point.year} onChange={(v) => setEditing({ ...editing, point: { ...editing.point, year: v ? Math.round(v) : 0 } })} />
              <NumberField label="Valeur estimée" value={editing.point.value || undefined} onChange={(v) => setEditing({ ...editing, point: { ...editing.point, value: v ?? 0 } })} />
            </Grid2>
            <TextField label="Source" value={editing.point.note} placeholder="Ex. estimation agence, expertise banque" onChange={(v) => setEditing({ ...editing, point: { ...editing.point, note: v } })} />
            <p className="text-[13px] text-muted">
              La valeur la plus récente saisie pour une année est conservée jusqu&apos;à la suivante.
            </p>
          </Stack>
        )}
      </Sheet>
    </>
  );
}
