"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

/**
 * Chargement d'une donnée de l'API, partagé par tous les écrans :
 * données, erreur (avec code support) et « Réessayer ». Une réponse
 * arrivée après un changement de page ou de paramètres est ignorée.
 */
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (value) => {
        setData(value);
        setError(null);
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      },
    );
    return () => controller.abort();
  }, [fetcher, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  // SUIVI (18 novembre 2026) : relire sans jamais annuler la lecture en route. Avant, un suivi chaque seconde passait par
  // `reload`, qui annule la demande précédente : dès que le serveur mettait plus d'une seconde à répondre, aucune réponse
  // n'arrivait jamais et l'écran restait sur « Lecture… ». Ici, tant qu'une demande est en route, on n'en lance pas d'autre.
  const enRoute = useRef<typeof fetcher | null>(null);
  const actuel = useRef(fetcher);
  useEffect(() => {
    actuel.current = fetcher;
  }, [fetcher]);
  const refresh = useCallback(() => {
    const f = actuel.current;
    if (enRoute.current === f) return;
    enRoute.current = f;
    f(new AbortController().signal)
      .then(
        (value) => {
          if (actuel.current !== f) return;
          setData(value);
          setError(null);
        },
        (e: unknown) => {
          if (actuel.current !== f) return;
          setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
        },
      )
      .finally(() => {
        if (enRoute.current === f) enRoute.current = null;
      });
  }, []);

  return { data, setData, error, reload, refresh, loading: data === null && error === null };
}
