"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGES_LEGALES } from "@/lib/legal";

/**
 * Le pied de TOUTES les pages (mise en conformité du 24 octobre 2026) : mentions légales, CGU, conditions négoces,
 * confidentialité, contact. La page en cours n'est pas reprise. `clair` : sur un fond de nuit (la landing).
 */
export function LiensLegaux({ sauf, clair = false }: { sauf?: string; clair?: boolean }) {
  const pathname = usePathname();
  const ici = sauf ?? pathname;
  return (
    <nav aria-label="Pages légales" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {PAGES_LEGALES.filter((p) => p.href !== ici).map((p) => (
        <Link key={p.href} href={p.href} className={`font-semibold underline ${clair ? "text-white/70" : "text-muted"}`}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Le pied léger des écrans : les liens légaux, en petit, sous le contenu. Dans l'app, seulement sur Profil (Greg,
 * 28 octobre 2026, point 8 : « ils vont dans Profil ») ; partout ailleurs (inscription, pages légales, négoce) ils restent.
 */
export function PiedLegal({ profilSeulement = false }: { profilSeulement?: boolean }) {
  const pathname = usePathname();
  if (profilSeulement && !pathname.startsWith("/compte")) return null;
  return (
    <footer className="mt-auto border-t border-line pt-4">
      <LiensLegaux />
    </footer>
  );
}

