"use client";

import { useParams } from "next/navigation";
import { ReponseDetail, SiMissions } from "@/components/missions";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <ReponseDetail id={id} />
    </SiMissions>
  );
}
