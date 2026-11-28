"use client";

import { Suspense } from "react";
import { PorteCreation } from "@/components/porte-creation";

/** « Publier un besoin groupé » (lot E, Greg, 15 novembre 2026) : le même outil de saisie, sans quitter « Achats groupés ». */
export default function PublierBesoinPage() {
  return (
    <Suspense>
      <PorteCreation pour="achat-groupe" />
    </Suspense>
  );
}
