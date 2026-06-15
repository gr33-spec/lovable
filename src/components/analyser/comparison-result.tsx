import { AlertTriangle, Handshake } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { ExtractedDocuments } from "./extracted-documents";
import { cn, formatEuros, buildNegotiationMailto } from "@/lib/utils";
import type { ComparisonResult, ExtractedDocument } from "@/lib/ai/types";

interface ComparisonResultViewProps {
  result: ComparisonResult;
  extracted: ExtractedDocument[];
  /** Adresses e-mail connues des fournisseurs (clé : nom en minuscules), pour le bouton "Négocier" (bonus §8). */
  supplierEmails?: Record<string, string>;
}

/** Résultat de la comparaison de devis : le verdict puis le détail (Pilier 1, §6). */
export function ComparisonResultView({ result, extracted, supplierEmails }: ComparisonResultViewProps) {
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
            {result.comparaison.map((produit, index) => {
              const meilleur = produit.offres.find((offre) => offre.fournisseur === produit.meilleurFournisseur);
              return (
                <div key={index} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="mb-1 font-sans text-sm font-semibold">{produit.produit}</p>
                  <ul className="flex flex-col gap-1">
                    {produit.offres.map((offre, offreIndex) => {
                      const isBest = offre.fournisseur === produit.meilleurFournisseur;
                      const peutNegocier = !isBest && meilleur && offre.pu > meilleur.pu;
                      return (
                        <li
                          key={offreIndex}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg px-2 py-1 font-mono text-sm",
                            isBest && "bg-green/10 font-bold text-green"
                          )}
                        >
                          <span>{offre.fournisseur}</span>
                          <span className="flex items-center gap-2">
                            {formatEuros(offre.pu)}
                            {peutNegocier ? (
                              <a
                                href={buildNegotiationMailto({
                                  fournisseur: offre.fournisseur,
                                  produit: produit.produit,
                                  prixActuel: offre.pu,
                                  prixCible: meilleur!.pu,
                                  email: supplierEmails?.[offre.fournisseur.toLowerCase()],
                                })}
                                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-sans text-xs font-semibold text-accent"
                              >
                                <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
                                Négocier
                              </a>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
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
