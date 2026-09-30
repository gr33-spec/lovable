export const USAGE_TIMEZONE = "Europe/Paris";

/** Mois civil à Paris, au format « 2026-09 » : l'unité des paliers d'abonnement. */
export function currentMonth(now: Date, timeZone = USAGE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}
