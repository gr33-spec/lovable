"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOM } from "@/lib/nom";

interface Apercu {
  action: "stop" | "pas_concerne";
  negoce: string;
  famille: string | null;
  fait: boolean;
}

/**
 * LE LIEN D'UN E-MAIL AU NÉGOCE (parcours groupé, étape 3) : « pas concerné » décoche la famille, « stop » désinscrit ;
 * rien ne change au simple chargement du lien, tout se confirme d'un bouton.
 */
export default function LienNegocePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Apercu>("/v1/negoces/lien/apercu", { method: "POST", body: { jeton } })
      .then(setApercu)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);

  async function confirmer() {
    setPending(true);
    try {
      setApercu(await api<Apercu>("/v1/negoces/lien", { method: "POST", body: { jeton } }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <PageTitle>{NOM}</PageTitle>
        {/* Un jeton tronqué (400) ou inconnu (404) : c'est le lien qui ne vaut plus, jamais « un champ mal rempli ». */}
        {error.status === 400 || error.status === 404 ? (
          <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
            Ce lien n&apos;est plus valable.
          </p>
        ) : (
          <ErrorNotice error={error} />
        )}
      </>
    );
  }
  if (!apercu) return <Spinner />;
  const question = apercu.action === "stop" ? `${apercu.negoce} : ne plus recevoir aucune demande du regroupement ?` : `${apercu.negoce} : ne plus recevoir les demandes « ${apercu.famille} » ?`;
  return (
    <>
      <PageTitle>{NOM}</PageTitle>
      {apercu.fait ? (
        <p role="status" className="rounded-3xl bg-ok-bg p-4 font-semibold text-ok">
          C&apos;est fait. {apercu.action === "stop" ? "Vous ne recevrez plus de demande." : `Vous ne recevrez plus de demande « ${apercu.famille} ».`}
        </p>
      ) : (
        <>
          <p className="text-base font-semibold">{question}</p>
          <Button onClick={confirmer} pending={pending}>
            Confirmer
          </Button>
        </>
      )}
    </>
  );
}
