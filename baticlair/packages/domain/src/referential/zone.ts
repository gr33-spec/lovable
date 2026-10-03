/**
 * ZONE CLIMATIQUE (1 intérieur, 2 intermédiaire, 3 littoral et montagne),
 * déduite du code postal du chantier : elle fixe le recouvrement de l'ardoise
 * et l'espacement des crochets de gouttière. Table par département du
 * référentiel du fondateur (façade atlantique et Manche, Corse, massifs) ;
 * l'altitude et la distance exacte à la côte ne sont pas connues : à
 * l'échelle du département, on prend le cas le plus exposé, et l'artisan
 * corrige d'un geste. Sans code postal : zone 3 (bord de mer), dite.
 */
const ZONE_3_DEPARTMENTS = new Set([
  // Façade atlantique et Manche.
  "22", "29", "56", "35", "44", "85", "17", "33", "40", "64", "50", "14", "76", "62", "59", "80",
  // Corse, Alpes et Pyrénées (altitude > 500 m fréquente).
  "2A", "2B", "20", "04", "05", "06", "38", "73", "74", "09", "65", "66",
]);
const ZONE_2_DEPARTMENTS = new Set([
  // Bande de 20 à 40 km des côtes, ou 200 à 500 m d'altitude (approximation départementale).
  "27", "61", "53", "49", "79", "16", "24", "47", "32", "31", "11", "34", "30", "13", "83", "84", "26", "07", "48", "12", "15", "43", "63", "42", "69", "01", "39", "25", "70", "90", "88", "68", "67", "57", "54", "55", "08", "02", "60",
]);

/**
 * Départements qui touchent la mer (Manche, Atlantique, Méditerranée, Corse, outre-mer) : crochet
 * d'ardoise inox 2,7 mm d'office (§34). À l'échelle du département, comme la zone : l'artisan corrige.
 */
const COASTAL_DEPARTMENTS = new Set([
  "59", "62", "80", "76", "27", "14", "50", "35", "22", "29", "56", "44", "85", "17", "33", "40", "64",
  "66", "11", "34", "30", "13", "83", "06", "2A", "2B",
  "971", "972", "973", "974", "975", "976", "977", "978", "986", "987", "988",
]);

/** « 22500 », « 2A004 » → « 22 », « 2A » ; null sans code postal reconnaissable. */
export function departmentOf(postalCode: string): string | null {
  const m = /^\s*(\d{5})\s*$/.exec(postalCode);
  if (!m) return null;
  const code = m[1]!;
  if (code.startsWith("20")) return Number(code) < 20200 ? "2A" : "2B";
  if (code.startsWith("97") || code.startsWith("98")) return code.slice(0, 3);
  return code.slice(0, 2);
}

/** Le code postal écrit dans une adresse libre (« 3 impasse des Lilas, 22500 Paimpol »). */
export function postalCodeIn(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = /(?:^|[^\d])(\d{5})(?!\d)/.exec(address);
  return m ? m[1]! : null;
}

export function climateZone(postalCode: string | null | undefined): 1 | 2 | 3 | null {
  const dept = postalCode ? departmentOf(postalCode) : null;
  if (!dept) return null;
  if (ZONE_3_DEPARTMENTS.has(dept)) return 3;
  if (ZONE_2_DEPARTMENTS.has(dept)) return 2;
  return 1;
}

/** Chantier dans un département littoral ; null sans code postal (rien n'est supposé). */
export function isCoastal(postalCode: string | null | undefined): boolean | null {
  const dept = postalCode ? departmentOf(postalCode) : null;
  return dept ? COASTAL_DEPARTMENTS.has(dept) : null;
}
