import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { ExtractedDocuments } from "./extracted-documents";
import { cn, formatEuros } from "@/lib/utils";
import type { ComparisonResult, ExtractedDocument } from "@/lib/ai/types";

interface ComparisonResultViewProps {
  result: ComparisonResult;
  extracted: ExtractedDocument[];
}

/** Résultat de la comparaison de devis : le verdict puis le détail (Pilier 1, §6). */
export function ComparisonResultView({ result, extracted }: ComparisonResultViewProps) {
  const hasEconomie = result.economie > 0;

  return (
    <div className="flex flex-col gap-4">
      <Verdict
        tone={hasEconomie ? "green" : "neutral"}
        label={
          hasEconomie && result.mieuxDisant
            ? `${result.mieuxDisant} est le moins cher`
            : "Tes devis sont équivalents"
        }
        amount={hasEconomie ? `Tu économises ${formatEuros(result.economie)}` : "0 €"}
        description={result.resume}
      />

      {result.comparaison.length > 0 ? (
        <Card>
          <p className="mb-3 font-display text-sm font-bold">Produit par produit</p>
          <div className="flex flex-col gap-3">
            {result.comparaison.map((produit, index) => (
              <div key={index} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="mb-1 font-sans text-sm font-semibold">{produit.produit}</p>
                <ul className="flex flex-col gap-1">
                  {produit.offres.map((offre, offreIndex) => {
                    const isBest = offre.fournisseur === produit.meilleurFournisseur;
                    return (
                      <li
                        key={offreIndex}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-2 py-1 font-mono text-sm",
                          isBest && "bg-green/10 font-bold text-green"
                        )}
                      >
                        <span>{offre.fournisseur}</span>
                        <span>{formatEuros(offre.pu)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {result.alertes.length > 0 ? (
        <Card className="bg-amber/10">
          <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
            <AlertTriangle className="h-5 w-5 text-amber" aria-hidden="true" />
            À vérifier avant de choisir
          </p>
          <ul className="flex flex-col gap-1">
            {result.alertes.map((alerte, index) => (
              <li key={index} className="font-sans text-sm">
                • {alerte}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ExtractedDocuments documents={extracted} />
    </div>
  );
}
