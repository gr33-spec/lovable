"use client";

/*
 * Retour du fondateur (2026-10-10) : « rends beaucoup plus sexy les animations, il faut que ça fasse autre chose que truc
 * fait avec de l'IA ». Deux scènes de métier, en CSS seul (aucune dépendance) :
 *  - la lecture : un surligneur passe sur le devis ligne à ligne, chaque ligne lue est cochée dans la marge, puis la page
 *    se tourne et la suivante arrive ;
 *  - le calcul (retour du fondateur, 2026-10-10 : « plus moderne, on est sur du multimétier », la maison retirée) : les
 *    lignes du devis s'en détachent une à une et se posent dans la liste, chacune avec son point vert, comme dans l'app.
 * Sous « réduire les animations », chaque scène s'arrête sur son état final (le devis lu, la liste remplie).
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

// ——— Le calcul : le devis devient la liste ———

/** Le devis (à gauche) et la liste (à droite), en px dans la scène de 296 × 196. */
const SHEET = { x: 8, y: 34, w: 112, h: 140 };
const LIST = { x: 150, y: 18, w: 138, h: 166 };
const ITEMS = [
  { line: 70, name: 62, qty: 18 },
  { line: 54, name: 48, qty: 22 },
  { line: 78, name: 70, qty: 14 },
  { line: 60, name: 54, qty: 20 },
  { line: 66, name: 44, qty: 16 },
];
const SHEET_LINE_Y = (i: number) => SHEET.y + 40 + i * 17;
const ROW_Y = (i: number) => LIST.y + 40 + i * 24;
const LIST_CYCLE = 6.4;

const listKeyframes = (() => {
  const css: string[] = [];
  ITEMS.forEach((it, i) => {
    const s = 8 + i * 11;
    const land = s + 9;
    const fromX = SHEET.x + 14;
    const fromY = SHEET_LINE_Y(i);
    const toX = LIST.x + 30;
    const toY = ROW_Y(i) + 2;
    const midX = (fromX + toX) / 2;
    const midY = Math.min(fromY, toY) - 26;
    // La ligne quitte le devis en arc, se resserre et se pose à sa place dans la liste.
    css.push(
      `@keyframes bc-fly-${i}{0%,${s}%{transform:translate(${fromX}px,${fromY}px) scaleX(1);opacity:0}${s + 1}%{opacity:1}${s + 5}%{transform:translate(${midX}px,${midY}px) scaleX(.8);opacity:1}${land}%{transform:translate(${toX}px,${toY}px) scaleX(.72);opacity:1}${land + 2}%,100%{transform:translate(${toX}px,${toY}px) scaleX(.72);opacity:0}}`,
    );
    // Sa place sur le devis pâlit : elle est lue.
    css.push(`@keyframes bc-src-${i}{0%,${s}%{opacity:1}${s + 2}%,88%{opacity:.22}94%,100%{opacity:1}}`);
    // La ligne de la liste apparaît, puis son point vert.
    css.push(`@keyframes bc-row-${i}{0%,${land}%{opacity:0;transform:translateX(-6px)}${land + 3}%,86%{opacity:1;transform:none}92%,100%{opacity:0;transform:none}}`);
    css.push(`@keyframes bc-dot-${i}{0%,${land + 2}%{transform:scale(0)}${land + 5}%{transform:scale(1.35)}${land + 8}%,86%{transform:scale(1)}92%,100%{transform:scale(1)}}`);
  });
  css.push("@keyframes bc-ready{0%,70%{transform:scale(0);opacity:0}74%{transform:scale(1.15);opacity:1}77%,86%{transform:scale(1);opacity:1}92%,100%{transform:scale(1);opacity:0}}");
  css.push("@keyframes bc-glow{0%,70%{opacity:0}74%{opacity:1}86%{opacity:1}92%,100%{opacity:0}}");
  return css.join("\n");
})();

export function ListScene() {
  const anim = (name: string, ease = "cubic-bezier(.22,1,.36,1)") => ({ animation: `${name} ${LIST_CYCLE}s ${ease} infinite both` });
  return (
    <div aria-hidden="true" className="relative h-[196px] w-[296px]">
      <style>{listKeyframes}</style>
      {/* Le devis : en-tête, lignes, total. */}
      <div
        className="absolute rounded-[14px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,0.6)]"
        style={{ left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h, transform: "rotate(-4deg)" }}
      >
        <span className="absolute top-3.5 left-3.5 h-2 w-12 rounded-sm bg-[#0e1116]" />
        <span className="absolute top-3.5 right-3.5 h-2 w-6 rounded-sm bg-[#c9ced8]" />
        {ITEMS.map((it, i) => (
          <span key={i} className="absolute left-3.5 h-[6px] rounded-[2px] bg-[#9aa3b2]" style={{ top: SHEET_LINE_Y(i) - SHEET.y, width: `${it.line}%`, ...anim(`bc-src-${i}`, "ease-out") }} />
        ))}
        <span className="absolute right-3.5 bottom-3.5 h-2 w-10 rounded-sm bg-[#0e1116]" />
      </div>
      {/* La liste : la même que dans l'app, un point vert, un nom, une quantité. */}
      <div className="absolute rounded-[16px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,0.6)]" style={{ left: LIST.x, top: LIST.y, width: LIST.w, height: LIST.h }}>
        <span className="absolute inset-0 rounded-[16px] ring-2 ring-[#12a372]/70" style={anim("bc-glow", "ease-out")} />
        <span className="absolute top-4 left-4 h-2.5 w-16 rounded-sm bg-[#0e1116]" />
        {ITEMS.map((it, i) => (
          <span key={i} className="absolute right-4 left-4 flex items-center gap-2" style={{ top: ROW_Y(i) - LIST.y - 2, ...anim(`bc-row-${i}`) }}>
            <span className="size-2.5 shrink-0 rounded-full bg-[#12a372]" style={anim(`bc-dot-${i}`, "cubic-bezier(.3,1.6,.5,1)")} />
            <span className="h-[7px] rounded-[2px] bg-[#3b4456]" style={{ width: `${it.name}%` }} />
            <span className="ml-auto h-[7px] rounded-[2px] bg-[#0e1116]" style={{ width: `${it.qty}%` }} />
          </span>
        ))}
        {/* La liste est prête. */}
        <span className="absolute -top-2.5 -right-2.5 flex size-8 items-center justify-center rounded-full bg-[#12a372] shadow-[0_6px_14px_-4px_rgba(18,163,114,0.7)]" style={anim("bc-ready", "cubic-bezier(.3,1.6,.5,1)")}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </div>
      {/* Les lignes en vol, du devis à la liste. */}
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 h-[7px] origin-left rounded-full bg-[#ffd43b] shadow-[0_0_0_3px_rgba(255,212,59,0.18)]"
          style={{ width: (SHEET.w - 28) * (it.line / 100), opacity: 0, ...anim(`bc-fly-${i}`) }}
        />
      ))}
    </div>
  );
}
