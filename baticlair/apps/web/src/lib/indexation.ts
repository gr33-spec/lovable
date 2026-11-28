/**
 * RÉFÉRENCEMENT, LA RÈGLE UNIQUE (Greg, 28 novembre 2026, audit `docs/referencement/audit-seo-ia-2026-11-27.md`).
 *
 * - Seul `mobiiz.fr` en production est ouvert aux moteurs : `INDEXATION_SITE=on` ET `VERCEL_ENV=production` (posé au
 *   moment de la construction), ET la requête arrive sur l'hôte `mobiiz.fr`. Partout ailleurs (test.mobiiz.fr, adresses
 *   `*.vercel.app`, www, local), chaque réponse dit `noindex, nofollow`.
 * - Même sur mobiiz.fr, seules les pages de `PAGES_INDEXABLES` (et les fichiers qui les accompagnent) sont ouvertes ;
 *   comptes, devis, admin, liens à jeton, connexion, `/couvreurs` (gardée comme base, non liée) restent `noindex`.
 * - Les sites des artisans (`/e/…`) ne s'ouvrent qu'avec, en plus, `PAGES_ENTREPRISES_INDEXEES=on`. RÈGLE CHANGÉE : avant,
 *   `PAGES_ENTREPRISES_INDEXEES=on` suffisait, sur n'importe quel hôte.
 * - Un en-tête, pas un `robots.txt` : un robots.txt qui interdit empêcherait le robot de lire le `noindex`, et n'est pas
 *   un contrôle d'accès (les données privées restent derrière la connexion et les jetons).
 *
 * Aucun import : ce fichier est lu par `next.config.ts` et par le test `scripts/indexation.test.mjs`.
 */

type Env = Readonly<Record<string, string | undefined>>;

export const HOTE_PRODUCTION = "mobiiz.fr";
export const ORIGINE_PRODUCTION = `https://${HOTE_PRODUCTION}`;

/**
 * Les pages proposées aux moteurs (et au sitemap), sur mobiiz.fr seulement. Ajouter une page ici = la publier aux moteurs.
 * RÈGLE CHANGÉE (Greg, 28 novembre 2026, discrétion des infos société) : `/mentions-legales` n'y est plus, elle dit
 * `noindex` (l'adresse du siège y figure) ; elle reste lisible par le lien en bas de chaque page.
 */
export const PAGES_INDEXABLES: readonly string[] = ["/", "/tarifs", "/cgu", "/confidentialite", "/conditions-negoce"];

/** Ce qui accompagne les pages ouvertes et ne doit jamais dire « noindex » : robots, sitemap, logo et images de la landing. */
const FICHIERS_OUVERTS = ["robots.txt", "sitemap.xml", "favicon.ico", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const DOSSIERS_OUVERTS = ["marque/", "landing/", "accueil/", "_next/"];

/**
 * Les robots d'ENTRAÎNEMENT des modèles, refusés (Greg, 28 novembre 2026 : « recherche oui, entraînement non »). Les
 * robots de RECHERCHE (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot…) restent permis : Mobiiz reste
 * trouvable dans Google, Bing, ChatGPT, Claude et Copilot. Sources lues le 27 novembre 2026 : OpenAI (GPTBot),
 * Anthropic (ClaudeBot), Google (Google-Extended : sans effet sur Google Search), Apple (Applebot-Extended), Common Crawl
 * (CCBot), Meta (meta-externalagent).
 */
export const ROBOTS_ENTRAINEMENT: readonly string[] = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent"];

export const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

export function indexationActive(env: Env): boolean {
  return env.INDEXATION_SITE === "on" && env.VERCEL_ENV === "production";
}

/** Les sites des artisans s'ouvrent aux moteurs seulement sur mobiiz.fr en production, et quand Greg l'a décidé. */
export function sitesArtisansIndexes(env: Env): boolean {
  return indexationActive(env) && env.PAGES_ENTREPRISES_INDEXEES === "on";
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// La valeur d'un `has` d'hôte est une expression régulière : le point est échappé, et Next l'ancre.
const HOTE_EXACT = echapper(HOTE_PRODUCTION);

type Regle = { source: string; headers: typeof NOINDEX; has?: { type: "host"; value: string }[]; missing?: { type: "host"; value: string }[] };

/** Les règles d'en-têtes `X-Robots-Tag` de `next.config.ts`. */
export function reglesXRobots(env: Env): Regle[] {
  if (!indexationActive(env)) return [{ source: "/:path*", headers: NOINDEX }];
  const ouverts = [
    "$", // la racine « / »
    ...PAGES_INDEXABLES.filter((p) => p !== "/").map((p) => `${echapper(p.slice(1))}$`),
    ...FICHIERS_OUVERTS.map((f) => `${echapper(f)}$`),
    ...DOSSIERS_OUVERTS.map(echapper),
    ...(sitesArtisansIndexes(env) ? ["e/"] : []),
  ];
  return [
    { source: "/:path*", missing: [{ type: "host", value: HOTE_EXACT }], headers: NOINDEX },
    { source: `/:path((?!${ouverts.join("|")}).*)`, has: [{ type: "host", value: HOTE_EXACT }], headers: NOINDEX },
  ];
}
