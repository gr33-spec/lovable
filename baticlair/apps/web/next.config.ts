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
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
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
