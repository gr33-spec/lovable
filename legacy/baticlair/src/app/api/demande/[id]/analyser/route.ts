import { NextResponse } from "next/server";
import { AiParseError } from "@/lib/ai";
import { analyserChantier, ChantierAnalysisError } from "@/lib/chantier-analysis";
import { getCurrentUserId } from "@/lib/current-user";
import { getUsage } from "@/lib/plan";

// L'analyse peut enchaîner plusieurs appels IA : on laisse un peu de marge.
export const maxDuration = 60;

interface AnalyserRouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Lance (ou relance) la comparaison IA des devis reçus pour un chantier
 * (bouton "Lancer l'analyse IA" / "Comparer les N devis reçus", étape 7+).
 */
export async function POST(_request: Request, { params }: AnalyserRouteParams) {
  const { id } = await params;

  try {
    const userId = await getCurrentUserId();
    const usage = await getUsage(userId);

    if (usage.atteinte) {
      return NextResponse.json(
        {
          error:
            "Tu as atteint la limite de 3 analyses gratuites ce mois-ci. Passe au plan Pro pour continuer.",
          limitReached: true,
        },
        { status: 403 }
      );
    }

    const { result, extracted } = await analyserChantier(userId, id);
    return NextResponse.json({ result, extracted });
  } catch (error) {
    console.error("Erreur /api/demande/[id]/analyser :", error);

    if (error instanceof ChantierAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AiParseError) {
      return NextResponse.json(
        {
          error:
            "L'IA n'a pas réussi à lire un des devis. Vérifie que les pièces jointes sont bien lisibles ou réessaie.",
        },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "L'analyse n'est pas disponible pour le moment. Réessaie plus tard." },
        { status: 503 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Une erreur inattendue est survenue. Réessaie." },
      { status: 500 }
    );
  }
}
