"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, CalendarRange, CloudOff, Coins, Ellipsis, House, Check, LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { unpaidByUnit } from "@/lib/engine/leases";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/patrimoine", label: "Patrimoine", icon: Building2 },
  { href: "/chronologie", label: "Chronologie", icon: CalendarRange },
  { href: "/loyers", label: "Loyers", icon: Coins },
  { href: "/plus", label: "Plus", icon: Ellipsis },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useStore();
  const onboarding = pathname.startsWith("/bienvenue");
  const isEmpty = data.companies.length === 0 && data.buildings.length === 0;
  // Pastille : logements avec un loyer impayé (ou partiellement payé) non régularisé.
  const unpaid = unpaidByUnit(data.units).length;

  useEffect(() => {
    if (!onboarding && !data.settings.onboardingDone && isEmpty) router.replace("/bienvenue");
  }, [onboarding, data.settings.onboardingDone, isEmpty, router]);

  return (
    <>
      <SaveIndicator />
      {children}
      {!onboarding && (
        <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-2">
          <div className="pointer-events-auto mx-auto flex max-w-md rounded-[28px] border border-white/60 bg-white/92 p-1.5 shadow-[0_10px_30px_-6px_rgba(11,37,69,0.25)] backdrop-blur-2xl">
            {TABS.map((t) => {
              // Les simulations, rangées dans « Plus », gardent cet onglet actif.
              const active =
                t.href === "/" ? pathname === "/" : pathname.startsWith(t.href) || (t.href === "/plus" && pathname.startsWith("/simulations"));
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cx(
                    "relative flex flex-1 flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10.5px] font-semibold transition-colors",
                    active ? "bg-navy text-white shadow-sm" : "text-muted active:bg-black/5",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {t.label}
                  {t.href === "/loyers" && unpaid > 0 && (
                    <span
                      aria-label={`${unpaid} loyer(s) impayé(s)`}
                      className="absolute right-[10%] top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-white ring-2 ring-white"
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
