"use client";

import Link from "next/link";

// Erreur inattendue : message simple, jamais de détail technique.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">Petit contretemps</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-4 max-w-md text-text-2">Rien de grave : votre panier est conservé. Réessayez dans un instant.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn btn-outline">
          Accueil
        </Link>
      </div>
    </div>
  );
}
