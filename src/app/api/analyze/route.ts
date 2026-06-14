import { NextResponse } from "next/server";
import {
  extractDocument,
  compareDevis,
  verifyFacture,
  AiParseError,
  type SupportedMediaType,
} from "@/lib/ai";

// L'analyse peut enchaîner plusieurs appels IA : on laisse un peu de marge.
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo
const ACCEPTED_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function isSupportedMediaType(type: string): type is SupportedMediaType {
  return ACCEPTED_TYPES.includes(type);
}

/** Convertit un fichier déposé par l'artisan en payload base64 pour l'IA. */
async function fileToPayload(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}" est trop lourd (15 Mo max). Essaie une photo moins lourde.`);
  }
  if (!isSupportedMediaType(file.type)) {
    throw new Error(`"${file.name}" doit être une photo (JPEG/PNG) ou un PDF.`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { base64: buffer.toString("base64"), mediaType: file.type };
}

/**
 * Reçoit les devis (ou devis+facture), fait lire chaque document par l'IA
 * côté serveur, puis renvoie le résultat (comparaison ou vérification).
 * Cf. cahier des charges §8 et §9.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Impossible de lire les fichiers envoyés. Réessaie." },
      { status: 400 }
    );
  }

  const type = formData.get("type");
  if (type !== "devis" && type !== "facture") {
    return NextResponse.json(
      { error: "Choisis d'abord ce que tu veux faire : comparer des devis ou vérifier une facture." },
      { status: 400 }
    );
  }

  try {
    if (type === "devis") {
      const files = formData
        .getAll("files")
        .filter((f): f is File => f instanceof File);

      if (files.length < 2) {
        return NextResponse.json(
          { error: "Dépose au moins 2 devis à comparer." },
          { status: 400 }
        );
      }
      if (files.length > 4) {
        return NextResponse.json(
          { error: "4 devis maximum à la fois." },
          { status: 400 }
        );
      }

      const payloads = await Promise.all(files.map(fileToPayload));
      const extracted = await Promise.all(
        payloads.map((payload) => extractDocument(payload, "devis"))
      );
      const result = await compareDevis(extracted);

      return NextResponse.json({ type, extracted, result });
    }

    // type === "facture" : un devis + sa facture correspondante.
    const devisFile = formData.get("devisFile");
    const factureFile = formData.get("factureFile");
    if (!(devisFile instanceof File) || !(factureFile instanceof File)) {
      return NextResponse.json(
        { error: "Dépose ton devis et la facture correspondante." },
        { status: 400 }
      );
    }

    const [devisPayload, facturePayload] = await Promise.all([
      fileToPayload(devisFile),
      fileToPayload(factureFile),
    ]);
    const [devisExtrait, factureExtraite] = await Promise.all([
      extractDocument(devisPayload, "devis"),
      extractDocument(facturePayload, "facture"),
    ]);
    const result = await verifyFacture(devisExtrait, factureExtraite);

    return NextResponse.json({
      type,
      extracted: [devisExtrait, factureExtraite],
      result,
    });
  } catch (error) {
    console.error("Erreur /api/analyze :", error);

    if (error instanceof AiParseError) {
      return NextResponse.json(
        {
          error:
            "L'IA n'a pas réussi à lire ce document. Reprends une photo bien nette (tout le document visible) ou réessaie.",
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
