"use client";

import { useParams } from "next/navigation";
import { ProfilPublicVu } from "@/components/compte-missions";
import { SiMissions } from "@/components/missions";
import { EcranTitre } from "@/components/ux-kit";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <EcranTitre titre="Profil de l'entreprise" retour="/missions" />
      <ProfilPublicVu id={id} />
    </SiMissions>
  );
}
