"use client";

import { DocumentsCard } from "@/components/documents/library";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, DoorOpen, Hammer, KeyRound, UserPlus, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { activeTenancy, tenantsName, unitRemovals } from "@/lib/tenancy";
import { buildingCrumbs } from "@/lib/crumbs";
import { goBack } from "@/lib/nav";
import { CONDITIONS, UNIT_TYPES, WORK_STATUSES, labelOf } from "@/lib/labels";
import { dateFr, eur, num } from "@/lib/format";
import { Card, ConfirmDelete, Empty, Grid2, NumberField, Page, PageHeader, SectionTitle, SelectField, Stack, TextField } from "../ui";

// Fiche du lot dans Patrimoine : le bien lui-même (description, confort,
// énergie, état, valeur), entièrement modifiable. La location (locataire,
// bail, loyers encaissés) se gère dans Gestion : le locataire en place est
// affiché et mène à son dossier.

const DPE = (["A", "B", "C", "D", "E", "F", "G"] as const).map((c) => ({ value: c, label: c }));
const WHO = [
  { value: "individuel", label: "Individuel" },
  { value: "collectif", label: "Collectif" },
] as const;

export function LotSheet({ id }: { id: string }) {
  const { data, upsert, removeMany, role } = useStore();
  const router = useRouter();
  const unit = data.units.find((u) => u.id === id);
  if (!unit) {
    return (
      <>
        <PageHeader title="Lot" back="/patrimoine" />
        <Empty title="Lot introuvable" text="Il a peut-être été supprimé." />
      </>
    );
  }
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const set = (patch: Partial<Unit>) => upsert("units", { ...unit, ...patch });
  const active = activeTenancy(data, unit.id);
  const vacant = unit.status === "vacant";
  const tenant = tenantsName(active) || [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  const since = active?.startDate ?? unit.entryDate ?? unit.leaseStart;
  const rentalHref = `/patrimoine/logement/${unit.id}?depuis=gestion`;
  const works = data.works.filter((w) => w.unitId === unit.id);
  const back = building ? `/patrimoine/immeuble/${building.id}` : "/patrimoine";
  const summary = [labelOf(UNIT_TYPES, unit.type), unit.surface ? `${num(unit.surface)} m²` : undefined, unit.mainRooms ? `${unit.mainRooms} pièce${unit.mainRooms > 1 ? "s" : ""}` : undefined, unit.floor ? `étage ${unit.floor}` : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader title={unit.name} crumbs={buildingCrumbs(data, building)} subtitle={summary || undefined} back={back} />
      <Page>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
          <div className="min-w-0">
            {/* Occupation : lecture seule ici, la location se gère dans Gestion. */}
            <Link href={vacant ? `/patrimoine/logement/${unit.id}/changement?depuis=gestion` : rentalHref} className="hero-card flex items-center gap-4 rounded-[28px] p-5 text-white active:scale-[0.99]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold">{vacant ? <UserPlus size={22} /> : <UserRound size={22} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-white/60">{vacant ? "Lot vacant" : "Loué à"}</span>
                <span className="block truncate text-[19px] font-bold">{vacant ? "Mettre en location" : tenant || "Locataire à renseigner"}</span>
                <span className="block text-[13px] text-white/70">
                  {vacant
                    ? "Nouveau locataire, bail, état des lieux — dans la gestion locative"
                    : [unit.rent ? `${eur(unit.rent)}${unit.charges ? ` + ${eur(unit.charges)} de charges` : ""}` : undefined, since ? `depuis le ${dateFr(since)}` : undefined].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-white/60" />
            </Link>
            {!vacant && <p className="mt-2 px-1 text-[12.5px] text-muted">Locataire, bail, loyers et documents : touchez pour ouvrir son dossier dans la gestion locative.</p>}

            <SectionTitle>Description</SectionTitle>
            <Card>
              <Stack>
                <Grid2>
                  <TextField label="Numéro ou nom" value={unit.name} onChange={(v) => set({ name: v ?? "" })} />
                  <SelectField label="Type" value={unit.type} options={UNIT_TYPES} onChange={(v) => set({ type: v })} />
                </Grid2>
                <Grid2>
                  <NumberField label="Surface habitable" suffix="m²" value={unit.surface} onChange={(v) => set({ surface: v })} />
                  <NumberField label="Pièces principales" suffix="" integer value={unit.mainRooms} onChange={(v) => set({ mainRooms: v })} />
                </Grid2>
                <Grid2>
                  <TextField label="Étage" value={unit.floor} onChange={(v) => set({ floor: v })} />
                  <TextField label="Porte" value={unit.door} onChange={(v) => set({ door: v })} />
                </Grid2>
                <SelectField
                  label="Type d'habitat"
                  value={unit.habitatType}
                  options={[
                    { value: "collectif", label: "Immeuble collectif" },
                    { value: "individuel", label: "Individuel (maison)" },
                  ]}
                  onChange={(v) => set({ habitatType: v })}
                />
                {vacant && (
                  <Grid2>
                    <NumberField label="Loyer de référence" value={unit.rent} onChange={(v) => set({ rent: v })} hint="Hors charges, pour la prochaine location." />
                    <NumberField label="Charges" value={unit.charges} onChange={(v) => set({ charges: v })} />
                  </Grid2>
                )}
              </Stack>
            </Card>

            <SectionTitle>Confort et équipements</SectionTitle>
            <Card>
              <Stack>
                <Grid2>
                  <SelectField label="Chauffage" value={unit.heating} options={[...WHO]} onChange={(v) => set({ heating: v })} />
                  <TextField label="Énergie" value={unit.heatingEnergy} placeholder="Électricité, gaz…" onChange={(v) => set({ heatingEnergy: v })} />
                </Grid2>
                <Grid2>
                  <SelectField label="Eau chaude" value={unit.hotWater} options={[...WHO]} onChange={(v) => set({ hotWater: v })} />
                  <TextField label="Énergie" value={unit.hotWaterEnergy} placeholder="Électricité, gaz…" onChange={(v) => set({ hotWaterEnergy: v })} />
                </Grid2>
                <TextField label="Équipements du logement" value={unit.equipments} multiline placeholder="Cuisine équipée, salle d'eau…" onChange={(v) => set({ equipments: v })} />
                <TextField label="Annexes privatives" value={unit.accessories} placeholder="Cave, parking, jardin…" onChange={(v) => set({ accessories: v })} />
              </Stack>
            </Card>
          </div>

          <div className="min-w-0 lg:[&>*:first-child]:mt-0">
            <SectionTitle>Énergie (DPE)</SectionTitle>
            <Card>
              <Stack>
                <SelectField label="Classe DPE" value={unit.dpeClass} options={DPE} onChange={(v) => set({ dpeClass: v })} />
                {(unit.dpeClass === "F" || unit.dpeClass === "G") && (
                  <p className="-mt-1 rounded-xl bg-warn/10 px-3 py-2 text-[12.5px] text-warn">Classe {unit.dpeClass} : location progressivement interdite (G depuis 2025, F en 2028). Travaux à prévoir.</p>
                )}
                <Grid2>
                  <NumberField label="Dépenses d'énergie : min" suffix="€/an" value={unit.energyCostMin} onChange={(v) => set({ energyCostMin: v })} />
                  <NumberField label="max" suffix="€/an" value={unit.energyCostMax} onChange={(v) => set({ energyCostMax: v })} />
                </Grid2>
                <NumberField label="Année de référence des prix" suffix="" integer value={unit.energyCostYear} onChange={(v) => set({ energyCostYear: v })} />
              </Stack>
            </Card>

            <SectionTitle>État, travaux et valeur</SectionTitle>
            <Card>
              <Stack>
                <SelectField label="État du logement" value={unit.condition} options={CONDITIONS} onChange={(v) => set({ condition: v })} />
                <TextField label="Travaux à prévoir" value={unit.plannedWorks} multiline onChange={(v) => set({ plannedWorks: v })} hint="Pour les chiffrer dans la chronologie, ajoutez-les dans Patrimoine › Travaux." />
                {role === "owner" && <NumberField label="Estimation de valeur" value={unit.value} onChange={(v) => set({ value: v })} hint="Facultatif : sinon la valeur de l'immeuble est utilisée." />}
              </Stack>
            </Card>

            <DocumentsCard scope={{ unitId: unit.id }} href={`/documents?immeuble=${unit.buildingId}&lot=${unit.id}`} title="Documents du lot" />

            {works.length > 0 && (
              <>
                <SectionTitle>Travaux programmés</SectionTitle>
                <Card className="py-1">
                  <div className="divide-y divide-line">
                    {works.map((w) => (
                      <Link key={w.id} href="/patrimoine?vue=travaux" className="flex items-center gap-3 py-3">
                        <Hammer size={18} className="shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] text-ink">{w.label}</span>
                          <span className="block text-[12.5px] text-muted">{[w.year, labelOf(WORK_STATUSES, w.status ?? "prevu")].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="tabular text-[14px] font-semibold text-ink">{eur(w.amount)}</span>
                      </Link>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {!vacant && (
              <Link href={rentalHref} className="soft-card mt-4 flex items-center gap-3 rounded-[22px] px-4 py-3.5 active:opacity-70">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-navy">
                  <KeyRound size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">Gestion locative de ce lot</span>
                  <span className="block text-[13px] text-muted">Bail, quittances, révisions, encaissements, documents</span>
                </span>
                <ChevronRight size={18} className="text-muted/70" />
              </Link>
            )}

            {role === "owner" && (
              <div className="mt-8">
                <ConfirmDelete
                  label="Supprimer ce lot"
                  message="Supprimer ce lot, ses baux et ses états des lieux ? Une sauvegarde automatique permet de revenir en arrière."
                  onConfirm={() => {
                    removeMany(unitRemovals(data, unit.id));
                    goBack(router, back);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <DoorOpen size={13} /> Enregistrement automatique à chaque modification
        </p>
      </Page>
    </>
  );
}
