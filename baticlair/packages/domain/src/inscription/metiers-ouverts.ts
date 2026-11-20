/**
 * L'INSCRIPTION PAR MÉTIER (Greg, 19 novembre 2026 ; RÈGLE CHANGÉE : avant, tous les métiers s'inscrivaient) : Mobiiz se
 * lance d'abord pour les couvreurs. À l'inscription, « Couvreur » est ouvert ; tous les autres métiers sont « Bientôt
 * disponible » : l'artisan laisse seulement son e-mail pour être prévenu à l'ouverture, il n'entre pas dans l'application.
 * Les comptes déjà créés ne sont pas touchés. Code pur, sans import (le site l'importe directement).
 */

/** Les métiers ouverts à l'inscription (identifiants de `TRADES`). */
export const METIERS_INSCRIPTION_OUVERTS: readonly string[] = ["roofing"];

export const metierInscriptionOuvert = (id: string): boolean => METIERS_INSCRIPTION_OUVERTS.includes(id);

export const BADGE_BIENTOT_DISPONIBLE = "Bientôt disponible";
