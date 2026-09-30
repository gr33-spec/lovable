"use client";

import { Archive, ArrowDown, ArrowUp, ChevronDown, CornerDownRight, ExternalLink, Eye, EyeOff, FolderPlus, List, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveCategoryAction, deleteCategoryAction, reorderCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { useConfirm, useToast } from "./ui";

// Gestion des catégories, pensée pour être évidente :
// une carte par famille (Boucles d'oreilles, Pampilles…) avec ses
// sous-catégories dedans, et un bouton toujours visible pour en ajouter
// (on tape le nom, Entrée, et on peut enchaîner). Le reste est dans « … ».

export interface TreeRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  isVisible: boolean;
  archived: boolean;
  depth: number;
  path: string;
  label: string;
  ownCount: number;
  totalCount: number;
  childCount: number;
  height: number;
}

const MAX_DEPTH = 3;
const LEVEL = ["Famille", "Sous-catégorie", "Précision (3e niveau)"];

/** Ajout rapide : un nom, Entrée, et on peut enchaîner (Cœurs ↵ Fleurs ↵ Étoiles ↵). */
function QuickAdd({ parentId, parentName, existing, onClose }: { parentId: string | null; parentName?: string; existing: string[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  // Le champ se vide dès l'Entrée : on peut taper le nom suivant pendant l'enregistrement.
  // Un même nom déjà en cours d'enregistrement est ignoré (pas de doublon sur double Entrée).
  const inFlight = useRef(new Set<string>());
  const [saving, setSaving] = useState(0);
  const [, startRefresh] = useTransition();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const submit = async () => {
    const value = name.trim();
    if (!value || inFlight.current.has(value.toLowerCase())) return;
    if ([...existing, ...added].some((n) => n.toLowerCase() === value.toLowerCase())) {
      setError(`« ${value} » existe déjà ${parentName ? `dans « ${parentName} »` : "comme famille"}.`);
      return;
    }
    inFlight.current.add(value.toLowerCase());
    setName("");
    setSaving((n) => n + 1);
    const res = await saveCategoryAction({ parentId, name: value, slug: "", description: "", isVisible: true });
    setSaving((n) => n - 1);
    inFlight.current.delete(value.toLowerCase());
    if (!res.ok) {
      setError(res.fieldErrors?.name ?? res.error);
      setName((current) => current || value);
      return;
    }
    setAdded((list) => [...list, value]);
    setError(null);
    startRefresh(() => router.refresh());
    input.current?.focus();
  };
  const pending = saving > 0;
  return (
    <form
      className="rounded-2xl border border-primary/40 bg-primary-soft/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="block">
        <span className="field-label">{parentName ? `Nouvelle sous-catégorie dans « ${parentName} »` : "Nouvelle famille"}</span>
        <span className="flex gap-2">
          <input
            ref={input}
            className="input flex-1"
            value={name}
            maxLength={80}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder={parentName ? "Ex. : Cœurs, Fleurs, Étoiles…" : "Ex. : Pampilles, Broches, Bracelets…"}
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} Ajouter
          </button>
        </span>
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-text-2">
          {added.length > 0 ? (
            <>
              Ajoutée{added.length > 1 ? "s" : ""} : <strong className="text-text">{added.join(", ")}</strong>. Vous pouvez en taper une autre.
            </>
          ) : (
            "Tapez le nom puis Entrée. Vous pourrez en ajouter plusieurs à la suite."
          )}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {added.length ? "Terminé" : "Annuler"}
        </button>
      </div>
    </form>
  );
}

/** Modifier une catégorie existante : le nom d'abord, le reste replié. */
function Editor({ rows, id, onDone }: { rows: TreeRow[]; id: string; onDone: () => void }) {
  const self = rows.find((r) => r.id === id)!;
  const [name, setName] = useState(self.name);
  const [parentId, setParentId] = useState<string | null>(self.parentId);
  const [slug, setSlug] = useState(self.slug);
  const [description, setDescription] = useState(self.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const parent = rows.find((r) => r.id === parentId);
  // Emplacements possibles : pas dans elle-même ni dans ses sous-catégories, et 3 niveaux au plus.
  const parents = rows.filter((r) => !r.archived && r.depth + 1 + self.height <= MAX_DEPTH && r.id !== self.id && !r.path.startsWith(`${self.path}/`));

  return (
    <form
      className="space-y-4 rounded-2xl border border-primary/40 bg-surface-2/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCategoryAction({ id: self.id, parentId, name, slug, description, isVisible: self.isVisible });
          if (res.ok) {
            toast("Catégorie enregistrée.");
            onDone();
            router.refresh();
          } else setErrors({ ...(res.fieldErrors ?? {}), _form: res.fieldErrors?.name ? "" : res.error });
        });
      }}
    >
      <label className="block">
        <span className="field-label">Nom</span>
        <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus required />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <details className="group" open={Boolean(errors.parentId || errors.slug)}>
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary">
          <ChevronDown size={16} className="transition group-open:rotate-180" aria-hidden="true" /> Plus d&apos;options (déplacer, adresse, présentation)
        </summary>
        <div className="mt-3 space-y-4">
          <label className="block">
            <span className="field-label">Rangée dans</span>
            <select className="input" value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || null)}>
              <option value="">— Aucune : c&apos;est une famille principale</option>
              {parents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.parentId && <span className="field-error">{errors.parentId}</span>}
          </label>
          <label className="block">
            <span className="field-label">Adresse de la page</span>
            <span className="flex items-center overflow-hidden rounded-xl border border-border bg-surface focus-within:border-primary">
              <span className="shrink-0 truncate py-2 pl-3 text-sm text-text-2">/boutique/{parent ? `${parent.path}/` : ""}</span>
              <input
                className="min-h-11 min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                value={slug}
                maxLength={80}
                aria-label="Fin de l'adresse"
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              />
            </span>
            <span className="field-hint">Changer le nom ne change pas l&apos;adresse (les liens déjà partagés restent bons). Si vous changez l&apos;adresse, l&apos;ancienne redirige vers la nouvelle.</span>
            {errors.slug && <span className="field-error">{errors.slug}</span>}
          </label>
          <label className="block">
            <span className="field-label">Courte présentation (facultatif)</span>
            <textarea className="input !min-h-20" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Affichée en haut de la page de la catégorie." />
          </label>
        </div>
      </details>
      {errors._form && <p className="field-error">{errors._form}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !name.trim()}>
          {pending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Enregistrer
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

type Adding = { parentId: string | null } | null;

export function CategoryTree({ rows }: { rows: TreeRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<Adding>(null);
  const [menuFor, setMenuFor] = useState<TreeRow | null>(null);
  const [deleting, setDeleting] = useState<{ row: TreeRow; count: number } | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const menu = useRef<HTMLDialogElement>(null);
  const del = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (menuFor) menu.current?.showModal();
  }, [menuFor]);
  useEffect(() => {
    if (deleting) del.current?.showModal();
  }, [deleting]);

  const active = rows.filter((r) => !r.archived);
  const archivedRoots = rows.filter((r) => r.archived && !rows.find((p) => p.id === r.parentId)?.archived);
  const siblings = (r: TreeRow) => active.filter((x) => x.parentId === r.parentId);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, message: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(message);
        after?.();
        router.refresh();
      } else toast(res.error ?? "L'opération n'a pas pu être faite.", "error");
    });

  const closeMenu = () => {
    menu.current?.close();
    setMenuFor(null);
  };

  const archive = async (r: TreeRow) => {
    closeMenu();
    const ok = await confirm({
      title: `Archiver « ${r.name} » ?`,
      message:
        r.totalCount > 0
          ? `Ses ${r.totalCount} création(s)${r.childCount ? " et ses sous-catégories" : ""} ne seront plus visibles dans la boutique (elles restent dans l'administration). Vous pourrez la restaurer à tout moment.`
          : "Elle disparaîtra de la boutique et des listes. Vous pourrez la restaurer à tout moment.",
      confirmLabel: "Archiver",
    });
    if (ok) run(() => archiveCategoryAction(r.id, true), "Catégorie archivée.");
  };

  const askDelete = async (r: TreeRow) => {
    closeMenu();
    if (r.childCount > 0 || r.ownCount > 0) {
      setMoveTo("");
      setDeleting({ row: r, count: r.ownCount });
      return;
    }
    const ok = await confirm({ title: `Supprimer « ${r.name} » ?`, message: "Cette catégorie est vide. Elle sera supprimée définitivement.", confirmLabel: "Supprimer", danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteCategoryAction(r.id, null);
      if (res.ok) {
        toast("Catégorie supprimée.");
        router.refresh();
      } else if ("code" in res && res.code === "has_products") {
        // Produits archivés encore rangés ici : proposer de les déplacer.
        setMoveTo("");
        setDeleting({ row: r, count: res.count ?? 0 });
      } else toast(res.error, "error");
    });
  };

  const closeDelete = () => {
    del.current?.close();
    setDeleting(null);
  };

  return (
    <section aria-labelledby="titre-categories">
      <h2 id="titre-categories" className="mb-2 font-serif text-2xl">
        Catégories
      </h2>
      <div className="mb-5 rounded-2xl bg-surface-2 p-4 text-sm">
        <p className="font-semibold">Comment ça marche ?</p>
        <p className="mt-1 text-text-2">
          Une <strong className="text-text">famille</strong> (ex. : Pampilles) contient des <strong className="text-text">sous-catégories</strong> (ex. : Cœurs, Fleurs, Étoiles). Les
          clientes choisissent la famille, puis la sous-catégorie. Les couleurs, motifs ou matières ne sont pas des catégories : indiquez-les dans la fiche de chaque création.
        </p>
      </div>

      <div className="mb-5">
        {adding?.parentId === null ? (
          <QuickAdd parentId={null} existing={active.filter((x) => x.parentId === null).map((x) => x.name)} onClose={() => setAdding(null)} />
        ) : (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setAdding({ parentId: null })}>
            <Plus size={18} aria-hidden="true" /> Nouvelle famille
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <p className="card p-5 text-text-2">Aucune catégorie pour l&apos;instant. Commencez par créer une famille, par exemple « Boucles d&apos;oreilles ».</p>
      ) : (
        <ul className="space-y-4">
          {active
            .filter((r) => r.depth === 1)
            .map((root) => (
              <li key={root.id} className="card overflow-hidden">
                {editing === root.id ? (
                  <div className="p-3">
                    <Editor rows={rows} id={root.id} onDone={() => setEditing(null)} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border-b border-border bg-surface-2/40 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-serif text-xl ${root.isVisible ? "" : "text-text-2"}`}>{root.name}</p>
                      <RowInfo row={root} />
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(root.id)}>
                      <Pencil size={15} aria-hidden="true" /> <span className="max-sm:sr-only">Modifier</span>
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label={`Plus d'actions pour ${root.name}`} onClick={() => setMenuFor(root)}>
                      <MoreHorizontal size={19} />
                    </button>
                  </div>
                )}

                {active.filter((c) => c.parentId === root.id).length > 0 && (
                  <ul className="divide-y divide-border">
                    {active
                      .filter((c) => c.parentId === root.id)
                      .flatMap((child) => [child, ...active.filter((g) => g.parentId === child.id)])
                      .map((r) => (
                        <li key={r.id}>
                          {editing === r.id ? (
                            <div className="p-3">
                              <Editor rows={rows} id={r.id} onDone={() => setEditing(null)} />
                            </div>
                          ) : (
                            <div className={`flex min-h-14 items-center gap-2 py-2 pr-2 ${r.depth === 3 ? "pl-10" : "pl-4"}`}>
                              {r.depth === 3 && <CornerDownRight size={15} className="shrink-0 text-text-2" aria-hidden="true" />}
                              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(r.id)} aria-label={`Modifier ${r.label}`}>
                                <span className={`block truncate font-medium ${r.isVisible ? "" : "text-text-2"}`}>{r.name}</span>
                                <RowInfo row={r} />
                              </button>
                              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Plus d'actions pour ${r.name}`} onClick={() => setMenuFor(r)}>
                                <MoreHorizontal size={19} />
                              </button>
                            </div>
                          )}
                          {adding?.parentId === r.id && (
                            <div className="px-3 pb-3 pl-10">
                              <QuickAdd parentId={r.id} parentName={r.name} existing={active.filter((x) => x.parentId === r.id).map((x) => x.name)} onClose={() => setAdding(null)} />
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                )}

                <div className="p-3">
                  {adding?.parentId === root.id ? (
                    <QuickAdd parentId={root.id} parentName={root.name} existing={active.filter((x) => x.parentId === root.id).map((x) => x.name)} onClose={() => setAdding(null)} />
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost w-full justify-start border border-dashed border-border-strong text-primary"
                      aria-label={`Ajouter une sous-catégorie à « ${root.name} »`}
                      onClick={() => setAdding({ parentId: root.id })}
                    >
                      <Plus size={17} aria-hidden="true" /> Ajouter une sous-catégorie
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}

      {archivedRoots.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-text-2">Catégories archivées ({archivedRoots.length})</summary>
          <ul className="card mt-3 divide-y divide-border">
            {archivedRoots.map((r) => (
              <li key={r.id} className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-2">{r.label}</p>
                  <p className="text-xs text-text-2">
                    {r.totalCount} création{r.totalCount > 1 ? "s" : ""} · invisible en boutique
                  </p>
                </div>
                <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => archiveCategoryAction(r.id, false), "Catégorie restaurée.")}>
                  <RotateCcw size={15} aria-hidden="true" /> Restaurer
                </button>
                <button type="button" className="btn btn-ghost btn-icon text-error" aria-label={`Supprimer ${r.name}`} disabled={pending} onClick={() => askDelete(r)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Menu d'actions d'une catégorie */}
      <dialog ref={menu} aria-label={menuFor ? `Actions : ${menuFor.name}` : "Actions"} className="mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-surface p-0 text-text sm:m-auto sm:max-w-sm sm:rounded-3xl" onClose={() => setMenuFor(null)} onClick={(e) => e.target === menu.current && closeMenu()}>
        {menuFor && (
          <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-2 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs text-text-2">{LEVEL[menuFor.depth - 1]}</p>
                <p className="truncate font-serif text-xl">{menuFor.label}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fermer" onClick={closeMenu}>
                <X size={20} />
              </button>
            </div>
            <MenuItems
              row={menuFor}
              index={siblings(menuFor).findIndex((x) => x.id === menuFor.id)}
              count={siblings(menuFor).length}
              pending={pending}
              onEdit={() => {
                setEditing(menuFor.id);
                closeMenu();
              }}
              onSub={() => {
                setAdding({ parentId: menuFor.id });
                closeMenu();
              }}
              onMove={(direction) => run(() => reorderCategoryAction(menuFor.id, direction), "Ordre modifié.")}
              onToggle={() =>
                run(
                  () => saveCategoryAction({ id: menuFor.id, parentId: menuFor.parentId, name: menuFor.name, slug: menuFor.slug, description: menuFor.description, isVisible: !menuFor.isVisible }),
                  menuFor.isVisible ? "Masquée : elle n'apparaît plus dans la boutique." : "Visible dans la boutique.",
                  closeMenu,
                )
              }
              onArchive={() => archive(menuFor)}
              onDelete={() => askDelete(menuFor)}
            />
          </div>
        )}
      </dialog>

      {/* Suppression sans risque : déplacer les produits, archiver, ou annuler */}
      <dialog ref={del} aria-labelledby="titre-suppression" className="m-auto w-[min(92vw,460px)] rounded-3xl bg-surface p-0 text-text shadow-lift" onClose={() => setDeleting(null)}>
        {deleting && (
          <div className="p-6">
            <h2 id="titre-suppression" className="font-sans text-lg font-semibold">
              Supprimer « {deleting.row.name} » ?
            </h2>
            {deleting.row.childCount > 0 ? (
              <>
                <p className="mt-2 text-sm text-text-2">
                  Elle contient {deleting.row.childCount} sous-catégorie{deleting.row.childCount > 1 ? "s" : ""}. Déplacez ou supprimez-les d&apos;abord — ou archivez simplement la catégorie : elle disparaît de la boutique
                  sans rien perdre.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={pending}
                    onClick={() => {
                      const r = deleting.row;
                      closeDelete();
                      run(() => archiveCategoryAction(r.id, true), "Catégorie archivée.");
                    }}
                  >
                    <Archive size={16} aria-hidden="true" /> Archiver la catégorie
                  </button>
                  <button type="button" className="btn btn-outline" onClick={closeDelete} autoFocus>
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-text-2">
                  Elle contient {deleting.count} création{deleting.count > 1 ? "s" : ""}. Rien n&apos;est supprimé brutalement : choisissez où les ranger, ou archivez la catégorie.
                </p>
                <label className="mt-4 block">
                  <span className="field-label">Déplacer les créations vers</span>
                  <select className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                    <option value="">Choisir une catégorie…</option>
                    {active
                      .filter((r) => r.id !== deleting.row.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={!moveTo || pending}
                    onClick={() => {
                      const r = deleting.row;
                      const target = moveTo;
                      closeDelete();
                      run(() => deleteCategoryAction(r.id, target), "Créations déplacées, catégorie supprimée.");
                    }}
                  >
                    Déplacer puis supprimer
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={pending || deleting.row.archived}
                    onClick={() => {
                      const r = deleting.row;
                      closeDelete();
                      run(() => archiveCategoryAction(r.id, true), "Catégorie archivée.");
                    }}
                  >
                    <Archive size={16} aria-hidden="true" /> Archiver plutôt
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={closeDelete} autoFocus>
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}

function MenuItems({
  row,
  index,
  count,
  pending,
  onEdit,
  onSub,
  onMove,
  onToggle,
  onArchive,
  onDelete,
}: {
  row: TreeRow;
  index: number;
  count: number;
  pending: boolean;
  onEdit: () => void;
  onSub: () => void;
  onMove: (direction: "up" | "down") => void;
  onToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const item = (icon: React.ReactNode, label: string, onClick: () => void, options: { disabled?: boolean; danger?: boolean } = {}) => (
    <li>
      <button
        type="button"
        disabled={options.disabled || pending}
        onClick={onClick}
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-surface-2 disabled:opacity-40 ${options.danger ? "text-error" : ""}`}
      >
        {icon} {label}
      </button>
    </li>
  );
  return (
    <ul className="p-2">
      {item(<Pencil size={18} />, "Renommer ou déplacer", onEdit)}
      {row.depth < MAX_DEPTH && item(<FolderPlus size={18} />, row.depth === 1 ? "Ajouter une sous-catégorie" : "Ajouter une précision (3e niveau)", onSub)}
      {item(<ArrowUp size={18} />, "Monter", () => onMove("up"), { disabled: index <= 0 })}
      {item(<ArrowDown size={18} />, "Descendre", () => onMove("down"), { disabled: index < 0 || index >= count - 1 })}
      {item(row.isVisible ? <EyeOff size={18} /> : <Eye size={18} />, row.isVisible ? "Masquer de la boutique" : "Afficher dans la boutique", onToggle)}
      <li>
        <Link href={`/admin/produits?categorie=${row.id}`} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] no-underline hover:bg-surface-2">
          <List size={18} /> Voir ses créations ({row.totalCount})
        </Link>
      </li>
      {row.isVisible && row.totalCount > 0 && (
        <li>
          <a href={`/boutique/${row.path}`} target="_blank" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] no-underline hover:bg-surface-2">
            <ExternalLink size={18} /> Voir dans la boutique
          </a>
        </li>
      )}
      {item(<Archive size={18} />, "Archiver", onArchive)}
      {item(<Trash2 size={18} />, "Supprimer…", onDelete, { danger: true })}
    </ul>
  );
}

function RowInfo({ row }: { row: TreeRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-2">
      <span>
        {row.totalCount} création{row.totalCount > 1 ? "s" : ""}
        {row.childCount > 0 && row.ownCount > 0 && row.ownCount !== row.totalCount ? ` (dont ${row.ownCount} rangée${row.ownCount > 1 ? "s" : ""} directement ici)` : ""}
      </span>
      {!row.isVisible && <span className="badge bg-soldout-bg py-0 text-soldout">Masquée</span>}
      {row.isVisible && row.totalCount === 0 && <span>vide · pas encore visible en boutique</span>}
    </span>
  );
}
