"use client";

import { useState } from "react";
import { Flag, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { LifeEvent } from "@/lib/types";
import { eur } from "@/lib/format";
import { yearOf } from "@/lib/engine/dates";
import { useCompanyOptions } from "@/components/forms";
import { Button, Card, ConfirmDelete, Divided, Empty, Grid2, NumberField, Page, PageHeader, Row, RoundButton, SelectField, Sheet, Stack, TextField } from "@/components/ui";

export default function EvenementsPage() {
  const { data, upsert, remove, nowMonth } = useStore();
  const companies = useCompanyOptions();
  const [editId, setEditId] = useState<string | null>(null);
  const event = data.events.find((e) => e.id === editId);
  const add = () => {
    const e: LifeEvent = { id: newId(), year: yearOf(nowMonth) + 1, label: "Nouvel événement" };
    upsert("events", e);
    setEditId(e.id);
  };
  const set = (patch: Partial<LifeEvent>) => event && upsert("events", { ...event, ...patch });
  const sorted = [...data.events].sort((a, b) => a.year - b.year);
  return (
    <>
      <PageHeader title="Événements" back="/plus" subtitle="Repères affichés dans la chronologie" action={<RoundButton label="Ajouter" onClick={add}><Plus size={22} /></RoundButton>} />
      <Page>
        {sorted.length === 0 ? (
          <Empty icon={<Flag size={26} />} title="Aucun événement" text="Ex. renouvellement d'un bail, départ à la retraite, transmission…" action={<Button onClick={add}>Ajouter un événement</Button>} />
        ) : (
          <Card className="py-1">
            <Divided>
              {sorted.map((e) => (
                <Row key={e.id} onClick={() => setEditId(e.id)} icon={<Flag size={18} />} title={e.label} subtitle={String(e.year)} right={e.amount ? eur(e.amount) : undefined} />
              ))}
            </Divided>
          </Card>
        )}
      </Page>
      <Sheet
        open={!!event}
        onClose={() => setEditId(null)}
        title="Événement"
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setEditId(null)}>Terminé</Button>
            {event && <ConfirmDelete label="Supprimer" message="Supprimer cet événement ?" onConfirm={() => { remove("events", event.id); setEditId(null); }} />}
          </div>
        }
      >
        {event && (
          <Stack>
            <TextField label="Intitulé" value={event.label} onChange={(v) => set({ label: v ?? "" })} />
            <Grid2>
              <NumberField label="Année" suffix="" integer value={event.year} onChange={(v) => v && set({ year: Math.round(v) })} />
              <NumberField label="Montant (facultatif)" value={event.amount} onChange={(v) => set({ amount: v })} />
            </Grid2>
            <SelectField label="Société concernée" value={event.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} emptyLabel="Groupe / aucune" />
          </Stack>
        )}
      </Sheet>
    </>
  );
}
