import type { AppData, AppDocument, Collection } from "./types";

// Suppression d'un élément et de ce qui en dépend : règle unique pour tous
// les écrans (fiche société, immeuble, lot, crédit, vente réalisée).
//
// - Ce qui n'a pas de sens sans son parent est supprimé avec lui : logements,
//   baux, états des lieux, travaux, crédits de l'immeuble ; bilans,
//   événements et rémunérations d'une société.
// - Les pièces du centre documentaire ne sont jamais perdues : elles restent
//   dans Documents, rattachées au niveau supérieur qui subsiste (le lot
//   supprimé → l'immeuble ; l'immeuble → la société ; le crédit → son
//   immeuble ou sa société ; la société → « Non rattaché »).
// - Les projets gardent leur historique, sans lien vers l'élément disparu ;
//   les filiales d'une société supprimée remontent d'un niveau.
// Les fichiers eux-mêmes ne sont pas effacés : une sauvegarde restaurée les
// retrouve intacts.

export type RemovableColl = "companies" | "buildings" | "units" | "loans";

export interface RemovalPlan {
  removes: { coll: Collection; id: string }[];
  updates: { coll: Collection; item: { id: string } }[];
  /** Nombre d'éléments supprimés avec l'élément, par collection. */
  counts: Partial<Record<Collection, number>>;
  /** Pièces du centre documentaire conservées (déplacées au niveau supérieur). */
  keptDocuments: number;
}

export function removalPlan(data: AppData, coll: RemovableColl, id: string): RemovalPlan {
  const removed = new Map<Collection, Set<string>>();
  const mark = (c: Collection, x: string) => {
    if (!removed.has(c)) removed.set(c, new Set());
    removed.get(c)!.add(x);
  };
  const gone = (c: Collection, x?: string | null) => !!x && !!removed.get(c)?.has(x);

  const removeLoan = (loanId: string) => mark("loans", loanId);
  const removeUnit = (unitId: string) => {
    mark("units", unitId);
    for (const t of data.tenancies) if (t.unitId === unitId) mark("tenancies", t.id);
    for (const i of data.inspections) if (i.unitId === unitId || gone("tenancies", i.tenancyId)) mark("inspections", i.id);
    for (const w of data.works) if (w.unitId === unitId) mark("works", w.id);
  };
  const removeBuilding = (buildingId: string) => {
    mark("buildings", buildingId);
    for (const u of data.units) if (u.buildingId === buildingId) removeUnit(u.id);
    for (const l of data.loans) if (l.buildingId === buildingId) removeLoan(l.id);
    for (const w of data.works) if (w.buildingId === buildingId) mark("works", w.id);
  };
  const removeCompany = (companyId: string) => {
    mark("companies", companyId);
    for (const b of data.buildings) if (b.companyId === companyId) removeBuilding(b.id);
    for (const l of data.loans) if (!l.buildingId && l.companyId === companyId) removeLoan(l.id);
    for (const w of data.works) if (!w.buildingId && !w.unitId && w.companyId === companyId) mark("works", w.id);
    for (const s of data.statements) if (s.companyId === companyId) mark("statements", s.id);
    for (const e of data.events) if (e.companyId === companyId) mark("events", e.id);
    for (const w of data.withdrawals) if (w.companyId === companyId) mark("withdrawals", w.id);
  };

  if (coll === "companies") removeCompany(id);
  else if (coll === "buildings") removeBuilding(id);
  else if (coll === "units") removeUnit(id);
  else removeLoan(id);

  const updates: RemovalPlan["updates"] = [];
  // Pièces libres : conservées, remontées au niveau qui subsiste.
  const buildingOf = (d: AppDocument) => {
    if (d.buildingId) return d.buildingId;
    const u = d.unitId ? data.units.find((x) => x.id === d.unitId) : undefined;
    if (u) return u.buildingId;
    const l = d.loanId ? data.loans.find((x) => x.id === d.loanId) : undefined;
    return l?.buildingId ?? null;
  };
  const companyOf = (d: AppDocument, buildingId: string | null) => {
    if (d.companyId) return d.companyId;
    const b = buildingId ? data.buildings.find((x) => x.id === buildingId) : undefined;
    if (b?.companyId) return b.companyId;
    const l = d.loanId ? data.loans.find((x) => x.id === d.loanId) : undefined;
    return l?.companyId ?? null;
  };
  let keptDocuments = 0;
  for (const d of data.documents ?? []) {
    const touched = gone("units", d.unitId) || gone("tenancies", d.tenancyId) || gone("loans", d.loanId) || gone("buildings", d.buildingId) || gone("companies", d.companyId) || gone("buildings", buildingOf(d)) || gone("companies", companyOf(d, buildingOf(d)));
    if (!touched) continue;
    const buildingId = buildingOf(d);
    const b = gone("buildings", buildingId) ? null : buildingId;
    const c = companyOf(d, buildingId);
    const moved: AppDocument = {
        ...d,
        unitId: gone("units", d.unitId) ? null : (d.unitId ?? null),
        tenancyId: gone("tenancies", d.tenancyId) ? null : (d.tenancyId ?? null),
        loanId: gone("loans", d.loanId) ? null : (d.loanId ?? null),
        buildingId: b,
        companyId: gone("companies", c) ? null : c,
    };
    updates.push({ coll: "documents", item: moved });
    keptDocuments++;
  }
  // Projets : l'historique reste, sans lien vers ce qui a disparu.
  for (const p of data.projects ?? []) {
    const patch: Record<string, null> = {};
    if (gone("buildings", p.buildingId)) patch.buildingId = null;
    if (gone("companies", p.companyId)) patch.companyId = null;
    if (gone("companies", p.newCompanyParentId)) patch.newCompanyParentId = null;
    if (Object.keys(patch).length) updates.push({ coll: "projects", item: { ...p, ...patch } });
  }
  // Filiales d'une société supprimée : elles remontent d'un niveau.
  if (coll === "companies") {
    const parent = data.companies.find((c) => c.id === id)?.parentId ?? null;
    for (const c of data.companies) if (c.parentId === id && !gone("companies", c.id)) updates.push({ coll: "companies", item: { ...c, parentId: parent } as { id: string } });
  }

  const removes = [...removed.entries()].flatMap(([c, set]) => [...set].map((x) => ({ coll: c, id: x })));
  const counts: RemovalPlan["counts"] = {};
  for (const [c, set] of removed) counts[c] = set.size;
  counts[coll] = (counts[coll] ?? 1) - 1;
  return { removes, updates, counts, keptDocuments };
}

const NAMES: Partial<Record<Collection, [string, string]>> = {
  buildings: ["immeuble", "immeubles"],
  units: ["logement", "logements"],
  tenancies: ["bail", "baux"],
  inspections: ["état des lieux", "états des lieux"],
  loans: ["crédit", "crédits"],
  works: ["travaux", "travaux"],
  statements: ["bilan", "bilans"],
  events: ["événement", "événements"],
  withdrawals: ["rémunération", "rémunérations"],
};

/** Phrase de confirmation : ce qui part avec l'élément, et ce qui est conservé. */
export function removalSummary(plan: RemovalPlan): string {
  const parts = Object.entries(plan.counts)
    .filter(([, n]) => n && n > 0)
    .map(([c, n]) => {
      const [one, many] = NAMES[c as Collection] ?? [c, c];
      return `${n} ${n > 1 ? many : one}`;
    });
  const gone = parts.length ? `Seront aussi supprimés : ${parts.join(", ")}.` : "";
  const kept = plan.keptDocuments ? ` ${plan.keptDocuments} document${plan.keptDocuments > 1 ? "s restent" : " reste"} dans Documents.` : "";
  return `${gone}${kept} Une sauvegarde automatique permet de revenir en arrière.`.trim();
}

/** État d'origine des éléments touchés, pour annuler (remise en place). */
export function removalBackup(data: AppData, plan: RemovalPlan): { coll: Collection; item: { id: string } }[] {
  const find = (c: Collection, x: string) => (data[c] as unknown as { id: string }[]).find((i) => i.id === x);
  return [...plan.removes.map((r) => ({ coll: r.coll, item: find(r.coll, r.id) })), ...plan.updates.map((u) => ({ coll: u.coll, item: find(u.coll, u.item.id) }))].filter((x): x is { coll: Collection; item: { id: string } } => !!x.item);
}

/**
 * Suppression d'une liste d'éléments quelconques : chaque société, immeuble,
 * logement ou crédit emporte ce qui en dépend (règle ci-dessus), les autres
 * éléments sont supprimés tels quels. Point de passage unique de toutes les
 * suppressions de l'interface.
 */
export function expandRemoval(data: AppData, items: { coll: Collection; id: string }[]): Pick<RemovalPlan, "removes" | "updates"> {
  const removes = new Map<string, { coll: Collection; id: string }>();
  const updates = new Map<string, { coll: Collection; item: { id: string } }>();
  const key = (c: Collection, id: string) => `${c}:${id}`;
  for (const it of items) {
    if (it.coll === "companies" || it.coll === "buildings" || it.coll === "units" || it.coll === "loans") {
      const p = removalPlan(data, it.coll, it.id);
      for (const r of p.removes) removes.set(key(r.coll, r.id), r);
      for (const u of p.updates) updates.set(key(u.coll, u.item.id), u);
    } else {
      removes.set(key(it.coll, it.id), it);
    }
  }
  // Un élément supprimé n'a pas à être mis à jour.
  for (const k of removes.keys()) updates.delete(k);
  return { removes: [...removes.values()], updates: [...updates.values()] };
}
