"use client";

import { SessionGate } from "@/lib/session";
import { useTrackNavigation } from "@/lib/history";
import { AppNav } from "./app-nav";
import { FileViewer } from "./file-viewer";
import { MenuArtisan } from "./menu-artisan";
import { BandeauDuMois } from "./commande-du-mois";
import { CguAJour } from "./cgu-a-jour";
import { PiedLegal } from "./legal";
import { BandeauAbonnement, CompterInstallation, PaywallAbonnement } from "./abonnement";
import { GuidePremierLancement } from "./guide-premier-lancement";

export function AppShell({ children }: { children: React.ReactNode }) {
  useTrackNavigation();
  return (
    <SessionGate>
      <AppNav />
      <FileViewer />
      {/* Greg (24 octobre 2026) : au premier lancement, une fois inscrit, le guide en trois écrans. */}
      <GuidePremierLancement />
      {/* Sur grand écran, la place du menu (pl-72) s'ajoute à la colonne au lieu de la rogner : 48rem de contenu, 56rem au-delà de 1280 px. */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-4 pb-(--nav-space) lg:max-w-[66rem] lg:pt-10 lg:pb-12 lg:pl-72 xl:max-w-[74rem]">
        <MenuArtisan />
        <CguAJour />
        {/* L'abonnement (24 octobre 2026) : « Essai gratuit : encore N jours », ou le paiement refusé, en rouge. */}
        <BandeauAbonnement />
        <PaywallAbonnement />
        <CompterInstallation />
        {/* Greg (23 octobre) : le minuteur de la commande du mois sur chaque écran. */}
        <BandeauDuMois />
        {children}
        <PiedLegal />
      </main>
    </SessionGate>
  );
}
