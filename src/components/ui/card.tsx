import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Carte de contenu : fond uni, bordure discrète, ombre douce (design system §5). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-card p-4 shadow-soft transition-colors",
        className
      )}
      {...props}
    />
  );
}
