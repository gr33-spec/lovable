"use client";

import { Plus, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { CarteAchatGroupe, CarteAchatOuvert } from "@/components/achat-groupe";
import { RegroupementsNegocies, useModeRegroupement } from "@/components/negocie";
import { InviterCollegue } from "@/components/inviter";
import { CarteRegroupement } from "@/components/regroupements";
import { EconomiesGroupeCard } from "@/components/economies-groupe";
import { Button, ButtonLink, EmptyState, ErrorNotice, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { RapprochementsPanneau } from "@/components/rapprochement";
import { PHRASE_COLLECTIF } from "@/lib/rapprochement";
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
  return (
    <Suspense fallback={<Skeleton card="h-56" lines={2} label="Chargement des achats groupés…" />}>
      <AchatsGroupes />
    </Suspense>
  );
}

type Vue = "decouvrir" | "mes-groupes";
const VUES: { value: Vue; label: string }[] = [
  { value: "decouvrir", label: "Découvrir" },
  { value: "mes-groupes", label: "Mes groupes" },
];
/** Les anciennes adresses (« ?vue=ouvertes », « participations », « propositions ») restent valables. */
const ANCIENNES: Record<string, Vue> = { decouvrir: "decouvrir", ouvertes: "decouvrir", "mes-groupes": "mes-groupes", participations: "mes-groupes", propositions: "mes-groupes" };

interface Decouverte {
  zone: string | null;
  departement: string | null;
  familles: string[];
  /** Les noms des familles et la phrase du collectif viennent du serveur (le domaine ne s'importe pas tel quel ici). */
  libellesFamilles: Record<string, string>;
  collectif: string;
  achats: (AchatOuvert & { famille: string; dejaDedans: boolean })[];
}

/**
 * L'ESPACE « GROUPES » (Greg, 6 novembre 2026, point 10) : « Découvrir » (les collectes ouvertes, cherchées comme des
 * annonces, sans filtre de métier : produit, famille, département, date de clôture) et « Mes groupes » (mes rapprochements
 * à examiner, mes participations, mes propositions). La vue et les filtres vivent dans l'adresse.
 */
function AchatsGroupes() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }), []);
  const { data: mes, error, reload } = useResource(fetchMes);
  const finis = ["retire", "desiste", "sorti", "non_commande"];
  const actifs = (mes?.achats ?? []).filter((a) => !finis.includes(a.etat));
  const passes = (mes?.achats ?? []).filter((a) => finis.includes(a.etat));
  const proposees = actifs.filter((a) => a.jePropose);
  const participations = actifs.filter((a) => !a.jePropose);
  const vue: Vue = ANCIENNES[params.get("vue") ?? ""] ?? (actifs.length > 0 ? "mes-groupes" : "decouvrir");
  const choisir = (v: Vue) => router.replace(`${pathname}?vue=${v}`, { scroll: false });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageTitle>Groupes</PageTitle>
        <ButtonLink href="/achats-groupes/lancer" className="w-full lg:w-auto lg:px-6">
          <Plus size={18} aria-hidden="true" /> Proposer un besoin groupé
        </ButtonLink>
      </div>
      {mes?.exclusion ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {mes.exclusion}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      <div role="tablist" aria-label="Vues des groupes" className="flex flex-wrap gap-1.5 pb-1">
        {VUES.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={vue === v.value}
            onClick={() => choisir(v.value)}
            className={`pressable min-h-11 shrink-0 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap ${vue === v.value ? "bg-ink text-white" : "border border-line bg-surface text-ink active:bg-ground"}`}
          >
            {v.label}
            {v.value === "mes-groupes" && mes && actifs.length ? <span className="ml-1.5 tabular-nums opacity-70">{actifs.length}</span> : null}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div role="tabpanel" aria-label={VUES.find((v) => v.value === vue)!.label} className="flex min-w-0 flex-col gap-3">
          {vue === "decouvrir" ? <Decouvrir /> : null}
          {vue === "mes-groupes" ? (
            <>
              <RapprochementsPanneau />
              {!mes && !error ? <Skeleton card="h-40" lines={2} label="Chargement de tes groupes…" /> : null}
              {mes && actifs.length === 0 && passes.length === 0 ? (
                <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Aucun groupe pour l'instant">
                  <p className="text-[15px] text-muted">Découvre les collectes ouvertes, ou laisse des lignes de ta demande chercher des besoins compatibles.</p>
                </EmptyState>
              ) : null}
              {participations.length > 0 ? (
                <section aria-label="Mes participations" className="flex flex-col gap-3">
                  <SectionTitle>Mes participations</SectionTitle>
                  {participations.map((c) => (
                    <CarteAchatGroupe key={c.id} c={c} />
                  ))}
                </section>
              ) : null}
              {proposees.length > 0 ? (
                <section aria-label="Mes propositions" className="flex flex-col gap-3">
                  <SectionTitle>Mes propositions</SectionTitle>
                  {proposees.map((c) => (
                    <CarteAchatGroupe key={c.id} c={c} />
                  ))}
                </section>
              ) : null}
              {passes.length > 0 ? (
                <section aria-label="Terminés" className="flex flex-col gap-3 pt-2">
                  <SectionTitle>Terminés</SectionTitle>
                  {passes.map((c) => (
                    <CarteAchatGroupe key={c.id} c={c} />
                  ))}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-8">
          {/* Greg, 1er novembre 2026 : le compteur d'économies quitte Profil (absent tant que rien n'est commandé en groupe). */}
          <EconomiesGroupeCard />
          <CommentCaMarcheOrdinateur />
          <p className="hidden text-[14px] leading-snug text-muted lg:block">{PHRASE_COLLECTIF}</p>
          {/* Point 8 : la grande carte « Inviter un collègue » passe sous la liste. */}
          <InviterCollegue texte="Plus on est nombreux dans le secteur, meilleur est le prix." />
        </div>
      </div>
    </div>
  );
}

/**
 * « Découvrir » : les filtres (produit, famille, département, clôture avant) dans l'adresse ; aucune collecte vide, aucun
 * compteur gonflé (les entreprises ne sont comptées qu'à partir du seuil d'anonymat), jamais le détail d'un artisan.
 */
function Decouvrir() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const famille = params.get("famille") ?? "";
  const departement = params.get("departement") ?? "";
  const clotureAvant = params.get("clotureAvant") ?? "";
  const requete = new URLSearchParams({ ...(q ? { q } : {}), ...(famille ? { famille } : {}), ...(departement ? { departement } : {}), ...(clotureAvant ? { clotureAvant } : {}) }).toString();
  const fetcher = useCallback((signal: AbortSignal) => api<Decouverte>(`/v1/achats-groupes/decouvrir${requete ? `?${requete}` : ""}`, { signal }), [requete]);
  const { data, error, reload } = useResource(fetcher);
  const [texte, setTexte] = useState(q);
  const changer = (cle: string, valeur: string) => {
    const suite = new URLSearchParams(params.toString());
    suite.set("vue", "decouvrir");
    if (valeur) suite.set(cle, valeur);
    else suite.delete(cle);
    router.replace(`${pathname}?${suite.toString()}`, { scroll: false });
  };
  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        aria-label="Chercher une collecte"
        onSubmit={(e) => {
          e.preventDefault();
          changer("q", texte.trim());
        }}
        className="flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-card"
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="decouvrir-q">
            Matériau ou produit
          </label>
          <input id="decouvrir-q" type="search" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Matériau ou produit (ex. ardoise 32×22)" className="min-h-11 min-w-0 grow rounded-lg border border-line bg-surface px-3 text-[16px]" />
          <Button type="submit" className="shrink-0 px-4">
            Chercher
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Famille
            <select value={famille} onChange={(e) => changer("famille", e.target.value)} className="min-h-11 rounded-lg border border-line bg-surface px-2 text-[15px] font-normal">
              <option value="">Toutes</option>
              {(data?.familles ?? []).map((f) => (
                <option key={f} value={f}>
                  {data?.libellesFamilles[f] ?? f}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Département
            <select value={departement || data?.zone || ""} onChange={(e) => changer("departement", e.target.value)} className="min-h-11 rounded-lg border border-line bg-surface px-2 text-[15px] font-normal">
              {data?.zone ? <option value={data.zone}>Mon secteur ({data.zone})</option> : null}
              <option value="tous">Tous les départements</option>
              {DEPARTEMENTS.filter((d) => d !== data?.zone).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Clôture avant le
            <input type="date" value={clotureAvant} onChange={(e) => changer("clotureAvant", e.target.value)} className="min-h-11 rounded-lg border border-line bg-surface px-2 text-[15px] font-normal" />
          </label>
        </div>
      </form>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Skeleton card="h-40" lines={2} label="Chargement des collectes…" /> : null}
      {data && data.achats.length === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Aucune collecte ouverte avec ces critères">
          <p className="text-[15px] text-muted">Élargis la recherche, ou propose un besoin groupé.</p>
        </EmptyState>
      ) : null}
      {data && data.achats.length > 0 ? (
        <div className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-2">
          {data.achats.map((a) => (
            <CarteAchatOuvert key={a.id} a={a} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const DEPARTEMENTS = [...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, "0")).filter((d) => d !== "20"), "2A", "2B"];

/** Ordinateur seulement : l'achat groupé en trois étapes, à côté de la liste (sur téléphone, la page reste courte). */
function CommentCaMarcheOrdinateur() {
  const etapes = [
    ["Ajoute tes quantités", "Les lignes de ton métier, ta commune, ta date et au moins un négoce."],
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
            Mes demandes
          </ButtonLink>
        </EmptyState>
      ) : null}
      {data?.regroupements.map((r) => <CarteRegroupement key={r.id} r={r} />)}
    </div>
  );
}
