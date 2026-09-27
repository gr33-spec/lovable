"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Hammer, Landmark } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Building, Company, Loan, Work } from "@/lib/types";
import { COMPANY_KINDS } from "@/lib/labels";
import { Button, DateField, Grid2, NumberField, SelectField, Sheet, Stack, TextField } from "./ui";
import { useCompanyOptions } from "./forms";

/** Création rapide d'un immeuble, avec son crédit en option. */
export function QuickBuilding({
  companyId,
  onDone,
}: {
  companyId?: string;
  onDone: (id: string) => void;
}) {
  const { upsert } = useStore();
  const companies = useCompanyOptions();
  const [name, setName] = useState<string>();
  const [company, setCompany] = useState<string | undefined>(companyId);
  const [value, setValue] = useState<number>();
  const [rent, setRent] = useState<number>();
  const [remaining, setRemaining] = useState<number>();
  const [payment, setPayment] = useState<number>();
  const [endDate, setEndDate] = useState<string>();

  const create = () => {
    const id = newId();
    const building: Building = { id, name: name || "Nouvel immeuble", companyId: company ?? null, value, rentMonthly: rent, valueMode: "manual" };
    upsert("buildings", building);
    if (remaining !== undefined || payment !== undefined || endDate) {
      const loan: Loan = { id: newId(), name: `Prêt ${building.name}`, buildingId: id, remaining, monthlyPayment: payment, endDate, kind: "amortissable" };
      upsert("loans", loan);
    }
    onDone(id);
  };

  return (
    <Stack>
      <TextField label="Nom de l'immeuble" value={name} placeholder="Ex. Immeuble de Paimpol" onChange={setName} autoFocus />
      <SelectField label="Société propriétaire" value={company} options={companies} onChange={setCompany} emptyLabel="Aucune / en direct" />
      <Grid2>
        <NumberField label="Valeur estimée" value={value} onChange={setValue} />
        <NumberField label="Loyers / mois" value={rent} onChange={setRent} />
      </Grid2>
      <div className="px-1 pt-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Crédit (facultatif)</div>
      <NumberField label="Capital restant dû" value={remaining} onChange={setRemaining} />
      <Grid2>
        <NumberField label="Mensualité" value={payment} onChange={setPayment} />
        <DateField label="Date de fin" value={endDate} onChange={setEndDate} />
      </Grid2>
      <Button full onClick={create}>
        Créer l&apos;immeuble
      </Button>
    </Stack>
  );
}

export function QuickCompany({ parentId, onDone }: { parentId?: string; onDone: (id: string) => void }) {
  const { upsert, data } = useStore();
  const parents = useCompanyOptions();
  const holding = data.companies.find((c) => c.kind === "holding");
  const [name, setName] = useState<string>();
  const [kind, setKind] = useState<Company["kind"]>(data.companies.length === 0 ? "holding" : "SCI");
  const [parent, setParent] = useState<string | undefined>(parentId ?? holding?.id);
  const create = () => {
    const id = newId();
    upsert("companies", { id, name: name || "Nouvelle société", kind, parentId: kind === "holding" ? null : (parent ?? null) } satisfies Company);
    onDone(id);
  };
  return (
    <Stack>
      <TextField label="Nom" value={name} placeholder="Ex. SCI DU PORT" onChange={setName} autoFocus />
      <SelectField label="Type" value={kind} options={COMPANY_KINDS} onChange={(v) => setKind(v ?? "SCI")} allowEmpty={false} />
      {kind !== "holding" && <SelectField label="Détenue par" value={parent} options={parents} onChange={setParent} emptyLabel="Aucune (tête de groupe)" />}
      <Button full onClick={create}>
        Créer la société
      </Button>
    </Stack>
  );
}

export function QuickLoan({ buildingId, companyId, onDone }: { buildingId?: string; companyId?: string; onDone: (id: string) => void }) {
  const { upsert, data } = useStore();
  const [name, setName] = useState<string>();
  const [bank, setBank] = useState<string>();
  const [building, setBuilding] = useState<string | undefined>(buildingId);
  const [remaining, setRemaining] = useState<number>();
  const [payment, setPayment] = useState<number>();
  const [endDate, setEndDate] = useState<string>();
  const buildings = data.buildings.map((b) => ({ value: b.id, label: b.name }));
  const create = () => {
    const id = newId();
    upsert("loans", {
      id,
      name: name || (bank ? `Prêt ${bank}` : "Nouveau crédit"),
      bank,
      buildingId: building ?? null,
      companyId: building ? null : (companyId ?? null),
      remaining,
      monthlyPayment: payment,
      endDate,
      kind: "amortissable",
    } satisfies Loan);
    onDone(id);
  };
  return (
    <Stack>
      <Grid2>
        <TextField label="Nom" value={name} placeholder="Ex. Prêt Paimpol" onChange={setName} autoFocus />
        <TextField label="Banque" value={bank} onChange={setBank} />
      </Grid2>
      <SelectField label="Immeuble financé" value={building} options={buildings} onChange={setBuilding} emptyLabel="Aucun en particulier" />
      <NumberField label="Capital restant dû" value={remaining} onChange={setRemaining} />
      <Grid2>
        <NumberField label="Mensualité" value={payment} onChange={setPayment} />
        <DateField label="Date de fin" value={endDate} onChange={setEndDate} />
      </Grid2>
      <p className="px-1 text-xs text-muted">Taux, montant initial et assurance pourront être ajoutés ensuite.</p>
      <Button full onClick={create}>
        Créer le crédit
      </Button>
    </Stack>
  );
}

export function QuickWork({ buildingId, companyId, onDone }: { buildingId?: string; companyId?: string; onDone: (id: string) => void }) {
  const { upsert, data, nowMonth } = useStore();
  const [label, setLabel] = useState<string>();
  const [amount, setAmount] = useState<number>();
  const [year, setYear] = useState<number | undefined>(Math.floor(nowMonth / 12) + 1);
  const [building, setBuilding] = useState<string | undefined>(buildingId);
  const buildings = data.buildings.map((b) => ({ value: b.id, label: b.name }));
  const create = () => {
    const id = newId();
    const b = data.buildings.find((x) => x.id === building);
    upsert("works", {
      id,
      label: label || "Travaux",
      amount,
      year,
      buildingId: building ?? null,
      companyId: b?.companyId ?? companyId ?? null,
      status: "prevu",
      priority: "normale",
    } satisfies Work);
    onDone(id);
  };
  return (
    <Stack>
      <TextField label="Intitulé" value={label} placeholder="Ex. Façade, rénovation…" onChange={setLabel} autoFocus />
      <Grid2>
        <NumberField label="Montant" value={amount} onChange={setAmount} />
        <NumberField label="Année" suffix="" integer value={year} onChange={(v) => setYear(v ? Math.round(v) : undefined)} />
      </Grid2>
      <SelectField label="Immeuble" value={building} options={buildings} onChange={setBuilding} emptyLabel="Aucun en particulier" />
      <Button full onClick={create}>
        Ajouter les travaux
      </Button>
    </Stack>
  );
}

type AddKind = "company" | "building" | "loan" | "work";

/** Menu « + » de l'onglet Patrimoine. */
export function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<AddKind | null>(null);
  const close = () => {
    setKind(null);
    onClose();
  };
  const titles: Record<AddKind, string> = {
    company: "Nouvelle société",
    building: "Nouvel immeuble",
    loan: "Nouveau crédit",
    work: "Nouveaux travaux",
  };
  return (
    <Sheet open={open} onClose={close} title={kind ? titles[kind] : "Ajouter"}>
      {!kind && (
        <div className="grid grid-cols-2 gap-3 pb-2">
          {[
            { k: "company" as const, label: "Société", icon: <Briefcase size={26} /> },
            { k: "building" as const, label: "Immeuble", icon: <Building2 size={26} /> },
            { k: "loan" as const, label: "Crédit", icon: <Landmark size={26} /> },
            { k: "work" as const, label: "Travaux", icon: <Hammer size={26} /> },
          ].map((x) => (
            <button key={x.k} onClick={() => setKind(x.k)} className="flex flex-col items-center gap-2 rounded-3xl bg-card py-6 text-navy shadow-sm active:scale-[0.98]">
              {x.icon}
              <span className="text-[15px] font-semibold">{x.label}</span>
            </button>
          ))}
        </div>
      )}
      {kind === "company" && <QuickCompany onDone={(id) => { close(); router.push(`/patrimoine/societe/${id}`); }} />}
      {kind === "building" && <QuickBuilding onDone={(id) => { close(); router.push(`/patrimoine/immeuble/${id}`); }} />}
      {kind === "loan" && <QuickLoan onDone={(id) => { close(); router.push(`/patrimoine/credit/${id}`); }} />}
      {kind === "work" && <QuickWork onDone={() => { close(); router.push(`/plus/travaux`); }} />}
    </Sheet>
  );
}
