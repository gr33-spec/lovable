"use client";

import { useParams } from "next/navigation";
import { FileText, MapPin, Pencil } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Badge, BackButton, Button, Card, ErrorNotice, Field, Spinner } from "@/components/ui";
import { api, ApiError, type Project } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

export default function ChantierPage() {
  const { id } = useParams<{ id: string }>();
  const fetchProject = useCallback((signal: AbortSignal) => api<Project>(`/v1/projects/${encodeURIComponent(id)}`, { signal }), [id]);
  const { data: project, setData: setProject, error, reload } = useResource(fetchProject);
  const [editing, setEditing] = useState(false);

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
      <BackButton fallback="/chantiers" />
      {editing ? (
        <EditForm project={project} onDone={(p) => { if (p) setProject(p); setEditing(false); }} />
      ) : (
        <Header project={project} onEdit={() => setEditing(true)} />
      )}
      <NextStep project={project} />
      <StatusAction project={project} onChange={setProject} />
    </>
  );
}

function Header({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const mapsUrl = project.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}` : null;
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">{project.name}</h1>
        <button type="button" onClick={onEdit} aria-label="Modifier le chantier" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card">
          <Pencil size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {project.status === "archived" ? <Badge tone="ok">{fr.status.archived}</Badge> : <Badge>{fr.status.active}</Badge>}
        <span>{project.clientName ?? "Client non renseigné"}</span>
      </div>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-accent-text">
          <MapPin size={16} aria-hidden="true" />
          {project.address}
        </a>
      ) : null}
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

/** Ce qui arrive ensuite ; tant que la lecture des devis n'existe pas, on le dit. */
function NextStep({ project }: { project: Project }) {
  if (project.status === "archived") return null;
  return (
    <section aria-labelledby="next-step" className="flex flex-col gap-3 rounded-[26px] bg-[radial-gradient(130%_100%_at_100%_0%,rgba(255,90,31,0.45)_0%,rgba(255,90,31,0)_55%)] bg-ink p-4.5 text-white shadow-[0_18px_40px_rgba(14,17,22,0.22)]">
      <span id="next-step" className="text-xs font-extrabold tracking-[0.04em] text-[#ffb48f]">
        PROCHAINE ÉTAPE
      </span>
      <span className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">Préparer la liste de matériaux</span>
      <p className="text-sm text-[#c9ced6]">
        Bientôt : photographiez votre devis client, je prépare la liste de matériaux et je demande les prix à vos fournisseurs.
      </p>
      <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 font-extrabold text-[#c9ced6]" aria-disabled="true">
        <FileText size={18} aria-hidden="true" /> Ajouter le devis client · {fr.soon}
      </span>
    </section>
  );
}

function StatusAction({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const done = project.status === "archived";
  const busy = useRef(false);

  async function toggle() {
    if (busy.current) return;
    busy.current = true;
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

  return (
    <Card className="flex flex-col gap-3 p-4">
      {error ? <ErrorNotice error={error} /> : null}
      <p className="text-sm text-muted">
        {done
          ? "Ce chantier est terminé. Il reste consultable et se retrouve par la recherche."
          : "Chantier fini ? Marquez-le terminé : il quitte la liste « En cours » mais reste consultable. Rien n'est supprimé."}
      </p>
      <Button variant="secondary" pending={pending} onClick={() => void toggle()}>
        {done ? "Reprendre le chantier" : "Marquer terminé"}
      </Button>
    </Card>
  );
}
