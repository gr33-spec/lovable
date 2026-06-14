import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Layout commun aux 4 écrans principaux : bandeau du haut + contenu +
 * navigation basse (style appli mobile, design system §2).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
