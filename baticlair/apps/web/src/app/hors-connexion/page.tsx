import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = { title: `Pas de réseau — ${NOM_APP}` };

/**
 * HORS CONNEXION (revue du 26 octobre 2026) : la page montrée par le service worker quand une page jamais vue est demandée
 * sans réseau. Styles en ligne seulement : elle doit s'afficher même si les fichiers du site ne sont pas en cache.
 */
export default function HorsConnexionPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "24px 20px", maxWidth: 420, margin: "0 auto", fontFamily: "-apple-system, Segoe UI, Roboto, Arial, sans-serif", color: "#0E0E0E", background: "#F4F4F2" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FFC800", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28 }} aria-hidden="true">
        M
      </div>
      <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>Pas de réseau pour l&apos;instant</h1>
      <p style={{ fontSize: 17, lineHeight: 1.5, margin: 0 }}>
        Les pages que tu as déjà ouvertes restent lisibles. Pour envoyer une demande ou déposer une liste, il faut du réseau : rien n&apos;est perdu, réessaie dès que ça
        capte.
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- un vrai rechargement, pour retenter le réseau */}
      <a href="/" style={{ display: "block", textAlign: "center", minHeight: 48, lineHeight: "48px", borderRadius: 16, background: "#0E0E0E", color: "#FFFFFF", fontWeight: 700, fontSize: 17, textDecoration: "none" }}>
        Réessayer
      </a>
    </main>
  );
}
