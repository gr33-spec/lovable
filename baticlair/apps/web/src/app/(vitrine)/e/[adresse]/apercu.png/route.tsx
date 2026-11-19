import { ImageResponse } from "next/og";
import { preuvesCourtes, teinteDe, titreAccueil } from "@baticlair/domain/page-entreprise";
import { lirePage } from "@/lib/page-entreprise";

/**
 * L'IMAGE D'APERÇU d'une page sans photo de couverture (lien collé dans WhatsApp, Facebook, SMS) : 1200 × 630, , le nom de l'entreprise et son métier. Avec une photo de couverture, c'est elle qui sert (JPEG 1200
 * × 630 préparé au dépôt). Mise en cache comme la page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ adresse: string }> }) {
  const { adresse } = await params;
  const lu = await lirePage(adresse);
  if (!lu || "redirection" in lu) return new Response("Page introuvable", { status: 404 });
  const c = lu.contenu;
  const teinte = teinteDe(c);
  const preuves = preuvesCourtes(c, new Date().getFullYear());
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#FBF8F3", color: "#15120E", borderTop: `18px solid ${teinte}` }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{c.nom}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>{titreAccueil(c)}</div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 24, color: "#5E554A" }}>{preuves.join("  ·  ") || " "}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {c.telephone ? <div style={{ display: "flex", background: "#FED206", borderRadius: 999, padding: "18px 36px", fontSize: 34, fontWeight: 800 }}>Appeler {c.telephone}</div> : <div style={{ display: "flex" }} />}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600" } },
  );
}
