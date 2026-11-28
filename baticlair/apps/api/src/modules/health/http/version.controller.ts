import { Controller, Get, Header } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../identity/index.js";

/**
 * LE COMMIT EN LIGNE (Greg, 22 novembre 2026 : « une petite adresse qui renvoie le numéro de commit en ligne, sans aucune
 * donnée sensible »). Après chaque poussée sur la branche de test, on attend que `/version` du site ET de l'API donnent le
 * commit poussé avant de dire « c'est en ligne ». Seulement le commit et l'environnement, posés par l'hébergeur (Vercel) à
 * la construction : jamais une variable, une clé ni une adresse.
 */
export function versionEnLigne(env: Readonly<Record<string, string | undefined>> = process.env) {
  const commit = env.VERCEL_GIT_COMMIT_SHA?.trim();
  return { commit: commit && /^[0-9a-f]{7,40}$/i.test(commit) ? commit.toLowerCase() : null, environnement: env.VERCEL_ENV === "production" ? "production" : env.VERCEL_ENV === "preview" ? "test" : "local" };
}

@Controller()
export class VersionController {
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @Header("Cache-Control", "no-store")
  @Get(["version", "v1/version"])
  version() {
    return versionEnLigne();
  }
}
