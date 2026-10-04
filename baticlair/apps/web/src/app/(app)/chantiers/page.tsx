"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Warehouse } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ProjectList } from "@/components/project-row";
import { Button, ButtonLink, EmptyState, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError, type Project, type ProjectPage } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

type Filter = "en-cours" | "termines" | "tous";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "en-cours", label: "En cours" },
  { value: "termines", label: "Terminés" },
  { value: "tous", label: "Tous" },
];
const API_STATUS: Record<Filter, string> = { "en-cours": "active", termines: "archived", tous: "all" };

/**
 * La recherche et le filtre vivent dans l'adresse (?q=…&statut=…) : le
 * bouton Retour, un rafraîchissement ou un lien partagé les restituent.
 */
function ChantiersList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const filterParam = params.get("statut") as Filter | null;
  const searching = q.trim().length > 0;
  const filter: Filter = filterParam ?? (searching ? "tous" : "en-cours");

  const [draft, setDraft] = useState(q);
  const [more, setMore] = useState<{ items: Project[]; cursor: string | null; key: string } | null>(null);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const updateUrl = useCallback(
    (next: { q?: string; statut?: Filter | null }) => {
      const sp = new URLSearchParams(params.toString());
      if (next.q !== undefined) {
        if (next.q) sp.set("q", next.q);
        else sp.delete("q");
      }
      if (next.statut !== undefined) {
        if (next.statut) sp.set("statut", next.statut);
        else sp.delete("statut");
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Recherche au fil de la frappe (léger délai pour ne pas surcharger).
  useEffect(() => {
    if (draft === q) return;
    // Une nouvelle recherche porte sur tous les chantiers (PD-022) : un filtre
    // choisi avant de taper ne doit pas cacher un chantier terminé.
    const t = setTimeout(() => updateUrl({ q: draft.trim(), statut: null }), 250);
    return () => clearTimeout(t);
  }, [draft, q, updateUrl]);

  const queryKey = `${API_STATUS[filter]}|${q.trim()}`;
  const fetchPage = useCallback(
    (signal: AbortSignal | undefined, after: string | null) => {
      const sp = new URLSearchParams({ status: API_STATUS[filter], limit: "30" });
      if (q.trim()) sp.set("q", q.trim());
      if (after) sp.set("cursor", after);
      return api<ProjectPage>(`/v1/projects?${sp.toString()}`, signal ? { signal } : {});
    },
    [filter, q],
  );
  const fetchFirst = useCallback((signal: AbortSignal) => fetchPage(signal, null), [fetchPage]);
  const { data: first, error: firstError, reload } = useResource(fetchFirst);

  // Pages supplémentaires chargées pour la recherche en cours uniquement.
  const extra = more && more.key === queryKey ? more : null;
  const items = first ? [...first.items, ...(extra?.items ?? [])] : null;
  const cursor = extra ? extra.cursor : (first?.nextCursor ?? null);
  const error = firstError ?? moreError;

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await fetchPage(undefined, cursor);
      setMore({ items: [...(extra?.items ?? []), ...page.items], cursor: page.nextCursor, key: queryKey });
    } catch (e) {
      setMoreError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <PageTitle>Chantiers</PageTitle>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="search" className="text-xs font-bold text-muted">
          Chercher un chantier, un client ou une adresse
        </label>
        <div className="flex min-h-13 items-center gap-2.5 rounded-2xl bg-surface px-4 shadow-card focus-within:ring-2 focus-within:ring-ink">
          <Search size={20} className="text-muted" aria-hidden="true" />
          <input
            id="search"
            type="search"
            enterKeyHint="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ex. Dupont, Vannes…"
            className="min-h-12 grow bg-transparent text-base outline-none placeholder:text-subtle"
          />
        </div>
      </div>
      <div role="group" aria-label="Filtrer" className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => updateUrl({ statut: f.value })}
            className={`min-h-10 rounded-full px-3.5 text-sm font-bold ${filter === f.value ? "bg-ink text-white" : "bg-surface text-[#3a414b] shadow-card"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <ErrorNotice error={error} onRetry={() => { setMoreError(null); reload(); }} /> : null}
      {items === null && !error ? <Spinner /> : null}
      {items && items.length > 0 ? (
        <>
          <p className="text-[13px] text-muted" aria-live="polite">
            {searching ? `Résultats pour « ${q} »${filter === "tous" ? " (en cours et terminés)" : ""}` : "Le dernier travaillé en premier"}
          </p>
          <ProjectList projects={items} show={API_STATUS[filter] as "active" | "archived" | "all"} />
          {cursor ? (
            <Button variant="secondary" pending={loadingMore} onClick={() => void loadMore()}>
              {fr.actions.loadMore}
            </Button>
          ) : null}
        </>
      ) : null}
      {items && items.length === 0 ? (
        searching ? (
          <EmptyState icon={<Search size={40} />} title="Aucun chantier trouvé">
            <p className="max-w-xs text-[15px] text-muted">Essayez le nom du client, une ville ou une partie de l&apos;adresse.</p>
          </EmptyState>
        ) : (
          <EmptyState icon={<Warehouse size={40} />} title={filter === "termines" ? "Aucun chantier terminé" : "Aucun chantier en cours"}>
            {filter !== "termines" ? <ButtonLink href="/chantiers/nouveau">Créer un chantier</ButtonLink> : null}
          </EmptyState>
        )
      ) : null}
    </>
  );
}

export default function ChantiersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ChantiersList />
    </Suspense>
  );
}
