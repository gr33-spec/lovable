"use client";

import { Users } from "lucide-react";
import { useCallback } from "react";
import { CarteAchatGroupe, CarteAchatOuvert } from "@/components/achat-groupe";
import { RegroupementsNegocies, useModeRegroupement } from "@/components/negocie";
import { InviterCollegue } from "@/components/inviter";
import { CarteRegroupement } from "@/components/regroupements";
import { ButtonLink, EmptyState, ErrorNotice, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { AchatOuvert, MesAchats } from "@/lib/achat-groupe";
import type { ListeRegroupements } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * L'ONGLET « ACHATS GROUPÉS » (Greg, 27 octobre 2026 ; avant : « Regroupements ») selon le mode : l'achat groupé
 * automatique (défaut), le regroupement négocié par un humain, ou l'ancienne commande du mois (« mois », écrans masqués
 * ailleurs). Un seul bouton jaune : « Ajouter ma liste à un achat groupé ».
 */
export function PageAchatsGroupes() {
  const mode = useModeRegroupement();
  if (mode === null) return <Skeleton card="h-56" lines={2} label="Chargement des achats groupés…" />;
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
  if (mode === "mois") return <RegroupementsAutomatiques />;
  return <AchatsGroupes />;
}

function AchatsGroupes() {
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }), []);
  const fetchPres = useCallback((signal: AbortSignal) => api<{ zone: string | null; achats: AchatOuvert[] }>("/v1/achats-groupes/pres-de-chez-moi", { signal }), []);
  const { data: mes, error, reload } = useResource(fetchMes);
  const { data: pres } = useResource(fetchPres);
  const finis = ["retire", "desiste", "sorti", "non_commande"];
  const actifs = (mes?.achats ?? []).filter((a) => !finis.includes(a.etat));
  const passes = (mes?.achats ?? []).filter((a) => finis.includes(a.etat));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageTitle>Achats groupés</PageTitle>
        <p className="text-[16px] leading-relaxed text-muted">Ta liste rejoint celles des artisans de ton métier et de ton secteur ; les négoces reçoivent une liste propre et font une seule offre, leur meilleur prix.</p>
      </div>
      {mes?.exclusion ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {mes.exclusion}
        </p>
      ) : null}
      <ButtonLink href="/achats-groupes/lancer" className="w-full">
        Ajouter ma liste à un achat groupé
      </ButtonLink>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {pres && pres.achats.length > 0 ? (
        <section aria-label="Achats groupés près de chez toi" className="flex flex-col gap-3">
          <SectionTitle>Achats groupés de ton métier près de chez toi</SectionTitle>
          {pres.achats.map((a) => (
            <CarteAchatOuvert key={a.id} a={a} />
          ))}
        </section>
      ) : null}
      {!mes && !error ? <Skeleton card="h-40" lines={2} label="Chargement de tes achats groupés…" /> : null}
      {mes && actifs.length > 0 ? (
        <section aria-label="Mes achats groupés" className="flex flex-col gap-3">
          <SectionTitle>Mes achats groupés</SectionTitle>
          {actifs.map((c) => (
            <CarteAchatGroupe key={c.id} c={c} />
          ))}
        </section>
      ) : null}
      {mes && actifs.length === 0 && (pres?.achats.length ?? 0) === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Pas encore d'achat groupé dans ton secteur">
          <p className="text-[15px] text-muted">Ouvre le premier : coche les lignes de ta liste, choisis tes négoces. Les artisans de ton métier dans le secteur sont prévenus.</p>
        </EmptyState>
      ) : null}
      {passes.length > 0 ? (
        <section aria-label="Terminés" className="flex flex-col gap-3">
          <SectionTitle>Terminés</SectionTitle>
          {passes.map((c) => (
            <CarteAchatGroupe key={c.id} c={c} />
          ))}
        </section>
      ) : null}
      {/* Point 8 : la grande carte « Inviter un collègue » passe sous la liste. */}
      <InviterCollegue texte="Plus on est nombreux dans le secteur, meilleur est le prix." />
    </div>
  );
}

/** Le mode automatique (consultation des négoces par la machine), derrière l'interrupteur admin. */
export function RegroupementsAutomatiques() {
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
