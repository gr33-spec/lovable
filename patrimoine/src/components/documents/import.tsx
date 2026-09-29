"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Copy, FileUp, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { applyOps } from "@/lib/ops";
import type { AppData, DocCategory, LoanScheduleRow } from "@/lib/types";
import { DOC_CATEGORIES, categoryLabel, documentIndex, fileDocument, type DocScope, type FilingOp } from "@/lib/documents";
import { sortedUnits } from "@/lib/lots";
import { tenantsName } from "@/lib/tenancy";
import { ACCEPTED_FILES, fileSha256, findStoredCopies, uploadFile } from "@/lib/upload";
import { openDocument } from "@/components/pdf-viewer";
import { toast } from "@/components/swipe";
import { Button, SelectField, TextField, cx } from "@/components/ui";

// Import de pièces, seul ou par lots : empreinte (déjà présent ?), envoi,
// lecture par l'IA, puis rangement. Rangé automatiquement quand la lecture
// est sûre ; sinon une confirmation claire « Bail — SCI › Immeuble › Lot 4 ».

type Placement = { category: DocCategory; title: string; date: string; summary: string; companyId: string; buildingId: string; unitId: string; tenancyId: string; loanId: string };

export interface ImportItem {
  id: string;
  file: File;
  state: "hash" | "upload" | "read" | "confirm" | "saved" | "duplicate" | "error" | "ignored";
  progress: number;
  fileId?: string;
  placement?: Placement;
  reason?: string;
  sure?: boolean;
  scheduleRows?: LoanScheduleRow[];
  scheduleIssues?: string[];
  placed?: string;
  undo?: FilingOp[];
  duplicateOf?: string;
  error?: string;
}

const empty = (): Placement => ({ category: "autre", title: "", date: "", summary: "", companyId: "", buildingId: "", unitId: "", tenancyId: "", loanId: "" });
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Chemin lisible d'un rattachement : « SCI › Immeuble › Lot 4 › Locataire ». */
export function placementPath(data: AppData, p: Pick<Placement, "companyId" | "buildingId" | "unitId" | "tenancyId" | "loanId">): string {
  const c = data.companies.find((x) => x.id === p.companyId);
  const b = data.buildings.find((x) => x.id === p.buildingId);
  const u = data.units.find((x) => x.id === p.unitId);
  const t = data.tenancies.find((x) => x.id === p.tenancyId);
  const l = data.loans.find((x) => x.id === p.loanId);
  return [c?.name, b?.name, u?.name, t ? tenantsName(t) : undefined, l ? l.name || l.bank || "Prêt" : undefined].filter(Boolean).join(" › ") || "Non rattaché";
}

export function useDocumentImport(defaults?: DocScope) {
  const { data, upsertMany, removeMany, nowMonth, role } = useStore();
  const [items, setItems] = useState<ImportItem[]>([]);
  // Données les plus récentes pour les traitements en cours (plusieurs fichiers à la suite).
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const patch = (id: string, p: Partial<ImportItem>) => setItems((cur) => cur.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = (item: ImportItem, placement: Placement) => {
    if (!item.fileId) return;
    const d = dataRef.current;
    const { ops, placed } = fileDocument(
      d,
      {
        fileId: item.fileId,
        name: item.file.name,
        category: placement.category,
        title: placement.title || undefined,
        date: placement.date || undefined,
        summary: placement.summary || undefined,
        companyId: placement.companyId || undefined,
        buildingId: placement.buildingId || undefined,
        unitId: placement.unitId || undefined,
        tenancyId: placement.tenancyId || undefined,
        loanId: placement.loanId || undefined,
        scheduleRows: item.scheduleRows,
      },
      nowMonth,
    );
    // Pour annuler : l'état d'avant de chaque élément modifié (une pièce libre est simplement retirée).
    const before = ops
      .map((o) => (o.coll === "documents" ? null : { coll: o.coll, item: (d[o.coll] as { id: string }[]).find((x) => x.id === o.item.id) }))
      .filter(Boolean) as FilingOp[];
    upsertMany(ops);
    // Visible aussitôt pour les fichiers suivants du même lot (deux baux pour un même locataire…).
    dataRef.current = applyOps(d, ops.map((o) => ({ op: "upsert" as const, coll: o.coll, item: o.item as unknown as { id: string } & Record<string, unknown> })));
    patch(item.id, { state: "saved", placement, placed: `${placed} · ${placementPath(d, placement)}`, undo: [...before, ...ops.filter((o) => o.coll === "documents")] });
  };

  const undo = (item: ImportItem) => {
    // Élément remis dans son état d'avant ; une pièce libre créée est retirée (le fichier reste, pour un nouveau rangement).
    const restore = (item.undo ?? []).filter((o) => o.coll !== "documents");
    const docs = (item.undo ?? []).filter((o) => o.coll === "documents");
    if (restore.length) upsertMany(restore);
    if (docs.length) removeMany(docs.map((d) => ({ coll: "documents" as const, id: d.item.id })));
    patch(item.id, { state: "confirm", placed: undefined, undo: undefined });
  };

  const process = async (item: ImportItem) => {
    try {
      // 1. Déjà présent ? (même contenu, où qu'il ait été déposé)
      const sha = await fileSha256(item.file);
      let fileId: string | undefined;
      if (sha) {
        const copies = await findStoredCopies(sha);
        const index = documentIndex(dataRef.current);
        const used = copies.map((c) => index.find((e) => e.fileId === c.id)).find(Boolean);
        if (used) {
          patch(item.id, { state: "duplicate", duplicateOf: `${used.title} · ${used.place.label}`, fileId: used.fileId });
          return;
        }
        // Stocké mais rangé nulle part (import interrompu) : on le réutilise, sans nouvel envoi.
        fileId = copies[0]?.id;
      }
      if (!fileId) {
        patch(item.id, { state: "upload" });
        fileId = await uploadFile(item.file, (p) => patch(item.id, { progress: p }), sha);
      }
      patch(item.id, { state: "read", fileId });
      // 2. Lecture et proposition de rangement.
      const res = await fetch("/api/documents/classer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
      const j = await res.json().catch(() => ({}));
      const base = { ...empty(), title: item.file.name.replace(/\.[a-z0-9]+$/i, ""), ...scopeDefaults(defaults) };
      if (!res.ok) {
        patch(item.id, { state: "confirm", placement: base, reason: j.error ?? "Lecture impossible : choisissez le rangement.", sure: false });
        return;
      }
      const s = j.suggestion;
      const placement: Placement = defaults
        ? { ...base, category: s.category, title: s.title || base.title, date: s.date, summary: s.summary }
        : { category: s.category, title: s.title || base.title, date: s.date, summary: s.summary, companyId: s.companyId, buildingId: s.buildingId, unitId: s.unitId, tenancyId: s.tenancyId, loanId: s.loanId };
      const needsTarget = placement.category === "bail" || placement.category === "caution" || placement.category === "courrier" ? !!placement.tenancyId : placement.category === "tableau_amortissement" ? !!placement.loanId : !!(placement.buildingId || placement.companyId);
      const sure = s.categoryConfidence === "haute" && (defaults ? true : s.placementConfidence === "haute") && needsTarget && !(j.schedule?.issues?.length);
      const next: ImportItem = { ...item, fileId, placement, reason: s.reason, sure, scheduleRows: j.schedule?.rows, scheduleIssues: j.schedule?.issues, state: "confirm" };
      patch(item.id, next);
      // 3. Sûr : rangé tout de suite (annulable) ; sinon on attend la confirmation.
      if (sure) save(next, placement);
    } catch (e) {
      patch(item.id, { state: "error", error: (e as Error).message });
    }
  };

  const add = (files: FileList | File[]) => {
    if (role !== "owner") return;
    const accepted = [...files].filter((f) => ACCEPTED_FILES.split(",").includes(f.type || "application/pdf"));
    const fresh: ImportItem[] = accepted.map((file) => ({ id: uid(), file, state: "hash", progress: 0 }));
    if (fresh.length < files.length) toast(`${files.length - fresh.length} fichier(s) ignoré(s) : PDF, JPEG ou PNG uniquement`);
    setItems((cur) => [...fresh, ...cur]);
    // Deux à la fois : rapide sans saturer la connexion du téléphone.
    const queue = [...fresh];
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) await process(it);
    };
    void Promise.all([worker(), worker()]);
  };

  const ignore = (item: ImportItem) => {
    if (item.fileId && item.state !== "duplicate") void fetch(`/api/files/${item.fileId}`, { method: "DELETE" }).catch(() => undefined);
    patch(item.id, { state: "ignored" });
  };

  const clearDone = () => setItems((cur) => cur.filter((x) => !["saved", "duplicate", "ignored"].includes(x.state)));

  return { items, add, save, undo, ignore, clearDone, update: (id: string, p: Placement) => patch(id, { placement: p }) };
}

function scopeDefaults(s?: DocScope): Partial<Placement> {
  if (!s) return {};
  return { companyId: s.companyId ?? "", buildingId: s.buildingId ?? "", unitId: s.unitId ?? "", tenancyId: s.tenancyId ?? "", loanId: s.loanId ?? "" };
}

// ——— Zone de dépôt ———

export function DropZone({ onFiles, compact, label }: { onFiles: (f: FileList) => void; compact?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cx(compact ? "" : "rounded-[24px] border-2 border-dashed p-5 text-center transition", !compact && (over ? "border-series-1 bg-series-1/5" : "border-line bg-card"))}
    >
      {!compact && (
        <>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold">
            <FileUp size={22} />
          </span>
          <div className="mt-2 text-[16px] font-bold text-navy">Importer des documents</div>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
            Plusieurs PDF ou photos d&apos;un coup, même pour des immeubles différents. L&apos;IA les lit et les range ; elle vous demande de confirmer seulement quand elle hésite.
          </p>
          <p className="mt-1 hidden text-[12.5px] text-muted [@media(hover:hover)]:block">Glissez-déposez vos fichiers ici, ou</p>
        </>
      )}
      <div className={compact ? "" : "mt-3"}>
        <Button full={compact} onClick={() => input.current?.click()} icon={<FileUp size={18} />}>
          {label ?? "Choisir des fichiers"}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ——— File d'import ———

export function ImportQueue({ importer, lockedScope }: { importer: ReturnType<typeof useDocumentImport>; lockedScope?: boolean }) {
  const { items } = importer;
  const pending = items.filter((x) => x.state === "confirm");
  const done = items.filter((x) => ["saved", "duplicate", "ignored"].includes(x.state)).length;
  if (!items.length) return null;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-[14px] font-semibold text-ink">
          {items.length} fichier{items.length > 1 ? "s" : ""} · {pending.length ? `${pending.length} à confirmer` : "rien à confirmer"}
        </div>
        <div className="flex gap-3">
          {pending.length > 1 && (
            <button type="button" onClick={() => pending.forEach((x) => x.placement && importer.save(x, x.placement))} className="text-[13px] font-semibold text-series-1">
              Tout confirmer
            </button>
          )}
          {done > 0 && (
            <button type="button" onClick={importer.clearDone} className="text-[13px] font-semibold text-muted">
              Effacer la liste
            </button>
          )}
        </div>
      </div>
      {items.map((it) => (
        <ImportRow key={it.id} item={it} importer={importer} lockedScope={lockedScope} />
      ))}
    </div>
  );
}

function ImportRow({ item, importer, lockedScope }: { item: ImportItem; importer: ReturnType<typeof useDocumentImport>; lockedScope?: boolean }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const p = item.placement;
  const busy = item.state === "hash" || item.state === "upload" || item.state === "read";
  const status =
    item.state === "hash"
      ? "Vérification…"
      : item.state === "upload"
        ? `Envoi… ${item.progress} %`
        : item.state === "read"
          ? "Lecture du document…"
          : item.state === "duplicate"
            ? `Déjà présent : ${item.duplicateOf}`
            : item.state === "ignored"
              ? "Ignoré"
              : item.state === "error"
                ? item.error
                : item.state === "saved"
                  ? `Rangé : ${item.placed}`
                  : undefined;
  return (
    <div className={cx("rounded-[20px] bg-card p-3.5 ring-1", item.state === "confirm" ? "ring-warn/40" : "ring-line")}>
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            item.state === "saved" ? "bg-pos/10 text-pos" : item.state === "duplicate" ? "bg-series-1/10 text-series-1" : item.state === "confirm" ? "bg-warn/10 text-warn" : item.state === "error" ? "bg-neg/10 text-neg" : "bg-soft text-muted",
          )}
        >
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : item.state === "saved" ? <Check size={17} /> : item.state === "duplicate" ? <Copy size={16} /> : item.state === "confirm" ? <Sparkles size={16} /> : item.state === "error" ? <CircleAlert size={16} /> : <X size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-ink">{p?.title || item.file.name}</div>
          {status && <div className={cx("text-[12.5px]", item.state === "error" ? "text-neg" : "text-muted")}>{status}</div>}
        </div>
        {item.state === "saved" && (
          <button type="button" onClick={() => importer.undo(item)} className="flex shrink-0 items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
            <RotateCcw size={12} /> Modifier
          </button>
        )}
        {item.fileId && item.state !== "saved" && !busy && (
          <button type="button" onClick={() => openDocument(`/api/files/${item.fileId}`, item.file.name)} className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
            Voir
          </button>
        )}
      </div>

      {item.state === "confirm" && p && (
        <div className="mt-3">
          <div className="rounded-2xl bg-soft px-3 py-2.5 text-[13.5px] text-ink">
            Ce document semble être {article(p.category)} <b>{categoryLabel(p.category).toLowerCase()}</b> concernant :
            <div className="mt-0.5 font-semibold text-navy">{placementPath(data, p)}</div>
            {item.reason && <div className="mt-1 text-[12px] text-muted">{item.reason}</div>}
            {item.scheduleIssues && item.scheduleIssues.length > 0 && <div className="mt-1 text-[12px] text-warn">Tableau à vérifier : {item.scheduleIssues[0]}</div>}
          </div>
          {editing && <PlacementEditor value={p} lockedScope={lockedScope} onChange={(v) => importer.update(item.id, v)} />}
          <div className="mt-2.5 flex gap-2">
            <Button full onClick={() => importer.save(item, p)} icon={<Check size={17} />}>
              Confirmer
            </Button>
            {!editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Corriger
              </Button>
            )}
            <Button variant="ghost" onClick={() => importer.ignore(item)}>
              Ignorer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const article = (c: DocCategory) => (["assurance", "facture", "caution", "offre_pret"].includes(c) ? "une" : c === "etat_des_lieux" || c === "acte" ? "un" : "un");

/** Choix du type et du rattachement, en cascade (société → immeuble → lot → locataire ; prêt). */
export function PlacementEditor({ value, onChange, lockedScope }: { value: Placement; onChange: (v: Placement) => void; lockedScope?: boolean }) {
  const { data } = useStore();
  const set = (p: Partial<Placement>) => onChange({ ...value, ...p });
  const buildings = data.buildings.filter((b) => !value.companyId || b.companyId === value.companyId);
  const units = value.buildingId ? sortedUnits(data.units.filter((u) => u.buildingId === value.buildingId)) : [];
  const tenancies = value.unitId ? data.tenancies.filter((t) => t.unitId === value.unitId && t.status !== "brouillon") : [];
  const loans = data.loans.filter((l) => (!value.buildingId || l.buildingId === value.buildingId) && (!value.companyId || l.companyId === value.companyId || data.buildings.find((b) => b.id === l.buildingId)?.companyId === value.companyId));
  return (
    <div className="mt-3 space-y-3">
      <SelectField label="Type de document" value={value.category} allowEmpty={false} options={DOC_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} onChange={(v) => v && set({ category: v })} />
      <TextField label="Titre" value={value.title} onChange={(v) => set({ title: v ?? "" })} />
      {!lockedScope && (
        <>
          <SelectField label="Société" value={value.companyId || undefined} options={data.companies.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set({ companyId: v ?? "", buildingId: "", unitId: "", tenancyId: "", loanId: "" })} />
          <SelectField label="Immeuble" value={value.buildingId || undefined} options={buildings.map((b) => ({ value: b.id, label: b.name }))} onChange={(v) => set({ buildingId: v ?? "", companyId: data.buildings.find((b) => b.id === v)?.companyId ?? value.companyId, unitId: "", tenancyId: "", loanId: "" })} />
          {units.length > 0 && <SelectField label="Lot (facultatif)" value={value.unitId || undefined} options={units.map((u) => ({ value: u.id, label: u.name }))} onChange={(v) => set({ unitId: v ?? "", tenancyId: "" })} />}
          {tenancies.length > 0 && <SelectField label="Locataire" value={value.tenancyId || undefined} options={tenancies.map((t) => ({ value: t.id, label: `${tenantsName(t) || "Locataire"}${t.status === "clos" ? " (ancien)" : ""}` }))} onChange={(v) => set({ tenancyId: v ?? "" })} />}
          {loans.length > 0 && <SelectField label="Prêt (facultatif)" value={value.loanId || undefined} options={loans.map((l) => ({ value: l.id, label: l.name || l.bank || "Prêt" }))} onChange={(v) => set({ loanId: v ?? "" })} />}
        </>
      )}
    </div>
  );
}
