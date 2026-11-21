/**
 * L'ANNUAIRE DES COMMUNES (Greg, 12 novembre 2026, dossier de corrections UX, point 4) : le code postal propose la commune,
 * la commune propose son code postal. En ligne, l'API Découpage administratif de l'État (geo.api.gouv.fr, gratuite, sans
 * clé, comme la Base Adresse Nationale du géocodeur) ; en développement et en test, une table fixe (aucun appel réseau).
 * Seul un code postal ou un début de nom part : jamais une donnée de l'artisan. Service muet : liste vide, la saisie
 * reste libre (rien n'est bloqué).
 */
export interface Commune {
  nom: string;
  codePostal: string;
}

export interface AnnuaireCommunes {
  /** Toutes les communes d'un code postal (plusieurs possibles : aucun choix arbitraire, l'artisan choisit). */
  parCodePostal(codePostal: string): Promise<Commune[]>;
  /** Les communes dont le nom commence par la saisie, une ligne par code postal. */
  parNom(debut: string): Promise<Commune[]>;
}

export const ANNUAIRE_COMMUNES = Symbol("ANNUAIRE_COMMUNES");

type HttpGet = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tri = (liste: Commune[]) => [...liste].sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.codePostal.localeCompare(b.codePostal));

export class GeoApiCommunes implements AnnuaireCommunes {
  private readonly cache = new Map<string, { le: number; communes: Commune[] }>();
  constructor(
    private readonly fetchImpl: HttpGet = fetch as unknown as HttpGet,
    private readonly now: () => number = Date.now,
  ) {}

  parCodePostal(codePostal: string): Promise<Commune[]> {
    if (!/^\d{5}$/.test(codePostal)) return Promise.resolve([]);
    return this.lire(`cp:${codePostal}`, `codePostal=${codePostal}`, (c) => [codePostal].filter((cp) => c.codesPostaux.includes(cp)));
  }

  parNom(debut: string): Promise<Commune[]> {
    const q = debut.trim();
    if (sansAccent(q).length < 2) return Promise.resolve([]);
    return this.lire(`nom:${sansAccent(q)}`, `nom=${encodeURIComponent(q)}&boost=population&limit=8`, (c) => c.codesPostaux);
  }

  private async lire(cle: string, requete: string, codes: (c: { codesPostaux: string[] }) => string[]): Promise<Commune[]> {
    const garde = this.cache.get(cle);
    if (garde && this.now() - garde.le < 86_400_000) return garde.communes;
    try {
      const res = await this.fetchImpl(`https://geo.api.gouv.fr/communes?${requete}&fields=nom,codesPostaux`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return [];
      const json = (await res.json()) as { nom?: unknown; codesPostaux?: unknown }[];
      const communes: Commune[] = [];
      for (const c of Array.isArray(json) ? json : []) {
        if (typeof c.nom !== "string" || !Array.isArray(c.codesPostaux)) continue;
        const cps = c.codesPostaux.filter((x): x is string => typeof x === "string" && /^\d{5}$/.test(x));
        for (const cp of codes({ codesPostaux: cps })) communes.push({ nom: c.nom, codePostal: cp });
      }
      const resultat = cle.startsWith("cp:") ? tri(communes) : communes.slice(0, 12);
      if (this.cache.size > 2000) this.cache.clear();
      this.cache.set(cle, { le: this.now(), communes: resultat });
      return resultat;
    } catch {
      return [];
    }
  }
}

/** Les communes des tests et des parcours : un code à une commune, un code à plusieurs communes, une commune à plusieurs codes. */
const TABLE: Commune[] = [
  { nom: "Plouha", codePostal: "22580" },
  { nom: "Lannion", codePostal: "22300" },
  { nom: "Ploubezre", codePostal: "22300" },
  { nom: "Ploulec'h", codePostal: "22300" },
  { nom: "Rospez", codePostal: "22300" },
  { nom: "Saint-Brieuc", codePostal: "22000" },
  { nom: "Paimpol", codePostal: "22500" },
  { nom: "Guingamp", codePostal: "22200" },
  { nom: "Brest", codePostal: "29200" },
  { nom: "Rennes", codePostal: "35000" },
  { nom: "Rennes", codePostal: "35200" },
  { nom: "Rennes", codePostal: "35700" },
  { nom: "Nantes", codePostal: "44000" },
];

export class TableCommunes implements AnnuaireCommunes {
  async parCodePostal(codePostal: string): Promise<Commune[]> {
    return tri(TABLE.filter((c) => c.codePostal === codePostal));
  }
  async parNom(debut: string): Promise<Commune[]> {
    const q = sansAccent(debut);
    return q.length < 2 ? [] : TABLE.filter((c) => sansAccent(c.nom).startsWith(q));
  }
}
