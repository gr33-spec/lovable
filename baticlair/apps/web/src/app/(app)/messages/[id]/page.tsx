"use client";

import { useParams } from "next/navigation";
import { Conversation } from "@/components/messages";
import { SiMissions } from "@/components/missions";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <SiMissions>
      <Conversation id={id} />
    </SiMissions>
  );
}
