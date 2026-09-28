"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, FileText, Plus, X } from "lucide-react";

interface FileUploadZoneProps {
  label: string;
  hint?: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles: number;
}

/**
 * Zone de dépôt photo/PDF. Le moins de saisie possible : un seul bouton qui
 * ouvre l'appareil photo ou le sélecteur de fichiers (design system §2 et §6).
 */
export function FileUploadZone({ label, hint, files, onChange, maxFiles }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    if (maxFiles === 1) {
      onChange(picked.slice(0, 1));
    } else {
      onChange([...files, ...picked].slice(0, maxFiles));
    }
    // Permet de re-choisir le même fichier plus tard si besoin.
    event.target.value = "";
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const canAddMore = files.length < maxFiles;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-sm font-bold">{label}</p>
      {hint ? <p className="font-sans text-xs text-muted">{hint}</p> : null}

      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 shadow-soft"
            >
              <FileText className="h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
              <span className="flex-1 truncate font-sans text-sm">{file.name}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Retirer ${file.name}`}
                className="tap-target flex items-center justify-center text-red"
              >
                <X className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canAddMore ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="tap-target flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-paper/50 px-4 py-5 font-display text-sm font-bold text-accent transition-colors hover:border-accent/50 hover:bg-accent/5"
        >
          {files.length === 0 ? (
            <Camera className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Plus className="h-5 w-5" aria-hidden="true" />
          )}
          {files.length === 0 ? "Prendre une photo ou choisir un PDF" : "Ajouter un autre document"}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        multiple={maxFiles > 1}
        onChange={handlePick}
        className="hidden"
      />
    </div>
  );
}
