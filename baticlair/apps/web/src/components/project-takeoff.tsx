"use client";

import { Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { ProjectPriceRequests } from "@/components/project-price-requests";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type ProjectDocument, type Takeoff, type TakeoffLine } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/** Le devis client peut être lu par l'IA : texte lu, ou lecture locale en panne (l'IA lit alors le PDF). */
export function canPrepareTakeoff(doc: ProjectDocument): boolean {
  return doc.status === "read" || doc.reading?.errorCode === "read_failed";
}

function sourceLabel(line: TakeoffLine): string | null {
  if (line.origin === "manual") return "Ajoutée par vous";
  const refs = line.sourceRefs.map((ref) => {
    const [page, row] = ref.split(":");
    return `page ${page}, ligne ${Number(row)}`;
  });
  if (refs.length > 0) return `Devis : ${refs.join(" ; ")}${line.edited ? " (corrigée par vous)" : ""}`;
  if (line.sourcePages.length > 0) return `Devis : page ${line.sourcePages.join(", ")} (lue sur l'image)`;
  return null;
}

/**
 * Liste de matériaux tirée du devis client. L'IA propose, le code signale
 * ce qui est douteux, l'artisan corrige et valide : rien ne part chez un
 * fournisseur sans cette validation.
 */
export function ProjectTakeoff({ projectId, clientQuote, archived }: { projectId: string; clientQuote: ProjectDocument | null; archived: boolean }) {
  const fetchTakeoff = useCallback(
    (signal: AbortSignal) =>
      api<{ takeoff: Takeoff | null; aiAvailable: boolean }>(`/v1/projects/${encodeURIComponent(projectId)}/takeoff`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchTakeoff);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const takeoff = data.takeoff;
  const update = (t: Takeoff) => setData({ ...data, takeoff: t });

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
      <section aria-labelledby="takeoff-title" className="flex flex-col gap-3">
        <h2 id="takeoff-title" className="text-xs font-extrabold tracking-[0.04em] text-muted">
          LISTE DE MATÉRIAUX
        </h2>
        <Card className="flex flex-col gap-3 p-4">
          {!data.aiAvailable ? (
            <p className="text-sm text-muted">La lecture par l&apos;IA n&apos;est pas encore activée sur ce compte.</p>
          ) : !readable ? (
            <p className="text-sm text-muted">Ce devis ne peut pas être lu. Déposez une autre version du PDF.</p>
          ) : (
            <>
              <p className="text-sm">
                L&apos;IA lit votre devis et prépare la liste des matériaux à commander. Vous la vérifiez et la corrigez avant tout
                envoi. Cela compte pour <strong>1 analyse</strong> de votre formule.
              </p>
              {actionError ? <ErrorNotice error={actionError} /> : null}
              <Button
                pending={pending}
                disabled={archived}
                onClick={() =>
                  void run(() => api<Takeoff>(`/v1/documents/${encodeURIComponent(clientQuote.id)}/takeoff`, { method: "POST" }), update)
                }
              >
                <Sparkles size={18} aria-hidden="true" />
                {pending ? "L'IA lit votre devis… (jusqu'à une minute)" : "Préparer la liste de matériaux"}
              </Button>
            </>
          )}
        </Card>
      </section>
    );
  }

  const draft = takeoff.status === "draft";
  const materials = takeoff.lines.filter((l) => l.kind !== "labor");
  const labor = takeoff.lines.filter((l) => l.kind === "labor");
  const toCheck = materials.filter((l) => l.status !== "certain");
  const checked = materials.filter((l) => l.status === "certain");
  const editable = !archived;
  const call = (path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) =>
    run(() => api<Takeoff>(path, { method, ...(body !== undefined ? { body } : {}) }), update);
  const lineActions = (line: TakeoffLine) => ({
    onSave: (fields: LineFieldsInput) => call(`/v1/takeoff-lines/${line.id}`, "PATCH", fields),
    onDelete: () => call(`/v1/takeoff-lines/${line.id}`, "DELETE"),
    onConfirm: () => call(`/v1/takeoff-lines/${line.id}/confirm`, "POST"),
  });

  return (
    <section aria-labelledby="takeoff-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="takeoff-title" className="text-xs font-extrabold tracking-[0.04em] text-muted">
          LISTE DE MATÉRIAUX
        </h2>
        {!draft ? <Badge tone="ok">Validée</Badge> : toCheck.length > 0 ? <Badge tone="warn">À vérifier</Badge> : <Badge>À valider</Badge>}
      </div>

      <p role="status" className="text-sm">
        {materials.length} ligne{materials.length > 1 ? "s" : ""} · {toCheck.length} à vérifier
        {labor.length > 0 ? ` · ${labor.length} prestation${labor.length > 1 ? "s" : ""} (rien à commander)` : ""}
      </p>

      {draft && toCheck.length > 0 ? (
        <p className="rounded-2xl bg-warn-bg p-3 text-sm font-semibold text-warn">
          Avant l&apos;envoi aux fournisseurs, regardez {toCheck.length > 1 ? `ces ${toCheck.length} lignes` : "cette ligne"} : « C&apos;est bon » si
          elle est juste, sinon « Corriger ».
        </p>
      ) : null}

      {actionError ? <ErrorNotice error={actionError} /> : null}

      {toCheck.length > 0 ? (
        <ul className="flex flex-col gap-2.5" aria-label="Lignes à vérifier">
          {toCheck.map((line) => (
            <li key={line.id}>
              <DoubtCard line={line} editable={editable} pending={pending} {...lineActions(line)} />
            </li>
          ))}
        </ul>
      ) : null}

      {checked.length > 0 ? (
        <Card className="flex flex-col divide-y divide-line px-4 py-1">
          {checked.map((line) => (
            <CheckedRow key={line.id} line={line} editable={editable} pending={pending} {...lineActions(line)} />
          ))}
        </Card>
      ) : null}

      {takeoff.notes.length > 0 || takeoff.issues.length > 0 ? (
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-sm font-bold">À savoir</span>
          <ul className="list-disc pl-5 text-sm text-muted">
            {takeoff.issues.map((i) => (
              <li key={i.code + i.message}>{i.message}</li>
            ))}
            {takeoff.notes.map((n) => (
              <li key={n}>L&apos;IA : {n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {labor.length > 0 ? (
        <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
          <summary className="cursor-pointer font-bold">Prestations lues, rien à commander ({labor.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-muted">
            {labor.map((l) => (
              <li key={l.id}>{l.designation}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {editable ? <AddLine pending={pending} onAdd={(fields) => call(`/v1/takeoffs/${takeoff.id}/lines`, "POST", fields)} /> : null}

      {draft && editable ? (
        <Button pending={pending} disabled={toCheck.length > 0} onClick={() => void call(`/v1/takeoffs/${takeoff.id}/validate`, "POST")}>
          <Check size={18} aria-hidden="true" />
          {toCheck.length > 0 ? `Encore ${toCheck.length} ligne${toCheck.length > 1 ? "s" : ""} à vérifier` : "Valider la liste"}
        </Button>
      ) : null}

      {!draft ? (
        <p className="text-sm text-muted">
          Liste validée{takeoff.validatedAt ? ` le ${new Date(takeoff.validatedAt).toLocaleDateString("fr-FR")}` : ""}. Vous pouvez encore
          corriger une ligne : il faudra alors la valider à nouveau. Les demandes déjà préparées gardent leur liste.
        </p>
      ) : null}

      <ProjectPriceRequests projectId={projectId} archived={archived} canCreate={!draft} />
    </section>
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

/** Fiabilité d'une ligne, en mots simples (jamais un faux pourcentage). */
function reliability(line: TakeoffLine): { label: string; tone: "ok" | "warn" | "danger"; level: 1 | 2 | 3 } {
  if (line.issues.some((i) => i.severity === "blocking")) return { label: "Incomplète", tone: "danger", level: 1 };
  if (line.status !== "certain") return { label: "Doute", tone: "warn", level: 2 };
  if (line.confirmed || line.edited || line.origin === "manual") return { label: "Vérifiée par vous", tone: "ok", level: 3 };
  return { label: "Fiable", tone: "ok", level: 3 };
}

function Reliability({ line }: { line: TakeoffLine }) {
  const r = reliability(line);
  const color = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[r.tone];
  const text = { ok: "text-ok", warn: "text-warn", danger: "text-danger" }[r.tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold ${text}`}>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`w-1 rounded-full ${n <= r.level ? color : "bg-line"}`} style={{ height: 4 + n * 3 }} />
        ))}
      </span>
      {r.label}
    </span>
  );
}

function Quantity({ line }: { line: TakeoffLine }) {
  return (
    <span className="text-sm">
      <strong>{line.quantity ?? "Quantité ?"}</strong> {line.unit ?? ""}
      {line.reference ? <span className="text-muted"> · réf. {line.reference}</span> : null}
    </span>
  );
}

/** Ligne douteuse : le doute est écrit en clair, l'artisan tranche en un geste. */
function DoubtCard({ line, editable, pending, onSave, onDelete, onConfirm }: { line: TakeoffLine; editable: boolean; pending: boolean } & LineActions) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const blocking = line.issues.some((i) => i.severity === "blocking");
  const reasons = [...line.issues].filter((i) => i.severity !== "info").sort((a, b) => Number(b.code === "AI_DOUBT") - Number(a.code === "AI_DOUBT"));
  const source = sourceLabel(line);

  if (editing) {
    return (
      <Card className="p-4">
        <LineForm initial={line} submitLabel="Enregistrer" pending={pending} onCancel={() => setEditing(false)} onSubmit={async (f) => { await onSave(f); setEditing(false); }} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 border-l-4 border-warn p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-bold">{line.designation}</span>
          <Quantity line={line} />
        </div>
        <Reliability line={line} />
      </div>
      <ul className="flex flex-col gap-1 text-sm font-semibold text-warn">
        {reasons.map((i) => (
          <li key={i.code}>{i.message}</li>
        ))}
      </ul>
      {source ? <p className="text-[13px] text-muted">{source}</p> : null}
      {editable ? (
        confirmDelete ? (
          <DeleteConfirm pending={pending} onDelete={onDelete} onCancel={() => setConfirmDelete(false)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {!blocking ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void onConfirm()}
                aria-label={`C'est bon : ${line.designation}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <Check size={16} aria-hidden="true" />
                C&apos;est bon
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Corriger ${line.designation}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-extrabold ${blocking ? "bg-ink text-white" : "bg-ground text-ink"}`}
            >
              <Pencil size={16} aria-hidden="true" />
              Corriger
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Retirer ${line.designation}`}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-bold text-muted"
            >
              <Trash2 size={16} aria-hidden="true" />
              Retirer
            </button>
          </div>
        )
      ) : null}
    </Card>
  );
}

/** Ligne sûre : une rangée compacte, modifiable d'un appui. */
function CheckedRow({ line, editable, pending, onSave, onDelete }: { line: TakeoffLine; editable: boolean; pending: boolean } & LineActions) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <div className="py-3">
        <LineForm initial={line} submitLabel="Enregistrer" pending={pending} onCancel={() => setEditing(false)} onSubmit={async (f) => { await onSave(f); setEditing(false); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[15px] font-bold">{line.designation}</span>
          <Quantity line={line} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Reliability line={line} />
          {editable ? (
            <div className="flex">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={`Corriger ${line.designation}`}
                className="flex size-10 items-center justify-center rounded-full text-accent-text"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label={`Retirer ${line.designation}`}
                className="flex size-10 items-center justify-center rounded-full text-muted"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
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
