"use client";

import { ScheduleImportCard, scheduleOf, useScheduleImport } from "./details/loan-schedule";
import { loanFieldsFromSchedule } from "@/lib/schedule";
import { matchLoan } from "@/lib/loan-match";
import { toast } from "./swipe";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, ChevronRight, FileUp, Hammer, Landmark, UserPlus } from "lucide-react";
import { sortedUnits } from "@/lib/lots";
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
  const { upsert, data, nowMonth } = useStore();
  const [name, setName] = useState<string>();
  const [bank, setBank] = useState<string>();
  const [building, setBuilding] = useState<string | undefined>(buildingId);
  // Le plus simple et le plus exact : créer le crédit directement depuis le tableau de la banque.
  const importer = useScheduleImport({
    hint: name || bank,
    onConfirm: ({ rows, fileId, fileName, bank: readBank, meta }) => {
      // Même échéancier déjà enregistré : on ouvre ce crédit au lieu d'en créer un second.
      const same = matchLoan(data, { rows, meta }, {}, nowMonth).identicalTo;
      if (same) {
        toast("Ce tableau est déjà enregistré sur un crédit existant");
        onDone(same);
        return;
      }
      const id = newId();
      const b = bank || readBank || meta?.bank || undefined;
      upsert("loans", {
        id,
        name: name || (b ? `Prêt ${b}` : "Nouveau crédit"),
        bank: b,
        buildingId: building ?? null,
        companyId: building ? null : (companyId ?? null),
        reference: meta?.reference || undefined,
        ...loanFieldsFromSchedule(rows, undefined, meta),
        schedule: scheduleOf(rows, fileId, fileName, meta),
      } satisfies Loan);
      onDone(id);
    },
  });
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
      <ScheduleImportCard
        title="Vous avez le tableau d'amortissement ?"
        text="Importez ses échéances en fichier JSON : montant, taux, échéances, assurance, capital restant et fin se remplissent tout seuls, au centime."
        importer={importer}
      />
      <div className="flex items-center gap-3 px-1 text-[12.5px] font-semibold uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" /> ou saisissez l&apos;essentiel <span className="h-px flex-1 bg-line" />
      </div>
      <NumberField label="Capital restant dû" value={remaining} onChange={setRemaining} />
      <Grid2>
        <NumberField label="Mensualité" value={payment} onChange={setPayment} />
        <DateField label="Date de fin" value={endDate} onChange={setEndDate} />
      </Grid2>
      <p className="px-1 text-xs text-muted">Taux, montant initial et assurance pourront être ajoutés ensuite, ou le tableau importé depuis la fiche du crédit.</p>
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

type AddKind = "company" | "building" | "loan" | "work" | "tenant";

/** Menu « + » : un seul point d'entrée pour tout ajouter (barre de navigation et Patrimoine). */
export function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<AddKind | null>(null);
  const close = () => {
    setKind(null);
    onClose();
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const titles: Record<AddKind, string> = {
    company: "Nouvelle société",
    building: "Nouveau bien",
    loan: "Nouveau crédit",
    work: "Nouveaux travaux",
    tenant: "Nouveau locataire",
  };
  const items: { label: string; hint: string; icon: React.ReactNode; onClick: () => void }[] = [
    { label: "Document", hint: "PDF ou photo, rangé au bon endroit", icon: <FileUp size={24} />, onClick: () => go("/documents") },
    { label: "Crédit", hint: "Avec ou sans tableau", icon: <Landmark size={24} />, onClick: () => setKind("loan") },
    { label: "Bien", hint: "Immeuble, maison, local…", icon: <Building2 size={24} />, onClick: () => setKind("building") },
    { label: "Locataire", hint: "Entrée dans un logement", icon: <UserPlus size={24} />, onClick: () => setKind("tenant") },
    { label: "Société", hint: "SCI, holding…", icon: <Briefcase size={24} />, onClick: () => setKind("company") },
    { label: "Travaux", hint: "Prévus ou réalisés", icon: <Hammer size={24} />, onClick: () => setKind("work") },
  ];
  return (
    <Sheet open={open} onClose={close} title={kind ? titles[kind] : "Ajouter"}>
      {!kind && (
        <div className="grid grid-cols-2 gap-3 pb-2">
          {items.map((x) => (
            <button key={x.label} onClick={x.onClick} className="flex flex-col items-center gap-1.5 rounded-3xl bg-card px-2 py-5 text-navy shadow-sm active:scale-[0.98]">
              {x.icon}
              <span className="text-[15px] font-semibold">{x.label}</span>
              <span className="text-center text-[12px] leading-tight text-muted">{x.hint}</span>
            </button>
          ))}
        </div>
      )}
      {kind === "company" && <QuickCompany onDone={(id) => go(`/patrimoine/societe/${id}`)} />}
      {kind === "building" && <QuickBuilding onDone={(id) => go(`/patrimoine/immeuble/${id}`)} />}
      {kind === "loan" && <QuickLoan onDone={(id) => go(`/patrimoine/credit/${id}`)} />}
      {kind === "work" && <QuickWork onDone={() => go(`/patrimoine?vue=travaux`)} />}
      {kind === "tenant" && <TenantPicker onPick={(unitId) => go(`/patrimoine/logement/${unitId}/changement?depuis=gestion`)} />}
    </Sheet>
  );
}

/** Choix du logement qui accueille le locataire (logements vacants d'abord). */
function TenantPicker({ onPick }: { onPick: (unitId: string) => void }) {
  const { data } = useStore();
  const name = (id: string) => data.buildings.find((b) => b.id === id)?.name ?? "";
  const units = sortedUnits(data.units).sort((a, b) => Number(b.status === "vacant") - Number(a.status === "vacant"));
  if (!units.length) return <p className="pb-4 text-[14px] text-muted">Ajoutez d&apos;abord un bien et ses logements.</p>;
  return (
    <div className="divide-y divide-line pb-2">
      {units.map((u) => (
        <button key={u.id} onClick={() => onPick(u.id)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">{u.name}</span>
            <span className="block truncate text-[12.5px] text-muted">{name(u.buildingId)}</span>
          </span>
          {u.status === "vacant" ? <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[12px] font-semibold text-warn">Vacant</span> : <span className="text-[12px] text-muted">Changer de locataire</span>}
          <ChevronRight size={16} className="shrink-0 text-muted" />
        </button>
      ))}
    </div>
  );
}
