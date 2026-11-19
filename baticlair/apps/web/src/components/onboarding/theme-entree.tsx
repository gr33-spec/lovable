"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { NOM_APP } from "@/lib/nom";
import { classeTheme, useTheme } from "@/lib/theme";

/** Le thème de l'app (sombre par défaut, clair si choisi) sur l'entrée, et le logo qui va avec. */
export function ThemeEntree({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <div className={`${classeTheme(theme)} mzo`} data-theme-entree={theme}>
      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        <Link href="/" className="flex min-h-11 items-center self-start" aria-label={`${NOM_APP}, accueil`}>
          <Logo fond={theme === "clair" ? "clair" : "sombre"} hauteur={28} />
        </Link>
      </div>
      {children}
    </div>
  );
}
