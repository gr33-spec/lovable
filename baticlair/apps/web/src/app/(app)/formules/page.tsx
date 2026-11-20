"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlansScreen, useBilling } from "@/components/paywall";
import { BackButton } from "@/components/ui";

/**
 * L'ancien écran des formules (par nombre de chantiers, `PAYWALL=on`) : remplacé par l'abonnement unique du 24 octobre
 * 2026 (« Mon abonnement »). Le code reste (« rien n'est supprimé ») : il ne s'affiche que si l'ancien paywall est rallumé ;
 * sinon l'adresse mène à « Mon abonnement ».
 */
export default function FormulesPage() {
  const router = useRouter();
  const { data } = useBilling();
  const ancien = data?.payant === true;
  useEffect(() => {
    if (data && !ancien) router.replace("/abonnement");
  }, [data, ancien, router]);
  return ancien ? (
    <>
      <BackButton fallback="/compte" />
      <PlansScreen />
    </>
  ) : null;
}
