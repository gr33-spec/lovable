"use client";

import { useParams } from "next/navigation";
import { MessageEnvoye } from "@/components/messagerie";
import { EcranTitre } from "@/components/ux-kit";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <EcranTitre titre="Message envoyé" retour="/messages" />
      <MessageEnvoye id={id} />
    </>
  );
}
