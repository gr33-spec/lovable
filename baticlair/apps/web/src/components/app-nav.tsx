"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, House, Plus, Truck, UserRound, Users, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { api, type Health } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";
import { Logo } from "@/components/logo";
import { useTheme } from "@/lib/theme";

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
/** Ordinateur seulement (Greg, 31 octobre 2026, soir : « on a de la place sur l'écran ») : « Mes négoces » à portée de clic. */
const negocesItem: NavItem = { href: "/fournisseurs", label: "Mes négoces", icon: Truck, match: (p: string) => p.startsWith("/fournisseurs") };
const profilItem: NavItem = { href: "/compte", label: fr.nav.profil, icon: UserRound, match: (p: string) => p.startsWith("/compte") || p.startsWith("/abonnement") || p.startsWith("/fournisseurs") || p.startsWith("/mes-prix") };

/** Le drapeau `groupe` de l'API (route de santé, publique) : éteint, l'onglet n'existe pas. */
export function useGroupeActif(): boolean {
  const fetchHealth = useCallback((signal: AbortSignal) => api<Health>("/v1/health", { signal }), []);
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
    const active = item.match(pathname);
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
        <span className={`flex h-8 w-11 items-center justify-center rounded-full transition-[background-color] duration-150 lg:h-auto lg:w-auto lg:bg-transparent ${active ? "max-lg:bg-accent-soft" : ""} ${activeOrdinateur ? "lg:text-accent-text" : ""}`}>
          <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
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
      <div className={`mx-2.5 mb-[var(--nav-gap)] grid h-[var(--nav-height)] grid-flow-col items-center ${groupe ? "grid-cols-3" : "grid-cols-2"} rounded-full bg-glass px-1 shadow-float ring-1 ring-ink/5 lg:mx-0 lg:mb-0 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-r lg:border-line lg:bg-(--menu-fond) lg:bg-none lg:px-4 lg:pt-6 lg:pb-5 lg:shadow-none lg:ring-0`}>
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
        {link(negocesItem, true)}
        <span aria-hidden="true" className="hidden grow lg:block" />
        {link(profilItem, true)}
      </div>
    </nav>
  );
}
