"use client";

import { CircleCheck, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { DropZone } from "@/components/journey";
import { ProjectTakeoff } from "@/components/project-takeoff";
import { ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, type DocumentPurpose, type ProjectDocument } from "@/lib/api";
import { attachFile } from "@/lib/upload";
import { unreadableMessage } from "@/lib/fr";
import { openDocument } from "@/lib/open-document";
import { useProgressRefresh } from "@/components/project-progress";
import { useListPage } from "@/lib/list-page";
import { useResource } from "@/lib/use-resource";

const PURPOSE_LABEL: Record<DocumentPurpose, string> = {
  client_quote: "Devis client",
  supplier_quote: "Devis fournisseur",
  sketch: "Croquis du chantier",
};

/**
 * Documents du chantier : le devis client (point de départ) et les devis
 * fournisseurs. Étape actuelle : dépôt et lecture automatique (sans IA) ;
 * l'extraction de la liste de matériaux arrive ensuite.
 */
export function ProjectDocuments({ projectId, archived, onProjectChanged }: { projectId: string; archived: boolean; onProjectChanged?: () => void }) {
  const fetchDocs = useCallback(
    (signal: AbortSignal) => api<{ items: ProjectDocument[] }>(`/v1/projects/${encodeURIComponent(projectId)}/documents`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchDocs);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ApiError | null>(null);
  const refreshProgress = useProgressRefresh();
  // Sur la page des fournitures, le devis déposé et les avis du chantier s'effacent : la liste seule.
  const [listPage, setListPage] = useListPage();

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const docs = data.items;
  const clientQuotes = docs.filter((d) => d.purpose === "client_quote");

  function added(doc: ProjectDocument) {
    setNotice(doc.duplicate ? "Ce devis était déjà dans ce chantier : rien n'a été ajouté." : null);
    setData({ items: [doc, ...docs.filter((d) => d.id !== doc.id)] });
    refreshProgress();
  }

  function removed(id: string) {
    // Le devis retiré emporte sa liste : on revient au dépôt (plus de page des fournitures).
    setListPage(false);
    setNotice("Devis supprimé.");
    setData({ items: docs.filter((d) => d.id !== id) });
    refreshProgress();
  }

  const quote = clientQuotes[0] ?? null;
  // §48 : sans devis, la seule action du chantier est de le déposer (même écran que « Nouveau chantier »).
  async function drop(file: File) {
    setUploadError(null);
    if (file.size > MAX_DOCUMENT_BYTES) return setUploadError(new ApiError("payload_too_large", 413));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("purpose", "client_quote");
      await attachFile(form, file);
      added(await api<ProjectDocument>(`/v1/projects/${encodeURIComponent(projectId)}/documents`, { method: "POST", body: form }));
    } catch (e) {
      setUploadError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      {quote || archived ? null : (
        <div id="devis" className="scroll-mt-4">
          <DropZone onFile={(f) => void drop(f)} pending={uploading} error={uploadError} />
        </div>
      )}

      {notice && !listPage ? (
        <p role="status" className="rounded-2xl bg-surface p-3 text-sm font-semibold shadow-card">
          {notice}
        </p>
      ) : null}

      <ProjectTakeoff
        key={quote?.id ?? "none"}
        projectId={projectId}
        clientQuote={quote}
        archived={archived}
        autoStart
        {...(onProjectChanged ? { onProjectChanged } : {})}
        quoteCard={quote ? <DocumentCard doc={quote} compact={false} onRemoved={removed} /> : null}
      />
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
    await openDocument(doc.id, doc.name, doc.name);
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

  // Le devis déposé, comme une pièce jointe envoyée dans la conversation : nom, ouvrir, retirer (discret).
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px_18px_4px_18px] bg-surface p-3 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-danger-bg text-[10px] font-extrabold text-danger" aria-hidden="true">
          PDF
        </span>
        <span className="flex min-w-0 grow flex-col">
          <span className="truncate text-[15px] font-bold">{doc.name}</span>
          <span className="text-[13px] text-muted">{PURPOSE_LABEL[doc.purpose]}</span>
        </span>
      </div>
      {failed ? <p className="text-sm text-danger">{unreadableMessage(doc.reading?.errorCode)}</p> : null}
      {deleteError ? <ErrorNotice error={deleteError} /> : null}
      {confirming ? (
        <div role="group" aria-label="Confirmer la suppression" className="flex flex-col gap-2 rounded-2xl bg-ground p-3">
          <p className="text-sm font-semibold">Retirer ce devis du chantier ? Tu pourras le déposer à nouveau.</p>
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
        <div className="flex items-center gap-4 pl-12">
          <button
            type="button"
            onClick={() => void open()}
            disabled={opening}
            aria-label={`Ouvrir ${doc.name}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent-text disabled:opacity-60"
          >
            {opening ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Ouvrir
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Supprimer ${doc.name}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-muted"
          >
            Retirer
          </button>
        </div>
      )}
    </div>
  );
}
