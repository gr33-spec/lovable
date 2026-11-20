import { ThemeEntree } from "@/components/onboarding/theme-entree";
import { PiedLegal } from "@/components/legal";
import { SignalerProbleme } from "@/components/signaler-probleme";
import "@/components/onboarding/onboarding.css";

/**
 * L'ENTRÉE DANS L'APPLI (nouvel onboarding, Greg, 19 novembre 2026) : une colonne assez large pour la carte sur ordinateur,
 * au thème de l'appareil (clair ou sombre, comme l'app), « Signaler un problème » et les liens légaux en bas.
 */
export default function EntreeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeEntree>
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pt-6 pb-12">
        {children}
        <SignalerProbleme connecte={false} />
        <PiedLegal />
      </main>
    </ThemeEntree>
  );
}
