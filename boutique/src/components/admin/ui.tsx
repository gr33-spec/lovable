"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/order-status";

// Petits composants partagés de l'administration.

const TONES = {
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  neutral: "bg-soldout-bg text-soldout",
  danger: "bg-error-bg text-error",
} as const;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${TONES[STATUS_TONE[status]]}`}>{STATUS_LABEL[status]}</span>;
}

export function ProductStatusBadge({ status, stock }: { status: "draft" | "published" | "archived"; stock: number }) {
  if (status === "draft") return <span className="badge bg-soldout-bg text-soldout">Brouillon</span>;
  if (status === "archived") return <span className="badge bg-soldout-bg text-soldout">Archivé</span>;
  if (stock <= 0) return <span className="badge bg-error-bg text-error">Épuisé</span>;
  return <span className="badge bg-success-bg text-success">En ligne</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "danger"; children: React.ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3 rounded-2xl p-4 text-sm ${TONES[tone]}`}>
      <Icon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

// ───────────── Confirmation (actions importantes uniquement) ─────────────

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
const ToastContext = createContext<(message: string, tone?: "success" | "error") => void>(() => undefined);

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => undefined);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error"; id: number } | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOptions(o);
    requestAnimationFrame(() => dialog.current?.showModal());
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);
  const close = (value: boolean) => {
    dialog.current?.close();
    resolver.current(value);
  };
  const notify = useCallback((message: string, tone: "success" | "error" = "success") => setToast({ message, tone, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "error" ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={notify}>
        {children}
        <dialog ref={dialog} className="m-auto w-[min(92vw,440px)] rounded-3xl bg-surface p-0 text-text shadow-lift" onCancel={() => resolver.current(false)} aria-labelledby="confirm-title">
          {options && (
            <div className="p-6">
              <h2 id="confirm-title" className="font-sans text-lg font-semibold">
                {options.title}
              </h2>
              {options.message && <div className="mt-2 text-sm text-text-2">{options.message}</div>}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-outline" onClick={() => close(false)} autoFocus>
                  Annuler
                </button>
                <button type="button" className={`btn ${options.danger ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)}>
                  {options.confirmLabel}
                </button>
              </div>
            </div>
          )}
        </dialog>
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6">
          {toast && (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl p-3.5 pl-4 text-sm shadow-lift ${toast.tone === "error" ? "bg-error text-white" : "bg-text text-bg"}`}
              style={{ animation: "rise .25s ease both" }}
            >
              <span className="flex-1">{toast.message}</span>
              <button type="button" onClick={() => setToast(null)} aria-label="Fermer" className="opacity-80">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
export const useToast = () => useContext(ToastContext);

/** Avertit avant de quitter une page qui contient des modifications non enregistrées. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    // Clics sur les liens internes (navigation de l'application).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || e.defaultPrevented) return;
      if (!window.confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
