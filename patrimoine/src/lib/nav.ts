"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Historique de navigation réel. Chaque entrée de l'historique du navigateur
// porte un rang (__idx) et une clé (__key) :
// - « Retour » revient à l'entrée précédente quand elle appartient à
//   l'application ; sinon (lien direct, nouvel onglet) il remonte d'un niveau
//   dans la hiérarchie, sans empiler d'entrée ;
// - les panneaux (feuilles, visionneuse) ont leur propre entrée : le geste ou
//   le bouton Retour du téléphone les ferme au lieu de quitter l'écran. Un
//   panneau fermé autrement laisse une entrée « morte », sautée au passage ;
// - la position de défilement et l'état des listes (recherche, filtres,
//   sections ouvertes) sont gardés par entrée et restitués au retour.
// Next.js traite le retour avant nos écouteurs : tout se lit donc dans
// l'entrée courante (history.state), jamais dans l'ordre des événements.

type Hist = { __idx?: number; __key?: string; __overlay?: string; __dead?: boolean } & Record<string, unknown>;

let installed = false;
/** Rubrique du dernier écran affiché. */
let lastSection: Section | null = null;
let hydrated = false;
let restoring = false;
/** Entrée affichée au dernier changement d'écran (sert au défilement). */
let shownKey = "";
/** Dernière entrée connue (sert au sens de navigation). */
let last: { idx: number; state: Hist; href: string } = { idx: 0, state: {}, href: "" };
const liveOverlays = new Map<string, { idx: number; close: () => void }>();

const STORE = "patrimoine:nav";
type Saved = { scroll: Record<string, number>; state: Record<string, unknown>; order: string[] };
let saved: Saved = { scroll: {}, state: {}, order: [] };

const rnd = () => Math.random().toString(36).slice(2, 10);
const cur = (): Hist => (history.state ?? {}) as Hist;
const curIdx = () => {
  const i = cur().__idx;
  return typeof i === "number" ? i : last.idx;
};
const curKey = () => cur().__key ?? "";
const isDead = (s: Hist) => !!s.__dead || (!!s.__overlay && !liveOverlays.has(s.__overlay));
const sameUrl = (a: string, b: string) => a.split("#")[0] === b.split("#")[0];

function persist() {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(saved));
  } catch {
    /* navigation privée : l'état n'est gardé qu'en mémoire */
  }
}

function touch(k: string) {
  if (!k) return;
  saved.order = [...saved.order.filter((x) => x !== k), k].slice(-150);
  const keep = new Set(saved.order);
  for (const s of [saved.scroll, saved.state] as Record<string, unknown>[]) {
    for (const name of Object.keys(s)) if (!keep.has(name.split("|")[0])) delete s[name];
  }
}

function saveScroll() {
  if (!shownKey || restoring) return;
  saved.scroll[shownKey] = window.scrollY;
  touch(shownKey);
  persist();
}

function remember() {
  last = { idx: curIdx(), state: cur(), href: location.href };
}

/** À appeler une fois côté navigateur (AppShell). */
export function installNavigation() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    saved = { scroll: {}, state: {}, order: [], ...JSON.parse(sessionStorage.getItem(STORE) ?? "{}") };
  } catch {
    /* rien à reprendre */
  }
  history.scrollRestoration = "manual";

  const push = history.pushState;
  const replace = history.replaceState;
  history.pushState = function (data: Hist | null, unused: string, u?: string | URL | null) {
    push.call(history, { ...(data ?? {}), __idx: curIdx() + 1, __key: rnd() }, unused, u);
    remember();
  };
  history.replaceState = function (data: Hist | null, unused: string, u?: string | URL | null) {
    // L'entrée courante fait foi (un retour peut être en cours, popstate pas encore reçu).
    const c = cur();
    const d = data ?? {};
    const next: Hist = { ...d, __idx: curIdx(), __key: c.__key ?? rnd() };
    if (!("__overlay" in d) && c.__overlay) next.__overlay = c.__overlay;
    if (!("__dead" in d) && c.__dead) next.__dead = true;
    const same = c.__key === last.state.__key;
    replace.call(history, next, unused, u);
    if (same) remember();
  };
  history.replaceState(cur(), "", location.href);
  remember();
  shownKey = curKey();

  window.addEventListener("popstate", () => {
    const from = last;
    const now = cur();
    const idx = curIdx();
    // (Avant de fermer les panneaux : un panneau encore ouvert n'est pas une entrée morte.)
    const fromDead = isDead(from.state);
    remember();
    // Panneaux dont l'entrée a été quittée en reculant : ils se ferment.
    for (const [id, o] of [...liveOverlays]) if (idx < o.idx && now.__overlay !== id) o.close();
    // Entrée morte (panneau déjà fermé) : on poursuit dans le même sens.
    if (isDead(now)) {
      if (idx < from.idx) history.back();
      else if (idx > from.idx) history.forward();
      return;
    }
    // On quitte en reculant une entrée morte du même écran : un cran de plus,
    // sinon l'appui sur Retour semblerait sans effet.
    if (idx < from.idx && fromDead && sameUrl(from.href, location.href) && idx > 0) history.back();
  });
  // Mémorise la position au moment où l'on quitte l'écran (appui sur un lien, un bouton…).
  window.addEventListener("click", saveScroll, true);
  let raf = 0;
  window.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (shownKey && !restoring && curKey() === shownKey) saved.scroll[shownKey] = window.scrollY;
      });
    },
    { passive: true },
  );
  window.addEventListener("pagehide", saveScroll);
}

/** Appelé après chaque changement d'écran : restitue la position au retour. */
export function afterRouteChange() {
  hydrated = true;
  // Après la mise à jour de l'historique par Next.js (nouvelle entrée poussée).
  setTimeout(applyRoute, 0);
}

function applyRoute() {
  const k = curKey();
  // Rubrique de l'écran affiché : gardée avec son entrée, transmise aux écrans ouverts depuis lui.
  if (k) {
    const root = rootSection(location.pathname, location.search);
    const sec = root ?? (saved.state[`${k}|§`] as Section | undefined) ?? lastSection ?? "patrimoine";
    saved.state[`${k}|§`] = sec;
    lastSection = sec;
    touch(k);
    persist();
  }
  if (!k || k === shownKey) return;
  shownKey = k;
  // Clé déjà connue = retour (ou avance) sur une entrée existante.
  const y = saved.scroll[k];
  if (!y) return;
  let tries = 0;
  restoring = true;
  const step = () => {
    window.scrollTo(0, y);
    // Le contenu peut s'afficher en plusieurs temps : on insiste quelques images.
    if (Math.abs(window.scrollY - y) > 2 && tries++ < 40 && curKey() === k) requestAnimationFrame(step);
    else requestAnimationFrame(() => (restoring = false));
  };
  step();
}

// ——— Rubrique (onglet) ———

export type Section = "accueil" | "patrimoine" | "gestion" | "plus";

/** Rubrique d'un écran de premier niveau ; null pour une fiche, qui garde la rubrique d'où on l'a ouverte. */
export function rootSection(pathname: string, search = ""): Section | null {
  if (pathname === "/") return "accueil";
  if (pathname === "/patrimoine") return "patrimoine";
  if (pathname === "/gestion") return "gestion";
  if (pathname.startsWith("/plus") || pathname.startsWith("/simulations") || pathname.startsWith("/chronologie") || pathname.startsWith("/documents")) return "plus";
  if (search.includes("depuis=gestion")) return "gestion";
  return null;
}

/**
 * Onglet à mettre en évidence : une fiche (immeuble, lot, crédit…) reste dans
 * la rubrique d'où l'utilisateur l'a ouverte (un lot ouvert depuis Gestion
 * reste dans Gestion), pour qu'il sache toujours où il se trouve.
 */
export function useSection(): Section {
  const pathname = usePathname();
  // Paramètres du nouvel écran (l'adresse du navigateur n'est mise à jour qu'après l'affichage).
  const search = useSearchParams().toString();
  const root = rootSection(pathname, search);
  if (root) return root;
  if (typeof window === "undefined" || !hydrated) return "patrimoine";
  return (saved.state[`${curKey()}|§`] as Section | undefined) ?? lastSection ?? "patrimoine";
}

/** Existe-t-il un écran précédent dans l'application (même onglet) ? */
export function canGoBack(): boolean {
  return installed && curIdx() > 0;
}

type Router = { back: () => void; replace: (href: string, opts?: { scroll?: boolean }) => void };

/** Retour : écran précédent réel, sinon le niveau supérieur (sans empiler d'entrée). */
export function goBack(router: Router, fallback = "/") {
  if (!canGoBack()) return router.replace(fallback);
  // Un panneau ouvert ou refermé laisse une entrée du même écran : on la saute aussi.
  const c = cur();
  if ((c.__overlay || c.__dead) && curIdx() > 1) history.go(-2);
  else router.back();
}

/**
 * Entrée d'historique pour un panneau (feuille, visionneuse) : Retour le ferme.
 * Renvoie la fonction à appeler quand le panneau se ferme autrement.
 */
export function openOverlay(onClose: () => void): () => void {
  if (!installed) return () => undefined;
  const id = rnd();
  const c = cur();
  // Une entrée morte du même écran est réutilisée plutôt que d'en empiler une autre.
  if (isDead(c)) history.replaceState({ ...c, __overlay: id, __dead: false }, "");
  else history.pushState({ ...c, __overlay: id, __dead: false }, "");
  let done = false;
  const finish = () => {
    done = true;
    liveOverlays.delete(id);
  };
  liveOverlays.set(id, {
    idx: curIdx(),
    close: () => {
      if (done) return;
      finish();
      onClose();
    },
  });
  return () => {
    if (done) return;
    finish();
    // Fermé par l'écran (bouton, navigation) : l'entrée devient morte, sans
    // retour programmé qui pourrait annuler une navigation en cours.
    if (cur().__overlay === id) history.replaceState({ ...cur(), __overlay: undefined, __dead: true }, "");
  };
}

/** Met à jour l'adresse de l'écran courant (filtre, onglet, étape…) sans créer d'entrée. */
export function replaceQuery(params: Record<string, string | undefined>) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") u.searchParams.delete(k);
    else u.searchParams.set(k, v);
  }
  // Sans l'état interne de Next.js : il se met alors à jour (useSearchParams suit l'adresse).
  if (u.href !== location.href) history.replaceState(null, "", u.pathname + u.search + u.hash);
}

/**
 * État d'écran gardé avec l'entrée d'historique : revenir sur l'écran
 * retrouve la recherche, le filtre ou les sections ouvertes.
 */
export function usePageState<T>(name: string, initial: T | (() => T)): [T, (v: T | ((cur: T) => T)) => void] {
  const pathname = usePathname();
  const [value, setValue] = useState<T>(() => {
    // Au retour, l'entrée courante est déjà celle de l'écran affiché.
    const id = typeof window === "undefined" ? "" : `${curKey()}|${pathname}|${name}`;
    if (hydrated && id in saved.state) return saved.state[id] as T;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    // Après le premier affichage, l'entrée de l'écran existe (y compris pour un nouvel écran).
    const k = curKey();
    if (!k) return;
    saved.state[`${k}|${pathname}|${name}`] = value;
    touch(k);
    persist();
  }, [value, name, pathname]);
  return [value, setValue];
}
