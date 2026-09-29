"use client";

import { ArrowDown, ArrowUp, Minus, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkAction, moveProductAction, setStockAction } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import type { ImageRef } from "@/lib/image-ref";
import { Img } from "../ui/img";
import { ProductStatusBadge, useConfirm, useToast } from "./ui";

interface Row {
  id: string;
  name: string;
  sku: string | null;
  status: "draft" | "published" | "archived";
  price_cents: number;
  stock: number;
  reserved: number;
  category_name: string;
  image: ImageRef | null;
}

/** Modification rapide du stock, directement depuis la liste. */
function StockEditor({ row, low }: { row: Row; low: number }) {
  const [stock, setStock] = useState(row.stock);
  const [draft, setDraft] = useState(String(row.stock));
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const save = (next: number) => {
    if (next < 0 || next === stock || Number.isNaN(next)) {
      setDraft(String(stock));
      return;
    }
    const expected = stock;
    setStock(next);
    setDraft(String(next));
    start(async () => {
      const res = await setStockAction(row.id, next, expected);
      if (!res.ok) {
        const actual = res.fieldErrors?.stock ? Number(res.fieldErrors.stock) : expected;
        setStock(actual);
        setDraft(String(actual));
        toast(res.error, "error");
      } else router.refresh();
    });
  };

  const tone = stock === 0 ? "text-error" : low > 0 && stock <= low ? "text-warning" : "";
  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      <button type="button" className="btn btn-outline btn-icon !min-h-9 !min-w-9" onClick={() => save(stock - 1)} disabled={stock <= 0 || pending} aria-label={`Retirer une pièce de ${row.name}`}>
        <Minus size={14} />
      </button>
      <label className="sr-only" htmlFor={`stock-${row.id}`}>
        Stock de {row.name}
      </label>
      <input
        id={`stock-${row.id}`}
        className={`w-12 rounded-lg border border-transparent bg-transparent py-1 text-center font-semibold hover:border-border focus:border-primary focus:outline-none ${tone}`}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
        onBlur={() => save(Number(draft))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" className="btn btn-outline btn-icon !min-h-9 !min-w-9" onClick={() => save(stock + 1)} disabled={pending} aria-label={`Ajouter une pièce à ${row.name}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}

export function ProductList({
  rows,
  categories,
  filters,
  lowThreshold,
}: {
  rows: (Row & { updated_at: string })[];
  categories: { id: string; name: string }[];
  filters: { q: string; statut: string; categorie: string; stock: string };
  lowThreshold: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState(filters.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const go = (changes: Record<string, string>) => {
    const sp = new URLSearchParams({ ...filters, ...changes });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    router.push(`${pathname}${sp.size ? `?${sp}` : ""}`);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const runBulk = async (action: Parameters<typeof bulkAction>[1], label: string) => {
    if (action.type === "archive" && !(await confirm({ title: `Archiver ${selected.size} produit(s) ?`, message: "Ils disparaîtront de la boutique. Vous pourrez les remettre en ligne à tout moment.", confirmLabel: "Archiver" }))) return;
    start(async () => {
      const res = await bulkAction([...selected], action);
      if (res.ok) {
        toast(`${res.count} produit(s) ${label}.`);
        setSelected(new Set());
        router.refresh();
      } else toast(res.error, "error");
    });
  };

  const reorderable = !filters.q && !filters.statut && !filters.categorie && !filters.stock;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q });
          }}
        >
          <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-text-2" aria-hidden="true" />
          <label htmlFor="admin-search" className="sr-only">
            Rechercher un produit
          </label>
          <input id="admin-search" type="search" className="input !pl-10" placeholder="Nom ou référence…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { label: "Tous", v: { statut: "", stock: "" } },
            { label: "En ligne", v: { statut: "published", stock: "" } },
            { label: "Brouillons", v: { statut: "draft", stock: "" } },
            { label: "Épuisés", v: { statut: "", stock: "epuise" } },
            { label: "Archivés", v: { statut: "archived", stock: "" } },
          ].map((f) => (
            <button key={f.label} type="button" className="chip" aria-pressed={filters.statut === f.v.statut && filters.stock === f.v.stock} onClick={() => go(f.v)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {categories.length > 1 && (
        <label className="mb-4 block max-w-xs">
          <span className="sr-only">Catégorie</span>
          <select className="input" value={filters.categorie} onChange={(e) => go({ categorie: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-text p-3 text-bg shadow-lift">
          <span className="px-2 text-sm font-semibold">{selected.size} sélectionné(s)</span>
          <button type="button" className="btn btn-sm bg-bg text-text" disabled={pending} onClick={() => runBulk({ type: "publish" }, "publiés")}>
            Publier
          </button>
          <button type="button" className="btn btn-sm bg-bg text-text" disabled={pending} onClick={() => runBulk({ type: "archive" }, "archivés")}>
            Archiver
          </button>
          <select
            className="h-10 rounded-full bg-bg px-3 text-sm text-text"
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && runBulk({ type: "category", categoryId: e.target.value }, "déplacés")}
            aria-label="Changer la catégorie"
          >
            <option value="">Changer de catégorie…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className="ml-auto text-sm underline" onClick={() => setSelected(new Set())}>
            Annuler
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Package size={32} className="text-text-2" aria-hidden="true" />
          <p className="font-serif text-2xl">{filters.q || filters.statut || filters.stock ? "Aucun produit ne correspond" : "Aucun produit pour l'instant"}</p>
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" /> Ajouter une création
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--c-primary)]" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Sélectionner ${r.name}`} />
              <Link href={`/admin/produits/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  <Img image={r.image} alt="" sizes="56px" className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-2">
                    {formatPrice(r.price_cents)} · {r.category_name}
                    <ProductStatusBadge status={r.status} stock={r.stock} />
                    {r.reserved > 0 && <span className="badge bg-info-bg text-info">{r.reserved} en cours de paiement</span>}
                  </p>
                </div>
              </Link>
              <StockEditor row={r} low={lowThreshold} />
              {reorderable && (
                <div className="hidden flex-col sm:flex">
                  <button type="button" className="btn btn-ghost btn-icon !min-h-7" aria-label={`Monter ${r.name}`} disabled={i === 0 || pending} onClick={() => start(async () => (await moveProductAction(r.id, "up"), router.refresh()))}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon !min-h-7" aria-label={`Descendre ${r.name}`} disabled={i === rows.length - 1 || pending} onClick={() => start(async () => (await moveProductAction(r.id, "down"), router.refresh()))}>
                    <ArrowDown size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-text-2">Le stock se modifie directement ici (boutons + / − ou saisie). Les flèches changent l&apos;ordre d&apos;affichage dans la boutique.</p>
    </>
  );
}
