"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { adresseAffichee, useAdresseMobiiz } from "@/components/adresse-mobiiz";
import { RecuCard } from "@/components/recus";
import { EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api, type EmailRecu } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * « RÉPONSES À CLASSER » (Greg, 12 novembre 2026, dossier de corrections UX, point 3 ; l'adresse `/recus` est gardée).
 * Une réponse reconnue va toute seule dans son quantitatif ; ici ne restent en tête que celles que Mobiiz n'a pas
 * reconnues, avec une proposition à confirmer. Les réponses déjà classées se retrouvent dessous, repliées.
 */
export default function RecusPage() {
  const charger = useCallback((signal: AbortSignal) => api<{ items: EmailRecu[] }>("/v1/recus", { signal }), []);
  const { data, setData, error, reload } = useResource(charger);
  const adresse = useAdresseMobiiz();
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} label="Chargement des réponses…" />;
  const remplacer = (e: EmailRecu) => setData({ items: data.items.map((x) => (x.id === e.id ? e : x)) });
  const aClasser = data.items.filter((e) => !e.demande);
  const classees = data.items.filter((e) => e.demande);
  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[44rem]">
      <div className="flex flex-col gap-1">
        <PageTitle>Réponses à classer</PageTitle>
        <p className="text-[15px] text-muted">
          Une réponse reconnue va toute seule dans son quantitatif. Ici, seulement celles que Mobiiz n&apos;a pas reconnues
          {adresse.data ? (
            <>
              {" "}
              sur <span className="font-semibold text-ink break-all">{adresseAffichee(adresse.data)}</span>
            </>
          ) : null}
          .
        </p>
      </div>
      {aClasser.length ? (
        <section aria-label="À classer" className="flex flex-col gap-2">
          <h2 className="text-[17px] font-extrabold">
            {aClasser.length} réponse{aClasser.length > 1 ? "s" : ""} à classer
          </h2>
          {aClasser.map((e) => (
            <RecuCard key={e.id} email={e} onChange={remplacer} />
          ))}
        </section>
      ) : (
        <EmptyState icon={<Inbox size={28} aria-hidden="true" />} title="Rien à classer">
          {classees.length ? "Toutes les réponses reçues sont dans leur quantitatif." : "Quand un négoce répond à une demande de prix, sa réponse va dans le quantitatif. Ce que Mobiiz ne reconnaît pas arrive ici."}
        </EmptyState>
      )}
      {classees.length ? (
        <details className="rounded-2xl border border-line p-3" open={aClasser.length === 0 && classees.length <= 3}>
          <summary className="min-h-11 cursor-pointer text-[15px] font-bold">
            {classees.length} réponse{classees.length > 1 ? "s" : ""} déjà classée{classees.length > 1 ? "s" : ""}
          </summary>
          <section aria-label="Déjà classées" className="flex flex-col gap-2 pt-2">
            {classees.map((e) => (
              <RecuCard key={e.id} email={e} onChange={remplacer} />
            ))}
          </section>
        </details>
      ) : null}
      <Link href="/messages" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold underline underline-offset-4">
        Voir tous les messages et réponses
      </Link>
    </div>
  );
}
