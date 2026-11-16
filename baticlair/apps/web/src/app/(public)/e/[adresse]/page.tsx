import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { descriptionDeLaPage, donneesStructurees, titreDeLaPage } from "@baticlair/domain/page-entreprise";
import { LIBELLES, VuePage } from "@/components/page-entreprise/vue-page";
import { origineDuSite } from "@/lib/origine";
import { absolue, lirePage } from "@/lib/page-entreprise";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : `mobiiz.fr/e/<adresse>`. Un visiteur sans compte voit la page, rien d'autre de
 * Mobiiz ; une page privée, masquée ou inconnue répond « Page introuvable » ; une ancienne adresse redirige (308). Titre
 * « Métier à Ville – Nom », description, données structurées LocalBusiness, image d'aperçu 1200 × 630 (photo de couverture,
 * sinon une image composée aux couleurs de la page). Indexée par Google seulement quand `PAGES_ENTREPRISES_INDEXEES=on`
 * (le site de test reste hors des moteurs).
 */
const INDEXEES = process.env.PAGES_ENTREPRISES_INDEXEES === "on";

type Props = { params: Promise<{ adresse: string }> };

async function charger(adresse: string) {
  const lu = await lirePage(adresse);
  if (!lu) notFound();
  if ("redirection" in lu) permanentRedirect(`/e/${lu.redirection}`);
  return lu.contenu;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { adresse } = await params;
  const c = await charger(adresse);
  const origine = await origineDuSite();
  const titre = titreDeLaPage(c);
  const description = descriptionDeLaPage(c, LIBELLES);
  const url = `${origine}/e/${c.adresse}`;
  const image = c.couverture?.partage ?? c.photos[0]?.partage;
  const images = [{ url: image ? absolue(image, origine) : `${url}/apercu.png`, width: 1200, height: 630, alt: `${c.nom}, ${titre}` }];
  return {
    title: { absolute: titre },
    description,
    alternates: { canonical: url },
    robots: INDEXEES ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", locale: "fr_FR", siteName: c.nom, title: titre, description, url, images },
    twitter: { card: "summary_large_image", title: titre, description, images: images.map((i) => i.url) },
    appleWebApp: null,
    icons: c.logo ? { icon: [{ url: c.logo }], apple: [{ url: c.logo }] } : undefined,
  };
}

export default async function PageEntreprise({ params }: Props) {
  const { adresse } = await params;
  const c = await charger(adresse);
  const origine = await origineDuSite();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const absolu = { ...c, logo: c.logo ? absolue(c.logo, origine) : null, couverture: c.couverture ? { ...c.couverture, partage: c.couverture.partage ? absolue(c.couverture.partage, origine) : null } : null, photos: c.photos.map((p) => ({ ...p, partage: p.partage ? absolue(p.partage, origine) : null })) };
  const jsonLd = JSON.stringify(donneesStructurees(absolu, `${origine}/e/${c.adresse}`, LIBELLES)).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <VuePage contenu={c} url={`${origine}/e/${c.adresse}`} />
    </>
  );
}
