"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOM, nom } from "@/lib/nom";

/**
 * « Ne plus recevoir ces e-mails » (RGPD, 24 octobre 2026) : le lien en bas de chaque e-mail de notification. Rien ne
 * change au chargement ; le bouton coupe les e-mails de l'entreprise (les bons de commande partent quand même). Compte →
 * E-mails les remet.
 */
export default function EmailsStopPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<{ entreprise: string; coupes: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    api<{ entreprise: string; coupes: boolean }>(`/v1/emails/stop/${encodeURIComponent(jeton)}`)
      .then(setPage)
      .catch((e: unknown) => setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);
  async function confirmer() {
    setPending(true);
    try {
      await api(`/v1/emails/stop/${encodeURIComponent(jeton)}`, { method: "POST" });
      setFait(true);
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
      ) : fait || page?.coupes ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 font-semibold text-ok">
          C&apos;est fait : tu ne recevras plus ces e-mails. Les bons de commande partent quand même. Tu peux les remettre depuis Compte.
        </p>
      ) : page ? (
        <>
          <p className="text-[16px] leading-relaxed">
            Ne plus recevoir les e-mails du {nom} pour {page.entreprise} ? Tu verras toujours tout dans l&apos;application.
          </p>
          <Button pending={pending} onClick={confirmer}>
            Ne plus recevoir ces e-mails
          </Button>
        </>
      ) : null}
    </>
  );
}
