"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Copy, FileUp, Landmark, LoaderCircle, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { applyOps } from "@/lib/ops";
import type { AppData, DocCategory, LoanScheduleRow, ScheduleMeta } from "@/lib/types";
import { DOC_CATEGORIES, categoryLabel, documentIndex, fileDocument, type DocScope, type FilingOp, type FilingRemove } from "@/lib/documents";
import { autoFileable, describeLoan, loanChanges, matchLoan, newLoanName, type LoanMatch } from "@/lib/loan-match";
import { monthLabel, parseMonth } from "@/lib/engine/dates";
import { sortedUnits } from "@/lib/lots";
import { tenantsName } from "@/lib/tenancy";
import { ACCEPTED_FILES, fileSha256, findStoredCopies, uploadFile } from "@/lib/upload";
import { openDocument } from "@/components/pdf-viewer";
import { toast } from "@/components/swipe";
import { Button, SelectField, TextField, cx } from "@/components/ui";

// Import de pièces, seul ou par lots : empreinte (déjà présent ?), envoi,
// lecture par l'IA, puis rangement. Rangé automatiquement quand la lecture
// est sûre ; sinon une confirmation claire « Bail — SCI › Immeuble › Lot 4 ».

type Placement = {
  category: DocCategory;
  title: string;
  date: string;
  summary: string;
  companyId: string;
  buildingId: string;
  unitId: string;
  tenancyId: string;
  loanId: string;
  /** Tableau d'amortissement : créer un nouveau financement (sinon `loanId`). */
  newLoan?: boolean;
};

export interface ImportItem {
  id: string;
  /** Nom du fichier. */
  name: string;
  /** Fichier choisi (absent pour une pièce déjà stockée que l'on range à nouveau). */
  file?: File;
  state: "hash" | "upload" | "read" | "confirm" | "saved" | "duplicate" | "error" | "ignored";
  progress: number;
  fileId?: string;
  placement?: Placement;
  reason?: string;
  sure?: boolean;
  scheduleRows?: LoanScheduleRow[];
  scheduleMeta?: ScheduleMeta;
  scheduleIssues?: string[];
  /** Rapprochement du tableau avec les financements (indices, écarts). */
  match?: LoanMatch;
  placed?: string;
  /** Financement concerné, pour y aller directement. */
  loanHref?: string;
  undo?: { restore: FilingOp[]; created: FilingOp[]; removed: FilingOp[] };
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

const hasTable = (item: ImportItem) => item.placement?.category === "tableau_amortissement" && (item.scheduleRows?.length ?? 0) >= 2;

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
    let target = placement;
    if (hasTable(item) && target.newLoan) {
      // Entre-temps (même lot de fichiers), le financement a peut-être été créé : on le reprend.
      const again = matchLoan(d, { rows: item.scheduleRows!, meta: item.scheduleMeta }, { companyId: target.companyId, buildingId: target.buildingId, forced: !!target.companyId }, nowMonth);
      if (again.identicalTo) {
        patch(item.id, { state: "duplicate", duplicateOf: `tableau déjà enregistré · ${placementPath(d, { ...target, loanId: again.identicalTo })}` });
        return;
      }
      if (again.sure && again.plan.kind === "existing") target = { ...target, newLoan: false, loanId: again.plan.loanId };
    }
    const { ops, removes, placed, loanId } = fileDocument(
      d,
      {
        fileId: item.fileId,
        name: item.name,
        category: target.category,
        title: target.title || undefined,
        date: target.date || undefined,
        summary: target.summary || undefined,
        companyId: target.companyId || undefined,
        buildingId: target.buildingId || undefined,
        unitId: target.unitId || undefined,
        tenancyId: target.tenancyId || undefined,
        loanId: target.loanId || undefined,
        scheduleRows: item.scheduleRows,
        scheduleMeta: item.scheduleMeta,
        loanPlan: hasTable(item) ? (target.newLoan || !target.loanId ? { kind: "new" } : { kind: "existing", loanId: target.loanId }) : undefined,
      },
      nowMonth,
    );
    // Pour annuler : état d'avant des éléments modifiés, éléments créés, pièces reprises.
    const find = (coll: FilingOp["coll"], id: string) => (d[coll] as { id: string }[]).find((x) => x.id === id);
    const restore = ops.map((o) => ({ coll: o.coll, item: find(o.coll, o.item.id) })).filter((o) => o.item) as FilingOp[];
    const created = ops.filter((o) => !find(o.coll, o.item.id));
    const removed = removes.map((r: FilingRemove) => ({ coll: r.coll, item: find(r.coll, r.id) })).filter((o) => o.item) as FilingOp[];
    upsertMany(ops);
    if (removes.length) removeMany(removes);
    // Visible aussitôt pour les fichiers suivants du même lot (deux baux pour un même locataire…).
    dataRef.current = applyOps(d, [
      ...ops.map((o) => ({ op: "upsert" as const, coll: o.coll, item: o.item as unknown as { id: string } & Record<string, unknown> })),
      ...removes.map((r) => ({ op: "delete" as const, coll: r.coll, id: r.id })),
    ]);
    const where = placementPath(dataRef.current, { ...target, loanId: loanId ?? target.loanId });
    patch(item.id, { state: "saved", placement: { ...target, loanId: loanId ?? target.loanId, newLoan: false }, placed: `${placed} · ${where}`, loanHref: loanId ? `/patrimoine/credit/${loanId}` : undefined, undo: { restore, created, removed } });
  };

  const undo = (item: ImportItem) => {
    // Tout revient comme avant : éléments modifiés restaurés, créés retirés, pièces reprises remises.
    const u = item.undo;
    if (u) {
      const back = [...u.restore, ...u.removed];
      if (back.length) upsertMany(back);
      if (u.created.length) removeMany(u.created.map((o) => ({ coll: o.coll, id: o.item.id })));
    }
    patch(item.id, { state: "confirm", placed: undefined, undo: undefined, loanHref: undefined, placement: item.placement && hasTable(item) && u?.created.some((o) => o.coll === "loans") ? { ...item.placement, loanId: "", newLoan: true } : item.placement });
  };

  const process = async (item: ImportItem) => {
    try {
      let fileId = item.fileId;
      if (!fileId && item.file) {
        // 1. Déjà présent ? (même contenu, où qu'il ait été déposé)
        const sha = await fileSha256(item.file);
        if (sha) {
          const copies = await findStoredCopies(sha);
          const index = documentIndex(dataRef.current);
          const used = copies.map((c) => index.find((e) => e.fileId === c.id)).find(Boolean);
          // Un tableau rangé sans financement est repris (même fichier, pas de nouvel envoi).
          if (used && !(used.docId && used.category === "tableau_amortissement" && !used.loanId)) {
            patch(item.id, { state: "duplicate", duplicateOf: `${used.title} · ${used.place.label}`, fileId: used.fileId });
            return;
          }
          // Stocké mais rangé nulle part (import interrompu) : on le réutilise, sans nouvel envoi.
          fileId = used?.fileId ?? copies[0]?.id;
        }
        if (!fileId) {
          patch(item.id, { state: "upload" });
          fileId = await uploadFile(item.file, (p) => patch(item.id, { progress: p }), sha);
        }
      }
      if (!fileId) throw new Error("Fichier introuvable.");
      patch(item.id, { state: "read", fileId });
      // 2. Lecture et proposition de rangement.
      const res = await fetch("/api/documents/classer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
      const j = await res.json().catch(() => ({}));
      const base = { ...empty(), title: item.name.replace(/\.[a-z0-9]+$/i, ""), ...scopeDefaults(defaults) };
      if (!res.ok) {
        patch(item.id, { state: "confirm", placement: base, reason: j.error ?? "Lecture impossible : choisissez le rangement.", sure: false });
        return;
      }
      const s = j.suggestion;
      let placement: Placement = defaults
        ? { ...base, category: s.category, title: s.title || base.title, date: s.date, summary: s.summary }
        : { category: s.category, title: s.title || base.title, date: s.date, summary: s.summary, companyId: s.companyId, buildingId: s.buildingId, unitId: s.unitId, tenancyId: s.tenancyId, loanId: s.loanId };
      let sure: boolean;
      let match: LoanMatch | undefined;
      let reason: string = s.reason;
      if (placement.category === "tableau_amortissement" && j.schedule?.rows?.length >= 2) {
        // Le tableau désigne lui-même son financement : on croise ses chiffres avec les fiches.
        const d = dataRef.current;
        const facts = { rows: j.schedule.rows as LoanScheduleRow[], meta: j.schedule.meta as ScheduleMeta | undefined };
        const forced = !!defaults && !!(defaults.companyId || defaults.buildingId || defaults.loanId);
        const scopeLoan = defaults?.loanId ? d.loans.find((l) => l.id === defaults.loanId) : undefined;
        match = matchLoan(
          d,
          facts,
          forced
            ? { companyId: scopeCompany(d, defaults!, scopeLoan?.id), buildingId: defaults!.buildingId ?? scopeLoan?.buildingId ?? undefined, forced: true }
            : { companyId: s.companyId || undefined, buildingId: s.buildingId || undefined, loanId: s.loanId || undefined },
          nowMonth,
        );
        if (match.identicalTo && !scopeLoan) {
          patch(item.id, { state: "duplicate", duplicateOf: `tableau déjà enregistré · ${placementPath(d, { ...empty(), loanId: match.identicalTo, companyId: match.companyId ?? "", buildingId: match.buildingId ?? "" })}`, fileId });
          return;
        }
        const loanId = scopeLoan ? scopeLoan.id : match.plan.kind === "existing" ? match.plan.loanId : "";
        placement = { ...placement, companyId: match.companyId ?? placement.companyId, buildingId: match.buildingId ?? placement.buildingId, unitId: "", tenancyId: "", loanId, newLoan: !loanId };
        if (scopeLoan) match = { ...match, plan: { kind: "existing", loanId: scopeLoan.id }, sure: true, changes: loanChanges(scopeLoan, match.fields, facts.meta, facts.rows) };
        sure = s.categoryConfidence !== "faible" && autoFileable(match, d);
        reason = match.plan.kind === "existing" ? (match.candidates.find((c) => c.loanId === loanId)?.agree.join(", ") || s.reason) : s.reason;
      } else {
        const needsTarget = placement.category === "bail" || placement.category === "caution" || placement.category === "courrier" ? !!placement.tenancyId : !!(placement.buildingId || placement.companyId);
        sure = s.categoryConfidence === "haute" && (defaults ? true : s.placementConfidence === "haute") && needsTarget && placement.category !== "tableau_amortissement";
        if (placement.category === "tableau_amortissement") reason = j.scheduleError ? `Échéances illisibles (${j.scheduleError}) : le document sera rangé comme pièce.` : s.reason;
      }
      const next: ImportItem = { ...item, fileId, placement, reason, sure, match, scheduleRows: j.schedule?.rows, scheduleMeta: j.schedule?.meta, scheduleIssues: j.schedule?.issues, state: "confirm" };
      patch(item.id, next);
      // 3. Sûr : rangé tout de suite (annulable) ; sinon on attend la confirmation.
      if (sure) save(next, placement);
    } catch (e) {
      patch(item.id, { state: "error", error: (e as Error).message });
    }
  };

  const run = (fresh: ImportItem[]) => {
    setItems((cur) => [...fresh, ...cur]);
    // Deux à la fois : rapide sans saturer la connexion du téléphone.
    const queue = [...fresh];
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) await process(it);
    };
    void Promise.all([worker(), worker()]);
  };

  /** Pièces déjà stockées à ranger de nouveau (tableaux restés sans financement). */
  const addStored = (list: { fileId: string; name: string }[]) => {
    if (role !== "owner") return;
    run(list.map((x) => ({ id: uid(), name: x.name, fileId: x.fileId, state: "read" as const, progress: 100 })));
  };

  const add = (files: FileList | File[]) => {
    if (role !== "owner") return;
    const accepted = [...files].filter((f) => ACCEPTED_FILES.split(",").includes(f.type || "application/pdf"));
    const fresh: ImportItem[] = accepted.map((file) => ({ id: uid(), name: file.name, file, state: "hash", progress: 0 }));
    if (fresh.length < files.length) toast(`${files.length - fresh.length} fichier(s) ignoré(s) : PDF, JPEG ou PNG uniquement`);
    run(fresh);
  };

  const ignore = (item: ImportItem) => {
    // Un fichier envoyé pour cet import et rangé nulle part est retiré ; une pièce déjà présente reste.
    if (item.fileId && item.file && item.state !== "duplicate" && !documentIndex(dataRef.current).some((e) => e.fileId === item.fileId)) void fetch(`/api/files/${item.fileId}`, { method: "DELETE" }).catch(() => undefined);
    patch(item.id, { state: "ignored" });
  };

  const clearDone = () => setItems((cur) => cur.filter((x) => !["saved", "duplicate", "ignored"].includes(x.state)));

  /** Correction du rattachement : pour un tableau, le rapprochement est refait avec la société choisie. */
  const update = (id: string, p: Placement) => {
    const item = items.find((x) => x.id === id);
    if (item && hasTable({ ...item, placement: p }) && item.match && p.companyId !== item.placement?.companyId) {
      const m = matchLoan(dataRef.current, { rows: item.scheduleRows!, meta: item.scheduleMeta }, { companyId: p.companyId || undefined, buildingId: p.buildingId || undefined, forced: true }, nowMonth);
      const loanId = m.plan.kind === "existing" ? m.plan.loanId : "";
      patch(id, { match: m, placement: { ...p, buildingId: p.buildingId || m.buildingId || "", loanId, newLoan: !loanId } });
      return;
    }
    patch(id, { placement: p });
  };

  return { items, add, addStored, save, undo, ignore, clearDone, update };
}

/** Société d'un emplacement (fiche société, immeuble ou crédit). */
function scopeCompany(d: AppData, s: DocScope, loanId?: string): string | undefined {
  if (s.companyId) return s.companyId;
  const loan = loanId ? d.loans.find((l) => l.id === loanId) : undefined;
  const buildingId = s.buildingId ?? loan?.buildingId ?? undefined;
  return (buildingId ? d.buildings.find((b) => b.id === buildingId)?.companyId : undefined) ?? loan?.companyId ?? undefined;
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
            <button type="button" onClick={() => pending.forEach((x) => x.placement && !(hasTable(x) && x.placement.newLoan && !x.placement.companyId && !x.placement.buildingId) && importer.save(x, x.placement))} className="text-[13px] font-semibold text-series-1">
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
  // Un nouveau financement a besoin de sa société (ou de son immeuble).
  const blocked = !!p && hasTable(item) && !!p.newLoan && !p.companyId && !p.buildingId;
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
          <div className="truncate text-[14.5px] font-semibold text-ink">{p?.title || item.name}</div>
          {status && <div className={cx("text-[12.5px]", item.state === "error" ? "text-neg" : "text-muted")}>{status}</div>}
        </div>
        {item.state === "saved" && item.loanHref && (
          <Link href={item.loanHref} className="flex shrink-0 items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
            <Landmark size={12} /> Voir
          </Link>
        )}
        {item.state === "saved" && (
          <button type="button" onClick={() => importer.undo(item)} className="flex shrink-0 items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
            <RotateCcw size={12} /> Modifier
          </button>
        )}
        {item.fileId && item.state !== "saved" && !busy && (
          <button type="button" onClick={() => openDocument(`/api/files/${item.fileId}`, item.name)} className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
            Voir
          </button>
        )}
      </div>

      {item.state === "confirm" && p && (
        <div className="mt-3">
          {hasTable(item) ? (
            <TableProposal item={item} placement={p} />
          ) : (
            <div className="rounded-2xl bg-soft px-3 py-2.5 text-[13.5px] text-ink">
              Ce document semble être {article(p.category)} <b>{categoryLabel(p.category).toLowerCase()}</b> concernant :
              <div className="mt-0.5 font-semibold text-navy">{placementPath(data, p)}</div>
              {item.reason && <div className="mt-1 text-[12px] text-muted">{item.reason}</div>}
            </div>
          )}
          {editing && (hasTable(item) ? <LoanChooser item={item} value={p} lockedScope={lockedScope} onChange={(v) => importer.update(item.id, v)} /> : <PlacementEditor value={p} lockedScope={lockedScope} onChange={(v) => importer.update(item.id, v)} />)}
          {blocked && !editing && <p className="mt-2 text-[12.5px] text-warn">Emprunteur non reconnu : choisissez la société avec « Corriger ».</p>}
          <div className="mt-2.5 flex gap-2">
            <Button full disabled={blocked} onClick={() => importer.save(item, p)} icon={<Check size={17} />}>
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

const monthFr = (d?: string) => {
  const m = parseMonth(d);
  return m === undefined ? undefined : monthLabel(m);
};
const eurFr = (v?: number) => (v === undefined ? undefined : `${Math.round(v).toLocaleString("fr-FR")} €`);

/**
 * Proposition pour un tableau d'amortissement, formulée d'après le document :
 * société, immeuble, banque, départ, montant — puis le financement retenu
 * (existant, avec les indices concordants, ou nouveau) et ce qui changera
 * sur sa fiche.
 */
function TableProposal({ item, placement: p }: { item: ImportItem; placement: Placement }) {
  const { data } = useStore();
  const m = item.match;
  const f = m?.fields ?? {};
  const meta = item.scheduleMeta;
  const company = data.companies.find((c) => c.id === p.companyId);
  const building = data.buildings.find((b) => b.id === p.buildingId);
  const loan = !p.newLoan ? data.loans.find((l) => l.id === p.loanId) : undefined;
  const changes = loan ? loanChanges(loan, f, meta, item.scheduleRows) : [];
  const conflicts = changes.filter((c) => c.conflict);
  const candidate = loan ? m?.candidates.find((c) => c.loanId === loan.id) : undefined;
  const line = (label: string, value?: string) =>
    value ? (
      <div className="flex gap-2">
        <span className="w-[92px] shrink-0 text-muted">{label}</span>
        <span className="min-w-0 font-semibold text-ink">{value}</span>
      </div>
    ) : null;
  return (
    <div className="rounded-2xl bg-soft px-3 py-2.5 text-[13.5px] text-ink">
      <div>Ce tableau d&apos;amortissement semble correspondre à :</div>
      <div className="mt-1.5 space-y-0.5">
        <div className="text-[15px] font-bold text-navy">{company?.name ?? (meta?.borrower ? `${meta.borrower} (société à choisir)` : "Société à choisir")}</div>
        {line("Immeuble", building?.name ?? (meta?.address ? `${meta.address} (non reconnu)` : undefined))}
        {line("Banque", [meta?.bank ?? f.bank, meta?.reference ? `réf. ${meta.reference}` : undefined].filter(Boolean).join(" · ") || undefined)}
        {line("Départ", monthFr(f.startDate))}
        {line("Montant", eurFr(f.initialAmount))}
        {line("Durée", f.durationMonths ? `${f.durationMonths} mois${f.ratePct ? ` · ${f.ratePct.toLocaleString("fr-FR")} %` : ""}` : undefined)}
        {line("Échéance", f.monthlyPayment ? `${f.monthlyPayment.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € hors assurance` : undefined)}
      </div>
      <div className="mt-2 rounded-xl bg-card px-3 py-2">
        {loan ? (
          <>
            <div className="font-semibold text-ink">
              → Financement existant « {loan.name || describeLoan(loan)} »
            </div>
            {candidate && candidate.agree.length > 0 && <div className="text-[12px] text-muted">Reconnu par : {candidate.agree.join(", ")}</div>}
            {loan.schedule && <div className="text-[12px] text-warn">Il a déjà un tableau : il sera remplacé par celui-ci (l&apos;ancien reste consultable dans ses documents).</div>}
          </>
        ) : (
          <>
            <div className="font-semibold text-ink">→ Nouveau financement « {newLoanName(f, meta)} »</div>
            <div className="text-[12px] text-muted">{m && m.candidates.length ? "Aucun prêt existant ne correspond à ces chiffres." : "Aucun prêt n'est encore enregistré pour cette société."}</div>
          </>
        )}
      </div>
      {changes.length > 0 && (
        <div className="mt-2">
          <div className="text-[12px] font-semibold text-ink-2">{conflicts.length ? "Ce qui va changer sur la fiche du prêt :" : "Informations ajoutées à la fiche :"}</div>
          {changes.map((c) => (
            <div key={c.key + c.label} className={cx("text-[12.5px]", c.conflict ? "text-warn" : "text-ink-2")}>
              {c.label} : {c.before ? <span className="line-through opacity-70">{c.before}</span> : null}
              {c.before ? " → " : ""}
              <b>{c.after}</b>
            </div>
          ))}
        </div>
      )}
      {item.scheduleIssues && item.scheduleIssues.length > 0 && <div className="mt-1.5 text-[12px] text-warn">Tableau à vérifier : {item.scheduleIssues.join(" ")}</div>}
    </div>
  );
}

/** Correction pour un tableau : société, immeuble et financement (décrit par ses chiffres, pas par son nom). */
function LoanChooser({ item, value, onChange, lockedScope }: { item: ImportItem; value: Placement; onChange: (v: Placement) => void; lockedScope?: boolean }) {
  const { data } = useStore();
  const set = (p: Partial<Placement>) => onChange({ ...value, ...p });
  const buildings = data.buildings.filter((b) => !value.companyId || b.companyId === value.companyId);
  const companyOfLoan = (l: (typeof data.loans)[number]) => (l.buildingId ? data.buildings.find((b) => b.id === l.buildingId)?.companyId : undefined) ?? l.companyId;
  const loans = data.loans
    .filter((l) => !value.companyId || companyOfLoan(l) === value.companyId || (!l.companyId && !l.buildingId))
    .sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  const score = (id: string) => item.match?.candidates.find((c) => c.loanId === id);
  const option = (key: string, active: boolean, onClick: () => void, title: string, sub?: string, icon?: React.ReactNode) => (
    <button key={key} type="button" onClick={onClick} className={cx("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1", active ? "bg-brand/10 ring-brand" : "bg-card ring-line")}>
      <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", active ? "bg-brand text-on-brand" : "bg-soft text-brand")}>{icon ?? <Landmark size={15} />}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
    </button>
  );
  return (
    <div className="mt-3 space-y-3">
      {!lockedScope && (
        <>
          <SelectField label="Société (emprunteur)" value={value.companyId || undefined} options={data.companies.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set({ companyId: v ?? "", buildingId: "", loanId: "", newLoan: true })} />
          <SelectField label="Immeuble financé (facultatif)" value={value.buildingId || undefined} options={buildings.map((b) => ({ value: b.id, label: b.name }))} onChange={(v) => set({ buildingId: v ?? "" })} />
        </>
      )}
      <div>
        <div className="mb-1.5 text-[13px] font-medium text-ink-2">Financement</div>
        <div className="space-y-1.5">
          {loans.map((l) => {
            const c = score(l.id);
            // Décrit par ses chiffres ; le nom seulement quand la fiche n'en a pas encore.
            const known = !!(l.bank || l.startDate || l.initialAmount);
            const remaining = l.remaining !== undefined ? `reste ${Math.round(l.remaining).toLocaleString("fr-FR")} €` : undefined;
            return option(
              l.id,
              !value.newLoan && value.loanId === l.id,
              () => set({ loanId: l.id, newLoan: false }),
              known ? describeLoan(l) : [l.name || "Financement", remaining].filter(Boolean).join(" · "),
              [known ? l.name : undefined, l.schedule ? "tableau déjà enregistré" : undefined, c?.agree.length ? `concorde : ${c.agree.join(", ")}` : undefined, c?.disagree.length ? `diffère : ${c.disagree.join(", ")}` : undefined].filter(Boolean).join(" · "),
            );
          })}
          {option("new", !!value.newLoan, () => set({ loanId: "", newLoan: true }), "Nouveau financement", "Créé d'après le tableau : montant, dates, taux, échéances", <Plus size={15} />)}
        </div>
      </div>
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
