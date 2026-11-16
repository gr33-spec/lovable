import { ImageResponse } from "next/og";
import { ambianceDe, sousTitre } from "@baticlair/domain/page-entreprise";
import { lirePage } from "@/lib/page-entreprise";

/**
 * L'IMAGE D'APERÇU d'une page sans photo de couverture (lien collé dans WhatsApp, Facebook, SMS) : 1200 × 630, aux
 * couleurs de la page, le nom de l'entreprise et son métier. Avec une photo de couverture, c'est elle qui sert (JPEG 1200
 * × 630 préparé au dépôt). Mise en cache comme la page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ adresse: string }> }) {
  const { adresse } = await params;
  const lu = await lirePage(adresse);
  if (!lu || "redirection" in lu) return new Response("Page introuvable", { status: 404 });
  const c = lu.contenu;
  const { palette: p } = ambianceDe(c);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: p.bouton, color: p.surPrincipale }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, opacity: 0.9 }}>{c.verifiee ? "✓ Entreprise vérifiée" : " "}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{c.nom}</div>
          <div style={{ fontSize: 40, marginTop: 20, opacity: 0.95 }}>{sousTitre(c)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, opacity: 0.85 }}>
          <span>{c.telephone ?? ""}</span>
          <span>Membre Mobiiz</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
