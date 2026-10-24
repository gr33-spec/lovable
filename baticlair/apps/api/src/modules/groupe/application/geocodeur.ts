import type { Point } from "@baticlair/domain";

/**
 * LE GÉOCODEUR (décision de Greg, 22 octobre : « l'app calcule la distance jusqu'au chantier ») : une adresse → un point.
 * En ligne, la Base Adresse Nationale (API Adresse de l'État, gratuite, sans clé) ; en développement et en test, une table
 * fixe de communes (aucun appel réseau). `null` : adresse introuvable ou service muet ; la livraison se compte alors
 * « au-delà » (jamais une gratuité non vérifiée).
 */
export interface Geocodeur {
  point(adresse: string): Promise<Point | null>;
}

export const GEOCODEUR = Symbol("GEOCODEUR");

export class BanGeocodeur implements Geocodeur {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async point(adresse: string): Promise<Point | null> {
    const q = adresse.trim();
    if (q.length < 3) return null;
    try {
      const res = await this.fetchImpl(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const json = (await res.json()) as { features?: { geometry?: { coordinates?: [number, number] } }[] };
      const c = json.features?.[0]?.geometry?.coordinates;
      return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? { lon: c[0], lat: c[1] } : null;
    } catch {
      return null;
    }
  }
}

/** Les communes des tests et des parcours e2e, à quelques centièmes de degré près. */
const COMMUNES: Record<string, Point> = {
  "22000": { lat: 48.51, lon: -2.76 },
  "22200": { lat: 48.56, lon: -3.15 },
  "22300": { lat: 48.73, lon: -3.46 },
  "22500": { lat: 48.78, lon: -3.05 },
  "22620": { lat: 48.8, lon: -3.03 },
  "29200": { lat: 48.39, lon: -4.49 },
  "35000": { lat: 48.11, lon: -1.68 },
  "44000": { lat: 47.22, lon: -1.55 },
  "50100": { lat: 49.64, lon: -1.62 },
};

export class TableGeocodeur implements Geocodeur {
  async point(adresse: string): Promise<Point | null> {
    const cp = /\b(\d{5})\b/.exec(adresse)?.[1];
    return cp ? (COMMUNES[cp] ?? null) : null;
  }
}
