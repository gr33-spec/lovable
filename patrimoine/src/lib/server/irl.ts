import "server-only";
import { parseSdmx, type IrlPoint } from "../irl";

// Lecture de la série IRL publiée par l'INSEE (données publiques, sans clé).
// Mise en cache 12 h ; en cas d'échec, l'application reste en saisie manuelle.

const SERIES = "001515333";
const SOURCES = [
  process.env.IRL_API ? `${process.env.IRL_API}/${SERIES}` : undefined,
  `https://api.insee.fr/series/BDM/data/SERIES_BDM/${SERIES}`,
  `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/${SERIES}`,
].filter(Boolean) as string[];

const g = globalThis as unknown as { irlCache?: { at: number; series: IrlPoint[] } };

export async function irlSeries(): Promise<IrlPoint[]> {
  if (g.irlCache && Date.now() - g.irlCache.at < 12 * 3600 * 1000) return g.irlCache.series;
  let lastError: unknown;
  for (const base of SOURCES) {
    try {
      const res = await fetch(`${base}?lastNObservations=24`, { headers: { Accept: "application/xml" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const series = parseSdmx(await res.text());
      if (series.length === 0) throw new Error("série vide");
      g.irlCache = { at: Date.now(), series };
      return series;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Indice INSEE indisponible (${String((lastError as Error)?.message ?? lastError)})`);
}
