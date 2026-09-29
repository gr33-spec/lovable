import type { AppData, AppDocument, DocCategory, Loan, LoanScheduleRow, Tenancy } from "./types";
import type { MonthIndex } from "./engine/dates";
import { checkSchedule, loanFieldsFromSchedule } from "./schedule";

// Centre documentaire. Chaque fichier est stocké une seule fois (app_file) ;
// les baux signés, cautions, courriers, tableaux d'amortissement, bilans et
// pièces de projet restent à leur emplacement d'origine, les autres pièces
// vont dans `documents`. L'index ci-dessous réunit tout, sans copie, pour la
// bibliothèque et pour les cartes « Documents » de chaque élément.

export const DOC_CATEGORIES: { value: DocCategory; label: string; plural: string }[] = [
  { value: "bail", label: "Bail", plural: "Baux" },
  { value: "caution", label: "Acte de cautionnement", plural: "Cautionnements" },
  { value: "etat_des_lieux", label: "État des lieux", plural: "États des lieux" },
  { value: "courrier", label: "Courrier", plural: "Courriers" },
  { value: "identite", label: "Pièce du locataire", plural: "Pièces des locataires" },
  { value: "tableau_amortissement", label: "Tableau d'amortissement", plural: "Tableaux d'amortissement" },
  { value: "offre_pret", label: "Offre de prêt", plural: "Offres de prêt" },
  { value: "banque", label: "Document bancaire", plural: "Documents bancaires" },
  { value: "assurance", label: "Assurance", plural: "Assurances" },
  { value: "facture", label: "Facture", plural: "Factures" },
  { value: "devis", label: "Devis", plural: "Devis" },
  { value: "diagnostic", label: "Diagnostic", plural: "Diagnostics" },
  { value: "acte", label: "Acte, statuts", plural: "Actes et statuts" },
  { value: "fiscal", label: "Impôts, taxes", plural: "Impôts et taxes" },
  { value: "copropriete", label: "Copropriété", plural: "Copropriété" },
  { value: "bilan", label: "Bilan, comptes", plural: "Bilans" },
  { value: "autre", label: "Autre document", plural: "Autres" },
];

export const categoryLabel = (c: DocCategory) => DOC_CATEGORIES.find((x) => x.value === c)?.label ?? "Document";

/** Raccourcis de la bibliothèque : peu nombreux, le reste passe par le filtre « Type ». */
export const DOC_SHORTCUTS: { id: string; label: string; categories: DocCategory[] }[] = [
  { id: "baux", label: "Baux", categories: ["bail", "etat_des_lieux"] },
  { id: "cautions", label: "Cautionnements", categories: ["caution"] },
  { id: "credits", label: "Prêts et banque", categories: ["tableau_amortissement", "offre_pret", "banque"] },
  { id: "assurances", label: "Assurances", categories: ["assurance"] },
  { id: "factures", label: "Factures et devis", categories: ["facture", "devis"] },
  { id: "diagnostics", label: "Diagnostics", categories: ["diagnostic"] },
  { id: "juridique", label: "Juridique et fiscal", categories: ["acte", "fiscal", "copropriete", "bilan"] },
  { id: "locataires", label: "Courriers et pièces", categories: ["courrier", "identite"] },
];

export interface DocEntry {
  /** Identifiant stable de l'entrée (emplacement + fichier). */
  key: string;
  fileId: string;
  name: string;
  title: string;
  category: DocCategory;
  date?: string;
  companyId?: string;
  buildingId?: string;
  unitId?: string;
  tenancyId?: string;
  loanId?: string;
  projectId?: string;
  summary?: string;
  /** Où le document est rangé (lien vers l'élément). */
  place: { label: string; href: string };
  /** Pièce libre (supprimable depuis la bibliothèque). */
  docId?: string;
}

function tenantNames(t: Tenancy): string {
  return t.tenants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ");
}

/** Toutes les pièces de l'application, chacune une seule fois par emplacement. */
export function documentIndex(data: AppData): DocEntry[] {
  const units = new Map(data.units.map((u) => [u.id, u]));
  const buildings = new Map(data.buildings.map((b) => [b.id, b]));
  const companies = new Map(data.companies.map((c) => [c.id, c]));
  const tenancies = new Map(data.tenancies.map((t) => [t.id, t]));
  const loans = new Map(data.loans.map((l) => [l.id, l]));
  // Rattachements complétés : un lot donne son immeuble, un immeuble sa société.
  const up = (x: { companyId?: string | null; buildingId?: string | null; unitId?: string | null; tenancyId?: string | null; loanId?: string | null }) => {
    const tenancy = x.tenancyId ? tenancies.get(x.tenancyId) : undefined;
    const unitId = x.unitId ?? tenancy?.unitId ?? undefined;
    const loan = x.loanId ? loans.get(x.loanId) : undefined;
    const buildingId = x.buildingId ?? (unitId ? units.get(unitId)?.buildingId : undefined) ?? loan?.buildingId ?? undefined;
    const companyId = x.companyId ?? (buildingId ? buildings.get(buildingId)?.companyId : undefined) ?? loan?.companyId ?? undefined;
    return { companyId: companyId ?? undefined, buildingId: buildingId ?? undefined, unitId: unitId ?? undefined, tenancyId: x.tenancyId ?? undefined, loanId: x.loanId ?? undefined };
  };
  const unitPlace = (unitId: string, suffix = "") => {
    const u = units.get(unitId);
    const b = u ? buildings.get(u.buildingId) : undefined;
    return { label: [b?.name, u?.name].filter(Boolean).join(" › ") + suffix, href: `/patrimoine/logement/${unitId}?depuis=gestion` };
  };
  const out: DocEntry[] = [];

  for (const t of data.tenancies) {
    const who = tenantNames(t);
    const where = unitPlace(t.unitId, who ? ` › ${who}` : "");
    if (t.signedLease?.fileId)
      out.push({ key: `bail-${t.id}`, fileId: t.signedLease.fileId, name: t.signedLease.name, title: `Bail signé${who ? ` — ${who}` : ""}`, category: "bail", date: t.signDate ?? t.startDate ?? t.signedLease.uploadedAt, ...up({ tenancyId: t.id }), summary: who, place: where });
    (t.guarantors ?? []).forEach((g, i) => {
      if (!g.signedFile?.fileId) return;
      const gName = [g.firstName, g.lastName].filter(Boolean).join(" ");
      out.push({ key: `caution-${t.id}-${i}`, fileId: g.signedFile.fileId, name: g.signedFile.name, title: `Acte de cautionnement${gName ? ` — ${gName}` : ""}`, category: "caution", date: g.signedFile.uploadedAt, ...up({ tenancyId: t.id }), summary: [who, gName].filter(Boolean).join(" "), place: where });
    });
    for (const l of t.letters ?? []) {
      if (!l.file?.fileId) continue;
      out.push({ key: `courrier-${l.id}`, fileId: l.file.fileId, name: l.file.name, title: l.label, category: "courrier", date: l.date, ...up({ tenancyId: t.id }), summary: who, place: where });
    }
  }
  for (const l of data.loans) {
    if (!l.schedule?.fileId) continue;
    const b = l.buildingId ? buildings.get(l.buildingId) : undefined;
    out.push({ key: `tableau-${l.id}`, fileId: l.schedule.fileId, name: l.schedule.fileName ?? "Tableau d'amortissement", title: `Tableau d'amortissement — ${l.name || l.bank || "Crédit"}`, category: "tableau_amortissement", date: l.schedule.importedAt, ...up({ loanId: l.id }), summary: [l.bank, b?.name].filter(Boolean).join(" "), place: { label: l.name || l.bank || "Crédit", href: `/patrimoine/credit/${l.id}` } });
  }
  for (const s of data.statements) {
    if (!s.fileId) continue;
    const c = companies.get(s.companyId);
    out.push({ key: `bilan-${s.id}`, fileId: s.fileId, name: s.fileName ?? `Bilan ${s.year}`, title: `Bilan ${s.year}${c ? ` — ${c.name}` : ""}`, category: "bilan", date: s.closingDate ?? `${s.year}-12-31`, companyId: s.companyId, place: { label: `Bilan ${s.year}`, href: `/plus/bilans/${s.id}` } });
  }
  for (const p of data.projects) {
    const place = { label: `Projet ${p.name}`, href: `/patrimoine/projet/${p.id}` };
    const base = { projectId: p.id, companyId: p.companyId ?? undefined, buildingId: p.buildingId ?? undefined };
    for (const d of p.documents ?? []) out.push({ key: `projet-${d.id}`, fileId: d.fileId, name: d.name, title: d.name, category: "autre", ...base, summary: p.name, place });
    for (const c of p.costs ?? []) if (c.fileId) out.push({ key: `devis-${c.id}`, fileId: c.fileId, name: c.fileName ?? c.label, title: `Devis — ${c.label}`, category: "devis", ...base, summary: p.name, place });
    for (const l of p.loans ?? []) if (l.schedule?.fileId) out.push({ key: `tableau-projet-${l.id}`, fileId: l.schedule.fileId, name: l.schedule.fileName ?? "Tableau d'amortissement", title: `Tableau d'amortissement — ${l.label || l.bank || "Prêt"} (projet)`, category: "tableau_amortissement", date: l.schedule.importedAt, ...base, summary: [l.bank, p.name].filter(Boolean).join(" "), place });
  }
  for (const d of data.documents ?? []) {
    const links = up(d);
    const place = links.tenancyId || links.unitId
      ? unitPlace((links.unitId ?? tenancies.get(links.tenancyId!)?.unitId)!, "")
      : links.loanId
        ? { label: loans.get(links.loanId)?.name || "Crédit", href: `/patrimoine/credit/${links.loanId}` }
        : links.buildingId
          ? { label: buildings.get(links.buildingId)?.name ?? "Immeuble", href: `/patrimoine/immeuble/${links.buildingId}` }
          : links.companyId
            ? { label: companies.get(links.companyId)?.name ?? "Société", href: `/patrimoine/societe/${links.companyId}` }
            : { label: "Non rattaché", href: "/documents" };
    out.push({ key: `doc-${d.id}`, fileId: d.fileId, name: d.name, title: d.title || d.name, category: d.category, date: d.date ?? d.addedAt, ...links, summary: d.summary, place, docId: d.id });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export type DocScope = { companyId?: string; buildingId?: string; unitId?: string; tenancyId?: string; loanId?: string };

/** Pièces d'un élément (une société voit aussi celles de ses immeubles, un immeuble celles de ses lots). */
export function documentsOf(index: DocEntry[], scope: DocScope): DocEntry[] {
  return index.filter(
    (e) =>
      (!scope.companyId || e.companyId === scope.companyId) &&
      (!scope.buildingId || e.buildingId === scope.buildingId) &&
      (!scope.unitId || e.unitId === scope.unitId) &&
      (!scope.tenancyId || e.tenancyId === scope.tenancyId) &&
      (!scope.loanId || e.loanId === scope.loanId),
  );
}

/** Texte de recherche d'une entrée : titre, fichier, type, lieu, résumé. */
export function searchText(e: DocEntry, data: AppData): string {
  const b = e.buildingId ? data.buildings.find((x) => x.id === e.buildingId) : undefined;
  const c = e.companyId ? data.companies.find((x) => x.id === e.companyId) : undefined;
  return [e.title, e.name, categoryLabel(e.category), e.place.label, e.summary, b?.name, b?.city, b?.address, c?.name].filter(Boolean).join(" ").toLowerCase();
}

// ——— Rangement d'une pièce importée ———

export interface FilingInput {
  fileId: string;
  name: string;
  category: DocCategory;
  title?: string;
  date?: string;
  summary?: string;
  companyId?: string;
  buildingId?: string;
  unitId?: string;
  tenancyId?: string;
  loanId?: string;
  /** Échéances lues (tableau d'amortissement). */
  scheduleRows?: LoanScheduleRow[];
}

export type FilingOp = { coll: "tenancies"; item: Tenancy } | { coll: "loans"; item: Loan } | { coll: "documents"; item: AppDocument };

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/**
 * Range une pièce à son emplacement naturel quand il est libre : bail signé
 * ou acte de caution du locataire, courrier du dossier, tableau d'un crédit
 * (seulement s'il est cohérent). Sinon — ou si l'emplacement est déjà occupé,
 * rien n'étant jamais écrasé — elle devient une pièce libre rattachée aux
 * mêmes éléments. Renvoie les modifications et une phrase « rangé dans… ».
 */
export function fileDocument(data: AppData, input: FilingInput, nowMonth: MonthIndex): { ops: FilingOp[]; placed: string } {
  const ref = { fileId: input.fileId, name: input.name, uploadedAt: today() };
  const tenancy = input.tenancyId ? data.tenancies.find((t) => t.id === input.tenancyId) : undefined;
  const loan = input.loanId ? data.loans.find((l) => l.id === input.loanId) : undefined;

  if (tenancy && input.category === "bail" && !tenancy.signedLease) {
    return { ops: [{ coll: "tenancies", item: { ...tenancy, signedLease: ref } }], placed: "Bail signé du locataire" };
  }
  if (tenancy && input.category === "caution") {
    const i = (tenancy.guarantors ?? []).findIndex((g) => !g.signedFile);
    if (i >= 0) {
      const guarantors = tenancy.guarantors!.map((g, j) => (j === i ? { ...g, signedFile: ref } : g));
      return { ops: [{ coll: "tenancies", item: { ...tenancy, guarantors } }], placed: "Acte de cautionnement du garant" };
    }
  }
  if (tenancy && input.category === "courrier") {
    const letter = { id: uid(), kind: "autre" as const, label: input.title || "Courrier", date: input.date || today(), file: ref };
    return { ops: [{ coll: "tenancies", item: { ...tenancy, letters: [...(tenancy.letters ?? []), letter] } }], placed: "Courriers du locataire" };
  }
  if (loan && input.category === "tableau_amortissement" && !loan.schedule && input.scheduleRows && input.scheduleRows.length >= 2 && checkSchedule(input.scheduleRows).issues.length === 0) {
    const item: Loan = {
      ...loan,
      ...loanFieldsFromSchedule(input.scheduleRows, nowMonth),
      schedule: { rows: input.scheduleRows, fileId: input.fileId, fileName: input.name, importedAt: today(), source: "ia" },
    };
    return { ops: [{ coll: "loans", item }], placed: "Tableau d'amortissement du crédit (chiffres mis à jour)" };
  }
  const doc: AppDocument = {
    id: uid(),
    fileId: input.fileId,
    name: input.name,
    category: input.category,
    title: input.title,
    date: input.date,
    summary: input.summary,
    companyId: input.companyId ?? null,
    buildingId: input.buildingId ?? null,
    unitId: input.unitId ?? null,
    tenancyId: input.tenancyId ?? null,
    loanId: input.loanId ?? null,
    addedAt: today(),
    source: "ia",
  };
  return { ops: [{ coll: "documents", item: doc }], placed: "Documents" };
}
