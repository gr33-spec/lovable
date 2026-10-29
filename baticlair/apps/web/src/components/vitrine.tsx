import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { HEBERGEUR, PAGES_LEGALES } from "@/lib/legal";
import { BLOC_LEGAL, NOM_APP, SLOGAN_APP } from "@/lib/nom";

/**
 * L'en-tête et le pied des pages publiques « niveau studio » (Greg, 26 octobre 2026) : accueil, /couvreurs, la page négoce,
 * les mentions légales. Mêmes liens, même ligne ; les styles sont dans `app/(public)/landing.css`.
 */
export function EnteteVitrine({ negoce = false }: { negoce?: boolean }) {
  return (
    <header className="mz-entete">
      {/* La marque de la vignette (Greg, 29 octobre 2026) : l'icône jaune aux deux casques, puis le nom, sur la nuit. */}
      <Link href="/" aria-label={`${NOM_APP}, accueil`} className="mz-marque" style={{ minHeight: 44 }}>
        <Image src="/icon-192.png" alt="" width={34} height={34} priority />
        <Logo fond="sombre" hauteur={26} />
      </Link>
      <nav aria-label="Menu" className="mz-nav">
        {negoce ? null : (
          <Link href="/tarifs" className="mz-lien-nav" data-secondaire="">
            Tarifs
          </Link>
        )}
        <Link href="/connexion" className="mz-lien-nav" style={{ textDecoration: "underline", textUnderlineOffset: 5, textDecorationThickness: 2 }}>
          Se connecter
        </Link>
      </nav>
    </header>
  );
}

/** `sansEditeur` : sur les mentions légales, l'éditeur et l'hébergeur sont déjà dans la page. */
export function PiedVitrine({ sansEditeur = false }: { sansEditeur?: boolean }) {
  return (
    <footer className="mz-pied">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
        <div>
          <Logo fond="sombre" hauteur={24} />
          <p style={{ marginTop: 8, fontWeight: 600 }}>{SLOGAN_APP}</p>
        </div>
        <nav aria-label="Pages légales" className="mz-pied-liens">
          {PAGES_LEGALES.map((p) => (
            <Link key={p.href} href={p.href}>
              {p.label}
            </Link>
          ))}
          <Link href="/tarifs">Tarifs</Link>
          <Link href="/negoce/connexion">Accès négoce</Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement voulu : la démo relit l'adresse */}
          <a href="/?demo">Revoir la démo</a>
        </nav>
      </div>
      {sansEditeur ? null : (
        <p style={{ maxWidth: "90ch" }}>
          Service édité par {BLOC_LEGAL} Hébergeur : {HEBERGEUR.nom}, {HEBERGEUR.adresse}.
        </p>
      )}
    </footer>
  );
}
