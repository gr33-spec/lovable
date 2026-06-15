import Link from "next/link";
import { ReceiptText, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatEuros } from "@/lib/utils";
import type { HistoriqueItem } from "@/lib/analysis";

interface AnalysisListItemProps {
  analysis: HistoriqueItem;
}

/** Une ligne d'historique cliquable vers le détail d'une analyse (§6.2). */
export function AnalysisListItem({ analysis }: AnalysisListItemProps) {
  const isDevis = analysis.type === "devis";
  const hasMontant = analysis.montant > 0;

  const montantLabel = hasMontant
    ? `+${formatEuros(analysis.montant)}`
    : isDevis
      ? "Équivalent"
      : "Conforme";

  // Une économie réalisée (devis) est un montant d'argent : couleur or, comme le hero des économies.
  const montantTone = hasMontant ? (isDevis ? "text-amber" : "text-red") : "text-muted";

  return (
    <Link href={`/analyse/${analysis.id}`} className="block">
      <Card className="flex items-center gap-3 motion-safe:transition-transform motion-safe:active:scale-[0.98]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          {isDevis ? (
            <ScanSearch className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold">
            {isDevis ? "Comparaison de devis" : "Vérification de facture"}
          </p>
          <p className="truncate font-sans text-xs text-muted">
            {formatDate(analysis.createdAt)}
            {analysis.fournisseurs.length > 0 ? ` · ${analysis.fournisseurs.join(", ")}` : ""}
          </p>
        </div>
        <p className={cn("shrink-0 font-mono text-sm font-bold", montantTone)}>{montantLabel}</p>
      </Card>
    </Link>
  );
}
