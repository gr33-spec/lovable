import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** Progression entre 0 et 1. */
  value: number;
  className?: string;
}

/** Barre de progression (ex : devis reçus sur un chantier), design system §5. */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-primary motion-safe:transition-[width] motion-safe:duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
