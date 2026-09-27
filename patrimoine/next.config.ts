import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "pg", "exceljs"],
  // Polices du dossier banque, lues sur le disque au moment de la génération.
  outputFileTracingIncludes: {
    "/api/dossier-banque": ["./src/lib/pdf/fonts/**/*"],
    "/partage/[token]/dossier": ["./src/lib/pdf/fonts/**/*"],
    "/api/documents": ["./src/lib/pdf/fonts/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
