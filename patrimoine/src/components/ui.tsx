"use client";

import { goBack, openOverlay } from "@/lib/nav";
import type { Crumb } from "@/lib/crumbs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { openDocument } from "./pdf-viewer";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { INSUFFICIENT } from "@/lib/format";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ——— Mise en page ———

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  crumbs,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: string | boolean;
  action?: ReactNode;
  /** Parents de l'écran (Patrimoine › Société › Immeuble) : on voit où l'on est et on remonte d'un appui. */
  crumbs?: Crumb[];
}) {
  const router = useRouter();
  return (
    <header className="safe-top sticky top-0 z-20 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 pb-3 pt-4 lg:max-w-[2000px] lg:px-9 xl:px-11">
        {back && (
          <button
            // Écran précédent réel ; `back` ne sert que si l'on est arrivé directement ici.
            onClick={() => goBack(router, typeof back === "string" ? back : "/")}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-brand active:bg-black/5"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Vous êtes ici" className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[12.5px] font-medium text-muted">
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} className={cx("flex min-w-0 items-center gap-1", i < crumbs.length - 1 ? "shrink-[2]" : "shrink")}>
                  {i > 0 && <ChevronRight size={12} className="shrink-0 text-muted/60" />}
                  {c.href ? (
                    <Link href={c.href} className="truncate hover:text-brand hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {/* Titres longs : taille réduite et deux lignes plutôt qu'un titre coupé. */}
          <h1
            className={cx(
              "font-extrabold tracking-[-0.02em] text-navy",
              title.length <= (action ? 11 : 16) ? "truncate text-[30px]" : title.length <= 24 ? "line-clamp-2 text-[25px] leading-[1.15]" : "line-clamp-2 text-[21px] leading-[1.2]",
            )}
          >
            {title}
          </h1>
          {subtitle && <div className="truncate text-sm text-muted">{subtitle}</div>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl px-4 pb-32 lg:max-w-[2000px] lg:px-8 lg:pb-16 xl:px-10">{children}</main>;
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "soft-card rounded-[26px] p-5",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between px-1">
      <h2 className="text-[19px] font-bold tracking-[-0.01em] text-navy">{children}</h2>
      {action}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
  big,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "pos" | "neg" | "neutral";
  big?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted">{label}</div>
      <div
        className={cx(
          "tabular font-bold tracking-[-0.02em]",
          typeof value === "string" && "truncate",
          big ? "text-[30px]" : "text-[19px]",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
          (!tone || tone === "neutral") && "text-ink",
        )}
      >
        {value}
      </div>
      {hint && <div className="truncate text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** Valeur impossible à calculer : on le dit, et on mène directement à ce qu'il faut renseigner. */
export function MissingData({ action, href, onClick, dark }: { action?: string; href?: string; onClick?: () => void; dark?: boolean }) {
  const cls = cx("mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", dark ? "bg-white/15 text-white" : "bg-series-1/10 text-series-1");
  return (
    <span className="block">
      <span className={cx("block text-[15px] font-semibold leading-snug", dark ? "text-white/80" : "text-muted")}>{INSUFFICIENT}</span>
      {action && href && (
        <Link href={href} className={cls}>
          {action} <ChevronRight size={13} />
        </Link>
      )}
      {action && !href && onClick && (
        <button type="button" onClick={onClick} className={cls}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </span>
  );
}

export function Insufficient({ className }: { className?: string }) {
  return <span className={cx("text-[15px] font-medium text-muted", className)}>{INSUFFICIENT}</span>;
}

export function Row({
  href,
  onClick,
  icon,
  title,
  subtitle,
  right,
  rightSub,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  rightSub?: ReactNode;
}) {
  const content = (
    <>
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-brand">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium text-ink">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-muted">{subtitle}</div>}
      </div>
      {(right || rightSub) && (
        <div className="shrink-0 text-right">
          <div className="tabular text-[15px] font-semibold text-ink">{right}</div>
          {rightSub && <div className="tabular text-xs text-muted">{rightSub}</div>}
        </div>
      )}
      {(href || onClick) && <ChevronRight size={18} className="shrink-0 text-muted/70" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 py-3 text-left active:opacity-60";
  if (href?.startsWith("/api/")) {
    return (
      <button type="button" onClick={() => openDocument(href)} className={cls}>
        {content}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}

export function Divided({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line">{children}</div>;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-soft text-brand">{icon}</div>}
      <div className="text-[17px] font-semibold text-ink">{title}</div>
      {text && <div className="mt-1 max-w-xs text-sm text-muted">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "pos" | "neg" | "warn" | "gold" | "blue" }) {
  const tones = {
    neutral: "bg-soft text-ink-2",
    pos: "bg-pos/10 text-pos",
    neg: "bg-neg/10 text-neg",
    warn: "bg-warn/10 text-warn",
    gold: "bg-gold/15 text-[#7d6238]",
    blue: "bg-series-1/10 text-series-1",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

// ——— Boutons ———

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  full,
  icon,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
  href?: string;
}) {
  // Double appui rapide (écran tactile, souris) : une seule action, jamais deux créations.
  const last = useRef(0);
  const click = onClick
    ? () => {
        const now = Date.now();
        if (now - last.current < 700) return;
        last.current = now;
        onClick();
      }
    : undefined;
  const cls = cx(
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-[16px] font-semibold transition active:scale-[0.98] disabled:opacity-40",
    variant === "primary" && "bg-brand text-on-brand shadow-sm hover:bg-brand-hover active:bg-brand-hover",
    variant === "secondary" && "bg-soft text-brand hover:bg-brand/10",
    variant === "danger" && "bg-neg/10 text-neg",
    variant === "ghost" && "text-brand",
    full && "w-full",
  );
  if (href?.startsWith("/api/")) {
    // Documents générés : visionneuse intégrée (un PDF plein écran n'a pas de bouton retour dans l'app installée).
    return (
      <button type="button" disabled={disabled} onClick={() => openDocument(href)} className={cls}>
        {icon}
        {children}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={click} disabled={disabled} className={cls}>
      {icon}
      {children}
    </button>
  );
}

export function RoundButton({ onClick, children, label }: { onClick: () => void; children: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-on-brand shadow-md hover:bg-brand-hover active:scale-95"
    >
      {children}
    </button>
  );
}

export function ConfirmDelete({ label = "Supprimer", message, onConfirm }: { label?: string; message: string; onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <Button variant="danger" full onClick={() => setAsk(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="rounded-2xl bg-neg/5 p-4">
      <div className="mb-3 text-sm text-ink">{message}</div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setAsk(false)}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Confirmer
        </Button>
      </div>
    </div>
  );
}

// ——— Feuille modale (bottom sheet) ———

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // Bouton ou geste Retour du téléphone : ferme la feuille sans quitter l'écran.
  useEffect(() => {
    if (!open) return;
    return openOverlay(() => closeRef.current());
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  // Rendu au niveau du document : une ligne balayable (transformée) ne doit pas contenir la feuille.
  const sheet = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-[#0b1526]/40" onClick={onClose} />
      <div
        className={cx("animate-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-bg sm:rounded-[28px]", drag === null && "transition-transform duration-200")}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        {/* Poignée : tirer vers le bas pour fermer (comme sur iPhone). */}
        <div
          className="touch-none pt-2"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragStart.current === null) return;
            setDrag(Math.max(0, e.clientY - dragStart.current));
          }}
          onPointerUp={() => {
            const d = drag ?? 0;
            dragStart.current = null;
            setDrag(null);
            if (d > 90) onClose();
          }}
          onPointerCancel={() => {
            dragStart.current = null;
            setDrag(null);
          }}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-black/15 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 className="text-[19px] font-bold text-navy">{title}</h2>
          <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink-2">
            <X size={18} />
          </button>
        </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-bg px-5 pb-4 pt-3">{footer}</div>}
      </div>
    </div>
  );
  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}

// ——— Champs de formulaire ———

function FieldShell({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-1 block px-1 text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <div className="mt-1 px-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-line bg-card px-4 py-3 text-[16px] text-ink outline-none placeholder:text-muted/70 focus:border-series-1 focus:ring-2 focus:ring-series-1/15";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  autoFocus,
  type,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  type?: "text" | "email" | "tel";
}) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      {multiline ? (
        <textarea
          id={id}
          className={cx(inputCls, "min-h-24")}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      ) : (
        <input
          id={id}
          className={inputCls}
          type={type ?? "text"}
          autoComplete={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
          value={value ?? ""}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      )}
    </FieldShell>
  );
}

function formatNumberInput(v: number | undefined, plain = false): string {
  if (v === undefined || !Number.isFinite(v)) return "";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4, useGrouping: !plain }).format(v).replace(/[  ]/g, " ");
}

export function parseNumberInput(text: string): number | undefined {
  const cleaned = text.replace(/[\s  €%]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function NumberField({
  label,
  value,
  onChange,
  suffix = "€",
  hint,
  placeholder,
  integer,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  integer?: boolean;
}) {
  const id = useId();
  // Années et compteurs : sans séparateur de milliers (2030, pas 2 030).
  const plain = !!integer && suffix === "";
  const [text, setText] = useState(formatNumberInput(value, plain));
  const [focused, setFocused] = useState(false);
  // Reflète les changements extérieurs quand le champ n'est pas en cours d'édition.
  const external = formatNumberInput(value, plain);
  if (!focused && text !== external && parseNumberInput(text) !== value) setText(external);
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          inputMode={integer ? "numeric" : "decimal"}
          className={cx(inputCls, "tabular pr-12")}
          value={text}
          placeholder={placeholder ?? "—"}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setText(formatNumberInput(parseNumberInput(text), plain));
          }}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parseNumberInput(e.target.value));
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  allowEmpty = true,
  emptyLabel = "—",
}: {
  label: string;
  value: T | undefined | null;
  onChange: (v: T | undefined) => void;
  options: { value: T; label: string }[];
  hint?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%238a93a3%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10")}
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="date"
          className={cx(inputCls, "min-h-[50px] appearance-none")}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted"
            aria-label="Effacer la date"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </FieldShell>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-2xl bg-black/5 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
            value === o.value ? "bg-card font-semibold text-brand shadow-sm" : "text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stack({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function Details({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl border border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-medium text-navy">
        {title}
        <ChevronRight size={18} className={cx("text-muted transition-transform", open && "rotate-90")} />
      </button>
      {open && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  );
}

// ——— Pastilles d'icônes colorées ———

const CHIP_TONES = {
  blue: "bg-[#2a78d6]/12 text-[#2a78d6]",
  green: "bg-[#0f8a5f]/12 text-[#0f8a5f]",
  gold: "bg-[#b08d57]/15 text-[#8a6a3a]",
  violet: "bg-[#7c5cc4]/12 text-[#6a4bb3]",
  rose: "bg-[#d0667a]/12 text-[#c24d63]",
  slate: "bg-[#4b5d7a]/12 text-[#3d4f6c]",
  navy: "bg-navy text-white",
} as const;

export type ChipTone = keyof typeof CHIP_TONES;

export function IconChip({ children, tone = "slate", size = 40 }: { children: ReactNode; tone?: ChipTone; size?: number }) {
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-[14px]", CHIP_TONES[tone])} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["#2a78d6", "#0f8a5f", "#b08d57", "#7c5cc4", "#d0667a", "#1b9aaa", "#e08a2e", "#4b5d7a"];

/** Couleur stable dérivée d'un identifiant (une société garde toujours sa couleur). */
export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ id, name, size = 36, square, index }: { id: string; name: string; size?: number; square?: boolean; index?: number }) {
  // L'index (ordre des sociétés) garantit des couleurs toutes différentes.
  const color = index !== undefined ? AVATAR_COLORS[index % AVATAR_COLORS.length] : colorFor(id);
  const letters = name
    .replace(/^(SCI|SC|SARL|SAS)\s+/i, "")
    .replace(/^(DU|DE LA|DE|LA|LE|LES)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cx("flex shrink-0 items-center justify-center font-bold text-white", square ? "rounded-[12px]" : "rounded-full")}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(145deg, ${color}, ${color}cc)` }}
    >
      {letters || "•"}
    </span>
  );
}
