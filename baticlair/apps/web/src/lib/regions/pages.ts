import type { FichePageLocale } from "./fiche";
import { COUVREURS_BRETAGNE } from "./couvreurs-bretagne";

/**
 * LES PAGES LOCALES EN LIGNE (Greg, 19 novembre 2026) : une fiche par page. Pour ouvrir une région ou un métier, on écrit
 * sa fiche (sur le modèle de `couvreurs-bretagne.ts`) et on l'ajoute ici ; l'adresse est son `slug`. Seule la Bretagne est
 * en ligne tant que Greg ne l'a pas validée ; aucune liste des régions sur la landing générale.
 */
export const PAGES_LOCALES: readonly FichePageLocale[] = [COUVREURS_BRETAGNE];

export const pageLocale = (slug: string): FichePageLocale | null => PAGES_LOCALES.find((p) => p.slug === slug) ?? null;
