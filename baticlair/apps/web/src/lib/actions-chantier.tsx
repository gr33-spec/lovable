"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * LE MENU « ··· » DU CHANTIER (Greg, 28 octobre 2026, point 8 : « à chaque étape, un seul bouton principal, celui de la
 * prochaine action ; tout le reste va dans le menu ··· en haut à droite »). Les blocs du chantier (demande, liste)
 * déclarent leurs actions secondaires ici ; l'en-tête les montre dans son menu, dans un ordre fixe.
 */
export interface ActionChantier {
  id: IdAction;
  label: string;
  run: () => void;
}

export type IdAction = "ajouter-negoce" | "renvoyer" | "changer-negoce" | "modifier-liste" | "supprimer-demande";
const ORDRE: IdAction[] = ["ajouter-negoce", "renvoyer", "changer-negoce", "modifier-liste", "supprimer-demande"];

const Ctx = createContext<{ actions: ActionChantier[]; poser: (id: IdAction, a: ActionChantier) => void; retirer: (id: IdAction, a: ActionChantier) => void } | null>(null);

export function ActionsChantierProvider({ children }: { children: React.ReactNode }) {
  const [parId, setParId] = useState<Partial<Record<IdAction, ActionChantier>>>({});
  const poser = useCallback((id: IdAction, a: ActionChantier) => setParId((m) => (m[id] === a ? m : { ...m, [id]: a })), []);
  // Un bloc ne retire que l'action qu'il a posée : deux blocs peuvent proposer la même (« Ajouter un négoce »).
  const retirer = useCallback(
    (id: IdAction, a: ActionChantier) =>
      setParId((m) => {
        if (m[id] !== a) return m;
        const n = { ...m };
        delete n[id];
        return n;
      }),
    [],
  );
  const valeur = useMemo(() => ({ actions: ORDRE.flatMap((id) => (parId[id] ? [parId[id]!] : [])), poser, retirer }), [parId, poser, retirer]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

/** Les actions secondaires du chantier, dans l'ordre du menu. */
export function useActionsChantier(): ActionChantier[] {
  return useContext(Ctx)?.actions ?? [];
}

/** Déclare une action du menu tant que `actif` ; `run` peut changer sans faire clignoter le menu. */
export function useActionChantier(id: IdAction, label: string, run: () => void, actif: boolean) {
  const ctx = useContext(Ctx);
  const poser = ctx?.poser;
  const retirer = ctx?.retirer;
  const courant = useRef(run);
  useEffect(() => {
    courant.current = run;
  });
  useEffect(() => {
    if (!poser || !retirer || !actif) return;
    const a: ActionChantier = { id, label, run: () => courant.current() };
    poser(id, a);
    return () => retirer(id, a);
  }, [poser, retirer, id, label, actif]);
}
