import { BrandEditor } from "@/components/admin/brand-editor";
import { ThemePicker } from "@/components/admin/theme-picker";
import { PageTitle } from "@/components/admin/ui";
import { loadSettings } from "@/lib/server/settings";

export const metadata = { title: "Apparence" };

export default async function AppearancePage() {
  const s = await loadSettings();
  return (
    <>
      <PageTitle title="Apparence" subtitle="Logo, textes, réseaux sociaux et couleurs du site. Chaque changement s'applique partout, immédiatement." />
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
      <ThemePicker current={s.themeId} />
      {/* Espace pour la barre d'enregistrement fixe. */}
      <div className="h-28" aria-hidden="true" />
    </>
  );
}
