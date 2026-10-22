import Link from "next/link";

/** Les pages publiques (sans compte) : la page d'accueil du site. Même marque que l'app, aucune ressource extérieure. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="BatiClair, accueil">
          <span className="flex size-9 items-center justify-center rounded-xl bg-ink" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12 12 4l9 8" />
              <path d="M7 20h10" />
            </svg>
          </span>
          <span className="text-base font-extrabold">BatiClair</span>
        </Link>
        <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-xl border border-[#d9dde3] bg-surface px-5 text-[15px] font-bold text-ink transition hover:border-ink">
          Se connecter
        </Link>
      </header>
      {children}
    </div>
  );
}
