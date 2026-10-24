"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { useAbonnement } from "@/components/abonnement";
import { Button, Card, ErrorNotice, PageTitle } from "@/components/ui";
import { api, ApiError, type Formule } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * « PAIEMENT (SIMULATION) » (Greg, 24 octobre 2026) : en `PAIEMENT=simule`, à la place de Stripe Checkout. « Payer » et
 * « Échec du paiement » envoient les mêmes événements que Stripe (abonnement actif, ou paiement refusé et grâce).
 */
export default function PaiementSimulePage() {
  return (
    <Suspense>
      <Paiement />
    </Suspense>
  );
}

function Paiement() {
  const session = useSearchParams().get("session") ?? "";
  const router = useRouter();
  const { data } = useAbonnement();
  const chargerSession = useCallback((signal: AbortSignal) => api<{ formule: Formule }>(`/v1/abonnement/simulation/${encodeURIComponent(session)}`, { signal }), [session]);
  const formule = useResource(chargerSession).data?.formule;
  const offre = data?.offres.find((o) => o.formule === formule);
  const [pending, setPending] = useState<"payer" | "echec" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  async function envoyer(issue: "payer" | "echec") {
    setPending(issue);
    setError(null);
    try {
      await api(`/v1/abonnement/simulation/${encodeURIComponent(session)}`, { method: "POST", body: { issue } });
      router.push("/abonnement");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(null);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="rounded-xl bg-danger px-4 py-3 text-[15px] font-bold text-white">
        Mode test : aucun paiement réel
      </p>
      <PageTitle>Paiement (simulation)</PageTitle>
      <Card className="flex flex-col gap-4 p-5">
        <p className="text-[17px]">
          {formule === "annuel" ? "Abonnement annuel" : "Abonnement mensuel"} : <strong>{(formule === "annuel" ? offre?.details[0] : offre?.prix) ?? "\u00a0"}</strong>
          {offre?.ttc ? ` (${offre.ttc} TTC)` : ""}
          {formule === "mensuel" ? ", sans engagement." : formule === "annuel" ? ", renouvelé chaque année." : ""}
        </p>
        {error ? <ErrorNotice error={error} /> : null}
        <Button onClick={() => void envoyer("payer")} pending={pending === "payer"} disabled={!!pending} className="w-full">
          Payer
        </Button>
        <Button variant="secondary" onClick={() => void envoyer("echec")} pending={pending === "echec"} disabled={!!pending} className="w-full">
          Échec du paiement
        </Button>
      </Card>
    </div>
  );
}
