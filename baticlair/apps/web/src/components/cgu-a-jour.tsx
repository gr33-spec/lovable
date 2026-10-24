"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { cguAJour, VERSION_CGU } from "@/lib/legal";
import { useResource } from "@/lib/use-resource";

/**
 * UNE NOUVELLE VERSION MAJEURE DES CGU (mise en conformité du 24 octobre 2026) : un compte qui a accepté une version plus
 * ancienne la voit en haut de chaque écran, lit les CGU et les accepte d'une case. L'acceptation est horodatée par l'API
 * (`POST /v1/me/cgu`). Un bandeau, pas une fenêtre : il ne cache rien, il ne disparaît qu'une fois accepté.
 */
export function CguAJour() {
  const fetchEtat = useCallback((signal: AbortSignal) => api<{ accepteLe: string | null; version: string | null }>("/v1/me/cgu", { signal }), []);
  const { data, reload } = useResource(fetchEtat);
  const [coche, setCoche] = useState(false);
  const [pending, setPending] = useState(false);
  if (!data || cguAJour(data.version)) return null;
  async function accepter() {
    setPending(true);
    try {
      await api("/v1/me/cgu", { method: "POST", body: { version: VERSION_CGU } });
      reload();
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Nouvelles conditions" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4 text-ink">
      <p className="text-[15px] font-semibold">
        {`Nos conditions d'utilisation ont changé (version du ${VERSION_CGU.split("-").reverse().join("/")}). Lis-les et accepte-les pour continuer.`}
      </p>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.currentTarget.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" className="font-semibold underline">
            nouvelles conditions générales d&apos;utilisation
          </Link>
        </span>
      </label>
      <Button className="self-start" disabled={!coche} pending={pending} onClick={accepter}>
        Accepter
      </Button>
    </section>
  );
}
