"use client";

import { useParams } from "next/navigation";
import { SiMissions } from "@/components/missions";
import { RepondreFormulaire } from "@/components/missions-formulaires";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <RepondreFormulaire id={id} />
    </SiMissions>
  );
}
