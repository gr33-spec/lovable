"use client";

import { useEffect, useState, type ReactNode } from "react";
import { santeUneFois } from "@/lib/sante";

/**
 * Ce qui parle des MISSIONS sur la page publique ne s'affiche que si le serveur les a ouvertes (`MISSIONS_V1`, lu dans
 * `/v1/health`) : la page ne promet jamais une fonction éteinte. Sans réponse du serveur, rien n'apparaît.
 */
export function useMissionsOuvertes(): boolean {
  const [ouvertes, setOuvertes] = useState(false);
  useEffect(() => {
    let vivant = true;
    santeUneFois()
      .then((h) => vivant && setOuvertes(h.features?.missions === true))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  return ouvertes;
}

export function SiMissions({ children }: { children: ReactNode }) {
  return useMissionsOuvertes() ? <>{children}</> : null;
}
