"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Plus, Sparkles, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Building, Company, Deduction, Guarantor, Person, Tenancy, Unit } from "@/lib/types";
import { dateFr, eur } from "@/lib/format";
import { todayIso } from "@/lib/engine/leases";
import {
  activeTenancy,
  depositDue,
  draftTenancy,
  inspectionsOf,
  landlordCompany,
  lastExitInspection,
  leavingTenancy,
  missingBuildingInfo,
  missingLandlordInfo,
  missingUnitInfo,
  newTenancyDraft,
  tenancyFromUnit,
  tenantsName,
  unitVacated,
  unitWithTenancy,
  unpaidDuring,
} from "@/lib/tenancy";
import { compareInspections, newEntryInspection, newExitInspection, stateLabel } from "@/lib/legal/inspection";
import { ANNEXES, CONSTRUCTION_PERIODS } from "@/lib/legal/lease";
import { depositSettlement, lateDepositPenalty, leaseYears, maxDeposit, minDurationYears } from "@/lib/legal/rules";
import { leaseVersionFor } from "@/lib/legal/versions";
import { Button, Card, DateField, Grid2, NumberField, Page, PageHeader, Segmented, SelectField, Stack, TextField, cx } from "../ui";
import { DocRow, LegalBadge, documentUrl } from "./common";

type StepId = "depart" | "edl-sortie" | "depot" | "locataire" | "conditions" | "garant" | "logement" | "bailleur" | "clauses" | "documents";

const STEP_LABEL: Record<StepId, string> = {
  depart: "Départ",
  "edl-sortie": "État des lieux de sortie",
  depot: "Dépôt de garantie",
  locataire: "Nouveau locataire",
  conditions: "Loyer et conditions",
  garant: "Garantie",
  logement: "Le logement",
  bailleur: "Le bailleur",
  clauses: "Clauses et annexes",
  documents: "Documents prêts",
};

const uid = () => crypto.randomUUID();

export function ChangeTenantWizard({ unitId }: { unitId: string }) {
  return (
    <Suspense>
      <Wizard unitId={unitId} />
    </Suspense>
  );
}

function Wizard({ unitId }: { unitId: string }) {
  const { data, upsert } = useStore();
  const requested = useSearchParams().get("etape") as StepId | null;
  const router = useRouter();
  const unit = data.units.find((u) => u.id === unitId);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  // Locataire sortant suivi pendant tout le parcours, même une fois son dossier clos.
  const [outgoingId, setOutgoingId] = useState<string | undefined>(() => {
    const list = data.tenancies.filter((t) => t.unitId === unitId);
    return (list.find((t) => t.status === "sortie") ?? list.find((t) => t.status === "actif"))?.id;
  });
  // Étapes « logement » et « bailleur » : affichées seulement si des informations
  // manquaient à l'ouverture (elles restent ensuite dans le parcours).
  const [needs] = useState(() => {
    const b = data.buildings.find((x) => x.id === unit?.buildingId);
    return {
      unit: !!unit && (missingUnitInfo(unit).length > 0 || missingBuildingInfo(b).length > 0),
      landlord: !!unit && missingLandlordInfo(landlordCompany(data, unit)).length > 0,
    };
  });
  if (!unit) return <PageHeader title="Logement introuvable" back="/patrimoine" />;
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const company = landlordCompany(data, unit);
  const back = `/patrimoine/logement/${unitId}`;

  // Locataire sortant : bail actif, départ en cours, ou bail signé hors application.
  const current = activeTenancy(data, unitId);
  const leaving = leavingTenancy(data, unitId);
  const outgoing = data.tenancies.find((t) => t.id === outgoingId) ?? leaving ?? current;
  const legacy = !outgoing && unit.status !== "vacant" && (unit.tenantLastName || unit.tenantFirstName);
  const draft = draftTenancy(data, unitId);

  const steps: StepId[] = [];
  if (outgoing || legacy) steps.push("depart", "edl-sortie", "depot");
  steps.push("locataire", "conditions", "garant");
  if (needs.unit) steps.push("logement");
  if (needs.landlord && company) steps.push("bailleur");
  steps.push("clauses", "documents");

  // Étape de départ : la première non terminée.
  const firstOpen = () => {
    const i = steps.findIndex((s) => !isComplete(s));
    return i < 0 ? steps.length - 1 : i;
  };
  function isComplete(s: StepId): boolean {
    if (s === "depart") return !!outgoing?.endDate;
    if (s === "edl-sortie") return !!(outgoing && inspectionsOf(data, outgoing.id).exit?.completedAt);
    if (s === "depot") return !!outgoing && (outgoing.status === "clos" || !!outgoing.depositReturnedDate);
    if (s === "logement") return missingUnitInfo(unit!).length === 0 && missingBuildingInfo(building).length === 0;
    if (s === "bailleur") return missingLandlordInfo(company).length === 0;
    if (!draft) return false;
    return stepDone(draft, s);
  }
  const requestedIdx = requested ? steps.indexOf(requested) : -1;
  const idx = Math.min(stepIndex ?? (requestedIdx >= 0 ? requestedIdx : firstOpen()), steps.length - 1);
  // L'étape affichée à l'ouverture est figée : compléter un champ ne doit pas
  // faire sauter l'écran à l'étape suivante.
  if (stepIndex === null) queueMicrotask(() => setStepIndex((cur) => cur ?? idx));
  const step = steps[idx];
  const go = (d: number) => {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, idx + d)));
    window.scrollTo({ top: 0 });
  };

  /** Crée le dossier du locataire sortant si le bail avait été signé hors application. */
  const ensureOutgoing = (): Tenancy => {
    if (outgoing) return outgoing;
    const t = tenancyFromUnit(unit, company, leaseYears(data.settings));
    upsert("tenancies", t);
    setOutgoingId(t.id);
    return t;
  };
  const ensureDraft = (): Tenancy => {
    if (draft) return draft;
    const t = newTenancyDraft(unit, outgoing, company, building, leaseYears(data.settings));
    upsert("tenancies", t);
    return t;
  };

  return (
    <>
      <PageHeader title={outgoing || legacy ? "Changer de locataire" : "Nouveau locataire"} subtitle={`${building?.name ?? ""} · ${unit.name}`} back={back} />
      <Page>
        {/* Progression */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStepIndex(i)}
              className={cx(
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                i === idx ? "bg-navy text-white" : isComplete(s) ? "bg-pos/10 text-pos" : "bg-soft text-ink-2",
              )}
            >
              {isComplete(s) && i !== idx && <Check size={12} />}
              {i + 1}. {STEP_LABEL[s]}
            </button>
          ))}
        </div>
        {(outgoing || legacy) && (
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-gold">
            {["depart", "edl-sortie", "depot"].includes(step) ? (
              <>
                <UserMinus size={14} /> Départ de {outgoing ? tenantsName(outgoing) : [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ")}
              </>
            ) : (
              <>
                <UserPlus size={14} /> Arrivée du nouveau locataire
              </>
            )}
          </div>
        )}

        {step === "depart" && <DepartStep tenancy={outgoing} ensure={ensureOutgoing} />}
        {step === "edl-sortie" && <ExitInspectionStep unit={unit} tenancy={outgoing} ensure={ensureOutgoing} />}
        {step === "depot" && outgoing && <DepositStep unit={unit} tenancy={outgoing} building={building} />}
        {step === "depot" && !outgoing && <Card><p className="text-sm text-muted">Indiquez d&apos;abord la date de départ.</p></Card>}
        {step === "locataire" && <TenantsStep tenancy={draft} ensure={ensureDraft} />}
        {step === "conditions" && <ConditionsStep tenancy={draft} ensure={ensureDraft} building={building} company={company} unit={unit} />}
        {step === "garant" && <GuarantorStep tenancy={draft} ensure={ensureDraft} />}
        {step === "logement" && <UnitInfoStep unit={unit} building={building} />}
        {step === "bailleur" && company && <LandlordStep company={company} />}
        {step === "clauses" && <ClausesStep tenancy={draft} ensure={ensureDraft} unit={unit} building={building} />}
        {step === "documents" && (
          <DocumentsStep
            unit={unit}
            tenancy={draft}
            outgoing={outgoing}
            onActivated={() => router.push(back)}
            onEditInfo={() => {
              const i = steps.indexOf("logement");
              setStepIndex(i >= 0 ? i : steps.indexOf("conditions"));
            }}
          />
        )}

        <div className="mt-6 flex gap-2">
          {idx > 0 && (
            <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => go(-1)}>
              Retour
            </Button>
          )}
          {idx < steps.length - 1 && (
            <div className="flex-1">
              <Button full icon={<ChevronRight size={18} />} onClick={() => go(1)}>
                Continuer
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[12px] text-muted">Tout est enregistré au fur et à mesure : vous pouvez reprendre plus tard.</p>
      </Page>
    </>
  );
}

function stepDone(t: Tenancy, s: StepId): boolean {
  switch (s) {
    case "locataire":
      return t.tenants.length > 0 && t.tenants.every((p) => p.lastName && p.firstName);
    case "conditions":
      return !!(t.startDate && t.rent && t.durationYears && t.deposit !== undefined);
    case "garant":
      return t.guarantors !== undefined;
    case "clauses":
      return (t.annexes?.length ?? 0) > 2;
    default:
      return false;
  }
}

// ——— Départ ———

function DepartStep({ tenancy, ensure }: { tenancy?: Tenancy; ensure: () => Tenancy }) {
  const { upsert } = useStore();
  const t = tenancy;
  const set = (patch: Partial<Tenancy> | ((base: Tenancy) => Partial<Tenancy>)) => {
    const base = t ?? ensure();
    const p = typeof patch === "function" ? patch(base) : patch;
    upsert("tenancies", { ...base, status: base.status === "clos" ? "clos" : "sortie", ...p });
  };
  const setTenant = (i: number, patch: Partial<Person>) => set((base) => ({ tenants: base.tenants.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  return (
    <Card>
      <Stack>
        <DateField label="Date de départ (fin du bail)" value={t?.endDate} onChange={(v) => set({ endDate: v })} />
        <Grid2>
          <DateField label="Congé reçu le" value={t?.noticeDate} onChange={(v) => set({ noticeDate: v })} />
          <SelectField
            label="Congé donné par"
            value={t?.noticeBy}
            options={[
              { value: "locataire", label: "Le locataire" },
              { value: "bailleur", label: "Le bailleur" },
            ]}
            onChange={(v) => set({ noticeBy: v })}
          />
        </Grid2>
        {(t?.tenants ?? [{}]).map((p, i) => (
          <TextField key={i} label={`Nouvelle adresse${t && t.tenants.length > 1 ? ` de ${p.firstName ?? `locataire ${i + 1}`}` : " du locataire"}`} value={p.address} placeholder="Pour l'état des lieux et la restitution du dépôt" onChange={(v) => setTenant(i, { address: v })} />
        ))}
        <p className="text-[12px] text-muted">Le locataire reste redevable du loyer jusqu&apos;à la fin du préavis ; le dernier mois est calculé au prorata des jours.</p>
      </Stack>
    </Card>
  );
}

function ExitInspectionStep({ unit, tenancy, ensure }: { unit: Unit; tenancy?: Tenancy; ensure: () => Tenancy }) {
  const { data, upsert } = useStore();
  const router = useRouter();
  const t = tenancy;
  const { entry, exit } = t ? inspectionsOf(data, t.id) : { entry: undefined, exit: undefined };
  const start = () => {
    const base = t ?? ensure();
    if (exit) return router.push(`/patrimoine/logement/${unit.id}/edl/${exit.id}?retour=${encodeURIComponent(`/patrimoine/logement/${unit.id}/changement?etape=depot`)}`);
    const insp = newExitInspection(unit, base, entry, base.endDate ?? todayIso());
    upsert("inspections", insp);
    router.push(`/patrimoine/logement/${unit.id}/edl/${insp.id}?retour=${encodeURIComponent(`/patrimoine/logement/${unit.id}/changement?etape=depot`)}`);
  };
  const cmp = exit ? compareInspections(entry, exit) : undefined;
  return (
    <Stack>
      <Card>
        <p className="text-[14px] text-ink-2">
          {entry
            ? `L'état des lieux d'entrée du ${dateFr(entry.date)} est repris : pièce par pièce, ne touchez que ce qui a changé. Relevez les compteurs et comptez les clés restituées.`
            : "Pièces et éléments proposés automatiquement. L'état des lieux d'entrée n'étant pas dans l'application, renseignez l'état de chaque élément."}
        </p>
        <div className="mt-4">
          <Button full icon={<ClipboardCheck size={18} />} onClick={start}>
            {exit ? (exit.completedAt ? "Revoir l'état des lieux de sortie" : "Continuer l'état des lieux de sortie") : "Réaliser l'état des lieux de sortie"}
          </Button>
        </div>
      </Card>
      {exit && t && (
        <Card className="py-1">
          <DocRow
            title="État des lieux de sortie"
            status={exit.completedAt ? (cmp?.conform ? "Conforme à l'entrée" : `${cmp?.changes.filter((c) => c.worse).length ?? 0} dégradation(s)`) : "En cours"}
            tone={exit.completedAt ? (cmp?.conform ? "pos" : "warn") : "warn"}
            url={documentUrl({ type: "edl", tenancy: t.id, inspection: exit.id })}
            fileName="etat-des-lieux-sortie.pdf"
          />
        </Card>
      )}

    </Stack>
  );
}

function DepositStep({ unit, tenancy: t, building }: { unit: Unit; tenancy: Tenancy; building?: Building }) {
  const { data, upsert } = useStore();
  const set = (patch: Partial<Tenancy>) => upsert("tenancies", { ...t, ...patch });
  const { entry, exit } = inspectionsOf(data, t.id);
  const cmp = exit ? compareInspections(entry, exit) : undefined;
  const unpaid = unpaidDuring(unit, t);
  const deductions = t.deductions ?? [];
  const s = depositSettlement(t);
  const deadline = depositDue(data, t);
  const penalty = lateDepositPenalty(t.rent, deadline, t.depositReturnedDate ?? todayIso());

  // Suggestions : impayés et dégradations constatées, jamais ajoutées sans action.
  const suggestions: Omit<Deduction, "id">[] = [];
  if (unpaid.amount > 0 && !deductions.some((d) => d.kind === "loyers")) {
    suggestions.push({ kind: "loyers", label: `Loyers et charges impayés (${unpaid.months.length} mois)`, amount: Math.round(unpaid.amount * 100) / 100 });
  }
  for (const c of cmp?.changes.filter((x) => x.worse) ?? []) {
    const label = `${c.room} — ${c.item} (${stateLabel(c.entry)} → ${stateLabel(c.exit)})`;
    if (!deductions.some((d) => d.label === label)) suggestions.push({ kind: "degradation", label });
  }
  for (const k of cmp?.keysMissing ?? []) {
    const label = `${k.kind} non restitué(s) : ${k.missing}`;
    if (!deductions.some((d) => d.label === label)) suggestions.push({ kind: "autre", label });
  }

  const setDeduction = (id: string, patch: Partial<Deduction>) => set({ deductions: deductions.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  return (
    <Stack>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Dépôt versé" value={eur(s.held)} />
          <Mini label="Retenues" value={eur(s.deductions)} />
          <Mini label="À restituer" value={eur(s.toReturn)} strong />
        </div>
        {t.deposit === undefined && (
          <div className="mt-3">
            <NumberField label="Dépôt de garantie versé à l'entrée" value={t.deposit} onChange={(v) => set({ deposit: v })} />
          </div>
        )}
        {s.tenantOwes > 0 && <p className="mt-3 text-[13px] font-semibold text-neg">Les retenues dépassent le dépôt : {eur(s.tenantOwes)} restent dus par le locataire.</p>}
        <p className="mt-3 text-[13px] text-ink-2">
          {deadline ? (
            <>
              À restituer au plus tard le <b>{dateFr(deadline)}</b> ({cmp?.conform ? "1 mois : état des lieux conforme" : "2 mois : état des lieux non conforme ou non comparé"}), à compter de la remise des clés.
            </>
          ) : (
            "Indiquez la date de remise des clés pour connaître le délai de restitution."
          )}
        </p>
        {penalty > 0 && !t.depositReturnedDate && <p className="mt-2 text-[13px] font-semibold text-neg">Délai dépassé : majoration de {eur(penalty)} (10 % du loyer par mois de retard commencé).</p>}
        {building?.legalRegime === "copropriete" && <p className="mt-2 text-[12px] text-muted">En copropriété, une provision d&apos;au plus 20 % du dépôt peut être conservée jusqu&apos;à l&apos;arrêté annuel des comptes.</p>}
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Sparkles size={15} className="text-gold" /> Retenues possibles
          </div>
          <div className="space-y-2">
            {suggestions.map((sug, i) => (
              <button key={i} onClick={() => set({ deductions: [...deductions, { id: uid(), ...sug }] })} className="flex w-full items-center gap-2 rounded-xl bg-soft px-3 py-2 text-left text-[13px] text-ink-2">
                <Plus size={14} className="text-series-1" />
                <span className="flex-1">{sug.label}</span>
                {sug.amount ? <b>{eur(sug.amount)}</b> : null}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">Chaque retenue doit être justifiée (devis, facture) ; l&apos;usure normale ne peut pas être retenue.</p>
        </Card>
      )}

      {deductions.length > 0 && (
        <Card className="space-y-4">
          {deductions.map((d) => (
            <div key={d.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField label="Retenue" value={d.label} onChange={(v) => setDeduction(d.id, { label: v ?? "" })} />
                </div>
                <button aria-label="Supprimer" onClick={() => set({ deductions: deductions.filter((x) => x.id !== d.id) })} className="mt-8 text-muted">
                  <Trash2 size={16} />
                </button>
              </div>
              <Grid2>
                <NumberField label="Montant" value={d.amount} onChange={(v) => setDeduction(d.id, { amount: v })} />
                <TextField label="Justificatif" value={d.justification} placeholder="Ex. devis peintre" onChange={(v) => setDeduction(d.id, { justification: v })} />
              </Grid2>
            </div>
          ))}
        </Card>
      )}
      <button onClick={() => set({ deductions: [...deductions, { id: uid(), kind: "autre", label: "" }] })} className="text-left text-sm font-semibold text-series-1">
        + Ajouter une retenue
      </button>

      <Card>
        <Stack>
          <DateField label="Clés remises le" value={t.keysReturnedDate} onChange={(v) => set({ keysReturnedDate: v })} hint="Point de départ du délai de restitution." />
          <DateField label="Dépôt restitué le" value={t.depositReturnedDate} onChange={(v) => set({ depositReturnedDate: v, depositReturnedAmount: v ? s.toReturn : undefined })} />
          {t.depositReturnedDate && (
            <Button
              full
              variant={t.status === "clos" ? "secondary" : "primary"}
              disabled={t.status === "clos"}
              onClick={() => {
                set({ status: "clos", closedAt: new Date().toISOString() });
                // Loyers impayés retenus sur le dépôt : soldés par compensation.
                const retained = deductions.filter((d) => d.kind === "loyers").reduce((a, d) => a + (d.amount ?? 0), 0);
                let next: Unit = unit;
                if (unpaid.months.length && retained >= unpaid.amount - 0.01) {
                  const payments = { ...(unit.payments ?? {}) };
                  for (const m of unpaid.months) payments[m] = { ...payments[m], status: "paye", note: "Réglé par imputation sur le dépôt de garantie" };
                  next = { ...unit, payments };
                }
                const stillActive = data.tenancies.some((x) => x.unitId === unit.id && x.status === "actif" && x.id !== t.id);
                if (!stillActive) next = unitVacated(next);
                if (next !== unit) upsert("units", next);
              }}
            >
              {t.status === "clos" ? "Dossier clos" : "Clôturer le dossier du locataire sortant"}
            </Button>
          )}
          {!t.depositReturnedDate && <p className="text-[12px] text-muted">Vous pouvez passer à l&apos;arrivée du nouveau locataire et revenir ici au moment de la restitution.</p>}
        </Stack>
      </Card>
    </Stack>
  );
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("rounded-2xl px-2 py-2.5", strong ? "bg-navy text-white" : "bg-soft")}>
      <div className={cx("text-[11px]", strong ? "text-white/60" : "text-muted")}>{label}</div>
      <div className="tabular text-[15px] font-bold">{value}</div>
    </div>
  );
}

// ——— Arrivée ———

function TenantsStep({ tenancy, ensure }: { tenancy?: Tenancy; ensure: () => Tenancy }) {
  const { upsert } = useStore();
  const tenants = tenancy?.tenants ?? [{}];
  const setTenants = (list: Person[]) => upsert("tenancies", { ...(tenancy ?? ensure()), tenants: list });
  return (
    <Stack>
      {tenants.map((p, i) => (
        <Card key={i}>
          <Stack>
            {tenants.length > 1 && (
              <div className="flex items-center justify-between text-[14px] font-semibold text-ink">
                Locataire {i + 1}
                <button onClick={() => setTenants(tenants.filter((_, j) => j !== i))} className="text-[13px] font-medium text-neg">
                  Retirer
                </button>
              </div>
            )}
            <Grid2>
              <TextField label="Prénom" value={p.firstName} onChange={(v) => setTenants(tenants.map((x, j) => (j === i ? { ...x, firstName: v } : x)))} />
              <TextField label="Nom" value={p.lastName} onChange={(v) => setTenants(tenants.map((x, j) => (j === i ? { ...x, lastName: v } : x)))} />
            </Grid2>
            <Grid2>
              <TextField label="E-mail" type="email" value={p.email} onChange={(v) => setTenants(tenants.map((x, j) => (j === i ? { ...x, email: v } : x)))} />
              <TextField label="Portable" type="tel" value={p.phone} onChange={(v) => setTenants(tenants.map((x, j) => (j === i ? { ...x, phone: v } : x)))} />
            </Grid2>
          </Stack>
        </Card>
      ))}
      <button onClick={() => setTenants([...tenants, {}])} className="text-left text-sm font-semibold text-series-1">
        + Ajouter un colocataire / conjoint
      </button>
      {tenants.length > 1 && <p className="text-[12px] text-muted">Plusieurs locataires : une clause de solidarité sera insérée au bail.</p>}
    </Stack>
  );
}

function ConditionsStep({ tenancy, ensure, building, company, unit }: { tenancy?: Tenancy; ensure: () => Tenancy; building?: Building; company?: Company; unit: Unit }) {
  const { upsert } = useStore();
  const t = tenancy ?? undefined;
  const set = (patch: Partial<Tenancy>) => upsert("tenancies", { ...(t ?? ensure()), ...patch });
  const min = minDurationYears(company);
  const max = maxDeposit(t?.rent);
  const version = leaseVersionFor(t?.signDate || t?.startDate);
  return (
    <Stack>
      <Card>
        <Stack>
          <Grid2>
            <DateField label="Date d'entrée" value={t?.startDate} onChange={(v) => set({ startDate: v })} />
            <NumberField label="Durée" suffix="ans" integer value={t?.durationYears} onChange={(v) => set({ durationYears: v })} />
          </Grid2>
          {t?.durationYears && t.durationYears < min ? (
            <p className="-mt-2 rounded-xl bg-warn/10 px-3 py-2 text-[12px] text-warn">
              Bail de {t.durationYears} ans : la loi impose {min} ans à une société bailleresse, sauf SCI familiale (associés parents ou alliés jusqu&apos;au 4e degré). Si {company?.name ?? "la société"} en est une, indiquez-le dans Plus → Informations des sociétés ; sinon le locataire pourra se prévaloir d&apos;un bail de {min} ans.
            </p>
          ) : (
            <p className="-mt-2 text-[12px] text-muted">Durée réglée dans Plus → Informations des sociétés.</p>
          )}
          <Grid2>
            <NumberField label="Loyer hors charges" value={t?.rent} onChange={(v) => set({ rent: v })} />
            <NumberField label="Charges" value={t?.charges} onChange={(v) => set({ charges: v })} />
          </Grid2>
          <Segmented
            value={t?.chargesMode ?? "provision"}
            onChange={(v) => set({ chargesMode: v })}
            options={[
              { value: "provision", label: "Provision + régularisation" },
              { value: "forfait", label: "Forfait" },
            ]}
          />
          <Grid2>
            <NumberField label="Dépôt de garantie" value={t?.deposit} onChange={(v) => set({ deposit: v })} />
            <NumberField label="Payable le" suffix="du mois" integer value={t?.paymentDay} onChange={(v) => set({ paymentDay: v })} />
          </Grid2>
          {max !== undefined && t?.deposit !== undefined && t.deposit > max && <p className="-mt-2 text-[12px] font-semibold text-neg">Le dépôt ne peut pas dépasser un mois de loyer hors charges ({eur(max)}).</p>}
        </Stack>
      </Card>
      <Card>
        <Stack>
          <Grid2>
            <TextField label="Indice de référence (IRL)" value={t?.indexLabel} placeholder="Ex. IRL T2 2026" onChange={(v) => set({ indexLabel: v })} />
            <NumberField label="Valeur" suffix="" value={t?.indexValue} onChange={(v) => set({ indexValue: v })} />
          </Grid2>
          <p className="-mt-2 text-[12px] text-muted">Dernier indice publié par l&apos;INSEE à la date de signature. Il servira aux révisions annuelles (rappel automatique).</p>
          {!building ? null : building.zoneTendue === undefined ? (
            <div>
              <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">La commune est-elle en zone tendue ?</div>
              <Segmented
                value={"?" as string}
                onChange={(v) => building && v !== "?" && upsert("buildings", { ...building, zoneTendue: v === "oui" })}
                options={[
                  { value: "oui", label: "Oui" },
                  { value: "non", label: "Non" },
                  { value: "?", label: "Je ne sais pas" },
                ]}
              />
              <p className="mt-1 px-1 text-[12px] text-muted">Question posée une seule fois pour l&apos;immeuble. Vérifiable sur service-public.fr (simulateur « zone tendue »).</p>
            </div>
          ) : building.zoneTendue ? (
            <>
              <p className="text-[13px] text-ink-2">Zone tendue : l&apos;évolution du loyer à la relocation est encadrée. Loyer du précédent locataire repris automatiquement : <b>{eur(t?.previousTenantRent)}</b>.</p>
              <Grid2>
                <NumberField label="Dernier loyer précédent" value={t?.previousTenantRent} onChange={(v) => set({ previousTenantRent: v })} />
                <DateField label="Versé le" value={t?.previousTenantRentDate} onChange={(v) => set({ previousTenantRentDate: v })} />
              </Grid2>
              {building.rentControl && (
                <Grid2>
                  <NumberField label="Loyer de référence" suffix="€/m²" value={t?.referenceRent} onChange={(v) => set({ referenceRent: v })} />
                  <NumberField label="Loyer de réf. majoré" suffix="€/m²" value={t?.referenceRentMax} onChange={(v) => set({ referenceRentMax: v })} />
                </Grid2>
              )}
            </>
          ) : null}
        </Stack>
      </Card>
      <Card>
        <Stack>
          <Grid2>
            <DateField label="Date de signature" value={t?.signDate} onChange={(v) => set({ signDate: v })} />
            <TextField label="Lieu" value={t?.signPlace} onChange={(v) => set({ signPlace: v })} />
          </Grid2>
          <LegalBadge refDate={t?.signDate || t?.startDate} />
          <p className="-mt-2 text-[12px] text-muted">Modèle appliqué automatiquement selon la date de signature : {version.id === "nue-2026" ? "contrat type 2026 (bail conclu à compter du 1er octobre 2026)" : "contrat type 2015"}.</p>
        </Stack>
      </Card>
      {unit.rent && t?.rent && t.rent !== unit.rent ? <p className="text-[12px] text-muted">Loyer précédent de ce logement : {eur(unit.rent)}.</p> : null}
    </Stack>
  );
}

function GuarantorStep({ tenancy, ensure }: { tenancy?: Tenancy; ensure: () => Tenancy }) {
  const { upsert } = useStore();
  const t = tenancy;
  const list = t?.guarantors;
  const kind = list === undefined ? undefined : list.length === 0 ? "aucun" : list[0].kind;
  const set = (guarantors: Guarantor[]) => upsert("tenancies", { ...(t ?? ensure()), guarantors, annexes: withAnnex(t?.annexes, "caution", guarantors.some((g) => g.kind === "personne")) });
  const g = list?.[0];
  return (
    <Stack>
      <Segmented
        value={kind ?? ("?" as string)}
        onChange={(v) => set(v === "aucun" ? [] : [{ durationYears: t?.durationYears, ...(g ?? {}), kind: v as Guarantor["kind"] }])}
        options={[
          { value: "aucun", label: "Aucune" },
          { value: "personne", label: "Caution" },
          { value: "visale", label: "Visale" },
        ]}
      />
      {kind === "personne" && g && (
        <Card>
          <Stack>
            <Grid2>
              <TextField label="Prénom" value={g.firstName} onChange={(v) => set([{ ...g, firstName: v }])} />
              <TextField label="Nom" value={g.lastName} onChange={(v) => set([{ ...g, lastName: v }])} />
            </Grid2>
            <TextField label="Adresse" value={g.address} onChange={(v) => set([{ ...g, address: v }])} />
            <Grid2>
              <DateField label="Date de naissance" value={g.birthDate} onChange={(v) => set([{ ...g, birthDate: v }])} />
              <TextField label="Lieu de naissance" value={g.birthPlace} onChange={(v) => set([{ ...g, birthPlace: v }])} />
            </Grid2>
            <Grid2>
              <NumberField label="Montant maximal garanti" value={g.maxAmount} onChange={(v) => set([{ ...g, maxAmount: v }])} />
              <NumberField label="Durée" suffix="ans" integer value={g.durationYears} onChange={(v) => set([{ ...g, durationYears: v }])} />
            </Grid2>
            <p className="text-[12px] text-muted">
              Suggestion : {t?.rent ? eur(((t.rent ?? 0) + (t.charges ?? 0)) * 12 * (t.durationYears ?? 3)) : "—"} (loyer + charges sur la durée du bail). L&apos;acte de cautionnement est généré et annexé au bail ; la caution y écrit elle-même la mention prévue par l&apos;article 2297 du code civil.
            </p>
          </Stack>
        </Card>
      )}
      {kind === "visale" && g && (
        <Card>
          <TextField label="Numéro de visa" value={g.visaNumber} onChange={(v) => set([{ ...g, visaNumber: v }])} />
        </Card>
      )}
    </Stack>
  );
}

function withAnnex(list: string[] | undefined, id: string, on: boolean): string[] {
  const set = new Set(list ?? []);
  if (on) set.add(id);
  else set.delete(id);
  return [...set];
}

function UnitInfoStep({ unit, building }: { unit: Unit; building?: Building }) {
  const { upsert } = useStore();
  const setU = (patch: Partial<Unit>) => upsert("units", { ...unit, ...patch });
  const setB = (patch: Partial<Building>) => building && upsert("buildings", { ...building, ...patch });
  const mu = new Set(missingUnitInfo(unit));
  const mb = new Set(missingBuildingInfo(building));
  const [all, setAll] = useState(false);
  const show = (k: string, set: Set<string>) => all || set.has(k);
  return (
    <Stack>
      <p className="text-[13px] text-muted">Seules les informations manquantes pour le bail sont demandées ; elles sont gardées pour les prochains baux.</p>
      <Card>
        <Stack>
          {building && show("address", mb) && <TextField label="Adresse de l'immeuble" value={building.address} onChange={(v) => setB({ address: v })} />}
          {building && show("city", mb) && <TextField label="Code postal et commune" value={building.city} onChange={(v) => setB({ city: v })} />}
          {building && show("legalRegime", mb) && (
            <SelectField
              label="Régime de l'immeuble"
              value={building.legalRegime}
              options={[
                { value: "monopropriete", label: "Monopropriété (immeuble entier)" },
                { value: "copropriete", label: "Copropriété" },
              ]}
              onChange={(v) => setB({ legalRegime: v })}
            />
          )}
          {building && show("constructionPeriod", mb) && <SelectField label="Période de construction" value={building.constructionPeriod} options={[...CONSTRUCTION_PERIODS]} onChange={(v) => setB({ constructionPeriod: v })} />}
          {building && show("zoneTendue", mb) && (
            <SelectField
              label="Commune en zone tendue"
              value={building.zoneTendue === undefined ? undefined : building.zoneTendue ? "oui" : "non"}
              options={[
                { value: "non", label: "Non" },
                { value: "oui", label: "Oui" },
              ]}
              onChange={(v) => setB({ zoneTendue: v === undefined ? undefined : v === "oui" })}
            />
          )}
          {show("surface", mu) && <NumberField label="Surface habitable" suffix="m²" value={unit.surface} onChange={(v) => setU({ surface: v })} />}
          {show("mainRooms", mu) && <NumberField label="Nombre de pièces principales" suffix="" integer value={unit.mainRooms} onChange={(v) => setU({ mainRooms: v })} />}
          {show("habitatType", mu) && (
            <SelectField
              label="Type d'habitat"
              value={unit.habitatType}
              options={[
                { value: "collectif", label: "Immeuble collectif" },
                { value: "individuel", label: "Individuel (maison)" },
              ]}
              onChange={(v) => setU({ habitatType: v })}
            />
          )}
          {show("heating", mu) && (
            <Grid2>
              <SelectField label="Chauffage" value={unit.heating} options={[{ value: "individuel", label: "Individuel" }, { value: "collectif", label: "Collectif" }]} onChange={(v) => setU({ heating: v })} />
              <TextField label="Énergie" value={unit.heatingEnergy} placeholder="Électricité, gaz…" onChange={(v) => setU({ heatingEnergy: v })} />
            </Grid2>
          )}
          {show("hotWater", mu) && (
            <Grid2>
              <SelectField label="Eau chaude" value={unit.hotWater} options={[{ value: "individuel", label: "Individuelle" }, { value: "collectif", label: "Collective" }]} onChange={(v) => setU({ hotWater: v })} />
              <TextField label="Énergie" value={unit.hotWaterEnergy} placeholder="Électricité, gaz…" onChange={(v) => setU({ hotWaterEnergy: v })} />
            </Grid2>
          )}
          {show("dpeClass", mu) && (
            <>
              <SelectField label="Classe DPE" value={unit.dpeClass} options={(["A", "B", "C", "D", "E", "F", "G"] as const).map((c) => ({ value: c, label: c }))} onChange={(v) => setU({ dpeClass: v })} />
              <Grid2>
                <NumberField label="Dépenses d'énergie : min" suffix="€/an" value={unit.energyCostMin} onChange={(v) => setU({ energyCostMin: v })} />
                <NumberField label="max" suffix="€/an" value={unit.energyCostMax} onChange={(v) => setU({ energyCostMax: v })} />
              </Grid2>
              <p className="-mt-2 text-[12px] text-muted">Mentions du DPE reprises dans le bail (fourchette et année de référence des prix).</p>
            </>
          )}
          {all && (
            <>
              <TextField label="Étage" value={unit.floor} onChange={(v) => setU({ floor: v })} />
              <TextField label="Équipements du logement" value={unit.equipments} multiline placeholder="Cuisine équipée, salle d'eau…" onChange={(v) => setU({ equipments: v })} />
              <TextField label="Annexes privatives (cave, parking…)" value={unit.accessories} onChange={(v) => setU({ accessories: v })} />
            </>
          )}
        </Stack>
      </Card>
      {!all && (
        <button onClick={() => setAll(true)} className="text-left text-sm font-semibold text-series-1">
          Voir toutes les informations du logement
        </button>
      )}
    </Stack>
  );
}

function LandlordStep({ company }: { company: Company }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Company>) => upsert("companies", { ...company, ...patch });
  const missing = new Set(missingLandlordInfo(company));
  return (
    <Card>
      <Stack>
        <p className="text-[13px] text-muted">Bailleur : {company.name}. Informations demandées une seule fois, reprises dans tous les documents.</p>
        {missing.has("address") && <TextField label="Adresse du siège" value={company.address} onChange={(v) => set({ address: v })} />}
        {missing.has("representative") && (
          <Grid2>
            <TextField label="Représentée par" value={company.representative} placeholder="Prénom Nom" onChange={(v) => set({ representative: v })} />
            <TextField label="En qualité de" value={company.representativeRole} placeholder="Gérant" onChange={(v) => set({ representativeRole: v })} />
          </Grid2>
        )}
        {missing.has("familySci") && (
          <div>
            <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">SCI familiale (associés parents ou alliés jusqu&apos;au 4e degré) ?</div>
            <Segmented
              value={company.familySci === undefined ? "?" : company.familySci ? "oui" : "non"}
              onChange={(v) => set({ familySci: v === "?" ? undefined : v === "oui" })}
              options={[
                { value: "oui", label: "Oui (bail 3 ans)" },
                { value: "non", label: "Non (bail 6 ans)" },
              ]}
            />
          </div>
        )}
        <Grid2>
          <TextField label="E-mail (facultatif)" type="email" value={company.email} onChange={(v) => set({ email: v })} />
          <TextField label="Portable (facultatif)" type="tel" value={company.phone} onChange={(v) => set({ phone: v })} />
        </Grid2>
        <TextField label="SIREN (facultatif)" value={company.siren} onChange={(v) => set({ siren: v })} />
      </Stack>
    </Card>
  );
}

function ClausesStep({ tenancy, ensure, unit, building }: { tenancy?: Tenancy; ensure: () => Tenancy; unit: Unit; building?: Building }) {
  const { upsert } = useStore();
  const t = tenancy;
  const set = (patch: Partial<Tenancy>) => upsert("tenancies", { ...(t ?? ensure()), ...patch });
  const version = leaseVersionFor(t?.signDate || t?.startDate);
  const joined = new Set(t?.annexes ?? []);
  const base = t ?? ({ tenants: [], unitId: unit.id, id: "", status: "brouillon" } as Tenancy);
  const annexes = ANNEXES.filter((a) => a.applies({ unit, building, tenancy: base }) || joined.has(a.id) || !a.required);
  return (
    <Stack>
      {version.id === "nue-2026" && (
        <Card>
          <div className="text-[14px] font-semibold text-ink">Clauses résolutoires</div>
          <p className="mt-1 text-[12px] text-muted">Clause obligatoire incluse d&apos;office : impayé de loyer, de charges ou de dépôt de garantie (six semaines après commandement de payer). Clauses facultatives :</p>
          <div className="mt-2 space-y-2">
            <Toggle label="Défaut d'assurance du locataire" value={!!t?.clauseInsurance} onChange={(v) => set({ clauseInsurance: v })} />
            <Toggle label="Troubles de voisinage constatés par le juge" value={!!t?.clauseNeighbours} onChange={(v) => set({ clauseNeighbours: v })} />
            <Toggle label="Non-respect de la servitude de résidence principale" value={!!t?.clauseMainResidence} onChange={(v) => set({ clauseMainResidence: v })} />
          </div>
        </Card>
      )}
      <Card>
        <div className="text-[14px] font-semibold text-ink">Annexes jointes au bail</div>
        <p className="mt-1 text-[12px] text-muted">Cochez les documents que vous joindrez. Les annexes obligatoires pour ce logement sont signalées.</p>
        <div className="mt-2 space-y-2">
          {annexes.map((a) => {
            const required = a.required && a.applies({ unit, building, tenancy: base });
            return <Toggle key={a.id} label={a.label} hint={required ? "Obligatoire" : undefined} value={joined.has(a.id)} onChange={(v) => set({ annexes: withAnnex(t?.annexes, a.id, v) })} />;
          })}
        </div>
      </Card>
      <Card>
        <TextField label="Conditions particulières (facultatif)" value={t?.specialConditions} multiline onChange={(v) => set({ specialConditions: v })} />
      </Card>
    </Stack>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center gap-3 text-left">
      <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", value ? "border-navy bg-navy text-white" : "border-line bg-card")}>{value && <Check size={14} />}</span>
      <span className="flex-1 text-[14px] text-ink">
        {label}
        {hint && <span className="ml-1.5 rounded-full bg-warn/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">{hint}</span>}
      </span>
    </button>
  );
}

const BLANK_LABELS: Record<string, string> = {
  address: "adresse",
  city: "commune",
  legalRegime: "régime de l'immeuble",
  constructionPeriod: "période de construction",
  zoneTendue: "zone tendue",
  surface: "surface habitable",
  mainRooms: "nombre de pièces",
  habitatType: "type d'habitat",
  heating: "chauffage",
  hotWater: "eau chaude",
  dpeClass: "classe DPE",
  representative: "représentant du bailleur",
};

function DocumentsStep({ unit, tenancy: t, outgoing, onActivated, onEditInfo }: { unit: Unit; tenancy?: Tenancy; outgoing?: Tenancy; onActivated: () => void; onEditInfo: () => void }) {
  const { data, upsert } = useStore();
  const router = useRouter();
  if (!t) return <Card><p className="text-sm text-muted">Renseignez d&apos;abord le nouveau locataire.</p></Card>;
  const entry = inspectionsOf(data, t.id).entry;
  const missing: string[] = [];
  if (!stepDone(t, "locataire")) missing.push("nom et prénom du locataire");
  if (!stepDone(t, "conditions")) missing.push("date d'entrée, loyer, durée et dépôt");
  // Mentions du bail encore en blanc (le document peut être généré, mais sera à compléter à la main).
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const blanks = [
    ...missingBuildingInfo(building).map((k) => BLANK_LABELS[k as string]),
    ...missingUnitInfo(unit).map((k) => BLANK_LABELS[k as string]),
    ...missingLandlordInfo(landlordCompany(data, unit)).filter((k) => k !== "familySci").map((k) => BLANK_LABELS[k as string]),
    ...(t.indexLabel ? [] : ["indice de référence (IRL)"]),
  ].filter(Boolean);
  const guarantors = (t.guarantors ?? []).filter((g) => g.kind === "personne");

  const startEntry = () => {
    const retour = encodeURIComponent(`/patrimoine/logement/${unit.id}/changement?etape=documents`);
    if (entry) return router.push(`/patrimoine/logement/${unit.id}/edl/${entry.id}?retour=${retour}`);
    const insp = newEntryInspection(unit, t, lastExitInspection(data, unit.id), t.startDate);
    upsert("inspections", insp);
    router.push(`/patrimoine/logement/${unit.id}/edl/${insp.id}?retour=${retour}`);
  };

  const activate = () => {
    upsert("tenancies", { ...t, status: "actif", annexes: withAnnex(t.annexes, "edl", true) });
    upsert("units", unitWithTenancy(unit, t));
    // Le locataire sortant passe en « départ » s'il était encore actif.
    if (outgoing && outgoing.status === "actif") upsert("tenancies", { ...outgoing, status: "sortie" });
    onActivated();
  };

  return (
    <Stack>
      {missing.length > 0 && <div className="rounded-2xl bg-warn/10 px-4 py-3 text-[13px] text-warn">À compléter : {missing.join(", ")}.</div>}
      {blanks.length > 0 && (
        <div className="rounded-2xl bg-soft px-4 py-3 text-[13px] text-ink-2">
          Mentions laissées en blanc dans le bail : {blanks.join(", ")}.{" "}
          <button onClick={onEditInfo} className="font-semibold text-series-1 underline">
            Les compléter
          </button>
        </div>
      )}
      <Card className="py-1">
        <div className="divide-y divide-line">
          <DocRow title="Bail de location" subtitle={`${tenantsName(t) || "Locataire"} · ${eur(t.rent)} + ${eur(t.charges)}`} url={documentUrl({ type: "bail", tenancy: t.id })} fileName={`bail-${unit.name}.pdf`} />
          {guarantors.map((g, i) => (
            <DocRow key={i} title="Acte de cautionnement" subtitle={[g.firstName, g.lastName].filter(Boolean).join(" ")} url={documentUrl({ type: "caution", tenancy: t.id, index: i })} fileName={`caution-${i + 1}.pdf`} />
          ))}
          <DocRow
            title="État des lieux d'entrée"
            status={entry ? (entry.completedAt ? "Terminé" : "En cours") : "À réaliser le jour de l'entrée"}
            tone={entry?.completedAt ? "pos" : "warn"}
            url={entry ? documentUrl({ type: "edl", tenancy: t.id, inspection: entry.id }) : undefined}
            fileName="etat-des-lieux-entree.pdf"
            action={
              <button onClick={startEntry} className="rounded-full bg-navy px-3 py-1.5 text-[13px] font-semibold text-white">
                {entry ? "Ouvrir" : "Préparer"}
              </button>
            }
          />
        </div>
      </Card>
      <Card>
        <div className="text-[14px] font-semibold text-ink">Annexes à joindre</div>
        <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
          {ANNEXES.filter((a) => (t.annexes ?? []).includes(a.id) && a.id !== "caution" && a.id !== "edl").map((a) => (
            <li key={a.id}>• {a.label}</li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-muted">La notice d&apos;information officielle et les diagnostics sont des documents à joindre tels quels (non générés par l&apos;application).</p>
      </Card>
      <LegalBadge refDate={t.signDate || t.startDate} />
      <Button full disabled={missing.length > 0} onClick={activate}>
        Valider le nouveau bail
      </Button>
      <p className="text-center text-[12px] text-muted">Le logement passe au nom du nouveau locataire : loyers, rappels (révision, fin de bail 8 mois avant) et quittances sont mis à jour.</p>
      <Link href={`/patrimoine/logement/${unit.id}`} className="text-center text-sm font-semibold text-series-1">
        Revenir à la fiche du logement
      </Link>
    </Stack>
  );
}
