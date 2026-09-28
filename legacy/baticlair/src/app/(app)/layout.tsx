import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Layout commun aux 4 écrans principaux : bandeau du haut + contenu +
 * navigation basse (style appli mobile, design system §2).
 * Sur grand écran, la colonne garde une largeur "téléphone" et reste
 * centrée sur le fond du bureau (`--desktop-bg`) — effet "téléphone au
 * milieu de l'écran" plutôt qu'un contenu étiré.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-paper md:max-w-[520px] md:border-x md:border-line">
      <TopBar />
      <main className="flex-1 px-4 py-4 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
