"use client";

import { useParams } from "next/navigation";
import { ReponsesRecues, SiMissions } from "@/components/missions";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <ReponsesRecues id={id} />
    </SiMissions>
  );
}
