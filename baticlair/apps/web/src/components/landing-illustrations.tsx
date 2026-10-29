/**
 * Les illustrations de la page d'accueil publique (demande du fondateur, 22 octobre 2026 : « des images d'artisan, de
 * matériaux, et d'autres choses liées à ce qu'on propose »). Dessinées en SVG dans la page même : aucune ressource
 * extérieure (test permanent de la landing), nettes sur tous les écrans, légères. Décoratives (`aria-hidden`), sauf
 * quand le texte qui les accompagne porte le sens.
 *
 * DE VRAIES PHOTOS, PLUS TARD (décision du 22 octobre) : chaque dessin a son emplacement. Pour le remplacer, copier la
 * photo dans `public/landing/photos/` (JPEG ou WebP, 1 600 px de large au plus) et ajouter une ligne à `PHOTOS_LANDING`
 * ci-dessous, par exemple `chantier: "/landing/photos/chantier.jpg"`. La page affiche alors la photo, recadrée à la
 * place du dessin ; enlever la ligne remet le dessin. Les photos restent servies par le site (aucune ressource
 * extérieure, test permanent de la landing).
 */

export type EmplacementPhoto =
  | "chantier"
  | "tournee"
  | "outils"
  | "ardoise"
  | "tuile"
  | "gouttiere"
  | "liteau"
  | "ba13"
  | "cable"
  | "carrelage"
  | "parpaing";

/** Les photos qui remplacent un dessin. Vide tant que Greg n'a pas fourni ses photos de chantier. */
export const PHOTOS_LANDING: Partial<Record<EmplacementPhoto, `/landing/photos/${string}`>> = {};

/** Le texte lu à la place de la photo (une photo porte du sens, contrairement au dessin décoratif). */
const ALT_PHOTOS: Record<EmplacementPhoto, string> = {
  chantier: "Un couvreur sur un toit en cours de rénovation",
  tournee: "Le camion d'un négoce livre un chantier",
  outils: "Les outils de l'artisan sur le chantier",
  ardoise: "Une palette d'ardoises naturelles",
  tuile: "Des tuiles romanes canal",
  gouttiere: "Une gouttière en zinc",
  liteau: "Un paquet de liteaux en sapin",
  ba13: "Une pile de plaques de plâtre BA13",
  cable: "Une couronne de câble électrique",
  carrelage: "Des carreaux de grès 60×60",
  parpaing: "Une palette de parpaings",
};

/** La photo de l'emplacement si elle existe, sinon le dessin. `className` s'applique à la photo (recadrage). */
export function Visuel({ emplacement, className = "", children }: { emplacement: EmplacementPhoto; className?: string; children: React.ReactNode }) {
  const src = PHOTOS_LANDING[emplacement];
  if (!src) return <>{children}</>;
  // eslint-disable-next-line @next/next/no-img-element -- fichier local, sans optimiseur, comme les captures de la page
  return <img src={src} alt={ALT_PHOTOS[emplacement]} className={`object-cover ${className}`} loading="lazy" decoding="async" />;
}

const ARDOISE = "#2E1B05";
const ARDOISE_CLAIRE = "#614822";
const ZINC = "#99844C";
const ZINC_FONCE = "#614822";
const BOIS = "#CA8A1B";
const BOIS_FONCE = "#96580C";
const PEAU = "#F4DB5C";
const CASQUE = "#CA8A1B";
const VESTE = "#130901";
const PANTALON = "#130901";
const TUILE = "#96580C";
const TUILE_FONCE = "#614822";

/** La scène du haut : une maison, son toit d'ardoises, le couvreur sur l'échelle avec son téléphone, la palette au pied. */
export function SceneChantier({ className = "" }: { className?: string }) {
  // Les ardoises : rangs décalés d'une demi-ardoise, comme posées au crochet.
  const rangs = Array.from({ length: 9 }, (_, r) => r);
  return (
    <svg viewBox="0 0 480 520" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4DB5C" />
          <stop offset="0.75" stopColor="#F2F1EE" />
          <stop offset="1" stopColor="#F2F1EE" />
        </linearGradient>
        <clipPath id="toit">
          <path d="M70 250 L240 118 L410 250 Z" />
        </clipPath>
      </defs>
      <rect width="480" height="520" fill="url(#ciel)" />
      <circle cx="96" cy="88" r="64" fill="#FBF8F3" opacity="0.3" />
      <circle cx="96" cy="88" r="44" fill="#F4DB5C" opacity="0.9" />
      {/* Nuages légers */}
      <g fill="#FBF8F3" opacity="0.85">
        <rect x="300" y="64" width="110" height="22" rx="11" />
        <rect x="330" y="50" width="56" height="26" rx="13" />
        <rect x="190" y="40" width="70" height="16" rx="8" opacity="0.7" />
      </g>
      {/* Le sol */}
      <rect x="0" y="452" width="480" height="68" fill="#99844C33" />
      <rect x="0" y="452" width="480" height="4" fill="#99844C55" />
      {/* La cheminée */}
      <rect x="318" y="140" width="34" height="78" fill="#96580C" />
      <rect x="312" y="134" width="46" height="10" rx="2" fill="#614822" />
      <g stroke="#96580C" strokeWidth="2">
        <line x1="318" y1="162" x2="352" y2="162" />
        <line x1="318" y1="184" x2="352" y2="184" />
        <line x1="335" y1="162" x2="335" y2="184" />
      </g>
      {/* Les murs */}
      <rect x="92" y="248" width="296" height="204" fill="#F6F3EE" />
      <rect x="92" y="248" width="296" height="10" fill="#F2F1EE" />
      {/* Fenêtres et porte */}
      <g>
        <rect x="124" y="300" width="58" height="62" rx="4" fill="#F4DB5C" />
        <rect x="124" y="300" width="58" height="62" rx="4" fill="none" stroke="#FBF8F3" strokeWidth="5" />
        <line x1="153" y1="300" x2="153" y2="362" stroke="#FBF8F3" strokeWidth="4" />
        <rect x="298" y="300" width="58" height="62" rx="4" fill="#F4DB5C" />
        <rect x="298" y="300" width="58" height="62" rx="4" fill="none" stroke="#FBF8F3" strokeWidth="5" />
        <line x1="327" y1="300" x2="327" y2="362" stroke="#FBF8F3" strokeWidth="4" />
        <rect x="212" y="356" width="56" height="96" rx="4" fill="#130901" />
        <circle cx="258" cy="406" r="3.5" fill="#F4DB5C" />
      </g>
      {/* Le toit d'ardoises */}
      <path d="M70 250 L240 118 L410 250 Z" fill={ARDOISE} />
      <g clipPath="url(#toit)">
        {rangs.map((r) => {
          const y = 128 + r * 14;
          const decale = r % 2 === 0 ? 0 : 13;
          return (
            <g key={r}>
              {Array.from({ length: 14 }, (_, c) => (
                <rect key={c} x={70 + decale + c * 26} y={y} width="24" height="13" rx="2" fill={(r + c) % 3 === 0 ? ARDOISE_CLAIRE : ARDOISE} stroke="#2E1B05" strokeWidth="0.8" />
              ))}
            </g>
          );
        })}
      </g>
      {/* Faîtage zinc et gouttière */}
      <path d="M232 122 L240 116 L248 122" fill="none" stroke={ZINC} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="64" y="248" width="352" height="9" rx="4.5" fill={ZINC} />
      <rect x="64" y="253" width="352" height="4" rx="2" fill={ZINC_FONCE} />
      <rect x="398" y="254" width="9" height="196" rx="4" fill={ZINC} />
      <path d="M398 440 q4 14 18 14" fill="none" stroke={ZINC} strokeWidth="9" strokeLinecap="round" />
      {/* L'échelle */}
      <g stroke={BOIS_FONCE} strokeWidth="7" strokeLinecap="round">
        <line x1="44" y1="452" x2="96" y2="214" />
        <line x1="76" y1="452" x2="128" y2="214" />
      </g>
      <g stroke={BOIS} strokeWidth="5" strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const t = 0.08 + i * 0.12;
          return <line key={i} x1={44 + 52 * t} y1={452 - 238 * t} x2={76 + 52 * t} y2={452 - 238 * t} />;
        })}
      </g>
      {/* Le couvreur, sur l'échelle, son téléphone en main */}
      <g>
        {/* Jambes */}
        <path d="M86 330 L80 372 L92 372 L98 334 Z" fill={PANTALON} />
        <path d="M100 330 L108 368 L120 366 L112 328 Z" fill={PANTALON} />
        <rect x="74" y="370" width="22" height="9" rx="3" fill="#2E1B05" />
        <rect x="104" y="364" width="22" height="9" rx="3" fill="#2E1B05" />
        {/* Veste de travail, bandes réfléchissantes */}
        <path d="M80 268 Q104 258 124 270 L120 336 L84 336 Z" fill={VESTE} />
        <rect x="83" y="312" width="38" height="5" fill="#F4DB5C" />
        <rect x="86" y="292" width="34" height="4" fill="#F4DB5C" opacity="0.8" />
        {/* Bras : l'un tient l'échelle, l'autre le téléphone */}
        <path d="M82 274 Q66 290 72 312" fill="none" stroke={VESTE} strokeWidth="12" strokeLinecap="round" />
        <circle cx="72" cy="314" r="6" fill={PEAU} />
        <path d="M120 276 Q140 288 140 262" fill="none" stroke={VESTE} strokeWidth="12" strokeLinecap="round" />
        <circle cx="140" cy="258" r="6" fill={PEAU} />
        <rect x="134" y="232" width="18" height="30" rx="4" fill="#130901" />
        <rect x="136.5" y="235" width="13" height="23" rx="2" fill="#F4DB5C" />
        {/* Tête et casque */}
        <rect x="96" y="252" width="12" height="10" fill={PEAU} />
        <circle cx="102" cy="240" r="15" fill={PEAU} />
        <path d="M85 238 Q86 216 102 216 Q118 216 119 238 Z" fill={CASQUE} />
        <rect x="82" y="235" width="40" height="6" rx="3" fill="#CA8A1B" />
        <circle cx="107" cy="243" r="1.8" fill="#2E1B05" />
      </g>
      {/* La palette d'ardoises au pied du mur, cerclée */}
      <g>
        <rect x="150" y="438" width="120" height="8" fill={BOIS} />
        <rect x="150" y="446" width="120" height="6" fill={BOIS_FONCE} />
        <rect x="156" y="452" width="14" height="4" fill={BOIS_FONCE} />
        <rect x="203" y="452" width="14" height="4" fill={BOIS_FONCE} />
        <rect x="250" y="452" width="14" height="4" fill={BOIS_FONCE} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={156} y={430 - i * 9} width="108" height="8" rx="1.5" fill={i % 2 === 0 ? ARDOISE : ARDOISE_CLAIRE} />
        ))}
        <rect x="186" y="384" width="4" height="54" fill="#FBF8F3" opacity="0.8" />
        <rect x="230" y="384" width="4" height="54" fill="#FBF8F3" opacity="0.8" />
      </g>
      {/* Seau et rouleau d'écran au sol */}
      <g>
        <path d="M296 452 L300 420 L326 420 L330 452 Z" fill="#99844C" />
        <rect x="298" y="416" width="30" height="5" rx="2" fill="#614822" />
        <rect x="336" y="430" width="44" height="22" rx="11" fill="#614822" />
        <circle cx="347" cy="441" r="7" fill="#614822" />
      </g>
    </svg>
  );
}

/** Une fourniture, dessinée comme au comptoir. */
function Ardoises() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`rotate(${-18 + i * 9} 80 92)`}>
          <rect x="52" y={18 + i * 2} width="56" height="74" rx="4" fill={i % 2 ? ARDOISE_CLAIRE : ARDOISE} stroke="#2E1B05" strokeWidth="1.2" />
          <circle cx="80" cy={28 + i * 2} r="2.4" fill="#2E1B05" />
        </g>
      ))}
    </svg>
  );
}
function Tuiles() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <path
            key={`${r}-${c}`}
            d={`M${28 + c * 38 + (r % 2) * 19} ${30 + r * 22} q19 -14 38 0 l-4 28 q-15 -10 -30 0 Z`}
            fill={(r + c) % 2 ? TUILE : TUILE_FONCE}
            stroke="#96580C"
            strokeWidth="1"
          />
        )),
      )}
    </svg>
  );
}
function Gouttiere() {
  // Une longueur de demi-ronde vue de face, son ourlet, trois crochets et le départ de la descente.
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      {[38, 80, 122].map((x) => (
        <path key={x} d={`M${x} 16 h10 M${x} 16 V44`} fill="none" stroke={ZINC_FONCE} strokeWidth="4" strokeLinecap="round" />
      ))}
      <rect x="14" y="34" width="132" height="10" rx="2" fill="#99844C" />
      <path d="M14 42 H146 Q146 74 116 76 H44 Q14 74 14 42 Z" fill={ZINC} />
      <path d="M22 50 H138" stroke="#99844C66" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="11" y="37" width="138" height="8" rx="4" fill="#99844C66" stroke={ZINC_FONCE} strokeWidth="1.2" />
      <path d="M104 74 h16 l-2 10 h-12 Z" fill={ZINC_FONCE} />
      <rect x="106" y="84" width="12" height="22" fill={ZINC} />
    </svg>
  );
}
function Liteaux() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={16 + (i % 2) * 6} y={22 + i * 14} width="128" height="12" rx="1.5" fill={i % 2 ? BOIS : "#CA8A1B"} />
          <rect x={16 + (i % 2) * 6} y={22 + i * 14} width="10" height="12" rx="1.5" fill={BOIS_FONCE} />
        </g>
      ))}
      <rect x="54" y="18" width="5" height="78" fill="#130901" opacity="0.85" />
      <rect x="104" y="18" width="5" height="78" fill="#130901" opacity="0.85" />
    </svg>
  );
}
function Plaques() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <path d={`M24 ${78 - i * 9} L112 ${62 - i * 9} L140 ${70 - i * 9} L52 ${86 - i * 9} Z`} fill={i === 5 ? "#FBF8F3" : "#F2F1EE"} stroke="#99844C66" strokeWidth="1" />
          <path d={`M24 ${78 - i * 9} L52 ${86 - i * 9} L52 ${92 - i * 9} L24 ${84 - i * 9} Z`} fill="#F2F1EE" />
        </g>
      ))}
      <rect x="62" y="20" width="44" height="8" rx="2" fill="#130901" opacity="0.7" transform="rotate(-10 84 24)" />
    </svg>
  );
}
function Cable() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      <ellipse cx="80" cy="56" rx="50" ry="40" fill="none" stroke="#2E1B05" strokeWidth="16" />
      <ellipse cx="80" cy="56" rx="50" ry="40" fill="none" stroke="#99844C" strokeWidth="4" strokeDasharray="10 8" />
      <ellipse cx="80" cy="56" rx="24" ry="18" fill="#F2F1EE" />
      <path d="M124 70 Q146 82 150 100" fill="none" stroke="#2E1B05" strokeWidth="7" strokeLinecap="round" />
      <g strokeWidth="3" strokeLinecap="round">
        <line x1="148" y1="100" x2="146" y2="108" stroke="#96580C" />
        <line x1="151" y1="100" x2="152" y2="108" stroke="#130901" />
        <line x1="154" y1="99" x2="157" y2="106" stroke="#F4CB09" />
      </g>
    </svg>
  );
}
function Carrelage() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      <g transform="translate(80 58) skewX(-18) translate(-80 -58)">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={40 + c * 30} y={20 + r * 26} width="28" height="24" rx="1.5" fill={(r + c) % 2 ? "#F2F1EE" : "#F2F1EE"} stroke="#F4DB5C" strokeWidth="1" />),
        )}
      </g>
      <rect x="112" y="64" width="34" height="34" rx="3" fill="#CA8A1B" />
      <rect x="112" y="64" width="34" height="8" rx="2" fill="#96580C" />
    </svg>
  );
}
function Parpaings() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-full">
      <rect x="22" y="92" width="116" height="8" fill={BOIS} />
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => (
          <g key={`${r}-${c}`}>
            <rect x={28 + c * 54 + (r % 2) * 0} y={64 - r * 24} width="52" height="22" rx="1.5" fill="#99844C" stroke="#99844C" strokeWidth="1" />
            <rect x={36 + c * 54} y={70 - r * 24} width="14" height="10" rx="1" fill="#99844C" />
            <rect x={58 + c * 54} y={70 - r * 24} width="14" height="10" rx="1" fill="#99844C" />
          </g>
        )),
      )}
    </svg>
  );
}

/** Ce qu'on commande, dans les mots du comptoir : la désignation et la quantité telles qu'elles partent au négoce. */
export const FOURNITURES_EXEMPLE = [
  { photo: "ardoise", nom: "Ardoise naturelle 32×22", quantite: "2 760 pièces", metier: "Couverture", Dessin: Ardoises, fond: "bg-[#F2F1EE]" },
  { photo: "tuile", nom: "Tuile romane canal rouge", quantite: "1 250 pièces", metier: "Couverture", Dessin: Tuiles, fond: "bg-[#F2F1EE]" },
  { photo: "gouttiere", nom: "Gouttière zinc dév. 33", quantite: "4 longueurs de 4 m", metier: "Zinguerie", Dessin: Gouttiere, fond: "bg-[#F2F1EE]" },
  { photo: "liteau", nom: "Liteau sapin traité 27×38", quantite: "480 m", metier: "Charpente", Dessin: Liteaux, fond: "bg-[#F2F1EE]" },
  { photo: "ba13", nom: "Plaque de plâtre BA13", quantite: "84 plaques", metier: "Plâtrerie", Dessin: Plaques, fond: "bg-[#F2F1EE]" },
  { photo: "cable", nom: "Câble R2V 3G2,5", quantite: "3 couronnes de 100 m", metier: "Électricité", Dessin: Cable, fond: "bg-[#F2F1EE]" },
  { photo: "carrelage", nom: "Carrelage grès 60×60", quantite: "23 cartons", metier: "Carrelage", Dessin: Carrelage, fond: "bg-[#F2F1EE]" },
  { photo: "parpaing", nom: "Parpaing creux 20×20×50", quantite: "2 palettes", metier: "Maçonnerie", Dessin: Parpaings, fond: "bg-[#F2F1EE]" },
] as const;

/** Le groupé en image : un seul camion du négoce retenu, qui livre trois chantiers du département. */
export function TourneeGroupee({ className = "" }: { className?: string }) {
  const chantiers = [
    { x: 300, y: 54 },
    { x: 380, y: 112 },
    { x: 452, y: 46 },
  ];
  return (
    <svg viewBox="0 0 520 170" className={className} aria-hidden="true">
      {/* La route */}
      <path d="M0 140 C120 140 170 96 260 100 S420 150 520 120" fill="none" stroke="rgba(251,248,243,0.14)" strokeWidth="26" strokeLinecap="round" />
      <path d="M0 140 C120 140 170 96 260 100 S420 150 520 120" fill="none" stroke="rgba(251,248,243,0.5)" strokeWidth="2" strokeDasharray="10 12" />
      {/* Le camion plateau, chargé de palettes */}
      <g transform="translate(70 76)">
        <rect x="0" y="22" width="112" height="10" rx="2" fill="#F2F1EE" />
        <rect x="6" y="2" width="30" height="20" rx="2" fill="#614822" />
        <rect x="40" y="6" width="30" height="16" rx="2" fill="#96580C" />
        <rect x="74" y="0" width="30" height="22" rx="2" fill="#99844C" />
        <path d="M114 4 L138 4 L150 18 L150 32 L114 32 Z" fill="#FBF8F3" />
        <path d="M120 8 L136 8 L145 19 L120 19 Z" fill="#F4DB5C" />
        <circle cx="26" cy="36" r="9" fill="#130901" />
        <circle cx="26" cy="36" r="3.5" fill="#99844C" />
        <circle cx="132" cy="36" r="9" fill="#130901" />
        <circle cx="132" cy="36" r="3.5" fill="#99844C" />
      </g>
      {/* Trois chantiers, chacun avec son repère */}
      {chantiers.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <path d="M-22 22 L0 4 L22 22 Z" fill="#F2F1EE" />
          <rect x="-17" y="22" width="34" height="24" fill="#FBF8F3" />
          <rect x="-5" y="32" width="10" height="14" fill="#99844C" />
          <g transform="translate(0 -18)">
            <path d="M0 18 C-12 6 -10 -6 0 -6 C10 -6 12 6 0 18 Z" fill="#99844C" />
            <circle cx="0" cy="1" r="4" fill="#FBF8F3" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Le bas de page : le casque, le mètre et le crayon de l'artisan. */
export function OutilsArtisan({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 160" className={className} aria-hidden="true">
      <ellipse cx="130" cy="146" rx="112" ry="10" fill="rgba(251,248,243,0.08)" />
      {/* Casque de chantier */}
      <g transform="translate(34 40)">
        <path d="M6 72 Q8 6 68 6 Q128 6 130 72 Z" fill={CASQUE} />
        <path d="M60 6 Q68 0 76 6 L74 60 L62 60 Z" fill="#F4CB09" />
        <rect x="-6" y="68" width="148" height="14" rx="7" fill="#CA8A1B" />
      </g>
      {/* Mètre ruban */}
      <g transform="translate(168 80)">
        <rect x="0" y="0" width="56" height="56" rx="12" fill="#F4DB5C" />
        <circle cx="28" cy="28" r="12" fill="#130901" opacity="0.85" />
        <rect x="-60" y="42" width="62" height="10" fill="#F4DB5C" />
        <g stroke="#130901" strokeWidth="1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={-56 + i * 10} y1="42" x2={-56 + i * 10} y2={i % 2 ? 46 : 49} />
          ))}
        </g>
      </g>
      {/* Crayon de charpentier */}
      <g transform="rotate(-24 70 132)">
        <rect x="20" y="126" width="96" height="12" rx="2" fill="#130901" />
        <path d="M116 126 L134 132 L116 138 Z" fill="#F4DB5C" />
        <path d="M128 130 L134 132 L128 134 Z" fill="#130901" />
      </g>
    </svg>
  );
}
