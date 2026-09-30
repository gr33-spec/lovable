"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

const SORT_LABELS: Record<string, string> = {
  selection: "Sélection",
  nouveautes: "Nouveautés",
  "prix-croissant": "Prix croissant",
  "prix-decroissant": "Prix décroissant",
};

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="relative">
      <span className="sr-only">Trier par</span>
      <select
        className="input !min-h-10 !rounded-full !py-1.5 !pr-9 !pl-4 text-sm font-medium"
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          sp.delete("page");
          if (e.target.value === "selection") sp.delete("tri");
          else sp.set("tri", e.target.value);
          router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
        }}
      >
        {Object.entries(SORT_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface Options {
  colors: { id: string; label: string; hex: string }[];
  collections: { slug: string; name: string }[];
  attributes: { key: string; label: string; values: { key: string; label: string }[] }[];
  hasSoldOut: boolean;
  priceRange: boolean;
}

export function FilterSheet({
  base,
  options,
  current,
}: {
  base: string;
  options: Options;
  current: { dispo?: boolean; couleur?: string; collection?: string; attributes: Record<string, string>; min?: number; max?: number };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  const [dispo, setDispo] = useState(Boolean(current.dispo));
  const [couleur, setCouleur] = useState(current.couleur ?? "");
  const [collection, setCollection] = useState(current.collection ?? "");
  const [attributes, setAttributes] = useState<Record<string, string>>(current.attributes);
  const [min, setMin] = useState(current.min !== undefined ? String(current.min / 100) : "");
  const [max, setMax] = useState(current.max !== undefined ? String(current.max / 100) : "");
  const count = [current.dispo, current.couleur, current.collection, current.min ?? current.max].filter((v) => v !== undefined && v !== false).length + Object.keys(current.attributes).length;

  const apply = () => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("page");
    const set = (k: string, v: string) => (v ? sp.set(k, v) : sp.delete(k));
    set("dispo", dispo ? "1" : "");
    set("couleur", couleur);
    set("collection", collection);
    for (const a of options.attributes) set(a.key, attributes[a.key] ?? "");
    set("prix-min", /^\d+$/.test(min) ? min : "");
    set("prix-max", /^\d+$/.test(max) ? max : "");
    ref.current?.close();
    router.push(`${base}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  return (
    <>
      <button type="button" className="chip" onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        <SlidersHorizontal size={16} aria-hidden="true" /> Filtrer{count ? ` (${count})` : ""}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="titre-filtres"
        className="mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-surface p-0 text-text shadow-lift sm:m-auto sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 id="titre-filtres" className="font-serif text-2xl">
              Filtrer
            </h2>
            <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fermer" onClick={() => ref.current?.close()}>
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
            {options.hasSoldOut && (
              <label className="flex min-h-11 items-center justify-between gap-3">
                <span className="font-medium">Uniquement les pièces disponibles</span>
                <input type="checkbox" className="h-6 w-6 accent-[var(--c-primary)]" checked={dispo} onChange={(e) => setDispo(e.target.checked)} />
              </label>
            )}
            {options.attributes.map((a) => (
              <fieldset key={a.key}>
                <legend className="mb-3 font-semibold">{a.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {a.values.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="chip"
                      aria-pressed={attributes[a.key] === v.key}
                      onClick={() => setAttributes((prev) => ({ ...prev, [a.key]: prev[a.key] === v.key ? "" : v.key }))}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {options.collections.length > 0 && (
              <fieldset>
                <legend className="mb-3 font-semibold">Collection</legend>
                <div className="flex flex-wrap gap-2">
                  {[{ slug: "", name: "Toutes" }, ...options.collections].map((c) => (
                    <button key={c.slug} type="button" className="chip" aria-pressed={collection === c.slug} onClick={() => setCollection(c.slug)}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {options.colors.length > 1 && (
              <fieldset>
                <legend className="mb-3 font-semibold">Couleur</legend>
                <div className="flex flex-wrap gap-2">
                  {options.colors.map((c) => (
                    <button key={c.id} type="button" className="chip" aria-pressed={couleur === c.id} onClick={() => setCouleur(couleur === c.id ? "" : c.id)}>
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ background: c.hex === "conic" ? "conic-gradient(#e3a2b0, #e8c547, #5e8b5a, #3f6fb0, #8565a8, #e3a2b0)" : c.hex }}
                        aria-hidden="true"
                      />
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {options.priceRange && (
              <fieldset>
                <legend className="mb-3 font-semibold">Prix (€)</legend>
                <div className="flex items-center gap-3">
                  <label className="flex-1">
                    <span className="field-hint mb-1 block">Minimum</span>
                    <input className="input" inputMode="numeric" pattern="[0-9]*" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                  </label>
                  <span className="mt-6" aria-hidden="true">
                    –
                  </span>
                  <label className="flex-1">
                    <span className="field-hint mb-1 block">Maximum</span>
                    <input className="input" inputMode="numeric" pattern="[0-9]*" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                  </label>
                </div>
              </fieldset>
            )}
          </div>
          <div className="flex gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={() => {
                setDispo(false);
                setCouleur("");
                setCollection("");
                setAttributes({});
                setMin("");
                setMax("");
              }}
            >
              Effacer
            </button>
            <button type="button" className="btn btn-primary flex-[2]" onClick={apply}>
              Voir les créations
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
