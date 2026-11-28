import Link from "next/link";
import type { ShopSettings } from "@/lib/server/settings";
import { imageSrc } from "@/lib/image-ref";
import { SOCIAL_LABELS } from "@/lib/shared";
import { RESERVATION_MODE } from "@/lib/sales-mode";
import { plainText } from "../ui/sparkle";
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
  const link = "inline-block py-1 text-text-2 no-underline transition-colors duration-300 hover:text-primary";
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-surface-2 text-text">
      <div className="hairline absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            {settings.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc(settings.logo, 320)}
                alt=""
                className={settings.logo.w / settings.logo.h >= 1.6 ? "h-12 w-auto max-w-[220px] object-contain" : "h-14 w-14 rounded-full object-cover ring-1 ring-border"}
              />
            )}
            <p className="font-serif text-[1.9rem] leading-tight">{settings.shopName}</p>
          </div>
          {settings.tagline && <p className="mt-3 max-w-xs text-sm text-text-2">{plainText(settings.tagline)}</p>}
          <SocialLinks socials={settings.socials} className="mt-6" />
        </div>
        <nav aria-label="Boutique">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-accent-text uppercase">Boutique</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/boutique" className={link}>
                Toutes les créations
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/boutique/${c.slug}`} className={link}>
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/boutique?tri=nouveautes" className={link}>
                Nouveautés
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Informations">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-accent-text uppercase">Informations</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/a-propos" className={link}>
                L&apos;atelier
              </Link>
            </li>
            <li>
              <Link href="/livraison-retours" className={link}>
                Livraison et retours
              </Link>
            </li>
            <li>
              <Link href="/contact" className={link}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Mentions">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-accent-text uppercase">Légal</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link href="/cgv" className={link}>
                Conditions générales de vente
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className={link}>
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className={link}>
                Confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      {/* Grand nom de marque, en typographie : la signature du site. */}
      <div className="container-page relative overflow-hidden" aria-hidden="true">
        <p className="pt-4 pb-3 text-center font-serif text-[clamp(2.6rem,10.5vw,10rem)] leading-none tracking-[-0.03em] whitespace-nowrap text-text/90 select-none">
          {settings.shopName.split(" ").map((w, i, all) =>
            i === all.length - 1 ? (
              <em key={i} className="text-accent-text">
                {w}
              </em>
            ) : (
              <span key={i}>{w} </span>
            ),
          )}
        </p>
      </div>
      <div className="relative border-t border-border">
        <div className="container-page flex flex-col gap-1 py-5 text-xs text-text-2 sm:flex-row sm:justify-between">
          <p>
            © {year} {settings.shopName} — bijoux faits main
          </p>
          <p>
            {RESERVATION_MODE ? "Réservation sans paiement en ligne" : "Paiement sécurisé par Stripe"} · Aucun cookie publicitaire ·{" "}
            <Link href="/admin/connexion" rel="nofollow" prefetch={false} className="text-text-2 no-underline hover:text-primary hover:underline">
              Espace créatrice
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
