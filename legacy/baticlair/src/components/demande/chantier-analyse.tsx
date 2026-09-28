"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Crown, RefreshCw, Search } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/analyser/loading-state";
import { ComparisonResultView } from "@/components/analyser/comparison-result";
import type { ComparisonResult, ExtractedDocument } from "@/lib/ai/types";

interface ChantierAnalyseProps {
  demandeId: string;
  /** Nombre de devis reçus à ce jour pour ce chantier. */
  reponsesCount: number;
  /** Nombre de devis pris en compte lors de la dernière comparaison. */
  lastAnalysisReponses: number;
  initialResult: ComparisonResult | null;
  initialExtracted: ExtractedDocument[];
  /** Adresses e-mail connues des fournisseurs, pour le bouton "Négocier" (bonus §8). */
  supplierEmails: Record<string, string>;
}

/**
 * Bouton "Lancer l'analyse IA" et résultat de la comparaison pour un chantier
 * (cf. "Évolution de BatiClair", §4) :
 * - moins de 2 devis reçus : bouton désactivé ("En attente d'au moins 2 devis") ;
 * - 2 devis ou plus, pas encore comparé : "Comparer les N devis reçus" ;
 * - déjà comparé et un nouveau devis est arrivé depuis : bandeau de relance.
 */
export function ChantierAnalyse({
  demandeId,
  reponsesCount,
  lastAnalysisReponses,
  initialResult,
  initialExtracted,
  supplierEmails,
}: ChantierAnalyseProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [extracted, setExtracted] = useState(initialExtracted);
  const [analyzedCount, setAnalyzedCount] = useState(lastAnalysisReponses);

  async function lancerAnalyse() {
    setLoading(true);
    setError(null);
    setLimitReached(false);

    try {
      const response = await fetch(`/api/demande/${demandeId}/analyser`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue. Réessaie.");
        setLimitReached(Boolean(data.limitReached));
        setLoading(false);
        return;
      }

      setResult(data.result as ComparisonResult);
      setExtracted(data.extracted as ExtractedDocument[]);
      setAnalyzedCount(reponsesCount);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Comparaison des devis…" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Card className="flex items-start gap-2 bg-red/10">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red" aria-hidden="true" />
          <p className="font-sans text-sm">{error}</p>
        </Card>
      ) : null}

      {limitReached ? (
        <LinkButton href="/compte" fullWidth>
          <Crown className="h-5 w-5" aria-hidden="true" />
          Passer au plan Pro
        </LinkButton>
      ) : null}

      {result ? (
        <>
          {reponsesCount > analyzedCount ? (
            <Card className="flex flex-col items-start gap-2 bg-accent/10">
              <p className="font-sans text-sm font-semibold">
                Nouveau devis reçu — relancer la comparaison ?
              </p>
              <Button type="button" variant="secondary" onClick={lancerAnalyse} disabled={limitReached}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Relancer la comparaison
              </Button>
            </Card>
          ) : null}

          <ComparisonResultView result={result} extracted={extracted} supplierEmails={supplierEmails} />
        </>
      ) : reponsesCount < 2 ? (
        <Button type="button" fullWidth disabled>
          En attente d&apos;au moins 2 devis
        </Button>
      ) : !limitReached ? (
        <Button type="button" fullWidth onClick={lancerAnalyse}>
          <Search className="h-5 w-5" aria-hidden="true" />
          Comparer les {reponsesCount} devis reçus
        </Button>
      ) : null}
    </div>
  );
}
