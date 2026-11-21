"use client";

import { Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PROPERTY_KINDS, PROPERTY_USAGES, assetMix, biens, kindLabel, suggestNature, usageLabel } from "@/lib/assets";
import type { Building, PropertyKind, PropertyUsage } from "@/lib/types";
import { toast } from "@/components/swipe";
import { Card } from "@/components/ui";

// Nature et usage des biens, à préciser avant d'envoyer un dossier : le PDF
// ne parle d'« immeubles » que pour les biens déclarés comme tels. Les
// suggestions tirées des noms ne sont appliquées que sur demande.

const selectCls = "w-full min-w-0 rounded-xl border border-line bg-card px-2.5 py-2 text-[13.5px] text-ink";

export function AssetsNature() {
  const { data, projection, upsert, upsertMany, role } = useStore();
  const rented = (b: Building) => (projection.snapshot.byBuilding.get(b.id)?.rentMonthly ?? 0) > 0;
  const todo = data.buildings.filter((b) => !b.kind || (!b.usage && !rented(b)));
  const mix = assetMix(data.buildings);
  if (data.buildings.length === 0) return null;

  const suggestions = todo
    .map((b) => {
      const s = suggestNature(b.name);
      const patch: Partial<Building> = {};
      if (!b.kind && s.kind) patch.kind = s.kind;
      if (!b.usage && s.usage) patch.usage = s.usage;
      return { b, patch };
    })
    .filter((x) => Object.keys(x.patch).length > 0);

  return (
    <Card className="mb-3">
      <div className="text-[14.5px] font-semibold text-ink">Nature des biens</div>
      <p className="mt-1 text-[13px] text-ink-2">
        {biens(mix.total)} : {mix.text}.
      </p>
      {todo.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-pos">Tout est précisé : le dossier nomme chaque bien correctement.</p>
      ) : (
        <>
          <p className="mt-2 text-[12.5px] text-muted">Précisez le type et l&apos;usage : le dossier ne dira « immeuble » que pour un immeuble, et présentera la résidence principale à part.</p>
          <div className="mt-2 divide-y divide-line">
            {todo.map((b) => {
              const s = suggestNature(b.name);
              const hint = [!b.kind && s.kind ? kindLabel(s.kind) : "", !b.usage && s.usage ? usageLabel(s.usage) : ""].filter(Boolean).join(" · ");
              return (
                <div key={b.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[14px] font-medium text-ink">{b.name}</span>
                    {hint && <span className="shrink-0 text-[12px] text-muted">Suggestion : {hint}</span>}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <select aria-label={`Type de ${b.name}`} className={selectCls} value={b.kind ?? ""} disabled={role === "lecture"} onChange={(e) => upsert("buildings", { ...b, kind: (e.target.value || undefined) as PropertyKind | undefined })}>
                      <option value="">Type à préciser</option>
                      {PROPERTY_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <select aria-label={`Usage de ${b.name}`} className={selectCls} value={b.usage ?? ""} disabled={role === "lecture"} onChange={(e) => upsert("buildings", { ...b, usage: (e.target.value || undefined) as PropertyUsage | undefined })}>
                      <option value="">Usage à préciser</option>
                      {PROPERTY_USAGES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          {suggestions.length > 0 && role !== "lecture" && (
            <button
              type="button"
              onClick={() => {
                upsertMany(suggestions.map(({ b, patch }) => ({ coll: "buildings" as const, item: { ...b, ...patch } })));
                toast(`${suggestions.length} bien(s) précisé(s) d'après leur nom : vérifiez-les ci-dessus.`);
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-soft py-2.5 text-[13.5px] font-semibold text-brand"
            >
              <Wand2 size={16} /> Appliquer les suggestions ({suggestions.length})
            </button>
          )}
        </>
      )}
    </Card>
  );
}
