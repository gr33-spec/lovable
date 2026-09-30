"use client";

import { Check, Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCategoryAction } from "@/app/admin/actions";

// Choix de la catégorie d'un produit, avec des pastilles à toucher :
// 1) la famille (Boucles d'oreilles, Pampilles…), 2) si on veut, une
// sous-catégorie (Cœurs, Fleurs…), 3) plus rarement, un troisième niveau.
// « + Nouvelle » crée une (sous-)catégorie sur place, sans quitter la fiche.

export interface PickerCategory {
  id: string;
  parentId: string | null;
  name: string;
  depth: number;
  archived: boolean;
  isVisible: boolean;
}

const STEPS = ["Famille", "Sous-catégorie", "Précision"];

function Chip({ selected, onClick, children, muted = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; muted?: boolean }) {
  return (
    <button type="button" className={`chip ${muted && !selected ? "text-text-2" : ""}`} aria-pressed={selected} onClick={onClick}>
      {selected && <Check size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

function QuickAdd({ placeholder, pending, error, onAdd, onCancel }: { placeholder: string; pending: boolean; error: string | null; onAdd: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const submit = () => name.trim() && onAdd(name.trim());
  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          className="input !min-h-10 flex-1"
          aria-label="Nom de la nouvelle catégorie"
          placeholder={placeholder}
          maxLength={80}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") onCancel();
          }}
        />
        <button type="button" className="btn btn-primary btn-sm" disabled={pending || !name.trim()} onClick={submit}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : "Créer"}
        </button>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Annuler" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

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
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>(undefined); // undefined = pas de création en cours ; null = famille
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Chaîne choisie : [famille, sous-catégorie, précision]
  const chain: PickerCategory[] = [];
  for (let cur = categories.find((c) => c.id === value); cur; cur = categories.find((c) => c.id === cur!.parentId)) chain.unshift(cur);
  const childrenOf = (parentId: string | null) => categories.filter((c) => c.parentId === parentId && (!c.archived || chain.some((x) => x.id === c.id)));

  // Étapes affichées : la famille, puis la sous-catégorie une fois la famille choisie,
  // puis la précision seulement si la sous-catégorie choisie en a déjà.
  const steps: { parent: PickerCategory | null; selected?: PickerCategory }[] = [{ parent: null, selected: chain[0] }];
  if (chain[0]) steps.push({ parent: chain[0], selected: chain[1] });
  if (chain[1] && childrenOf(chain[1].id).length > 0) steps.push({ parent: chain[1], selected: chain[2] });

  const create = (parentId: string | null, name: string) =>
    start(async () => {
      const res = await saveCategoryAction({ parentId, name, slug: "", description: "", isVisible: true });
      if (!res.ok) return setCreateError(res.fieldErrors?.name ?? res.error);
      const parent = categories.find((c) => c.id === parentId);
      onCreated({ id: res.id, parentId, name, depth: parent ? parent.depth + 1 : 1, archived: false, isVisible: true });
      onChange(res.id);
      setCreatingIn(undefined);
      setCreateError(null);
    });

  return (
    <fieldset className="space-y-4" aria-describedby={error ? "category-error" : undefined}>
      <legend className="field-label">
        Où ranger cette création ? <span className="text-error">*</span>
      </legend>
      {steps.map(({ parent, selected }, i) => {
        const options = childrenOf(parent?.id ?? null);
        const creatingHere = creatingIn === (parent?.id ?? null);
        return (
          <div key={parent?.id ?? "familles"}>
            <p className="mb-2 text-sm font-medium text-text-2">
              {i + 1}. {STEPS[i]}
              {i > 0 && <span className="font-normal"> de « {parent!.name} » (facultatif)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {i > 0 && (
                <Chip selected={!selected} muted onClick={() => onChange(parent!.id)}>
                  Aucune
                </Chip>
              )}
              {options.map((c) => (
                <Chip key={c.id} selected={selected?.id === c.id} onClick={() => onChange(c.id)}>
                  {c.name}
                  {c.archived ? " (archivée)" : !c.isVisible ? " (masquée)" : ""}
                </Chip>
              ))}
              {creatingHere ? (
                <QuickAdd
                  placeholder={i === 0 ? "Nom de la famille, ex. : Broches" : "Ex. : Cœurs, Fleurs, Étoiles…"}
                  pending={pending}
                  error={createError}
                  onAdd={(name) => create(parent?.id ?? null, name)}
                  onCancel={() => {
                    setCreatingIn(undefined);
                    setCreateError(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="chip border-dashed text-primary"
                  onClick={() => {
                    setCreateError(null);
                    setCreatingIn(parent?.id ?? null);
                  }}
                >
                  <Plus size={14} aria-hidden="true" /> {i === 0 ? "Nouvelle famille" : "Nouvelle"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {chain.length > 0 && (
        <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm">
          Rangée dans : <strong>{chain.map((c) => c.name).join(" › ")}</strong>
        </p>
      )}
      {error && (
        <p id="category-error" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
