"use client";

import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { METIERS_INSCRIPTION } from "@/lib/metiers-inscription";
import { useResource } from "@/lib/use-resource";

interface Invitations {
  total: number;
  liensCrees: number;
  parInviteur: { inviteur: string; nombre: number }[];
  suivis: { inviteur: string; invite: string; metier: string | null; departement: string | null; le: string }[];
}
const quand = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const nomMetier = (id: string | null) => METIERS_INSCRIPTION.find((m) => m.id === id)?.nom ?? "Métier non indiqué";

/**
 * QUI A INVITÉ QUI (chantier 05, Greg, 28 novembre 2026) : les inscriptions arrivées par le lien d'un artisan. Aucune
 * récompense, aucune commission : le suivi seul, prêt pour un futur branchement (Flouzeo). Lecture seule, au journal.
 */
export default function AdminInvitations() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Invitations</PageTitle>
      <PorteAdmin>
        <Liste />
      </PorteAdmin>
    </div>
  );
}

function Liste() {
  const charger = useCallback((signal: AbortSignal) => api<Invitations>("/v1/admin/invitations", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <>
      <p className="text-[16px]">
        <strong className="text-[22px] tabular-nums">{data.total}</strong> inscription{data.total > 1 ? "s" : ""} par un lien d&apos;invitation ;{" "}
        <strong className="tabular-nums">{data.liensCrees}</strong> artisan{data.liensCrees > 1 ? "s ont" : " a"} un lien.
      </p>
      {data.parInviteur.length ? (
        <section className="flex flex-col gap-2" aria-labelledby="t-inviteurs">
          <h2 id="t-inviteurs" className="text-[20px] font-extrabold">
            Par artisan qui invite
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {data.parInviteur.map((l) => (
                <li key={l.inviteur} className="flex min-h-12 items-center justify-between gap-3 px-4 text-[15px]">
                  <span className="font-semibold break-all">{l.inviteur}</span>
                  <span className="tabular-nums font-extrabold">{l.nombre}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
      <section className="flex flex-col gap-2" aria-labelledby="t-suivis">
        <h2 id="t-suivis" className="text-[20px] font-extrabold">
          Qui a invité qui
        </h2>
        {data.suivis.length === 0 ? (
          <p className="text-[15px] text-muted">Personne n&apos;est encore arrivé par un lien d&apos;invitation.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.suivis.map((s, i) => (
              <li key={i}>
                <Card className="flex flex-col gap-0.5 p-4 text-[15px]">
                  <span className="font-semibold break-all">
                    {s.inviteur} → {s.invite}
                  </span>
                  <span className="text-muted">
                    {nomMetier(s.metier)} · {s.departement ?? "Département non indiqué"} · {quand(s.le)}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
