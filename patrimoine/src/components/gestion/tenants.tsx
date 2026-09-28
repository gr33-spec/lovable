"use client";

import { usePageState } from "@/lib/nav";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRightLeft, ChevronDown, ChevronRight, ClipboardCheck, DoorOpen, FileSignature, ReceiptText, Search, Trash2, UserPlus } from "lucide-react";
import { SwipeRow, useDismiss, useUndoableRemove, type SwipeAction } from "../swipe";
import { missingCount, unitMissing, type MissingItem } from "@/lib/missing";
import { useStore } from "@/lib/store";
import type { AppData, Unit } from "@/lib/types";
import { eur } from "@/lib/format";
import { leaseInfo, todayIso, unpaidByUnit, addMonthsIso, LEASE_END_NOTICE_MONTHS } from "@/lib/engine/leases";
import { activeTenancy, draftTenancy, inspectionsOf, leavingTenancy, tenantsName } from "@/lib/tenancy";
import { cx } from "../ui";
import { DragGhost, TenantHandle, dropTarget, useMoveTenant, useTenantDnd, type TenantDnd } from "../details/move-tenant";
import { hasTenant, sortedUnits } from "@/lib/move-tenant";

// Vue « Locataires » de l'onglet Gestion : tous les logements, immeuble par
// immeuble, avec leur situation et les actions courantes à portée de doigt.

export type UnitFlag = { label: string; tone: "neg" | "warn" | "blue" | "pos" };

/** Situation d'un logement : impayé, départ, bail à signer, état des lieux… */
export function unitFlags(data: AppData, unit: Unit, unpaid: Map<string, number>, today: string): UnitFlag[] {
  const flags: UnitFlag[] = [];
  const due = unpaid.get(unit.id);
  if (due) flags.push({ label: `Impayé ${eur(due)}`, tone: "neg" });
  const leaving = leavingTenancy(data, unit.id);
  if (leaving) flags.push({ label: leaving.depositReturnedDate ? "Départ à clôturer" : "Dépôt à restituer", tone: "warn" });
  if (draftTenancy(data, unit.id)) flags.push({ label: "Nouveau bail en cours", tone: "blue" });
  const active = activeTenancy(data, unit.id);
  if (active && !active.imported) {
    const dismissed = new Set(data.settings.dismissedReminders ?? []);
    if (!active.signatures?.landlord && !dismissed.has(`sign:${active.id}`)) flags.push({ label: "Bail à signer", tone: "warn" });
    const { entry } = inspectionsOf(data, active.id);
    if (!entry?.completedAt && !dismissed.has(`edl:${active.id}`)) flags.push({ label: "État des lieux à faire", tone: "warn" });
  }
  if (unit.status !== "vacant") {
    const info = leaseInfo(unit, today);
    if (info.end && (info.expired || today >= addMonthsIso(info.end, -LEASE_END_NOTICE_MONTHS))) flags.push({ label: "Fin de bail proche", tone: "blue" });
  }
  return flags;
}

type Filter = "tous" | "loues" | "vacants" | "impayes" | "suivi" | "incomplets";

export function TenantsView() {
  const { data } = useStore();
  // Recherche, filtre et immeubles ouverts sont retrouvés au retour d'une fiche.
  const [q, setQ] = usePageState("recherche", "");
  const [filter, setFilter] = usePageState<Filter>("filtre", "tous");
  const [openIds, setOpenIds] = usePageState<string[]>("ouverts", []);
  const open = new Set(openIds);
  const today = todayIso();
  const unpaid = useMemo(() => new Map(unpaidByUnit(data.units).map((l) => [l.unit.id, l.amount])), [data.units]);
  const moveTenant = useMoveTenant();
  const dnd = useTenantDnd((fromId, toId) => {
    const from = data.units.find((u) => u.id === fromId);
    const to = data.units.find((u) => u.id === toId);
    if (from && to) moveTenant(from, to);
  });

  const totalMissing = missingCount(data);
  const needle = q.trim().toLowerCase();
  const groups = data.buildings
    .map((b) => {
      const all = sortedUnits(data.units.filter((u) => u.buildingId === b.id));
      const units = all.filter((u) => {
        const flags = unitFlags(data, u, unpaid, today);
        if (filter === "loues" && u.status === "vacant") return false;
        if (filter === "vacants" && u.status !== "vacant") return false;
        if (filter === "impayes" && !unpaid.has(u.id)) return false;
        if (filter === "suivi" && !flags.some((f) => f.tone !== "neg")) return false;
        if (filter === "incomplets" && unitMissing(data, u).length === 0) return false;
        if (!needle) return true;
        return [u.name, u.tenantFirstName, u.tenantLastName, b.name, b.city].filter(Boolean).join(" ").toLowerCase().includes(needle);
      });
      return { building: b, all, units };
    })
    .filter((g) => g.units.length > 0);
  const expandAll = !!needle || filter !== "tous";

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "tous", label: "Tous" },
    { value: "loues", label: "Loués" },
    { value: "vacants", label: "Vacants" },
    { value: "impayes", label: `Impayés${unpaid.size ? ` (${unpaid.size})` : ""}` },
    { value: "suivi", label: "À suivre" },
    { value: "incomplets", label: `À compléter${totalMissing ? ` (${totalMissing})` : ""}` },
  ];

  return (
    <div>
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Locataire, logement, immeuble…"
          className="w-full rounded-2xl border border-line bg-card py-3 pl-11 pr-4 text-[16px] outline-none focus:border-series-1"
        />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", filter === f.value ? "bg-navy text-white" : "bg-soft text-ink-2")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 2xl:grid-cols-3">
        {groups.length === 0 && <div className="py-10 text-center text-sm text-muted">Aucun logement ne correspond.</div>}
        {groups.map(({ building, all, units }) => {
          const rented = all.filter((u) => u.status !== "vacant").length;
          const late = all.filter((u) => unpaid.has(u.id)).length;
          const missing = missingCount(data, all);
          const isOpen = expandAll || open.has(building.id);
          return (
            <div key={building.id} className="soft-card overflow-hidden rounded-[24px]">
              <button
                onClick={() => setOpenIds((cur) => (cur.includes(building.id) ? cur.filter((x) => x !== building.id) : [...cur, building.id]))}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-bold text-navy">{building.name}</span>
                    {missing > 0 && (
                      <span aria-label={`${missing} élément(s) à compléter`} className="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-neg px-1.5 text-[11px] font-bold text-white">
                        {missing}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {rented}/{all.length} loués{late > 0 && <span className="font-semibold text-neg"> · {late} impayé{late > 1 ? "s" : ""}</span>}
                    {missing > 0 && <span className="text-neg"> · {missing} à compléter</span>}
                  </div>
                </div>
                <ChevronDown size={18} className={cx("shrink-0 text-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="divide-y divide-line border-t border-line">
                  {units.map((u) => (
                    <div key={u.id} {...dropTarget(dnd, u.id, building.id)}>
                      <UnitLine unit={u} flags={unitFlags(data, u, unpaid, today)} missing={unitMissing(data, u)} dnd={all.length > 1 ? dnd : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <DragGhost dnd={dnd} units={data.units} />
    </div>
  );
}

const TONE: Record<UnitFlag["tone"], string> = {
  neg: "bg-neg/10 text-neg",
  warn: "bg-warn/10 text-warn",
  blue: "bg-series-1/10 text-series-1",
  pos: "bg-pos/10 text-pos",
};

function UnitLine({ unit, flags, missing, dnd }: { unit: Unit; flags: UnitFlag[]; missing: MissingItem[]; dnd?: TenantDnd }) {
  const { data } = useStore();
  const vacant = unit.status === "vacant";
  const active = activeTenancy(data, unit.id);
  const tenant = active ? tenantsName(active) : [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  const href = `/patrimoine/logement/${unit.id}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`${href}?depuis=gestion`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", vacant ? "bg-warn/10 text-warn" : "bg-soft text-navy")}>
          <DoorOpen size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">
            {unit.name}
            <span className="font-normal text-muted">
              {" · "}
              {vacant ? "Vacant" : dnd && hasTenant(data, unit) ? <TenantHandle dnd={dnd} unitId={unit.id} group={unit.buildingId} label={tenant || "Locataire"} className="text-[13.5px]" /> : tenant || "Locataire à renseigner"}
            </span>
          </span>
          <span className="tabular block text-[12.5px] text-muted">{eur((unit.rent ?? 0) + (unit.charges ?? 0))} / mois</span>
          {missing.length > 0 && (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-neg">Manque</span>
              {missing.map((m) => (
                <span key={m.id} className="rounded-full border border-neg/30 bg-neg/5 px-2 py-0.5 text-[10.5px] font-semibold text-neg">
                  {m.label}
                </span>
              ))}
            </span>
          )}
          {flags.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {flags.map((f) => (
                <span key={f.label} className={cx("rounded-full px-2 py-0.5 text-[10.5px] font-bold", TONE[f.tone])}>
                  {f.label}
                </span>
              ))}
            </span>
          )}
        </span>
      </Link>
      {vacant ? (
        <Link href={`${href}/changement`} className="flex shrink-0 items-center gap-1 rounded-full bg-navy px-3 py-2 text-[12.5px] font-semibold text-white">
          <UserPlus size={14} /> Louer
        </Link>
      ) : (
        <div className="flex shrink-0 gap-1.5">
          <Link href={`${href}?action=quittance`} aria-label="Quittance" className="flex h-9 w-9 items-center justify-center rounded-full bg-pos/10 text-pos">
            <ReceiptText size={16} />
          </Link>
          <Link href={`${href}/changement`} aria-label="Changer de locataire" className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-navy">
            <ArrowRightLeft size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ——— À faire ———

export interface Task {
  id: string;
  /** Brouillon de bail (supprimable) ; sinon la démarche peut être ignorée. */
  draftId?: string;
  title: string;
  detail: string;
  href: string;
  tone: UnitFlag["tone"];
  icon: React.ReactNode;
}

/** Démarches de gestion en cours (hors rappels datés). */
export function managementTasks(data: AppData): Task[] {
  const out: Task[] = [];
  for (const unit of data.units) {
    const building = data.buildings.find((b) => b.id === unit.buildingId);
    const place = [building?.name, unit.name].filter(Boolean).join(" · ");
    const href = `/patrimoine/logement/${unit.id}`;
    const draft = draftTenancy(data, unit.id);
    if (draft) out.push({ id: `draft:${draft.id}`, draftId: draft.id, title: "Nouveau bail à finaliser", detail: `${place}${tenantsName(draft) ? ` — ${tenantsName(draft)}` : ""}`, href: `${href}/changement`, tone: "blue", icon: <FileSignature size={18} /> });
    const active = activeTenancy(data, unit.id);
    if (active && !active.imported) {
      const { entry } = inspectionsOf(data, active.id);
      if (!entry?.completedAt) out.push({ id: `edl:${active.id}`, title: "État des lieux d'entrée à réaliser", detail: `${place} — ${tenantsName(active)}`, href, tone: "warn", icon: <ClipboardCheck size={18} /> });
      if (!active.signatures?.landlord) out.push({ id: `sign:${active.id}`, title: "Bail à signer", detail: `${place} — ${tenantsName(active)}`, href, tone: "warn", icon: <FileSignature size={18} /> });
    }
    const leaving = leavingTenancy(data, unit.id);
    if (leaving && !inspectionsOf(data, leaving.id).exit?.completedAt) out.push({ id: `exit:${leaving.id}`, title: "État des lieux de sortie à réaliser", detail: `${place} — ${tenantsName(leaving)}`, href: `${href}/changement`, tone: "warn", icon: <ClipboardCheck size={18} /> });
  }
  const dismissed = new Set(data.settings.dismissedReminders ?? []);
  return out.filter((t) => !dismissed.has(t.id));
}

/** Démarche : appui = ouvrir ; balayage = supprimer le brouillon ou ignorer (fait hors application). */
export function TaskRow({ task }: { task: Task }) {
  const { data } = useStore();
  const dismiss = useDismiss();
  const removeUndoable = useUndoableRemove();
  const action: SwipeAction = task.draftId
    ? {
        label: "Supprimer",
        icon: <Trash2 size={18} />,
        tone: "neg",
        onAction: () =>
          removeUndoable(
            [{ coll: "tenancies", id: task.draftId! }, ...data.inspections.filter((i) => i.tenancyId === task.draftId).map((i) => ({ coll: "inspections" as const, id: i.id }))],
            "Brouillon de bail supprimé",
          ),
      }
    : { label: "Ignorer", icon: <Trash2 size={18} />, tone: "neg", onAction: () => dismiss(task.id, "Démarche ignorée") };
  return (
    <SwipeRow actions={[action]}>
      <Link href={task.href} className="flex items-center gap-3 py-3 active:opacity-60">
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", TONE[task.tone])}>{task.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{task.title}</span>
          <span className="block truncate text-[13px] text-muted">{task.detail}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted/70" />
      </Link>
    </SwipeRow>
  );
}
