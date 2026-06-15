import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopBarProps {
  title?: string;
}

/** Bandeau supérieur : logo BatiClair + accès au compte (design system §6). */
export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/accueil" className="font-display text-xl font-black text-ink">
          Bati<span className="text-accent">Clair</span>
        </Link>
        {title ? (
          <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            {title}
          </p>
        ) : null}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="tap-target flex items-center justify-center text-ink"
          >
            <CircleUserRound className="h-7 w-7" />
          </Link>
        </div>
      </div>
    </header>
  );
}
