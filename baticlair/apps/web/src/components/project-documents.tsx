"use client";

import { FileText, FileUp, Loader2 } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Badge, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, getActiveCompanyId, MAX_DOCUMENT_BYTES, type DocumentPurpose, type ProjectDocument } from "@/lib/api";
import { unreadableMessage } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

const PURPOSE_LABEL: Record<DocumentPurpose, string> = {
  client_quote: "Devis client",
  supplier_quote: "Devis fournisseur",
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/** Résumé de la lecture automatique, en mots d'artisan. */
function readingSummary(doc: ProjectDocument): string {
  const r = doc.reading;
  if (!r || r.status !== "completed") return "";
  const parts = [plural(r.pagesText, "page lue", "pages lues")];
  if (r.pagesVision > 0) parts.push(`${plural(r.pagesVision, "page", "pages")} à lire en image`);
  if (r.pagesSkipped > 0) parts.push(`${plural(r.pagesSkipped, "page ignorée", "pages ignorées")} (conditions générales…)`);
  return parts.join(" · ");
}

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

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const docs = data.items;
  const clientQuotes = docs.filter((d) => d.purpose === "client_quote");
  const supplierQuotes = docs.filter((d) => d.purpose === "supplier_quote");

  function added(doc: ProjectDocument) {
    setNotice(doc.duplicate ? "Ce devis était déjà dans ce chantier : rien n'a été ajouté." : null);
    setData({ items: [doc, ...docs.filter((d) => d.id !== doc.id)] });
  }

  return (
    <>
      {clientQuotes.length === 0 && !archived ? (
        <section
          aria-labelledby="next-step"
          className="flex flex-col gap-3 rounded-[26px] bg-[radial-gradient(130%_100%_at_100%_0%,rgba(255,90,31,0.45)_0%,rgba(255,90,31,0)_55%)] bg-ink p-4.5 text-white shadow-[0_18px_40px_rgba(14,17,22,0.22)]"
        >
          <span id="next-step" className="text-xs font-extrabold tracking-[0.04em] text-[#ffb48f]">
            PROCHAINE ÉTAPE
          </span>
          <span className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">Ajouter le devis client</span>
          <p className="text-sm text-[#c9ced6]">
            Le PDF du devis fait avec votre logiciel. Il sert à préparer la liste de matériaux à demander aux fournisseurs.
          </p>
          <UploadButton projectId={projectId} purpose="client_quote" label="Choisir le devis (PDF)" tone="dark" onAdded={added} />
        </section>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-2xl bg-surface p-3 text-sm font-semibold shadow-card">
          {notice}
        </p>
      ) : null}

      {clientQuotes.length > 0 ? (
        <DocumentGroup title="Devis client" docs={clientQuotes} />
      ) : null}

      <section aria-labelledby="supplier-quotes" className="flex flex-col gap-3">
        <h2 id="supplier-quotes" className="text-xs font-extrabold tracking-[0.04em] text-muted">
          DEVIS FOURNISSEURS
        </h2>
        {supplierQuotes.length > 0 ? (
          <DocumentList docs={supplierQuotes} />
        ) : (
          <p className="text-sm text-muted">Aucun devis fournisseur pour l&apos;instant.</p>
        )}
        <UploadButton projectId={projectId} purpose="supplier_quote" label="Ajouter un devis fournisseur (PDF)" tone="light" onAdded={added} />
      </section>
    </>
  );
}

function DocumentGroup({ title, docs }: { title: string; docs: ProjectDocument[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">{title.toUpperCase()}</h2>
      <DocumentList docs={docs} />
    </section>
  );
}

function DocumentList({ docs }: { docs: ProjectDocument[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {docs.map((d) => (
        <li key={d.id}>
          <DocumentCard doc={d} />
        </li>
      ))}
    </ul>
  );
}

function DocumentCard({ doc }: { doc: ProjectDocument }) {
  const [opening, setOpening] = useState(false);
  const failed = doc.status === "failed";

  /** Ouvre le PDF d'origine (téléchargé avec la session et l'entreprise active). */
  async function open() {
    setOpening(true);
    const win = window.open("", "_blank");
    try {
      const headers: Record<string, string> = {};
      const companyId = getActiveCompanyId();
      if (companyId) headers["x-company-id"] = companyId;
      const res = await fetch(`/v1/documents/${doc.id}/file`, { headers, credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch {
      win?.close();
    } finally {
      setOpening(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ground text-accent" aria-hidden="true">
          <FileText size={20} />
        </span>
        <div className="flex min-w-0 grow flex-col">
          <span className="truncate text-[15px] font-bold">{doc.name}</span>
          <span className="text-[13px] text-muted">
            {PURPOSE_LABEL[doc.purpose]}
            {doc.pageCount ? ` · ${plural(doc.pageCount, "page", "pages")}` : ""}
          </span>
        </div>
        {failed ? <Badge tone="danger">Illisible</Badge> : <Badge tone="ok">Lu</Badge>}
      </div>
      {failed ? (
        <p className="text-sm text-danger">{unreadableMessage(doc.reading?.errorCode)}</p>
      ) : (
        <>
          <p className="text-sm">{readingSummary(doc)}</p>
          <p className="text-[13px] text-muted">Liste de matériaux : prochaine étape, pas encore disponible.</p>
        </>
      )}
      <button
        type="button"
        onClick={() => void open()}
        disabled={opening}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-accent-text disabled:opacity-60"
      >
        {opening ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        Ouvrir le PDF
      </button>
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

