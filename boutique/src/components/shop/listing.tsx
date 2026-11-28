import { Check, ChevronRight, Search, SearchX, X } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { getCategories, getCollections, getFacets, getListing, getSettings } from "@/lib/server/cached";
import { isAttributeKey, SORTS, type CategoryLink, type ListingFilters, type Sort } from "@/lib/server/catalog";
import { PRODUCT_COLORS } from "@/lib/validation";
import { Img } from "../ui/img";
import { ProductGrid } from "./product-card";
import { FilterSheet, SortSelect } from "./listing-controls";

// Page de liste (toute la boutique ou une catégorie, à n'importe quel niveau).
//
// STRUCTURE POUR NAVIGUER : catégories et sous-catégories (colonne à gauche
// sur ordinateur, vignettes et pastilles sur téléphone).
// ATTRIBUTS POUR FILTRER : disponibilité, couleur, caractéristiques (motif,
// matière…), collection, prix — seulement ceux qui existent vraiment ici.
// NOM DU PRODUIT POUR IDENTIFIER : recherche dans la catégorie.

export type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.slice(0, 100);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Paramètres d'URL → filtres validés (valeurs inconnues ignorées). */
export function parseFilters(params: RawParams, category?: string): ListingFilters {
  const sort = one(params.tri);
  const euros = (v: string | undefined) => (v && /^\d{1,5}$/.test(v) ? Number(v) * 100 : undefined);
  const color = one(params.couleur);
  const page = Number(one(params.page));
  const attributes: Record<string, string> = {};
  for (const [key, raw] of Object.entries(params)) {
    const value = one(raw);
    if (value && isAttributeKey(key) && SLUG.test(value) && value.length <= 80 && Object.keys(attributes).length < 4) attributes[key] = value;
  }
  return {
    category,
    attributes: Object.keys(attributes).length ? attributes : undefined,
    q: one(params.q)?.trim() || undefined,
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "selection",
    availableOnly: one(params.dispo) === "1",
    color: PRODUCT_COLORS.some((c) => c.id === color) ? color : undefined,
    collection: SLUG.test(one(params.collection) ?? "") ? one(params.collection) : undefined,
    minCents: euros(one(params["prix-min"])),
    maxCents: euros(one(params["prix-max"])),
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 50) : 1,
  };
}

function hrefWith(base: string, params: RawParams, changes: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = one(v);
    if (val && k !== "page") sp.set(k, val);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined) sp.delete(k);
    else sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** Champs cachés : garder les autres filtres quand on envoie un petit formulaire (recherche, prix). */
function KeepParams({ params, except }: { params: RawParams; except: string[] }) {
  return (
    <>
      {Object.entries(params)
        .filter(([k, v]) => one(v) && k !== "page" && !except.includes(k))
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={one(v)} />
        ))}
    </>
  );
}

export async function Listing({ params, category }: { params: RawParams; category?: CategoryLink }) {
  const settings = await getSettings();
  const filters = parseFilters(params, category?.path);
  const [listing, facets, categories, collections] = await Promise.all([
    getListing(filters, settings.lowStockThreshold),
    getFacets(category?.path),
    getCategories(),
    getCollections(),
  ]);
  const base = category ? `/boutique/${category.path}` : "/boutique";
  const title = category ? category.name : filters.q ? `Résultats pour « ${filters.q} »` : filters.sort === "nouveautes" ? "Nouveautés" : "Toutes les créations";

  // Arborescence utile : on ne montre jamais une catégorie vide.
  const withProducts = categories.filter((c) => c.productCount > 0);
  const childrenOf = (id: string | null) => withProducts.filter((c) => c.parentId === id);
  const roots = childrenOf(null);
  const children = category ? childrenOf(category.id) : roots;
  const siblings = category ? childrenOf(category.parentId) : [];
  const parent = category?.trail.at(-1);
  const inBranch = (c: CategoryLink) => Boolean(category && (category.path === c.path || category.path.startsWith(`${c.path}/`)));

  const colorLabel = PRODUCT_COLORS.find((c) => c.id === filters.color)?.label;
  const collectionLabel = collections.find((c) => c.slug === filters.collection)?.name;
  const attributeLabels = Object.entries(filters.attributes ?? {}).flatMap(([key, value]) => {
    const facet = facets.attributes.find((a) => a.key === key);
    const v = facet?.values.find((x) => x.key === value);
    return facet && v ? [{ label: `${facet.label} : ${v.label}`, remove: { [key]: undefined } }] : [];
  });
  const active: { label: string; remove: Record<string, undefined> }[] = [
    ...(filters.q ? [{ label: `« ${filters.q} »`, remove: { q: undefined } }] : []),
    ...(filters.availableOnly ? [{ label: "Disponibles", remove: { dispo: undefined } }] : []),
    ...attributeLabels,
    ...(colorLabel ? [{ label: colorLabel, remove: { couleur: undefined } }] : []),
    ...(collectionLabel ? [{ label: collectionLabel, remove: { collection: undefined } }] : []),
    ...(filters.minCents !== undefined || filters.maxCents !== undefined
      ? [
          {
            label: `${filters.minCents !== undefined ? `dès ${filters.minCents / 100} €` : ""}${filters.minCents !== undefined && filters.maxCents !== undefined ? " · " : ""}${filters.maxCents !== undefined ? `jusqu'à ${filters.maxCents / 100} €` : ""}`,
            remove: { "prix-min": undefined, "prix-max": undefined },
          },
        ]
      : []),
  ];
  const filterOptions = {
    colors: PRODUCT_COLORS.filter((c) => facets.colors.includes(c.id)).map((c) => ({ id: c.id, label: c.label, hex: c.hex })),
    collections: collections.map((c) => ({ slug: c.slug, name: c.name })),
    attributes: facets.attributes.map((a) => ({ key: a.key, label: a.label, values: a.values.map((v) => ({ key: v.key, label: v.label })) })),
    hasSoldOut: facets.hasSoldOut,
    priceRange: facets.total > 3 && facets.maxCents - facets.minCents >= 1000,
  };
  const hasFilters = filterOptions.colors.length > 1 || filterOptions.collections.length > 0 || filterOptions.attributes.length > 0 || filterOptions.hasSoldOut || filterOptions.priceRange;
  const browsing = !filters.q && active.length === 0;

  return (
    <div className="container-page pt-5 pb-8 sm:pt-8">
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-text-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="inline-block py-1.5 no-underline hover:underline">
              Accueil
            </Link>
          </li>
          <ChevronRight size={14} aria-hidden="true" />
          {category ? (
            <>
              <li>
                <Link href="/boutique" className="inline-block py-1.5 no-underline hover:underline">
                  Boutique
                </Link>
              </li>
              {category.trail.map((t) => (
                <Fragment key={t.path}>
                  <ChevronRight size={14} aria-hidden="true" />
                  <li>
                    <Link href={`/boutique/${t.path}`} className="inline-block py-1.5 no-underline hover:underline">
                      {t.name}
                    </Link>
                  </li>
                </Fragment>
              ))}
              <ChevronRight size={14} aria-hidden="true" />
              <li aria-current="page" className="text-text">
                {category.name}
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-text">
              Boutique
            </li>
          )}
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[250px_minmax(0,1fr)]">
        {/* ───── Ordinateur : colonne catégories + filtres ───── */}
        <aside className="hidden lg:block" aria-label="Catégories et filtres">
          <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] space-y-8 overflow-y-auto pr-2 pb-4">
            <nav aria-label="Catégories">
              <p className="eyebrow mb-3">Catégories</p>
              <ul className="space-y-0.5 text-[15px]">
                <li>
                  <SideLink href="/boutique" current={!category} label="Toutes les créations" />
                </li>
                {roots.map((r) => (
                  <li key={r.id}>
                    <SideLink href={`/boutique/${r.path}`} current={category?.id === r.id} open={inBranch(r)} label={r.name} count={r.productCount} />
                    {inBranch(r) && <SubTree parentId={r.id} childrenOf={childrenOf} current={category} inBranch={inBranch} />}
                  </li>
                ))}
              </ul>
            </nav>
            {hasFilters && <SideFilters base={base} params={params} filters={filters} options={filterOptions} />}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-5">
            <h1 className="text-4xl sm:text-5xl">{title}</h1>
            {category?.description && browsing && <p className="mt-3 max-w-2xl text-text-2">{category.description}</p>}
          </header>

          {/* Sous-catégories : vignettes avec photo (tous écrans) */}
          {browsing && children.length > 1 && (
            <nav aria-label={category ? `Sous-catégories de ${category.name}` : "Catégories"} className="-mx-4 mb-6 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
              <ul className="flex gap-3 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {children.map((c) => (
                  <li key={c.id} className="w-[124px] shrink-0 sm:w-auto">
                    <Link href={`/boutique/${c.path}`} className="group block rounded-2xl border border-border bg-surface p-2 no-underline transition hover:border-primary">
                      <span className="block aspect-square overflow-hidden rounded-xl bg-surface-2">
                        <Img image={c.cover} alt="" sizes="150px" className="h-full w-full transition duration-500 group-hover:scale-105" />
                      </span>
                      <span className="mt-2 block truncate px-1 text-[15px] font-medium">{c.name}</span>
                      <span className="block px-1 text-xs text-text-2">
                        {c.productCount} création{c.productCount > 1 ? "s" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Téléphone / tablette : pastilles pour passer d'une catégorie voisine à l'autre */}
          {(children.length <= 1 || !browsing) && (category ? siblings.length > 1 || children.length > 0 : roots.length > 1) && (
            <nav aria-label="Catégories voisines" className="-mx-4 mb-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0 lg:hidden">
              <ul className="flex gap-2">
                <li>
                  <Link href={hrefWith(parent ? `/boutique/${parent.path}` : "/boutique", params, {})} className="chip">
                    {parent ? `Tout ${parent.name}` : "Tout"}
                  </Link>
                </li>
                {(category ? (children.length ? children : siblings) : roots).map((c) => (
                  <li key={c.id}>
                    <Link href={hrefWith(`/boutique/${c.path}`, params, {})} className="chip" aria-current={category?.id === c.id ? "page" : undefined}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border pb-4 sm:gap-3">
            <form action={base} method="get" role="search" className="relative order-first w-full sm:order-none sm:w-auto sm:min-w-[240px] sm:flex-1 lg:max-w-sm">
              <KeepParams params={params} except={["q"]} />
              <label htmlFor="recherche-liste" className="sr-only">
                Rechercher un modèle{category ? ` dans ${category.name}` : ""}
              </label>
              <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-2" aria-hidden="true" />
              <input
                id="recherche-liste"
                name="q"
                type="search"
                enterKeyHint="search"
                defaultValue={filters.q ?? ""}
                placeholder={category ? `Rechercher dans ${category.name}` : "Rechercher un modèle"}
                maxLength={80}
                className="input !min-h-11 !rounded-full !pl-10 text-[15px]"
              />
            </form>
            <div className="flex w-full items-center gap-2 sm:contents">
            <p className="mr-auto text-sm whitespace-nowrap text-text-2 sm:order-first sm:mr-0" aria-live="polite">
              {listing.total} création{listing.total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 sm:ml-auto">
              {hasFilters && (
                <div className="lg:hidden">
                  <FilterSheet
                    base={base}
                    options={filterOptions}
                    current={{ dispo: filters.availableOnly, couleur: filters.color, collection: filters.collection, attributes: filters.attributes ?? {}, min: filters.minCents, max: filters.maxCents }}
                  />
                </div>
              )}
              <SortSelect value={filters.sort ?? "selection"} />
            </div>
            </div>
          </div>

          {active.length > 0 && (
            <ul className="mb-6 flex flex-wrap gap-2" aria-label="Filtres actifs">
              {active.map((a) => (
                <li key={a.label}>
                  <Link href={hrefWith(base, params, a.remove)} className="chip bg-primary-light" aria-label={`Retirer le filtre ${a.label}`}>
                    {a.label} <X size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {active.length > 1 && (
                <li>
                  <Link href={base} className="chip border-transparent underline">
                    Tout effacer
                  </Link>
                </li>
              )}
            </ul>
          )}

          {listing.items.length ? (
            <>
              <ProductGrid products={listing.items} priorityCount={4} withSidebar headingLevel={2} />
              {listing.hasMore && (
                <div className="mt-12 flex flex-col items-center gap-2">
                  <p className="text-sm text-text-2">
                    {listing.items.length} sur {listing.total}
                  </p>
                  <Link href={hrefWith(base, params, { page: String((filters.page ?? 1) + 1) })} scroll={false} className="btn btn-outline" rel="next">
                    Voir plus de créations
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
              <SearchX className="text-text-2" size={32} aria-hidden="true" />
              <p className="font-serif text-2xl">{filters.q ? "Aucune création ne correspond" : "Rien ici pour le moment"}</p>
              <p className="text-text-2">
                {filters.q ? "Essayez un autre mot (une couleur, une forme…) ou parcourez toute la boutique." : active.length ? "Essayez d'enlever un filtre." : "De nouvelles créations arrivent bientôt."}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {active.length > 0 && (
                  <Link href={base} className="btn btn-outline btn-sm">
                    Effacer les filtres
                  </Link>
                )}
                <Link href="/boutique" className="btn btn-primary btn-sm">
                  Voir toutes les créations
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SideLink({ href, current, open, label, count }: { href: string; current: boolean; open?: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 no-underline transition-colors hover:bg-surface-2 hover:text-primary aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary ${open && !current ? "font-semibold" : ""}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined && <span className="shrink-0 text-xs text-text-2 tabular-nums">{count}</span>}
    </Link>
  );
}

function SubTree({
  parentId,
  childrenOf,
  current,
  inBranch,
}: {
  parentId: string;
  childrenOf: (id: string | null) => CategoryLink[];
  current?: CategoryLink;
  inBranch: (c: CategoryLink) => boolean;
}) {
  const kids = childrenOf(parentId);
  if (!kids.length) return null;
  return (
    <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2 text-[14px]">
      {kids.map((k) => (
        <li key={k.id}>
          <SideLink href={`/boutique/${k.path}`} current={current?.id === k.id} open={inBranch(k)} label={k.name} count={k.productCount} />
          {inBranch(k) && <SubTree parentId={k.id} childrenOf={childrenOf} current={current} inBranch={inBranch} />}
        </li>
      ))}
    </ul>
  );
}

interface Options {
  colors: { id: string; label: string; hex: string }[];
  collections: { slug: string; name: string }[];
  attributes: { key: string; label: string; values: { key: string; label: string }[] }[];
  hasSoldOut: boolean;
  priceRange: boolean;
}

/** Filtres de la colonne (ordinateur) : de simples liens, un clic = un filtre. */
function SideFilters({ base, params, filters, options }: { base: string; params: RawParams; filters: ListingFilters; options: Options }) {
  const option = (href: string, selected: boolean, label: React.ReactNode, key: string) => (
    <li key={key}>
      <Link
        href={href}
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className="flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1 text-[14px] no-underline transition-colors hover:bg-surface-2 hover:text-primary aria-[current=true]:font-semibold aria-[current=true]:text-primary"
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-on-primary" : "border-border-strong"}`} aria-hidden="true">
          {selected && <Check size={11} strokeWidth={3} />}
        </span>
        {label}
      </Link>
    </li>
  );
  return (
    <div className="space-y-7">
      <p className="eyebrow">Filtrer</p>
      {options.hasSoldOut && (
        <ul>{option(hrefWith(base, params, { dispo: filters.availableOnly ? undefined : "1" }), Boolean(filters.availableOnly), "Pièces disponibles", "dispo")}</ul>
      )}
      {options.attributes.map((a) => (
        <fieldset key={a.key}>
          <legend className="mb-1.5 px-2.5 text-sm font-semibold">{a.label}</legend>
          <ul>
            {a.values.map((v) => {
              const selected = filters.attributes?.[a.key] === v.key;
              return option(hrefWith(base, params, { [a.key]: selected ? undefined : v.key }), selected, v.label, v.key);
            })}
          </ul>
        </fieldset>
      ))}
      {options.colors.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 px-2.5 text-sm font-semibold">Couleur</legend>
          <ul>
            {options.colors.map((c) =>
              option(
                hrefWith(base, params, { couleur: filters.color === c.id ? undefined : c.id }),
                filters.color === c.id,
                <>
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ background: c.hex === "conic" ? "conic-gradient(#e3a2b0, #e8c547, #5e8b5a, #3f6fb0, #8565a8, #e3a2b0)" : c.hex }}
                    aria-hidden="true"
                  />
                  {c.label}
                </>,
                c.id,
              ),
            )}
          </ul>
        </fieldset>
      )}
      {options.collections.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 px-2.5 text-sm font-semibold">Collection</legend>
          <ul>
            {options.collections.map((c) =>
              option(hrefWith(base, params, { collection: filters.collection === c.slug ? undefined : c.slug }), filters.collection === c.slug, c.name, c.slug),
            )}
          </ul>
        </fieldset>
      )}
      {options.priceRange && (
        <form action={base} method="get" className="px-2.5">
          <KeepParams params={params} except={["prix-min", "prix-max"]} />
          <p className="mb-2 text-sm font-semibold">Prix (€)</p>
          <div className="flex items-center gap-2">
            <input name="prix-min" inputMode="numeric" pattern="[0-9]*" maxLength={5} placeholder="Min" aria-label="Prix minimum" defaultValue={filters.minCents !== undefined ? filters.minCents / 100 : ""} className="input !min-h-10 w-full !px-3 text-sm" />
            <span aria-hidden="true">–</span>
            <input name="prix-max" inputMode="numeric" pattern="[0-9]*" maxLength={5} placeholder="Max" aria-label="Prix maximum" defaultValue={filters.maxCents !== undefined ? filters.maxCents / 100 : ""} className="input !min-h-10 w-full !px-3 text-sm" />
          </div>
          <button type="submit" className="btn btn-outline btn-sm mt-2 w-full">
            Appliquer
          </button>
        </form>
      )}
    </div>
  );
}
