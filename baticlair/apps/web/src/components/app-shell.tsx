"use client";

import { SessionGate } from "@/lib/session";
import { useTrackNavigation } from "@/lib/history";
import { AppNav } from "./app-nav";
import { FileViewer } from "./file-viewer";
import { MenuArtisan } from "./menu-artisan";
import { BandeauDuMois } from "./commande-du-mois";
import { CguAJour } from "./cgu-a-jour";
import { PiedLegal } from "./legal";
import {
  BandeauAbonnement,
  CompterInstallation,
  PaywallAbonnement,
} from "./abonnement";
import { GuidePremierLancement } from "./guide-premier-lancement";
import { classeTheme, useTheme } from "@/lib/theme";

export function AppShell({ children }: { children: React.ReactNode }) {
  useTrackNavigation();
  const theme = useTheme();
  return (
    <SessionGate>
      {/* L'app en nuit chaude (Greg, 29 octobre 2026) : `app-nuit` dans globals.css ; ou claire, au choix dans Profil
          (Greg, 31 octobre 2026 : « deux options : Clair / Sombre »), `app-clair`. */}
      <div className={classeTheme(theme)}>
        <AppNav />
        <FileViewer />
        {/* Greg (24 octobre 2026) : au premier lancement, une fois inscrit, le guide en trois écrans. */}
        <GuidePremierLancement />
        {/* Sur grand écran, la place du menu (pl-72) s'ajoute à la colonne au lieu de la rogner : 48rem de contenu, 56rem au-delà de 1280 px. */}
        {/* Ordinateur (Greg, 31 octobre 2026, soir : « on a de la place sur l'écran ») : le contenu prend toute la largeur à
            droite du menu (16 rem), jusqu'à 76 rem, avec de vraies marges ; chaque page y pose sa grille. */}
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-4 pb-(--nav-space) lg:mx-0 lg:ml-64 lg:w-auto lg:max-w-none lg:gap-6 lg:px-10 lg:pt-8 lg:pb-14 xl:px-14">
          <div className="contents lg:mx-auto lg:flex lg:w-full lg:max-w-[76rem] lg:flex-col lg:gap-6">
          <MenuArtisan />
          <CguAJour />
          {/* L'abonnement : le paiement refusé, en rouge, sur chaque écran ; l'essai dans Profil (27 octobre 2026). */}
          <BandeauAbonnement seulementRouge />
          <PaywallAbonnement />
          <CompterInstallation />
          {/* Greg (23 octobre) : le minuteur de la commande du mois sur chaque écran. */}
          <BandeauDuMois />
          {children}
          <PiedLegal profilSeulement />
          </div>
        </main>
      </div>
    </SessionGate>
  );
}
