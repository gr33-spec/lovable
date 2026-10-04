"use client";

import { CircleCheck, FileUp, Loader2, Sparkles } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { SiteNotes } from "@/components/site-notes";
import { ProjectTakeoff } from "@/components/project-takeoff";
import { ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, type DocumentPurpose, type ProjectDocument } from "@/lib/api";
import { unreadableMessage } from "@/lib/fr";
import { openDocument } from "@/lib/open-document";
import { useProgressRefresh } from "@/components/project-progress";
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
export function ProjectDocuments({ projectId, archived }: { projectId: string; archived: boolean }) {
  const fetchDocs = useCallback(
    (signal: AbortSignal) => api<{ items: ProjectDocument[] }>(`/v1/projects/${encodeURIComponent(projectId)}/documents`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchDocs);
  const [notice, setNotice] = useState<string | null>(null);
  const refreshProgress = useProgressRefresh();

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
    setNotice("Devis supprimé.");
    setData({ items: docs.filter((d) => d.id !== id) });
    refreshProgress();
  }

  const quote = clientQuotes[0] ?? null;
  return (
    <div className="flex flex-col gap-4">
      {quote ? (
        <div className="w-[80%] self-end">
          <DocumentCard doc={quote} compact={false} onRemoved={removed} />
        </div>
      ) : archived ? null : (
        <section id="devis" aria-labelledby="next-step" className="flex scroll-mt-4 flex-col gap-3 pb-24 lg:pb-0">
          {/* La carte héros dit ce qui va se passer ; l'action principale est en bas, sous le pouce. */}
          <div className="relative overflow-hidden rounded-[28px] bg-hero p-5 pb-6 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
            <p className="text-[12px] font-extrabold tracking-[0.14em] text-white/65 uppercase">Nouveau chantier</p>
            <h2 id="next-step" className="mt-2 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
              Déposez le devis, <span className="font-serif text-[34px] font-normal tracking-normal italic">je fais la liste.</span>
            </h2>
            <ol className="mt-5 flex flex-col gap-3">
              {[
                ["Je lis votre devis", "PDF, même scanné, sans rien ressaisir."],
                ["Quelques questions d'un coup", "Seulement celles qui changent la liste."],
                ["La liste prête à chiffrer", "Aux unités du fournisseur, à envoyer d'un tap."],
              ].map(([title, text], i) => (
                <li key={title} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[14px] font-extrabold backdrop-blur">
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[16px] leading-snug font-bold">{title}</span>
                    <span className="text-[13px] leading-snug text-white/70">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[13px] font-bold">
              <Sparkles size={14} aria-hidden="true" />
              Environ 1 minute · aucune quantité à saisir
            </p>
          </div>
          <SiteNotes projectId={projectId} infos={null} disabled={false} onSaved={() => undefined} />
          <div className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-20 mx-auto max-w-2xl lg:static lg:inset-auto lg:mx-0">
            <UploadButton projectId={projectId} purpose="client_quote" label="Choisir le devis (PDF)" tone="cta" onAdded={added} />
          </div>
        </section>
      )}

      {notice ? (
        <p role="status" className="rounded-2xl bg-surface p-3 text-sm font-semibold shadow-card">
          {notice}
        </p>
      ) : null}

      <ProjectTakeoff key={quote?.id ?? "none"} projectId={projectId} clientQuote={quote} archived={archived} autoStart={false} />
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
          <p className="text-sm font-semibold">Retirer ce devis du chantier ? Vous pourrez le déposer à nouveau.</p>
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
  tone: "cta" | "dark" | "light";
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

  const style = tone === "cta" ? "bg-cta text-white shadow-cta min-h-15 text-[17px]" : tone === "dark" ? "bg-accent text-white" : "bg-surface text-ink shadow-card";

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

