import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageLocale } from "@/components/page-locale/page-locale";
import { metadonneesPubliques } from "@/lib/partage";
import { origineDuSite } from "@/lib/origine";
import { pageLocale, PAGES_LOCALES } from "@/lib/regions/pages";
import "../decouvrir/premium.css";
import "@/components/page-locale/page-locale.css";

/**
 * LES PAGES LOCALES (Greg, 19 novembre 2026) : `/couvreurs-bretagne`, puis une adresse par région et par métier. Seules
 * les adresses des fiches existent (`PAGES_LOCALES`) : toute autre adresse à la racine reste « Page introuvable ». Rendue
 * à la demande (le nonce de la page et l'adresse du site sont lus sur la requête).
 */
export const dynamicParams = false;

/**
 * MISE DE CÔTÉ (Greg, 19 novembre 2026, « la carte passe dans l'onboarding ») : la page Bretagne n'est liée nulle part et
 * ne part PAS en production. En production (`VERCEL_ENV=production`), toute page locale répond « Page introuvable » ; sur
 * le site de test, elle reste visible, hors des moteurs de recherche.
 */
const enProduction = () => process.env.VERCEL_ENV === "production";
export function generateStaticParams() {
  return PAGES_LOCALES.map((p) => ({ pageLocale: p.slug }));
}

type Props = { params: Promise<{ pageLocale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fiche = pageLocale((await params).pageLocale);
  if (!fiche || enProduction()) return {};
  const base = metadonneesPubliques(fiche.seo.titre, fiche.seo.description);
  const image = {
    url: fiche.emblematique.photo.src,
    width: fiche.emblematique.photo.largeur,
    height: fiche.emblematique.photo.hauteur,
    alt: fiche.emblematique.photo.alt,
  };
  return {
    ...base,
    alternates: { canonical: `/${fiche.slug}` },
    openGraph: { ...base.openGraph, url: `/${fiche.slug}`, images: [image] },
    twitter: { ...base.twitter, images: [image.url] },
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const fiche = pageLocale((await params).pageLocale);
  if (!fiche || enProduction()) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <PageLocale fiche={fiche} origine={await origineDuSite()} nonce={nonce} />;
}
