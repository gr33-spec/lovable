"use client";

import { sortedUnits } from "@/lib/move-tenant";
import { useStore } from "@/lib/store";
import type { Building, Company, Loan, Unit, Work } from "@/lib/types";
import { COMPANY_KINDS, CONDITIONS, PRIORITIES, UNIT_TYPES, WORK_STATUSES } from "@/lib/labels";
import { eur } from "@/lib/format";
import { companyTree } from "@/lib/engine/snapshot";
import { LeaseSection, PaymentStrip } from "./leases";
import { LandlordFields } from "./company-registry";
import { DateField, Details, Grid2, NumberField, Segmented, SelectField, Stack, TextField } from "./ui";

// Formulaires d'édition : chaque saisie est enregistrée automatiquement.

export function useCompanyOptions(excludeId?: string) {
  const { data } = useStore();
  return companyTree(data.companies)
    .filter(({ company }) => company.id !== excludeId)
    .map(({ company, depth }) => ({ value: company.id, label: `${"  ".repeat(depth)}${company.name}` }));
}

export function useBuildingOptions() {
  const { data } = useStore();
  return data.buildings.map((b) => {
    const c = data.companies.find((x) => x.id === b.companyId);
    return { value: b.id, label: c ? `${b.name} · ${c.name}` : b.name };
  });
}

export function CompanyForm({ company }: { company: Company }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Company>) => upsert("companies", { ...company, ...patch });
  const parents = useCompanyOptions(company.id);
  const partners = company.partners ?? [];
  return (
    <Stack>
      <TextField label="Nom" value={company.name} onChange={(v) => set({ name: v ?? "" })} />
      <SelectField label="Type de société" value={company.kind} options={COMPANY_KINDS} onChange={(v) => set({ kind: v ?? "SCI" })} allowEmpty={false} />
      <SelectField label="Détenue par" value={company.parentId ?? undefined} options={parents} onChange={(v) => set({ parentId: v ?? null })} emptyLabel="Aucune (tête de groupe)" />
      {company.parentId && (
        <NumberField label="Pourcentage détenu par la société mère" suffix="%" value={company.ownershipPct} onChange={(v) => set({ ownershipPct: v })} />
      )}
      <Grid2>
        <NumberField label="Trésorerie disponible" value={company.cash} onChange={(v) => set({ cash: v })} />
        <NumberField label="Comptes courants d'associés" value={company.partnerAccounts} onChange={(v) => set({ partnerAccounts: v })} />
      </Grid2>
      <Details title={`Associés${partners.length ? ` (${partners.length})` : ""}`}>
        {partners.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_auto] items-end gap-2">
            <TextField label="Associé" value={p.name} onChange={(v) => set({ partners: partners.map((x, j) => (j === i ? { ...x, name: v ?? "" } : x)) })} />
            <NumberField label="Part" suffix="%" value={p.pct} onChange={(v) => set({ partners: partners.map((x, j) => (j === i ? { ...x, pct: v } : x)) })} />
            <button type="button" onClick={() => set({ partners: partners.filter((_, j) => j !== i) })} className="mb-3 px-2 text-sm text-neg">
              Retirer
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set({ partners: [...partners, { name: "" }] })} className="text-sm font-semibold text-series-1">
          + Ajouter un associé
        </button>
      </Details>
      <Details title="Coordonnées (baux et quittances)">
        <LandlordFields company={company} set={set} />
        <a href="/plus/societes" className="text-sm font-semibold text-series-1">Pré-remplir depuis l&apos;annuaire des entreprises</a>
      </Details>
      <TextField label="Fiscalité (régime, remarques)" value={company.taxRegime} placeholder="Ex. IS, IR…" onChange={(v) => set({ taxRegime: v })} />
      <TextField label="Notes" value={company.notes} multiline onChange={(v) => set({ notes: v })} />
    </Stack>
  );
}

export function BuildingForm({ building }: { building: Building }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Building>) => upsert("buildings", { ...building, ...patch });
  const companies = useCompanyOptions();
  const mode = building.valueMode ?? "manual";
  const bySurface = building.surface && building.pricePerSqm ? building.surface * building.pricePerSqm : undefined;
  return (
    <Stack>
      <TextField label="Nom" value={building.name} onChange={(v) => set({ name: v ?? "" })} />
      <SelectField label="Société propriétaire" value={building.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} emptyLabel="Aucune / en direct" />
      <div>
        <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Valeur estimée</div>
        <Segmented
          value={mode}
          onChange={(v) => set({ valueMode: v })}
          options={[
            { value: "manual", label: "Montant" },
            { value: "surface", label: "Surface × prix/m²" },
          ]}
        />
      </div>
      {mode === "manual" ? (
        <NumberField label="Valeur actuelle estimée" value={building.value} onChange={(v) => set({ value: v })} />
      ) : (
        <>
          <Grid2>
            <NumberField label="Surface totale" suffix="m²" value={building.surface} onChange={(v) => set({ surface: v })} />
            <NumberField label="Prix au m²" suffix="€" value={building.pricePerSqm} onChange={(v) => set({ pricePerSqm: v })} />
          </Grid2>
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink-2">
            Valeur calculée : <span className="tabular font-semibold text-ink">{bySurface ? eur(bySurface) : "Données insuffisantes"}</span>
          </div>
        </>
      )}
      <NumberField
        label="Loyer mensuel global (hors charges)"
        value={building.rentMonthly}
        onChange={(v) => set({ rentMonthly: v })}
        hint="Utilisé tant que les loyers ne sont pas détaillés par logement."
      />
      <Details title="Charges annuelles">
        <Grid2>
          <NumberField label="Taxe foncière" value={building.propertyTax} onChange={(v) => set({ propertyTax: v })} />
          <NumberField label="Assurance" value={building.insurance} onChange={(v) => set({ insurance: v })} />
          <NumberField label="Comptabilité" value={building.accounting} onChange={(v) => set({ accounting: v })} />
          <NumberField label="Autres charges" value={building.otherCharges} onChange={(v) => set({ otherCharges: v })} />
        </Grid2>
      </Details>
      <Details title="Adresse et acquisition">
        <TextField label="Adresse" value={building.address} onChange={(v) => set({ address: v })} />
        <TextField label="Commune" value={building.city} onChange={(v) => set({ city: v })} />
        <DateField label="Date d'acquisition" value={building.acquisitionDate} onChange={(v) => set({ acquisitionDate: v })} />
        <NumberField label="Prix d'acquisition" value={building.acquisitionPrice} onChange={(v) => set({ acquisitionPrice: v })} />
        {mode === "manual" && (
          <Grid2>
            <NumberField label="Surface totale" suffix="m²" value={building.surface} onChange={(v) => set({ surface: v })} />
            <NumberField label="Prix moyen au m²" suffix="€" value={building.pricePerSqm} onChange={(v) => set({ pricePerSqm: v })} />
          </Grid2>
        )}
        <NumberField label="Nombre de lots" suffix="" integer value={building.lotsCount} onChange={(v) => set({ lotsCount: v })} />
      </Details>
      <Details title="État et travaux">
        <SelectField label="État général" value={building.condition} options={CONDITIONS} onChange={(v) => set({ condition: v })} />
        <TextField label="Travaux récents" value={building.recentWorks} multiline onChange={(v) => set({ recentWorks: v })} />
        <TextField label="Travaux à prévoir" value={building.plannedWorks} multiline onChange={(v) => set({ plannedWorks: v })} hint="Pour les chiffrer dans la chronologie, ajoutez-les dans « Travaux »." />
      </Details>
      <TextField label="Notes" value={building.notes} multiline onChange={(v) => set({ notes: v })} />
    </Stack>
  );
}

export function UnitForm({ unit }: { unit: Unit }) {
  const { upsert, role, data } = useStore();
  const set = (patch: Partial<Unit>) => {
    upsert("units", { ...unit, ...patch });
    // Loyer et charges modifiés : le bail en cours suit (quittances, pointage, prochains baux).
    const active = data.tenancies.find((t) => t.unitId === unit.id && t.status === "actif");
    if (active && ("rent" in patch || "charges" in patch)) {
      upsert("tenancies", { ...active, ...("rent" in patch ? { rent: patch.rent } : {}), ...("charges" in patch ? { charges: patch.charges } : {}) });
    }
  };
  return (
    <Stack>
      <Grid2>
        <TextField label="Numéro ou nom" value={unit.name} onChange={(v) => set({ name: v ?? "" })} />
        <SelectField label="Type" value={unit.type} options={UNIT_TYPES} onChange={(v) => set({ type: v })} />
      </Grid2>
      <Segmented
        value={unit.status ?? "occupe"}
        onChange={(v) => set({ status: v })}
        options={[
          { value: "occupe", label: "Occupé" },
          { value: "vacant", label: "Vacant" },
        ]}
      />
      <Grid2>
        <NumberField label="Loyer hors charges" value={unit.rent} onChange={(v) => set({ rent: v })} />
        <NumberField label="Charges" value={unit.charges} onChange={(v) => set({ charges: v })} />
      </Grid2>
      <NumberField label="Surface" suffix="m²" value={unit.surface} onChange={(v) => set({ surface: v })} />
      {unit.status !== "vacant" && (
        <Details title="Locataire">
          <Grid2>
            <TextField label="Nom" value={unit.tenantLastName} onChange={(v) => set({ tenantLastName: v })} />
            <TextField label="Prénom" value={unit.tenantFirstName} onChange={(v) => set({ tenantFirstName: v })} />
          </Grid2>
          <DateField label="Date d'entrée" value={unit.entryDate} onChange={(v) => set({ entryDate: v })} />
        </Details>
      )}
      {unit.status !== "vacant" && <LeaseSection unit={unit} />}
      {unit.status !== "vacant" && <PaymentStrip unit={unit} />}
      <Details title="État, travaux, valeur">
        <SelectField label="État du logement" value={unit.condition} options={CONDITIONS} onChange={(v) => set({ condition: v })} />
        <TextField label="Travaux à prévoir" value={unit.plannedWorks} multiline onChange={(v) => set({ plannedWorks: v })} />
        {role === "owner" && <NumberField label="Estimation de valeur" value={unit.value} onChange={(v) => set({ value: v })} hint="Facultatif." />}
      </Details>
    </Stack>
  );
}

export function LoanForm({ loan }: { loan: Loan }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Loan>) => upsert("loans", { ...loan, ...patch });
  const buildings = useBuildingOptions();
  const companies = useCompanyOptions();
  return (
    <Stack>
      <Grid2>
        <TextField label="Nom" value={loan.name} placeholder="Ex. Prêt Paimpol" onChange={(v) => set({ name: v })} />
        <TextField label="Banque" value={loan.bank} onChange={(v) => set({ bank: v })} />
      </Grid2>
      <SelectField label="Immeuble financé" value={loan.buildingId ?? undefined} options={buildings} onChange={(v) => set({ buildingId: v ?? null })} emptyLabel="Aucun en particulier" />
      {!loan.buildingId && (
        <SelectField label="Société emprunteuse" value={loan.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} />
      )}
      <Segmented
        value={loan.kind ?? "amortissable"}
        onChange={(v) => set({ kind: v })}
        options={[
          { value: "amortissable", label: "Amortissable" },
          { value: "in_fine", label: "In fine" },
        ]}
      />
      <div className="rounded-2xl bg-soft px-4 py-3 text-[13px] text-ink-2">
        L&apos;essentiel : <b>capital restant dû</b>, <b>mensualité</b> et <b>date de fin</b>. Le reste affine la projection.
      </div>
      <NumberField label="Capital restant dû" value={loan.remaining} onChange={(v) => set({ remaining: v })} />
      {loan.remaining !== undefined && (
        <DateField label="…connu à la date du" value={loan.remainingDate} onChange={(v) => set({ remainingDate: v })} hint="Vide = aujourd'hui." />
      )}
      <NumberField label="Mensualité hors assurance" value={loan.monthlyPayment} onChange={(v) => set({ monthlyPayment: v })} />
      <DateField label="Date de fin" value={loan.endDate} onChange={(v) => set({ endDate: v })} />
      <Details title="Détails du prêt">
        <NumberField label="Montant initial" value={loan.initialAmount} onChange={(v) => set({ initialAmount: v })} />
        <Grid2>
          <NumberField label="Taux" suffix="%" value={loan.ratePct} onChange={(v) => set({ ratePct: v })} />
          <NumberField label="Assurance / mois" value={loan.insuranceMonthly} onChange={(v) => set({ insuranceMonthly: v })} />
        </Grid2>
        <DateField label="Date de début" value={loan.startDate} onChange={(v) => set({ startDate: v })} />
        <NumberField label="Durée" suffix="mois" integer value={loan.durationMonths} onChange={(v) => set({ durationMonths: v })} />
      </Details>
      <TextField label="Notes" value={loan.notes} multiline onChange={(v) => set({ notes: v })} />
    </Stack>
  );
}

export function WorkForm({ work }: { work: Work }) {
  const { upsert, data } = useStore();
  const set = (patch: Partial<Work>) => upsert("works", { ...work, ...patch });
  const buildings = useBuildingOptions();
  const companies = useCompanyOptions();
  const units = sortedUnits(data.units.filter((u) => u.buildingId === work.buildingId)).map((u) => ({ value: u.id, label: u.name }));
  return (
    <Stack>
      <TextField label="Intitulé" value={work.label} placeholder="Ex. Façade" onChange={(v) => set({ label: v ?? "" })} />
      <Grid2>
        <NumberField label="Montant" value={work.amount} onChange={(v) => set({ amount: v })} />
        <NumberField label="Année prévue" suffix="" integer value={work.year} onChange={(v) => set({ year: v ? Math.round(v) : undefined })} />
      </Grid2>
      <SelectField
        label="Immeuble"
        value={work.buildingId ?? undefined}
        options={buildings}
        onChange={(v) => set({ buildingId: v ?? null, unitId: null, companyId: data.buildings.find((b) => b.id === v)?.companyId ?? work.companyId })}
        emptyLabel="Aucun en particulier"
      />
      {work.buildingId && units.length > 0 && (
        <SelectField label="Logement" value={work.unitId ?? undefined} options={units} onChange={(v) => set({ unitId: v ?? null })} emptyLabel="Tout l'immeuble" />
      )}
      {!work.buildingId && <SelectField label="Société" value={work.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} />}
      <div>
        <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">État</div>
        <Segmented value={work.status ?? "prevu"} onChange={(v) => set({ status: v })} options={WORK_STATUSES} />
      </div>
      <div>
        <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Priorité</div>
        <Segmented value={work.priority ?? "normale"} onChange={(v) => set({ priority: v })} options={PRIORITIES} />
      </div>
      <TextField label="Notes" value={work.notes} multiline onChange={(v) => set({ notes: v })} />
    </Stack>
  );
}
