"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, Landmark, Pencil, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { cashflowMonthly, ltv, netWorth } from "@/lib/engine/snapshot";
import { monthLabel } from "@/lib/engine/dates";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { labelOf, COMPANY_KINDS } from "@/lib/labels";
import type { Collection } from "@/lib/types";
import { CompanyForm } from "../forms";
import { QuickBuilding, QuickCompany, QuickLoan } from "../quick-add";
import { LineChart } from "../charts";
import { Button, Card, ConfirmDelete, Divided, Empty, Kpi, Page, PageHeader, Row, SectionTitle, Sheet } from "../ui";

export function CompanyDetail({ id }: { id: string }) {
  const { data, projection, removeMany, upsert } = useStore();
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "edit" | "building" | "loan" | "company">(null);
  const company = data.companies.find((c) => c.id === id);
  if (!company) {
    return (
      <>
        <PageHeader title="Société" back="/patrimoine" />
        <Empty title="Société introuvable" text="Elle a peut-être été supprimée." />
      </>
    );
  }
  const snap = projection.snapshot;
  const f = snap.byCompany.get(id)!;
  const own = snap.ownByCompany.get(id);
  const children = data.companies.filter((c) => c.parentId === id);
  const buildings = data.buildings.filter((b) => b.companyId === id);
  const buildingIds = new Set(buildings.map((b) => b.id));
  const loans = data.loans.filter((l) => (l.buildingId && buildingIds.has(l.buildingId)) || (!l.buildingId && l.companyId === id));
  const rows = projection.byCompany.get(id) ?? [];
  const hasChildren = children.length > 0;
  const cf = cashflowMonthly(f);
  const ratio = ltv(f);

  const remove = () => {
    const items: { coll: Collection; id: string }[] = [{ coll: "companies", id }];
    for (const b of buildings) {
      items.push({ coll: "buildings", id: b.id });
      data.units.filter((u) => u.buildingId === b.id).forEach((u) => items.push({ coll: "units", id: u.id }));
      data.works.filter((w) => w.buildingId === b.id).forEach((w) => items.push({ coll: "works", id: w.id }));
    }
    loans.forEach((l) => items.push({ coll: "loans", id: l.id }));
    removeMany(items);
    // Les filiales remontent d'un niveau.
    children.forEach((c) => upsert("companies", { ...c, parentId: company.parentId ?? null }));
    router.push("/patrimoine");
  };

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={labelOf(COMPANY_KINDS, company.kind)}
        back="/patrimoine"
        action={
          <button onClick={() => setSheet("edit")} className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-semibold text-navy">
            <Pencil size={15} /> Modifier
          </button>
        }
      />
      <Page>
        <Card>
          <Kpi label={hasChildren ? "Patrimoine net consolidé" : "Patrimoine net"} value={netWorth(f) !== undefined && (f.value || f.debt) ? eur(netWorth(f)) : "Données insuffisantes"} big />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Kpi label="Valeur immobilière" value={f.unvalued ? "—" : eurCompact(f.value)} hint={f.unvalued ? `${f.unvalued} bien(s) sans valeur` : undefined} />
            <Kpi label="Dette totale" value={eurCompact(f.debt)} hint={ratio !== undefined ? `LTV ${pct(ratio)}` : undefined} />
            <Kpi label="Loyers / mois" value={eurCompact(f.rentMonthly)} />
            <Kpi label="Mensualités / mois" value={eurCompact(f.paymentsMonthly)} />
            <Kpi label="Cash-flow / mois" value={eurSigned(cf)} tone={cf >= 0 ? "pos" : "neg"} />
            <Kpi label="Trésorerie" value={eurCompact(f.cash)} />
          </div>
          {(own?.partnerAccounts ?? 0) > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <Kpi label="Comptes courants d'associés" value={eur(own!.partnerAccounts)} />
            </div>
          )}
        </Card>

        {rows.length > 0 && (f.value > 0 || f.debt > 0) && (
          <>
            <SectionTitle>Projection {hasChildren ? "(société seule)" : ""}</SectionTitle>
            <Card>
              <LineChart
                years={rows.map((r) => r.year)}
                series={[{ label: "Capital restant dû", values: rows.map((r) => r.debt), color: "var(--series-1)" }]}
                height={160}
              />
            </Card>
          </>
        )}

        {(hasChildren || company.kind === "holding") && (
          <>
            <SectionTitle action={<AddLink onClick={() => setSheet("company")} />}>Filiales</SectionTitle>
            <Card className="py-1">
              {children.length === 0 ? (
                <div className="py-3 text-sm text-muted">Aucune filiale.</div>
              ) : (
                <Divided>
                  {children.map((c) => {
                    const cf2 = snap.byCompany.get(c.id);
                    return (
                      <Row
                        key={c.id}
                        href={`/patrimoine/societe/${c.id}`}
                        icon={<Briefcase size={18} />}
                        title={c.name}
                        subtitle={c.ownershipPct ? `Détenue à ${pct(c.ownershipPct, 2)}` : labelOf(COMPANY_KINDS, c.kind)}
                        right={cf2 ? eurCompact(netWorth(cf2)) : "—"}
                        rightSub="net"
                      />
                    );
                  })}
                </Divided>
              )}
            </Card>
          </>
        )}

        <SectionTitle action={<AddLink onClick={() => setSheet("building")} />}>Immeubles</SectionTitle>
        <Card className="py-1">
          {buildings.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun immeuble détenu directement.</div>
          ) : (
            <Divided>
              {buildings.map((b) => {
                const bf = snap.byBuilding.get(b.id);
                return (
                  <Row
                    key={b.id}
                    href={`/patrimoine/immeuble/${b.id}`}
                    icon={<Building2 size={18} />}
                    title={b.name}
                    subtitle={b.city}
                    right={bf?.unvalued ? "—" : eurCompact(bf?.value)}
                    rightSub={bf ? `${eurCompact(bf.rentMonthly)}/mois` : undefined}
                  />
                );
              })}
            </Divided>
          )}
        </Card>

        <SectionTitle action={<AddLink onClick={() => setSheet("loan")} />}>Crédits</SectionTitle>
        <Card className="py-1">
          {loans.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun crédit.</div>
          ) : (
            <Divided>
              {loans.map((l) => {
                const r = snap.resolvedLoans.get(l.id);
                const now = snap.byLoan.get(l.id);
                return (
                  <Row
                    key={l.id}
                    href={`/patrimoine/credit/${l.id}`}
                    icon={<Landmark size={18} />}
                    title={l.name || l.bank || "Crédit"}
                    subtitle={r?.endMonth !== undefined ? `Fin ${monthLabel(r.endMonth)}` : "Fin : données insuffisantes"}
                    right={now?.balance === undefined ? "—" : eurCompact(now.balance)}
                    rightSub={now?.paymentMonthly ? `${eur(now.paymentMonthly)}/mois` : undefined}
                  />
                );
              })}
            </Divided>
          )}
        </Card>

        {(company.partners?.length || company.taxRegime || company.notes) && (
          <>
            <SectionTitle>Informations</SectionTitle>
            <Card className="space-y-2 text-[15px]">
              {company.partners?.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-ink-2">{p.name || "Associé"}</span>
                  <span className="tabular font-medium">{p.pct !== undefined ? pct(p.pct, 2) : "—"}</span>
                </div>
              ))}
              {company.taxRegime && <div className="text-ink-2">Fiscalité : {company.taxRegime}</div>}
              {company.notes && <div className="whitespace-pre-wrap text-ink-2">{company.notes}</div>}
            </Card>
          </>
        )}

        <div className="mt-8">
          <ConfirmDelete
            label="Supprimer la société"
            message={`Supprimer ${company.name}, ses immeubles, logements, crédits et travaux ? Les filiales sont conservées. Une sauvegarde automatique permet de revenir en arrière.`}
            onConfirm={remove}
          />
        </div>
      </Page>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Modifier la société" footer={<Button full onClick={() => setSheet(null)}>Terminé</Button>}>
        <CompanyForm company={company} />
      </Sheet>
      <Sheet open={sheet === "building"} onClose={() => setSheet(null)} title="Nouvel immeuble">
        <QuickBuilding companyId={id} onDone={(bid) => { setSheet(null); router.push(`/patrimoine/immeuble/${bid}`); }} />
      </Sheet>
      <Sheet open={sheet === "loan"} onClose={() => setSheet(null)} title="Nouveau crédit">
        <QuickLoan companyId={id} onDone={(lid) => { setSheet(null); router.push(`/patrimoine/credit/${lid}`); }} />
      </Sheet>
      <Sheet open={sheet === "company"} onClose={() => setSheet(null)} title="Nouvelle filiale">
        <QuickCompany parentId={id} onDone={() => setSheet(null)} />
      </Sheet>
    </>
  );
}

export function AddLink({ onClick, label = "Ajouter" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm font-semibold text-series-1">
      <Plus size={16} /> {label}
    </button>
  );
}
