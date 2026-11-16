import { BrickWall, Droplets, Flame, Grid3x3, Hammer, House, KeyRound, Leaf, Paintbrush, Ruler, Sun, Zap, type LucideIcon } from "lucide-react";
import type { Picto, Visuel } from "@baticlair/domain/page-entreprise";

/**
 * MA PAGE MOBIIZ : le décor lié au métier. Les pictogrammes (icônes du projet), le motif de fond discret (SVG en fond
 * d'élément, quelques centaines d'octets) et le visuel de couverture par défaut (illustration en SVG dessinée ici, sans
 * photo de banque d'images : la page d'un artisan ne montre jamais un chantier qui n'est pas le sien).
 */
export const ICONES: Record<Picto, LucideIcon> = {
  toit: House,
  pinceau: Paintbrush,
  eclair: Zap,
  goutte: Droplets,
  marteau: Hammer,
  brique: BrickWall,
  carreau: Grid3x3,
  feuille: Leaf,
  cle: KeyRound,
  soleil: Sun,
  flamme: Flame,
  regle: Ruler,
  maison: House,
};

/** Le motif de fond (tuile SVG répétée) : très léger, couleur et opacité données par la palette. */
export function motifCss(picto: Picto, couleur: string, opacite = 0.09): string {
  const c = couleur;
  const o = String(opacite);
  const tuiles: Record<Picto, string> = {
    toit: `<path d='M0 20 L20 6 L40 20' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='2'/>`,
    pinceau: `<path d='M4 36 C14 26 26 14 36 4' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='3' stroke-linecap='round'/>`,
    eclair: `<path d='M22 2 L12 22 L20 22 L16 38 L28 16 L20 16 Z' fill='${c}' fill-opacity='${o}'/>`,
    goutte: `<circle cx='10' cy='10' r='3' fill='${c}' fill-opacity='${o}'/><circle cx='30' cy='30' r='3' fill='${c}' fill-opacity='${o}'/>`,
    marteau: `<path d='M0 10 H40 M0 30 H40' stroke='${c}' stroke-opacity='${o}' stroke-width='1.5'/>`,
    brique: `<path d='M0 0 H40 V20 H0 Z M20 20 V40 M0 20 H40' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1.5'/>`,
    carreau: `<path d='M0 0 H40 V40 H0 Z' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1.5'/>`,
    feuille: `<path d='M8 32 C8 16 20 8 34 6 C32 20 24 32 8 32 Z' fill='${c}' fill-opacity='${o}'/>`,
    cle: `<circle cx='20' cy='20' r='6' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='2'/>`,
    soleil: `<circle cx='20' cy='20' r='5' fill='${c}' fill-opacity='${o}'/>`,
    flamme: `<path d='M20 4 C28 14 30 20 26 30 C24 36 16 36 14 30 C10 20 18 16 20 4 Z' fill='${c}' fill-opacity='${o}'/>`,
    regle: `<path d='M0 40 L40 0' stroke='${c}' stroke-opacity='${o}' stroke-width='1.5'/>`,
    maison: `<path d='M8 22 L20 10 L32 22 V32 H8 Z' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1.5'/>`,
  };
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>${tuiles[picto]}</svg>`)}")`;
}

/** Un mélange simple de deux couleurs hexadécimales (0 = a, 1 = b). */
export function melange(a: string, b: string, t: number): string {
  const x = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [p, q] = [x(a), x(b)];
  return `#${p.map((v, i) => Math.round(v + (q[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * LE VISUEL DE COUVERTURE PAR DÉFAUT, un par famille de métiers, aux couleurs de la page : une scène géométrique sobre
 * (toiture en ardoises pour le couvreur, mur et rouleau pour le peintre…). Décoratif : masqué aux lecteurs d'écran.
 */
export function VisuelMetier({ visuel, couleur, className = "" }: { visuel: Visuel; couleur: string; className?: string }) {
  const fonce = melange(couleur, "#0b0d10", 0.55);
  const clair = melange(couleur, "#ffffff", 0.35);
  const pale = melange(couleur, "#ffffff", 0.75);
  const id = `v-${visuel}`;
  const scenes: Record<Visuel, React.ReactNode> = {
    toiture: (
      <>
        <path d="M-20 520 L400 170 L820 520 Z" fill={couleur} />
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M${400 - (i + 1) * 32} ${170 + (i + 1) * 27} L${400 + (i + 1) * 32} ${170 + (i + 1) * 27}`} stroke={fonce} strokeWidth="3" opacity="0.55" />
        ))}
        {Array.from({ length: 40 }, (_, i) => (
          <path key={`v${i}`} d={`M${20 + i * 20} ${560} L${20 + i * 20} ${520}`} stroke={fonce} strokeWidth="2" opacity="0.25" />
        ))}
        <rect x="520" y="210" width="44" height="110" fill={fonce} />
        <rect x="512" y="200" width="60" height="16" fill={clair} />
        <path d="M-20 520 L400 170 L820 520" fill="none" stroke={pale} strokeWidth="10" strokeLinejoin="round" />
        <rect x="-20" y="520" width="840" height="60" fill={fonce} />
      </>
    ),
    peinture: (
      <>
        <rect width="800" height="600" fill={pale} />
        <rect x="0" y="0" width="330" height="600" fill={clair} />
        <rect x="300" y="120" width="70" height="260" rx="35" fill={couleur} />
        <rect x="320" y="380" width="30" height="190" rx="8" fill={fonce} />
        <path d="M0 0 H330 V600 H0 Z" fill="url(#rayures)" opacity="0.35" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={480 + i * 70} y={160} width="56" height="200" rx="10" fill={melange(couleur, i % 2 ? "#ffffff" : "#0b0d10", 0.15 + i * 0.12)} />
        ))}
      </>
    ),
    electricite: (
      <>
        <rect width="800" height="600" fill={fonce} />
        {[90, 180, 270, 360, 450].map((y, i) => (
          <path key={y} d={`M0 ${y} H${200 + i * 60} V${y + 60} H800`} fill="none" stroke={clair} strokeWidth="4" opacity="0.5" />
        ))}
        <circle cx="560" cy="250" r="110" fill={couleur} />
        <path d="M575 150 L520 270 H565 L545 360 L615 230 H570 Z" fill={pale} />
      </>
    ),
    plomberie: (
      <>
        <rect width="800" height="600" fill={pale} />
        <path d="M0 200 H360 Q420 200 420 260 V600" fill="none" stroke={couleur} strokeWidth="56" />
        <path d="M800 400 H560 Q500 400 500 340 V0" fill="none" stroke={fonce} strokeWidth="40" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${620 + i * 50} ${470 + i * 30} q14 24 0 34 q-14 -10 0 -34`} fill={couleur} />
        ))}
      </>
    ),
    bois: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="0" y={i * 75} width="800" height="73" fill={melange(couleur, i % 2 ? "#ffffff" : "#0b0d10", 0.12 + (i % 3) * 0.08)} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`g${i}`} d={`M${(i * 137) % 700} ${i * 75 + 30} q60 -18 120 0 t120 0`} fill="none" stroke={fonce} strokeWidth="2" opacity="0.35" />
        ))}
      </>
    ),
    maconnerie: (
      <>
        <rect width="800" height="600" fill={fonce} />
        {Array.from({ length: 12 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => <rect key={`${r}-${c}`} x={c * 100 - (r % 2) * 50 + 3} y={r * 50 + 3} width="94" height="44" rx="3" fill={melange(couleur, "#ffffff", ((r * 7 + c * 3) % 5) * 0.06)} />),
        )}
      </>
    ),
    carrelage: (
      <>
        <rect width="800" height="600" fill={pale} />
        {Array.from({ length: 10 }, (_, r) =>
          Array.from({ length: 14 }, (_, c) => <rect key={`${r}-${c}`} x={c * 60 + 2} y={r * 60 + 2} width="56" height="56" fill={(r + c) % 2 ? couleur : clair} opacity={(r + c) % 3 ? 0.9 : 0.7} />),
        )}
      </>
    ),
    exterieur: (
      <>
        <rect width="800" height="600" fill={pale} />
        <circle cx="640" cy="140" r="70" fill={clair} />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M0 ${380 + i * 40} L800 ${330 + i * 40} V${370 + i * 40} L0 ${420 + i * 40} Z`} fill={melange(couleur, "#0b0d10", 0.1 + (i % 2) * 0.15)} />
        ))}
        <path d="M120 360 C120 260 200 220 240 200 C230 280 190 340 120 360 Z" fill={couleur} />
      </>
    ),
    metal: (
      <>
        <rect width="800" height="600" fill={fonce} />
        <rect x="0" y="180" width="800" height="16" fill={clair} />
        <rect x="0" y="470" width="800" height="16" fill={clair} />
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x={20 + i * 40} y="196" width="8" height="274" fill={couleur} />
        ))}
      </>
    ),
    solaire: (
      <>
        <rect width="800" height="600" fill={pale} />
        <circle cx="660" cy="120" r="64" fill={couleur} />
        <path d="M80 520 L280 220 H700 L560 520 Z" fill={fonce} />
        {[1, 2, 3].map((i) => (
          <path key={i} d={`M${80 + i * 50} ${520 - i * 75} L${560 + i * 35} ${520 - i * 75}`} stroke={clair} strokeWidth="3" />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <path key={`c${i}`} d={`M${80 + i * 96} 520 L${280 + i * 84} 220`} stroke={clair} strokeWidth="3" />
        ))}
      </>
    ),
    interieur: (
      <>
        <rect width="800" height="600" fill={pale} />
        <path d="M0 0 H800 V140 H0 Z" fill={clair} />
        <path d="M0 140 H800 M120 140 V600 M680 140 V600" stroke={couleur} strokeWidth="6" opacity="0.6" />
        <rect x="260" y="230" width="280" height="200" fill={couleur} opacity="0.85" />
        <path d="M0 500 H800 V600 H0 Z" fill={fonce} opacity="0.5" />
      </>
    ),
    general: (
      <>
        <rect width="800" height="600" fill={pale} />
        <path d="M120 560 V330 L300 190 L480 330 V560 Z" fill={couleur} />
        <rect x="250" y="420" width="100" height="140" fill={fonce} />
        <path d="M600 560 V90 M520 110 H760 M600 110 L700 200" stroke={fonce} strokeWidth="12" fill="none" />
        <path d="M700 200 V260" stroke={fonce} strokeWidth="4" />
        <rect x="0" y="555" width="800" height="45" fill={fonce} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pale} />
          <stop offset="1" stopColor={clair} />
        </linearGradient>
        <pattern id="rayures" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="12" height="24" fill={pale} />
        </pattern>
      </defs>
      <rect width="800" height="600" fill={`url(#${id}-ciel)`} />
      {scenes[visuel]}
    </svg>
  );
}
