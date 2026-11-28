"use client";

import { useEffect } from "react";

/**
 * CE QUI APPARAÎT SE MONTRE (Greg, 22 novembre 2026 : « quand je touche “longueurs”, ce qui s'ouvre apparaît caché sous
 * la barre “Continuer”, j'ai l'impression qu'il ne se passe rien »). Règle pour toute l'application :
 * 1. Après un toucher (bouton, choix, case), ce qui vient d'apparaître plus bas et reste caché, sous le bas de l'écran
 *    ou sous une barre fixée en bas, est amené en vue en douceur ; son premier champ à remplir est mis en avant.
 * 2. Les barres d'action fixées en bas (`data-barre-action`) donnent leur hauteur à la page (`--barre-action`) : le
 *    contenu ne passe jamais dessous, la page garde la place en bas.
 * Une fenêtre (dialogue) ou une zone qui défile seule (la discussion) gère son propre défilement : on n'y touche pas.
 */
const INTERACTIF = 'button, [role="button"], [role="radio"], [role="checkbox"], [role="tab"], [role="switch"], label, summary, input[type="radio"], input[type="checkbox"], select';
const CHAMP = 'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

/** La hauteur cachée en bas de l'écran par ce qui y est fixé (barre du menu, barre d'action), au point de toucher. */
export function hauteurCacheeEnBas(): number {
  const h = window.innerHeight;
  let haut = h;
  for (const x of [0.1, 0.5, 0.9]) {
    for (const el of document.elementsFromPoint(window.innerWidth * x, h - 2)) {
      let n: Element | null = el;
      while (n && n !== document.body) {
        const pos = getComputedStyle(n).position;
        if (pos === "fixed" || pos === "sticky") {
          haut = Math.min(haut, n.getBoundingClientRect().top);
          break;
        }
        n = n.parentElement;
      }
    }
  }
  return Math.max(0, h - haut);
}

/** Vrai quand l'élément est dans une fenêtre, un élément fixé ou une zone qui défile seule. */
function horsDeLaPage(el: Element): boolean {
  let n: Element | null = el;
  while (n && n !== document.body) {
    if (n.getAttribute("role") === "dialog" || n.tagName === "DIALOG") return true;
    const s = getComputedStyle(n);
    if (s.position === "fixed" || s.position === "sticky") return true;
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) return true;
    n = n.parentElement;
  }
  return false;
}

/** Amène `cible` en vue (au-dessus des barres du bas), puis met en avant son premier champ. */
export function reveler(cible: Element): void {
  const r = cible.getBoundingClientRect();
  if (r.height === 0 && r.width === 0) return;
  const basLibre = window.innerHeight - hauteurCacheeEnBas() - 12;
  const hautLibre = 72;
  let delta = 0;
  if (r.bottom > basLibre) delta = Math.min(r.bottom - basLibre, Math.max(0, r.top - hautLibre));
  const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (delta > 0) window.scrollBy({ top: delta, behavior: doux ? "smooth" : "auto" });
  const champ = cible.matches(CHAMP) ? cible : cible.querySelector(CHAMP);
  if (champ instanceof HTMLElement && !champ.dataset.revele) {
    champ.dataset.revele = "1";
    champ.classList.add("champ-revele");
    window.setTimeout(() => champ.classList.remove("champ-revele"), 1600);
    // Sur un écran tactile, un champ mis en avant n'ouvre pas le clavier tout seul : seulement à la souris.
    if (window.matchMedia("(pointer: fine)").matches) champ.focus({ preventScroll: true });
  }
}

export function RevelerApresToucher() {
  useEffect(() => {
    // 2. La place des barres d'action fixées en bas.
    const mesurer = () => {
      let h = 0;
      document.querySelectorAll<HTMLElement>("[data-barre-action]").forEach((b) => {
        if (getComputedStyle(b).position === "fixed" && b.getClientRects().length > 0) h = Math.max(h, b.getBoundingClientRect().height);
      });
      document.documentElement.style.setProperty("--barre-action", `${Math.ceil(h)}px`);
    };
    let attente = 0;
    const plusTard = () => {
      cancelAnimationFrame(attente);
      attente = requestAnimationFrame(mesurer);
    };
    const observeBarres = new MutationObserver(plusTard);
    observeBarres.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-barre-action"] });
    window.addEventListener("resize", plusTard);
    mesurer();

    // 1. Ce qui apparaît après un toucher.
    let fin = 0;
    let observe: MutationObserver | null = null;
    let ajoutes: Element[] = [];
    const conclure = () => {
      observe?.disconnect();
      observe = null;
      const visibles = ajoutes.filter((e) => e.isConnected && !horsDeLaPage(e) && e.getBoundingClientRect().height > 0);
      ajoutes = [];
      if (!visibles.length) return;
      // Le plus haut des éléments apparus : celui que l'artisan doit voir en premier.
      const premier = visibles.reduce((a, b) => (b.getBoundingClientRect().top < a.getBoundingClientRect().top ? b : a));
      reveler(premier);
    };
    const toucher = (ev: Event) => {
      const t = ev.target instanceof Element ? ev.target.closest(INTERACTIF) : null;
      if (!t || horsDeLaPage(t)) return;
      observe?.disconnect();
      ajoutes = [];
      observe = new MutationObserver((liste) => {
        for (const m of liste) m.addedNodes.forEach((n) => n instanceof Element && !["SCRIPT", "STYLE", "LINK"].includes(n.tagName) && ajoutes.push(n));
        window.clearTimeout(fin);
        fin = window.setTimeout(conclure, 120);
      });
      observe.observe(document.body, { childList: true, subtree: true });
      window.clearTimeout(fin);
      fin = window.setTimeout(conclure, 600);
    };
    document.addEventListener("click", toucher, true);
    return () => {
      document.removeEventListener("click", toucher, true);
      observeBarres.disconnect();
      observe?.disconnect();
      window.removeEventListener("resize", plusTard);
      cancelAnimationFrame(attente);
      window.clearTimeout(fin);
    };
  }, []);
  return null;
}
