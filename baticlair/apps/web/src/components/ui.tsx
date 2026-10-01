"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ApiError } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useBack } from "@/lib/history";

/*
 * Design system minimal, partagé par tous les écrans (docs/ux-principles.md).
 * Zones tactiles ≥ 44 px ; jamais la couleur seule pour porter un sens.
 */

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";

const buttonClasses: Record<ButtonVariant, string> = {
  // Action principale : la couleur de la marque (jeton accent).
  primary: "bg-accent text-white",
  accent: "bg-accent text-white",
  secondary: "bg-surface text-ink shadow-card",
  ghost: "bg-transparent text-accent-text",
};

export function Button({
  variant = "primary",
  pending = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; pending?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${buttonClasses[variant]} ${className}`}
    >
      {pending ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold transition active:scale-[0.98] ${buttonClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | undefined; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`min-h-13 rounded-2xl bg-surface px-4 text-base shadow-card outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ink ${error ? "ring-2 ring-danger" : ""}`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-3xl bg-surface shadow-card ${className}`}>{children}</div>;
}

type Tone = "ok" | "warn" | "danger" | "neutral";
const toneClasses: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-line text-[#3a414b]",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${toneClasses[tone]}`}>{children}</span>;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">{children}</h1>;
}

/** Retour : suit l'historique réel, sinon remonte au parent logique. */
export function BackButton({ fallback, label = fr.actions.back }: { fallback: string; label?: string }) {
  const back = useBack(fallback);
  return (
    <button
      type="button"
      onClick={back}
      className="inline-flex min-h-11 items-center gap-1 self-start rounded-full bg-surface pr-4 pl-2.5 text-sm font-bold shadow-card"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      {label}
    </button>
  );
}

/** Erreur utile : ce qui s'est passé, si c'est récupérable, le code support. */
export function ErrorNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-3xl bg-danger-bg p-4 text-danger">
      <p className="font-bold">{error.message}</p>
      {error.supportId ? <p className="text-sm">Code support : {error.supportId}</p> : null}
      {onRetry && error.retryable ? (
        <Button variant="secondary" onClick={onRetry} className="self-start">
          {fr.actions.retry}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <span className="flex size-22 items-center justify-center rounded-[28px] bg-surface text-accent shadow-card" aria-hidden="true">
        {icon}
      </span>
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">{title}</h2>
      {children}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex justify-center py-10" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-4 border-line border-t-accent" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
