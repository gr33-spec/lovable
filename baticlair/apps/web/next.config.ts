import type { NextConfig } from "next";

/**
 * Le site relaie /v1/* vers l'API : pour le navigateur, tout vient de la
 * même adresse. Les cookies de session sont donc « du même site » (fiables
 * sur Safari et iPhone) et il n'y a pas de CORS à gérer.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // L'appareil photo sert au croquis d'une ligne ; plus de micro depuis le retrait de la voix (§50.7).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // Audit sécurité (2026-10-20) : rien ne se charge d'ailleurs. Scripts et styles en ligne : ceux de Next (pas de nonce
  // avec le rendu statique) ; blob: pour les PDF ouverts dans la page et les photos avant envoi ; aucun cadre tiers.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-src 'self' blob:",
      "object-src 'self' blob:",
      "media-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/v1/:path*", destination: `${API_URL}/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
