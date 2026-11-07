"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

/** Le lien magique ouvert : la session est posée (cookie de 30 jours), puis l'espace. Un lien passé le dit. */
export default function LienDeConnexionPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const router = useRouter();
  const [perime, setPerime] = useState(false);
  useEffect(() => {
    api(`/v1/negoce/connexion/${encodeURIComponent(jeton)}`, { method: "POST" })
      .then(() => router.replace("/negoce"))
      .catch(() => setPerime(true));
  }, [jeton, router]);
  if (!perime) return <Skeleton card="h-24" label="Connexion…" />;
  return (
    <>
      <PageTitle>Espace négoce</PageTitle>
      <p role="status" className="rounded-xl bg-warn-bg p-4 font-semibold text-warn">
        Ce lien de connexion n&apos;est plus valable (30 minutes). Demandez-en un nouveau.
      </p>
      <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">
        Recevoir un nouveau lien
      </Link>
    </>
  );
}
