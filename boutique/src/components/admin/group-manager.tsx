"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGroupAction, moveGroupAction, saveGroupAction } from "@/app/admin/actions";
import { useConfirm, useToast } from "./ui";

interface Row {
  id: string;
  name: string;
  slug: string;
  description: string;
  isVisible: boolean;
  count: number;
}

function Editor({ table, row, onDone }: { table: "category" | "collection"; row?: Row; onDone: () => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <form
      className="space-y-3 rounded-2xl bg-surface-2/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveGroupAction(table, { id: row?.id, name, slug: row?.slug ?? "", description, isVisible: row?.isVisible ?? true });
          if (res.ok) {
            toast("Enregistré.");
            onDone();
            router.refresh();
          } else setError(res.fieldErrors?.name ?? res.error);
        });
      }}
    >
      <label className="block">
        <span className="field-label">Nom</span>
        <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus required />
      </label>
      <label className="block">
        <span className="field-label">Courte présentation (facultatif)</span>
        <textarea className="input !min-h-20" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export function GroupManager({ table, title, rows }: { table: "category" | "collection"; title: string; rows: Row[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, message?: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (message) toast(message);
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });

  return (
    <section aria-labelledby={`titre-${table}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`titre-${table}`} className="font-serif text-2xl">
          {title}
        </h2>
        {editing !== "new" && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden="true" /> Ajouter
          </button>
        )}
      </div>
      {editing === "new" && (
        <div className="mb-3">
          <Editor table={table} onDone={() => setEditing(null)} />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="card p-5 text-text-2">{table === "category" ? "Aucune catégorie : créez-en une pour classer vos créations." : "Aucune collection pour l'instant."}</p>
      ) : (
        <ul className="card divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.id} className="p-3 sm:p-4">
              {editing === r.id ? (
                <Editor table={table} row={r} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${r.isVisible ? "" : "text-text-2 line-through"}`}>{r.name}</p>
                    <p className="text-sm text-text-2">
                      {r.count} produit{r.count > 1 ? "s" : ""}
                      {!r.isVisible && " · masquée"}
                    </p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Monter ${r.name}`} disabled={i === 0 || pending} onClick={() => act(() => moveGroupAction(table, r.id, "up"))}>
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Descendre ${r.name}`} disabled={i === rows.length - 1 || pending} onClick={() => act(() => moveGroupAction(table, r.id, "down"))}>
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={r.isVisible ? `Masquer ${r.name}` : `Afficher ${r.name}`}
                    title={r.isVisible ? "Masquer de la boutique" : "Afficher dans la boutique"}
                    disabled={pending}
                    onClick={() => act(() => saveGroupAction(table, { id: r.id, name: r.name, slug: r.slug, description: r.description, isVisible: !r.isVisible }), r.isVisible ? "Masquée." : "Visible.")}
                  >
                    {r.isVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Modifier ${r.name}`} onClick={() => setEditing(r.id)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-error"
                    aria-label={`Supprimer ${r.name}`}
                    disabled={pending}
                    onClick={async () => {
                      if (await confirm({ title: `Supprimer « ${r.name} » ?`, message: table === "collection" && r.count ? "Les produits resteront en ligne, simplement sans collection." : undefined, confirmLabel: "Supprimer", danger: true }))
                        act(() => deleteGroupAction(table, r.id), "Supprimée.");
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
