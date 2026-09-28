"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { eur } from "@/lib/format";
import { cleanLotNote, swappedNames } from "@/lib/renumber";
import { toast } from "@/components/swipe";
import { Button, SelectField, Sheet } from "@/components/ui";

// Échange des numéros de deux lots d'un immeuble (erreur de numérotation) :
// seuls les noms changent, locataires, baux et loyers restent en place.

export function SwapLotsSheet({ units, open, onClose }: { units: Unit[]; open: boolean; onClose: () => void }) {
  const { data, upsertMany } = useStore();
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const ua = units.find((u) => u.id === a);
  const ub = units.find((u) => u.id === b);
  const names = ua && ub ? swappedNames(ua, ub) : undefined;
  const label = (u: Unit) => {
    const tenant = u.status === "vacant" ? "vacant" : [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" ");
    return [u.name, tenant, u.rent ? eur(u.rent) : undefined].filter(Boolean).join(" · ");
  };
  const options = units.map((u) => ({ value: u.id, label: label(u) }));

  const swap = () => {
    if (!ua || !ub || !names) return;
    const tenancies = data.tenancies.filter((t) => t.unitId === ua.id || t.unitId === ub.id);
    const updated = tenancies.map((t) => cleanLotNote(t, t.unitId === ua.id ? names[0] : names[1])).filter((t, i) => t !== tenancies[i]);
    upsertMany([
      { coll: "units", item: { ...ua, name: names[0] } as Unit },
      { coll: "units", item: { ...ub, name: names[1] } as Unit },
      ...updated.map((t) => ({ coll: "tenancies" as const, item: t })),
    ]);
    toast(`Numéros échangés : ${names[0]} ↔ ${names[1]}`, () =>
      upsertMany([
        { coll: "units", item: ua },
        { coll: "units", item: ub },
        ...tenancies.filter((t) => updated.some((u) => u.id === t.id)).map((t) => ({ coll: "tenancies" as const, item: t })),
      ]),
    );
    setA(undefined);
    setB(undefined);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Échanger deux numéros de lot"
      footer={
        <Button full disabled={!names || a === b} onClick={swap} icon={<ArrowLeftRight size={18} />}>
          Échanger les numéros
        </Button>
      }
    >
      <div className="space-y-3 pb-2">
        <p className="text-[14px] text-ink-2">
          Pour corriger une erreur de numérotation : seuls les numéros changent. Chaque locataire garde son logement, son bail, son loyer, ses garants et ses documents.
        </p>
        <SelectField label="Premier lot" value={a} options={options} onChange={setA} />
        <SelectField label="Second lot" value={b} options={options.filter((o) => o.value !== a)} onChange={setB} />
        {ua && ub && names && (
          <div className="rounded-2xl bg-soft px-4 py-3 text-[14px] text-ink">
            <div>
              {label(ua)} <span className="text-muted">devient</span> <b>{names[0]}</b>
            </div>
            <div className="mt-1">
              {label(ub)} <span className="text-muted">devient</span> <b>{names[1]}</b>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
