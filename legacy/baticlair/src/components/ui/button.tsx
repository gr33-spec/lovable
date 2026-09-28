import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "tap-target inline-flex items-center justify-center gap-2 rounded-3xl font-display font-extrabold text-base leading-tight motion-safe:transition motion-safe:active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-5 py-3";

const variants: Record<Variant, string> = {
  // CTA principal : dégradé signature violet → bleu (design system Rappidos).
  primary: "bg-gradient-primary text-white shadow-soft hover:brightness-110",
  secondary: "bg-card text-ink border border-line shadow-soft hover:bg-paper",
  ghost: "bg-transparent text-accent hover:bg-accent/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/** Bouton principal de l'app : gros, tactile, conforme au design system §5. */
export function Button({
  variant = "primary",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
      {...props}
    />
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

/** Variante "lien" du bouton, pour naviguer entre les écrans. */
export function LinkButton({
  href,
  variant = "primary",
  fullWidth,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
    >
      {children}
    </Link>
  );
}
