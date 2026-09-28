import { Card } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { ExtractedDocuments } from "./extracted-documents";
import { formatEuros } from "@/lib/utils";
import type { Anomalie, AnomalieType, ExtractedDocument, VerificationResult } from "@/lib/ai/types";

const ANOMALIE_LABELS: Record<AnomalieType, string> = {
  ecart_prix: "Écart de prix",
  doublon: "Ligne en double",
  quantite: "Quantité différente",
  hors_devis: "Absent du devis",
};

interface VerificationResultViewProps {
  result: VerificationResult;
  extracted: ExtractedDocument[];
}

/** Résultat de la vérification facture vs devis : le trop-payé d'abord (Pilier 2, §6). */
export function VerificationResultView({ result, extracted }: VerificationResultViewProps) {
  const hasSurcout = result.surcout > 0;

  return (
    <div className="flex flex-col gap-4">
      <Verdict
        tone={hasSurcout ? "red" : "green"}
        label={hasSurcout ? "Trop-payé détecté" : "Ta facture est conforme"}
        amount={hasSurcout ? formatEuros(result.surcout) : "0 €"}
        description={result.resume}
      />

      {result.anomalies.length > 0 ? (
        <Card>
          <p className="mb-3 font-display text-sm font-bold">Ce qu&apos;il faut vérifier</p>
          <div className="flex flex-col gap-3">
            {result.anomalies.map((anomalie, index) => (
              <AnomalieRow key={index} anomalie={anomalie} />
            ))}
          </div>
        </Card>
      ) : null}

      <ExtractedDocuments documents={extracted} />
    </div>
  );
}

function AnomalieRow({ anomalie }: { anomalie: Anomalie }) {
  return (
    <div className="border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-sans text-sm font-semibold">{anomalie.produit}</span>
        <span className="shrink-0 rounded-full bg-red/10 px-2 py-0.5 font-mono text-xs font-bold text-red">
          {ANOMALIE_LABELS[anomalie.type] ?? anomalie.type}
        </span>
      </div>
      {anomalie.detail ? (
        <p className="mb-1 font-sans text-sm text-muted">{anomalie.detail}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
        <span>Devis : {formatEuros(anomalie.devis)}</span>
        <span>Facture : {formatEuros(anomalie.facture)}</span>
        <span className="font-bold text-red">+{formatEuros(anomalie.impact)}</span>
      </div>
    </div>
  );
}
