"use client";

import { useParams } from "next/navigation";
import { MapPin, MoreHorizontal } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ProjectDocuments } from "@/components/project-documents";
import { ProjectProgressProvider } from "@/components/project-progress";
import { Badge, BackButton, Button, ErrorNotice, Field, Spinner } from "@/components/ui";
import { api, ApiError, type Project, type ProjectDocument } from "@/lib/api";
import { openDocument } from "@/lib/open-document";
import { fr } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

export default function ChantierPage() {
  const { id } = useParams<{ id: string }>();
  const fetchProject = useCallback((signal: AbortSignal) => api<Project>(`/v1/projects/${encodeURIComponent(id)}`, { signal }), [id]);
  const { data: project, setData: setProject, error, reload } = useResource(fetchProject);
  const [editing, setEditing] = useState(false);
  // §50.4 : le devis déposé se rouvre depuis le titre du chantier (plus de carte « Ouvrir / Retirer »).
  const [quote, setQuote] = useState<ProjectDocument | null>(null);
  // Un devis retiré depuis le menu : les documents du chantier se relisent (retour au dépôt).
  const [docsKey, setDocsKey] = useState(0);

  if (error && !project) {
    return (
      <>
        <BackButton fallback="/chantiers" />
        <ErrorNotice error={error} onRetry={reload} />
      </>
    );
  }
  if (!project) return <Spinner />;

  return (
    <>
      {editing ? (
        <EditForm project={project} onDone={(p) => { if (p) setProject(p); setEditing(false); }} />
      ) : (
        <Header
          project={project}
          quote={quote}
          onEdit={() => setEditing(true)}
          onChange={setProject}
          onQuoteRemoved={() => {
            setQuote(null);
            setDocsKey((k) => k + 1);
          }}
        />
      )}
      <ProjectProgressProvider projectId={project.id} archived={project.status === "archived"} bar={false}>
        {/* La lecture donne son nom au chantier (« Chantier Dupont ») : l'en-tête se relit quand elle finit. */}
        <ProjectDocuments key={docsKey} projectId={project.id} archived={project.status === "archived"} onProjectChanged={reload} onQuote={setQuote} />
      </ProjectProgressProvider>
    </>
  );
}

function Header({
  project,
  quote,
  onEdit,
  onChange,
  onQuoteRemoved,
}: {
  project: Project;
  quote: ProjectDocument | null;
  onEdit: () => void;
  onChange: (p: Project) => void;
  onQuoteRemoved: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const mapsUrl = project.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}` : null;
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const busy = useRef(false);
  const done = project.status === "archived";

  async function toggleStatus() {
    if (busy.current) return;
    busy.current = true;
    setMenu(false);
    setPending(true);
    setError(null);
    try {
      onChange(await api<Project>(`/v1/projects/${project.id}`, { method: "PATCH", body: { status: done ? "active" : "archived" } }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  // Un devis déposé par erreur se retire d'ici (§50.4 : plus de carte du PDF sous la liste), avec confirmation.
  async function removeQuote() {
    if (!quote || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await api<null>(`/v1/documents/${encodeURIComponent(quote.id)}`, { method: "DELETE" });
      setConfirmRemove(false);
      setMenu(false);
      onQuoteRemoved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const item = "flex min-h-11 w-full items-center text-left text-sm font-bold";
  return (
    // En-tête d'une conversation : retour, nom du chantier, menu ; le client et l'adresse en petit dessous.
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <BackButton fallback="/chantiers" compact />
        {/* Le nom lu dans le devis ; un tap rouvre le devis (§50.4). Il se renomme par « Modifier le chantier ». */}
        <h1 className="flex min-w-0 grow font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
          {quote ? (
            <button type="button" onClick={() => void openDocument(quote.id, quote.name, quote.name)} aria-label={`Ouvrir le devis : ${project.name}`} className="min-h-11 min-w-0 truncate text-left">
              {project.name}
            </button>
          ) : (
            <span className="flex min-h-11 min-w-0 items-center truncate">{project.name}</span>
          )}
        </h1>
        <button
          type="button"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-label="Plus d'actions sur le chantier"
          disabled={pending}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card disabled:opacity-60"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
      </div>
      {menu ? (
        <ul role="menu" aria-label="Actions sur le chantier" className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-4 shadow-card">
          <li role="none">
            <button type="button" role="menuitem" className={item} onClick={() => { setMenu(false); onEdit(); }}>
              Modifier le chantier
            </button>
          </li>
          {quote && !done ? (
            <li role="none">
              {confirmRemove ? (
                <span className="flex min-h-11 items-center justify-between gap-2 text-sm font-bold">
                  Retirer le devis ?
                  <span className="flex gap-2">
                    <button type="button" className="min-h-11 px-2 text-muted" onClick={() => setConfirmRemove(false)}>
                      Non
                    </button>
                    <button type="button" className="min-h-11 px-2 text-danger" onClick={() => void removeQuote()}>
                      Oui, retirer
                    </button>
                  </span>
                </span>
              ) : (
                <button type="button" role="menuitem" className={item} onClick={() => setConfirmRemove(true)}>
                  Retirer le devis
                </button>
              )}
            </li>
          ) : null}
          <li role="none">
            <button type="button" role="menuitem" className={item} onClick={() => void toggleStatus()}>
              {done ? "Reprendre le chantier" : "Marquer terminé"}
            </button>
          </li>
        </ul>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex flex-wrap items-center gap-x-3 pl-13 text-sm text-muted">
        {done ? <Badge tone="ok">{fr.status.archived}</Badge> : null}
        {project.clientName ? <span>{project.clientName}</span> : null}
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 min-w-0 items-center gap-1 font-semibold text-accent-text">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{project.address}</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}

function EditForm({ project, onDone }: { project: Project; onDone: (p: Project | null) => void }) {
  const [values, setValues] = useState({ name: project.name, clientName: project.clientName ?? "", address: project.address ?? "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      onDone(
        await api<Project>(`/v1/projects/${project.id}`, {
          method: "PATCH",
          body: { name: values.name, clientName: values.clientName || null, address: values.address || null },
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <BackButton fallback="/chantiers" />
      {error ? <ErrorNotice error={error} /> : null}
      <Field id="name" label="Nom du chantier" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required autoFocus />
      <Field id="clientName" label="Client" value={values.clientName} onChange={(e) => setValues({ ...values, clientName: e.target.value })} />
      <Field id="address" label="Adresse du chantier" value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => onDone(null)} disabled={pending}>
          {fr.actions.cancel}
        </Button>
        <Button type="submit" pending={pending}>
          {fr.actions.save}
        </Button>
      </div>
    </form>
  );
}
