"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCategoryAction } from "@/app/admin/actions";

// Choix de la catégorie d'un produit, niveau par niveau :
// Catégorie → Sous-catégorie → Sous-sous-catégorie (seulement si elles existent).
// Une nouvelle (sous-)catégorie se crée sur place, sans quitter la fiche.

export interface PickerCategory {
  id: string;
  parentId: string | null;
  name: string;
  depth: number;
  archived: boolean;
  isVisible: boolean;
}

const LABELS = ["Catégorie", "Sous-catégorie", "Sous-sous-catégorie"];

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreated,
  error,
}: {
  categories: PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (c: PickerCategory) => void;
  error?: string;
}) {
  const [creating, setCreating] = useState<{ parentId: string | null; name: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Chaîne sélectionnée : [catégorie, sous-catégorie, …]
  const chain: PickerCategory[] = [];
  for (let cur = categories.find((c) => c.id === value); cur; cur = categories.find((c) => c.id === cur!.parentId)) chain.unshift(cur);
  const optionsFor = (parentId: string | null, selected?: PickerCategory) =>
    categories.filter((c) => c.parentId === parentId && (!c.archived || c.id === selected?.id));

  // Niveaux à afficher : le premier, puis un par niveau choisi qui a des sous-catégories.
  const levels: { parentId: string | null; selected?: PickerCategory }[] = [{ parentId: null, selected: chain[0] }];
  for (let i = 0; i < chain.length && i < 2; i++) {
    if (optionsFor(chain[i].id).length > 0) levels.push({ parentId: chain[i].id, selected: chain[i + 1] });
  }
  const deepest = chain.at(-1);

  const create = () => {
    if (!creating?.name.trim()) return;
    const { parentId, name } = creating;
    start(async () => {
      const res = await saveCategoryAction({ parentId, name: name.trim(), slug: "", description: "", isVisible: true });
      if (!res.ok) return setCreateError(res.fieldErrors?.name ?? res.error);
      const parent = categories.find((c) => c.id === parentId);
      onCreated({ id: res.id, parentId, name: name.trim(), depth: parent ? parent.depth + 1 : 1, archived: false, isVisible: true });
      onChange(res.id);
      setCreating(null);
      setCreateError(null);
    });
  };

  return (
    <div className="space-y-3">
      {levels.map((level, i) => {
        const opts = optionsFor(level.parentId, level.selected);
        const parent = categories.find((c) => c.id === level.parentId);
        return (
          <div key={level.parentId ?? "racine"}>
            <label htmlFor={`field-category-${i}`} className="field-label">
              {LABELS[i]} {i === 0 ? <span className="text-error">*</span> : <span className="font-normal text-text-2">(facultatif)</span>}
            </label>
            <select
              id={`field-category-${i}`}
              className="input"
              value={level.selected?.id ?? ""}
              aria-invalid={i === 0 && error ? true : undefined}
              onChange={(e) => onChange(e.target.value || (parent?.id ?? ""))}
            >
              <option value="">{i === 0 ? "Choisir…" : `— Aucune (directement dans « ${parent?.name} »)`}</option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived ? " (archivée)" : !c.isVisible ? " (masquée)" : ""}
                </option>
              ))}
            </select>
            {i === 0 && error && <p className="field-error">{error}</p>}
          </div>
        );
      })}

      {creating ? (
        <div>
          <p className="mb-1.5 text-sm font-medium">
            {creating.parentId ? `Nouvelle sous-catégorie dans « ${categories.find((c) => c.id === creating.parentId)?.name} »` : "Nouvelle catégorie principale"}
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              aria-label="Nom"
              placeholder={creating.parentId ? "Ex. : Cœurs" : "Ex. : Broches"}
              maxLength={80}
              value={creating.name}
              autoFocus
              onChange={(e) => setCreating({ ...creating, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
                if (e.key === "Escape") setCreating(null);
              }}
            />
            <button type="button" className="btn btn-primary" disabled={pending || !creating.name.trim()} onClick={create}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : "Créer"}
            </button>
            <button type="button" className="btn btn-outline btn-icon" aria-label="Annuler" onClick={() => setCreating(null)}>
              <X size={16} />
            </button>
          </div>
          {createError && <p className="field-error">{createError}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {deepest && deepest.depth < 3 && !deepest.archived && (
            <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setCreating({ parentId: deepest.id, name: "" })}>
              <Plus size={15} /> Sous-catégorie dans « {deepest.name} »
            </button>
          )}
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setCreating({ parentId: null, name: "" })}>
            <Plus size={15} /> Nouvelle catégorie principale
          </button>
        </div>
      )}
    </div>
  );
}
