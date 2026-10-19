import { AiParseError } from "./parse";
import type { AnomalieType, ComparisonResult, ExtractedDocument, VerificationResult } from "./types";

function toNumber(v: unknown): number {
  if (typeof v === "number" && isFinite(v) && v >= 0) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    if (isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Valide et normalise un document extrait par l'IA.
 * Lève une AiParseError si le document est vide ou si l'IA a signalé une erreur.
 */
export function validateExtractedDocument(raw: unknown): ExtractedDocument {
  if (!raw || typeof raw !== "object") {
    throw new AiParseError("L'IA n'a pas renvoyé un objet JSON valide.");
  }

  const r = raw as Record<string, unknown>;

  if (toStr(r.erreur).length > 0) {
    throw new AiParseError(
      `Le document n'a pas pu être lu : ${toStr(r.erreur)}. Reprends une photo nette de l'ensemble du document et réessaie.`
    );
  }

  if (!Array.isArray(r.lignes) || r.lignes.length === 0) {
    throw new AiParseError(
      "L'IA n'a trouvé aucune ligne d'article dans ce document. Vérifie que l'image est nette, bien cadrée et que c'est bien un devis ou une facture."
    );
  }

  const lignes = (r.lignes as unknown[])
    .map((l) => {
      const ligne = (l ?? {}) as Record<string, unknown>;
      return {
        designation: toStr(ligne.designation),
        ref: toStr(ligne.ref),
        qte: toNumber(ligne.qte) || 1,
        unite: toStr(ligne.unite),
        pu: toNumber(ligne.pu),
        total: toNumber(ligne.total),
      };
    })
    .filter((l) => l.designation.length > 0);

  if (lignes.length === 0) {
    throw new AiParseError(
      "L'IA n'a pas pu extraire de lignes d'articles valides de ce document."
    );
  }

  return {
    fournisseur: toStr(r.fournisseur),
    date: toStr(r.date),
    lignes,
    totalHT: toNumber(r.totalHT),
    totalTTC: toNumber(r.totalTTC),
    fraisLivraison: toNumber(r.fraisLivraison),
    validite: toStr(r.validite),
    conditionsPaiement: toStr(r.conditionsPaiement),
  };
}

/**
 * Valide et normalise un résultat de comparaison de devis.
 */
export function validateComparisonResult(raw: unknown): ComparisonResult {
  if (!raw || typeof raw !== "object") {
    throw new AiParseError("Résultat de comparaison invalide.");
  }

  const r = raw as Record<string, unknown>;

  return {
    mieuxDisant: toStr(r.mieuxDisant),
    economie: toNumber(r.economie),
    comparaison: Array.isArray(r.comparaison)
      ? r.comparaison.map((p) => {
          const prod = (p ?? {}) as Record<string, unknown>;
          return {
            produit: toStr(prod.produit),
            offres: Array.isArray(prod.offres)
              ? prod.offres.map((o) => {
                  const offre = (o ?? {}) as Record<string, unknown>;
                  return { fournisseur: toStr(offre.fournisseur), pu: toNumber(offre.pu) };
                })
              : [],
            meilleurFournisseur: toStr(prod.meilleurFournisseur),
          };
        })
      : [],
    alertes: Array.isArray(r.alertes) ? r.alertes.filter((a): a is string => typeof a === "string") : [],
    resume: toStr(r.resume),
  };
}

const TYPES_VALIDES: readonly AnomalieType[] = ["ecart_prix", "doublon", "quantite", "hors_devis"];

/**
 * Valide et normalise un résultat de vérification facture vs devis.
 */
export function validateVerificationResult(raw: unknown): VerificationResult {
  if (!raw || typeof raw !== "object") {
    throw new AiParseError("Résultat de vérification invalide.");
  }

  const r = raw as Record<string, unknown>;

  const anomalies = Array.isArray(r.anomalies)
    ? r.anomalies.map((a) => {
        const an = (a ?? {}) as Record<string, unknown>;
        const type = TYPES_VALIDES.includes(an.type as AnomalieType)
          ? (an.type as AnomalieType)
          : "ecart_prix";
        return {
          type,
          produit: toStr(an.produit),
          devis: toNumber(an.devis),
          facture: toNumber(an.facture),
          impact: toNumber(an.impact),
          detail: toStr(an.detail),
        };
      })
    : [];

  const surcout = toNumber(r.surcout);

  return {
    conforme: typeof r.conforme === "boolean" ? r.conforme : anomalies.length === 0 && surcout === 0,
    surcout,
    anomalies,
    resume: toStr(r.resume),
  };
}
