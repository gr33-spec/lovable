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
 * ailleurs). Un seul bouton jaune : « Ajouter ma liste à un achat groupé » ; aucun paragraphe d'explication (Greg, 27 octobre :
 * « trop d'info »).
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
      {/* Ordinateur (Greg, 31 octobre 2026, soir) : le titre et « Ajouter ma liste » sur une ligne ; à gauche les achats
          groupés, à droite comment ça marche et l'invitation. Téléphone : l'ordre d'avant. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <PageTitle>Achats groupés</PageTitle>
        <ButtonLink href="/achats-groupes/lancer" className="w-full lg:w-auto lg:px-6">
          Ajouter ma liste à un achat groupé
        </ButtonLink>
      </div>
      {mes?.exclusion ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {mes.exclusion}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {pres && pres.achats.length > 0 ? (
            <section aria-label="Achats groupés près de chez toi" className="flex flex-col gap-3">
              <SectionTitle>Achats groupés de ton métier près de chez toi</SectionTitle>
              <div className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-2">
                {pres.achats.map((a) => (
                  <CarteAchatOuvert key={a.id} a={a} />
                ))}
              </div>
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
              <p className="text-[15px] text-muted">Ouvre le premier : les artisans de ton métier dans le secteur sont prévenus.</p>
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
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-8">
          <CommentCaMarcheOrdinateur />
          {/* Point 8 : la grande carte « Inviter un collègue » passe sous la liste. */}
          <InviterCollegue texte="Plus on est nombreux dans le secteur, meilleur est le prix." />
        </div>
      </div>
    </div>
  );
}

/** Ordinateur seulement : l'achat groupé en trois étapes, à côté de la liste (sur téléphone, la page reste courte). */
function CommentCaMarcheOrdinateur() {
  const etapes = [
    ["Ajoute ta liste", "Les lignes de ton métier, ta commune, ta date et au moins un négoce."],
    ["Les négoces chiffrent", "Ils reçoivent le volume de tous, jamais ton nom. Gratuit, à chaque fois."],
    ["Tu commandes au mieux", "Chez le moins cher entre la meilleure offre du groupe et ton négoce habituel."],
  ] as const;
  return (
    <section aria-label="Comment marche un achat groupé" className="hidden flex-col gap-4 rounded-2xl border border-line p-5 lg:flex">
      <p className="text-[17px] font-extrabold">Comment ça marche</p>
      <ol className="flex flex-col gap-4">
        {etapes.map(([titre, texte], i) => (
          <li key={titre} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[14px] font-extrabold text-on-accent tabular-nums">{i + 1}</span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{titre}</span>
              <span className="text-[14px] leading-snug text-muted">{texte}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
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
