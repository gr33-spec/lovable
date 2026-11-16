"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfilPublicVu } from "@/components/compte-missions";
import { SiMissions } from "@/components/missions";
import { EcranTitre } from "@/components/ux-kit";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

/**
 * Le profil d'une entreprise dans Mission (Greg, 16 novembre 2026) : il OUVRE SON SITE quand elle en a un en ligne (le
 * bloc « Entre pros » y est réservé aux entreprises connectées) ; sans site, la fiche Mission d'avant.
 */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sansSite, setSansSite] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    api<{ adresse: string | null }>(`/v1/pages-entreprises/entreprise/${id}`, { signal: c.signal }).then(
      (r) => (r.adresse ? router.replace(`/e/${r.adresse}#entre-pros`) : setSansSite(true)),
      () => {
        if (!c.signal.aborted) setSansSite(true);
      },
    );
    return () => c.abort();
  }, [id, router]);
  return (
    <SiMissions>
      <EcranTitre titre="Profil de l'entreprise" retour="/missions" />
      {sansSite ? <ProfilPublicVu id={id} /> : <Skeleton lines={4} label="Ouverture du site de l'entreprise…" />}
    </SiMissions>
  );
}
