"use client";

import type { Indicator } from "@/lib/engine/indicators";
import { LEVEL_LABEL, formatIndicator } from "@/lib/engine/indicators";
import { cx } from "./ui";

const LEVEL_STYLE = {
  good: { dot: "bg-pos", text: "text-pos", bg: "bg-pos/10" },
  watch: { dot: "bg-warn", text: "text-warn", bg: "bg-warn/10" },
  alert: { dot: "bg-neg", text: "text-neg", bg: "bg-neg/10" },
  neutral: { dot: "bg-series-1", text: "text-series-1", bg: "bg-series-1/10" },
};

export function IndicatorTile({ ind, compact }: { ind: Indicator; compact?: boolean }) {
  const st = LEVEL_STYLE[ind.level];
  return (
    <div className="soft-card flex flex-col rounded-[20px] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-medium leading-tight text-muted">{ind.label}</div>
        <span className={cx("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", ind.value === undefined ? "bg-line" : st.dot)} />
      </div>
      <div className="tabular mt-1.5 text-[21px] font-extrabold tracking-[-0.02em] text-navy">{formatIndicator(ind)}</div>
      {ind.value === undefined ? (
        <div className="mt-0.5 text-[11px] text-muted">Données insuffisantes</div>
      ) : (
        ind.level !== "neutral" && <div className={cx("mt-0.5 text-[11px] font-semibold", st.text)}>{LEVEL_LABEL[ind.level]}</div>
      )}
      {!compact && <div className="mt-2 text-[11.5px] leading-snug text-ink-2">{ind.explain}</div>}
    </div>
  );
}
