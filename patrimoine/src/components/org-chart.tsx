"use client";

import Link from "next/link";
import { Briefcase, Pencil, User } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Company, Partner } from "@/lib/types";
import { NO_COMPANY, type Figures } from "@/lib/engine/snapshot";
import { eurCompact, pct } from "@/lib/format";
import { COMPANY_KINDS, labelOf } from "@/lib/labels";
import { Avatar, cx } from "./ui";

// Organigramme : associés (personnes) → holding → sociétés, avec les
// pourcentages de détention saisis dans les fiches sociétés (« Associés »).

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Line({ className }: { className?: string }) {
  return <div className={cx("mx-auto w-0.5 bg-[#c9d3e3]", className)} />;
}

export function OrgChart() {
  const { data, projection } = useStore();
  const snap = projection.snapshot;
  const companyNames = new Set(data.companies.map((c) => c.name.toLowerCase()));
  const ids = new Set(data.companies.map((c) => c.id));
  const roots = data.companies.filter((c) => !c.parentId || !ids.has(c.parentId));
  const holding = roots.find((c) => c.kind === "holding") ?? roots[0];

  if (!holding) {
    return <div className="mt-6 text-center text-sm text-muted">Créez d&apos;abord votre holding ou vos sociétés.</div>;
  }

  const people = (holding.partners ?? []).filter((p) => p.name && !companyNames.has(p.name.toLowerCase()));
  const totalPct = people.reduce((s, p) => s + (p.pct ?? 0), 0);
  const children = data.companies
    .filter((c) => c.parentId === holding.id)
    .sort((a, b) => (snap.byCompany.get(b.id)?.buildings ?? 0) - (snap.byCompany.get(a.id)?.buildings ?? 0));
  const otherRoots = roots.filter((c) => c.id !== holding.id);
  const direct = snap.ownByCompany.get(NO_COMPANY);
  const hf = snap.byCompany.get(holding.id);
  const colorIndex = (id: string) => data.companies.filter((x) => x.kind !== "holding").findIndex((x) => x.id === id);

  return (
    <div className="mt-5">
      {/* Associés de la holding */}
      {people.length > 0 ? (
        <div className="relative">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))` }}>
            {people.map((p) => (
              <PersonCard key={p.name} partner={p} />
            ))}
          </div>
          {people.length > 1 && (
            <div className="relative h-5">
              {people.map((p, i) => (
                <div key={p.name} className="absolute top-0 h-2.5 w-0.5 bg-[#c9d3e3]" style={{ left: `calc(${((i + 0.5) / people.length) * 100}% - 1px)` }} />
              ))}
              <div
                className="absolute top-2.5 h-0.5 bg-[#c9d3e3]"
                style={{ left: `${50 / people.length}%`, right: `${50 / people.length}%` }}
              />
              <div className="absolute left-1/2 top-2.5 h-2.5 w-0.5 -translate-x-1/2 bg-[#c9d3e3]" />
            </div>
          )}
          {people.length === 1 && <Line className="h-5" />}
          {Math.abs(totalPct - 100) > 0.01 && (
            <div className="mb-2 text-center text-xs text-warn">Total des parts : {pct(totalPct, 2)} (100 % attendu)</div>
          )}
        </div>
      ) : (
        <Link
          href={`/patrimoine/societe/${holding.id}`}
          className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-warn/50 bg-warn/5 px-4 py-3 text-sm text-warn"
        >
          <Pencil size={15} /> Renseigner les associés de la holding (Modifier → Associés)
        </Link>
      )}

      {/* Holding */}
      <Link
        href={`/patrimoine/societe/${holding.id}`}
        className="hero-card block rounded-[28px] p-5 text-white active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-gold">
            <Briefcase size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[19px] font-bold">{holding.name}</div>
            <div className="text-xs uppercase tracking-wider text-white/60">{labelOf(COMPANY_KINDS, holding.kind)}</div>
          </div>
        </div>
        {hf && (hf.buildings > 0 || hf.debt > 0) && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
            <Mini dark label="Immeubles" value={String(hf.buildings)} />
            <Mini dark label="Loyers/mois" value={eurCompact(hf.rentMonthly)} />
            <Mini dark label="Dette" value={eurCompact(hf.debt)} />
          </div>
        )}
      </Link>

      {/* Sociétés détenues */}
      {children.length > 0 && (
        <div className="relative ml-5 mt-0 border-l-2 border-[#c9d3e3] pt-4">
          {children.map((c, i) => (
            <div key={c.id} className={cx("relative pl-5", i < children.length - 1 ? "pb-3" : "")}>
              <div className="absolute left-0 top-7 h-0.5 w-5 bg-[#c9d3e3]" />
              {i === children.length - 1 && <div className="absolute -left-0.5 top-7 bottom-0 w-1 bg-bg" />}
              <CompanyCard company={c} holding={holding} figures={snap.byCompany.get(c.id)} index={colorIndex(c.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Autres entités sans société mère */}
      {otherRoots.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">Autres sociétés</div>
          <div className="space-y-3">
            {otherRoots.map((c) => (
              <CompanyCard key={c.id} company={c} holding={holding} figures={snap.byCompany.get(c.id)} index={colorIndex(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Détention en direct */}
      {direct && (direct.buildings > 0 || direct.loans > 0) && (
        <div className="mt-6">
          <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">
            Détenu en direct{people.length ? ` par ${people.map((p) => p.name).join(" & ")}` : ""}
          </div>
          <div className="rounded-3xl bg-card p-4 shadow-[0_1px_2px_rgba(15,27,45,0.04),0_8px_24px_rgba(15,27,45,0.05)]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Biens" value={String(direct.buildings)} />
              <Mini label="Valeur" value={direct.unvalued ? "—" : eurCompact(direct.value)} />
              <Mini label="Dette" value={eurCompact(direct.debt)} />
            </div>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-[13px] text-ink-2">
              {data.buildings
                .filter((b) => !b.companyId || !ids.has(b.companyId))
                .map((b) => (
                  <Link key={b.id} href={`/patrimoine/immeuble/${b.id}`} className="flex justify-between gap-3">
                    <span className="truncate">{b.name}</span>
                    <span className="tabular shrink-0">{eurCompact(snap.byBuilding.get(b.id)?.unvalued ? undefined : snap.byBuilding.get(b.id)?.value)}</span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 px-2 text-center text-xs text-muted">
        Les pourcentages se modifient dans chaque fiche société : Modifier → Associés.
      </p>
    </div>
  );
}

function PersonCard({ partner }: { partner: Partner }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-card px-3 py-4 text-center shadow-[0_1px_2px_rgba(15,27,45,0.04),0_8px_24px_rgba(15,27,45,0.05)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-[17px] font-bold text-[#7d6238]">
        {initials(partner.name) || <User size={20} />}
      </span>
      <div className="mt-2 w-full truncate text-[15px] font-semibold text-ink">{partner.name}</div>
      <div className="tabular text-[22px] font-bold text-navy">{partner.pct !== undefined ? pct(partner.pct, 2) : "—"}</div>
    </div>
  );
}

function CompanyCard({ company, holding, figures, index }: { company: Company; holding: Company; figures?: Figures; index?: number }) {
  const partners = company.partners?.filter((p) => p.name) ?? [];
  const isParent = (p: Partner) => p.name.toLowerCase() === holding.name.toLowerCase();
  const parentPct = company.ownershipPct ?? partners.find(isParent)?.pct;
  const empty = !figures || (figures.buildings === 0 && figures.loans === 0);
  return (
    <Link
      href={`/patrimoine/societe/${company.id}`}
      className="soft-card block rounded-[24px] p-4 active:scale-[0.99]"
    >
      <div className="flex items-center gap-2.5">
        <Avatar id={company.id} name={company.name} size={34} square index={index} />
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-navy">{company.name}</span>
        <span className="shrink-0 rounded-md bg-soft px-1.5 text-[10px] font-semibold uppercase text-ink-2">{company.kind}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {partners.length > 0 ? (
          partners.map((p) => (
            <span
              key={p.name}
              className={cx(
                "tabular rounded-full px-2.5 py-0.5 text-xs font-medium",
                isParent(p) ? "bg-navy/10 text-navy" : "bg-gold/15 text-[#7d6238]",
              )}
            >
              {p.name} {p.pct !== undefined ? pct(p.pct, 2) : ""}
            </span>
          ))
        ) : parentPct !== undefined ? (
          <span className="tabular rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
            {holding.name} {pct(parentPct, 2)}
          </span>
        ) : (
          <span className="rounded-full bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">Détention à préciser</span>
        )}
      </div>
      {empty ? (
        <div className="mt-2 text-xs text-muted">Sans actif immobilier</div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <Mini label="Lots" value={String(figures!.units)} />
          <Mini label="Loyers/mois" value={eurCompact(figures!.rentMonthly)} />
          <Mini label="Dette" value={eurCompact(figures!.debt)} />
        </div>
      )}
    </Link>
  );
}

function Mini({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={cx("truncate text-[11px]", dark ? "text-white/60" : "text-muted")}>{label}</div>
      <div className={cx("tabular truncate text-[15px] font-semibold", dark ? "text-white" : "text-ink")}>{value}</div>
    </div>
  );
}
