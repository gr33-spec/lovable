"use client";

import { sortedUnits } from "@/lib/lots";
import { useState } from "react";
import { Check, CircleCheck, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AppData, Collection, SaleAction } from "@/lib/types";
import { eur, eurCompact } from "@/lib/format";
import { project } from "@/lib/engine/projection";
import { monthLabel } from "@/lib/engine/dates";
import { addMonthsIso, todayIso } from "@/lib/engine/leases";
import { saleLabel, salePrice, saleShares } from "@/lib/engine/sale";
import { expandRemoval, removalBackup } from "@/lib/removal";
import { toast } from "@/components/swipe";
import { Button, DateField, NumberField, Segmented, SelectField, Sheet, cx } from "@/components/ui";

// Vente prévue d'un immeuble entier ou de certains lots : prix, date, frais,
// impôt (saisi) et remboursement de la banque. Enregistrée comme opération
// des données réelles : projections, chronologie et dossier banque en tiennent compte.

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function newSale(buildingId: string): SaleAction {
  const date = addMonthsIso(todayIso(), 6).slice(0, 8) + "01";
  return { id: uid(), type: "sale", buildingId, year: Number(date.slice(0, 4)), date };
}

export function SaleSheet({ sale, open, onClose, chooseBuilding }: { sale: SaleAction | undefined; open: boolean; onClose: () => void; chooseBuilding?: boolean }) {
  return (
    <Sheet open={open && !!sale} onClose={onClose} title={sale?.lots ? "Vente de lots" : "Vente"}>
      {sale && <SaleForm key={sale.id} initial={sale} onClose={onClose} chooseBuilding={chooseBuilding} />}
    </Sheet>
  );
}

function SaleForm({ initial, onClose, chooseBuilding }: { initial: SaleAction; onClose: () => void; chooseBuilding?: boolean }) {
  const { data, nowMonth, upsert, upsertMany, removeMany, remove } = useStore();
  const [a, setA] = useState<SaleAction>(initial);
  const saved = data.plans.some((p) => p.id === a.id);
  const building = data.buildings.find((b) => b.id === a.buildingId);
  const units = sortedUnits(data.units.filter((u) => u.buildingId === a.buildingId));
  const byLot = !!a.lots;
  const set = (patch: Partial<SaleAction>) => setA((cur) => ({ ...cur, ...patch }));

  // Chiffres exacts : projection avec cette vente seule (les autres opérations restent).
  const others: AppData = { ...data, plans: data.plans.filter((p) => p.id !== a.id) };
  const preview = building && (!byLot || a.lots!.length > 0) ? project(others, nowMonth, { scenarioActions: [a] }).sales.find((s) => s.actionId === a.id) : undefined;
  const shares = building ? saleShares(building, units, a.lots?.map((l) => l.unitId)) : undefined;
  const price = salePrice(a);
  // Effet sur le cash-flow mensuel : mensualités et charges en moins, loyers perdus.
  const cfDelta = preview ? preview.paymentsRemovedMonthly + preview.chargesRemovedAnnual / 12 - preview.rentLostMonthly : undefined;
  const balance = data.loans.filter((l) => l.buildingId === a.buildingId).length;

  const toggleLot = (id: string) => {
    const lots = a.lots ?? [];
    set({ lots: lots.some((l) => l.unitId === id) ? lots.filter((l) => l.unitId !== id) : [...lots, { unitId: id, price: data.units.find((u) => u.id === id)?.value }] });
  };

  const save = () => {
    upsert("plans", { ...a, year: Number((a.date ?? `${a.year}`).slice(0, 4)) });
    toast(saved ? "Vente mise à jour" : "Vente prévue ajoutée aux projections");
    onClose();
  };

  const cancelSale = () => {
    remove("plans", a.id);
    toast("Vente prévue supprimée", () => upsert("plans", initial));
    onClose();
  };

  // Vente faite : les lots (ou l'immeuble et ses crédits) sortent du patrimoine ; une trace reste dans les événements.
  const realize = () => {
    if (!building) return;
    const whole = !shares || shares.whole;
    // Règle commune (lib/removal) : logements, baux, crédits et travaux vendus sortent ; documents conservés.
    const items: { coll: Collection; id: string }[] = whole ? [{ coll: "buildings", id: building.id }] : (shares?.units ?? []).map((u) => ({ coll: "units" as const, id: u.id }));
    const plan = expandRemoval(data, [...items, { coll: "plans", id: a.id }]);
    const backup = removalBackup(data, { ...plan, counts: {}, keptDocuments: 0 });
    const event = { id: uid(), label: `Vente — ${saleLabel(data, a)}`, year: Number(todayIso().slice(0, 4)), amount: price, companyId: building.companyId ?? undefined };
    removeMany(plan.removes);
    if (plan.updates.length) upsertMany(plan.updates);
    upsert("events", event);
    toast(whole ? "Immeuble vendu : retiré du patrimoine" : "Lots vendus : pensez à mettre à jour le capital restant dû du crédit", () => {
      upsertMany(backup);
      remove("events", event.id);
    });
    onClose();
  };

  return (
    <div className="space-y-4 pb-3">
      {chooseBuilding && (
        <SelectField
          label="Bien à vendre"
          value={a.buildingId}
          allowEmpty={false}
          options={data.buildings.map((b) => ({ value: b.id, label: b.name }))}
          onChange={(v) => v && set({ buildingId: v, lots: a.lots ? [] : undefined })}
        />
      )}
      {units.length > 1 && (
        <Segmented
          value={byLot ? "lots" : "tout"}
          onChange={(v) => set(v === "lots" ? { lots: [], price: undefined } : { lots: undefined, debtRepaid: undefined })}
          options={[
            { value: "tout", label: "Tout l'immeuble" },
            { value: "lots", label: "Lot par lot" },
          ]}
        />
      )}

      {!byLot ? (
        <NumberField label="Prix de vente" value={a.price} onChange={(v) => set({ price: v })} hint={building?.value ? `Valeur estimée actuelle : ${eur(building.value)}` : undefined} />
      ) : (
        <div>
          <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Lots vendus et prix de chacun</div>
          <div className="divide-y divide-line rounded-2xl border border-line bg-card">
            {units.map((u) => {
              const lot = a.lots!.find((l) => l.unitId === u.id);
              return (
                <div key={u.id} className="px-3 py-2.5">
                  <button type="button" onClick={() => toggleLot(u.id)} className="flex w-full items-center gap-3 text-left">
                    <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", lot ? "border-brand bg-brand text-on-brand" : "border-line")}>{lot && <Check size={14} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{u.name}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {[u.status === "vacant" ? "Vacant" : [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" "), u.rent ? `${eur(u.rent)}/mois` : undefined, u.surface ? `${u.surface} m²` : undefined].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  {lot && (
                    <div className="mt-2 pl-9">
                      <NumberField label="Prix du lot" value={lot.price} onChange={(v) => set({ lots: a.lots!.map((l) => (l.unitId === u.id ? { ...l, price: v } : l)) })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {a.lots!.length > 0 && (
            <div className="mt-1.5 flex justify-between px-1 text-[13px]">
              <span className="text-muted">
                {a.lots!.length} lot{a.lots!.length > 1 ? "s" : ""}
              </span>
              <span className="tabular font-semibold text-ink">{price !== undefined ? eur(price) : "Prix à compléter"}</span>
            </div>
          )}
        </div>
      )}

      <DateField label="Date prévue de la vente" value={a.date} onChange={(v) => set({ date: v, year: v ? Number(v.slice(0, 4)) : a.year })} />
      <NumberField label="Frais" value={a.fees} onChange={(v) => set({ fees: v })} hint="Agence, diagnostics, indemnités de remboursement anticipé…" />
      <NumberField label="Impôt sur la plus-value" value={a.tax} onChange={(v) => set({ tax: v })} hint="Montant à faire calculer par votre notaire ou expert-comptable : aucune règle n'est appliquée automatiquement." />
      {byLot && balance > 0 && (
        <NumberField
          label="Capital remboursé à la banque"
          value={a.debtRepaid}
          onChange={(v) => set({ debtRepaid: v })}
          placeholder={preview && a.debtRepaid === undefined ? `${Math.round(preview.debtRepaid).toLocaleString("fr-FR")}` : undefined}
          hint={`Par défaut, la quote-part des lots vendus (${shares ? Math.round(shares.share * 100) : "—"} % du capital restant dû${shares?.byCount ? ", au nombre de lots" : ", au prorata des loyers"}). La mensualité est recalculée, même date de fin.`}
        />
      )}
      <label className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-[15px] text-ink">
        Compromis signé
        <input type="checkbox" checked={!!a.underOffer} onChange={(e) => set({ underOffer: e.target.checked || undefined })} className="h-5 w-5 accent-brand" />
      </label>

      {/* Résultat */}
      <div className="rounded-[22px] bg-navy px-5 py-4 text-white">
        <div className="text-[12.5px] text-white/65">Net pour {building?.companyId ? data.companies.find((c) => c.id === building.companyId)?.name : "vous"}{preview ? ` en ${monthLabel(preview.month)}` : ""}</div>
        <div className="tabular text-[28px] font-extrabold leading-tight">{preview?.netCash !== undefined ? eur(Math.round(preview.netCash)) : "Données insuffisantes"}</div>
        {preview && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-white/75">
            <span>Prix</span>
            <span className="tabular text-right">{price !== undefined ? eur(price) : "—"}</span>
            <span>Remboursement banque</span>
            <span className="tabular text-right">−{eur(Math.round(preview.debtRepaid))}</span>
            <span>Frais et impôt</span>
            <span className="tabular text-right">−{eur((a.fees ?? 0) + (a.tax ?? 0))}</span>
            <span className="border-t border-white/15 pt-1">Loyers en moins</span>
            <span className="tabular border-t border-white/15 pt-1 text-right">−{eur(Math.round(preview.rentLostMonthly))}/mois</span>
            <span>Mensualités en moins</span>
            <span className="tabular text-right">+{eur(Math.round(preview.paymentsRemovedMonthly))}/mois</span>
            <span>Cash-flow</span>
            <span className={cx("tabular text-right font-semibold", cfDelta! >= 0 ? "text-[#8fe3b5]" : "text-[#ffb3b3]")}>
              {`${cfDelta! >= 0 ? "+" : "−"}${eur(Math.abs(Math.round(cfDelta!)))}/mois`}
            </span>
          </div>
        )}
        {preview && preview.valueRemoved > 0 && <div className="mt-2 text-[12px] text-white/55">Valeur retirée du patrimoine : {eurCompact(preview.valueRemoved)}</div>}
      </div>

      <div className="grid gap-2">
        <Button full disabled={byLot && !a.lots!.length} onClick={save}>
          {saved ? "Enregistrer" : "Ajouter aux projections"}
        </Button>
        {saved && (
          <>
            <Button variant="secondary" full icon={<CircleCheck size={18} />} onClick={realize}>
              Vente réalisée
            </Button>
            <Button variant="danger" full icon={<Trash2 size={18} />} onClick={cancelSale}>
              Supprimer la vente prévue
            </Button>
          </>
        )}
      </div>
      <p className="text-center text-[12px] text-muted">Pris en compte dans les projections, la chronologie et le dossier banque.</p>
    </div>
  );
}
