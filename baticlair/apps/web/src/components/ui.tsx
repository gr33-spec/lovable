"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { ApiError } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useBack } from "@/lib/history";

/*
 * Le design system (passe UI/UX, 23 octobre 2026, `docs/groupe/UI.md`), partagé par tous les écrans.
 * Zones tactiles ≥ 44 px ; jamais la couleur seule pour porter un sens ; un seul bouton principal par écran.
 */

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "ink";

const buttonClasses: Record<ButtonVariant, string> = {
  // L'action principale : la couleur d'accent, unie, un seul par écran.
  primary: "bg-accent text-on-accent active:bg-accent-hover",
  accent: "bg-accent text-on-accent active:bg-accent-hover",
  // Les actions secondaires : un contour.
  secondary: "border border-line bg-surface text-ink active:bg-ground",
  ghost: "bg-transparent text-accent-text active:bg-accent/10",
  ink: "bg-ink text-white active:opacity-90",
};

const BUTTON = "pressable inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-6 text-[16px] font-extrabold";

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
      className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-50 ${buttonClasses[variant]} ${className}`}
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
    <Link href={href} className={`${BUTTON} ${buttonClasses[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** Un champ : 52 px, bordure gris 2, focus accent. */
export const INPUT = "min-h-13 rounded-xl border border-line bg-surface px-4 text-[16px] outline-none transition-[border-color] duration-150 placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | undefined; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${INPUT} ${error ? "border-danger" : ""}`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-[14px] font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[14px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ className = "", children, ...props }: { className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-xl bg-surface shadow-card ${className}`}>
      {children}
    </div>
  );
}

type Tone = "ok" | "warn" | "danger" | "neutral";
const toneClasses: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-ground text-muted",
};

/** La pastille : pleine, ronde, 12 px. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[12px] font-semibold ${toneClasses[tone]}`}>{children}</span>;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-[36px] leading-[1.0] font-extrabold tracking-[-0.03em]">{children}</h1>;
}

/** Le titre d'une section d'écran (« Chantiers récents », « Mes lignes »). */
export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[20px] leading-tight font-extrabold tracking-[-0.02em]">
      {children}
    </h2>
  );
}

/** Le petit titre gris en capitales d'une carte de réglages (« ENTREPRISE »). */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">{children}</span>;
}

/**
 * Une ligne de liste (façon Linear / Airbnb) : une icône facultative, un titre, un sous-titre gris, un chevron. Un lien
 * ou un bouton ; 64 px ; fond gris 1 au toucher. À poser dans une `ListCard`.
 */
export function ListRow({
  href,
  onClick,
  icon,
  title,
  subtitle,
  right,
  chevron = true,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  chevron?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      {icon ? <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">{icon}</span> : null}
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[16px] font-semibold">{title}</span>
        {subtitle ? <span className="truncate text-[14px] text-muted">{subtitle}</span> : null}
      </span>
      {right}
      {chevron ? <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" /> : null}
    </>
  );
  const classes = `flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-[background-color] duration-150 active:bg-ground ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}

/** La carte qui porte des `ListRow`, séparées par un trait gris 2. */
export function ListCard({ children, className = "", as: Tag = "div", ...props }: { children: React.ReactNode; className?: string; as?: "div" | "ul" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag {...props} className={`flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-card ${className}`}>
      {children}
    </Tag>
  );
}

/** Le chrono de la commande du mois : le même partout (« Clôture dans 2 j 5 h »). */
export function Chrono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="status" className={`inline-flex items-center gap-2 text-[16px] font-semibold text-accent-text tabular-nums ${className}`}>
      <Clock size={18} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Retour : suit l'historique réel, sinon remonte au parent logique. */
export function BackButton({ fallback, label = fr.actions.back, compact = false }: { fallback: string; label?: string; compact?: boolean }) {
  const back = useBack(fallback);
  if (compact) {
    return (
      <button type="button" onClick={back} aria-label={label} className="pressable bouton-nuit flex size-11 shrink-0 items-center justify-center rounded-full">
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={back}
      className="pressable bouton-nuit inline-flex min-h-11 items-center gap-1 self-start rounded-full pr-4 pl-3 text-[14px] font-semibold"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      {label}
    </button>
  );
}

/** Erreur utile : ce qui s'est passé, si c'est récupérable, le code support. */
export function ErrorNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const pathname = usePathname();
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl bg-danger-bg p-4 text-danger">
      <p className="font-semibold">{error.message}</p>
      {error.supportId ? <p className="text-[14px]">Code support : {error.supportId}</p> : null}
      {/* Plan « finition », bloc 6 : une session expirée en pleine action dit quoi faire, et ramène ici après. */}
      {error.code === "unauthenticated" ? (
        <Link href={`/connexion?retour=${encodeURIComponent(pathname)}`} className="pressable inline-flex min-h-11 items-center self-start rounded-full bg-surface px-4 font-semibold text-ink">
          Me reconnecter
        </Link>
      ) : null}
      {onRetry && error.retryable ? (
        <Button variant="secondary" onClick={onRetry} className="self-start">
          {fr.actions.retry}
        </Button>
      ) : null}
    </div>
  );
}

/** Un état vide soigné : une icône, une phrase, un bouton. Jamais un écran blanc. */
export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface text-ink shadow-card" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h2>
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

/**
 * Un squelette de chargement, à la place du spinner sur les écrans principaux : des blocs gris 1 qui respirent, à la
 * hauteur du contenu attendu (zéro décalage). `lines` lignes de `ListRow`, ou une `card` d'une hauteur donnée.
 */
export function Skeleton({ lines = 0, card, label = "Chargement…", className = "" }: { lines?: number; card?: string; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={`flex flex-col gap-3 ${className}`}>
      <span className="sr-only">{label}</span>
      {card ? <div aria-hidden="true" className={`animate-pulse-soft rounded-xl bg-surface shadow-card ${card}`} /> : null}
      {lines > 0 ? (
        <div aria-hidden="true" className="animate-pulse-soft flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-card">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="h-4 w-2/5 rounded-full bg-ground" />
              <span className="h-3 w-1/4 rounded-full bg-ground" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
