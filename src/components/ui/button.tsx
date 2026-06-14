import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "tap-target inline-flex items-center justify-center gap-2 rounded-xl font-display font-extrabold text-base leading-tight transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-5 py-3";

const variants: Record<Variant, string> = {
  primary: "bg-amber text-white shadow-stamp border-2 border-ink",
  secondary: "bg-transparent text-ink border-2 border-ink",
  ghost: "bg-transparent text-blue border-2 border-transparent",
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
