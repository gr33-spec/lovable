/**
 * LA RECHERCHE GÉOGRAPHIQUE (Greg, 6 novembre 2026, prompt maître point 10 ; lot 5) : un secteur se dit par département,
 * par région ou par un rayon autour de son département. Sans service payant ni dépendance : chaque département a les
 * coordonnées de son chef-lieu (arrondies au 0,01°) et sa région ; une distance est celle, à vol d'oiseau, entre deux
 * chefs-lieux. C'est une approximation dite comme telle (« ≈ 110 km »), jamais une distance de livraison.
 * Code pur, sans import interne (le web l'importe directement).
 */

export interface Departement {
  code: string;
  nom: string;
  region: string;
  lat: number;
  lon: number;
}

/* prettier-ignore */
const TABLE: readonly [string, string, string, number, number][] = [
  ["01", "Ain", "Auvergne-Rhône-Alpes", 46.21, 5.23],
  ["02", "Aisne", "Hauts-de-France", 49.56, 3.62],
  ["03", "Allier", "Auvergne-Rhône-Alpes", 46.57, 3.33],
  ["04", "Alpes-de-Haute-Provence", "Provence-Alpes-Côte d'Azur", 44.09, 6.24],
  ["05", "Hautes-Alpes", "Provence-Alpes-Côte d'Azur", 44.56, 6.08],
  ["06", "Alpes-Maritimes", "Provence-Alpes-Côte d'Azur", 43.70, 7.27],
  ["07", "Ardèche", "Auvergne-Rhône-Alpes", 44.74, 4.60],
  ["08", "Ardennes", "Grand Est", 49.77, 4.72],
  ["09", "Ariège", "Occitanie", 42.97, 1.61],
  ["10", "Aube", "Grand Est", 48.30, 4.08],
  ["11", "Aude", "Occitanie", 43.21, 2.35],
  ["12", "Aveyron", "Occitanie", 44.35, 2.57],
  ["13", "Bouches-du-Rhône", "Provence-Alpes-Côte d'Azur", 43.30, 5.37],
  ["14", "Calvados", "Normandie", 49.18, -0.37],
  ["15", "Cantal", "Auvergne-Rhône-Alpes", 44.93, 2.44],
  ["16", "Charente", "Nouvelle-Aquitaine", 45.65, 0.16],
  ["17", "Charente-Maritime", "Nouvelle-Aquitaine", 46.16, -1.15],
  ["18", "Cher", "Centre-Val de Loire", 47.08, 2.40],
  ["19", "Corrèze", "Nouvelle-Aquitaine", 45.27, 1.77],
  ["2A", "Corse-du-Sud", "Corse", 41.93, 8.74],
  ["2B", "Haute-Corse", "Corse", 42.70, 9.45],
  ["21", "Côte-d'Or", "Bourgogne-Franche-Comté", 47.32, 5.04],
  ["22", "Côtes-d'Armor", "Bretagne", 48.51, -2.76],
  ["23", "Creuse", "Nouvelle-Aquitaine", 46.17, 1.87],
  ["24", "Dordogne", "Nouvelle-Aquitaine", 45.18, 0.72],
  ["25", "Doubs", "Bourgogne-Franche-Comté", 47.24, 6.02],
  ["26", "Drôme", "Auvergne-Rhône-Alpes", 44.93, 4.89],
  ["27", "Eure", "Normandie", 49.02, 1.15],
  ["28", "Eure-et-Loir", "Centre-Val de Loire", 48.45, 1.49],
  ["29", "Finistère", "Bretagne", 48.00, -4.10],
  ["30", "Gard", "Occitanie", 43.84, 4.36],
  ["31", "Haute-Garonne", "Occitanie", 43.60, 1.44],
  ["32", "Gers", "Occitanie", 43.65, 0.59],
  ["33", "Gironde", "Nouvelle-Aquitaine", 44.84, -0.58],
  ["34", "Hérault", "Occitanie", 43.61, 3.88],
  ["35", "Ille-et-Vilaine", "Bretagne", 48.11, -1.68],
  ["36", "Indre", "Centre-Val de Loire", 46.81, 1.69],
  ["37", "Indre-et-Loire", "Centre-Val de Loire", 47.39, 0.69],
  ["38", "Isère", "Auvergne-Rhône-Alpes", 45.19, 5.72],
  ["39", "Jura", "Bourgogne-Franche-Comté", 46.67, 5.55],
  ["40", "Landes", "Nouvelle-Aquitaine", 43.89, -0.50],
  ["41", "Loir-et-Cher", "Centre-Val de Loire", 47.59, 1.33],
  ["42", "Loire", "Auvergne-Rhône-Alpes", 45.43, 4.39],
  ["43", "Haute-Loire", "Auvergne-Rhône-Alpes", 45.04, 3.89],
  ["44", "Loire-Atlantique", "Pays de la Loire", 47.22, -1.55],
  ["45", "Loiret", "Centre-Val de Loire", 47.90, 1.90],
  ["46", "Lot", "Occitanie", 44.45, 1.44],
  ["47", "Lot-et-Garonne", "Nouvelle-Aquitaine", 44.20, 0.62],
  ["48", "Lozère", "Occitanie", 44.52, 3.50],
  ["49", "Maine-et-Loire", "Pays de la Loire", 47.47, -0.55],
  ["50", "Manche", "Normandie", 49.12, -1.09],
  ["51", "Marne", "Grand Est", 48.96, 4.36],
  ["52", "Haute-Marne", "Grand Est", 48.11, 5.14],
  ["53", "Mayenne", "Pays de la Loire", 48.07, -0.77],
  ["54", "Meurthe-et-Moselle", "Grand Est", 48.69, 6.18],
  ["55", "Meuse", "Grand Est", 48.77, 5.16],
  ["56", "Morbihan", "Bretagne", 47.66, -2.76],
  ["57", "Moselle", "Grand Est", 49.12, 6.18],
  ["58", "Nièvre", "Bourgogne-Franche-Comté", 46.99, 3.16],
  ["59", "Nord", "Hauts-de-France", 50.63, 3.06],
  ["60", "Oise", "Hauts-de-France", 49.43, 2.08],
  ["61", "Orne", "Normandie", 48.43, 0.09],
  ["62", "Pas-de-Calais", "Hauts-de-France", 50.29, 2.78],
  ["63", "Puy-de-Dôme", "Auvergne-Rhône-Alpes", 45.78, 3.08],
  ["64", "Pyrénées-Atlantiques", "Nouvelle-Aquitaine", 43.30, -0.37],
  ["65", "Hautes-Pyrénées", "Occitanie", 43.23, 0.08],
  ["66", "Pyrénées-Orientales", "Occitanie", 42.70, 2.90],
  ["67", "Bas-Rhin", "Grand Est", 48.58, 7.75],
  ["68", "Haut-Rhin", "Grand Est", 48.08, 7.36],
  ["69", "Rhône", "Auvergne-Rhône-Alpes", 45.76, 4.84],
  ["70", "Haute-Saône", "Bourgogne-Franche-Comté", 47.62, 6.15],
  ["71", "Saône-et-Loire", "Bourgogne-Franche-Comté", 46.31, 4.83],
  ["72", "Sarthe", "Pays de la Loire", 48.00, 0.20],
  ["73", "Savoie", "Auvergne-Rhône-Alpes", 45.56, 5.92],
  ["74", "Haute-Savoie", "Auvergne-Rhône-Alpes", 45.90, 6.13],
  ["75", "Paris", "Île-de-France", 48.86, 2.35],
  ["76", "Seine-Maritime", "Normandie", 49.44, 1.10],
  ["77", "Seine-et-Marne", "Île-de-France", 48.54, 2.66],
  ["78", "Yvelines", "Île-de-France", 48.80, 2.13],
  ["79", "Deux-Sèvres", "Nouvelle-Aquitaine", 46.32, -0.46],
  ["80", "Somme", "Hauts-de-France", 49.89, 2.30],
  ["81", "Tarn", "Occitanie", 43.93, 2.15],
  ["82", "Tarn-et-Garonne", "Occitanie", 44.02, 1.35],
  ["83", "Var", "Provence-Alpes-Côte d'Azur", 43.12, 5.93],
  ["84", "Vaucluse", "Provence-Alpes-Côte d'Azur", 43.95, 4.81],
  ["85", "Vendée", "Pays de la Loire", 46.67, -1.43],
  ["86", "Vienne", "Nouvelle-Aquitaine", 46.58, 0.34],
  ["87", "Haute-Vienne", "Nouvelle-Aquitaine", 45.83, 1.26],
  ["88", "Vosges", "Grand Est", 48.17, 6.45],
  ["89", "Yonne", "Bourgogne-Franche-Comté", 47.80, 3.57],
  ["90", "Territoire de Belfort", "Bourgogne-Franche-Comté", 47.64, 6.86],
  ["91", "Essonne", "Île-de-France", 48.63, 2.44],
  ["92", "Hauts-de-Seine", "Île-de-France", 48.89, 2.21],
  ["93", "Seine-Saint-Denis", "Île-de-France", 48.91, 2.44],
  ["94", "Val-de-Marne", "Île-de-France", 48.79, 2.46],
  ["95", "Val-d'Oise", "Île-de-France", 49.04, 2.08],
  ["971", "Guadeloupe", "Guadeloupe", 16.00, -61.73],
  ["972", "Martinique", "Martinique", 14.60, -61.07],
  ["973", "Guyane", "Guyane", 4.94, -52.33],
  ["974", "La Réunion", "La Réunion", -20.88, 55.45],
  ["976", "Mayotte", "Mayotte", -12.78, 45.23],
];

export const DEPARTEMENTS: readonly Departement[] = TABLE.map(([code, nom, region, lat, lon]) => ({ code, nom, region, lat, lon }));
const PAR_CODE = new Map(DEPARTEMENTS.map((d) => [d.code, d]));

/** Les régions, dans l'ordre alphabétique (outre-mer compris). */
export const REGIONS: readonly string[] = [...new Set(DEPARTEMENTS.map((d) => d.region))].sort((a, b) => a.localeCompare(b, "fr"));

/** Les rayons proposés autour de son secteur (km, entre chefs-lieux). 0 : son département seulement. */
export const RAYONS_KM = [0, 50, 100, 150] as const;
export type RayonKm = (typeof RAYONS_KM)[number];
export const RAYON_MAX_KM = 150;

export const departement = (code: string | null | undefined): Departement | null => (code ? (PAR_CODE.get(code.toUpperCase()) ?? null) : null);
export const regionDe = (code: string | null | undefined): string | null => departement(code)?.region ?? null;
export const departementsDeLaRegion = (region: string): string[] => DEPARTEMENTS.filter((d) => d.region === region).map((d) => d.code);

/** Distance à vol d'oiseau entre les chefs-lieux de deux départements, arrondie au km ; 0 pour le même ; null si inconnu. */
export function distanceDepartements(a: string | null | undefined, b: string | null | undefined): number | null {
  const da = departement(a);
  const db = departement(b);
  if (!da || !db) return null;
  if (da.code === db.code) return 0;
  const rad = Math.PI / 180;
  const dLat = (db.lat - da.lat) * rad;
  const dLon = (db.lon - da.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(da.lat * rad) * Math.cos(db.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** Les départements dont le chef-lieu est à `rayonKm` au plus du sien (le sien d'abord, puis du plus proche au plus loin). */
export function departementsAutour(code: string, rayonKm: number): string[] {
  if (!departement(code)) return [code]; // inconnu : son seul département, jamais rien
  return DEPARTEMENTS.map((d) => ({ code: d.code, km: distanceDepartements(code, d.code)! }))
    .filter((d) => d.km <= Math.max(0, rayonKm))
    .sort((x, y) => x.km - y.km || x.code.localeCompare(y.code))
    .map((d) => d.code);
}

/** Deux secteurs compatibles : le même département, ou deux chefs-lieux à `rayonKm` au plus (le plus petit des deux rayons). */
export function memeSecteur(a: string | null, b: string | null, rayonKm = 0): { ok: boolean; km: number | null } {
  if (!a || !b) return { ok: false, km: null };
  if (a === b) return { ok: true, km: 0 };
  const km = distanceDepartements(a, b);
  return { ok: km !== null && rayonKm > 0 && km <= rayonKm, km };
}

/** « Département 22 (Côtes-d'Armor) » ; « Département 22 » si inconnu. */
export const nomSecteur = (code: string) => {
  const d = departement(code);
  return d ? `${d.nom} (${d.code})` : `Département ${code}`;
};

/**
 * LA CARTE SANS TUILES : chaque département devient un point dans un cadre de `largeur` × `hauteur`, projection
 * équirectangulaire corrigée de la latitude, sur la seule France métropolitaine (l'outre-mer va dans une liste à part).
 */
export const CADRE_METROPOLE = { latMin: 41.3, latMax: 51.2, lonMin: -5.2, lonMax: 9.7 } as const;
export function pointSurLaCarte(code: string, largeur: number, hauteur: number): { x: number; y: number } | null {
  const d = departement(code);
  if (!d || d.code.length === 3) return null;
  const c = CADRE_METROPOLE;
  const k = Math.cos((((c.latMin + c.latMax) / 2) * Math.PI) / 180);
  const w = (c.lonMax - c.lonMin) * k;
  const h = c.latMax - c.latMin;
  const echelle = Math.min(largeur / w, hauteur / h);
  const ox = (largeur - w * echelle) / 2;
  const oy = (hauteur - h * echelle) / 2;
  return { x: Math.round((ox + (d.lon - c.lonMin) * k * echelle) * 10) / 10, y: Math.round((oy + (c.latMax - d.lat) * echelle) * 10) / 10 };
}
