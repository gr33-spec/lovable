import type { AppData, AppDocument, DocCategory, Loan, LoanScheduleRow, ScheduleMeta, Tenancy } from "./types";
import { loanFieldsFromSchedule } from "./schedule";
import { describeLoan, newLoanName, type LoanPlan } from "./loan-match";

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
    const c = companies.get(up({ loanId: l.id }).companyId ?? "");
    out.push({ key: `tableau-${l.id}`, fileId: l.schedule.fileId, name: l.schedule.fileName ?? "Tableau d'amortissement", title: `Tableau — ${l.name || l.bank || "Crédit"}`, category: "tableau_amortissement", date: l.schedule.importedAt, ...up({ loanId: l.id }), summary: [describeLoan(l), l.reference, l.schedule.meta?.borrower, b?.name].filter(Boolean).join(" · "), place: { label: [c?.name, b?.name, l.name || l.bank || "Crédit"].filter(Boolean).join(" › "), href: `/patrimoine/credit/${l.id}` } });
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
  return searchKey([e.title, e.name, categoryLabel(e.category), e.place.label, e.summary, b?.name, b?.city, b?.address, c?.name].filter(Boolean).join(" "));
}

/** Forme de recherche : sans accents ni majuscules (« Goëlo » = « GOELO » = « goelo »). */
export function searchKey(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ——— Pré-remplissage d'après le nom du fichier (sans IA) ———

const CATEGORY_WORDS: [DocCategory, RegExp][] = [
  ["tableau_amortissement", /amortissement|echeancier|tableau/],
  ["etat_des_lieux", /etat des lieux|\bedl\b/],
  ["caution", /caution/],
  ["bail", /\bbail\b|\bbaux\b|contrat de location/],
  ["offre_pret", /offre de pret|offre pret/],
  ["assurance", /assurance|\bpno\b|multirisque/],
  ["facture", /facture/],
  ["devis", /devis/],
  ["diagnostic", /\bdpe\b|diagnostic|amiante|plomb|electricite|termites/],
  ["fiscal", /taxe|impot|fonciere|\bcfe\b/],
  ["copropriete", /copro|syndic|appel de fonds|\bag\b/],
  ["bilan", /bilan|liasse|comptes annuels/],
  ["acte", /\bacte\b|statuts|notaire|\bpv\b|proces verbal|kbis/],
  ["banque", /releve|\brib\b|banque|attestation bancaire/],
  ["identite", /identite|\bcni\b|passeport|fiche de paie|bulletin de salaire|avis d.imposition/],
  ["courrier", /courrier|lettre|conge|relance|revision/],
];

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ");

/** Mots propres à un nom (« SCI DU PORT » → port ; « Immeuble de Pléhédel » → plehedel). */
const nameWords = (s: string) => plain(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !["immeuble", "appartement", "maison", "societe", "holding"].includes(w));

/**
 * Rangement proposé pour un fichier importé : type d'après les mots de son
 * nom, société / immeuble s'ils y sont cités, et l'endroit d'où l'on
 * importe (fiche immeuble, lot, crédit…). Calcul local, gratuit ;
 * l'utilisateur confirme ou corrige toujours.
 */
export function guessPlacement(data: AppData, fileName: string, scope?: DocScope) {
  const name = plain(fileName.replace(/\.[a-z0-9]+$/i, ""));
  const category = CATEGORY_WORDS.find(([, re]) => re.test(name))?.[0] ?? "autre";
  const hit = <T extends { name: string }>(list: T[]) => {
    const found = list.filter((x) => nameWords(x.name).some((w) => name.includes(w)));
    return found.length === 1 ? found[0] : undefined;
  };
  const building = scope?.buildingId ? undefined : hit(data.buildings);
  const company = building ? undefined : hit(data.companies);
  const loan = scope?.loanId ? data.loans.find((l) => l.id === scope.loanId) : undefined;
  const unit = scope?.unitId ? data.units.find((u) => u.id === scope.unitId) : undefined;
  const buildingId = scope?.buildingId ?? unit?.buildingId ?? loan?.buildingId ?? building?.id ?? "";
  const companyId = scope?.companyId ?? data.buildings.find((b) => b.id === buildingId)?.companyId ?? loan?.companyId ?? company?.id ?? "";
  return {
    category: scope?.loanId && category === "autre" ? ("tableau_amortissement" as DocCategory) : category,
    title: fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim(),
    date: "",
    summary: "",
    companyId,
    buildingId,
    unitId: scope?.unitId ?? "",
    tenancyId: scope?.tenancyId ?? "",
    loanId: scope?.loanId ?? "",
  };
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
  /** En-tête du tableau (emprunteur, banque, référence, montant, début…). */
  scheduleMeta?: ScheduleMeta;
  /** Financement retenu pour le tableau : existant ou à créer. */
  loanPlan?: LoanPlan;
}

export type FilingOp = { coll: "tenancies"; item: Tenancy } | { coll: "loans"; item: Loan } | { coll: "documents"; item: AppDocument };
export type FilingRemove = { coll: "documents"; id: string };

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/**
 * Range une pièce à son emplacement naturel : bail signé ou acte de caution
 * du locataire (si l'emplacement est libre), courrier du dossier, tableau
 * d'amortissement sur son financement (existant ou créé). Rien n'est écrasé
 * ni supprimé : un tableau remplacé reste consultable comme pièce du prêt.
 * Une pièce libre du même fichier (rangée auparavant sans financement) est
 * reprise : elle quitte la liste des pièces libres, le fichier est le même.
 * Renvoie les modifications, les retraits et une phrase « rangé dans… ».
 */
export function fileDocument(data: AppData, input: FilingInput): { ops: FilingOp[]; removes: FilingRemove[]; placed: string; loanId?: string } {
  const ref = { fileId: input.fileId, name: input.name, uploadedAt: today() };
  const tenancy = input.tenancyId ? data.tenancies.find((t) => t.id === input.tenancyId) : undefined;
  const loose = (data.documents ?? []).filter((d) => d.fileId === input.fileId).map((d) => ({ coll: "documents" as const, id: d.id }));

  if (tenancy && input.category === "bail" && !tenancy.signedLease) {
    return { ops: [{ coll: "tenancies", item: { ...tenancy, signedLease: ref } }], removes: loose, placed: "Bail signé du locataire" };
  }
  if (tenancy && input.category === "caution") {
    const i = (tenancy.guarantors ?? []).findIndex((g) => !g.signedFile);
    if (i >= 0) {
      const guarantors = tenancy.guarantors!.map((g, j) => (j === i ? { ...g, signedFile: ref } : g));
      return { ops: [{ coll: "tenancies", item: { ...tenancy, guarantors } }], removes: loose, placed: "Acte de cautionnement du garant" };
    }
  }
  if (tenancy && input.category === "courrier") {
    const letter = { id: uid(), kind: "autre" as const, label: input.title || "Courrier", date: input.date || today(), file: ref };
    return { ops: [{ coll: "tenancies", item: { ...tenancy, letters: [...(tenancy.letters ?? []), letter] } }], removes: loose, placed: "Courriers du locataire" };
  }
  const rows = input.scheduleRows;
  if (input.category === "tableau_amortissement" && input.loanPlan && rows && rows.length >= 2) {
    const meta = input.scheduleMeta;
    const fields = loanFieldsFromSchedule(rows, undefined, meta);
    const schedule = { rows, fileId: input.fileId, fileName: input.name, importedAt: today(), source: "ia" as const, ...(meta && Object.keys(meta).length ? { meta } : {}) };
    const plan = input.loanPlan;
    const existing = plan.kind === "existing" ? data.loans.find((l) => l.id === plan.loanId) : undefined;
    if (existing) {
      const ops: FilingOp[] = [];
      const item: Loan = {
        ...existing,
        ...fields,
        bank: existing.bank || meta?.bank || undefined,
        reference: existing.reference || meta?.reference || undefined,
        // Rattachement complété seulement s'il manquait.
        buildingId: existing.buildingId ?? input.buildingId ?? null,
        companyId: existing.companyId ?? (existing.buildingId ? existing.companyId : input.companyId) ?? null,
        schedule,
      };
      ops.push({ coll: "loans", item });
      const old = existing.schedule;
      if (old?.fileId && old.fileId !== input.fileId) {
        // L'ancien tableau reste consultable, rattaché au même prêt.
        ops.push({ coll: "documents", item: { id: uid(), fileId: old.fileId, name: old.fileName ?? "Tableau d'amortissement", category: "tableau_amortissement", title: `Ancien tableau d'amortissement — ${existing.name || existing.bank || "Crédit"}`, date: old.importedAt, loanId: existing.id, buildingId: item.buildingId ?? null, companyId: item.companyId ?? null, addedAt: today(), source: "ia" } });
      }
      return { ops, removes: loose, placed: `Tableau du financement « ${existing.name || describeLoan(existing)} » · chiffres mis à jour`, loanId: existing.id };
    }
    const created: Loan = {
      id: uid(),
      name: newLoanName(fields, meta),
      bank: meta?.bank || undefined,
      reference: meta?.reference || undefined,
      buildingId: input.buildingId ?? null,
      companyId: input.companyId ?? null,
      ...fields,
      schedule,
    };
    return { ops: [{ coll: "loans", item: created }], removes: loose, placed: `Nouveau financement « ${created.name} » créé d'après le tableau`, loanId: created.id };
  }
  // Pièce déjà libre (reprise sans nouvel emplacement) : mise à jour, pas de doublon.
  const same = (data.documents ?? []).find((d) => d.fileId === input.fileId);
  const doc: AppDocument = {
    id: same?.id ?? uid(),
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
    addedAt: same?.addedAt ?? today(),
    source: "ia",
  };
  return { ops: [{ coll: "documents", item: doc }], removes: loose.filter((r) => r.id !== doc.id), placed: "Documents" };
}
