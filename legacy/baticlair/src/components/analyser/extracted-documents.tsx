import { Card } from "@/components/ui/card";
import { formatEuros } from "@/lib/utils";
import type { ExtractedDocument } from "@/lib/ai/types";

/**
 * Rappelle ce que l'IA a lu dans chaque document, pour relecture par
 * l'artisan avant toute décision (cahier des charges §11).
 */
export function ExtractedDocuments({ documents }: { documents: ExtractedDocument[] }) {
  return (
    <Card>
      <p className="mb-2 font-display text-sm font-bold">Ce que l&apos;IA a lu</p>
      <ul className="flex flex-col gap-2">
        {documents.map((doc, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold">
                {doc.fournisseur || "Fournisseur non identifié"}
              </p>
              <p className="font-sans text-xs text-muted">
                {doc.date || "Date inconnue"} · {doc.lignes.length} article
                {doc.lignes.length > 1 ? "s" : ""}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-bold">
              {formatEuros(doc.totalTTC || doc.totalHT)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-sans text-xs text-muted">
        Relis ces montants avant de décider : une erreur de lecture est
        toujours possible.
      </p>
    </Card>
  );
}
