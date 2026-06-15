import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ComparisonResultView } from "@/components/analyser/comparison-result";
import { VerificationResultView } from "@/components/analyser/verification-result";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/current-user";
import { getSuppliers } from "@/lib/suppliers";
import type { ComparisonResult, ExtractedDocument, LigneArticle, VerificationResult } from "@/lib/ai/types";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

interface AnalyseDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Détail d'une analyse passée, ré-affiché à l'identique du résultat initial (§6.2). */
export default async function AnalyseDetailPage({ params }: AnalyseDetailPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [analysis, suppliers] = await Promise.all([
    prisma.analysis.findFirst({
      where: { id, userId },
      include: { extractedDocs: true },
    }),
    getSuppliers(userId),
  ]);

  if (!analysis) {
    notFound();
  }

  const supplierEmails: Record<string, string> = {};
  for (const supplier of suppliers) {
    supplierEmails[supplier.nom.toLowerCase()] = supplier.email;
  }

  const extracted: ExtractedDocument[] = analysis.extractedDocs.map((doc) => ({
    fournisseur: doc.fournisseur,
    date: doc.date,
    lignes: doc.lignesJson as unknown as LigneArticle[],
    totalHT: doc.totalHT,
    totalTTC: doc.totalTTC,
    fraisLivraison: 0,
    validite: "",
    conditionsPaiement: "",
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/accueil" className="inline-flex items-center gap-1 font-sans text-sm text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour à l&apos;accueil
      </Link>

      {analysis.type === "devis" ? (
        <ComparisonResultView
          result={analysis.resultJson as unknown as ComparisonResult}
          extracted={extracted}
          supplierEmails={supplierEmails}
        />
      ) : (
        <VerificationResultView
          result={analysis.resultJson as unknown as VerificationResult}
          extracted={extracted}
        />
      )}
    </div>
  );
}
