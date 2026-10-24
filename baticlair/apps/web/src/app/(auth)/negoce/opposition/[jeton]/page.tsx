"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOM, NOM_APP } from "@/lib/nom";

/**
 * « Ne plus jamais être contacté » (RGPD, 24 octobre 2026) : le lien de chaque e-mail d'invitation. Rien ne change au
 * chargement ; le bouton efface le compte du négoce et le met sur la liste d'exclusion (aucun artisan ne pourra plus le
 * faire contacter).
 */
export default function OppositionPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<{ enseigne: string | null; deja: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    api<{ enseigne: string | null; deja: boolean }>(`/v1/negoce/opposition/${encodeURIComponent(jeton)}`)
      .then(setPage)
      .catch((e: unknown) => setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);
  async function confirmer() {
    setPending(true);
    try {
      await api(`/v1/negoce/opposition/${encodeURIComponent(jeton)}`, { method: "POST" });
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
      ) : fait || page?.deja ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 font-semibold text-ok">
          C&apos;est fait : vous ne serez plus jamais contacté par {NOM_APP}. Vos coordonnées sont effacées ; seule une empreinte reste, pour que personne ne puisse
          vous réinviter.
        </p>
      ) : page ? (
        <>
          <p className="text-[16px] leading-relaxed">
            Ne plus jamais être contacté{page.enseigne ? ` (${page.enseigne})` : ""} ? Votre accès et vos coordonnées sont effacés, et aucun artisan ne pourra plus
            vous faire inviter à la {NOM}.
          </p>
          <Button pending={pending} onClick={confirmer}>
            Ne plus jamais être contacté
          </Button>
        </>
      ) : null}
    </>
  );
}
