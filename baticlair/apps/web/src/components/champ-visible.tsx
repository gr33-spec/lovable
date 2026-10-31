"use client";

import { useEffect } from "react";

const editable = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement && (el.isContentEditable || el.matches("textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range])"));

/**
 * RÈGLE POUR TOUTE L'APP (Greg, 28 octobre 2026, point 1 : « quand j'écris, je ne vois pas ce que je tape ») : un champ qui
 * prend le focus reste visible au-dessus du clavier. Sur iPhone Safari, le clavier rétrécit la zone visible
 * (`visualViewport`) sans décaler la page : on amène le champ dans la zone visible au focus, puis à chaque fois que le
 * clavier change de taille. Aucun élément n'est recalé en JavaScript : seul le défilement bouge (jamais la barre du bas,
 * qui se cache pendant la saisie).
 */
export function ChampVisible() {
  useEffect(() => {
    const vv = window.visualViewport;
    let courant: HTMLElement | null = null;
    const amener = () => {
      if (!courant || document.activeElement !== courant) return;
      const r = courant.getBoundingClientRect();
      const haut = vv?.offsetTop ?? 0;
      const bas = haut + (vv?.height ?? window.innerHeight);
      if (r.bottom > bas - 12 || r.top < haut + 12) courant.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!editable(e.target as Element | null)) return;
      courant = e.target as HTMLElement;
      // Le clavier met quelques dixièmes à s'ouvrir : on regarde tout de suite, puis une fois ouvert.
      window.setTimeout(amener, 50);
      window.setTimeout(amener, 350);
    };
    const onFocusOut = () => {
      courant = null;
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", amener);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", amener);
    };
  }, []);
  return null;
}
