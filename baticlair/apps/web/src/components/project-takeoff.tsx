"use client";

import { Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";
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
  const blocking = takeoff.counts.blocking;

  return (
    <section aria-labelledby="takeoff-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="takeoff-title" className="text-xs font-extrabold tracking-[0.04em] text-muted">
          LISTE DE MATÉRIAUX
        </h2>
        {draft ? <Badge tone="warn">À vérifier</Badge> : <Badge tone="ok">Validée</Badge>}
      </div>

      <p role="status" className="text-sm">
        {materials.length} ligne{materials.length > 1 ? "s" : ""} · {takeoff.counts.toVerify} à vérifier
        {labor.length > 0 ? ` · ${labor.length} prestation${labor.length > 1 ? "s" : ""} (rien à commander)` : ""}
      </p>

      {takeoff.notes.length > 0 ? (
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-sm font-bold">Remarques de l&apos;IA</span>
          <ul className="list-disc pl-5 text-sm text-muted">
            {takeoff.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {takeoff.issues.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {takeoff.issues.map((i) => (
            <li key={i.code + i.message} className="rounded-2xl bg-warn-bg p-3 text-sm text-warn">
              {i.message}
            </li>
          ))}
        </ul>
      ) : null}

      {actionError ? <ErrorNotice error={actionError} /> : null}

      <ul className="flex flex-col gap-2.5">
        {materials.map((line) => (
          <li key={line.id}>
            <LineCard
              line={line}
              editable={draft && !archived}
              pending={pending}
              onSave={(fields) => run(() => api<Takeoff>(`/v1/takeoff-lines/${line.id}`, { method: "PATCH", body: fields }), update)}
              onDelete={() => run(() => api<Takeoff>(`/v1/takeoff-lines/${line.id}`, { method: "DELETE" }), update)}
            />
          </li>
        ))}
      </ul>

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

      {draft && !archived ? (
        <>
          <AddLine pending={pending} onAdd={(fields) => run(() => api<Takeoff>(`/v1/takeoffs/${takeoff.id}/lines`, { method: "POST", body: fields }), update)} />
          {blocking > 0 ? (
            <p className="text-sm font-semibold text-danger">
              {blocking} ligne{blocking > 1 ? "s" : ""} sans quantité lisible : corrigez-la{blocking > 1 ? "s" : ""} ou supprimez-la
              {blocking > 1 ? "s" : ""} avant de valider.
            </p>
          ) : null}
          <Button
            pending={pending}
            disabled={blocking > 0}
            onClick={() => void run(() => api<Takeoff>(`/v1/takeoffs/${takeoff.id}/validate`, { method: "POST" }), update)}
          >
            <Check size={18} aria-hidden="true" />
            Valider la liste
          </Button>
        </>
      ) : null}

      {!draft ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-sm">
            Liste validée{takeoff.validatedAt ? ` le ${new Date(takeoff.validatedAt).toLocaleDateString("fr-FR")}` : ""}. Prochaine
            étape : les demandes de prix aux fournisseurs (bientôt).
          </p>
          {!archived ? (
            <Button
              variant="secondary"
              pending={pending}
              onClick={() => void run(() => api<Takeoff>(`/v1/takeoffs/${takeoff.id}/reopen`, { method: "POST" }), update)}
            >
              Modifier la liste
            </Button>
          ) : null}
        </Card>
      ) : null}
    </section>
  );
}

interface LineFieldsInput {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

function LineCard({
  line,
  editable,
  pending,
  onSave,
  onDelete,
}: {
  line: TakeoffLine;
  editable: boolean;
  pending: boolean;
  onSave: (fields: LineFieldsInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const verified = line.status === "certain";
  const issues = line.issues.filter((i) => i.severity !== "info");
  const source = sourceLabel(line);

  if (editing) {
    return (
      <Card className="p-4">
        <LineForm
          initial={line}
          submitLabel="Enregistrer"
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={async (fields) => {
            await onSave(fields);
            setEditing(false);
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[15px] font-bold">{line.designation}</span>
          <span className="text-sm">
            <strong>{line.quantity ?? "Quantité ?"}</strong> {line.unit ?? ""}
            {line.reference ? <span className="text-muted"> · réf. {line.reference}</span> : null}
            {line.family ? <span className="text-muted"> · {line.family}</span> : null}
          </span>
        </div>
        {verified ? <Badge tone="ok">Vérifiée</Badge> : <Badge tone="warn">À vérifier</Badge>}
      </div>
      {issues.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-warn">
          {issues.map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      {source ? <p className="text-[13px] text-muted">{source}</p> : null}
      {editable ? (
        confirmDelete ? (
          <div role="group" aria-label="Confirmer la suppression de la ligne" className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void onDelete()}
              className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white disabled:opacity-60"
            >
              Oui, retirer
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
              Annuler
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Corriger ${line.designation}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent-text"
            >
              <Pencil size={16} aria-hidden="true" />
              Corriger
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Retirer ${line.designation}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-muted"
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
