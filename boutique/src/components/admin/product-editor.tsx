"use client";

import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, Loader2, Minus, Plus, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { deleteProductAction, saveGroupAction, saveProductAction } from "@/app/admin/actions";
import { formatPrice, slugify } from "@/lib/format";
import { imageSrc, type ImageRef } from "@/lib/image-ref";
import { parseEuros, PRODUCT_COLORS } from "@/lib/validation";
import { Notice, ProductStatusBadge, useConfirm, useToast, useUnsavedGuard } from "./ui";
import { uploadImageFile } from "./upload";

export interface EditorProduct {
  id: string;
  version: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  collectionId: string | null;
  priceCents: number | null;
  compareAtCents: number | null;
  stock: number;
  status: "draft" | "published" | "archived";
  colors: string[];
  tags: string[];
  features: { label: string; value: string }[];
  seoTitle: string;
  seoDescription: string;
  images: ImageRef[];
  orderCount: number;
}

type Uploading = { key: string; name: string; error?: string };

const euros = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, ""));

export function ProductEditor({
  initial,
  isNew,
  categories: initialCategories,
  collections,
}: {
  initial: EditorProduct;
  isNew: boolean;
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [saved, setSaved] = useState(initial);
  const [p, setP] = useState(initial);
  const [price, setPrice] = useState(euros(initial.priceCents));
  const [compareAt, setCompareAt] = useState(euros(initial.compareAtCents));
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [creatingCategory, startCreatingCategory] = useTransition();

  function createCategory() {
    const name = (newCategory ?? "").trim();
    if (!name) return;
    startCreatingCategory(async () => {
      const res = await saveGroupAction("category", { name, slug: "", description: "", isVisible: true });
      if (!res.ok) {
        setErrors((e) => ({ ...e, categoryId: res.fieldErrors?.name ?? res.error }));
        return;
      }
      setCategories((list) => [...list, { id: res.id, name }]);
      update("categoryId", res.id);
      setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== "categoryId")));
      setNewCategory(null);
      toast(`Catégorie « ${name} » créée.`);
    });
  }
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const originalStock = useRef(initial.stock);

  const dirty = useMemo(
    () =>
      JSON.stringify({ ...p, priceCents: parseEuros(price), compareAtCents: compareAt ? parseEuros(compareAt) : null, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }) !==
      JSON.stringify(saved),
    [p, price, compareAt, tags, saved],
  );
  useUnsavedGuard(dirty || uploads.some((u) => !u.error));

  const update = <K extends keyof EditorProduct>(key: K, value: EditorProduct[K]) => {
    setP((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].slice(0, Math.max(0, 12 - p.images.length));
    if (!list.length) {
      toast("12 photos maximum par produit.", "error");
      return;
    }
    const entries = list.map((f) => ({ key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, file: f }));
    setUploads((u) => [...u, ...entries.map(({ key, name }) => ({ key, name }))]);
    // Envoi 2 par 2 : rapide sans saturer une connexion mobile.
    const queue = [...entries];
    const worker = async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        try {
          const image = await uploadImageFile(e.file, "product");
          setP((prev) => ({ ...prev, images: [...prev.images, image].slice(0, 12) }));
          setUploads((u) => u.filter((x) => x.key !== e.key));
        } catch (err) {
          setUploads((u) => u.map((x) => (x.key === e.key ? { ...x, error: err instanceof Error ? err.message : "Échec de l'envoi" } : x)));
        }
      }
    };
    await Promise.all([worker(), worker()]);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= p.images.length) return;
    const next = [...p.images];
    const [img] = next.splice(from, 1);
    next.splice(to, 0, img);
    update("images", next);
  };

  const submit = (status: EditorProduct["status"]) => {
    setFormError(null);
    const priceCents = parseEuros(price);
    const compareCents = compareAt.trim() ? parseEuros(compareAt) : null;
    const errs: Record<string, string> = {};
    if (!p.name.trim()) errs.name = "Donnez un nom à votre création";
    if (!priceCents || priceCents <= 0) errs.priceCents = "Indiquez un prix (exemple : 24 ou 24,50)";
    if (!p.categoryId) errs.categoryId = "Choisissez une catégorie";
    if (compareAt.trim() && (!compareCents || (priceCents && compareCents <= priceCents))) errs.compareAtCents = "Le prix barré doit être supérieur au prix de vente";
    if (uploads.some((u) => !u.error)) errs.images = "Patientez : des photos sont encore en cours d'envoi";
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`field-${first}`)?.focus();
      return;
    }
    const payload = {
      id: p.id,
      version: saved.version,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      categoryId: p.categoryId,
      collectionId: p.collectionId,
      priceCents: priceCents!,
      compareAtCents: compareCents,
      stock: p.stock,
      originalStock: originalStock.current,
      status,
      colors: p.colors,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      features: p.features.filter((f) => f.label.trim() && f.value.trim()),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      imageIds: p.images.map((i) => i.id),
      imageAlts: Object.fromEntries(p.images.map((i) => [i.id, i.alt])),
    };
    start(async () => {
      const res = await saveProductAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        if ("currentStock" in res && typeof res.currentStock === "number") {
          originalStock.current = res.currentStock;
          update("stock", res.currentStock);
        }
        return;
      }
      const next = { ...p, status, slug: res.slug, version: res.version, priceCents: priceCents!, compareAtCents: compareCents, tags: payload.tags, features: payload.features };
      setSaved(next);
      setP(next);
      originalStock.current = p.stock;
      toast(res.notice ?? (status === "published" ? (saved.status === "published" ? "Modifications enregistrées et en ligne." : "Publié : la création est en ligne !") : status === "archived" ? "Produit archivé." : "Brouillon enregistré."));
      if (isNew) router.replace(`/admin/produits/${p.id}`);
      else router.refresh();
    });
  };

  const remove = async () => {
    if (p.orderCount > 0) {
      if (await confirm({ title: "Archiver ce produit ?", message: "Il figure dans des commandes : il sera retiré de la boutique mais conservé dans l'historique.", confirmLabel: "Archiver" })) submit("archived");
      return;
    }
    if (!(await confirm({ title: "Supprimer définitivement ?", message: `« ${p.name || "Ce produit"} » et ses photos seront supprimés. Cette action est irréversible.`, confirmLabel: "Supprimer", danger: true }))) return;
    start(async () => {
      const res = await deleteProductAction(p.id);
      if (res.ok) {
        toast("Produit supprimé.");
        router.replace("/admin/produits");
      } else toast(res.error, "error");
    });
  };

  const priceCents = parseEuros(price);
  const main = p.images[0];

  return (
    <div className="pb-40 lg:pb-24">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin/produits" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowLeft size={16} aria-hidden="true" /> Produits
        </Link>
        {!isNew && saved.status === "published" && (
          <a href={`/produit/${saved.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Voir dans la boutique <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl sm:text-4xl">{isNew ? "Nouvelle création" : saved.name}</h1>
        {!isNew && <ProductStatusBadge status={saved.status} stock={saved.stock} />}
      </div>

      {formError && (
        <div className="mb-5">
          <Notice tone="danger">{formError}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* 1. Photos */}
        <section className="card p-4 sm:p-5" aria-labelledby="titre-photos">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="titre-photos" className="font-sans text-base font-semibold">
              Photos
            </h2>
            <span className="text-xs text-text-2">{p.images.length}/12 · la 1re est la principale</span>
          </div>
          <div
            className={`rounded-2xl border-2 border-dashed p-3 transition ${dragOver ? "border-primary bg-primary-light" : "border-border"}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDragOver(true);
              }
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              if (!e.dataTransfer.files.length) return;
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {p.images.map((img, i) => (
                <li
                  key={img.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => dragIndex !== null && e.preventDefault()}
                  onDrop={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    e.stopPropagation();
                    moveImage(dragIndex, i);
                    setDragIndex(null);
                  }}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc(img, 320)} alt={img.alt || `Photo ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
                  {i === 0 && <span className="badge absolute top-1.5 left-1.5 bg-primary text-on-primary">Principale</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1">
                    <div className="flex">
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-30" onClick={() => moveImage(i, i - 1)} disabled={i === 0} aria-label={`Déplacer la photo ${i + 1} vers la gauche`}>
                        <ArrowLeft size={16} />
                      </button>
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-30" onClick={() => moveImage(i, i + 1)} disabled={i === p.images.length - 1} aria-label={`Déplacer la photo ${i + 1} vers la droite`}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="flex">
                      {i > 0 && (
                        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white" onClick={() => moveImage(i, 0)} aria-label={`Choisir la photo ${i + 1} comme principale`} title="Photo principale">
                          <Star size={16} />
                        </button>
                      )}
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white" onClick={() => update("images", p.images.filter((x) => x.id !== img.id))} aria-label={`Retirer la photo ${i + 1}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {uploads.map((u) => (
                <li key={u.key} className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 p-2 text-center text-xs">
                  {u.error ? (
                    <>
                      <span className="text-error">{u.error}</span>
                      <button type="button" className="underline" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                        OK
                      </button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="animate-spin text-primary" size={22} aria-hidden="true" />
                      <span className="text-text-2">Envoi…</span>
                    </>
                  )}
                </li>
              ))}
              {p.images.length + uploads.filter((u) => !u.error).length < 12 && (
                <li>
                  <button
                    type="button"
                    id="field-images"
                    onClick={() => fileInput.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-primary-light text-sm font-semibold text-primary transition hover:brightness-95"
                  >
                    <ImagePlus size={26} aria-hidden="true" />
                    {p.images.length ? "Ajouter" : "Ajouter des photos"}
                  </button>
                </li>
              )}
            </ul>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="mt-3 hidden text-center text-xs text-text-2 sm:block">Glissez-déposez vos photos ici, ou faites-les glisser pour changer l&apos;ordre.</p>
          </div>
          {errors.images && <p className="field-error">{errors.images}</p>}
        </section>

        {/* 2. L'essentiel */}
        <section className="card space-y-4 p-4 sm:p-5" aria-labelledby="titre-infos">
          <h2 id="titre-infos" className="font-sans text-base font-semibold">
            L&apos;essentiel
          </h2>
          <div>
            <label htmlFor="field-name" className="field-label">
              Nom <span className="text-error">*</span>
            </label>
            <input id="field-name" className="input" value={p.name} maxLength={120} onChange={(e) => update("name", e.target.value)} placeholder="Ex. : Fleurs pailletées Arc-en-ciel" aria-invalid={errors.name ? true : undefined} />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-priceCents" className="field-label">
                Prix (€) <span className="text-error">*</span>
              </label>
              <input id="field-priceCents" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, "").slice(0, 9))} placeholder="24" aria-invalid={errors.priceCents ? true : undefined} />
              {errors.priceCents ? <p className="field-error">{errors.priceCents}</p> : priceCents ? <p className="field-hint">Affiché : {formatPrice(priceCents)}</p> : null}
            </div>
            <div>
              <span className="field-label" id="label-stock">
                Stock
              </span>
              <div className="flex h-12 items-center justify-between rounded-xl border-[1.5px] border-border bg-surface" role="group" aria-labelledby="label-stock">
                <button type="button" className="btn btn-icon" onClick={() => update("stock", Math.max(0, p.stock - 1))} aria-label="Retirer une pièce">
                  <Minus size={16} />
                </button>
                <input
                  id="field-stock"
                  className="w-12 bg-transparent text-center font-semibold focus:outline-none"
                  inputMode="numeric"
                  value={p.stock}
                  onChange={(e) => update("stock", Math.min(100000, Number(e.target.value.replace(/\D/g, "") || 0)))}
                  aria-label="Nombre de pièces disponibles"
                />
                <button type="button" className="btn btn-icon" onClick={() => update("stock", p.stock + 1)} aria-label="Ajouter une pièce">
                  <Plus size={16} />
                </button>
              </div>
              {errors.stock && <p className="field-error">{errors.stock}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="field-categoryId" className="field-label">
              Catégorie <span className="text-error">*</span>
            </label>
            <select id="field-categoryId" className="input" value={p.categoryId} onChange={(e) => update("categoryId", e.target.value)} aria-invalid={errors.categoryId ? true : undefined}>
              <option value="">Choisir…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
            {newCategory === null ? (
              <button type="button" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setNewCategory("")}>
                <Plus size={15} /> Nouvelle catégorie (broches, bracelets…)
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1"
                  aria-label="Nom de la nouvelle catégorie"
                  placeholder="Ex. : Broches"
                  maxLength={80}
                  value={newCategory}
                  autoFocus
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createCategory();
                    }
                    if (e.key === "Escape") setNewCategory(null);
                  }}
                />
                <button type="button" className="btn btn-primary" disabled={creatingCategory || !newCategory.trim()} onClick={createCategory}>
                  {creatingCategory ? <Loader2 size={16} className="animate-spin" /> : "Créer"}
                </button>
                <button type="button" className="btn btn-outline btn-icon" aria-label="Annuler" onClick={() => setNewCategory(null)}>
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="field-description" className="field-label">
              Description
            </label>
            <textarea id="field-description" className="input" rows={5} maxLength={5000} value={p.description} onChange={(e) => update("description", e.target.value)} placeholder="Couleurs, matières, taille, inspiration…" />
            <p className="field-hint">Astuce : une ligne commençant par « - » crée une liste ; **mot** met en gras.</p>
          </div>
        </section>
      </div>

      {/* 3. Options (repliées pour ne pas encombrer) */}
      <details className="card mt-6 p-4 sm:p-5">
        <summary className="font-semibold">Plus d&apos;options (collection, couleurs, prix barré, référence…)</summary>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="field-collectionId" className="field-label">
              Collection
            </label>
            <select id="field-collectionId" className="input" value={p.collectionId ?? ""} onChange={(e) => update("collectionId", e.target.value || null)}>
              <option value="">Aucune</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="field-compareAtCents" className="field-label">
              Prix barré (€)
            </label>
            <input id="field-compareAtCents" className="input" inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value.replace(/[^\d,.]/g, "").slice(0, 9))} placeholder="Uniquement pour une vraie promotion" />
            {errors.compareAtCents && <p className="field-error">{errors.compareAtCents}</p>}
          </div>
          <fieldset className="md:col-span-2">
            <legend className="field-label">Couleurs (servent au filtre de la boutique)</legend>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={p.colors.includes(c.id)}
                  onClick={() => update("colors", p.colors.includes(c.id) ? p.colors.filter((x) => x !== c.id) : [...p.colors, c.id])}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.hex === "conic" ? "conic-gradient(#e3a2b0,#e8c547,#5e8b5a,#3f6fb0,#8565a8,#e3a2b0)" : c.hex }} aria-hidden="true" />
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="md:col-span-2">
            <legend className="field-label">Caractéristiques</legend>
            <ul className="space-y-2">
              {p.features.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <input className="input" placeholder="Ex. : Dimensions" aria-label="Nom" value={f.label} maxLength={40} onChange={(e) => update("features", p.features.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="input" placeholder="Ex. : 3,5 cm" aria-label="Valeur" value={f.value} maxLength={120} onChange={(e) => update("features", p.features.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" className="btn btn-ghost btn-icon shrink-0" aria-label="Retirer" onClick={() => update("features", p.features.filter((_, j) => j !== i))}>
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
            {p.features.length < 12 && (
              <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => update("features", [...p.features, { label: "", value: "" }])}>
                <Plus size={15} aria-hidden="true" /> Ajouter une caractéristique
              </button>
            )}
          </fieldset>
          <div>
            <label htmlFor="field-sku" className="field-label">
              Référence (facultatif)
            </label>
            <input id="field-sku" className="input" value={p.sku} maxLength={40} onChange={(e) => update("sku", e.target.value.replace(/[^A-Za-z0-9._-]/g, ""))} />
            {errors.sku && <p className="field-error">{errors.sku}</p>}
          </div>
          <div>
            <label htmlFor="field-tags" className="field-label">
              Mots-clés (recherche)
            </label>
            <input id="field-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fleur, été, cadeau" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="field-slug" className="field-label">
              Adresse de la page
            </label>
            <div className="flex items-center gap-1 text-sm text-text-2">
              <span className="shrink-0">/produit/</span>
              <input id="field-slug" className="input" value={p.slug} placeholder={slugify(p.name) || "creee-automatiquement"} onChange={(e) => update("slug", slugify(e.target.value))} />
            </div>
            <p className="field-hint">Créée automatiquement. Si vous la changez, l&apos;ancienne adresse continue de fonctionner.</p>
            {errors.slug && <p className="field-error">{errors.slug}</p>}
          </div>
          <div>
            <label htmlFor="field-seoTitle" className="field-label">
              Titre pour Google (facultatif)
            </label>
            <input id="field-seoTitle" className="input" maxLength={120} value={p.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} placeholder={p.name} />
          </div>
          <div>
            <label htmlFor="field-seoDescription" className="field-label">
              Description pour Google et les partages
            </label>
            <input id="field-seoDescription" className="input" maxLength={300} value={p.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} placeholder="Reprise de la description si vide" />
          </div>
          {p.images.length > 0 && (
            <fieldset className="md:col-span-2">
              <legend className="field-label">Description des photos (pour les personnes malvoyantes)</legend>
              <ul className="space-y-2">
                {p.images.map((img, i) => (
                  <li key={img.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc(img, 320)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    <input
                      className="input"
                      maxLength={200}
                      aria-label={`Description de la photo ${i + 1}`}
                      placeholder={`${p.name || "Nom du produit"}${i ? ` — photo ${i + 1}` : ""}`}
                      value={img.alt}
                      onChange={(e) => update("images", p.images.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))}
                    />
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>
      </details>

      {!isNew && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
          <p className="text-sm text-text-2">
            {p.orderCount > 0 ? `Commandé ${p.orderCount} fois : ce produit peut être archivé, pas supprimé.` : "Jamais commandé : peut être supprimé définitivement."}
          </p>
          <div className="flex gap-2">
            {saved.status !== "archived" && p.orderCount > 0 && (
              <button type="button" className="btn btn-outline btn-sm" onClick={remove} disabled={pending}>
                Archiver
              </button>
            )}
            {p.orderCount === 0 && (
              <button type="button" className="btn btn-outline btn-sm text-error" onClick={remove} disabled={pending}>
                <Trash2 size={15} aria-hidden="true" /> Supprimer
              </button>
            )}
          </div>
        </section>
      )}

      {/* Barre d'actions toujours visible */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
            {main && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc(main, 320)} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <p className="truncate text-sm text-text-2">{dirty ? "Modifications non enregistrées" : saved.status === "published" ? "En ligne dans la boutique" : saved.status === "archived" ? "Archivé (invisible)" : "Brouillon (invisible)"}</p>
          </div>
          {saved.status === "published" ? (
            <>
              <button type="button" className="btn btn-outline flex-1 sm:flex-none" disabled={pending} onClick={() => submit("draft")}>
                <span className="sm:hidden">Retirer</span>
                <span className="hidden sm:inline">Retirer de la boutique</span>
              </button>
              <button type="button" className="btn btn-primary flex-1 sm:flex-none" disabled={pending || (!dirty && !isNew)} onClick={() => submit("published")}>
                {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null} Enregistrer
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline flex-1 sm:flex-none" disabled={pending} onClick={() => submit(saved.status === "archived" ? "archived" : "draft")}>
                {saved.status === "archived" ? "Enregistrer" : (
                  <>
                    <span className="sm:hidden">Brouillon</span>
                    <span className="hidden sm:inline">Enregistrer le brouillon</span>
                  </>
                )}
              </button>
              <button type="button" className="btn btn-primary flex-1 sm:flex-none" disabled={pending} onClick={() => submit("published")}>
                {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null} {saved.status === "archived" ? "Remettre en ligne" : "Publier"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
