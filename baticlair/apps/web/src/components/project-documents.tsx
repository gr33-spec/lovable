"use client";

import { CircleCheck, FileText, FileUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { AssistantMessage } from "@/components/chat";
import { ProjectTakeoff } from "@/components/project-takeoff";
import { Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, type DocumentPurpose, type ProjectDocument } from "@/lib/api";
import { unreadableMessage } from "@/lib/fr";
import { openDocument } from "@/lib/open-document";
import { useProgressRefresh } from "@/components/project-progress";
import { useResource } from "@/lib/use-resource";

const PURPOSE_LABEL: Record<DocumentPurpose, string> = {
  client_quote: "Devis client",
  supplier_quote: "Devis fournisseur",
};

/**
 * Documents du chantier : le devis client (point de départ) et les devis
 * fournisseurs. Étape actuelle : dépôt et lecture automatique (sans IA) ;
 * l'extraction de la liste de matériaux arrive ensuite.
 */
export function ProjectDocuments({ projectId, archived }: { projectId: string; archived: boolean }) {
  const fetchDocs = useCallback(
    (signal: AbortSignal) => api<{ items: ProjectDocument[] }>(`/v1/projects/${encodeURIComponent(projectId)}/documents`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchDocs);
  const [notice, setNotice] = useState<string | null>(null);
  // Devis déposé à l'instant : la lecture part d'elle-même (un rechargement ne relance rien).
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const refreshProgress = useProgressRefresh();

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const docs = data.items;
  const clientQuotes = docs.filter((d) => d.purpose === "client_quote");

  function added(doc: ProjectDocument) {
    setNotice(doc.duplicate ? "Ce devis était déjà dans ce chantier : rien n'a été ajouté." : null);
    if (!doc.duplicate) setJustAdded(doc.id);
    setData({ items: [doc, ...docs.filter((d) => d.id !== doc.id)] });
    refreshProgress();
  }

  function removed(id: string) {
    setNotice("Devis supprimé.");
    setData({ items: docs.filter((d) => d.id !== id) });
    refreshProgress();
  }

  const quote = clientQuotes[0] ?? null;
  return (
    <div className="flex flex-col gap-4">
      {quote ? (
        <div className="w-[88%] self-end">
          <DocumentCard doc={quote} compact={false} onRemoved={removed} />
        </div>
      ) : archived ? null : (
        <section id="devis" aria-labelledby="next-step" className="scroll-mt-4">
          <AssistantMessage>
            <h2 id="next-step" className="text-base leading-relaxed font-semibold">
              Déposez le devis de votre client : je vous sors la liste des matériaux à commander.
            </h2>
            <UploadButton projectId={projectId} purpose="client_quote" label="Choisir le devis (PDF)" tone="dark" onAdded={added} />
          </AssistantMessage>
        </section>
      )}

      {notice ? (
        <p role="status" className="rounded-2xl bg-surface p-3 text-sm font-semibold shadow-card">
          {notice}
        </p>
      ) : null}

      <ProjectTakeoff key={quote?.id ?? "none"} projectId={projectId} clientQuote={quote} archived={archived} autoStart={quote !== null && justAdded === quote.id} />
    </div>
  );
}

function DocumentCard({ doc, compact, onRemoved }: { doc: ProjectDocument; compact: boolean; onRemoved: (id: string) => void }) {
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);
  // Panne de lecture de notre côté : le fichier est sain et l'IA le lira en entier.
  const readByAi = doc.reading?.errorCode === "read_failed";
  const failed = doc.status === "failed" && !readByAi;

  async function open() {
    setOpening(true);
    await openDocument(doc.id);
    setOpening(false);
  }

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api<null>(`/v1/documents/${encodeURIComponent(doc.id)}`, { method: "DELETE" });
      onRemoved(doc.id);
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setDeleting(false);
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2 shadow-card">
        <CircleCheck size={20} className="shrink-0 text-ok" aria-hidden="true" />
        <span className="min-w-0 grow truncate text-[15px] font-bold">{PURPOSE_LABEL[doc.purpose]}</span>
        <button
          type="button"
          onClick={() => void open()}
          disabled={opening}
          aria-label={`Ouvrir ${doc.name}`}
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent-text disabled:opacity-60"
        >
          Ouvrir
        </button>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ground text-accent" aria-hidden="true">
          <FileText size={20} />
        </span>
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[13px] font-bold text-muted">{PURPOSE_LABEL[doc.purpose]}</span>
          <span className="truncate text-[15px] font-bold">{doc.name}</span>
        </div>
      </div>
      {failed ? <p className="text-sm text-danger">{unreadableMessage(doc.reading?.errorCode)}</p> : null}
      {deleteError ? <ErrorNotice error={deleteError} /> : null}
      {confirming ? (
        <div role="group" aria-label="Confirmer la suppression" className="flex flex-col gap-2 rounded-2xl bg-ground p-3">
          <p className="text-sm font-semibold">Supprimer ce devis du chantier ? Vous pourrez le déposer à nouveau.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void remove()}
              disabled={deleting}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              Oui, supprimer
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void open()}
            disabled={opening}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-accent-text disabled:opacity-60"
          >
            {opening ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Ouvrir le PDF
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Supprimer ${doc.name}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-muted"
          >
            <Trash2 size={16} aria-hidden="true" />
            Supprimer
          </button>
        </div>
      )}
    </Card>
  );
}

function UploadButton({
  projectId,
  purpose,
  label,
  tone,
  onAdded,
}: {
  projectId: string;
  purpose: DocumentPurpose;
  label: string;
  tone: "dark" | "light";
  onAdded: (doc: ProjectDocument) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function send(file: File) {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(new ApiError("payload_too_large", 413));
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("file", file, file.name);
      onAdded(await api<ProjectDocument>(`/v1/projects/${encodeURIComponent(projectId)}/documents`, { method: "POST", body: form }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  const style = tone === "dark" ? "bg-accent text-white" : "bg-surface text-ink shadow-card";

  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
        }}
      />
      <label
        htmlFor={inputId}
        aria-disabled={pending}
        className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 font-extrabold focus-within:ring-2 ${style} ${pending ? "pointer-events-none opacity-70" : ""}`}
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
        {pending ? "Lecture du document…" : label}
      </label>
    </div>
  );
}

