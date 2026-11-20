#!/usr/bin/env node
/**
 * LA CARTE DES PAGES RÉGIONALES (Greg, 19 novembre 2026) : génère `src/lib/regions/carte-france.ts` (tracés SVG des
 * départements de métropole) depuis le GeoJSON simplifié de gregoiredavid/france-geojson (tracés IGN Admin Express,
 * Licence ouverte Etalab ; noms et codes INSEE). Le fichier généré EST commité (le GeoJSON, lui, ne l'est pas) : il n'est lu
 * que par le serveur, la page ne reçoit que les tracés de sa région et un contour grossier du reste de la France.
 *
 * Usage : node scripts/gen-carte-france.mjs chemin/departements-version-simplifiee.geojson
 *
 * Projection : équirectangulaire centrée sur 46,5° N (x = longitude × cos 46,5°), 1° de latitude = 100 unités.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error("Usage : node scripts/gen-carte-france.mjs <departements.geojson>");
  process.exit(1);
}
const geo = JSON.parse(readFileSync(source, "utf8"));
const K = 100;
const COS = Math.cos((46.5 * Math.PI) / 180);
const LON0 = -5.3;
const LAT0 = 51.2;
const proj = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT0 - lat) * K];

/** Douglas-Peucker : retire les points à moins de `eps` unités du tracé. */
function simplifier(points, eps) {
  if (points.length < 4) return points;
  const garde = new Uint8Array(points.length);
  garde[0] = garde[points.length - 1] = 1;
  const pile = [[0, points.length - 1]];
  while (pile.length) {
    const [a, b] = pile.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / l;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > eps && idx > 0) {
      garde[idx] = 1;
      pile.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => garde[i]);
}

/** Un anneau fermé : coupé en deux au point le plus loin du premier, chaque moitié simplifiée. */
function simplifierAnneau(points, eps) {
  const pts = points.length > 1 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1] ? points.slice(0, -1) : points;
  if (pts.length < 4) return pts;
  let loin = 1;
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]) > Math.hypot(pts[loin][0] - pts[0][0], pts[loin][1] - pts[0][1])) loin = i;
  const a = simplifier(pts.slice(0, loin + 1), eps);
  const b = simplifier([...pts.slice(loin), pts[0]], eps);
  return [...a, ...b.slice(1, -1)];
}

const r = (n, d) => Number(n.toFixed(d)).toString();

function chemin(feature, eps, decimales, aireMin) {
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const morceaux = [];
  for (const poly of polys) {
    for (const anneau of poly) {
      const pts = simplifierAnneau(anneau.map(proj), eps);
      if (pts.length < 3) continue;
      // Les îlots minuscules disparaissent au contour grossier (aire en unités²).
      let aire = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        aire += x1 * y2 - x2 * y1;
      }
      if (Math.abs(aire / 2) < aireMin) continue;
      morceaux.push("M" + pts.map(([x, y]) => `${r(x, decimales)} ${r(y, decimales)}`).join("L") + "Z");
    }
  }
  return morceaux.join("");
}

function boite(feature) {
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys)
    for (const [lon, lat] of poly[0]) {
      const [x, y] = proj([lon, lat]);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return [x0, y0, x1, y1].map((n) => Math.round(n * 10) / 10);
}

/** Le centre du plus grand morceau (centroïde du polygone), pour poser le nom du département. */
function centre(feature) {
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  let meilleur = null;
  for (const poly of polys) {
    const pts = poly[0].map(proj);
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      const k = x1 * y2 - x2 * y1;
      a += k;
      cx += (x1 + x2) * k;
      cy += (y1 + y2) * k;
    }
    if (!meilleur || Math.abs(a) > Math.abs(meilleur.a)) meilleur = { a, x: cx / (3 * a), y: cy / (3 * a) };
  }
  return [Math.round(meilleur.x * 10) / 10, Math.round(meilleur.y * 10) / 10];
}

const departements = geo.features
  .map((f) => ({ code: f.properties.code, nom: f.properties.nom, f }))
  .sort((a, b) => a.code.localeCompare(b.code));

const lignes = departements.map(({ code, nom, f }) => `  ${JSON.stringify(code)}: { nom: ${JSON.stringify(nom)}, d: ${JSON.stringify(chemin(f, 0.35, 1, 0.5))}, boite: ${JSON.stringify(boite(f))}, centre: ${JSON.stringify(centre(f))} },`);
const contour = departements.map(({ f }) => chemin(f, 4, 0, 40)).join("");

const sortie = `// FICHIER GÉNÉRÉ par scripts/gen-carte-france.mjs : ne pas modifier à la main.
// Tracés : IGN Admin Express (édition 2018) via gregoiredavid/france-geojson, Licence ouverte Etalab 1.0 ; codes et noms INSEE.
// Projection équirectangulaire (x = longitude × cos 46,5°), 1° de latitude = ${K} unités, origine ${LON0}° E / ${LAT0}° N.

export interface TraceDepartement {
  nom: string;
  /** Le tracé SVG détaillé (précision ≈ 0,35 unité, soit environ 400 m). */
  d: string;
  /** [x min, y min, x max, y max] du contour principal. */
  boite: readonly [number, number, number, number];
  /** Le centre du plus grand morceau (où poser le nom). */
  centre: readonly [number, number];
}

/** Toute la France métropolitaine, en tracés grossiers (le fond flouté de la carte). */
export const CONTOUR_FRANCE = ${JSON.stringify(contour)};

/** Chaque département de métropole, par code INSEE. */
export const TRACES_DEPARTEMENTS: Record<string, TraceDepartement> = {
${lignes.join("\n")}
};
`;
const cible = fileURLToPath(new URL("../src/lib/regions/carte-france.ts", import.meta.url));
writeFileSync(cible, sortie);
console.log(`${departements.length} départements, ${Math.round(sortie.length / 1024)} Ko, contour ${Math.round(contour.length / 1024)} Ko → ${cible}`);

/*
 * LA CARTE DE L'ONBOARDING (Greg, 19 novembre 2026, « la carte passe dans l'onboarding ») : avec un second fichier (les
 * régions du même dépôt), le script écrit aussi `src/lib/carte/france-regions.ts` (les 13 régions de métropole, tracés
 * moyens, envoyés à la page) et `public/cartes/region-<code>.json` (les départements d'une région, chargés au toucher).
 * Usage : node scripts/gen-carte-france.mjs departements.geojson regions.geojson
 */
const sourceRegions = process.argv[3];
if (sourceRegions) {
  const { DEPARTEMENTS } = await import(new URL("../../../packages/domain/dist/groupe/geographie.js", import.meta.url).href);
  const { mkdirSync } = await import("node:fs");
  const geoR = JSON.parse(readFileSync(sourceRegions, "utf8"));
  const parNomDep = new Map(departements.map((d) => [d.code, d]));
  const regions = geoR.features
    .map((f) => {
      const nom = f.properties.nom;
      const codes = DEPARTEMENTS.filter((d) => d.region === nom).map((d) => d.code);
      if (!codes.length) throw new Error(`Région sans département : ${nom}`);
      return { code: f.properties.code, nom, f, codes };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of regions) {
    const [a, b, c, d] = boite(r.f);
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  const m = 12;
  const vue = [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m].map((n) => Math.round(n));
  const lignesR = regions.map((r) => `  { code: ${JSON.stringify(r.code)}, nom: ${JSON.stringify(r.nom)}, departements: ${JSON.stringify(r.codes)}, d: ${JSON.stringify(chemin(r.f, 1.1, 0, 4))}, boite: ${JSON.stringify(boite(r.f))}, centre: ${JSON.stringify(centre(r.f))} },`);
  const outreMer = DEPARTEMENTS.filter((d) => d.code.length === 3).map((d) => ({ code: d.code, nom: d.nom, region: d.region }));
  const srcR = `// FICHIER GÉNÉRÉ par scripts/gen-carte-france.mjs : ne pas modifier à la main.
// Tracés : IGN Admin Express (édition 2018) via gregoiredavid/france-geojson, Licence ouverte Etalab 1.0 ; codes et noms INSEE.
// Même projection que \`carte-france.ts\` (x = longitude × cos 46,5°, 1° de latitude = ${K} unités).

export interface RegionCarte {
  code: string;
  nom: string;
  /** Les départements (codes INSEE) de la région, ceux de \`DEPARTEMENTS\` du moteur. */
  departements: readonly string[];
  d: string;
  boite: readonly [number, number, number, number];
  centre: readonly [number, number];
}

/** Le cadre de la France métropolitaine entière (viewBox). */
export const VUE_FRANCE = ${JSON.stringify(vue)} as const;

/** Les 13 régions de métropole (Corse comprise), par ordre alphabétique. */
export const REGIONS_CARTE: readonly RegionCarte[] = [
${lignesR.join("\n")}
];

/** L'outre-mer : un département par région, choisi dans une liste (pas sur la carte). */
export const OUTRE_MER = ${JSON.stringify(outreMer)} as const;
`;
  mkdirSync(fileURLToPath(new URL("../src/lib/carte/", import.meta.url)), { recursive: true });
  writeFileSync(fileURLToPath(new URL("../src/lib/carte/france-regions.ts", import.meta.url)), srcR);
  const dossier = fileURLToPath(new URL("../public/cartes/", import.meta.url));
  mkdirSync(dossier, { recursive: true });
  let total = 0;
  for (const r of regions) {
    const deps = r.codes.map((c) => {
      const d = parNomDep.get(c);
      if (!d) throw new Error(`Département sans tracé : ${c}`);
      return { code: c, nom: d.nom, d: chemin(d.f, 0.35, 1, 0.5), boite: boite(d.f), centre: centre(d.f) };
    });
    const json = JSON.stringify({ region: r.code, nom: r.nom, departements: deps });
    total += json.length;
    writeFileSync(`${dossier}region-${r.code}.json`, json);
  }
  console.log(`${regions.length} régions (${Math.round(srcR.length / 1024)} Ko), départements par région : ${Math.round(total / 1024)} Ko en tout`);
}
