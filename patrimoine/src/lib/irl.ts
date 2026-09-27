// Indice de référence des loyers (IRL, INSEE, série 001515333).
// Calculs purs : quel trimestre était publié à une date, libellés, et indice
// du même trimestre l'année suivante (base de la révision annuelle).

export interface IrlPoint {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  value: number;
}

/** Date approximative de publication : mi-avril (T1), mi-juillet (T2), mi-octobre (T3), mi-janvier (T4). */
export function publicationDate(p: Pick<IrlPoint, "year" | "quarter">): string {
  if (p.quarter === 4) return `${p.year + 1}-01-15`;
  const month = { 1: "04", 2: "07", 3: "10" }[p.quarter as 1 | 2 | 3];
  return `${p.year}-${month}-15`;
}

export function irlLabel(p: Pick<IrlPoint, "year" | "quarter">): string {
  return `IRL du ${p.quarter === 1 ? "1er" : `${p.quarter}e`} trimestre ${p.year}`;
}

/** Dernier indice publié à une date (AAAA-MM-JJ). */
export function irlAt(series: IrlPoint[], date: string): IrlPoint | undefined {
  return [...series].filter((p) => publicationDate(p) <= date).sort((a, b) => b.year - a.year || b.quarter - a.quarter)[0];
}

/** Trimestre et année lus dans un libellé saisi (« IRL T2 2025 », « IRL du 2e trimestre 2025 »…). */
export function parseIrlLabel(label: string | undefined): Pick<IrlPoint, "year" | "quarter"> | undefined {
  if (!label) return undefined;
  const q = /T\s?([1-4])\b|([1-4])\s?(?:er|e|ème|eme)\s+trimestre/i.exec(label);
  const y = /\b(19|20)\d{2}\b/.exec(label);
  const quarter = Number(q?.[1] ?? q?.[2]);
  if (!quarter || !y) return undefined;
  return { year: Number(y[0]), quarter: quarter as 1 | 2 | 3 | 4 };
}

/** Indice de révision : même trimestre, un an après l'indice de référence du bail. */
export function nextYearSameQuarter(series: IrlPoint[], label: string | undefined): IrlPoint | undefined {
  const ref = parseIrlLabel(label);
  if (!ref) return undefined;
  return series.find((p) => p.year === ref.year + 1 && p.quarter === ref.quarter);
}

/** Observations d'une réponse SDMX de l'INSEE (<Obs TIME_PERIOD="2026-Q2" OBS_VALUE="146.12" …/>). */
export function parseSdmx(xml: string): IrlPoint[] {
  const out: IrlPoint[] = [];
  for (const m of xml.matchAll(/<Obs\b[^>]*>/g)) {
    const tag = m[0];
    const period = /TIME_PERIOD="(\d{4})-Q([1-4])"/.exec(tag);
    const value = /OBS_VALUE="([\d.]+)"/.exec(tag);
    if (period && value) out.push({ year: Number(period[1]), quarter: Number(period[2]) as 1 | 2 | 3 | 4, value: Number(value[1]) });
  }
  return out.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
}

