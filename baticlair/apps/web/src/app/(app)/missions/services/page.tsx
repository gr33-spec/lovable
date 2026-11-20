"use client";

import { Suspense } from "react";
import { SiMissions } from "@/components/missions";
import { ServicesFormulaire } from "@/components/missions-formulaires";

export default function Page() {
  return (
    <SiMissions>
      <Suspense>
        <ServicesFormulaire />
      </Suspense>
    </SiMissions>
  );
}
