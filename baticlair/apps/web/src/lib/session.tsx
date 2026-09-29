"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, getActiveCompanyId, setActiveCompanyId, type Health, type Me } from "./api";

interface SessionValue {
  me: Me;
  company: Me["companies"][number] | null;
  features: Health["features"];
  refresh: () => void;
  chooseCompany: (id: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession hors de <SessionGate>");
  return value;
}

/**
 * Charge l'utilisateur connecté. Sans session : renvoie vers la connexion
 * en mémorisant la page demandée (on y revient après). Sans entreprise :
 * renvoie vers l'accueil de bienvenue, sauf si l'on y est déjà.
 */
export function SessionGate({ children, requireCompany = true }: { children: React.ReactNode; requireCompany?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [features, setFeatures] = useState<Health["features"]>({ email: false });
  const [failure, setFailure] = useState<ApiError | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api<Me>("/v1/me"), api<Health>("/v1/health")]).then(
      ([meResult, health]) => {
        if (!active) return;
        setMe(meResult);
        setFeatures(health.features);
        setFailure(null);
      },
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.code === "unauthenticated") {
          const back = window.location.pathname + window.location.search;
          router.replace(`/connexion?retour=${encodeURIComponent(back)}`);
          return;
        }
        setFailure(error instanceof ApiError ? error : new ApiError("internal_error", 500));
      },
    );
    return () => {
      active = false;
    };
  }, [router, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const company = useMemo(() => {
    if (!me || me.companies.length === 0) return null;
    const stored = getActiveCompanyId();
    return me.companies.find((c) => c.id === stored) ?? me.companies[0] ?? null;
  }, [me]);

  useEffect(() => {
    if (!me) return;
    if (requireCompany && me.companies.length === 0 && pathname !== "/bienvenue") {
      router.replace("/bienvenue");
    }
    // Avec plusieurs entreprises, l'entreprise active est mémorisée sur l'appareil.
    if (company && me.companies.length > 1) setActiveCompanyId(company.id);
  }, [me, company, requireCompany, pathname, router]);

  const value = useMemo<SessionValue | null>(
    () =>
      me
        ? {
            me,
            company,
            features,
            refresh,
            chooseCompany: (id) => {
              setActiveCompanyId(id);
              refresh();
              router.push("/");
            },
          }
        : null,
    [me, company, features, refresh, router],
  );

  if (failure) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-bold">{failure.message}</p>
        {failure.supportId ? <p className="text-sm text-muted">Code support : {failure.supportId}</p> : null}
        <button
          type="button"
          onClick={() => {
            setFailure(null);
            refresh();
          }}
          className="min-h-12 rounded-2xl bg-ink px-6 font-bold text-white">
          Réessayer
        </button>
      </div>
    );
  }
  if (!value || (requireCompany && !value.company)) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
        <span className="size-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
