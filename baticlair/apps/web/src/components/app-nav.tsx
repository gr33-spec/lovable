"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ClipboardList, Globe, House, Plus, Truck, UserRound, Users, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { santeUneFois } from "@/lib/sante";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";
import { Logo } from "@/components/logo";
import { useTheme } from "@/lib/theme";
import { useMissionsActif } from "@/lib/missions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

/**
 * ACHAT GROUPÉ (Greg, 27 octobre 2026, point 10) : Accueil, Achats groupés, le « + » jaune au centre (depuis le 1er novembre 2026 :
 * « Créer une liste », plus la feuille des deux portes),
 * Mes listes, Profil. « Mes prix » passe dans Profil. Barre en verre flottante sur téléphone, toujours `position: fixed;
 * bottom: 0` (jamais recalée en JavaScript) ; colonne à gauche sur ordinateur. Avant : Accueil, Chantiers, Regroupements,
 * Mes prix, Profil (25 octobre).
 */
const accueilItem: NavItem = { href: "/", label: fr.nav.home, icon: House, match: (p: string) => p === "/" };
const listesItem: NavItem = {
  href: "/chantiers",
  label: fr.nav.listes,
  icon: ClipboardList,
  match: (p: string) => p.startsWith("/chantiers"),
};
const groupeItem: NavItem = { href: "/achats-groupes", label: fr.nav.groupe, icon: Users, match: (p: string) => p.startsWith("/achats-groupes") || p.startsWith("/regroupements") || p.startsWith("/groupe") };
/** Missions entre entreprises (Greg, 10 novembre 2026) : le quatrième onglet, toujours présent ; les messages y vivent quand les missions sont ouvertes. */
const missionsItem: NavItem = { href: "/missions", label: fr.nav.missions, icon: Briefcase, match: (p: string) => p.startsWith("/missions") || (p.startsWith("/messages") && !p.startsWith("/messages/negoce") && !p.startsWith("/messages/site")) };
/** « Mon site » (Greg, 16 novembre 2026) : le site de l'entreprise, cinquième onglet ; seul chemin vers son éditeur. */
const siteItem: NavItem = { href: "/mon-site", label: "Mon site", icon: Globe, match: (p: string) => p.startsWith("/mon-site") || p.startsWith("/messages/site") };
/** Ordinateur seulement (Greg, 31 octobre 2026, soir : « on a de la place sur l'écran ») : « Mes négoces » à portée de clic. */
const negocesItem: NavItem = { href: "/fournisseurs", label: "Mes négoces", icon: Truck, match: (p: string) => p.startsWith("/fournisseurs") };
const profilItem: NavItem = { href: "/compte", label: fr.nav.profil, icon: UserRound, match: (p: string) => p.startsWith("/compte") || p.startsWith("/abonnement") || p.startsWith("/fournisseurs") || p.startsWith("/mes-prix") };

/** Le drapeau `groupe` de l'API (route de santé, publique) : éteint, l'onglet n'existe pas. */
export function useGroupeActif(): boolean {
  const fetchHealth = useCallback(() => santeUneFois(), []);
  const { data } = useResource(fetchHealth);
  return data?.features.groupe === true;
}

/**
 * Navigation principale : barre figée en bas sur téléphone (pouce), colonne à gauche sur ordinateur. Le rond central
 * ouvre une nouvelle liste : un appui, aucune question.
 */
export function AppNav() {
  const pathname = usePathname();
  const theme = useTheme();
  const groupe = useGroupeActif();
  // Greg, 16 novembre 2026 : l'onglet Missions reste toujours là ; tant que l'admin n'a pas ouvert les missions, il porte
  // « Bientôt » et mène à l'écran qui explique le principe.
  const missionsBientot = useMissionsActif() === false;
  // Le chat d'un chantier se lit en plein écran sur téléphone (référentiel §21) : le menu laisse la place à la barre de message.
  const inChat = /^\/chantiers\/(?!nouveau$)[^/]+$/.test(pathname);
  // Profil, Apparence (Greg, 1er novembre 2026) : un écran d'édition, l'aperçu du PDF et « Enregistrer » ont besoin de la
  // place ; la flèche retour ramène à Profil et paramètres.
  const pleinEcran = inChat || pathname === "/compte/apparence";
  // La barre se cache pendant la saisie (`useTyping`). Elle n'est JAMAIS recalée en JavaScript (retour du fondateur,
  // 2026-10-12 : sur iPhone, l'ancien recalage sur visualViewport la plaçait au milieu de l'accueil) : `position: fixed;
  // bottom: 0`, la zone du geste en marge intérieure.
  const typing = useTyping();

  /**
   * Un lien du menu. Téléphone : inchangé. Ordinateur (Greg, 31 octobre 2026, soir) : une colonne sombre pleine hauteur,
   * l'élément actif sur un verre clair avec l'icône jaune ; « Profil » ne s'allume plus sur « Mes négoces », qui a son lien.
   */
  const link = (item: NavItem, ordinateurSeulement = false) => {
    // Missions coupées (« Bientôt ») : « Messages et réponses » n'allume pas l'onglet Missions (Greg, 18 novembre 2026).
    const active = item.match(pathname) && !(item === missionsItem && missionsBientot && pathname.startsWith("/messages"));
    const activeOrdinateur = active && !(item === profilItem && negocesItem.match(pathname));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${ordinateurSeulement ? "hidden lg:flex " : "flex "}min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] font-semibold transition-[color,background-color] duration-150 lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px] ${
          active ? "max-lg:text-accent-text" : "max-lg:text-muted max-lg:active:text-ink"
        } ${activeOrdinateur ? "lg:bg-(--voile-3) lg:text-ink" : "lg:text-ink/65 lg:hover:bg-(--voile-1) lg:hover:text-ink"}`}
      >
        <span className={`relative flex h-8 w-11 items-center justify-center rounded-full transition-[background-color] duration-150 lg:h-auto lg:w-auto lg:bg-transparent ${active ? "max-lg:bg-accent-soft" : ""} ${activeOrdinateur ? "lg:text-accent-text" : ""}`}>
          <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
          {item === missionsItem && missionsBientot ? (
            <span aria-hidden="true" className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 text-[9px] leading-[14px] font-extrabold whitespace-nowrap text-on-accent lg:hidden">
              Bientôt
            </span>
          ) : null}
        </span>
        {/* Cinq onglets (16 novembre 2026) : sur un très petit écran (moins de 360 px), un rien plus serré pour que rien ne déborde. */}
        {/* Greg, 17 novembre 2026 : chaque libellé sur UNE ligne (« Achats groupés » ne passe plus à la ligne) ; les colonnes
            prennent la largeur de leur libellé, les icônes restent alignées. */}
        <span className="text-center leading-[1.1] whitespace-nowrap max-lg:text-[11px] max-[389px]:text-[10.5px] max-[389px]:tracking-[-0.015em] max-[359px]:text-[9.5px] max-[359px]:tracking-[-0.025em]">{item.label}</span>
        {item === missionsItem && missionsBientot ? (
          <span aria-hidden="true" className="ml-auto hidden rounded-full bg-accent px-2 text-[11px] leading-5 font-extrabold text-on-accent lg:inline">
            Bientôt
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      data-typing={typing || undefined}
      className={`${pleinEcran ? "max-lg:hidden " : ""}${typing ? "max-lg:pointer-events-none max-lg:translate-y-full max-lg:opacity-0 " : ""}fixed z-30 transition-[translate,opacity] duration-200 max-lg:inset-x-0 max-lg:bottom-0 lg:inset-y-0 lg:left-0 lg:w-64`}
    >
      {/* Téléphone : une capsule en verre, à 16 px des bords et 12 px du bas (zone du geste comprise). Ordinateur : une
          colonne sombre pleine hauteur, filet à droite, le bouton jaune « Nouveau » en tête. */}
      <div className={`mx-2.5 max-[359px]:mx-1.5 max-[359px]:px-0.5 mb-[var(--nav-gap)] grid h-[var(--nav-height)] grid-flow-col items-center ${groupe ? "grid-cols-[repeat(4,auto)]" : "grid-cols-[repeat(3,auto)]"} justify-between rounded-[26px] bg-glass px-2 max-[359px]:px-1 shadow-float ring-1 ring-ink/5 lg:mx-0 lg:mb-0 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-r lg:border-line lg:bg-(--menu-fond) lg:bg-none lg:px-4 lg:pt-6 lg:pb-5 lg:shadow-none lg:ring-0`}>
        <span className="hidden px-2 pb-6 lg:order-[-2] lg:block">
          <Logo fond={theme === "clair" ? "clair" : "sombre"} hauteur={30} />
        </span>
        {/* Greg, 1er novembre 2026 : le « + » ouvre LE départ de création d'une liste, le même que « Créer une liste » de
            l'accueil et « Nouvelle liste » de Mes listes (un seul point de départ, une seule expérience). */}
        {/* Greg, 6 novembre 2026 : trois espaces (À faire, Demandes, Groupes) et le bouton jaune « Nouveau besoin » ; le
            profil, l'entreprise et les négoces passent par l'avatar sur téléphone. */}
        {/* Greg, 7 novembre 2026 : « aucun + seul pour une action principale » ; le bouton jaune dit ce qu'il crée. */}
        {/* Revue UX (8 novembre 2026) : sur téléphone, plus de rond jaune au milieu de la barre (libellé sur deux lignes,
            « Demandes » coupé, et deux boutons jaunes empilés sur Achats groupés). La barre ne fait que naviguer : trois
            onglets égaux. Chaque écran porte sa propre création (« Créer un quantitatif » sur À faire et Demandes,
            « Ajouter un matériau » sur Achats groupés). Ordinateur : le bouton reste en tête de la colonne. */}
        <Link href="/chantiers/nouveau" className="pressable hidden lg:mb-5 lg:flex lg:h-12 lg:items-center lg:gap-2 lg:rounded-xl lg:bg-accent lg:px-4 lg:text-[15px] lg:font-bold lg:text-on-accent lg:shadow-[0_12px_30px_rgba(254,210,6,0.18)]">
          <Plus aria-hidden="true" size={22} strokeWidth={2.6} />
          <span>Créer un quantitatif</span>
        </Link>
        {link(accueilItem)}
        {link(listesItem)}
        {groupe ? link(groupeItem) : null}
        {/* Prompt maître (Greg, 10 novembre 2026) : quatre entrées fixes, Accueil, Quantitatifs, Achats groupés, Missions. */}
        {link(missionsItem)}
        {/* « Mon site » (Greg, 18 novembre 2026, RÈGLE CHANGÉE : avant, cinquième onglet de la barre du bas) : sur téléphone,
            le globe de l'en-tête (`MenuArtisan`) ; sur ordinateur, il reste ici, dans la colonne, où il y a la place. */}
        {link(siteItem, true)}
        {link(negocesItem, true)}
        <span aria-hidden="true" className="hidden grow lg:block" />
        {link(profilItem, true)}
      </div>
    </nav>
  );
}
