import Link from "next/link";
import { Logo } from "@/components/logo";
import { NOM_APP } from "@/lib/nom";

/**
 * Les pages publiques (sans compte) : la page d'accueil du site. Même marque que l'app, aucune ressource extérieure.
 * DIRECTION « CHANTIER HAUTE VISIBILITÉ » (Greg, 23 octobre au soir) : la landing est sombre d'un bloc, noir profond et
 * jaune signal ; le logo Mobiiz en lettres blanches (24 octobre), « Se connecter » en contour clair.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-night text-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${NOM_APP}, accueil`}>
          <Logo fond="sombre" hauteur={30} />
        </Link>
        <Link href="/connexion" className="pressable inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-[15px] font-semibold text-white hover:border-white">
          Se connecter
        </Link>
      </header>
      {children}
    </div>
  );
}
