import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "accent" | "neutral";

const tones: Record<Tone, { box: string; amount: string }> = {
  green: { box: "bg-green text-white", amount: "text-white" },
  red: { box: "bg-red text-white", amount: "text-white" },
  // Le hero des économies : dégradé violet → bleu, montant en or (l'argent).
  accent: { box: "bg-gradient-primary text-white", amount: "text-amber" },
  neutral: { box: "bg-card text-ink border border-line", amount: "text-ink" },
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
        "rounded-3xl p-5 shadow-soft-lg text-center motion-safe:animate-card-in",
        tones[tone].box,
        className
      )}
    >
      <p className="font-sans text-sm font-semibold uppercase tracking-wide opacity-90">
        {label}
      </p>
      <p className={cn("font-display text-4xl font-black leading-tight mt-1 break-words", tones[tone].amount)}>
        {amount}
      </p>
      {description ? (
        <p className="font-sans text-sm mt-2 opacity-95">{description}</p>
      ) : null}
    </div>
  );
}
