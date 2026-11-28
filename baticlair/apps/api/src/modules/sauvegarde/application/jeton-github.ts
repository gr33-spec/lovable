import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

/**
 * LE JETON SIGNÉ DE GITHUB (OIDC), seule preuve qu'un rapport de sauvegarde vient bien du workflow « Sauvegarde de la
 * base » de notre dépôt (Greg, 28 novembre 2026 : ne pas dépendre des notifications GitHub, aucun secret de plus à poser).
 * Chaque exécution d'un workflow peut demander à GitHub un jeton à durée courte, signé par GitHub (RS256), qui dit le
 * dépôt, le fichier du workflow, la branche et le numéro d'exécution. On vérifie la signature avec les clés publiques de
 * GitHub, puis chaque champ. Rien n'est cru sur parole dans le corps du rapport : l'exécution et la branche viennent du jeton.
 * Documentation : docs.github.com, « About security hardening with OpenID Connect ».
 */
export const EMETTEUR_GITHUB = "https://token.actions.githubusercontent.com";
export const CLES_GITHUB = `${EMETTEUR_GITHUB}/.well-known/jwks`;
/** L'audience demandée par le workflow (`core.getIDToken`, `ACTIONS_ID_TOKEN_REQUEST_URL&audience=`). */
export const AUDIENCE_SAUVEGARDE = "mobiiz-sauvegarde";
export const DEPOT = "gr33-spec/lovable";
export const WORKFLOW = `${DEPOT}/.github/workflows/sauvegarde-base.yml@`;

export interface JetonSauvegarde {
  runId: string;
  ref: string;
  /** Vrai hors de `main` : un essai de l'alerte, jamais une sauvegarde qui compte. */
  essai: boolean;
}

export class JetonRefuse extends Error {}

type Cle = JsonWebKey & { kid?: string };
export type LireCles = (forcer?: boolean) => Promise<Cle[]>;

const b64 = (s: string) => Buffer.from(s, "base64url");
const json = (s: string): Record<string, unknown> => {
  try {
    const v: unknown = JSON.parse(b64(s).toString("utf8"));
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* refusé plus bas */
  }
  throw new JetonRefuse("jeton illisible");
};

/** Vérifie le jeton et rend ce qu'il atteste ; lève `JetonRefuse` au moindre doute. */
export async function verifierJetonGithub(jeton: string, lireCles: LireCles, maintenant: Date = new Date()): Promise<JetonSauvegarde> {
  const morceaux = jeton.split(".");
  if (morceaux.length !== 3 || jeton.length > 8000) throw new JetonRefuse("jeton illisible");
  const [h, p, s] = morceaux as [string, string, string];
  const entete = json(h);
  if (entete.alg !== "RS256" || typeof entete.kid !== "string") throw new JetonRefuse("algorithme refusé");
  const trouver = (cles: Cle[]) => cles.find((k) => k.kid === entete.kid && k.kty === "RSA");
  const cle = trouver(await lireCles()) ?? trouver(await lireCles(true));
  if (!cle) throw new JetonRefuse("clé inconnue");
  const publique = createPublicKey({ key: { kty: "RSA", n: cle.n, e: cle.e }, format: "jwk" });
  if (!verify("RSA-SHA256", Buffer.from(`${h}.${p}`), publique, b64(s))) throw new JetonRefuse("signature fausse");

  const c = json(p);
  const sec = Math.floor(maintenant.getTime() / 1000);
  if (c.iss !== EMETTEUR_GITHUB) throw new JetonRefuse("émetteur refusé");
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(AUDIENCE_SAUVEGARDE)) throw new JetonRefuse("audience refusée");
  if (typeof c.exp !== "number" || c.exp < sec - 30) throw new JetonRefuse("jeton expiré");
  if (typeof c.iat !== "number" || c.iat > sec + 60) throw new JetonRefuse("jeton du futur");
  if (typeof c.nbf === "number" && c.nbf > sec + 60) throw new JetonRefuse("jeton pas encore valable");
  if (c.repository !== DEPOT || c.repository_owner !== DEPOT.split("/")[0]) throw new JetonRefuse("dépôt refusé");
  if (typeof c.workflow_ref !== "string" || !c.workflow_ref.startsWith(WORKFLOW)) throw new JetonRefuse("workflow refusé");
  if (typeof c.run_id !== "string" || !/^\d{1,20}$/.test(c.run_id)) throw new JetonRefuse("exécution illisible");
  if (typeof c.ref !== "string" || !c.ref.startsWith("refs/") || c.ref.length > 200) throw new JetonRefuse("branche illisible");
  return { runId: c.run_id, ref: c.ref, essai: c.ref !== "refs/heads/main" };
}

/** Les clés publiques de GitHub, gardées une heure (elles changent rarement ; une clé inconnue force une relecture). */
export function clesGithub(fetchImpl: typeof fetch = fetch, maintenant: () => number = () => Date.now()): LireCles {
  let cache: { cles: Cle[]; le: number } | null = null;
  return async (forcer = false) => {
    if (cache && maintenant() - cache.le < (forcer ? 60_000 : 3_600_000)) return cache.cles;
    const r = await fetchImpl(CLES_GITHUB, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new JetonRefuse("clés de GitHub injoignables");
    const corps = (await r.json()) as { keys?: Cle[] };
    cache = { cles: Array.isArray(corps.keys) ? corps.keys : [], le: maintenant() };
    return cache.cles;
  };
}
