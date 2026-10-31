"use client";

import { Check } from "lucide-react";
import { useCallback, useState } from "react";
import { COULEURS_PDF, MODELES_PDF, MODELES_PDF_INFO, type CouleurPdf, type ModelePdf } from "../../../../packages/domain/src/documents/modele-pdf";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Card } from "./ui";

type Reglages = { attachQuoteDetail: boolean; modelePdf: ModelePdf; couleurPdf: CouleurPdf };

/**
 * Profil : « Ma demande de prix » (assistant Mobiiz, Greg, 31 octobre 2026, points 8 et 12) : le modèle du PDF envoyé aux
 * négoces (Essentiel, Classique, Détaillé) et sa couleur principale, retenus pour l'entreprise. Le logo, lui, est
 * automatique (celui du compte).
 */
export function CarteReglagesPdf() {
  const charger = useCallback((signal: AbortSignal) => api<Reglages>("/v1/price-requests/settings", { signal }), []);
  const reglages = useResource(charger);
  const [erreur, setErreur] = useState(false);
  const r = reglages.data;

  async function changer(patch: Partial<Pick<Reglages, "modelePdf" | "couleurPdf">>) {
    setErreur(false);
    const avant = reglages.data;
    reglages.setData((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await api<Reglages>("/v1/price-requests/settings", { method: "PATCH", body: patch });
    } catch {
      reglages.setData(() => avant ?? null);
      setErreur(true);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Ma demande de prix</h2>
      <p className="text-[14px] text-muted">Le PDF que reçoivent tes négoces. Ton logo s&apos;y met tout seul.</p>
      <div role="radiogroup" aria-label="Modèle du PDF" className="flex flex-col gap-2">
        {MODELES_PDF.map((m) => {
          const actif = r?.modelePdf === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={actif}
              disabled={!r}
              onClick={() => void changer({ modelePdf: m })}
              className={`pressable flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left ${actif ? "border-ink" : "border-line"}`}
            >
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold">
                  {MODELES_PDF_INFO[m].nom}
                  {m === "classique" ? <span className="font-normal text-muted"> · par défaut</span> : null}
                </span>
                <span className="text-[13px] text-muted">{MODELES_PDF_INFO[m].texte}</span>
              </span>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${actif ? "border-ink bg-ink text-white" : "border-line"}`} aria-hidden="true">
                {actif ? <Check size={14} strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label="Couleur du PDF" className="flex flex-wrap gap-2.5 pt-1">
        {COULEURS_PDF.map((c) => {
          const actif = r?.couleurPdf === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={c.nom}
              title={c.nom}
              disabled={!r}
              onClick={() => void changer({ couleurPdf: c.id })}
              className={`pressable flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface ${actif ? "ring-2 ring-ink" : "ring-1 ring-line"}`}
              style={{ backgroundColor: c.hex }}
            >
              {actif ? <Check size={18} strokeWidth={3} color={c.id === "mobiiz" ? "#130901" : "#ffffff"} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      {erreur ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          Le réglage n&apos;est pas passé. Réessaie dans un instant.
        </p>
      ) : null}
    </Card>
  );
}
