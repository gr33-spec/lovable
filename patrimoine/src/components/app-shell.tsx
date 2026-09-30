"use client";

import { signOut } from "@/lib/sign-out";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Building2, CloudOff, Coins, Ellipsis, KeyRound, House, Check, ListChecks, LoaderCircle, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { unpaidByUnit } from "@/lib/engine/leases";
import { missingCount } from "@/lib/missing";
import { cx } from "./ui";
import { ToastHost } from "./swipe";
import { PdfViewerHost } from "./pdf-viewer";
import { syncFromSchedules } from "@/lib/schedule";
import { afterRouteChange, installNavigation, useSection, type Section } from "@/lib/nav";

const TABS: { href: string; label: string; icon: typeof House; section: Section }[] = [
  { href: "/", label: "Accueil", icon: House, section: "accueil" },
  { href: "/patrimoine", label: "Patrimoine", icon: Building2, section: "patrimoine" },
  { href: "/gestion", label: "Gestion", icon: KeyRound, section: "gestion" },
  { href: "/plus", label: "Plus", icon: Ellipsis, section: "plus" },
];

/**
 * Tableaux d'amortissement : les caractéristiques des crédits suivent les
 * tableaux enregistrés, y compris ceux importés avant. Le capital restant dû
 * n'est pas recopié : il est recalculé à partir du tableau à chaque affichage.
 */
function ScheduleSync() {
  const { data, nowMonth, role, upsertMany } = useStore();
  useEffect(() => {
    if (role !== "owner") return;
    const { loans, buildings } = syncFromSchedules(data);
    if (loans.length + buildings.length === 0) return;
    upsertMany([...loans.map((item) => ({ coll: "loans" as const, item })), ...buildings.map((item) => ({ coll: "buildings" as const, item }))]);
  }, [data, nowMonth, role, upsertMany]);
  return null;
}

/** Historique de navigation : rang des écrans, défilement et état restitués au retour. */
function NavTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    installNavigation();
  }, []);
  useEffect(() => {
    afterRouteChange();
  }, [pathname, search]);
  return null;
}

/**
 * Page restaurée depuis le cache du navigateur (bouton Retour après une
 * déconnexion) : rechargée, donc revérifiée par le serveur — aucune donnée
 * affichée sans session valide.
 */
function useNoStaleRestore() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useNoStaleRestore();
  const pathname = usePathname();
  const router = useRouter();
  const { data, role, view } = useStore();
  const onboarding = pathname.startsWith("/bienvenue") && view === "patrimoine";
  // Les sauvegardes restent toujours accessibles (restauration après un incident).
  const rescue = pathname.startsWith("/plus/sauvegardes");
  const isEmpty = data.companies.length === 0 && data.buildings.length === 0;
  // Pastille : logements avec un loyer impayé (ou partiellement payé) non régularisé.
  const unpaid = unpaidByUnit(data.units).length;
  const section = useSection();

  useEffect(() => {
    if (role === "owner" && view === "patrimoine" && !onboarding && !rescue && !data.settings.onboardingDone && isEmpty) router.replace("/bienvenue");
  }, [role, view, onboarding, rescue, data.settings.onboardingDone, isEmpty, router]);

  if (view === "gestion") {
    return (
      <>
        <SaveIndicator />
        <Suspense>
          <NavTracker />
        </Suspense>
        <div className="lg:pl-60">{children}</div>
        <ToastHost />
        <PdfViewerHost />
        <Suspense>
          <GestionNav unpaid={unpaid} />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <SaveIndicator />
      <Suspense>
        <NavTracker />
      </Suspense>
      <ScheduleSync />
      {role === "lecture" && <ReadOnlyBanner />}
      <div className={cx(!onboarding && "lg:pl-60")} data-readonly={role === "lecture" || undefined}>
        {children}
      </div>
      <ToastHost />
      <PdfViewerHost />
      {!onboarding && (
        <nav className="tab-dock safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-2 lg:inset-y-0 lg:right-auto lg:w-60 lg:px-4 lg:py-6">
          <div className="tab-bar pointer-events-auto relative mx-auto flex max-w-md rounded-[28px] p-1.5 lg:h-full lg:max-w-none lg:flex-col lg:gap-1 lg:p-3">
            <div className="hidden px-3 pb-4 pt-2 text-[20px] font-extrabold tracking-[-0.02em] text-navy lg:block">Patrimoine</div>
            {TABS.map((t) => {
              // Une fiche reste dans la rubrique d'où on l'a ouverte (un lot ouvert depuis Gestion reste dans Gestion).
              const active = t.section === section;
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cx(
                    "relative flex flex-1 flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10.5px] font-semibold transition-colors lg:flex-none lg:flex-row lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 lg:text-[15px]",
                    active ? "bg-brand text-on-brand shadow-sm" : "text-ink-2 active:bg-black/5",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {t.label}
                  {t.href === "/gestion" && unpaid > 0 && (
                    <span
                      aria-label={`${unpaid} loyer(s) impayé(s)`}
                      className="absolute right-[10%] top-0 flex h-[18px] min-w-[18px] lg:static lg:ml-auto items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-white ring-2 ring-white"
                    >
                      {unpaid}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

/** Barre d'onglets de l'espace gestion locative. */
function GestionNav({ unpaid }: { unpaid: number }) {
  const pathname = usePathname();
  const { data } = useStore();
  const missing = missingCount(data);
  const vue = useSearchParams().get("vue") ?? "afaire";
  const tabs = [
    { vue: "afaire", label: "À faire", icon: ListChecks, badge: unpaid },
    { vue: "loyers", label: "Loyers", icon: Coins },
    { vue: "locataires", label: "Locataires", icon: Users, badge: missing },
  ];
  return (
    <nav className="tab-dock safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-2 lg:inset-y-0 lg:right-auto lg:w-60 lg:px-4 lg:py-6">
      <div className="tab-bar pointer-events-auto relative mx-auto flex max-w-md rounded-[28px] p-1.5 lg:h-full lg:max-w-none lg:flex-col lg:gap-1 lg:p-3">
            <div className="hidden px-3 pb-4 pt-2 text-[20px] font-extrabold tracking-[-0.02em] text-navy lg:block">Patrimoine</div>
        {tabs.map((t) => {
          // « Sur l'année » fait partie de Loyers.
          const current = vue === "annee" ? "loyers" : vue;
          const active = pathname.startsWith("/patrimoine/logement") ? t.vue === "locataires" : pathname === "/gestion" && current === t.vue;
          const Icon = t.icon;
          return (
            <Link
              key={t.vue}
              href={`/gestion?vue=${t.vue}`}
              className={cx("relative flex flex-1 flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10.5px] font-semibold transition-colors lg:flex-none lg:flex-row lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 lg:text-[15px]", active ? "bg-brand text-on-brand shadow-sm" : "text-ink-2 active:bg-black/5")}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
              {t.badge ? (
                <span className="absolute right-[18%] top-0 flex h-[18px] min-w-[18px] lg:static lg:ml-auto items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-white ring-2 ring-white">{t.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Consultation via un lien de partage : rappel permanent, et sortie en un geste. */
function ReadOnlyBanner() {
  return (
    <div className="safe-top sticky top-0 z-[45] bg-gold/95 text-navy lg:pl-60">
      <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2 text-[13px] font-semibold">
        <span>Consultation — lecture seule : vous pouvez tout ouvrir, rien n&apos;est modifié.</span>
        <button
          onClick={signOut}
          className="shrink-0 rounded-full bg-navy px-3 py-1 text-[12px] text-white"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}

function SaveIndicator() {
  const { status } = useStore();
  if (status === "idle") return null;
  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center">
      <div
        className={cx(
          "animate-fade mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm",
          status === "error" ? "bg-neg text-white" : "bg-card/95 text-ink-2 ring-1 ring-black/5",
        )}
        role="status"
      >
        {status === "saving" && <LoaderCircle size={13} className="animate-spin" />}
        {status === "saved" && <Check size={13} className="text-pos" />}
        {status === "error" && <CloudOff size={13} />}
        {status === "saving" ? "Enregistrement…" : status === "saved" ? "Enregistré" : "Hors connexion — nouvel essai…"}
      </div>
    </div>
  );
}
