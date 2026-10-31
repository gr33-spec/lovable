"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * LES BROUILLONS (correction après test de Greg, 30 octobre 2026, point 2 : « je vais dans le menu puis je reviens :
 * tout est perdu »). Un parcours garde sa saisie et son étape sur le serveur, à chaque geste ; en revenant, il reprend
 * exactement où on l'a quitté ; l'accueil propose « Reprendre ». Fini, il s'efface.
 */
export interface Brouillon<T> {
  cle: string;
  type: "achat-groupe" | "liste" | "envoi";
  titre: string;
  url: string;
  etape: number;
  donnees: T;
  modifieLe: string;
}

export interface MetaBrouillon<T> {
  type: Brouillon<T>["type"];
  url: string;
  /** Ce que dit la carte « Reprendre » (« Achat groupé : 3 lignes »). */
  titre: (donnees: T, etape: number) => string;
  /** Un parcours vide (rien de saisi) n'est pas un brouillon. */
  vide: (donnees: T, etape: number) => boolean;
}

/** `pret` : le brouillon est relu (ou il n'y en a pas) ; avant, l'écran attend pour ne rien écraser. */
export function useBrouillon<T extends Record<string, unknown>>(cle: string | null, meta: MetaBrouillon<T>, initial: T) {
  const [donnees, setDonnees] = useState<T>(initial);
  const [etape, setEtape] = useState(1);
  const [pret, setPret] = useState(cle === null);
  const [repris, setRepris] = useState(false);
  const touche = useRef(false);
  const fini = useRef(false);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  });

  useEffect(() => {
    if (!cle) return;
    const c = new AbortController();
    api<{ brouillon: Brouillon<T> | null }>(`/v1/brouillons/un?cle=${encodeURIComponent(cle)}`, { signal: c.signal }).then(
      (r) => {
        if (r.brouillon && !touche.current) {
          setDonnees({ ...initial, ...r.brouillon.donnees });
          setEtape(r.brouillon.etape);
          setRepris(true);
        }
        setPret(true);
      },
      () => !c.signal.aborted && setPret(true),
    );
    return () => c.abort();
    // `initial` ne sert qu'à compléter un brouillon d'une version antérieure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  const ecrire = useCallback(
    (d: T, e: number, keepalive = false) => {
      if (!cle || fini.current || !touche.current) return;
      const m = metaRef.current;
      if (m.vide(d, e)) return void api(`/v1/brouillons?cle=${encodeURIComponent(cle)}`, { method: "DELETE", keepalive }).catch(() => undefined);
      void api("/v1/brouillons", { method: "PUT", body: { cle, type: m.type, titre: m.titre(d, e).slice(0, 160), url: m.url, etape: e, donnees: d }, keepalive }).catch(() => undefined);
    },
    [cle],
  );

  // À chaque geste (un instant après), et en quittant l'écran (menu, retour, onglet fermé).
  const dernier = useRef({ d: donnees, e: etape });
  useEffect(() => {
    dernier.current = { d: donnees, e: etape };
    if (!pret) return;
    const t = setTimeout(() => ecrire(donnees, etape), 400);
    return () => clearTimeout(t);
  }, [donnees, etape, pret, ecrire]);
  useEffect(() => {
    const partir = () => ecrire(dernier.current.d, dernier.current.e, true);
    window.addEventListener("pagehide", partir);
    return () => {
      window.removeEventListener("pagehide", partir);
      partir();
    };
  }, [ecrire]);

  // Un geste fait avant la relecture du brouillon (un réglage d'office de l'écran) ne compte pas : le brouillon l'emporte.
  const pretRef = useRef(pret);
  useEffect(() => {
    pretRef.current = pret;
  }, [pret]);
  const modifier = useCallback((f: (d: T) => T) => {
    if (pretRef.current) touche.current = true;
    setDonnees(f);
  }, []);
  // Changer d'étape s'écrit tout de suite (la saisie, elle, un instant après la frappe).
  const allerA = useCallback(
    (e: number | ((x: number) => number)) => {
      touche.current = true;
      const suivante = typeof e === "function" ? e(dernier.current.e) : e;
      setEtape(suivante);
      ecrire(dernier.current.d, suivante);
    },
    [ecrire],
  );
  /** Le parcours est fini (envoyé) : le brouillon s'efface et ne se réécrit plus. */
  const effacer = useCallback(() => {
    fini.current = true;
    if (cle) void api(`/v1/brouillons?cle=${encodeURIComponent(cle)}`, { method: "DELETE" }).catch(() => undefined);
  }, [cle]);

  return { pret, repris, donnees, modifier, etape, allerA, effacer };
}
