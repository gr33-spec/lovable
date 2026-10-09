"use client";

import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { parseQuantity } from "@/lib/labels";
import { ApiError, type PurchaseItem } from "@/lib/api";
import { ErrorNotice } from "@/components/ui";

/** La fiche « Modifier l'article » d'une ligne de la liste (§41.4) et son croquis facultatif. */
/** Ce que l'artisan réécrit sur une ligne (§41.4) : le texte lui-même, et la quantité avec son unité. */
export interface ItemEdit {
  libelle: string;
  quantite: string | null;
  unite: string | null;
}

export interface SketchHandlers {
  onAttach: (itemKey: string, file: File, commentaire: string) => Promise<void>;
  onDetach: (sketchId: string) => Promise<void>;
}

/** La fiche qui s'ouvre sous une ligne : un panneau blanc bordé, des champs au contour net (mêmes pour toutes les lignes). */
export const EDIT_PANEL = "flex scroll-mb-52 flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-accent/25";
export const EDIT_FIELD =
  "min-h-12 w-full rounded-xl border border-[#d5d9e0] bg-surface px-3 text-base font-normal outline-none transition-colors placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20";

/** Le texte et la quantité d'une ligne, tels que l'artisan veut les voir partir chez le fournisseur. */
export function ItemForm({
  item,
  pending,
  onSave,
  onCancel,
  onAttach,
  onRemove,
}: {
  item: PurchaseItem;
  pending: boolean;
  onSave: (e: ItemEdit) => Promise<void>;
  onCancel: () => void;
  onAttach?: (file: File, commentaire: string) => Promise<void>;
  onRemove?: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const parsed = item.quantity ? parseQuantity(item.quantity) : null;
  const [libelle, setLibelle] = useState(item.label);
  const [quantite, setQuantite] = useState(parsed?.quantity ?? "");
  const [unite, setUnite] = useState(parsed?.unit ?? "");
  // La fiche s'ouvre sous la ligne : on la fait venir à l'écran, sans ouvrir le clavier tout seul.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, []);
  const input = EDIT_FIELD;
  return (
    <form
      ref={ref}
      aria-label={`Modifier : ${item.label}`}
      className={EDIT_PANEL}
      onSubmit={(e) => {
        e.preventDefault();
        if (!libelle.trim()) return;
        void onSave({ libelle: libelle.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null });
      }}
    >
      <p className="text-[12px] font-extrabold tracking-[0.04em] text-accent-text">MODIFIER L&apos;ARTICLE</p>
      <label htmlFor={`${id}-l`} className="flex flex-col gap-1 text-sm font-bold">
        Désignation
        <input id={`${id}-l`} className={input} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-sm font-bold">
          Quantité
          <input id={`${id}-q`} className={input} inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </label>
        <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-sm font-bold">
          Unité
          <input id={`${id}-u`} className={input} value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="pièces, ml, kg…" />
        </label>
      </div>
      {onAttach ? <SketchPicker label={item.label} onAttach={onAttach} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" pending={pending}>
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="-mb-1 inline-flex min-h-11 items-center justify-center gap-1.5 border-t border-line pt-2 text-sm font-bold text-danger">
          <Trash2 size={16} aria-hidden="true" />
          Retirer de la liste
        </button>
      ) : null}
    </form>
  );
}

/**
 * Joindre un croquis à l'article (couvertine, habillage, bande façonnée…) : une photo ou un PDF, et une précision
 * facultative. Il part avec la commande (PDF et mail) ; jamais lu par l'IA, jamais une mesure de calcul.
 */
function SketchPicker({ label, onAttach }: { label: string; onAttach: (file: File, commentaire: string) => Promise<void> }) {
  const id = useId();
  const [commentaire, setCommentaire] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#c9c2ff] bg-white p-3">
      <p className="text-sm font-bold">Croquis ou photo (facultatif)</p>
      <input
        aria-label={`Précision du croquis : ${label}`}
        className="min-h-11 w-full rounded-xl bg-ground px-3 text-[15px]"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Ex. dév. 330, 2 plis, longueurs de 2 m"
        maxLength={1000}
      />
      {error ? <ErrorNotice error={error} /> : null}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            await onAttach(file, commentaire.trim());
            setCommentaire("");
          } catch (err) {
            setError(err instanceof ApiError ? err : new ApiError("internal_error", 500));
          } finally {
            setBusy(false);
          }
        }}
      />
      <label htmlFor={id} className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#eeedff] px-3 text-sm font-extrabold text-[#4a37d6] ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Paperclip size={16} aria-hidden="true" />}
        {busy ? "Envoi du croquis…" : "Joindre une photo ou un PDF"}
      </label>
    </div>
  );
}
