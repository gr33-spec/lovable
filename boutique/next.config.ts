import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les pages.
// La page de paiement est hébergée par Stripe (redirection) : aucun script
// tiers n'est chargé sur la boutique, ce qui permet une politique stricte.

const isDev = process.env.NODE_ENV !== "production";
const mediaOrigin = process.env.STORAGE_DRIVER === "supabase" && process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin}`.trim(),
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Le dépôt contient plusieurs applications : celle-ci est autonome.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pg", "sharp"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Administration, panier et commandes : jamais indexés ni mis en cache partagé.
      {
        source: "/(admin|panier|commande|api)(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
