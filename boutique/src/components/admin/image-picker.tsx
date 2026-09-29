"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { imageSrc, type ImageRef } from "@/lib/image-ref";
import { uploadImageFile } from "./upload";

/** Choix d'une image unique (logo, visuel d'accueil…). */
export function ImagePicker({ label, hint, value, onChange, round = false }: { label: string; hint?: string; value: ImageRef | null; onChange: (img: ImageRef | null) => void; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex items-center gap-4">
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden bg-secondary ${round ? "rounded-full" : "rounded-2xl"}`}>
          {busy ? (
            <Loader2 className="animate-spin text-primary" aria-label="Envoi en cours" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc(value, 320)} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="text-text-2" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            {value ? "Changer" : "Choisir une image"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)} aria-label={`Retirer : ${label}`}>
              <Trash2 size={15} aria-hidden="true" /> Retirer
            </button>
          )}
        </div>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            onChange(await uploadImageFile(file, "brand"));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Envoi impossible.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
