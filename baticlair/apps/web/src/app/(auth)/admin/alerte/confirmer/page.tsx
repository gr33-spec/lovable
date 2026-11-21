"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

/** Le lien reçu sur la nouvelle adresse d'alerte (Greg, 14 novembre 2026) : le clic applique le changement tout de suite. */
function Confirmer() {
  const jeton = useSearchParams().get("jeton") ?? "";
  const [etat, setEtat] = useState<{ confirme: boolean; adresse: string | null } | "erreur" | null>(null);
  useEffect(() => {
    let vivant = true;
    api<{ confirme: boolean; adresse: string | null }>("/v1/public/admin/alerte/confirmer", { method: "POST", body: { jeton } })
      .then((r) => (vivant ? setEtat(r) : undefined))
      .catch(() => (vivant ? setEtat("erreur") : undefined));
    return () => {
      vivant = false;
    };
  }, [jeton]);
  if (etat === null) return <Spinner />;
  if (etat !== "erreur" && etat.confirme) return <p role="status" className="text-[17px]">C&apos;est fait : les alertes de Mobiiz partent maintenant vers <strong>{etat.adresse}</strong>.</p>;
  return <p role="alert" className="text-[17px]">Ce lien ne marche plus (déjà utilisé ou trop ancien). Rien n&apos;est changé. Redemande-le dans l&apos;espace admin, Réglages.</p>;
}

export default function ConfirmerAlertePage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Adresse d&apos;alerte</PageTitle>
      <Suspense fallback={<Spinner />}>
        <Confirmer />
      </Suspense>
    </div>
  );
}
