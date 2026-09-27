"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, CalendarRange, CloudOff, Ellipsis, FlaskConical, House, Check, LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/patrimoine", label: "Patrimoine", icon: Building2 },
  { href: "/chronologie", label: "Chronologie", icon: CalendarRange },
  { href: "/simulations", label: "Simulations", icon: FlaskConical },
  { href: "/plus", label: "Plus", icon: Ellipsis },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useStore();
  const onboarding = pathname.startsWith("/bienvenue");
  const isEmpty = data.companies.length === 0 && data.buildings.length === 0;

  useEffect(() => {
    if (!onboarding && !data.settings.onboardingDone && isEmpty) router.replace("/bienvenue");
  }, [onboarding, data.settings.onboardingDone, isEmpty, router]);

  return (
    <>
      <SaveIndicator />
      {children}
      {!onboarding && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-card/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl">
            {TABS.map((t) => {
              const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium",
                    active ? "text-navy" : "text-muted",
                  )}
                >
                  <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
                  {t.label}
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
