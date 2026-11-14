"use client";

import { useParams } from "next/navigation";
import { AnnonceDetail, SiMissions } from "@/components/missions";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <AnnonceDetail id={id} />
    </SiMissions>
  );
}
