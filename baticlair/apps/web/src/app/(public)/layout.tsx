import Link from "next/link";

/**
 * Les pages publiques (sans compte) : la page d'accueil du site. Même marque que l'app, aucune ressource extérieure.
 * DIRECTION « CHANTIER HAUTE VISIBILITÉ » (Greg, 23 octobre au soir) : la landing est sombre d'un bloc, noir profond et
 * jaune signal ; le logo passe en pastille jaune, « Se connecter » en contour clair.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-night text-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="BatiClair, accueil">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12 12 4l9 8" />
              <path d="M7 20h10" />
            </svg>
          </span>
          <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">BatiClair</span>
        </Link>
        <Link href="/connexion" className="pressable inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-[15px] font-semibold text-white hover:border-white">
          Se connecter
        </Link>
      </header>
      {children}
    </div>
  );
}
