"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { eurosHt } from "@/lib/achat-groupe";

interface PageCommande {
  numero: number | null;
  client: string;
  totalHt: number;
  recue: boolean;
}

/** Le lien du bon de commande (point 18) : le négoce confirme « Commande reçue » d'un clic, sans inscription. Vouvoiement. */
export default function CommandeRecuePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const chemin = `/v1/public/achat-groupe/commande/${encodeURIComponent(jeton)}`;
  const [page, setPage] = useState<PageCommande | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    api<PageCommande>(chemin)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [chemin]);
  if (error) return <ErrorNotice error={error} />;
  if (!page) return <Skeleton card="h-40" lines={2} label="Chargement de la commande…" />;
  return (
    <div className="flex flex-col gap-5">
      <PageTitle>Bon de commande n° {page.numero}</PageTitle>
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-[17px] font-extrabold">{page.client}</p>
        <p className="text-[16px]">{eurosHt(page.totalHt)}, livraison comprise</p>
      </Card>
      {page.recue ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[16px] font-semibold text-ok">
          Merci : la réception est confirmée, le client est prévenu.
        </p>
      ) : (
        <>
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
          <Button
            pending={pending}
            onClick={() => {
              setPending(true);
              void api<PageCommande>(chemin, { method: "POST" })
                .then(setPage)
                .catch((e) => setErreur(messageErreur(e, {}, { vous: true })))
                .finally(() => setPending(false));
            }}
          >
            Commande reçue
          </Button>
        </>
      )}
    </div>
  );
}
