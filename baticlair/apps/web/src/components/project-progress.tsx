"use client";

import { ArrowDown, Check } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { api, type Offer, type PriceRequest, type ProjectDocument, type Takeoff } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * Fil du chantier : Devis → Matériaux → Fournisseurs → Réponses → Comparer.
 * L'artisan voit où il en est et ce qu'il fait ensuite, en un coup d'œil.
 * Chaque section du chantier signale ses changements pour que le fil suive.
 */
const RefreshContext = createContext<() => void>(() => {});

/** À appeler après chaque changement (dépôt, validation, envoi…) pour mettre le fil à jour. */
export function useProgressRefresh(): () => void {
  return useContext(RefreshContext);
}

export function ProjectProgressProvider({
  projectId,
  archived,
  bar = true,
  children,
}: {
  projectId: string;
  archived: boolean;
  /** Le chat du chantier se passe de la barre en 5 étapes (référentiel §21). */
  bar?: boolean;
  children: React.ReactNode;
}) {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return (
    <RefreshContext value={refresh}>
      {archived || !bar ? null : <ProgressBar projectId={projectId} tick={tick} />}
      {children}
    </RefreshContext>
  );
}

interface Snapshot {
  documents: ProjectDocument[];
  takeoff: Takeoff | null;
  requests: PriceRequest[];
  /** Devis déjà lus de la demande en cours. */
  offers: Offer[];
}

type StepKey = "devis" | "materiaux" | "fournisseurs" | "reponses" | "comparer";

interface Progress {
  done: Record<StepKey, boolean>;
  current: StepKey;
  /** Ce que l'artisan fait maintenant, en quelques mots, et où. */
  next: { label: string; target: string | null };
}

export function computeProgress({ documents, takeoff, requests, offers }: Snapshot): Progress {
  const hasQuote = documents.some((d) => d.purpose === "client_quote");
  const validated = takeoff?.status === "validated";
  const recipients = requests.flatMap((r) => r.recipients);
  const toSend = recipients.filter((r) => r.status === "to_send").length;
  const sent = recipients.filter((r) => r.status !== "to_send").length;
  const received = recipients.filter((r) => r.status === "received").length;

  const done = {
    devis: hasQuote,
    materiaux: validated,
    fournisseurs: sent > 0,
    reponses: received > 0,
    comparer: requests.some((r) => r.classifiedAt !== null),
  };

  if (!hasQuote) return { done, current: "devis", next: { label: "Ajouter le devis client", target: "devis" } };
  if (!takeoff) return { done, current: "materiaux", next: { label: "Préparer la liste de matériaux", target: "materiaux" } };
  if (!validated) return { done, current: "materiaux", next: { label: "Valider la liste", target: "materiaux" } };
  if (recipients.length === 0) return { done, current: "fournisseurs", next: { label: "Envoyer les demandes", target: "fournisseurs" } };
  const read = new Set(offers.map((o) => o.recipientId));
  const unread = recipients.filter((r) => r.status === "received" && !read.has(r.id)).length;
  // Plusieurs offres reçues : comparer passe avant la relance du dernier fournisseur.
  if (unread > 0 && received > 1) return { done, current: "comparer", next: { label: "Comparer les offres", target: "fournisseurs" } };
  if (toSend > 0) return { done, current: "fournisseurs", next: { label: "Envoyer les demandes", target: "fournisseurs" } };
  if (received === 0) return { done, current: "reponses", next: { label: "Ajouter les offres reçues", target: "fournisseurs" } };
  if (unread > 0) return { done, current: "comparer", next: { label: "Voir l'offre reçue", target: "fournisseurs" } };
  if (!done.comparer) return { done, current: "comparer", next: { label: "Choisir un fournisseur", target: "comparer" } };
  return { done, current: "comparer", next: { label: "Fournisseur choisi ✓", target: null } };
}

const STEPS: { key: StepKey; label: string }[] = [
  { key: "devis", label: "Devis" },
  { key: "materiaux", label: "Matériaux" },
  { key: "fournisseurs", label: "Fournisseurs" },
  { key: "reponses", label: "Réponses" },
  { key: "comparer", label: "Choisir" },
];

function ProgressBar({ projectId, tick }: { projectId: string; tick: number }) {
  const fetchSnapshot = useCallback(
    async (signal: AbortSignal): Promise<Snapshot> => {
      void tick; // relit le fil à chaque changement signalé
      const id = encodeURIComponent(projectId);
      const [docs, takeoff, requests] = await Promise.all([
        api<{ items: ProjectDocument[] }>(`/v1/projects/${id}/documents`, { signal }),
        api<{ takeoff: Takeoff | null }>(`/v1/projects/${id}/takeoff`, { signal }),
        api<{ items: PriceRequest[] }>(`/v1/projects/${id}/price-requests`, { signal }),
      ]);
      const first = requests.items[0];
      const offers = first ? (await api<{ items: Offer[] }>(`/v1/price-requests/${first.id}/offers`, { signal })).items : [];
      return { documents: docs.items, takeoff: takeoff.takeoff, requests: requests.items, offers };
    },
    [projectId, tick],
  );
  const { data } = useResource(fetchSnapshot);
  if (!data) return <div className="h-[104px]" aria-hidden="true" />;

  const { done, current, next } = computeProgress(data);
  const recipients = data.requests.flatMap((r) => r.recipients);
  const counts: Partial<Record<StepKey, string>> =
    recipients.length > 0 ? { reponses: `${recipients.filter((r) => r.status === "received").length}/${recipients.length}` } : {};

  return (
    <nav aria-label="Avancement du chantier" className="flex flex-col gap-3 rounded-3xl bg-surface p-3.5 shadow-card">
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map((step) => {
          const isDone = done[step.key];
          const isCurrent = step.key === current && !isDone;
          return (
            <li key={step.key} aria-current={isCurrent ? "step" : undefined} className="flex flex-col items-center gap-1 text-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-extrabold ${
                  isDone ? "bg-ok text-white" : isCurrent ? "bg-accent text-white" : "bg-line text-muted"
                }`}
              >
                {isDone ? <Check size={15} strokeWidth={3} aria-label="fait" /> : STEPS.indexOf(step) + 1}
              </span>
              <span className={`text-[11px] leading-tight ${isCurrent ? "font-extrabold text-ink" : isDone ? "font-bold text-ok" : "text-muted"}`}>
                {step.label}
                {counts[step.key] ? <span className="block font-bold">{counts[step.key]}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {next.target ? (
        <a
          href={`#${next.target}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[15px] font-extrabold text-white"
        >
          {next.label}
          <ArrowDown size={18} aria-hidden="true" />
        </a>
      ) : (
        <p className="text-center text-sm font-bold text-muted">{next.label}</p>
      )}
    </nav>
  );
}
