"use client";

import { Camera, ChevronDown, Loader2, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export interface SiteInfos {
  texte: string | null;
  croquis: { id: string; nom: string }[];
}

const MAX_SKETCH_BYTES = 15 * 1024 * 1024;

/**
 * INFOS CHANTIER FACULTATIVES (docs/infos-chantier-facultatives.md). Le devis suffit ; si l'artisan connaît des
 * mesures ou des particularités, il les écrit comme il le dirait à quelqu'un qui prépare sa commande, et il peut
 * joindre la photo d'un croquis avec un commentaire. Les mesures nommées entrent dans le calcul ; le reste est
 * gardé et transmis au fournisseur. Jamais un formulaire de champs techniques.
 */
export function SiteNotes({
  projectId,
  infos,
  disabled,
  defaultOpen = false,
  onSaved,
}: {
  projectId: string;
  infos: SiteInfos | null;
  disabled: boolean;
  defaultOpen?: boolean;
  /** La note ou un croquis a changé : le quantitatif se recalcule au prochain chargement. */
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Le texte affiché : ce que l'artisan tape, sinon la note enregistrée (une note rechargée remplace l'affichage sans effet).
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? infos?.texte ?? "";
  const setText = (value: string) => setEdited(value);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textId = useId();
  const fileId = useId();
  async function save() {
    setPending(true);
    setError(null);
    try {
      await api<void>(`/v1/projects/${encodeURIComponent(projectId)}/infos`, { method: "PUT", body: { texte: text.trim() || null } });
      setEdited(null);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  async function sendSketch(file: File) {
    setError(null);
    if (file.size > MAX_SKETCH_BYTES) {
      setError(new ApiError("payload_too_large", 413));
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      if (comment.trim()) form.append("commentaire", comment.trim());
      await api<{ id: string; nom: string }>(`/v1/projects/${encodeURIComponent(projectId)}/infos/croquis`, { method: "POST", body: form });
      setComment("");
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const count = (infos?.texte ? 1 : 0) + (infos?.croquis.length ?? 0);
  return (
    <section aria-label="Informations sur le chantier" className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 items-center gap-2 self-start text-sm font-bold text-accent-text">
        {open ? <ChevronDown size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        {count > 0 ? `Informations sur le chantier (${count})` : "Ajouter des informations sur le chantier (facultatif)"}
      </button>
      {open ? (
        <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card">
          <p className="text-sm text-muted">
            Votre devis suffit. Si vous connaissez des mesures ou des particularités du chantier, écrivez-les ici comme vous le diriez : elles affinent la liste. Vous pouvez aussi joindre la photo d&apos;un croquis.
          </p>
          <label htmlFor={textId} className="sr-only">
            Informations sur le chantier
          </label>
          <textarea
            id={textId}
            value={text}
            disabled={disabled || pending}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={4}
            maxLength={4000}
            placeholder={"Pente 42°. Rampants 2 × 6,50 m. Noue 12 m.\nLes Velux sont conservés, le garage n'est pas compris."}
            className="min-h-28 rounded-2xl border border-line bg-ground p-3 text-base"
          />
          {error ? <ErrorNotice error={error} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button pending={pending} disabled={disabled || text === (infos?.texte ?? "")} onClick={() => void save()}>
              Enregistrer
            </Button>
            {saved ? (
              <span role="status" className="text-sm font-semibold text-ok">
                Pris en compte : la liste se recalcule.
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <input
              value={comment}
              disabled={disabled || pending}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Commentaire du croquis : « les traits rouges sont les rampants, 6,50 m chacun »"
              className="min-h-11 rounded-2xl border border-line bg-ground px-3 text-base"
              aria-label="Commentaire du croquis"
            />
            <input
              ref={fileInput}
              id={fileId}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="sr-only"
              disabled={disabled || pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void sendSketch(file);
              }}
            />
            <label htmlFor={fileId} aria-disabled={disabled || pending} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-2xl bg-ground px-4 text-sm font-bold shadow-card ${disabled || pending ? "pointer-events-none opacity-70" : ""}`}>
              {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
              Photo d&apos;un croquis ou d&apos;un plan
            </label>
            {infos?.croquis.length ? (
              <ul className="flex flex-wrap gap-2 text-sm">
                {infos.croquis.map((c) => (
                  <li key={c.id}>
                    <a href={`/v1/documents/${encodeURIComponent(c.id)}/file`} target="_blank" rel="noreferrer" className="font-semibold text-accent-text underline">
                      {c.nom}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
