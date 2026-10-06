/**
 * Jetons d'injection. Toute dépendance est déclarée explicitement avec
 * `@Inject(TOKEN)` : aucune résolution implicite par les métadonnées de
 * types (voir ADR-0003).
 */
export const CONFIG = Symbol("CONFIG");
export const LOGGER = Symbol("LOGGER");
export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
export const AUTH = Symbol("AUTH");
export const ALERTER = Symbol("ALERTER");
export const PUSH_SENDER = Symbol("PUSH_SENDER");
