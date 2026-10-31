"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import { NOM_APP } from "@/lib/nom";

/**
 * Le dernier filet (audit avant commercialisation, 2026-10-11) : une erreur dans la mise en page racine. Il remplace tout
 * le document, sans les styles de l'application : des styles en ligne, sobres.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F2F1EE", color: "#130901" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "0 20px" }}>
          <title>{NOM_APP}</title>
          <h1 style={{ fontSize: 26, margin: 0 }}>Oups, {NOM_APP} a eu un souci</h1>
          <p style={{ fontSize: 15, margin: 0, color: "#614822" }}>Rien n&apos;est perdu : tes chantiers sont enregistrés. On est prévenus.</p>
          <button type="button" onClick={() => retry()} style={{ minHeight: 52, borderRadius: 16, border: 0, background: "#130901", color: "#FBF8F3", fontSize: 16, fontWeight: 800 }}>
            Réessayer
          </button>
          {/* Un rechargement complet, voulu : après une erreur, on repart d'un état propre. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ textAlign: "center", color: "#2E1B05", fontWeight: 700, fontSize: 15 }}>
            Retour à l&apos;accueil
          </a>
        </main>
      </body>
    </html>
  );
}
