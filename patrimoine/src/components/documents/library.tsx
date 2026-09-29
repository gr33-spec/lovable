"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Pencil, Search, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AppDocument, DocCategory } from "@/lib/types";
import { DOC_CATEGORIES, DOC_SHORTCUTS, categoryLabel, documentIndex, documentsOf, searchKey, searchText, type DocEntry, type DocScope } from "@/lib/documents";
import { usePageState } from "@/lib/nav";
import { sortedUnits } from "@/lib/lots";
import { dateFr } from "@/lib/format";
import { openDocument } from "@/components/pdf-viewer";
import { SwipeRow, toast } from "@/components/swipe";
import { Button, Card, DateField, Page, PageHeader, SectionTitle, SelectField, Sheet, cx } from "@/components/ui";
import { DropZone, ImportQueue, PlacementEditor, useDocumentImport } from "./import";

// Centre documentaire : une seule bibliothèque pour toutes les pièces, où
// qu'elles soient rangées (bail du locataire, tableau du crédit, bilan de la
// société, pièces libres). Chaque pièce s'ouvre ou mène à son emplacement.

const ICON_TONE: Partial<Record<DocCategory, string>> = {
  bail: "bg-series-1/10 text-series-1",
  caution: "bg-series-1/10 text-series-1",
  tableau_amortissement: "bg-gold/15 text-gold",
  offre_pret: "bg-gold/15 text-gold",
  banque: "bg-gold/15 text-gold",
  assurance: "bg-pos/10 text-pos",
  facture: "bg-warn/10 text-warn",
  devis: "bg-warn/10 text-warn",
  diagnostic: "bg-neg/10 text-neg",
};

export function DocumentsLibrary() {
  const { data } = useStore();
  const params = useSearchParams();
  const [q, setQ] = usePageState("recherche", "");
  const [shortcut, setShortcut] = usePageState<string>("raccourci", params.get("type") ? "" : "tous");
  const [category, setCategory] = usePageState<string | undefined>("type", params.get("type") ?? undefined);
  const [companyId, setCompanyId] = usePageState<string | undefined>("societe", params.get("societe") ?? undefined);
  const [buildingId, setBuildingId] = usePageState<string | undefined>("immeuble", params.get("immeuble") ?? undefined);
  const [unitId, setUnitId] = usePageState<string | undefined>("lot", params.get("lot") ?? undefined);
  const [year, setYear] = usePageState<string | undefined>("annee", undefined);
  const [editing, setEditing] = useState<AppDocument | null>(null);
  const importer = useDocumentImport();

  const index = documentIndex(data);
  const needle = searchKey(q.trim());
  const sc = DOC_SHORTCUTS.find((s) => s.id === shortcut);
  const list = documentsOf(index, { companyId, buildingId, unitId, loanId: params.get("credit") ?? undefined }).filter(
    (e) => (!sc || sc.categories.includes(e.category)) && (!category || e.category === category) && (!year || (e.date ?? "").startsWith(year)) && (!needle || needle.split(/\s+/).every((w) => searchText(e, data).includes(w))),
  );
  const years = [...new Set(index.map((e) => (e.date ?? "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const buildings = data.buildings.filter((b) => !companyId || b.companyId === companyId);
  const units = buildingId ? sortedUnits(data.units.filter((u) => u.buildingId === buildingId)) : [];
  const filtered = !!(companyId || buildingId || unitId || category || year || needle || (sc && shortcut !== "tous"));

  return (
    <>
      <PageHeader title="Documents" back="/plus" subtitle={`${index.length} pièce${index.length > 1 ? "s" : ""} · toutes vos SCI`} />
      <Page>
        <div className="lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-x-6">
          <div className="min-w-0">
            <DropZone onFiles={importer.add} />
            <ImportQueue importer={importer} />
          </div>

          <div className="mt-6 min-w-0 lg:mt-0">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Immeuble, locataire, SCI, banque, contenu…"
                data-search
                className="w-full rounded-2xl border border-line bg-card py-3 pl-11 pr-4 text-[16px] outline-none focus:border-series-1"
              />
            </div>
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {[{ id: "tous", label: "Tous" }, ...DOC_SHORTCUTS].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShortcut(s.id);
                    setCategory(undefined);
                  }}
                  className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", shortcut === s.id && !category ? "bg-brand text-on-brand" : "bg-soft text-ink-2")}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <details className="mt-3 rounded-2xl bg-card px-4 py-2" open={!!(companyId || buildingId || category || year)}>
              <summary className="cursor-pointer py-1.5 text-[14px] font-semibold text-navy">Filtres{filtered ? " actifs" : ""}</summary>
              <div className="grid gap-3 pb-3 pt-1 sm:grid-cols-2">
                <SelectField label="SCI" value={companyId} options={data.companies.map((c) => ({ value: c.id, label: c.name }))} emptyLabel="Toutes" onChange={(v) => { setCompanyId(v); setBuildingId(undefined); setUnitId(undefined); }} />
                <SelectField label="Immeuble" value={buildingId} options={buildings.map((b) => ({ value: b.id, label: b.name }))} emptyLabel="Tous" onChange={(v) => { setBuildingId(v); setUnitId(undefined); }} />
                {units.length > 0 && <SelectField label="Lot" value={unitId} options={units.map((u) => ({ value: u.id, label: u.name }))} emptyLabel="Tous" onChange={setUnitId} />}
                <SelectField label="Type" value={category} options={DOC_CATEGORIES.map((c) => ({ value: c.value, label: c.plural }))} emptyLabel="Tous" onChange={(v) => { setCategory(v); if (v) setShortcut(""); else setShortcut("tous"); }} />
                <SelectField label="Année" value={year} options={years.map((y) => ({ value: y, label: y }))} emptyLabel="Toutes" onChange={setYear} />
              </div>
              {filtered && (
                <button type="button" onClick={() => { setQ(""); setShortcut("tous"); setCategory(undefined); setCompanyId(undefined); setBuildingId(undefined); setUnitId(undefined); setYear(undefined); }} className="pb-2 text-[13px] font-semibold text-series-1">
                  Tout effacer
                </button>
              )}
            </details>

            <SectionTitle action={<span className="text-sm font-semibold text-muted">{list.length}</span>}>{category ? categoryLabel(category as DocCategory) : sc?.label ?? "Tous les documents"}</SectionTitle>
            {list.length === 0 ? (
              <Card>
                <div className="py-6 text-center">
                  <FileText size={28} className="mx-auto text-muted" />
                  <div className="mt-2 text-[15px] font-semibold text-ink">{index.length ? "Aucun document ne correspond" : "Aucun document pour l'instant"}</div>
                  <p className="mt-1 text-[13px] text-muted">{index.length ? "Modifiez la recherche ou les filtres." : "Importez vos baux, tableaux, assurances, factures… : ils seront rangés au bon endroit."}</p>
                </div>
              </Card>
            ) : (
              <Card className="py-1">
                <div className="divide-y divide-line">
                  {list.map((e) => (
                    <DocRow key={e.key} entry={e} onEdit={setEditing} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </Page>
      <EditDocumentSheet doc={editing} onClose={() => setEditing(null)} />
    </>
  );
}

export function DocRow({ entry: e, onEdit, hidePlace }: { entry: DocEntry; onEdit?: (d: AppDocument) => void; hidePlace?: boolean }) {
  const { data, remove, upsert, role } = useStore();
  const doc = e.docId ? data.documents.find((d) => d.id === e.docId) : undefined;
  const del = () => {
    if (!doc) return;
    remove("documents", doc.id);
    let undone = false;
    toast("Document supprimé", () => {
      undone = true;
      upsert("documents", doc);
    });
    // Le fichier n'est effacé que s'il ne sert nulle part ailleurs, une fois l'annulation passée.
    setTimeout(() => {
      if (!undone && !documentIndex(data).some((x) => x.fileId === doc.fileId && x.docId !== doc.id)) void fetch(`/api/files/${doc.fileId}`, { method: "DELETE" }).catch(() => undefined);
    }, 7000);
  };
  const actions = doc && role === "owner" ? [...(onEdit ? [{ label: "Modifier", icon: <Pencil size={18} />, tone: "blue" as const, onAction: () => onEdit(doc) }] : []), { label: "Supprimer", icon: <Trash2 size={18} />, tone: "neg" as const, onAction: del }] : [];
  return (
    <SwipeRow actions={actions}>
      <div className="flex items-center gap-3 py-3">
        <button type="button" onClick={() => openDocument(`/api/files/${e.fileId}`, e.name)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60">
          <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", ICON_TONE[e.category] ?? "bg-soft text-brand")}>
            <FileText size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-ink">{e.title}</span>
            <span className="block truncate text-[12.5px] text-muted">{[categoryLabel(e.category), hidePlace ? undefined : e.place.label, e.date ? dateFr(e.date.slice(0, 10)) : undefined].filter(Boolean).join(" · ")}</span>
          </span>
        </button>
        {!hidePlace && e.place.href !== "/documents" && (
          <Link href={e.place.href} aria-label={`Aller à ${e.place.label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-ink-2">
            <ChevronRight size={17} />
          </Link>
        )}
      </div>
    </SwipeRow>
  );
}

function EditDocumentSheet({ doc, onClose }: { doc: AppDocument | null; onClose: () => void }) {
  const { upsert } = useStore();
  if (!doc) return null;
  const value = { category: doc.category, title: doc.title ?? "", date: doc.date ?? "", summary: doc.summary ?? "", companyId: doc.companyId ?? "", buildingId: doc.buildingId ?? "", unitId: doc.unitId ?? "", tenancyId: doc.tenancyId ?? "", loanId: doc.loanId ?? "" };
  return (
    <Sheet open onClose={onClose} title="Modifier le document" footer={<Button full onClick={onClose}>Terminé</Button>}>
      <div className="space-y-3 pb-2">
        <PlacementEditor
          value={value}
          onChange={(v) => upsert("documents", { ...doc, category: v.category, title: v.title || undefined, companyId: v.companyId || null, buildingId: v.buildingId || null, unitId: v.unitId || null, tenancyId: v.tenancyId || null, loanId: v.loanId || null })}
        />
        <DateField label="Date du document" value={doc.date} onChange={(v) => upsert("documents", { ...doc, date: v })} />
      </div>
    </Sheet>
  );
}

/** Carte « Documents » d'un élément : ses pièces (même bibliothèque) et l'ajout direct, déjà rattaché. */
export function DocumentsCard({ scope, href, title = "Documents", onlyLoose }: { scope: DocScope; href: string; title?: string; onlyLoose?: boolean }) {
  const { data, role } = useStore();
  const importer = useDocumentImport(scope);
  const [editing, setEditing] = useState<AppDocument | null>(null);
  if (role !== "owner") return null;
  // `onlyLoose` : l'écran montre déjà ses pièces dédiées (bail, tableau…), seules les autres sont listées ici.
  const list = documentsOf(documentIndex(data), scope).filter((e) => !onlyLoose || e.docId);
  return (
    <>
      <SectionTitle action={list.length > 4 ? <Link href={href} className="text-sm font-semibold text-series-1">Tout voir ({list.length})</Link> : undefined}>{title}</SectionTitle>
      <Card className="py-1">
        {list.length > 0 && (
          <div className="divide-y divide-line">
            {list.slice(0, 4).map((e) => (
              <DocRow key={e.key} entry={e} onEdit={setEditing} />
            ))}
          </div>
        )}
        {list.length === 0 && <p className="py-3 text-[13.5px] text-muted">Aucun document. Déposez-les ici : ils seront rattachés automatiquement.</p>}
        <div className="py-3">
          <DropZone compact onFiles={importer.add} label="Ajouter des documents" />
        </div>
        <ImportQueue importer={importer} lockedScope />
      </Card>
      <EditDocumentSheet doc={editing} onClose={() => setEditing(null)} />
    </>
  );
}
