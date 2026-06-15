import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "accent" | "neutral";

const tones: Record<Tone, string> = {
  green: "bg-green text-white",
  red: "bg-red text-white",
  accent: "bg-accent text-white",
  neutral: "bg-card text-ink border border-line",
};

interface VerdictProps {
  tone: Tone;
  label: string;
  amount: string;
  description?: ReactNode;
  className?: string;
}

/**
 * Grand bloc "verdict" affiché après une analyse : le montant doit se voir
 * en un coup d'oeil (design system §5 — "Le chiffre d'abord").
 */
export function Verdict({ tone, label, amount, description, className }: VerdictProps) {
  return (
    <div
      className={cn(
        "rounded-3xl p-5 shadow-soft-lg text-center",
        tones[tone],
        className
      )}
    >
      <p className="font-sans text-sm font-semibold uppercase tracking-wide opacity-90">
        {label}
      </p>
      <p className="font-display text-4xl font-black leading-tight mt-1 break-words">
        {amount}
      </p>
      {description ? (
        <p className="font-sans text-sm mt-2 opacity-95">{description}</p>
      ) : null}
    </div>
  );
}
