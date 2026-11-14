"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { formule, jour } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Code {
  code: string;
  utilisateurs: { id: string; entreprise: string; formule: string; statut: string; depuis: string }[];
}

/** LES CODES PROMO (Greg, 14 novembre 2026) : « FONDATEUR », 6 mois offerts puis -30 % à vie, et qui l'utilise. */
export default function AdminPromosPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Codes promo</PageTitle>
      <PorteAdmin>
        <Promos />
      </PorteAdmin>
    </div>
  );
}

function Promos() {
  const charger = useCallback((signal: AbortSignal) => api<{ codes: Code[] }>("/v1/admin/vue/promos", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const fondateur = data.codes.find((c) => c.code === "FONDATEUR");
  const autres = data.codes.filter((c) => c.code !== "FONDATEUR");
  return (
    <>
      {[{ code: "FONDATEUR", utilisateurs: fondateur?.utilisateurs ?? [] }, ...autres].map((c) => (
        <Card key={c.code} className="flex flex-col gap-2 p-4">
          <SectionTitle>{c.code}</SectionTitle>
          {c.code === "FONDATEUR" ? <p className="text-[15px] text-muted">6 mois offerts, puis 30 % de remise à vie. Le code se saisit au moment du paiement.</p> : null}
          {c.utilisateurs.length === 0 ? (
            <p className="text-[16px]">Personne ne l&apos;utilise pour l&apos;instant.</p>
          ) : (
            <ul aria-label={`Qui utilise ${c.code}`} className="flex flex-col">
              {c.utilisateurs.map((u) => (
                <li key={u.id} className="border-b border-line last:border-b-0">
                  <Link href={`/admin/artisans/${u.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 py-1 text-[16px]">
                    <span className="font-semibold underline underline-offset-4">{u.entreprise}</span>
                    <span className="text-[14px] text-muted">
                      {formule(u.formule)} · depuis le {jour(u.depuis)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </>
  );
}
