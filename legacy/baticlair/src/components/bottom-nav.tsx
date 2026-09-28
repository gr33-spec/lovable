"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanSearch, Send, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/analyser", label: "Analyser", icon: ScanSearch },
  { href: "/demande", label: "Demande", icon: Send },
  { href: "/bilan", label: "Bilan", icon: BarChart3 },
] as const;

/**
 * Barre de navigation basse, façon appli mobile (design system §2 et §5).
 * 4 onglets seulement : le compte est accessible depuis l'accueil.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-card/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:max-w-[520px]"
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch justify-between gap-1 px-2 py-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-colors",
                  active ? "bg-accent/10 text-accent" : "text-muted hover:text-ink"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-6 w-6"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
