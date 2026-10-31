// Génère les icônes PNG de l'application (iPhone n'installe pas un SVG sur l'écran d'accueil) depuis src/app/icon.svg.
// `node scripts/icones-pwa.mjs` ; les fichiers sont commités dans public/.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ici = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(ici, "../src/app/icon.svg"));
const out = (nom) => path.join(ici, "../public", nom);

for (const taille of [192, 512]) writeFileSync(out(`icon-${taille}.png`), await sharp(svg, { density: 512 }).resize(taille, taille).png().toBuffer());
// Maskable : le logo au centre, 20 % de marge, fond encre (Android découpe en cercle ou en goutte).
const interieur = await sharp(svg, { density: 512 }).resize(410, 410).png().toBuffer();
writeFileSync(out("icon-512-maskable.png"), await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0E1116" } }).composite([{ input: interieur, gravity: "center" }]).png().toBuffer());
// Apple touch icon : 180 px, sans transparence (iOS met ses propres coins arrondis).
const apple = await sharp(svg, { density: 512 }).resize(180, 180).png().toBuffer();
writeFileSync(out("apple-touch-icon.png"), await sharp({ create: { width: 180, height: 180, channels: 4, background: "#0E1116" } }).composite([{ input: apple }]).flatten({ background: "#0E1116" }).png().toBuffer());
console.log("icônes écrites : icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png");
