// Les calculs travaillent en « index de mois » absolus : année × 12 + (mois − 1).

export type MonthIndex = number;

export function monthIndex(year: number, month1to12: number): MonthIndex {
  return year * 12 + (month1to12 - 1);
}

export function yearOf(m: MonthIndex): number {
  return Math.floor(m / 12);
}

export function monthOf(m: MonthIndex): number {
  return (m % 12) + 1;
}

/** Accepte AAAA, AAAA-MM ou AAAA-MM-JJ. Renvoie undefined si invalide. */
export function parseMonth(value: string | undefined | null): MonthIndex | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return undefined;
  return monthIndex(year, month);
}

export function currentMonth(now: Date = new Date()): MonthIndex {
  return monthIndex(now.getFullYear(), now.getMonth() + 1);
}

const MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function monthLabel(m: MonthIndex): string {
  return `${MONTHS_FR[monthOf(m) - 1]} ${yearOf(m)}`;
}
