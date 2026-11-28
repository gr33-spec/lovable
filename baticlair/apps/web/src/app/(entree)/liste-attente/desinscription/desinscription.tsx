"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";

type Etat = "en-cours" | "fait" | "erreur";

export function Desinscription({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<Etat>("en-cours");
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    let fini = false;
    api("/v1/public/liste-attente/desinscription", { method: "POST", body: { jeton } }).then(
      () => !fini && setEtat("fait"),
      () => !fini && setEtat("erreur"),
    );
    return () => {
      fini = true;
    };
  }, [jeton, essai]);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="t-desinscription" aria-live="polite">
      <h1 id="t-desinscription" className="text-[30px] leading-tight font-extrabold tracking-tight">
        {etat === "fait" ? "C'est fait." : etat === "erreur" ? "Ça n'a pas marché." : "Un instant…"}
      </h1>
      {etat === "fait" ? (
        <p className="flex items-start gap-3 text-[17px] leading-relaxed">
          <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-ok text-white" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
          Tu es désinscrit de la liste d&apos;attente de Mobiiz. Tu ne recevras plus d&apos;e-mail d&apos;ouverture.
        </p>
      ) : null}
      {etat === "erreur" ? (
        <>
          <p className="text-[17px] leading-relaxed">Réessaie dans un instant.</p>
          <Button
            className="self-start"
            onClick={() => {
              setEtat("en-cours");
              setEssai((n) => n + 1);
            }}
          >
            Réessayer
          </Button>
        </>
      ) : null}
      <Link href="/" className="flex min-h-11 items-center self-start text-[16px] font-semibold underline underline-offset-4">
        Retour à l&apos;accueil de Mobiiz
      </Link>
    </section>
  );
}
