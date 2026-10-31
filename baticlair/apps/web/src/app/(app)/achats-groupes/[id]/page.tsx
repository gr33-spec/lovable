"use client";

import { useParams } from "next/navigation";
import { DetailAchatGroupe } from "@/components/achat-groupe";
import { BackButton } from "@/components/ui";

/** Le détail d'une participation à un achat groupé (Greg, 27 octobre 2026, point 8). */
export default function AchatGroupePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <DetailAchatGroupe id={id} />
    </>
  );
}
