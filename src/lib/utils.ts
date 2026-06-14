/** Combine des classes Tailwind en ignorant les valeurs vides/false. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Formate un nombre en euros, sans décimales inutiles (ex: "1 234 €"). */
export function formatEuros(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.001;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded) + " €";
}
