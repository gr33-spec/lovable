"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedToggle } from "@/components/analyser/segmented-toggle";
import { FileUploadZone } from "@/components/analyser/file-upload-zone";
import { LoadingState } from "@/components/analyser/loading-state";
import { ComparisonResultView } from "@/components/analyser/comparison-result";
import { VerificationResultView } from "@/components/analyser/verification-result";
import type { AnalysisType, AnalyzeResponse } from "@/lib/ai/types";

type Status = "idle" | "loading" | "result" | "error";

export default function AnalyserPage() {
  const [mode, setMode] = useState<AnalysisType>("devis");
  const [devisFiles, setDevisFiles] = useState<File[]>([]);
  const [devisFacture, setDevisFacture] = useState<File[]>([]);
  const [factureFile, setFactureFile] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = useMemo(() => {
    if (mode === "devis") {
      const lectures = devisFiles.map(
        (_, i) => `Lecture du devis ${i + 1}/${devisFiles.length}…`
      );
      return [...lectures, "Comparaison des devis…"];
    }
    return ["Lecture du devis…", "Lecture de la facture…", "Vérification en cours…"];
  }, [mode, devisFiles]);

  // Pré-sélectionne l'onglet demandé depuis l'accueil (/analyser?mode=facture).
  // window.location n'existe pas côté serveur : on ne peut lire le paramètre qu'après le montage.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    if (requested === "devis" || requested === "facture") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- valeur dérivée de l'URL, indisponible avant le montage
      setMode(requested);
    }
  }, []);

  // Avance dans les messages de chargement pour rassurer l'artisan (§2.6).
  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [status, loadingMessages.length]);

  function switchMode(next: AnalysisType) {
    setMode(next);
    setStatus("idle");
    setError(null);
    setResult(null);
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setResult(null);
    setDevisFiles([]);
    setDevisFacture([]);
    setFactureFile([]);
  }

  const canSubmit =
    mode === "devis"
      ? devisFiles.length >= 2
      : devisFacture.length === 1 && factureFile.length === 1;

  async function handleSubmit() {
    setStatus("loading");
    setLoadingStep(0);
    setError(null);

    const formData = new FormData();
    formData.append("type", mode);
    if (mode === "devis") {
      devisFiles.forEach((file) => formData.append("files", file));
    } else {
      formData.append("devisFile", devisFacture[0]);
      formData.append("factureFile", factureFile[0]);
    }

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue. Réessaie.");
        setStatus("error");
        return;
      }

      setResult(data as AnalyzeResponse);
      setStatus("result");
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <LoadingState message={loadingMessages[loadingStep]} />;
  }

  if (status === "result" && result) {
    return (
      <div className="flex flex-col gap-4">
        {result.type === "devis" ? (
          <ComparisonResultView result={result.result} extracted={result.extracted} />
        ) : (
          <VerificationResultView result={result.result} extracted={result.extracted} />
        )}
        <Button variant="secondary" fullWidth onClick={reset}>
          Nouvelle analyse
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Analyser</h1>

      <SegmentedToggle value={mode} onChange={switchMode} />

      {mode === "devis" ? (
        <FileUploadZone
          label="Tes devis"
          hint="Ajoute 2 à 4 devis pour le même besoin (photo ou PDF)."
          files={devisFiles}
          onChange={setDevisFiles}
          maxFiles={4}
        />
      ) : (
        <>
          <FileUploadZone
            label="Ton devis"
            hint="Le devis que le fournisseur t'a donné au départ."
            files={devisFacture}
            onChange={setDevisFacture}
            maxFiles={1}
          />
          <FileUploadZone
            label="Ta facture"
            hint="La facture reçue pour ce même chantier."
            files={factureFile}
            onChange={setFactureFile}
            maxFiles={1}
          />
        </>
      )}

      {error ? (
        <Card className="flex items-start gap-2 bg-red/10">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red" aria-hidden="true" />
          <p className="font-sans text-sm">{error}</p>
        </Card>
      ) : null}

      <Button fullWidth disabled={!canSubmit} onClick={handleSubmit}>
        Lancer l&apos;analyse
      </Button>

      {mode === "devis" && devisFiles.length === 1 ? (
        <p className="text-center font-sans text-xs text-muted">
          Ajoute un 2ᵉ devis pour pouvoir comparer.
        </p>
      ) : null}
    </div>
  );
}
