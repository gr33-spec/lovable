/**
 * LA CONTENT-SECURITY-POLICY (audit du 20 octobre 2026, durcie le 26 octobre avec le feu vert de Greg) : rien ne se
 * charge d'ailleurs ; un script ne s'exécute que s'il porte le nonce de la requête (Next le pose sur les siens, la landing
 * sur son script de révélation), et ceux qu'il charge lui-même ('strict-dynamic'). Plus de 'unsafe-inline' pour les
 * scripts. Les styles en ligne restent permis (attributs `style` de React, que le nonce ne couvre pas). blob: pour les
 * PDF ouverts dans la page et les photos avant envoi ; aucun cadre tiers.
 */
export function cspDe(nonce: string, dev = false, turnstile = false): string {
  // Turnstile (Cloudflare) affiche son défi dans un cadre de son site : seulement quand la clé est posée.
  const cloudflare = turnstile ? " https://challenges.cloudflare.com" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src 'self' blob:${cloudflare}`,
    "object-src 'self' blob:",
    "media-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Un nonce neuf : 16 octets aléatoires en base64. */
export function nouveauNonce(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return btoa(String.fromCharCode(...octets));
}
