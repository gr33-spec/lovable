/**
 * UN QR CODE SANS DÉPENDANCE (Greg, 28 octobre 2026, point 3 : le PDF de la demande porte un QR code vers le lien de
 * réponse ; aucune bibliothèque ajoutée sans son accord). Mode octets, correction M, versions 1 à 10 (jusqu'à 213 octets :
 * largement un lien de réponse). Vérifié module par module contre un encodeur de référence
 * (`test/qr.test.ts`, matrices de `test/fixtures/qr-reference.json`).
 */

/** Par version (1 à 10), niveau M : codewords de correction par bloc, puis les blocs [nombre, codewords de données]. */
const BLOCS_M: readonly { ec: number; blocs: readonly [number, number][] }[] = [
  { ec: 10, blocs: [[1, 16]] },
  { ec: 16, blocs: [[1, 28]] },
  { ec: 26, blocs: [[1, 44]] },
  { ec: 18, blocs: [[2, 32]] },
  { ec: 24, blocs: [[2, 43]] },
  { ec: 16, blocs: [[4, 27]] },
  { ec: 18, blocs: [[4, 31]] },
  { ec: 22, blocs: [[2, 38], [2, 39]] },
  { ec: 22, blocs: [[3, 36], [2, 37]] },
  { ec: 26, blocs: [[4, 43], [1, 44]] },
];
const ALIGNEMENTS: readonly (readonly number[])[] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

/* --------------------------------------------------------------------------------- le corps de Galois GF(256) */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

/** Le polynôme générateur de Reed-Solomon de degré n. */
function generateur(n: number): number[] {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const suivant = new Array<number>(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      suivant[j]! ^= g[j]!;
      suivant[j + 1]! ^= mul(g[j]!, EXP[i]!);
    }
    g = suivant;
  }
  return g;
}

function correction(donnees: readonly number[], n: number): number[] {
  const g = generateur(n);
  const reste = new Array<number>(n).fill(0);
  for (const d of donnees) {
    const facteur = d ^ reste[0]!;
    reste.shift();
    reste.push(0);
    if (facteur !== 0) for (let j = 0; j < n; j++) reste[j]! ^= mul(g[j + 1]!, facteur);
  }
  return reste;
}

/* ------------------------------------------------------------------------------------- les codewords */
function codewords(octets: Uint8Array, version: number): number[] {
  const v = BLOCS_M[version - 1]!;
  const capacite = v.blocs.reduce((s, [n, k]) => s + n * k, 0);
  const bits: number[] = [];
  const pousser = (valeur: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((valeur >> i) & 1);
  };
  pousser(0b0100, 4);
  pousser(octets.length, version >= 10 ? 16 : 8);
  for (const o of octets) pousser(o, 8);
  pousser(0, Math.min(4, capacite * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const donnees: number[] = [];
  for (let i = 0; i < bits.length; i += 8) donnees.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; donnees.length < capacite; pad ^= 0xec ^ 0x11) donnees.push(pad);
  // Les blocs, puis l'entrelacement : les codewords de données bloc par bloc, puis ceux de correction.
  const blocs: { d: number[]; e: number[] }[] = [];
  let p = 0;
  for (const [n, k] of v.blocs) {
    for (let i = 0; i < n; i++) {
      const d = donnees.slice(p, p + k);
      p += k;
      blocs.push({ d, e: correction(d, v.ec) });
    }
  }
  const sortie: number[] = [];
  const maxD = Math.max(...blocs.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocs) if (i < b.d.length) sortie.push(b.d[i]!);
  for (let i = 0; i < v.ec; i++) for (const b of blocs) sortie.push(b.e[i]!);
  return sortie;
}

/* ---------------------------------------------------------------------------------------- la matrice */
type Matrice = { taille: number; modules: Uint8Array; fixes: Uint8Array };

function poser(m: Matrice, x: number, y: number, noir: boolean) {
  m.modules[y * m.taille + x] = noir ? 1 : 0;
  m.fixes[y * m.taille + x] = 1;
}

function motifs(version: number): Matrice {
  const taille = version * 4 + 17;
  const m: Matrice = { taille, modules: new Uint8Array(taille * taille), fixes: new Uint8Array(taille * taille) };
  const repere = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= taille || y >= taille) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        poser(m, x, y, d !== 2 && d !== 4);
      }
  };
  repere(3, 3);
  repere(taille - 4, 3);
  repere(3, taille - 4);
  for (let i = 8; i < taille - 8; i++) {
    poser(m, i, 6, i % 2 === 0);
    poser(m, 6, i, i % 2 === 0);
  }
  const al = ALIGNEMENTS[version - 1]!;
  const dernier = al[al.length - 1]!;
  for (const cy of al)
    for (const cx of al) {
      // Jamais sur un repère d'angle ; sur une ligne de synchronisation, oui (versions 7 et plus).
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === dernier) || (cx === dernier && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poser(m, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  poser(m, 8, taille - 8, true);
  // Les zones du format (réservées) et de la version (v ≥ 7).
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      m.fixes[8 * taille + i] = 1;
      m.fixes[i * taille + 8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    m.fixes[8 * taille + (taille - 1 - i)] = 1;
    m.fixes[(taille - 1 - i) * taille + 8] = 1;
  }
  if (version >= 7) {
    let r = version << 12;
    for (let i = 17; i >= 12; i--) if (r & (1 << i)) r ^= 0x1f25 << (i - 12);
    const info = (version << 12) | r;
    for (let i = 0; i < 18; i++) {
      const bit = (info >> i) & 1;
      const a = Math.floor(i / 3);
      const b = taille - 11 + (i % 3);
      poser(m, a, b, bit === 1);
      poser(m, b, a, bit === 1);
    }
  }
  return m;
}

function placer(m: Matrice, cw: readonly number[]) {
  const bits: number[] = [];
  for (const c of cw) for (let i = 7; i >= 0; i--) bits.push((c >> i) & 1);
  let k = 0;
  let haut = true;
  for (let droite = m.taille - 1; droite > 0; droite -= 2) {
    if (droite === 6) droite = 5;
    for (let n = 0; n < m.taille; n++) {
      const y = haut ? m.taille - 1 - n : n;
      for (const x of [droite, droite - 1]) {
        if (m.fixes[y * m.taille + x]) continue;
        m.modules[y * m.taille + x] = bits[k++] ?? 0;
      }
    }
    haut = !haut;
  }
}

const MASQUES: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function masquer(m: Matrice, masque: number): Uint8Array {
  const out = new Uint8Array(m.modules);
  const f = MASQUES[masque]!;
  for (let y = 0; y < m.taille; y++) for (let x = 0; x < m.taille; x++) if (!m.fixes[y * m.taille + x] && f(x, y)) out[y * m.taille + x] = (out[y * m.taille + x] ?? 0) ^ 1;
  // L'information de format (niveau M = 00, puis le masque), BCH (15,5), masquée par 0x5412.
  let info = (0b00 << 3) | masque;
  let r = info << 10;
  for (let i = 14; i >= 10; i--) if (r & (1 << i)) r ^= 0x537 << (i - 10);
  info = ((info << 10) | r) ^ 0x5412;
  const bit = (i: number) => ((info >> i) & 1) as 0 | 1;
  const t = m.taille;
  const set = (x: number, y: number, v: 0 | 1) => (out[y * t + x] = v);
  for (let i = 0; i < 6; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(t - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, t - 15 + i, bit(i));
  return out;
}

/** La pénalité de la norme (quatre règles) : le masque le moins pénalisé est retenu. */
function penalite(t: number, g: Uint8Array): number {
  const at = (x: number, y: number) => g[y * t + x]!;
  let p = 0;
  for (let y = 0; y < t; y++) {
    let run = 1;
    for (let x = 1; x < t; x++) {
      if (at(x, y) === at(x - 1, y)) {
        run++;
        if (x === t - 1 && run >= 5) p += run - 2;
      } else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
  }
  for (let x = 0; x < t; x++) {
    let run = 1;
    for (let y = 1; y < t; y++) {
      if (at(x, y) === at(x, y - 1)) {
        run++;
        if (y === t - 1 && run >= 5) p += run - 2;
      } else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
  }
  for (let y = 0; y < t - 1; y++) for (let x = 0; x < t - 1; x++) if (at(x, y) === at(x + 1, y) && at(x, y) === at(x, y + 1) && at(x, y) === at(x + 1, y + 1)) p += 3;
  const motif = [1, 0, 1, 1, 1, 0, 1];
  const cherche = (ligne: (i: number) => number) => {
    for (let i = 0; i + 7 <= t; i++) {
      let ok = true;
      for (let j = 0; j < 7 && ok; j++) if (ligne(i + j) !== motif[j]) ok = false;
      if (!ok) continue;
      const avant = i >= 4 && [0, 1, 2, 3].every((j) => ligne(i - 1 - j) === 0);
      const apres = i + 11 <= t && [0, 1, 2, 3].every((j) => ligne(i + 7 + j) === 0);
      if (avant || apres) p += 40;
    }
  };
  for (let y = 0; y < t; y++) cherche((i) => at(i, y));
  for (let x = 0; x < t; x++) cherche((i) => at(x, i));
  let noirs = 0;
  for (const v of g) noirs += v;
  const pct = (noirs * 100) / (t * t);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

export interface QrCode {
  version: number;
  taille: number;
  masque: number;
  /** Ligne par ligne, 1 = noir. */
  modules: Uint8Array;
}

/** La plus petite version (1 à 10) qui contient le texte, en mode octets, correction M. */
export function versionPour(octets: number): number {
  for (let v = 1; v <= 10; v++) {
    const capacite = BLOCS_M[v - 1]!.blocs.reduce((s, [n, k]) => s + n * k, 0);
    if (capacite - 2 - (v >= 10 ? 1 : 0) >= octets) return v;
  }
  throw new Error("QR : texte trop long (213 octets au plus)");
}

/** Le QR code d'un texte, avec le masque imposé (test) ou le meilleur. */
export function qrCode(texte: string, masqueImpose?: number): QrCode {
  const octets = new TextEncoder().encode(texte);
  const version = versionPour(octets.length);
  const m = motifs(version);
  placer(m, codewords(octets, version));
  let meilleur = { masque: 0, modules: masquer(m, 0), score: Number.POSITIVE_INFINITY };
  for (let k = 0; k < 8; k++) {
    if (masqueImpose !== undefined && k !== masqueImpose) continue;
    const modules = masquer(m, k);
    const score = penalite(m.taille, modules);
    if (score < meilleur.score) meilleur = { masque: k, modules, score };
  }
  return { version, taille: m.taille, masque: meilleur.masque, modules: meilleur.modules };
}

/** Le QR en SVG (pour un e-mail ou une page), sans dépendance. */
export function qrSvg(texte: string, taillePx = 160): string {
  const q = qrCode(texte);
  const marge = 4;
  const n = q.taille + marge * 2;
  const rects: string[] = [];
  for (let y = 0; y < q.taille; y++) for (let x = 0; x < q.taille; x++) if (q.modules[y * q.taille + x]) rects.push(`<rect x="${x + marge}" y="${y + marge}" width="1" height="1"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${taillePx}" height="${taillePx}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#000">${rects.join("")}</g></svg>`;
}
