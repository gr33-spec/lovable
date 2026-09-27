"use client";

import { useStore } from "@/lib/store";
import { Card, NumberField, Page, PageHeader, Stack, TextField } from "@/components/ui";

export default function HypothesesPage() {
  const { data, setSettings } = useStore();
  const s = data.settings;
  return (
    <>
      <PageHeader title="Hypothèses" back="/plus" />
      <Page>
        <Card>
          <Stack>
            <TextField label="Nom du groupe (affiché en en-tête et dans le dossier banque)" value={s.groupName} onChange={(v) => setSettings({ groupName: v })} />
            <TextField label="Votre nom (page de couverture du dossier banque)" value={s.ownerName} onChange={(v) => setSettings({ ownerName: v })} />
          </Stack>
        </Card>
        <Card className="mt-4">
          <Stack>
            <NumberField label="Revalorisation annuelle des biens" suffix="%" value={s.valueGrowthPct} onChange={(v) => setSettings({ valueGrowthPct: v })} placeholder="0" />
            <NumberField label="Indexation annuelle des loyers" suffix="%" value={s.rentGrowthPct} onChange={(v) => setSettings({ rentGrowthPct: v })} placeholder="0" />
            <NumberField label="Hausse annuelle des charges" suffix="%" value={s.chargesGrowthPct} onChange={(v) => setSettings({ chargesGrowthPct: v })} placeholder="0" />
          </Stack>
          <p className="mt-4 text-sm text-muted">
            Par défaut 0 % : les projections gardent les valeurs et loyers actuels. Ces taux s&apos;appliquent partout (tableau de bord, chronologie, simulations, dossier banque).
          </p>
        </Card>
      </Page>
    </>
  );
}
