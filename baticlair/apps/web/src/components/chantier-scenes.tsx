"use client";

/*
 * Retour du fondateur (2026-10-10) : « rends beaucoup plus sexy les animations, il faut que ça fasse autre chose que truc
 * fait avec de l'IA ». Deux scènes de métier, en CSS seul (aucune dépendance) :
 *  - la lecture : un surligneur passe sur le devis ligne à ligne, chaque ligne lue est cochée dans la marge, puis la page
 *    se tourne et la suivante arrive ;
 *  - le calcul : un pan de toit se couvre rang par rang, de l'égout au faîtage, les faîtières se posent, c'est prêt.
 * Sous « réduire les animations », chaque scène s'arrête sur son état final (le devis lu, le toit couvert).
 */

// ——— La lecture : le surligneur ———

const LINES = [78, 62, 84, 70, 56, 80, 66];
const LINE_TOP = 58;
const LINE_PITCH = 17;
const LINE_LEFT = 16;
const LINE_SPAN = 104;
const READ_CYCLE = 6.4;

const readKeyframes = (() => {
  const start = (i: number) => 6 + i * 9;
  const css: string[] = [];
  LINES.forEach((w, i) => {
    const s = start(i);
    const e = s + 6;
    css.push(`@keyframes bc-hl-${i}{0%,${s}%{transform:scaleX(0);opacity:1}${e}%,80%{transform:scaleX(1);opacity:1}86%,100%{transform:scaleX(1);opacity:0}}`);
    css.push(`@keyframes bc-tick-${i}{0%,${e}%{stroke-dashoffset:14;opacity:1}${e + 3}%,80%{stroke-dashoffset:0;opacity:1}86%,100%{stroke-dashoffset:0;opacity:0}}`);
  });
  // Le surligneur suit la ligne en cours : de son début à sa fin, puis retour à la ligne suivante.
  const pos = (x: number, i: number) => `transform:translate(${x}px,${LINE_TOP + i * LINE_PITCH}px)`;
  const marker = [`0%{${pos(LINE_LEFT, 0)};opacity:0}`, `4%{${pos(LINE_LEFT, 0)};opacity:1}`];
  LINES.forEach((w, i) => {
    marker.push(`${start(i)}%{${pos(LINE_LEFT, i)};opacity:1}`);
    marker.push(`${start(i) + 6}%{${pos(LINE_LEFT + (LINE_SPAN * w) / 100, i)};opacity:1}`);
  });
  marker.push(`74%{transform:translate(150px,40px);opacity:0}`, `100%{transform:translate(150px,40px);opacity:0}`);
  css.push(`@keyframes bc-marker{${marker.join("")}}`);
  // La page lue se tourne vers la gauche ; la suivante remonte de la pile.
  css.push(
    "@keyframes bc-page{0%,82%{transform:none;opacity:1}92%{transform:translateX(-135%) rotate(-14deg);opacity:0}92.1%{transform:translateY(12px) scale(.94);opacity:0}100%{transform:none;opacity:1}}",
  );
  return css.join("\n");
})();

export function ReadingScene() {
  const anim = (name: string) => ({ animation: `${name} ${READ_CYCLE}s cubic-bezier(.45,.05,.25,1) infinite both` });
  return (
    <div aria-hidden="true" className="relative h-56 w-44">
      <style>{readKeyframes}</style>
      {/* La pile : les pages suivantes, un peu de travers. */}
      <span className="absolute inset-0 translate-x-2 translate-y-2 rotate-[5deg] rounded-[14px] bg-[#dfe3ea]" />
      <span className="absolute inset-0 translate-x-1 translate-y-1 rotate-[2deg] rounded-[14px] bg-[#eceff4]" />
      <div className="absolute inset-0 overflow-hidden rounded-[14px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,0.6)]" style={anim("bc-page")}>
        {/* En-tête du devis : l'entreprise à gauche, le numéro à droite. */}
        <span className="absolute top-4 left-4 h-2.5 w-14 rounded-sm bg-[#0e1116]" />
        <span className="absolute top-[22px] left-4 h-1.5 w-9 rounded-sm bg-[#c9ced8]" />
        <span className="absolute top-4 right-4 h-2.5 w-8 rounded-sm bg-[#c9ced8]" />
        <span className="absolute top-[42px] right-4 left-4 h-px bg-[#e3e6ec]" />
        {LINES.map((w, i) => (
          <span key={i} className="absolute left-4" style={{ top: LINE_TOP + i * LINE_PITCH - 4, width: LINE_SPAN }}>
            {/* Le trait de surligneur, posé SOUS le texte, de gauche à droite. */}
            <span
              className="absolute top-[-2px] left-[-3px] h-[12px] origin-left rounded-[3px] bg-[#ffd43b]/80"
              style={{ width: `calc(${w}% + 6px)`, ...anim(`bc-hl-${i}`) }}
            />
            <span className="relative block h-[7px] rounded-[2px] bg-[#9aa3b2]" style={{ width: `${w}%` }} />
          </span>
        ))}
        {/* La coche dans la marge, ligne par ligne. */}
        <svg className="absolute top-0 right-2 h-full w-4" viewBox={`0 0 16 224`} fill="none">
          {LINES.map((_, i) => (
            <path
              key={i}
              d={`M3 ${LINE_TOP + i * LINE_PITCH} l3 3 l6 -7`}
              stroke="#0b7a53"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14"
              style={anim(`bc-tick-${i}`)}
            />
          ))}
        </svg>
        {/* Le total en bas à droite. */}
        <span className="absolute right-4 bottom-4 h-2.5 w-12 rounded-sm bg-[#0e1116]" />
      </div>
      {/* Le surligneur : pointe jaune, corps sombre, tenu en biais. */}
      <span className="absolute top-0 left-0 opacity-0" style={anim("bc-marker")}>
        <span className="absolute top-0 left-0 flex origin-left -translate-y-1/2 rotate-[-38deg] items-center drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)]">
          <span className="h-[9px] w-[6px] rounded-l-[2px] bg-[#ffd43b]" />
          <span className="h-[12px] w-[34px] bg-[#1f2633]" />
          <span className="h-[12px] w-[10px] rounded-r-[4px] bg-[#ffd43b]" />
        </span>
      </span>
    </div>
  );
}

// ——— Le calcul : le toit se couvre ———

const ROOF = { bottom: 112, top: 42, left: 18, right: 222, topLeft: 54, topRight: 186 };
const ROWS = 5;
const ROW_H = (ROOF.bottom - ROOF.top) / ROWS;
const TILE_W = 18;
const ROOF_CYCLE = 8;
const TILE_TONES = ["#c65a31", "#b84f2a", "#d0683a"];
const WALL = { left: 38, right: 202, top: ROOF.bottom, bottom: 174 };

/** Un tuile plate : haut droit (caché sous le rang du dessus), bas arrondi. */
const tilePath = (x: number, y: number, w: number, h: number, r = 4.5) =>
  `M${x} ${y} h${w} v${h - r} q0 ${r} ${-r} ${r} h${-(w - 2 * r)} q${-r} 0 ${-r} ${-r} Z`;

/** Les tuiles, rang par rang depuis l'égout, chaque rang décalé d'une demi-tuile comme sur un vrai toit. */
const TILES = (() => {
  const tiles: { d: string; delay: number; tone: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = ROOF.bottom - (r + 1) * ROW_H - 3;
    const offset = r % 2 ? TILE_W / 2 : 0;
    for (let k = 0, x = ROOF.left - offset; x < ROOF.right; k++, x += TILE_W) {
      tiles.push({ d: tilePath(x + 0.7, y, TILE_W - 1.4, ROW_H + 3), delay: 0.7 + r * 0.5 + k * 0.03, tone: TILE_TONES[(r * 7 + k * 3) % 3]! });
    }
  }
  return tiles;
})();
const RIDGE_DELAY = 0.7 + ROWS * 0.5 + 0.15;
const ROOF_OUTLINE = `M${ROOF.left} ${ROOF.bottom} L${ROOF.topLeft} ${ROOF.top} L${ROOF.topRight} ${ROOF.top} L${ROOF.right} ${ROOF.bottom} Z`;

const roofKeyframes = [
  "@keyframes bc-frame{0%{stroke-dashoffset:620;opacity:1}9%,66%{stroke-dashoffset:0;opacity:1}74%,100%{stroke-dashoffset:0;opacity:0}}",
  "@keyframes bc-wall{0%,4%{opacity:0}10%,100%{opacity:1}}",
  "@keyframes bc-tile{0%{transform:translateY(-30px) rotate(-10deg);opacity:0}5%{transform:translateY(1.5px);opacity:1}7%{transform:none;opacity:1}60%{transform:none;opacity:1}67%,100%{transform:translateY(5px);opacity:0}}",
  "@keyframes bc-ridge{0%{transform:translateY(-34px);opacity:0}5%{transform:translateY(1px);opacity:1}7%,52%{transform:none;opacity:1}59%,100%{transform:none;opacity:0}}",
  "@keyframes bc-sheen{0%{transform:translateX(-90px);opacity:0}2%{opacity:1}12%{transform:translateX(260px);opacity:1}13%,100%{transform:translateX(260px);opacity:0}}",
  "@keyframes bc-done{0%{transform:scale(0);opacity:0}4%{transform:scale(1.2);opacity:1}6.5%,46%{transform:scale(1);opacity:1}52%,100%{transform:scale(1);opacity:0}}",
].join("\n");

export function RoofScene() {
  const anim = (name: string, delay = 0, ease = "cubic-bezier(.3,1.4,.5,1)") => ({ animation: `${name} ${ROOF_CYCLE}s ${ease} ${delay}s infinite both` });
  const box = { transformBox: "fill-box" as const, transformOrigin: "center" };
  return (
    <svg aria-hidden="true" viewBox="0 0 240 186" className="h-52 w-[17rem]">
      <style>{roofKeyframes}</style>
      <defs>
        <clipPath id="bc-roof-clip">
          <path d={ROOF_OUTLINE} />
        </clipPath>
        <linearGradient id="bc-tile-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="bc-sheen-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Le sol et la maison : murs, porte, deux fenêtres. */}
      <path d="M6 174 H234" stroke="#e8ecf3" strokeOpacity="0.25" strokeWidth="1.5" />
      <g style={anim("bc-wall", 0, "ease-out")}>
        <rect x={WALL.left} y={WALL.top} width={WALL.right - WALL.left} height={WALL.bottom - WALL.top} fill="#2a3550" />
        <rect x="108" y="138" width="24" height="36" rx="2" fill="#3b4a6b" />
        <rect x="58" y="128" width="28" height="22" rx="2" fill="#f2c96b" fillOpacity="0.85" />
        <rect x="154" y="128" width="28" height="22" rx="2" fill="#f2c96b" fillOpacity="0.85" />
        <path d="M72 128 V150 M58 139 H86 M168 128 V150 M154 139 H182" stroke="#2a3550" strokeWidth="2" />
      </g>
      {/* La charpente se trace d'abord : le pan et ses chevrons. */}
      <g stroke="#e8ecf3" strokeOpacity="0.6" strokeWidth="1.5" fill="none" strokeDasharray="620" style={anim("bc-frame", 0, "ease-out")}>
        <path d={ROOF_OUTLINE} />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <path key={t} d={`M${ROOF.left + (ROOF.right - ROOF.left) * t} ${ROOF.bottom} L${ROOF.topLeft + (ROOF.topRight - ROOF.topLeft) * t} ${ROOF.top}`} />
        ))}
      </g>
      {/* Les tuiles tombent en place, de l'égout vers le faîtage, puis un reflet passe sur le toit fini. */}
      <g clipPath="url(#bc-roof-clip)">
        {TILES.map((t, i) => (
          <g key={i} style={{ ...anim("bc-tile", t.delay), ...box }}>
            <path d={t.d} fill={t.tone} />
            <path d={t.d} fill="url(#bc-tile-shade)" />
          </g>
        ))}
        <rect x="0" y={ROOF.top - 10} width="70" height={ROOF.bottom - ROOF.top + 20} fill="url(#bc-sheen-band)" style={anim("bc-sheen", RIDGE_DELAY + 0.5, "ease-in-out")} />
      </g>
      {/* La cheminée et les faîtières, posées en dernier. */}
      <g style={{ ...anim("bc-ridge", RIDGE_DELAY - 0.3), ...box }}>
        <rect x="158" y="22" width="16" height="32" fill="#5a6378" />
        <rect x="155" y="18" width="22" height="6" rx="1.5" fill="#6d778d" />
      </g>
      {Array.from({ length: 7 }, (_, k) => (
        <g key={k} style={{ ...anim("bc-ridge", RIDGE_DELAY + k * 0.07), ...box }}>
          <rect x={ROOF.topLeft - 5 + k * 20} y={ROOF.top - 8} width="21" height="11" rx="5.5" fill="#a9441f" />
          <rect x={ROOF.topLeft - 5 + k * 20} y={ROOF.top - 8} width="21" height="5" rx="2.5" fill="#fff" fillOpacity="0.14" />
        </g>
      ))}
      {/* C'est couvert : la coche. */}
      <g style={{ ...anim("bc-done", RIDGE_DELAY + 0.8), ...box }}>
        <circle cx="214" cy="26" r="15" fill="#12a372" />
        <path d="M207 26 l5 5 l9 -10" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}
