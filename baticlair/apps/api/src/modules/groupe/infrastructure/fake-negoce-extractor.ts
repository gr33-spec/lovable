import { fakeRows, isNumberCell } from "../../../platform/ai/fake-table.js";
import type { LectureReponseNegoce, NegoceExtractor, ReponseLue } from "../application/negoce-extractor.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * Lecture SIMULÉE d'un devis de négoce (développement et tests ; refusée en ligne) : le même faux tableau que les devis
 * fournisseurs (« réf · désignation · qté unité · P.U. · total »), le délai lu sur « délai … N jours », le total sur
 * « Total HT … ».
 */
export class FakeNegoceExtractor implements NegoceExtractor {
  readonly provider = "fake";

  async lire(demande: LectureReponseNegoce): Promise<ReadAttempt<ReponseLue>> {
    const paliers: ReponseLue["paliers"] = fakeRows(demande.numberedText)
      .filter((row) => row.index >= 1)
      .map((row) => ({
        designation: row.cols[row.index - 1]!,
        quantite: row.quantity.replace(/\s/g, ""),
        unite: row.unit,
        prixUnitaireHt: isNumberCell(row.cols[row.index + 1]) ? row.cols[row.index + 1]! : null,
        totalHt: isNumberCell(row.cols[row.index + 2]) ? row.cols[row.index + 2]! : null,
      }));
    const delai = /d[ée]lai[^0-9\n]{0,40}?(\d+)\s*(jours?|j\b|semaines?)/i.exec(demande.numberedText);
    const delaiJours = delai ? Number(delai[1]) * (delai[2]!.startsWith("sem") ? 7 : 1) : null;
    const total = /Total HT\s*([\d\s]+,\d+)/.exec(demande.numberedText);
    const output: ReponseLue = { paliers, delaiJours, totalHt: total ? total[1]!.trim() : null, doutes: paliers.length === 0 ? ["Aucune ligne de prix lue."] : [] };
    return { provider: "fake", model: "fake", usage: { inputTokens: 0, outputTokens: 0 }, status: "success", output, errorCode: null, durationMs: 0 };
  }
}
