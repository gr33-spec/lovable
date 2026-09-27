"use client";

import { useEffect, useState } from "react";
import type { IrlPoint } from "./irl";

// Série IRL chargée une fois par session de navigation.
let cache: Promise<IrlPoint[] | null> | null = null;

export function useIrlSeries(): IrlPoint[] | null {
  const [series, setSeries] = useState<IrlPoint[] | null>(null);
  useEffect(() => {
    if (!cache) {
      cache = fetch("/api/irl")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j?.series?.length ? (j.series as IrlPoint[]) : null))
        .catch(() => null);
    }
    let alive = true;
    cache.then((s) => {
      if (alive) setSeries(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return series;
}
