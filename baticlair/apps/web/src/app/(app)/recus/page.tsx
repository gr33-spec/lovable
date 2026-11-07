"use client";

import { Inbox } from "lucide-react";
import { useCallback } from "react";
import { adresseAffichee, useAdresseMobiiz } from "@/components/adresse-mobiiz";
import { RecuCard } from "@/components/recus";
import { EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api, type EmailRecu } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * R7 : « MES REÇUS » : tout ce qui est arrivé sur l'adresse Mobiiz. Un e-mail rattaché à une demande renvoie à son
 * chantier ; un e-mail sans demande se rattache d'un tap (son PDF devient alors le devis reçu du négoce).
 */
export default function RecusPage() {
  const charger = useCallback((signal: AbortSignal) => api<{ items: EmailRecu[] }>("/v1/recus", { signal }), []);
  const { data, setData, error, reload } = useResource(charger);
  const adresse = useAdresseMobiiz();
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} label="Chargement des reçus…" />;
  const remplacer = (e: EmailRecu) => setData({ items: data.items.map((x) => (x.id === e.id ? e : x)) });
  const sansDemande = data.items.filter((e) => !e.demande);
  const rattaches = data.items.filter((e) => e.demande);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <PageTitle>Mes reçus</PageTitle>
        {adresse.data ? (
          <p className="text-[15px] text-muted">
            Tout ce qui arrive sur <span className="font-semibold text-ink">{adresseAffichee(adresse.data)}</span>.
          </p>
        ) : null}
      </div>
      {data.items.length === 0 ? (
        <EmptyState icon={<Inbox size={28} aria-hidden="true" />} title="Rien de reçu pour l'instant">
          Quand un négoce répond à une demande de prix, sa réponse arrive sur le chantier. Ce qu&apos;il t&apos;envoie en dehors d&apos;une demande arrive ici.
        </EmptyState>
      ) : null}
      {sansDemande.length ? (
        <section aria-label="À rattacher" className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">À RATTACHER À UNE DEMANDE</h2>
          {sansDemande.map((e) => (
            <RecuCard key={e.id} email={e} onChange={remplacer} />
          ))}
        </section>
      ) : null}
      {rattaches.length ? (
        <section aria-label="Rattachés" className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">RÉPONSES DES NÉGOCES</h2>
          {rattaches.map((e) => (
            <RecuCard key={e.id} email={e} onChange={remplacer} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
