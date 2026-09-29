import "server-only";

/**
 * Adresse du visiteur pour la limitation des essais. Sur Vercel, `x-real-ip`
 * est posé par la plateforme (non falsifiable) ; `x-forwarded-for` n'est
 * utilisé qu'à défaut, et seulement sa première valeur.
 */
export function clientIp(request: Request): string {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
