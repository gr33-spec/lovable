"use client";

import { AideBouton } from "@/components/aide";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ConfirmerSuppression, CarteListe, ListeNonSupprimable, type Refus } from "@/components/mes-listes";
import { Button, ButtonLink, EmptyState, ErrorNotice, PageTitle, Skeleton, Spinner } from "@/components/ui";
import { api, ApiError, type Project, type ProjectPage } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

type Filter = "toutes" | "en-cours" | "terminees";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "en-cours", label: "En cours" },
  { value: "terminees", label: "Terminées" },
];
const API_STATUS: Record<Filter, "all" | "active" | "archived"> = { toutes: "all", "en-cours": "active", terminees: "archived" };
/** Les anciens liens (« ?statut=tous », « termines ») restent valables. */
const ANCIENS: Record<string, Filter> = { tous: "toutes", termines: "terminees", "en-cours": "en-cours", toutes: "toutes", terminees: "terminees" };

/**
 * « MES LISTES » (Greg, 1er novembre 2026 ; avant : « Chantiers », alors que le menu disait « Mes listes ») : le titre,
 * « Nouvelle liste » (le même départ que le « + » et l'accueil), la recherche, les filtres Toutes / En cours / Terminées (pas
 * d'« Archivées » : l'archivage, c'est « Terminée »), des cartes compactes avec leur « … », et la suppression définitive :
 * une liste, ou plusieurs avec « Sélectionner » (filtre « Toutes ») ; toujours confirmée, toujours décidée par le serveur.
 * La recherche et le filtre vivent dans l'adresse (?q=…&statut=…).
 */
function MesListes() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const filter: Filter = ANCIENS[params.get("statut") ?? ""] ?? "toutes";

  const [draft, setDraft] = useState(q);
  const [more, setMore] = useState<{ items: Project[]; cursor: string | null; key: string } | null>(null);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retirees, setRetirees] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [aSupprimer, setASupprimer] = useState<Project[] | null>(null);
  const [refus, setRefus] = useState<{ refus: Refus[]; autres: Project[] } | null>(null);
  const [verif, setVerif] = useState(false);
  const [annonce, setAnnonce] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const updateUrl = useCallback(
    (next: { q?: string; statut?: Filter | null }) => {
      const sp = new URLSearchParams(params.toString());
      if (next.q !== undefined) {
        if (next.q) sp.set("q", next.q);
        else sp.delete("q");
      }
      if (next.statut !== undefined) {
        if (next.statut && next.statut !== "toutes") sp.set("statut", next.statut);
        else sp.delete("statut");
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (draft === q) return;
    // Une recherche porte sur toutes les listes (PD-022) : un filtre choisi avant de taper ne cache pas une liste terminée.
    const t = setTimeout(() => updateUrl({ q: draft.trim(), statut: null }), 250);
    return () => clearTimeout(t);
  }, [draft, q, updateUrl]);

  const queryKey = `${API_STATUS[filter]}|${q.trim()}`;
  const fetchPage = useCallback(
    (signal: AbortSignal | undefined, after: string | null) => {
      const sp = new URLSearchParams({ status: API_STATUS[filter], limit: "30", resume: "1" });
      if (q.trim()) sp.set("q", q.trim());
      if (after) sp.set("cursor", after);
      return api<ProjectPage>(`/v1/projects?${sp.toString()}`, signal ? { signal } : {});
    },
    [filter, q],
  );
  const fetchFirst = useCallback((signal: AbortSignal) => fetchPage(signal, null), [fetchPage]);
  const { data: first, error: firstError, reload } = useResource(fetchFirst);

  const extra = more && more.key === queryKey ? more : null;
  const items = first ? [...first.items, ...(extra?.items ?? [])].filter((p) => !retirees.has(p.id)) : null;
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

  /** Avant toute confirmation, le serveur dit ce qui peut partir : rien n'est supprimé en silence. */
  async function demanderSuppression(listes: Project[]) {
    if (verif || listes.length === 0) return;
    setVerif(true);
    setErreur(null);
    setAnnonce(null);
    try {
      const r = await api<{ listes: { id: string; nom: string; supprimable: boolean; phrase: string | null }[] }>("/v1/listes/suppression/verifier", { method: "POST", body: { ids: listes.map((l) => l.id) } });
      const non = r.listes.filter((l) => !l.supprimable).map((l) => ({ id: l.id, nom: l.nom, phrase: l.phrase ?? "" }));
      if (non.length > 0) setRefus({ refus: non, autres: listes.filter((l) => !non.some((n) => n.id === l.id)) });
      else setASupprimer(listes);
    } catch (e) {
      setErreur(e instanceof ApiError ? (e.phrase ?? "La vérification n'a pas abouti. Réessaie dans un instant.") : "La vérification n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setVerif(false);
    }
  }

  function supprimees(ids: string[]) {
    setRetirees((r) => new Set([...r, ...ids]));
    setASupprimer(null);
    setSelection(null);
    setAnnonce(ids.length > 1 ? `${ids.length} listes supprimées définitivement` : "Liste supprimée définitivement");
  }

  async function basculerTerminee(p: Project) {
    setErreur(null);
    try {
      await api(`/v1/projects/${encodeURIComponent(p.id)}`, { method: "PATCH", body: { status: p.status === "archived" ? "active" : "archived" } });
      setRefus(null);
      // Le statut change : la liste se relit (seule une liste supprimée disparaît pour de bon de l'écran).
      setMore(null);
      reload();
    } catch {
      setErreur("Le changement n'est pas passé. Réessaie dans un instant.");
    }
  }

  const choisies = items && selection ? items.filter((p) => selection.has(p.id)) : [];
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle>Mes listes</PageTitle>
        <span className="flex items-center gap-3">
          <ButtonLink href="/chantiers/nouveau" className="min-h-11 shrink-0 px-4 text-[15px] whitespace-nowrap">
            Nouvelle liste
          </ButtonLink>
          <AideBouton sujet="chantiers" />
        </span>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="flex flex-col gap-1.5 lg:grow">
          <label htmlFor="search" className="sr-only">
            Rechercher une liste ou un chantier
          </label>
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 text-ink transition-[border-color] duration-150 focus-within:border-accent">
            <Search size={20} className="text-muted" aria-hidden="true" />
            <input
              id="search"
              type="search"
              enterKeyHint="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Rechercher une liste ou un chantier…"
              className="min-h-11 grow bg-transparent text-[16px] outline-none placeholder:text-muted"
            />
          </div>
        </div>
        {/* Audit UX (1er novembre 2026) : sur un iPhone SE, « Sélectionner » chevauchait « Terminées » ; il passe à la ligne
            seulement quand la place manque. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div role="group" aria-label="Filtrer" className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => {
                  setSelection(null);
                  updateUrl({ statut: f.value });
                }}
                className={`pressable min-h-11 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap ${filter === f.value ? "bg-ink text-white" : "border border-line bg-surface text-ink active:bg-ground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filter === "toutes" && items && items.length > 0 && !selection ? (
            <button type="button" onClick={() => setSelection(new Set())} className="ml-auto min-h-11 shrink-0 px-1 text-[15px] font-bold whitespace-nowrap text-accent-text">
              Sélectionner
            </button>
          ) : null}
        </div>
      </div>

      {annonce ? (
        <p role="status" className="rounded-xl bg-ok-bg px-4 py-3 text-[15px] font-semibold text-ok">
          {annonce}
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      {error ? (
        <ErrorNotice
          error={error}
          onRetry={() => {
            setMoreError(null);
            reload();
          }}
        />
      ) : null}
      {items === null && !error ? <Skeleton lines={4} label="Chargement des listes…" /> : null}
      {items && items.length > 0 ? (
        <>
          <p className="sr-only" aria-live="polite">
            {items.length > 1 ? `${items.length} listes` : "1 liste"}
          </p>
          <ul className={`grid grid-cols-1 gap-2.5 lg:grid-cols-2 ${selection ? "pb-24" : ""}`}>
            {items.map((p) => (
              <li key={p.id}>
                <CarteListe
                  projet={p}
                  selection={selection ? { coche: selection.has(p.id), basculer: () => setSelection((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; }) } : null}
                  occupe={verif}
                  onSupprimer={() => void demanderSuppression([p])}
                  onTerminer={() => void basculerTerminee(p)}
                />
              </li>
            ))}
          </ul>
          {cursor ? (
            <Button variant="secondary" pending={loadingMore} onClick={() => void loadMore()}>
              {fr.actions.loadMore}
            </Button>
          ) : null}
        </>
      ) : null}
      {items && items.length === 0 ? (
        q.trim() ? (
          <EmptyState icon={<Search size={40} />} title="Aucune liste trouvée">
            <p className="max-w-xs text-[16px] text-muted">Essaie un nom de liste, un client, une ville ou une partie de l&apos;adresse.</p>
          </EmptyState>
        ) : (
          <EmptyState icon={<ClipboardList size={40} />} title={filter === "terminees" ? "Aucune liste terminée" : filter === "en-cours" ? "Aucune liste en cours" : "Aucune liste pour l'instant"}>
            {filter !== "terminees" ? <ButtonLink href="/chantiers/nouveau">Nouvelle liste</ButtonLink> : null}
          </EmptyState>
        )
      ) : null}

      {/* La barre de la sélection : au-dessus de la barre du menu sur téléphone, jamais dessous. */}
      {selection ? (
        <div role="region" aria-label="Sélection" className="fixed inset-x-0 bottom-[calc(var(--nav-space,0px))] z-40 flex justify-center px-4 pb-3 lg:bottom-0 lg:left-64 lg:pb-5">
          <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl bg-surface p-2.5 text-ink shadow-float ring-1 ring-ink/10">
            <span className="grow pl-2 text-[15px] font-semibold">{choisies.length > 1 ? `${choisies.length} listes choisies` : choisies.length === 1 ? "1 liste choisie" : "Choisis des listes"}</span>
            <button type="button" onClick={() => setSelection(null)} className="pressable min-h-11 rounded-xl border border-line px-4 text-[15px] font-semibold">
              Annuler
            </button>
            <button type="button" disabled={choisies.length === 0 || verif} onClick={() => void demanderSuppression(choisies)} className="pressable min-h-11 rounded-xl bg-danger px-4 text-[15px] font-bold text-white disabled:opacity-50">
              Supprimer ({choisies.length})
            </button>
          </div>
        </div>
      ) : null}

      {aSupprimer ? <ConfirmerSuppression listes={aSupprimer} onAnnuler={() => setASupprimer(null)} onFait={supprimees} /> : null}
      {refus ? (
        <ListeNonSupprimable
          refus={refus.refus}
          autres={refus.autres}
          onFermer={() => setRefus(null)}
          onTerminer={(() => {
            const seule = refus.refus.length === 1 && refus.autres.length === 0 ? items?.find((p) => p.id === refus.refus[0]!.id) : undefined;
            return seule && seule.status !== "archived" ? () => void basculerTerminee(seule) : undefined;
          })()}
          onSupprimerAutres={() => {
            const autres = refus.autres;
            setRefus(null);
            setASupprimer(autres);
          }}
        />
      ) : null}
    </>
  );
}

export default function ChantiersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MesListes />
    </Suspense>
  );
}
