"use client";

import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { PhotoRefusee, reduireImage } from "@/lib/reduire-image";

export interface PhotoEditeur {
  id: string;
  role: "galerie" | "couverture" | "equipe";
  realisationId?: string | null;
  statut: "traitement" | "prete" | "erreur";
  legende: string | null;
  variantes: { largeur: number; avif: string; webp: string }[];
}

/** Envoie une photo (réduite dans le navigateur) ; rend la phrase d'erreur, ou null. */
export async function envoyerPhoto(fichier: File, role: "galerie" | "couverture" | "equipe", realisationId: string | null = null): Promise<string | null> {
  try {
    const blob = await reduireImage(fichier);
    const form = new FormData();
    form.append("role", role);
    if (realisationId) form.append("realisationId", realisationId);
    form.append("file", blob, "photo.jpg");
    await api("/v1/ma-page/photos", { method: "POST", body: form });
    return null;
  } catch (e) {
    if (e instanceof PhotoRefusee) return e.message;
    const phrase = (e as { phrase?: string }).phrase;
    return phrase ?? "La photo n'est pas partie. Réessaie.";
  }
}

const vignette = (p: PhotoEditeur) => p.variantes[0]?.webp ?? null;

/**
 * LA GALERIE (20 photos au plus) : ajouter plusieurs photos d'un coup, GLISSER POUR RÉORDONNER (au doigt comme à la
 * souris, par la poignée), légende facultative, retirer. Les flèches du clavier déplacent aussi une photo (poignée
 * active), pour qui ne peut pas glisser.
 */
export function GaleriePhotos({ photos, max, actif, stockage = true, realisationId = null, total, libelle = "Ajouter des photos de ce chantier", onChange, onErreur }: { photos: PhotoEditeur[]; max: number; actif: boolean; stockage?: boolean; realisationId?: string | null; total: number; libelle?: string; onChange: () => void; onErreur: (m: string | null) => void }) {
  const galerie = photos.filter((p) => p.role === "galerie" && p.statut !== "erreur" && (p.realisationId ?? null) === realisationId);
  const [ordre, setOrdre] = useState<string[] | null>(null);
  const [envoi, setEnvoi] = useState(0);
  const glisse = useRef<{ id: string; pointeur: number } | null>(null);
  const [enMain, setEnMain] = useState<string | null>(null);
  const liste = ordre ? (ordre.map((id) => galerie.find((p) => p.id === id)).filter(Boolean) as PhotoEditeur[]) : galerie;

  const enregistrerOrdre = async (ids: string[]) => {
    try {
      await api("/v1/ma-page/photos/ordre", { method: "PUT", body: { ids } });
      onChange();
    } catch {
      onErreur("L'ordre n'a pas été enregistré. Réessaie.");
    } finally {
      setOrdre(null);
    }
  };
  const deplacer = (id: string, vers: number) => {
    const ids = liste.map((p) => p.id);
    const de = ids.indexOf(id);
    if (de < 0 || vers < 0 || vers >= ids.length || de === vers) return ids;
    ids.splice(vers, 0, ids.splice(de, 1)[0]!);
    return ids;
  };

  const ajouter = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    onErreur(null);
    const place = Math.max(0, max - total);
    const choisis = Array.from(fichiers).slice(0, place);
    if (fichiers.length > place) onErreur(`${max} photos au plus : ${fichiers.length - place} photo(s) non ajoutée(s).`);
    setEnvoi((n) => n + choisis.length);
    for (const f of choisis) {
      const err = await envoyerPhoto(f, "galerie", realisationId);
      setEnvoi((n) => n - 1);
      if (err) onErreur(err);
      onChange();
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos du chantier">
        {liste.map((p, i) => (
          <li key={p.id} data-photo={p.id} className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${enMain === p.id ? "ring-2 ring-accent" : ""}`}>
            <div className="relative aspect-[4/3] bg-black/10">
              {p.statut === "prete" && vignette(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vignette(p)!} alt={p.legende ?? `Photo ${i + 1}`} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center gap-2 text-[13px] text-muted">
                  <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> Préparation…
                </span>
              )}
              <button
                type="button"
                aria-label={`Déplacer la photo ${i + 1} (glisser, ou flèches du clavier)`}
                className="absolute top-1.5 left-1.5 flex size-10 touch-none items-center justify-center rounded-xl bg-black/60 text-white"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  glisse.current = { id: p.id, pointeur: e.pointerId };
                  setEnMain(p.id);
                  setOrdre(liste.map((x) => x.id));
                }}
                onPointerMove={(e) => {
                  if (!glisse.current) return;
                  const sous = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el instanceof HTMLElement && el.dataset.photo && el.dataset.photo !== glisse.current!.id) as HTMLElement | undefined;
                  if (!sous) return;
                  const ids = ordre ?? liste.map((x) => x.id);
                  const vers = ids.indexOf(sous.dataset.photo!);
                  setOrdre(deplacer(glisse.current.id, vers));
                }}
                onPointerUp={() => {
                  const fini = glisse.current;
                  glisse.current = null;
                  setEnMain(null);
                  if (fini && ordre) void enregistrerOrdre(ordre);
                  else setOrdre(null);
                }}
                onPointerCancel={() => {
                  glisse.current = null;
                  setEnMain(null);
                  setOrdre(null);
                }}
                onKeyDown={(e) => {
                  const pas = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
                  if (!pas) return;
                  e.preventDefault();
                  void enregistrerOrdre(deplacer(p.id, i + pas));
                }}
              >
                <GripVertical size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Retirer la photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 flex size-10 items-center justify-center rounded-xl bg-black/60 text-white"
                onClick={async () => {
                  if (!window.confirm("Retirer cette photo de ton site ?")) return;
                  await api(`/v1/ma-page/photos/${p.id}`, { method: "DELETE" }).catch(() => onErreur("La photo n'a pas été retirée. Réessaie."));
                  onChange();
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            <label className="block p-2">
              <span className="sr-only">Légende de la photo {i + 1}</span>
              <input
                defaultValue={p.legende ?? ""}
                maxLength={120}
                placeholder="Légende (facultatif)"
                className="w-full rounded-lg border border-line bg-transparent px-2 py-2 text-[14px]"
                onBlur={async (e) => {
                  const v = e.target.value.trim() || null;
                  if (v === p.legende) return;
                  await api(`/v1/ma-page/photos/${p.id}`, { method: "PATCH", body: { legende: v } }).catch(() => onErreur("La légende n'a pas été enregistrée."));
                  onChange();
                }}
              />
            </label>
          </li>
        ))}
        {Array.from({ length: envoi }, (_, i) => (
          <li key={`envoi-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-line text-[13px] text-muted">
            <Loader2 size={16} className="mr-2 motion-safe:animate-spin" aria-hidden="true" /> Envoi…
          </li>
        ))}
      </ul>
      {actif ? (
        total < max ? (
          <label className="pressable flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 text-[15px] font-bold">
            <ImagePlus size={20} aria-hidden="true" /> {libelle} ({total}/{max})
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void ajouter(e.target.files); e.target.value = ""; }} />
          </label>
        ) : (
          <p className="text-[14px] text-muted">{max} photos au plus : retire une photo pour en ajouter une.</p>
        )
      ) : (
        <p className="text-[14px] text-muted">{stockage ? "Coche la case ci-dessus pour ajouter tes photos." : "L'envoi de photos n'est pas encore ouvert sur ce site."}</p>
      )}
    </div>
  );
}
