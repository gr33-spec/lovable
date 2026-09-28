"use client";

import { replaceQuery, usePageState } from "@/lib/nav";
import { sortedUnits } from "@/lib/lots";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, ChevronDown, DoorOpen, Landmark, Plus, Briefcase } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Building, Company } from "@/lib/types";
import { NO_COMPANY, cashflowMonthly, netWorth, type Figures } from "@/lib/engine/snapshot";
import { monthLabel } from "@/lib/engine/dates";
import { eurCompact, eurSigned } from "@/lib/format";
import { labelOf, UNIT_TYPES } from "@/lib/labels";
import { AddMenu } from "@/components/quick-add";
import { OrgChart } from "@/components/org-chart";
import { ProjectsList } from "@/components/projects/list";
import { WorksList } from "@/components/works-list";
import { Avatar, Card, Empty, Page, PageHeader, Pill, RoundButton, Segmented, cx, Button } from "@/components/ui";

export default function PatrimoinePage() {
  return (
    <Suspense>
      <Patrimoine />
    </Suspense>
  );
}

function Patrimoine() {
  const { data, projection } = useStore();
  const snap = projection.snapshot;
  const [adding, setAdding] = useState(false);
  const initial = useSearchParams().get("vue");
  type View = "structure" | "credits" | "travaux" | "projets";
  // La rubrique vit dans l'adresse : un retour ou un lien (ex. « Travaux ») y ramène directement.
  const view: View = initial === "projets" || initial === "credits" || initial === "travaux" ? initial : "structure";
  const setView = (v: View) => replaceQuery({ vue: v === "structure" ? undefined : v });
  // L'organigramme est une autre façon de voir la structure, pas une rubrique à part.
  const [chart, setChart] = usePageState("organigramme", initial === "organigramme");
  const [open, setOpen] = usePageState<Record<string, boolean>>("arbre", () => {
    const o: Record<string, boolean> = {};
    for (const c of data.companies) if (c.kind === "holding" || !c.parentId) o[c.id] = true;
    return o;
  });
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const ids = new Set(data.companies.map((c) => c.id));
  const roots = data.companies.filter((c) => !c.parentId || !ids.has(c.parentId));
  const orphanBuildings = data.buildings.filter((b) => !b.companyId || !ids.has(b.companyId));

  const renderCompany = (c: Company, depth: number, seen: Set<string>): React.ReactNode => {
    if (seen.has(c.id)) return null;
    seen.add(c.id);
    const children = data.companies.filter((x) => x.parentId === c.id);
    const buildings = data.buildings.filter((b) => b.companyId === c.id);
    const f = snap.byCompany.get(c.id);
    const isOpen = !!open[c.id];
    const hasChildren = children.length + buildings.length > 0;
    return (
      <div key={c.id}>
        <TreeRow
          depth={depth}
          href={`/patrimoine/societe/${c.id}`}
          icon={<Briefcase size={18} />}
          avatar={c.kind === "holding" ? undefined : <Avatar id={c.id} name={c.name} size={36} square index={data.companies.filter((x) => x.kind !== "holding").findIndex((x) => x.id === c.id)} />}
          title={c.name}
          badge={c.kind === "holding" ? "Holding" : c.kind}
          figures={f}
          open={isOpen}
          onToggle={hasChildren ? () => toggle(c.id) : undefined}
          emphasis={depth === 0}
        />
        {isOpen && (
          <>
            {children.map((child) => renderCompany(child, depth + 1, seen))}
            {buildings.map((b) => renderBuilding(b, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const renderBuilding = (b: Building, depth: number) => {
    const units = sortedUnits(data.units.filter((u) => u.buildingId === b.id));
    const isOpen = !!open[b.id];
    return (
      <div key={b.id}>
        <TreeRow
          depth={depth}
          href={`/patrimoine/immeuble/${b.id}`}
          icon={<Building2 size={18} />}
          title={b.name}
          subtitle={b.city}
          figures={snap.byBuilding.get(b.id)}
          open={isOpen}
          onToggle={units.length ? () => toggle(b.id) : undefined}
        />
        {isOpen &&
          units.map((u) => (
            <Link
              key={u.id}
              href={`/patrimoine/logement/${u.id}`}
              className="flex items-center gap-3 py-2.5 pr-1"
              style={{ paddingLeft: 12 + (depth + 1) * 16 }}
            >
              <DoorOpen size={16} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {u.name}
                {u.type && <span className="text-muted"> · {labelOf(UNIT_TYPES, u.type)}</span>}
              </div>
              {u.status === "vacant" ? <Pill tone="warn">Vacant</Pill> : <span className="tabular text-sm text-ink-2">{eurCompact(u.rent)}</span>}
            </Link>
          ))}
      </div>
    );
  };

  const seen = new Set<string>();
  const loans = [...data.loans].sort((a, b) => {
    const ea = snap.resolvedLoans.get(a.id)?.endMonth ?? Infinity;
    const eb = snap.resolvedLoans.get(b.id)?.endMonth ?? Infinity;
    return ea - eb;
  });

  return (
    <>
      <PageHeader title="Patrimoine" subtitle="Patrimoine net · cash-flow par mois" action={<RoundButton label="Ajouter" onClick={() => setAdding(true)}><Plus size={22} /></RoundButton>} />
      <Page>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "structure", label: "Structure" },
            { value: "credits", label: "Crédits" },
            { value: "travaux", label: "Travaux" },
            { value: "projets", label: "Projets" },
          ]}
        />
        {view === "structure" && (data.companies.length > 0 || data.buildings.length > 0) && (
          <div className="mt-3 flex justify-end">
            <div className="inline-flex rounded-full bg-black/5 p-0.5 text-[13px] font-semibold">
              {[false, true].map((c) => (
                <button key={String(c)} onClick={() => setChart(c)} className={cx("rounded-full px-3.5 py-1.5 transition", chart === c ? "bg-card text-navy shadow-sm" : "text-ink-2")}>
                  {c ? "Organigramme" : "Liste"}
                </button>
              ))}
            </div>
          </div>
        )}
        {view === "projets" ? (
          <ProjectsList />
        ) : view === "travaux" ? (
          <WorksList />
        ) : view === "structure" && chart ? (
          <OrgChart />
        ) : view === "structure" ? (
          data.companies.length === 0 && data.buildings.length === 0 ? (
            <Empty
              icon={<Building2 size={26} />}
              title="Aucun bien pour l'instant"
              text="Commencez par créer votre holding ou directement un immeuble."
              action={<Button onClick={() => setAdding(true)} icon={<Plus size={18} />}>Ajouter</Button>}
            />
          ) : (
            <Card className="mt-3 px-3 py-1">
              <div className="divide-y divide-line">
                {roots.map((c) => renderCompany(c, 0, seen))}
                {orphanBuildings.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted">Hors société</div>
                    {orphanBuildings.map((b) => renderBuilding(b, 0))}
                  </div>
                )}
              </div>
            </Card>
          )
        ) : loans.length === 0 ? (
          <Empty icon={<Landmark size={26} />} title="Aucun crédit" action={<Button onClick={() => setAdding(true)} icon={<Plus size={18} />}>Ajouter</Button>} />
        ) : (
          <Card className="mt-4 py-1">
            <div className="divide-y divide-line">
              {loans.map((l) => {
                const r = snap.resolvedLoans.get(l.id);
                const now = snap.byLoan.get(l.id);
                const b = data.buildings.find((x) => x.id === l.buildingId);
                const companyKey = b?.companyId ?? l.companyId ?? NO_COMPANY;
                const company = data.companies.find((c) => c.id === companyKey);
                return (
                  <Link key={l.id} href={`/patrimoine/credit/${l.id}`} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-navy">
                      <Landmark size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-ink">{l.name || l.bank || "Crédit"}</div>
                      <div className="truncate text-xs text-muted">
                        {[company?.name, l.bank].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-[15px] font-semibold text-ink">{now?.balance === undefined ? "—" : eurCompact(now.balance)}</div>
                      <div className="tabular text-xs text-muted">
                        {r?.finished ? "Terminé" : r?.endMonth !== undefined ? `fin ${monthLabel(r.endMonth)}` : "fin inconnue"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </Page>
      <AddMenu open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function TreeRow({
  depth,
  href,
  icon,
  title,
  subtitle,
  badge,
  figures,
  open,
  onToggle,
  emphasis,
  avatar,
}: {
  depth: number;
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  figures?: Figures;
  open: boolean;
  onToggle?: () => void;
  emphasis?: boolean;
  avatar?: React.ReactNode;
}) {
  const cf = figures ? cashflowMonthly(figures) : 0;
  return (
    <div className="flex items-center gap-1 py-1" style={{ paddingLeft: depth * 16 }}>
      <button
        onClick={onToggle}
        disabled={!onToggle}
        aria-label={open ? "Replier" : "Déplier"}
        className="flex h-9 w-7 shrink-0 items-center justify-center text-muted disabled:opacity-0"
      >
        <ChevronDown size={18} className={cx("transition-transform", !open && "-rotate-90")} />
      </button>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 py-2 active:opacity-60">
        {emphasis ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-[#e8d3ad]">{icon}</div>
        ) : avatar ? (
          avatar
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2a78d6]/10 text-[#2a78d6]">{icon}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cx("truncate text-[15px] text-ink", emphasis ? "font-semibold" : "font-medium")}>{title}</span>
            {badge && <span className="shrink-0 rounded-md bg-soft px-1.5 text-[10px] font-semibold uppercase text-ink-2">{badge}</span>}
          </div>
          {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
        </div>
        {figures && (
          <div className="shrink-0 text-right">
            <div className="tabular text-[14px] font-semibold text-ink">{eurCompact(netWorth(figures))}</div>
            <div className={cx("tabular text-[11px]", cf >= 0 ? "text-pos" : "text-neg")}>{eurSigned(Math.round(cf))}/m</div>
          </div>
        )}
      </Link>
    </div>
  );
}
