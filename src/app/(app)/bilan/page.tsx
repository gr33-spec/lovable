import { Card } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { getBilanData } from "@/lib/analysis";
import { getCurrentUserId } from "@/lib/current-user";
import { formatEuros } from "@/lib/utils";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

/** Écran Bilan : économies de l'année et prix moyens par produit (§6.4). */
export default async function BilanPage() {
  const userId = await getCurrentUserId();
  const { economieAnnee, totalAnalyses, produits } = await getBilanData(userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Bilan</h1>

      <Verdict
        tone="accent"
        label="Économies cette année"
        amount={formatEuros(economieAnnee)}
        description={`${totalAnalyses} analyse${totalAnalyses === 1 ? "" : "s"} au total.`}
      />

      <Card>
        <p className="mb-3 font-display text-sm font-bold">Tes prix par produit</p>
        {produits.length > 0 ? (
          <div className="flex flex-col gap-3">
            {produits.map((produit) => (
              <div key={produit.designation} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="mb-1 font-sans text-sm font-semibold capitalize">{produit.designation}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
                  <span className="font-bold">{formatEuros(produit.prixMoyen)} en moyenne</span>
                  <span className="text-muted">
                    {formatEuros(produit.prixMin)} – {formatEuros(produit.prixMax)}
                  </span>
                  <span className="text-muted">
                    {produit.nbAchats} achat{produit.nbAchats === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-sans text-sm text-muted">
            Tes prix par produit s&apos;afficheront ici après ta première analyse.
          </p>
        )}
      </Card>
    </div>
  );
}
