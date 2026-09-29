"use client";

// Dernier filet : la mise en page elle-même n'a pas pu s'afficher (ex. base indisponible).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FBF8F2", color: "#2E2A24" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: 0 }}>La Bohème en Paillettes</p>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>La boutique fait une courte pause technique.</h1>
          <p style={{ color: "#6B6257", maxWidth: 420 }}>Merci de réessayer dans quelques minutes. Votre panier est conservé.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#4E5E48", color: "#fff", fontSize: 16, fontWeight: 600 }}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
