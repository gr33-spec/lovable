"use client";

import { Archive, ArrowDown, ArrowUp, CornerDownRight, ExternalLink, Eye, EyeOff, FolderPlus, List, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveCategoryAction, deleteCategoryAction, reorderCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import { useConfirm, useToast } from "./ui";

// Gestion de l'arborescence des catégories, pensée pour le téléphone :
// une ligne par catégorie (indentée selon son niveau), un bouton « + » pour
// ajouter une sous-catégorie, et un menu « … » pour tout le reste.

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
const LEVEL = ["Catégorie", "Sous-catégorie", "Sous-sous-catégorie"];

type Editing = { mode: "new"; parentId: string | null } | { mode: "edit"; id: string } | null;

function Editor({ rows, editing, onDone }: { rows: TreeRow[]; editing: Exclude<Editing, null>; onDone: () => void }) {
  const self = editing.mode === "edit" ? rows.find((r) => r.id === editing.id) : undefined;
  const [name, setName] = useState(self?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(self ? self.parentId : editing.mode === "new" ? editing.parentId : null);
  const [slug, setSlug] = useState(self?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(self));
  const [description, setDescription] = useState(self?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const parent = rows.find((r) => r.id === parentId);
  const shownSlug = slugTouched ? slug : slugify(name).slice(0, 70);
  // Emplacements possibles : pas dans elle-même ni dans ses sous-catégories, et 3 niveaux au plus.
  const parents = rows.filter(
    (r) => !r.archived && r.depth + 1 + (self?.height ?? 0) <= MAX_DEPTH && (!self || (r.id !== self.id && !r.path.startsWith(`${self.path}/`))),
  );

  return (
    <form
      className="space-y-4 rounded-2xl border border-primary/30 bg-surface-2/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCategoryAction({ id: self?.id, parentId, name, slug: slugTouched ? slug : "", description, isVisible: self?.isVisible ?? true });
          if (res.ok) {
            toast(self ? "Catégorie enregistrée." : `« ${name.trim()} » créée.`);
            onDone();
            router.refresh();
          } else setErrors({ ...(res.fieldErrors ?? {}), _form: res.fieldErrors?.name ? "" : res.error });
        });
      }}
    >
      <p className="text-sm font-semibold">{self ? `Modifier « ${self.name} »` : parent ? `Nouvelle sous-catégorie dans « ${parent.name} »` : "Nouvelle catégorie"}</p>
      <label className="block">
        <span className="field-label">Nom</span>
        <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus required placeholder={parent ? "Ex. : Cœurs, Fleurs, Créoles…" : "Ex. : Boucles d'oreilles, Pampilles…"} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className="block">
        <span className="field-label">Rangée dans</span>
        <select className="input" value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || null)}>
          <option value="">— Premier niveau (famille principale)</option>
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
          <span className="shrink-0 truncate py-2 pl-3 text-sm text-text-2" title={`/boutique/${parent ? `${parent.path}/` : ""}`}>
            /boutique/{parent ? `${parent.path}/` : ""}
          </span>
          <input
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
            value={shownSlug}
            maxLength={80}
            aria-label="Fin de l'adresse"
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
          />
        </span>
        <span className="field-hint">Créée automatiquement à partir du nom. Si vous la changez, l&apos;ancienne adresse redirige vers la nouvelle.</span>
        {errors.slug && <span className="field-error">{errors.slug}</span>}
      </label>
      <label className="block">
        <span className="field-label">Courte présentation (facultatif)</span>
        <textarea className="input !min-h-20" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Affichée en haut de la page de la catégorie." />
      </label>
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

export function CategoryTree({ rows }: { rows: TreeRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titre-categories" className="font-serif text-2xl">
          Catégories
        </h2>
        {!(editing?.mode === "new" && editing.parentId === null) && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ mode: "new", parentId: null })}>
            <Plus size={16} aria-hidden="true" /> Ajouter une catégorie
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-text-2">
        Catégorie → sous-catégorie → sous-sous-catégorie (3 niveaux au plus). Les couleurs, motifs, matières ou tailles ne sont pas des catégories : renseignez-les dans la fiche
        produit (« Caractéristiques »), ils deviennent des filtres.
      </p>

      {editing?.mode === "new" && editing.parentId === null && (
        <div className="mb-3">
          <Editor rows={rows} editing={editing} onDone={() => setEditing(null)} />
        </div>
      )}

      {active.length === 0 ? (
        <p className="card p-5 text-text-2">Aucune catégorie : créez-en une pour classer vos créations.</p>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden">
          {active.map((r) => (
            <li key={r.id} className={r.depth === 1 ? "bg-surface" : "bg-surface-2/30"}>
              {editing?.mode === "edit" && editing.id === r.id ? (
                <div className="p-3">
                  <Editor rows={rows} editing={editing} onDone={() => setEditing(null)} />
                </div>
              ) : (
                <div className="flex min-h-14 items-center gap-1.5 py-2 pr-2" style={{ paddingLeft: `${0.75 + (r.depth - 1) * 1.4}rem` }}>
                  {r.depth > 1 && <CornerDownRight size={15} className="shrink-0 text-text-2" aria-hidden="true" />}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setMenuFor(r)} aria-label={`Actions pour ${r.label}`}>
                    <span className={`block truncate ${r.depth === 1 ? "font-semibold" : "font-medium"} ${r.isVisible ? "" : "text-text-2"}`}>{r.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-2">
                      <span>
                        {r.totalCount} création{r.totalCount > 1 ? "s" : ""}
                        {r.childCount > 0 && r.ownCount > 0 && r.ownCount !== r.totalCount ? ` (dont ${r.ownCount} ici)` : ""}
                      </span>
                      {!r.isVisible && <span className="badge bg-soldout-bg py-0 text-soldout">Masquée</span>}
                      {r.isVisible && r.totalCount === 0 && <span title="Une catégorie vide n'apparaît pas dans la boutique">vide · invisible en boutique</span>}
                    </span>
                  </button>
                  {r.depth < MAX_DEPTH && (
                    <button type="button" className="btn btn-ghost btn-icon" title="Ajouter une sous-catégorie" aria-label={`Ajouter une sous-catégorie dans ${r.name}`} onClick={() => setEditing({ mode: "new", parentId: r.id })}>
                      <FolderPlus size={18} />
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Plus d'actions pour ${r.name}`} onClick={() => setMenuFor(r)}>
                    <MoreHorizontal size={19} />
                  </button>
                </div>
              )}
              {editing?.mode === "new" && editing.parentId === r.id && (
                <div className="p-3 pt-0" style={{ paddingLeft: `${0.75 + r.depth * 1.4}rem` }}>
                  <Editor rows={rows} editing={editing} onDone={() => setEditing(null)} />
                </div>
              )}
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
                setEditing({ mode: "edit", id: menuFor.id });
                closeMenu();
              }}
              onSub={() => {
                setEditing({ mode: "new", parentId: menuFor.id });
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
      {item(<Pencil size={18} />, "Renommer, déplacer, modifier l'adresse", onEdit)}
      {row.depth < MAX_DEPTH && item(<FolderPlus size={18} />, "Ajouter une sous-catégorie", onSub)}
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
