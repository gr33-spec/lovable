"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, House, Plus, Truck, UserRound, Users, type LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { FeuilleDeuxPortes } from "@/components/achat-groupe";
import { api, type Health } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

/**
 * ACHAT GROUPÉ (Greg, 27 octobre 2026, point 10) : Accueil, Achats groupés, le « + » jaune au centre (les deux portes),
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
  const groupe = useGroupeActif();
  // Le chat d'un chantier se lit en plein écran sur téléphone (référentiel §21) : le menu laisse la place à la barre de message.
  const inChat = /^\/chantiers\/(?!nouveau$)[^/]+$/.test(pathname);
  // La barre se cache pendant la saisie (`useTyping`). Elle n'est JAMAIS recalée en JavaScript (retour du fondateur,
  // 2026-10-12 : sur iPhone, l'ancien recalage sur visualViewport la plaçait au milieu de l'accueil) : `position: fixed;
  // bottom: 0`, la zone du geste en marge intérieure.
  const typing = useTyping();
  const [portes, setPortes] = useState(false);

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
        className={`${ordinateurSeulement ? "hidden lg:flex " : "flex "}min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-[color,background-color] duration-150 lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px] ${
          active ? "max-lg:text-accent-text" : "max-lg:text-muted max-lg:active:text-ink"
        } ${activeOrdinateur ? "lg:bg-[rgba(251,248,243,0.08)] lg:text-[#FBF8F3]" : "lg:text-[#FBF8F3]/65 lg:hover:bg-[rgba(251,248,243,0.04)] lg:hover:text-[#FBF8F3]"}`}
      >
        <span className={`flex h-8 w-11 items-center justify-center rounded-full transition-[background-color] duration-150 lg:h-auto lg:w-auto lg:bg-transparent ${active ? "max-lg:bg-accent-soft" : ""} ${activeOrdinateur ? "lg:text-accent" : ""}`}>
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
      className={`${inChat ? "max-lg:hidden " : ""}${typing ? "max-lg:pointer-events-none max-lg:translate-y-full max-lg:opacity-0 " : ""}fixed z-30 transition-[translate,opacity] duration-200 max-lg:inset-x-0 max-lg:bottom-0 lg:inset-y-0 lg:left-0 lg:w-64`}
    >
      {/* Téléphone : une capsule en verre, à 16 px des bords et 12 px du bas (zone du geste comprise). Ordinateur : une
          colonne sombre pleine hauteur, filet à droite, le bouton jaune « Nouveau » en tête. */}
      <div className={`mx-2.5 mb-[var(--nav-gap)] grid h-[var(--nav-height)] grid-flow-col items-center ${groupe ? "grid-cols-[1fr_1fr_auto_1fr_1fr]" : "grid-cols-[1fr_auto_1fr_1fr]"} rounded-full bg-glass px-1 shadow-float ring-1 ring-ink/5 lg:mx-0 lg:mb-0 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-r lg:border-white/[0.07] lg:bg-[#100E0B] lg:bg-none lg:px-4 lg:pt-6 lg:pb-5 lg:shadow-none lg:ring-0`}>
        <span className="hidden px-2 pb-6 lg:order-[-2] lg:block">
          <Logo fond="sombre" hauteur={30} />
        </span>
        {link(accueilItem)}
        {groupe ? link(groupeItem) : null}
        <button type="button" onClick={() => setPortes(true)} aria-label="Nouveau : lancer un achat groupé ou faire ma liste" className="flex min-h-13 items-center justify-center px-1 lg:order-[-1] lg:mb-5 lg:justify-start lg:px-0">
          <span className="pressable flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-float lg:h-12 lg:w-full lg:gap-2 lg:rounded-xl lg:text-[15px] lg:font-bold lg:shadow-[0_12px_30px_rgba(254,210,6,0.18)]">
            <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
            <span className="hidden lg:inline">Nouveau</span>
          </span>
        </button>
        {link(listesItem)}
        {link(negocesItem, true)}
        <span aria-hidden="true" className="hidden grow lg:block" />
        {link(profilItem)}
      </div>
      {portes ? <FeuilleDeuxPortes onFermer={() => setPortes(false)} /> : null}
    </nav>
  );
}
