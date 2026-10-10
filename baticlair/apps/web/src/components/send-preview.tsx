"use client";

import { FileText, Send, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Button, ErrorNotice, Spinner } from "@/components/ui";
import { api, type QuotePreview } from "@/lib/api";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/**
 * « Aperçu » (retour du fondateur, 2026-10-10 : « un bouton pour prévisualiser le PDF et le mail envoyé ») : l'objet et le
 * mail mot pour mot, et le PDF joint, sortis du même générateur que ce qui part (§45.9). Rien ne part d'ici ; « Envoyer au
 * fournisseur » mène seulement à « À qui j'envoie ? ».
 */
export function SendPreview({ projectId, onSend, onClose }: { projectId: string; onSend: () => void; onClose: () => void }) {
  const id = encodeURIComponent(projectId);
  const fetchPreview = useCallback((signal: AbortSignal) => api<QuotePreview>(`/v1/projects/${id}/price-requests/preview`, { method: "POST", body: {}, signal }), [id]);
  const { data, error, reload } = useResource(fetchPreview);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="Ce que reçoit le fournisseur" className="fixed inset-0 z-50 flex flex-col bg-ground">
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <h2 className="font-display text-[20px] font-extrabold">Ce que reçoit le fournisseur</h2>
        <button type="button" onClick={onClose} aria-label="Revenir à mon chantier" className="inline-flex size-11 items-center justify-center rounded-xl">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 grow overflow-y-auto px-3 pb-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {error && !data ? <ErrorNotice error={error} onRetry={reload} /> : null}
          {!data && !error ? <Spinner /> : null}
          {data ? (
            <>
              <section aria-label="Le mail" className="rounded-[20px] bg-surface p-4 shadow-card">
                <p className="text-[15px]">
                  <span className="font-bold">Objet : </span>
                  {data.subject}
                </p>
                <pre className="mt-3 font-sans text-[14px] leading-snug whitespace-pre-wrap">{data.mail}</pre>
              </section>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => openFile({ url: `/v1/projects/${id}/demande-de-devis.pdf`, title: "Le PDF joint", fileName: "demande-de-devis.pdf" })}
              >
                <FileText size={18} aria-hidden="true" />
                Voir le PDF
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 bg-ground px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_-12px_rgba(16,24,40,0.25)]">
        <Button className="min-h-14 w-full max-w-2xl text-[17px]" onClick={onSend}>
          <Send size={18} aria-hidden="true" />
          Envoyer au fournisseur
        </Button>
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center text-sm font-bold text-muted">
          Revenir à ma liste
        </button>
      </div>
    </div>
  );
}
