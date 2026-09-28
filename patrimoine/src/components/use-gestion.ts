"use client";

import { useStore } from "@/lib/store";
import { useSection } from "@/lib/nav";

/** L'écran est-il vu depuis la gestion locative (onglet Gestion, espace d'Enora) ? */
export function useInGestion(): boolean {
  const { role, view } = useStore();
  const section = useSection();
  return role === "gestion" || view === "gestion" || section === "gestion";
}
