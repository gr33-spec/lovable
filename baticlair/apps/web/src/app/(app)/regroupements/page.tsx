"use client";

import { Users } from "lucide-react";
import { useCallback } from "react";
import { RegroupementsNegocies, useModeRegroupement } from "@/components/negocie";
import { InviterCollegue } from "@/components/inviter";
import { CarteRegroupement } from "@/components/regroupements";
import { ButtonLink, EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { ListeRegroupements } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * « Regroupements en cours » (Greg, 25 octobre 2026, maquette écran 2) : les regroupements pertinents de la zone de
 * l'artisan, une carte chacun. Hors zone active, la phrase « Les regroupements arrivent bientôt… ».
 */
export default function RegroupementsPage() {
  const mode = useModeRegroupement();
  if (mode === null) return <Skeleton card="h-56" lines={2} label="Chargement des regroupements…" />;
  if (mode === "humain") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <PageTitle>Regroupements</PageTitle>
          <p className="text-[16px] leading-relaxed text-muted">Tes gros besoins rejoignent ceux du secteur. Un chasseur d&apos;opportunités Mobiiz négocie, tu choisis.</p>
        </div>
        <RegroupementsNegocies />
        <InviterCollegue texte="Plus on est nombreux dans le secteur, plus on pèse face aux négoces." />
      </div>
    );
  }
  return <RegroupementsAutomatiques />;
}

/** Le mode automatique (consultation des négoces par la machine), derrière l'interrupteur admin. */
function RegroupementsAutomatiques() {
  const fetcher = useCallback((signal: AbortSignal) => api<ListeRegroupements>("/v1/regroupements", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PageTitle>Regroupements en cours</PageTitle>
        <p className="text-[16px] leading-relaxed text-muted">Rejoins des entreprises du secteur qui ont besoin des mêmes gros matériaux. Les prix ne sont pas affichés.</p>
      </div>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Skeleton card="h-56" lines={2} label="Chargement des regroupements…" /> : null}
      {data && !data.zoneActive ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Pas encore de regroupement dans ton département">
          <p className="text-[15px] text-muted">{data.message}</p>
          <ButtonLink href="/fournisseurs" variant="secondary" className="mt-3">
            Inviter mes négoces
          </ButtonLink>
        </EmptyState>
      ) : null}
      {data && data.zoneActive && data.regroupements.length === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Aucun regroupement en cours pour tes métiers">
          <p className="text-[15px] text-muted">Lance le premier depuis un chantier : sur ta liste, « Tenter un prix de groupe » sur tes gros articles.</p>
          <ButtonLink href="/chantiers" variant="secondary" className="mt-3">
            Mes chantiers
          </ButtonLink>
        </EmptyState>
      ) : null}
      {data?.regroupements.map((r) => <CarteRegroupement key={r.id} r={r} />)}
    </div>
  );
}
