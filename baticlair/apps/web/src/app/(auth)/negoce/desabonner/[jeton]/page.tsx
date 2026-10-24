"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOM } from "@/lib/nom";

/** Le lien « Se désabonner » d'un e-mail (point 3) : rien ne change au chargement, tout se confirme d'un bouton. */
export default function DesabonnerPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [pending, setPending] = useState(false);
  const [fait, setFait] = useState<{ departements: string[]; departement: string | null } | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  async function confirmer() {
    setPending(true);
    try {
      setFait(await api(`/v1/negoce/desabonner/${encodeURIComponent(jeton)}`, { method: "POST" }));
    } catch (e) {
      setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle>{NOM}</PageTitle>
      {erreur ? (
        <p role="status" className="rounded-xl bg-warn-bg p-4 font-semibold text-warn">
          Ce lien n&apos;est plus valable.
        </p>
      ) : fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 font-semibold text-ok">
          {fait.departement ? `C'est fait : vous ne recevrez plus les grilles du ${fait.departement}.` : "C'est fait : vous ne recevrez plus aucune grille."}
          {fait.departements.length > 0 ? ` Vous restez abonné à : ${fait.departements.join(", ")}.` : ""}
        </p>
      ) : (
        <>
          <p className="text-[16px] leading-relaxed">Ne plus recevoir les grilles de la {NOM} ? Vos commandes passées restent valables. Vous pourrez vous réabonner depuis votre espace.</p>
          <Button pending={pending} onClick={confirmer}>
            Confirmer le désabonnement
          </Button>
        </>
      )}
    </>
  );
}
