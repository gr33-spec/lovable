"use client";

import { AnalysisEntry } from "@/components/analysis/entry";
import { companyCrumbs } from "@/lib/crumbs";
import { goBack } from "@/lib/nav";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, BadgeEuro, DoorOpen, Hammer, Landmark, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { unitRemovals } from "@/lib/tenancy";
import { newId } from "@/lib/ops";
import type { Collection, Unit } from "@/lib/types";
import { cashflowMonthly, ltv, netWorth } from "@/lib/engine/snapshot";
import { monthLabel } from "@/lib/engine/dates";
import { dateFr, eur, eurCompact, eurSigned, num, pct } from "@/lib/format";
import { CONDITIONS, UNIT_TYPES, WORK_STATUSES, labelOf } from "@/lib/labels";
import { BuildingForm, UnitForm, WorkForm } from "../forms";
import { QuickLoan, QuickWork } from "../quick-add";
import { Button, Card, ConfirmDelete, Divided, Empty, Kpi, MissingData, Page, PageHeader, Pill, Row, SectionTitle, Sheet } from "../ui";
import { AddLink } from "./societe";
import { BuildingValueHistory } from "../value-history";
import { SwipeDelete } from "@/components/swipe";
import { SaleSheet, newSale } from "@/components/sale/sheet";
import { SalesList } from "@/components/sale/list";
import { DragGhost, LotHandle, SwapNumbersSheet, dropTarget, useSwapNumbers, useTenantDnd } from "./lot-number";
import { sortedUnits, tenantLabel } from "@/lib/lots";
import type { SaleAction } from "@/lib/types";

export function BuildingDetail({ id, edit, saleId }: { id: string; edit?: boolean; saleId?: string }) {
  return (
    <Suspense>
      <BuildingDetailInner id={id} edit={edit} saleId={saleId} />
    </Suspense>
  );
}

function BuildingDetailInner({ id, edit, saleId }: { id: string; edit?: boolean; saleId?: string }) {
  const { data, projection, removeMany, upsert, remove } = useStore();
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "edit" | "loan" | "work">(edit ? "edit" : null);
  const [selling, setSelling] = useState<SaleAction | null>(null);
  const [moving, setMoving] = useState(false);
  const swapNumbers = useSwapNumbers();
  const dnd = useTenantDnd((fromId, toId) => {
    const from = data.units.find((u) => u.id === fromId);
    const to = data.units.find((u) => u.id === toId);
    if (from && to) swapNumbers(from, to);
  });
  const [unitId, setUnitId] = useState<string | null>(null);
  const [workId, setWorkId] = useState<string | null>(null);
  const building = data.buildings.find((b) => b.id === id);
  if (!building) {
    return (
      <>
        <PageHeader title="Immeuble" back="/patrimoine" />
        <Empty title="Immeuble introuvable" text="Il a peut-être été supprimé." />
      </>
    );
  }
  const snap = projection.snapshot;
  const f = snap.byBuilding.get(id)!;
  const company = data.companies.find((c) => c.id === building.companyId);
  const units = sortedUnits(data.units.filter((u) => u.buildingId === id));
  const loans = data.loans.filter((l) => l.buildingId === id);
  const works = data.works.filter((w) => w.buildingId === id).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  const cf = cashflowMonthly(f);
  const ratio = ltv(f);
  const grossYield = f.value > 0 ? ((f.rentMonthly * 12) / f.value) * 100 : undefined;
  const unit = units.find((u) => u.id === unitId);
  const work = works.find((w) => w.id === workId);
  const vacant = units.filter((u) => u.status === "vacant").length;

  const addUnit = () => {
    const u: Unit = { id: newId(), buildingId: id, name: `Logement ${units.length + 1}`, status: "occupe" };
    upsert("units", u);
    setUnitId(u.id);
  };

  const removeBuilding = () => {
    const items: { coll: Collection; id: string }[] = [{ coll: "buildings", id }];
    units.forEach((u) => items.push(...unitRemovals(data, u.id)));
    loans.forEach((l) => items.push({ coll: "loans", id: l.id }));
    works.forEach((w) => items.push({ coll: "works", id: w.id }));
    removeMany(items);
    goBack(router, company ? `/patrimoine/societe/${company.id}` : "/patrimoine");
  };

  return (
    <>
      <PageHeader
        title={building.name}
        crumbs={companyCrumbs(data, building.companyId)}
        subtitle={building.city || undefined}
        back={company ? `/patrimoine/societe/${company.id}` : "/patrimoine"}
        action={
          <button onClick={() => setSheet("edit")} className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-semibold text-navy">
            <Pencil size={15} /> Modifier
          </button>
        }
      />
      <Page>
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Valeur estimée" value={f.unvalued ? <MissingData action="Estimer" onClick={() => setSheet("edit")} /> : eur(f.value)} />
            <Kpi label="Patrimoine net" value={f.unvalued ? "—" : eurCompact(netWorth(f))} />
            <Kpi label="Capital restant dû" value={eurCompact(f.debt)} hint={ratio !== undefined ? `LTV ${pct(ratio)}` : undefined} />
            <Kpi label="Rendement brut" value={grossYield !== undefined ? pct(grossYield) : "—"} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <Kpi label="Loyers" value={eurCompact(f.rentMonthly)} hint={f.potentialRentMonthly > f.rentMonthly ? `${eurCompact(f.potentialRentMonthly)} si loué` : "par mois"} />
            <Kpi label="Mensualités" value={eurCompact(f.paymentsMonthly)} hint="par mois" />
            <Kpi label="Cash-flow" value={eurSigned(cf)} tone={cf >= 0 ? "pos" : "neg"} hint="par mois" />
          </div>
          <div className="mt-3 text-xs text-muted">Charges annuelles : {eur(f.chargesAnnual)}</div>
        </Card>

        {/* Ordinateur : logements à gauche, financement et informations à droite. */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div className="min-w-0">
        <SectionTitle
          action={
            <span className="flex items-center gap-4">
              {units.length > 1 && (
                <button onClick={() => setMoving(true)} className="flex items-center gap-1 text-sm font-semibold text-series-1">
                  <ArrowRightLeft size={15} /> Numéros
                </button>
              )}
              <AddLink onClick={addUnit} />
            </span>
          }
        >
          Lots {units.length > 0 && `(${units.length}${vacant ? ` · ${vacant} vacant${vacant > 1 ? "s" : ""}` : ""})`}
        </SectionTitle>
        <Card className="py-1">
          {units.length === 0 ? (
            <div className="py-3 text-sm text-muted">
              Facultatif. {building.lotsCount ? `${building.lotsCount} lots déclarés. ` : ""}Détaillez les logements pour suivre loyers et vacance.
            </div>
          ) : (
            <Divided>
              {units.map((u) => {
                const name = tenantLabel(data, u);
                return (
                // Glisser le numéro d'un lot sur un autre échange leurs numéros (liste triée).
                <div key={u.id} {...dropTarget(dnd, u.id, id)}>
                  <SwipeDelete items={unitRemovals(data, u.id)} message={`${u.name} supprimé`}>
                    <Row
                      href={`/patrimoine/logement/${u.id}`}
                      icon={<DoorOpen size={18} />}
                      title={units.length > 1 ? <LotHandle dnd={dnd} unitId={u.id} group={id} label={u.name} /> : u.name}
                      subtitle={
                        u.status === "vacant"
                          ? "Vacant"
                          : name || labelOf(UNIT_TYPES, u.type)
                      }
                      right={u.status === "vacant" ? <Pill tone="warn">Vacant</Pill> : eur(u.rent)}
                      rightSub={[labelOf(UNIT_TYPES, u.type), u.surface ? `${num(u.surface)} m²` : undefined].filter(Boolean).join(" · ")}
                    />
                  </SwipeDelete>
                </div>
                );
              })}
            </Divided>
          )}
        </Card>
        {units.length > 1 && (
          <p className="mt-2 px-1 text-[12.5px] text-muted">
            Un numéro de lot est faux ? Faites glisser le lot sur son vrai numéro (sur téléphone : maintenez le doigt dessus). Seuls les deux numéros s&apos;échangent, le logement garde son locataire.
          </p>
        )}
        <DragGhost dnd={dnd} units={units} />

        </div>
        <div className="min-w-0">
        <SectionTitle action={<AddLink onClick={() => setSheet("loan")} />}>Crédits</SectionTitle>
        <Card className="py-1">
          {loans.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun crédit sur cet immeuble.</div>
          ) : (
            <Divided>
              {loans.map((l) => {
                const r = snap.resolvedLoans.get(l.id);
                const now = snap.byLoan.get(l.id);
                return (
                  <SwipeDelete key={l.id} items={[{ coll: "loans", id: l.id }]} message="Crédit supprimé">
                  <Row
                    href={`/patrimoine/credit/${l.id}`}
                    icon={<Landmark size={18} />}
                    title={l.name || l.bank || "Crédit"}
                    subtitle={r?.finished ? "Terminé" : r?.endMonth !== undefined ? `Fin ${monthLabel(r.endMonth)}` : "Fin : données insuffisantes"}
                    right={now?.balance === undefined ? "—" : eurCompact(now.balance)}
                    rightSub={now?.paymentMonthly ? `${eur(now.paymentMonthly)}/mois` : undefined}
                  />
                  </SwipeDelete>
                );
              })}
            </Divided>
          )}
        </Card>

        <SectionTitle action={<AddLink onClick={() => setSheet("work")} />}>Travaux</SectionTitle>
        <Card className="py-1">
          {works.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun travaux programmés.</div>
          ) : (
            <Divided>
              {works.map((w) => (
                <SwipeDelete key={w.id} items={[{ coll: "works", id: w.id }]} message="Travaux supprimés">
                <Row
                  onClick={() => setWorkId(w.id)}
                  icon={<Hammer size={18} />}
                  title={w.label}
                  subtitle={`${w.year ?? "Année ?"} · ${labelOf(WORK_STATUSES, w.status ?? "prevu")}`}
                  right={eur(w.amount)}
                />
                </SwipeDelete>
              ))}
            </Divided>
          )}
        </Card>

        <BuildingValueHistory building={building} />

        <SectionTitle action={<AddLink onClick={() => setSelling(newSale(building.id))} label="Vendre" />}>Vente</SectionTitle>
        <Card className="py-1">
          {data.plans.some((p) => p.type === "sale" && p.buildingId === building.id) ? (
            <SalesList buildingId={building.id} openId={saleId} />
          ) : (
            <button onClick={() => setSelling(newSale(building.id))} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-navy">
                <BadgeEuro size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink">Vendre l&apos;immeuble ou des lots</span>
                <span className="block text-[13px] text-muted">Prix par lot, date, remboursement : intégré aux projections et au dossier banque</span>
              </span>
            </button>
          )}
        </Card>
        <SaleSheet sale={selling ?? undefined} open={!!selling} onClose={() => setSelling(null)} />
        <SwapNumbersSheet units={units} open={moving} onClose={() => setMoving(false)} />

        <AnalysisEntry scope={{ type: "building", id: building.id }} title="Analyse IA de cet immeuble" />

        <SectionTitle>Informations</SectionTitle>
        <Card className="space-y-1.5 text-[15px]">
          <Info label="Adresse" value={[building.address, building.city].filter(Boolean).join(", ")} />
          <Info label="Acquisition" value={building.acquisitionDate ? dateFr(building.acquisitionDate) : undefined} />
          <Info label="Prix d'acquisition" value={building.acquisitionPrice ? eur(building.acquisitionPrice) : undefined} />
          <Info label="Surface" value={building.surface ? `${num(building.surface)} m²` : undefined} />
          <Info label="Prix au m²" value={building.pricePerSqm ? eur(building.pricePerSqm) : undefined} />
          <Info label="État" value={labelOf(CONDITIONS, building.condition)} />
          <Info label="Travaux récents" value={building.recentWorks} />
          <Info label="Travaux à prévoir" value={building.plannedWorks} />
          <Info label="Notes" value={building.notes} />
          <button onClick={() => setSheet("edit")} className="pt-2 text-sm font-semibold text-series-1">
            Compléter les informations
          </button>
        </Card>

        </div>
        </div>
        <div className="mt-8">
          <ConfirmDelete
            label="Supprimer l'immeuble"
            message={`Supprimer ${building.name} avec ses logements, crédits et travaux ? Une sauvegarde automatique permet de revenir en arrière.`}
            onConfirm={removeBuilding}
          />
        </div>
      </Page>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Modifier l'immeuble" footer={<Button full onClick={() => setSheet(null)}>Terminé</Button>}>
        <BuildingForm building={building} />
      </Sheet>
      <Sheet open={sheet === "loan"} onClose={() => setSheet(null)} title="Nouveau crédit">
        <QuickLoan buildingId={id} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "work"} onClose={() => setSheet(null)} title="Nouveaux travaux">
        <QuickWork buildingId={id} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet
        open={!!unit}
        onClose={() => setUnitId(null)}
        title={unit?.name || "Logement"}
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setUnitId(null)}>Terminé</Button>
            {unit && <ConfirmDelete label="Supprimer le logement" message="Supprimer ce logement ?" onConfirm={() => { removeMany(unitRemovals(data, unit.id)); setUnitId(null); }} />}
          </div>
        }
      >
        {unit && <UnitForm unit={unit} />}
      </Sheet>
      <Sheet
        open={!!work}
        onClose={() => setWorkId(null)}
        title="Travaux"
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setWorkId(null)}>Terminé</Button>
            {work && <ConfirmDelete label="Supprimer" message="Supprimer ces travaux ?" onConfirm={() => { remove("works", work.id); setWorkId(null); }} />}
          </div>
        }
      >
        {work && <WorkForm work={work} />}
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap text-ink">{value}</span>
    </div>
  );
}
