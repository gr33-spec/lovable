import "server-only";
import { prisma } from "@/lib/db";
import type {
  AnalysisType,
  ComparisonResult,
  ExtractedDocument,
  LigneArticle,
  VerificationResult,
} from "@/lib/ai/types";

interface SaveAnalysisInput {
  userId: string;
  type: AnalysisType;
  extracted: ExtractedDocument[];
  result: ComparisonResult | VerificationResult;
  /** Chantier d'origine, si l'analyse a été lancée depuis sa fiche. */
  demandeId?: string;
}

/**
 * Normalise une désignation pour regrouper le même produit dans la base de
 * prix : minuscules, ponctuation (tirets, points...) retirée, espaces
 * multiples réduits. Permet de fusionner par ex. "OSB 3 18mm" et
 * "OSB 3 - 18mm".
 */
function normalizeDesignation(designation: string): string {
  return designation
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9àâäçéèêëîïôöùûüÿñæœ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Enregistre une analyse (devis ou facture) et alimente la base de prix
 * anonymisée (cf. cahier des charges §7 et §11).
 */
export async function saveAnalysis({ userId, type, extracted, result, demandeId }: SaveAnalysisInput) {
  const montant =
    type === "devis"
      ? (result as ComparisonResult).economie
      : (result as VerificationResult).surcout;

  const analysis = await prisma.analysis.create({
    data: {
      userId,
      type,
      demandeId,
      resultJson: JSON.parse(JSON.stringify(result)),
      montant,
      fournisseurs: extracted.map((doc) => doc.fournisseur).filter(Boolean),
      extractedDocs: {
        create: extracted.map((doc) => ({
          fournisseur: doc.fournisseur,
          date: doc.date,
          lignesJson: JSON.parse(JSON.stringify(doc.lignes)),
          totalHT: doc.totalHT,
          totalTTC: doc.totalTTC,
        })),
      },
    },
  });

  const priceRecords = extracted.flatMap((doc) =>
    doc.lignes
      .filter((ligne) => ligne.designation && ligne.pu > 0)
      .map((ligne) => ({
        designationNormalisee: normalizeDesignation(ligne.designation),
        fournisseur: doc.fournisseur || "Fournisseur inconnu",
        pu: ligne.pu,
        source: type,
      }))
  );

  if (priceRecords.length > 0) {
    await prisma.priceRecord.createMany({ data: priceRecords });
  }

  return analysis.id;
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

/** Récupère le résumé d'un résultat d'analyse stocké en JSON, si présent. */
function getResume(resultJson: unknown): string {
  if (resultJson && typeof resultJson === "object" && "resume" in resultJson) {
    const resume = (resultJson as { resume?: unknown }).resume;
    if (typeof resume === "string") return resume;
  }
  return "";
}

export interface HistoriqueItem {
  id: string;
  type: AnalysisType;
  createdAt: Date;
  montant: number;
  fournisseurs: string[];
  resume: string;
}

export interface AlerteItem {
  id: string;
  montant: number;
  fournisseurs: string[];
  resume: string;
}

export interface DashboardData {
  totalEconomise: number;
  economieDuMois: number;
  alertes: AlerteItem[];
  historique: HistoriqueItem[];
}

/** Données pour l'écran Accueil : économies cumulées, alertes et historique (§6.2). */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [totalAgg, moisAgg, facturesAvecSurcout, historique] = await Promise.all([
    prisma.analysis.aggregate({
      where: { userId, type: "devis" },
      _sum: { montant: true },
    }),
    prisma.analysis.aggregate({
      where: { userId, type: "devis", createdAt: { gte: startOfMonth() } },
      _sum: { montant: true },
    }),
    prisma.analysis.findMany({
      where: { userId, type: "facture", montant: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, montant: true, fournisseurs: true, resultJson: true },
    }),
    prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, createdAt: true, montant: true, fournisseurs: true, resultJson: true },
    }),
  ]);

  return {
    totalEconomise: totalAgg._sum.montant ?? 0,
    economieDuMois: moisAgg._sum.montant ?? 0,
    alertes: facturesAvecSurcout.map((analysis) => ({
      id: analysis.id,
      montant: analysis.montant,
      fournisseurs: analysis.fournisseurs,
      resume: getResume(analysis.resultJson),
    })),
    historique: historique.map((analysis) => ({
      id: analysis.id,
      type: analysis.type,
      createdAt: analysis.createdAt,
      montant: analysis.montant,
      fournisseurs: analysis.fournisseurs,
      resume: getResume(analysis.resultJson),
    })),
  };
}

export interface ProduitBilan {
  designation: string;
  nbAchats: number;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
}

export interface BilanData {
  economieAnnee: number;
  totalAnalyses: number;
  produits: ProduitBilan[];
}

/** Données pour l'écran Bilan : économies de l'année et base de prix de l'artisan (§6.4). */
export async function getBilanData(userId: string): Promise<BilanData> {
  const [economieAgg, totalAnalyses, docs] = await Promise.all([
    prisma.analysis.aggregate({
      where: { userId, type: "devis", createdAt: { gte: startOfYear() } },
      _sum: { montant: true },
    }),
    prisma.analysis.count({ where: { userId } }),
    prisma.extractedDoc.findMany({
      where: { analysis: { userId } },
      orderBy: { analysis: { createdAt: "desc" } },
      select: { lignesJson: true },
    }),
  ]);

  const groupes = new Map<string, { designation: string; prix: number[] }>();

  for (const doc of docs) {
    const lignes = doc.lignesJson as unknown as LigneArticle[];
    for (const ligne of lignes) {
      if (!ligne.designation || !(ligne.pu > 0)) continue;
      const cle = normalizeDesignation(ligne.designation);
      const groupe = groupes.get(cle);
      if (groupe) {
        groupe.prix.push(ligne.pu);
      } else {
        groupes.set(cle, { designation: ligne.designation, prix: [ligne.pu] });
      }
    }
  }

  const produits = Array.from(groupes.values())
    .map(({ designation, prix }) => ({
      designation,
      nbAchats: prix.length,
      prixMoyen: prix.reduce((total, p) => total + p, 0) / prix.length,
      prixMin: Math.min(...prix),
      prixMax: Math.max(...prix),
    }))
    .sort((a, b) => b.nbAchats - a.nbAchats)
    .slice(0, 10);

  return {
    economieAnnee: economieAgg._sum.montant ?? 0,
    totalAnalyses,
    produits,
  };
}
