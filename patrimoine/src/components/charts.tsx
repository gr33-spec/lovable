"use client";

import { useEffect, useRef, useState } from "react";
import { eur, eurCompact } from "@/lib/format";

// Graphiques SVG légers : une seule échelle par graphique, lignes fines,
// réticule + info-bulle au toucher, année sélectionnable.

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 320));
    ro.observe(el);
    setWidth(el.clientWidth || 320);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Arrondi au dixième : évite les écarts d'arrondi serveur / navigateur. */
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface Series {
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 52 };

export function LineChart({
  years,
  series,
  height = 190,
  selectedYear,
  onSelectYear,
  area = true,
  markers = [],
  step = false,
}: {
  years: number[];
  series: Series[];
  height?: number;
  selectedYear?: number;
  onSelectYear?: (y: number) => void;
  area?: boolean;
  /** Années à signaler par un petit repère sur l'axe (ex. fins de crédit). */
  markers?: number[];
  /** Tracé en escalier : la valeur d'une année vaut jusqu'à la suivante. */
  step?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => r1(PAD.left + (years.length <= 1 ? 0 : (i / (years.length - 1)) * innerW));
  const y = (v: number) => r1(PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH);
  const active = hover ?? (selectedYear !== undefined ? years.indexOf(selectedYear) : -1);

  const indexFromEvent = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const rel = clientX - rect.left - PAD.left;
    return Math.max(0, Math.min(years.length - 1, Math.round((rel / innerW) * (years.length - 1))));
  };

  const labelEvery = years.length > 20 ? 5 : years.length > 10 ? 2 : 1;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        className="touch-pan-y"
        onPointerMove={(e) => setHover(indexFromEvent(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => {
          const i = indexFromEvent(e.clientX, e.currentTarget);
          setHover(i);
          onSelectYear?.(years[i]);
        }}
        role="img"
        aria-label={series.map((s) => s.label).join(", ")}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c9ced6" : "#eef0f3"} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8a93a3" className="tabular">
              {eurCompact(t)}
            </text>
          </g>
        ))}
        {years.map((yr, i) =>
          i % labelEvery === 0 ? (
            <text key={yr} x={x(i)} y={height - 6} textAnchor={i === years.length - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize={11} fill="#8a93a3">
              {yr}
            </text>
          ) : null,
        )}
        {markers.map((yr) => {
          const i = years.indexOf(yr);
          if (i < 0) return null;
          return <circle key={`m${yr}`} cx={x(i)} cy={PAD.top + innerH} r={4} fill="#b08d57" stroke="#fff" strokeWidth={2} />;
        })}
        {series.map((s, si) => {
          const d = step
            ? s.values.map((v, i) => (i === 0 ? `M${x(0).toFixed(1)},${y(v).toFixed(1)}` : `L${x(i).toFixed(1)},${y(s.values[i - 1]).toFixed(1)} L${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ")
            : s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          const areaD = `${d} L${x(s.values.length - 1)},${y(Math.max(yMin, 0))} L${x(0)},${y(Math.max(yMin, 0))} Z`;
          return (
            <g key={s.label}>
              {area && si === 0 && <path d={areaD} fill={s.color} opacity={0.08} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {active >= 0 && (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="#0f1b2d" strokeOpacity={0.25} strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.label} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {active >= 0 && (
        <Tooltip x={x(active)} width={width}>
          <div className="font-semibold text-ink">{years[active]}</div>
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
              <span className="text-ink-2">{s.label}</span>
              <span className="tabular ml-auto pl-2 font-medium text-ink">{eur(s.values[active])}</span>
            </div>
          ))}
        </Tooltip>
      )}
      {series.length > 1 && <Legend series={series} />}
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const left = x > width / 2 ? undefined : x + 10;
  const right = x > width / 2 ? width - x + 10 : undefined;
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-xl bg-card/95 px-3 py-2 text-xs shadow-lg ring-1 ring-black/5"
      style={{ left, right }}
    >
      {children}
    </div>
  );
}

export function Legend({ series }: { series: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-ink-2">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <svg width="16" height="4">
            <line x1="0" x2="16" y1="2" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
          </svg>
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function BarChart({
  years,
  values,
  height = 170,
  selectedYear,
  onSelectYear,
  label,
}: {
  years: number[];
  values: number[];
  height?: number;
  selectedYear?: number;
  onSelectYear?: (y: number) => void;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, years.length);
  const barW = Math.max(2, slot - 2);
  const y = (v: number) => r1(PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH);
  const active = hover ?? (selectedYear !== undefined ? years.indexOf(selectedYear) : -1);
  const labelEvery = years.length > 20 ? 5 : years.length > 10 ? 2 : 1;
  const indexFromEvent = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(years.length - 1, Math.floor((clientX - rect.left - PAD.left) / slot)));
  };
  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        className="touch-pan-y"
        onPointerMove={(e) => setHover(indexFromEvent(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => {
          const i = indexFromEvent(e.clientX, e.currentTarget);
          setHover(i);
          onSelectYear?.(years[i]);
        }}
        role="img"
        aria-label={label}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c9ced6" : "#eef0f3"} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8a93a3">
              {eurCompact(t)}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const top = y(Math.max(0, v));
          const h = Math.max(1, Math.abs(y(v) - y(0)));
          return (
            <rect
              key={years[i]}
              x={r1(PAD.left + i * slot + 1)}
              y={top}
              width={r1(barW)}
              height={r1(h)}
              rx={Math.min(3, barW / 2)}
              fill={v >= 0 ? "var(--brand)" : "var(--neg)"}
              opacity={active >= 0 && active !== i ? 0.45 : 1}
            />
          );
        })}
        {years.map((yr, i) =>
          i % labelEvery === 0 ? (
            <text key={yr} x={PAD.left + i * slot + slot / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="#8a93a3">
              {yr}
            </text>
          ) : null,
        )}
      </svg>
      {active >= 0 && (
        <Tooltip x={PAD.left + active * slot + slot / 2} width={width}>
          <div className="font-semibold text-ink">{years[active]}</div>
          <div className="whitespace-nowrap text-ink-2">
            {label} : <span className="tabular font-medium text-ink">{eur(values[active])}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
}
