"use client";

import { useEffect, useState } from "react";

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el.matches("textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range])"));

/**
 * Le clavier du téléphone est-il ouvert (un champ de saisie a le focus) ? Les barres figées en bas (menu, « Calculer ma
 * liste ») se cachent pendant la saisie. Retour du fondateur (2026-10-12, captures iPhone) : une fois le clavier refermé,
 * Safari garde parfois l'écran visible rétréci et accroche une barre « en bas » au milieu de la page ; un défilement nul
 * au moment où le clavier se ferme lui fait recalculer l'écran. Jamais de position recalculée en JavaScript.
 */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (editable(e.target)) setTyping(true);
    };
    const onFocusOut = () =>
      window.setTimeout(() => {
        const still = editable(document.activeElement);
        setTyping(still);
        if (!still) window.scrollTo(window.scrollX, window.scrollY);
      }, 0);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return typing;
}
