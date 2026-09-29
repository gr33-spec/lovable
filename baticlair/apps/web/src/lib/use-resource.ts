"use client";

import { useCallback, useEffect, useState } from "react";
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

  return { data, setData, error, reload, loading: data === null && error === null };
}
