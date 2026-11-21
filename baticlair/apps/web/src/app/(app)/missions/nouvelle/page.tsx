"use client";

import { Suspense } from "react";
import { SiMissions } from "@/components/missions";
import { MissionFormulaire } from "@/components/missions-formulaires";

export default function Page() {
  return (
    <SiMissions>
      <Suspense>
        <MissionFormulaire />
      </Suspense>
    </SiMissions>
  );
}
