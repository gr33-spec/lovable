"use client";

import { useRef, useState } from "react";
import { FileCheck2, FileUp, LoaderCircle } from "lucide-react";
import type { Person, StoredFileRef } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { ACCEPTED_FILES, uploadFile } from "@/lib/upload";
import { openDocument } from "@/components/pdf-viewer";
import { toast } from "@/components/swipe";
import { cx } from "@/components/ui";

// Exemplaire signé (bail, acte de caution) : déposé en PDF ou en photo sous le
// locataire. Un nouveau dépôt remplace l'ancien, qui est supprimé du serveur.

export function SignedDocRow({
  title,
  subtitle,
  file,
  onChange,
  readOnly,
  details,
}: {
  title: string;
  subtitle?: string;
  /** Informations connues (ex. garant : naissance, adresse), affichées même sans fichier. */
  details?: string;
  file?: StoredFileRef;
  onChange?: (file: StoredFileRef) => void;
  readOnly?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (f: File) => {
    setError(null);
    setProgress(0);
    try {
      const fileId = await uploadFile(f, setProgress);
      // L'ancien exemplaire est supprimé : un seul document signé en vigueur.
      if (file?.fileId) await fetch(`/api/files/${file.fileId}`, { method: "DELETE" }).catch(() => undefined);
      onChange?.({ fileId, name: f.name, uploadedAt: new Date().toISOString().slice(0, 10) });
      toast(file ? `${title} remplacé` : `${title} enregistré`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  if (readOnly && !file && !details) return null;
  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", file ? "bg-pos/10 text-pos" : "bg-soft text-muted")}>
          {file ? <FileCheck2 size={18} /> : <FileUp size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium leading-snug text-ink">{title}</div>
          <div className="line-clamp-2 text-[13px] leading-snug text-muted">
            {!file && readOnly ? (
              "Exemplaire signé non joint"
            ) : file ? (
              <>
                <span className="font-semibold text-pos">Déposé</span>
                {file.uploadedAt ? ` le ${dateFr(file.uploadedAt)}` : ""}
              </>
            ) : (
              "À joindre (PDF ou photo)"
            )}
            {subtitle ? ` · ${subtitle}` : ""}
          </div>
          {details && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{details}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {progress !== null ? (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-series-1">
              <LoaderCircle size={15} className="animate-spin" /> {progress} %
            </span>
          ) : (
            <>
              {file && (
                <button type="button" onClick={() => openDocument(`/api/files/${file.fileId}`, file.name)} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-brand">
                  Voir
                </button>
              )}
              {!readOnly && (
                <button type="button" onClick={() => input.current?.click()} className={cx("rounded-full px-3 py-1.5 text-[13px] font-semibold", file ? "bg-soft text-brand" : "bg-brand text-on-brand")}>
                  {file ? "Remplacer" : "Joindre"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {error && <div className="mt-1 pl-[52px] text-xs text-neg">{error}</div>}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** « Né(e) le 13/05/1963 à Paimpol · 3 chemin du Varadec, 22860 Plourivo » (uniquement ce qui est connu). */
export function guarantorDetails(g: Person): string | undefined {
  const birth = [g.birthDate ? `le ${dateFr(g.birthDate)}` : undefined, g.birthPlace ? `à ${g.birthPlace}` : undefined].filter(Boolean).join(" ");
  const parts = [birth ? `Né(e) ${birth}` : undefined, g.address, g.phone, g.email].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}
