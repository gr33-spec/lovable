"use client";

import { useCallback, useEffect, useState } from "react";
import { DropZone } from "@/components/journey";
import { ProjectTakeoff } from "@/components/project-takeoff";
import { ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, type ProjectDocument } from "@/lib/api";
import { attachFile } from "@/lib/upload";
import { useProgressRefresh } from "@/components/project-progress";
import { useListPage } from "@/lib/list-page";
import { useResource } from "@/lib/use-resource";

/**
 * Documents du chantier : le devis client (point de départ) et les devis
 * fournisseurs. Étape actuelle : dépôt et lecture automatique (sans IA) ;
 * l'extraction de la liste de matériaux arrive ensuite.
 */
export function ProjectDocuments({
  projectId,
  archived,
  onProjectChanged,
  onQuote,
}: {
  projectId: string;
  archived: boolean;
  onProjectChanged?: () => void;
  /** §50.4 : le devis déposé, que le titre du chantier rouvre. */
  onQuote?: (doc: ProjectDocument | null) => void;
}) {
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
  const current = data?.items.find((d) => d.purpose === "client_quote") ?? null;
  useEffect(() => {
    onQuote?.(current);
    // Seul le devis lui-même compte (son id, son nom), pas chaque relecture de la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.name, onQuote]);

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
        {...(quote
          ? {
              onRedeposit: async () => {
                await api<null>(`/v1/documents/${encodeURIComponent(quote.id)}`, { method: "DELETE" });
                removed(quote.id);
              },
            }
          : {})}
      />
    </div>
  );
}
