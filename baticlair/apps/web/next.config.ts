import type { NextConfig } from "next";

/**
 * Le site relaie /v1/* vers l'API : pour le navigateur, tout vient de la
 * même adresse. Les cookies de session sont donc « du même site » (fiables
 * sur Safari et iPhone) et il n'y a pas de CORS à gérer.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/**
 * Ma page Mobiiz (16 novembre 2026) : les pages publiques des entreprises (`/e/…`) ne sont indexées par Google que quand
 * `PAGES_ENTREPRISES_INDEXEES=on` (le site de test reste hors des moteurs) ; elles disent alors elles-mêmes leur règle.
 */
const PAGES_INDEXEES = process.env.PAGES_ENTREPRISES_INDEXEES === "on";
/** L'adresse publique du store Vercel Blob des photos (« https://<id>.public.blob.vercel-storage.com »), côté site. */
const PHOTOS_BLOB_URL = (process.env.PHOTOS_BLOB_URL ?? "").replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // L'appareil photo sert au croquis d'une ligne ; plus de micro depuis le retrait de la voix (§50.7).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // La Content-Security-Policy est posée page par page par `src/proxy.ts`, avec un nonce neuf à chaque requête
  // (Greg, 26 octobre 2026 : plus de scripts en ligne sans nonce) : `cspDe` dans `src/lib/csp.ts`.
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: `${API_URL}/v1/:path*` },
      // Ma page Mobiiz : les photos (Vercel Blob) se lisent sur le domaine du site ; la CSP reste « rien d'ailleurs ».
      ...(PHOTOS_BLOB_URL ? [{ source: "/photos/:path*", destination: `${PHOTOS_BLOB_URL}/pages/:path*` }] : []),
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      PAGES_INDEXEES ? { source: "/:path((?!e/).*)", headers: noindex } : { source: "/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
