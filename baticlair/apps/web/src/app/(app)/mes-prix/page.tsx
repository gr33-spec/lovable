"use client";

import { Tags } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { PrixObservesSecteur } from "@/components/negocie";
import { ButtonLink, Card, EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { euros, jourFr, type MesPrix } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * « MES PRIX » (Greg, 25 octobre 2026 : « ce qui fait rester ») : l'historique des prix reçus et payés PAR TOI, article par
 * article : dernier prix, meilleur prix, négoce, date. Jamais le prix d'un autre artisan. En gratuit, les 3 derniers mois.
 */
export default function MesPrixPage() {
  const fetcher = useCallback((signal: AbortSignal) => api<MesPrix>("/v1/mes-prix", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  const [q, setQ] = useState("");
  const articles = useMemo(() => (data?.articles ?? []).filter((a) => !q.trim() || a.designation.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PageTitle>Mes prix</PageTitle>
        <p className="text-[16px] leading-relaxed text-muted">Tes prix reçus et payés, article par article : ton repère pour négocier. Personne d&apos;autre ne les voit.</p>
      </div>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Skeleton lines={4} label="Chargement de tes prix…" /> : null}
      {data && data.formule === "gratuit" ? (
        <p className="rounded-xl bg-accent-soft p-4 text-[15px] text-ink">
          En gratuit, tu vois tes 3 derniers mois. <a href="/abonnement" className="font-bold underline">Abonne-toi</a> pour tout ton historique.
        </p>
      ) : null}
      {data && data.articles.length === 0 ? (
        <EmptyState icon={<Tags size={28} aria-hidden="true" />} title="Pas encore de prix">
          <p className="text-[15px] text-muted">Envoie une demande à tes négoces depuis un chantier : leurs prix arrivent ici.</p>
          <ButtonLink href="/chantiers" variant="secondary" className="mt-3">
            Mes chantiers
          </ButtonLink>
        </EmptyState>
      ) : null}
      {data && data.articles.length > 0 ? (
        <>
          <label htmlFor="mes-prix-recherche" className="sr-only">
            Chercher un article
          </label>
          <input id="mes-prix-recherche" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ardoise, zinc, liteau…" className="min-h-13 rounded-xl border border-line bg-surface px-4 text-[16px] outline-none focus-visible:border-accent" />
          <ul aria-label="Mes prix par article" className="flex flex-col gap-3">
            {articles.map((a) => (
              <li key={a.cle}>
                <Card className="flex flex-col gap-2 p-4">
                  <span className="text-[16px] font-extrabold">{a.designation}</span>
                  <div className="grid grid-cols-2 gap-3 text-[14px]">
                    <div className="flex flex-col">
                      <span className="text-muted">Dernier prix</span>
                      <span className="text-[17px] font-extrabold">
                        {euros(a.dernier.prixHt)} <span className="text-[13px] font-semibold text-muted">HT / {a.unite.replace(/s$/, "")}</span>
                      </span>
                      <span className="text-muted">
                        {a.dernier.negoce} · {jourFr(a.dernier.date)}
                        {a.dernier.source === "paye" ? " · payé" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted">Meilleur prix</span>
                      <span className="text-[17px] font-extrabold text-ok">{euros(a.meilleur.prixHt)}</span>
                      <span className="text-muted">
                        {a.meilleur.negoce} · {jourFr(a.meilleur.date)}
                      </span>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {data ? <PrixObservesSecteur /> : null}
    </div>
  );
}
