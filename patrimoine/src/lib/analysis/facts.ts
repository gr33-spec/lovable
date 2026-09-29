import { kindLabel, usageLabel } from "../assets";
import type { AppData, Building } from "../types";
import type { MonthIndex } from "../engine/dates";
import { yearOf } from "../engine/dates";
import { project } from "../engine/projection";
import { cashflowMonthly, ltv, netWorth, NO_COMPANY, type Figures } from "../engine/snapshot";
import { formatIndicator, latestStatements, portfolioIndicators, statementRatios } from "../engine/indicators";
import { qualityIssues } from "../engine/quality";
import { companySubset } from "../engine/subset";
import { unpaidByUnit } from "../engine/leases";
import type { AnalysisScope } from "./types";

// Dossier de faits transmis à l'IA. Tous les chiffres sortent des moteurs de
// l'application (mêmes calculs que les écrans et le dossier banque) : l'IA
// les commente, elle ne calcule rien. Aucune donnée personnelle des
// locataires (noms, coordonnées) n'y figure.

const r0 = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? null : Math.round(v));
const r1 = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

function figures(f: Figures) {
  const net = f.unvalued ? undefined : netWorth(f);
  const l = f.unvalued ? undefined : ltv(f);
  return {
    valeurEstimee: f.value ? r0(f.value) : null,
    immeublesSansValeur: f.unvalued,
    detteBancaire: r0(f.debt),
    creditsCapitalInconnu: f.unknownDebt,
    patrimoineNet: r0(net),
    loyersMensuels: r0(f.rentMonthly),
    loyersPotentielsMensuels: r0(f.potentialRentMonthly),
    chargesAnnuelles: r0(f.chargesAnnual),
    mensualitesCredits: r0(f.paymentsMonthly),
    creditsMensualiteInconnue: f.unknownPayment,
    cashflowMensuel: r0(cashflowMonthly(f)),
    ltvPct: r1(l),
    rendementBrutPct: f.value > 0 && !f.unvalued ? r1(((f.rentMonthly * 12) / f.value) * 100) : null,
    lots: f.units,
    lotsVacants: f.vacantUnits,
  };
}

export function scopeLabel(data: AppData, scope: AnalysisScope): string {
  if (scope.type === "company") return data.companies.find((c) => c.id === scope.id)?.name ?? "Société";
  if (scope.type === "building") return data.buildings.find((b) => b.id === scope.id)?.name ?? "Immeuble";
  return data.settings.groupName || "Patrimoine complet";
}

/** Données du périmètre : tout, une société (et ses filiales), ou un immeuble. */
function subset(data: AppData, scope: AnalysisScope): AppData {
  if (scope.type === "company") return companySubset(data, scope.id);
  if (scope.type === "building") {
    const b = data.buildings.find((x) => x.id === scope.id);
    if (!b) return data;
    return {
      ...data,
      companies: data.companies.filter((c) => c.id === b.companyId).map((c) => ({ ...c, parentId: null })),
      buildings: [b],
      units: data.units.filter((u) => u.buildingId === b.id),
      loans: data.loans.filter((l) => l.buildingId === b.id),
      works: data.works.filter((w) => w.buildingId === b.id),
      events: [],
      withdrawals: [],
      statements: [],
      plans: data.plans.filter((a) => a.type === "sale" && a.buildingId === b.id),
      scenarios: [],
      projects: [],
    };
  }
  return data;
}

export function buildFacts(all: AppData, nowMonth: MonthIndex, scope: AnalysisScope = { type: "global" }) {
  const data = subset(all, scope);
  const p = project(data, nowMonth);
  const snap = p.snapshot;
  const y0 = yearOf(nowMonth);
  const companyName = (id?: string | null) => all.companies.find((c) => c.id === id)?.name ?? null;

  const buildingFacts = (b: Building) => {
    const f = snap.byBuilding.get(b.id);
    const units = data.units.filter((u) => u.buildingId === b.id);
    const dpe = units.reduce<Record<string, number>>((acc, u) => {
      if (u.dpeClass) acc[u.dpeClass] = (acc[u.dpeClass] ?? 0) + 1;
      return acc;
    }, {});
    return {
      id: b.id,
      nom: b.name,
      nature: kindLabel(b.kind) ?? "non précisée",
      usage: usageLabel(b.usage) ?? null,
      societe: companyName(b.companyId),
      ville: b.city ?? null,
      prixAchat: r0(b.acquisitionPrice),
      dateAchat: b.acquisitionDate ?? null,
      plusValueLatente: f && f.value && b.acquisitionPrice && !f.unvalued ? r0(f.value - b.acquisitionPrice) : null,
      etat: b.condition ?? null,
      travauxEnvisages: b.plannedWorks ?? null,
      zoneTendue: b.zoneTendue ?? null,
      dpeParClasse: Object.keys(dpe).length ? dpe : null,
      lotsSansDpe: units.filter((u) => !u.dpeClass && u.status !== "vacant").length,
      typesDeLots: units.map((u) => [u.type, u.surface ? `${u.surface} m²` : null, u.status === "vacant" ? "vacant" : `${r0(u.rent) ?? "?"} €`].filter(Boolean).join(" ")),
      ...(f ? figures(f) : {}),
    };
  };

  const loans = data.loans
    .map((l) => {
      const r = snap.resolvedLoans.get(l.id);
      const now = snap.byLoan.get(l.id);
      if (!r || r.finished) return null;
      return {
        id: l.id,
        nom: l.name || l.bank || "Crédit",
        banque: l.bank ?? null,
        immeuble: data.buildings.find((b) => b.id === l.buildingId)?.name ?? null,
        immeubleId: l.buildingId ?? null,
        type: r.kind,
        capitalRestant: r0(now?.balance),
        mensualite: r0(now?.paymentMonthly),
        tauxPct: r1(l.ratePct ?? r.impliedRatePct),
        finAnnee: r.endMonth !== undefined ? yearOf(r.endMonth) : null,
        fiabilite: l.schedule ? "tableau d'amortissement de la banque" : r.quality === "complete" ? "calculé à partir des caractéristiques saisies" : r.quality,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const at = (n: number) => p.years[n];
  const projection = [0, 3, 5, 10, 15, 20, 30]
    .map((n) => at(n))
    .filter(Boolean)
    .map((row) => ({ annee: row!.year, valeur: r0(row!.value), dette: r0(row!.debt), patrimoineNet: r0(row!.net), tresorerie: r0(row!.treasury), cashflowAnnuel: r0(row!.cashflow) }));

  const unpaid = unpaidByUnit(data.units);
  const issues = qualityIssues(data, snap);

  return {
    date: `${y0}`,
    perimetre: { type: scope.type, nom: scopeLabel(all, scope) },
    hypotheses: {
      revalorisationAnnuellePct: data.settings.valueGrowthPct ?? null,
      indexationLoyersPct: data.settings.rentGrowthPct ?? null,
      hausseChargesPct: data.settings.chargesGrowthPct ?? null,
    },
    totaux: figures(snap.total),
    indicateurs: portfolioIndicators(data, p).map((i) => ({ nom: i.label, valeur: i.value === undefined ? "données insuffisantes" : formatIndicator(i), niveau: i.level, explication: i.explain })),
    societes: data.companies.map((c) => {
      const f = snap.ownByCompany.get(c.id);
      const { last } = latestStatements(data, c.id);
      const ratios = last ? statementRatios(last.figures) : undefined;
      return {
        id: c.id,
        nom: c.name,
        forme: c.kind ?? null,
        societeMere: companyName(c.parentId),
        ...(f ? figures(f) : {}),
        dernierBilan: last
          ? {
              annee: last.year,
              chiffreAffaires: r0(last.figures.revenue),
              resultatNet: r0(last.figures.netResult),
              tresorerie: r0(last.figures.cash),
              capitauxPropres: r0(last.figures.equity),
              comptesCourantsAssocies: r0(last.figures.partnerAccounts),
              caf: r0(ratios?.caf),
              detteSurCaf: r1(ratios?.debtToCaf),
            }
          : null,
      };
    }),
    horsSociete: snap.ownByCompany.get(NO_COMPANY) ? figures(snap.ownByCompany.get(NO_COMPANY)!) : null,
    immeubles: data.buildings.map(buildingFacts),
    credits: loans,
    projection,
    prochainesEcheances: p.events
      .filter((e) => e.year <= y0 + 10)
      .slice(0, 15)
      .map((e) => ({ annee: e.year, type: e.kind, libelle: e.label, montant: r0(e.amount), mensualiteLiberee: r0(e.monthlyFreed) })),
    travauxPrevus: data.works
      .filter((w) => w.status !== "termine")
      .map((w) => ({ libelle: w.label, annee: w.year ?? null, montant: r0(w.amount), immeuble: data.buildings.find((b) => b.id === w.buildingId)?.name ?? null, financeParCredit: !!w.financedByLoan })),
    ventesPrevues: p.sales.map((s) => ({ immeuble: data.buildings.find((b) => b.id === s.buildingId)?.name ?? null, annee: s.year, prix: r0(s.price), netApresCredit: r0(s.netCash) })),
    impayes: { logements: unpaid.length, montant: r0(unpaid.reduce((a, l) => a + l.amount, 0)) },
    donneesManquantes: issues.slice(0, 25).map((i) => `${i.label} : ${i.detail}`),
  };
}

export type Facts = ReturnType<typeof buildFacts>;

/** Identifiants auxquels une piste peut renvoyer (contrôle de la réponse de l'IA). */
export function knownIds(facts: Facts) {
  return {
    societe: new Set(facts.societes.map((c) => c.id)),
    immeuble: new Set(facts.immeubles.map((b) => b.id)),
    credit: new Set(facts.credits.map((l) => l.id)),
  };
}
