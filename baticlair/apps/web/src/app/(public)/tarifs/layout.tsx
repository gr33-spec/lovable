import Link from "next/link";
import { Logo } from "@/components/logo";
import { NOM_APP } from "@/lib/nom";

/**
 * La page des tarifs (sans compte). Même marque que l'app, aucune ressource extérieure. La landing a sa propre mise en page
 * depuis le 26 octobre 2026 (`landing.css`) ; les tarifs gardent la nuit en attendant leur passe.
 * DIRECTION « CHANTIER HAUTE VISIBILITÉ » (Greg, 23 octobre au soir) : la landing est sombre d'un bloc, noir profond et
 * jaune signal ; le logo Mobiiz en lettres blanches (24 octobre), « Se connecter » en contour clair.
 */
export default function TarifsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0C0A08] text-white">
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${NOM_APP}, accueil`}>
          <Logo fond="sombre" hauteur={30} />
        </Link>
        <nav aria-label="Menu" className="flex items-center gap-3 sm:gap-6">
          <Link href="/tarifs" className="inline-flex min-h-11 items-center text-[15px] max-[359px]:hidden font-semibold text-white/85 hover:text-white">
            Tarifs
          </Link>
          <Link href="/connexion" className="pressable inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-[15px] font-semibold whitespace-nowrap text-white hover:border-white sm:px-5">
            Se connecter
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
