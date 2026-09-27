"use client";

import { BadgeEuro, Hammer, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Action, AppData } from "@/lib/types";
import { eurCompact } from "@/lib/format";
import { Grid2, NumberField, Segmented, SelectField, Stack, TextField } from "./ui";
import { useBuildingOptions, useCompanyOptions } from "./forms";

export const ACTION_LABELS: Record<Action["type"], string> = {
  sale: "Vente d'un immeuble",
  refinance: "Refinancement",
  works: "Nouveaux travaux",
  purchase: "Nouvel achat",
  prepayment: "Remboursement anticipé",
};

export function actionSummary(a: Action, names: { building: (id?: string | null) => string | undefined; loan: (id: string) => string | undefined }): string {
  switch (a.type) {
    case "sale":
      return `Vendre ${names.building(a.buildingId) ?? "un immeuble"} en ${a.year}${a.price ? ` pour ${eurCompact(a.price)}` : ""}`;
    case "refinance":
      return `Refinancer ${a.loanIds.length ? a.loanIds.map((id) => names.loan(id) ?? "crédit").join(", ") : ""} en ${a.year}${a.amount ? ` (${eurCompact(a.amount)})` : ""}`;
    case "works":
      return `${a.label || "Travaux"} en ${a.year}${a.amount ? ` : ${eurCompact(a.amount)}` : ""}`;
    case "purchase":
      return `Acheter ${a.name || "un bien"} en ${a.year}${a.price ? ` pour ${eurCompact(a.price)}` : ""}`;
    case "prepayment":
      return `Rembourser ${a.amount ? eurCompact(a.amount) : ""} sur ${names.loan(a.loanId) ?? "un crédit"} en ${a.year}`;
  }
}

export function ActionForm({ action, onChange }: { action: Action; onChange: (a: Action) => void }) {
  const { data, projection } = useStore();
  const buildings = useBuildingOptions();
  const companies = useCompanyOptions();
  const loans = data.loans
    .filter((l) => !projection.snapshot.resolvedLoans.get(l.id)?.finished)
    .map((l) => ({ value: l.id, label: l.name || l.bank || "Crédit" }));
  const year = (
    <NumberField label="Année" suffix="" integer value={action.year} onChange={(v) => onChange({ ...action, year: v ? Math.round(v) : action.year })} />
  );

  switch (action.type) {
    case "sale":
      return (
        <Stack>
          <SelectField label="Immeuble vendu" value={action.buildingId} options={buildings} onChange={(v) => onChange({ ...action, buildingId: v ?? "" })} />
          <Grid2>
            {year}
            <NumberField label="Prix de vente" value={action.price} onChange={(v) => onChange({ ...action, price: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Frais" value={action.fees} onChange={(v) => onChange({ ...action, fees: v })} hint="Agence, pénalités…" />
            <NumberField label="Impôt estimé" value={action.tax} onChange={(v) => onChange({ ...action, tax: v })} hint="Saisi manuellement" />
          </Grid2>
        </Stack>
      );
    case "refinance":
      return (
        <Stack>
          <div>
            <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Crédits remboursés</div>
            <div className="space-y-1 rounded-2xl border border-line bg-card p-2">
              {loans.length === 0 && <div className="p-2 text-sm text-muted">Aucun crédit en cours.</div>}
              {loans.map((l) => (
                <label key={l.value} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#0b2545]"
                    checked={action.loanIds.includes(l.value)}
                    onChange={(e) =>
                      onChange({
                        ...action,
                        loanIds: e.target.checked ? [...action.loanIds, l.value] : action.loanIds.filter((x) => x !== l.value),
                      })
                    }
                  />
                  <span className="text-[15px]">{l.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Grid2>
            {year}
            <NumberField label="Nouveau montant" value={action.amount} onChange={(v) => onChange({ ...action, amount: v })} hint="Vide = capital restant dû" />
          </Grid2>
          <Grid2>
            <NumberField label="Taux" suffix="%" value={action.ratePct} onChange={(v) => onChange({ ...action, ratePct: v })} />
            <NumberField label="Durée" suffix="ans" value={action.durationYears} onChange={(v) => onChange({ ...action, durationYears: v })} />
          </Grid2>
          <NumberField label="Frais" value={action.fees} onChange={(v) => onChange({ ...action, fees: v })} />
        </Stack>
      );
    case "works":
      return (
        <Stack>
          <TextField label="Intitulé" value={action.label} onChange={(v) => onChange({ ...action, label: v ?? "" })} />
          <SelectField label="Immeuble" value={action.buildingId ?? undefined} options={buildings} onChange={(v) => onChange({ ...action, buildingId: v ?? null })} emptyLabel="Aucun en particulier" />
          {!action.buildingId && <SelectField label="Société" value={action.companyId ?? undefined} options={companies} onChange={(v) => onChange({ ...action, companyId: v ?? null })} />}
          <Grid2>
            {year}
            <NumberField label="Montant" value={action.amount} onChange={(v) => onChange({ ...action, amount: v })} />
          </Grid2>
        </Stack>
      );
    case "purchase":
      return (
        <Stack>
          <TextField label="Nom du bien" value={action.name} onChange={(v) => onChange({ ...action, name: v ?? "" })} />
          <SelectField label="Société acheteuse" value={action.companyId ?? undefined} options={companies} onChange={(v) => onChange({ ...action, companyId: v ?? null })} />
          <Grid2>
            {year}
            <NumberField label="Prix" value={action.price} onChange={(v) => onChange({ ...action, price: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Frais d'acquisition" value={action.fees} onChange={(v) => onChange({ ...action, fees: v })} />
            <NumberField label="Emprunt" value={action.loanAmount} onChange={(v) => onChange({ ...action, loanAmount: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Taux" suffix="%" value={action.ratePct} onChange={(v) => onChange({ ...action, ratePct: v })} />
            <NumberField label="Durée" suffix="ans" value={action.durationYears} onChange={(v) => onChange({ ...action, durationYears: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Loyers / mois" value={action.rentMonthly} onChange={(v) => onChange({ ...action, rentMonthly: v })} />
            <NumberField label="Charges / an" value={action.chargesAnnual} onChange={(v) => onChange({ ...action, chargesAnnual: v })} />
          </Grid2>
        </Stack>
      );
    case "prepayment":
      return (
        <Stack>
          <SelectField label="Crédit" value={action.loanId} options={loans} onChange={(v) => onChange({ ...action, loanId: v ?? "" })} />
          <Grid2>
            {year}
            <NumberField label="Montant remboursé" value={action.amount} onChange={(v) => onChange({ ...action, amount: v })} />
          </Grid2>
          <Segmented
            value={action.mode ?? "duree"}
            onChange={(v) => onChange({ ...action, mode: v })}
            options={[
              { value: "duree", label: "Réduire la durée" },
              { value: "mensualite", label: "Réduire la mensualité" },
            ]}
          />
        </Stack>
      );
  }
}

export const ACTION_ICONS: Record<Action["type"], React.ReactNode> = {
  sale: <TrendingUp size={20} />,
  refinance: <RefreshCw size={20} />,
  works: <Hammer size={20} />,
  purchase: <ShoppingCart size={20} />,
  prepayment: <BadgeEuro size={20} />,
};

export function defaultAction(type: Action["type"], y0: number, data: AppData): Action {
  const id = newId();
  const year = y0 + 3;
  switch (type) {
    case "sale":
      return { id, type, year, buildingId: data.buildings[0]?.id ?? "" };
    case "refinance":
      return { id, type, year, loanIds: [], durationYears: 20 };
    case "works":
      return { id, type, year, label: "Travaux", buildingId: data.buildings[0]?.id ?? null };
    case "purchase":
      return { id, type, year, name: "Nouvel immeuble", companyId: data.companies.find((c) => c.kind !== "holding")?.id ?? null, durationYears: 20 };
    case "prepayment":
      return { id, type, year, loanId: data.loans[0]?.id ?? "", mode: "duree" };
  }
}

