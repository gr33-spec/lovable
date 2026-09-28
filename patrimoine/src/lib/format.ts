// Formats français : 1 234 567 €, 3,5 %, 1,2 M€.

export const INSUFFICIENT = "Données insuffisantes";

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function eur(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return eurFormatter.format(Math.round(value) === 0 ? 0 : value);
}

export function eurSigned(value: number): string {
  const s = eur(value);
  return value > 0.5 ? `+${s}` : s;
}

/** Format court pour les grands chiffres : 1,25 M€, 850 k€. */
export function eurCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    return `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: abs >= 10_000_000 ? 1 : 2 }).format(abs / 1_000_000)} M€`;
  }
  if (abs >= 10_000) {
    return `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(abs / 1000)} k€`;
  }
  return eur(value);
}

export function pct(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(value)} %`;
}

export function num(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

export function dateFr(iso: string | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!m) return y;
  if (!d) return `${m}/${y}`;
  return `${d}/${m}/${y}`;
}

/** Remplace les espaces fines insécables (non supportées par les polices PDF standard). */
export function pdfSafe(text: string): string {
  return text.replace(/[  ]/g, " ").replace(/−/g, "-");
}
