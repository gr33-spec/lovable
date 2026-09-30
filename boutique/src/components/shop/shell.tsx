import { getCategories, getSettings } from "@/lib/server/cached";
import { Footer } from "./footer";
import { Header } from "./header";

/** Structure commune des pages de la boutique : en-tête, contenu, pied de page. */
export async function ShopShell({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const nav = categories.filter((c) => c.productCount > 0).map((c) => ({ slug: c.slug, name: c.name, cover: c.cover }));
  return (
    <div className="flex min-h-dvh flex-col">
      <Header shopName={settings.shopName} logo={settings.logo} tagline={settings.tagline} socials={settings.socials} categories={nav} />
      {!settings.ordersOpen && (
        <div role="status" className="bg-primary-light px-4 py-2.5 text-center text-sm font-medium text-primary">
          {settings.closedMessage || "Les commandes sont momentanément en pause."}
        </div>
      )}
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} categories={nav} />
    </div>
  );
}
