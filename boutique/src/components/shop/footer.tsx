import Link from "next/link";
import type { ShopSettings } from "@/lib/server/settings";
import { SOCIAL_LABELS } from "@/lib/validation";
import { SocialIcon } from "../ui/social-icon";

export function SocialLinks({ socials, className = "" }: { socials: ShopSettings["socials"]; className?: string }) {
  if (!socials.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {socials.map((s) => (
        <li key={`${s.network}-${s.url}`}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-icon"
            aria-label={`${SOCIAL_LABELS[s.network]} (nouvel onglet)`}
            title={SOCIAL_LABELS[s.network]}
          >
            <SocialIcon network={s.network} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Footer({ settings, categories }: { settings: ShopSettings; categories: { slug: string; name: string }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border bg-secondary/60">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-serif text-2xl">{settings.shopName}</p>
          {settings.tagline && <p className="mt-2 text-sm text-text-2">{settings.tagline}</p>}
          <SocialLinks socials={settings.socials} className="mt-5" />
        </div>
        <nav aria-label="Boutique">
          <p className="eyebrow mb-3">Boutique</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/boutique" className="no-underline hover:underline">
                Toutes les créations
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/boutique/${c.slug}`} className="no-underline hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/boutique?tri=nouveautes" className="no-underline hover:underline">
                Nouveautés
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Informations">
          <p className="eyebrow mb-3">Informations</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/a-propos" className="no-underline hover:underline">
                L&apos;atelier
              </Link>
            </li>
            <li>
              <Link href="/livraison-retours" className="no-underline hover:underline">
                Livraison et retours
              </Link>
            </li>
            <li>
              <Link href="/contact" className="no-underline hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Mentions">
          <p className="eyebrow mb-3">Légal</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/cgv" className="no-underline hover:underline">
                Conditions générales de vente
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="no-underline hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="no-underline hover:underline">
                Confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/70">
        <div className="container-page flex flex-col gap-1 py-5 text-xs text-text-2 sm:flex-row sm:justify-between">
          <p>
            © {year} {settings.shopName} — bijoux faits main
          </p>
          <p>Paiement sécurisé par Stripe · Aucun cookie publicitaire</p>
        </div>
      </div>
    </footer>
  );
}
