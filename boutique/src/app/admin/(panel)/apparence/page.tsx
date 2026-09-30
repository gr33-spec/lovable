import { BrandEditor } from "@/components/admin/brand-editor";
import { requireAdminPage } from "@/lib/server/auth";
import { ThemePicker } from "@/components/admin/theme-picker";
import { PageTitle } from "@/components/admin/ui";
import { loadSettings } from "@/lib/server/settings";

export const metadata = { title: "Apparence" };

export default async function AppearancePage() {
  // Chaque page vérifie elle-même la session : la mise en page (layout) est rendue en
  // parallèle et ne protège pas, à elle seule, les données de la page.
  await requireAdminPage();
  const s = await loadSettings();
  return (
    <>
      <PageTitle title="Apparence" subtitle="Couleurs, logo, textes et réseaux sociaux. Chaque changement s'applique partout, immédiatement." />
      <nav aria-label="Sections de la page" className="-mt-2 mb-8 flex flex-wrap gap-2">
        <a href="#couleurs" className="chip">
          Couleurs du site
        </a>
        <a href="#identite" className="chip">
          Logo et identité
        </a>
      </nav>
      <ThemePicker current={s.themeId} custom={s.themeCustom} />
      <BrandEditor
        initial={{
          shopName: s.shopName,
          tagline: s.tagline,
          introText: s.introText,
          aboutTitle: s.aboutTitle,
          aboutText: s.aboutText,
          logo: s.logo,
          favicon: s.favicon,
          hero: s.hero,
          aboutImage: s.aboutImage,
          socials: s.socials,
        }}
      />
      {/* Espace pour la barre d'enregistrement fixe. */}
      <div className="h-28" aria-hidden="true" />
    </>
  );
}
