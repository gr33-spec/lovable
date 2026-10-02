"use client";

import { Check, CircleCheck, HelpCircle, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { ProjectPriceRequests } from "@/components/project-price-requests";
import { DecisionCard, MeasuresNote, ReadyList, TrustHeader, type DecisionHandlers } from "@/components/takeoff-view";
import { useProgressRefresh } from "@/components/project-progress";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type ProjectDocument, type Takeoff, type TakeoffLine } from "@/lib/api";
import { shortName } from "@/lib/labels";
import { useResource } from "@/lib/use-resource";

/** Le devis client peut être lu par l'IA : texte lu, ou lecture locale en panne (l'IA lit alors le PDF). */
export function canPrepareTakeoff(doc: ProjectDocument): boolean {
  return doc.status === "read" || doc.reading?.errorCode === "read_failed";
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/**
 * Liste de matériaux tirée du devis client. L'artisan ne voit que les
 * DÉCISIONS utiles (une réponse règle toutes les lignes concernées) ; ce qui
 * est prêt reste replié, la preuve derrière « Voir le calcul ». Le détail
 * complet reste à un appui (« Voir toute la liste »).
 */
export function ProjectTakeoff({
  projectId,
  clientQuote,
  quoteCard,
  archived,
}: {
  projectId: string;
  clientQuote: ProjectDocument | null;
  /** Carte du devis client : complète tant que la liste n'existe pas, sur une ligne ensuite. */
  quoteCard: (compact: boolean) => React.ReactNode;
  archived: boolean;
}) {
  const fetchTakeoff = useCallback(
    (signal: AbortSignal) =>
      api<{ takeoff: Takeoff | null; aiAvailable: boolean }>(`/v1/projects/${encodeURIComponent(projectId)}/takeoff`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchTakeoff);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [showList, setShowList] = useState(false);
  const refreshProgress = useProgressRefresh();

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const takeoff = data.takeoff;
  const update = (t: Takeoff) => {
    setData({ ...data, takeoff: t });
    refreshProgress();
  };

  async function run<T>(action: () => Promise<T>, onDone: (value: T) => void) {
    setPending(true);
    setActionError(null);
    try {
      onDone(await action());
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  if (!takeoff) {
    if (!clientQuote) return null;
    const readable = canPrepareTakeoff(clientQuote);
    return (
      <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
        {quoteCard(false)}
        {!data.aiAvailable ? (
          <p className="text-sm text-muted">Cette fonction n&apos;est pas encore activée sur votre compte.</p>
        ) : !readable ? null : (
          <>
            {actionError ? <ErrorNotice error={actionError} /> : null}
            <Button
              pending={pending}
              disabled={archived}
              onClick={() => void run(() => api<Takeoff>(`/v1/documents/${encodeURIComponent(clientQuote.id)}/takeoff`, { method: "POST" }), update)}
            >
              <Sparkles size={18} aria-hidden="true" />
              {pending ? "Préparation de la liste… (jusqu'à une minute)" : "Préparer la liste de matériaux"}
            </Button>
          </>
        )}
      </section>
    );
  }

  const draft = takeoff.status === "draft";
  const materials = takeoff.lines.filter((l) => l.kind !== "labor");
  const labor = takeoff.lines.filter((l) => l.kind === "labor");
  const editable = !archived;
  const call = (path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) =>
    run(() => api<Takeoff>(path, { method, ...(body !== undefined ? { body } : {}) }), update);
  const lineActions = (line: TakeoffLine) => ({
    onSave: (fields: LineFieldsInput) => call(`/v1/takeoff-lines/${line.id}`, "PATCH", fields),
    onDelete: () => call(`/v1/takeoff-lines/${line.id}`, "DELETE"),
    onConfirm: () => call(`/v1/takeoff-lines/${line.id}/confirm`, "POST"),
  });
  const view = takeoff.view;
  const handlers: DecisionHandlers = {
    onDecide: (d) => call(`/v1/takeoffs/${takeoff.id}/decisions`, "POST", { action: d.primary?.action, lineIds: d.lineIds, pieceLineIds: d.pieceLineIds }),
    onAnswer: (key, value) => call(`/v1/takeoffs/${takeoff.id}/answers`, "POST", { key, value }),
    onSaveLine: (lineId, fields) => call(`/v1/takeoff-lines/${lineId}`, "PATCH", fields),
    onDeleteLine: (lineId) => call(`/v1/takeoff-lines/${lineId}`, "DELETE"),
  };
  const validate = () => {
    setShowList(false);
    void call(`/v1/takeoffs/${takeoff.id}/validate`, "POST");
  };
  const linkStyle = "inline-flex min-h-11 items-center justify-center gap-1.5 self-center text-sm font-bold text-accent-text";

  let body: React.ReactNode;
  if (showList) {
    body = (
      <>
        <Card className="flex flex-col divide-y divide-line px-4 py-1">
          {materials.map((line) => (
            <ListRow key={line.id} line={line} editable={editable} pending={pending} {...lineActions(line)} />
          ))}
        </Card>
        {editable ? <AddLine pending={pending} onAdd={(fields) => call(`/v1/takeoffs/${takeoff.id}/lines`, "POST", fields)} /> : null}
        {labor.length > 0 || takeoff.notes.length > 0 ? (
          <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
            <summary className="cursor-pointer font-bold">Lignes mises de côté</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
              {labor.map((l) => (
                <li key={l.id}>{shortName(l.designation)} (main-d&apos;œuvre, rien à commander)</li>
              ))}
              {takeoff.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {draft && editable && view.decisions.every((d) => d.lineIds.length === 0) ? (
          <Button pending={pending} onClick={validate}>
            <Check size={18} aria-hidden="true" />
            Valider la liste
          </Button>
        ) : null}
        <button type="button" onClick={() => setShowList(false)} className={linkStyle}>
          Fermer la liste
        </button>
      </>
    );
  } else if (draft) {
    // Les décisions qui touchent des lignes du devis bloquent l'envoi ; les questions du calcul, non
    // (sans réponse, l'ouvrage part simplement pour sa mesure).
    const blocking = view.decisions.filter((d) => d.lineIds.length > 0).length;
    body = (
      <>
        <TrustHeader counts={view.counts} />
        {view.decisions.map((d) => (
          <DecisionCard key={d.key} decision={d} lines={takeoff.lines} editable={editable} pending={pending} handlers={handlers} />
        ))}
        {view.measures ? <MeasuresNote measures={view.measures} items={view.items} /> : null}
        <ReadyList items={view.items} onAnswer={handlers.onAnswer} editable={editable} />
        {editable && blocking === 0 ? (
          <Card className="flex flex-col gap-3 p-5">
            <p className="flex items-center gap-2 text-[20px] font-extrabold">
              <CircleCheck size={24} className="text-ok" aria-hidden="true" />
              Votre liste est prête
            </p>
            <p className="text-[15px] text-muted">{plural(materials.length, "article")} à demander aux fournisseurs.</p>
            <Button pending={pending} onClick={validate}>
              <Check size={18} aria-hidden="true" />
              Valider la liste
            </Button>
          </Card>
        ) : null}
        <button type="button" onClick={() => setShowList(true)} className={linkStyle}>
          Voir toute la liste ({materials.length})
        </button>
      </>
    );
  } else {
    body = (
      <DoneLine
        label={`Liste validée · ${plural(materials.length, "article")}`}
        action="Voir"
        actionLabel="Voir ou corriger la liste"
        onAction={() => setShowList(true)}
      />
    );
  }

  return (
    <>
      {quoteCard(true)}
      <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
        {actionError ? <ErrorNotice error={actionError} /> : null}
        {body}
      </section>
      <ProjectPriceRequests projectId={projectId} archived={archived} canCreate={!draft} />
    </>
  );
}

/** Étape terminée : une ligne, et de quoi y revenir. */
export function DoneLine({ label, action, actionLabel, onAction }: { label: string; action: string; actionLabel?: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2 shadow-card">
      <CircleCheck size={20} className="shrink-0 text-ok" aria-hidden="true" />
      <span className="min-w-0 grow truncate text-[15px] font-bold">{label}</span>
      <button type="button" onClick={onAction} aria-label={actionLabel ?? action} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent-text">
        {action}
      </button>
    </div>
  );
}

interface LineFieldsInput {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

interface LineActions {
  onSave: (fields: LineFieldsInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onConfirm: () => Promise<void>;
}

/** Une ligne de la liste complète : nom court, quantité, crayon. */
function ListRow({ line, editable, pending, onSave, onDelete, onConfirm }: { line: TakeoffLine; editable: boolean; pending: boolean } & LineActions) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const doubt = line.status !== "certain";

  if (editing) {
    return (
      <div className="py-3">
        <LineForm initial={line} submitLabel="Enregistrer" pending={pending} onCancel={() => setEditing(false)} onSubmit={async (f) => { await onSave(f); setEditing(false); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center gap-3">
        {doubt ? (
          <HelpCircle size={18} className="shrink-0 text-warn" aria-label="à vérifier" />
        ) : (
          <CircleCheck size={18} className="shrink-0 text-ok" aria-label="vérifiée" />
        )}
        <span className="min-w-0 grow">
          <span className="line-clamp-2 text-[15px] leading-snug font-bold">{shortName(line.designation)}</span>
          <span className="text-sm text-muted">
            {line.basis === "work" ? "Pour " : ""}
            {line.quantity ?? "?"} {line.unit ?? ""}
            {line.basis === "work" ? <span className="font-semibold text-warn"> · quantité à calculer</span> : null}
            {/* Où la ligne se trouve dans le devis (logement, pièce) : pour s'y retrouver d'un coup d'œil. */}
            {line.section?.length ? <span> · {line.section.slice(-2).join(" › ")}</span> : null}
          </span>
        </span>
        {editable ? (
          <span className="flex shrink-0">
            {doubt ? (
              <button type="button" disabled={pending} onClick={() => void onConfirm()} aria-label={`C'est bon : ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-ok">
                <Check size={18} aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(true)} aria-label={`Corriger ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-accent-text">
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Retirer ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-muted">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      {confirmDelete ? <DeleteConfirm pending={pending} onDelete={onDelete} onCancel={() => setConfirmDelete(false)} /> : null}
    </div>
  );
}

function DeleteConfirm({ pending, onDelete, onCancel }: { pending: boolean; onDelete: () => Promise<void>; onCancel: () => void }) {
  return (
    <div role="group" aria-label="Confirmer la suppression de la ligne" className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
        className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white disabled:opacity-60"
      >
        Oui, retirer
      </button>
      <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
        Annuler
      </button>
    </div>
  );
}

function AddLine({ pending, onAdd }: { pending: boolean; onAdd: (fields: LineFieldsInput) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={18} aria-hidden="true" />
        Ajouter une ligne
      </Button>
    );
  }
  return (
    <Card className="p-4">
      <LineForm
        submitLabel="Ajouter"
        pending={pending}
        onCancel={() => setOpen(false)}
        onSubmit={async (fields) => {
          await onAdd(fields);
          setOpen(false);
        }}
      />
    </Card>
  );
}

function LineForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: TakeoffLine;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fields: LineFieldsInput) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const input =
    "min-h-12 w-full rounded-2xl bg-ground px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ink";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!designation.trim()) return;
        void onSubmit({
          designation: designation.trim(),
          quantity: quantity.trim() || null,
          unit: unit.trim() || null,
          reference: reference.trim() || null,
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-d`}>
        Désignation
        <input id={`${id}-d`} className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} required maxLength={300} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-q`}>
          Quantité
          <input id={`${id}-q`} className={input} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" maxLength={40} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-u`}>
          Unité
          <input id={`${id}-u`} className={input} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="u, m², ml…" maxLength={20} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-r`}>
        Référence (facultatif)
        <input id={`${id}-r`} className={input} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="grow">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
