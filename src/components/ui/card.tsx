import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Carte "fiche de chantier" : bordure encre + ombre tampon (design system §5). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-ink bg-card p-4 shadow-stamp",
        className
      )}
      {...props}
    />
  );
}
