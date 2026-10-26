"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MailCheck, Plus, Search, Sparkles, Users, Warehouse } from "lucide-react";
import { useCallback } from "react";
import { InstallHint } from "@/components/install-hint";
import { BandeauReprises } from "@/components/reprises";
import { useBilling } from "@/components/paywall";
import { ProjectList } from "@/components/project-row";
import { ButtonLink, ErrorNotice, ListCard, ListRow, SectionTitle, Skeleton } from "@/components/ui";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import { InviterCollegue } from "@/components/inviter";
import { BoucleNegoce } from "@/components/boucle-negoce";
import type { MesBesoins } from "@/lib/negocie";
import type { Droits, ListeRegroupements } from "@/lib/recentrage";
import { useAncienMode } from "@/components/negocie";

export default function AccueilPage() {
  const router = useRouter();
  const { me, features } = useSession();
  const fetchRecent = useCallback((signal: AbortSignal) => api<ProjectPage>("/v1/projects?limit=3", { signal }), []);
  const { data: recent, error, reload } = useResource(fetchRecent);
  const fetchNext = useCallback((signal: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal }), []);
  const { data: next, reload: reloadNext } = useResource(fetchNext);
  const { data: billing } = useBilling();
  // Recentrage (Greg, 25 octobre 2026) : l'encart « Regroupements en cours » n'apparaît que s'il existe un regroupement
  // pertinent pour cet artisan ; jamais de liste vide. Le préavis de fin de payant offert, s'il court.
  const moisActif = useAncienMode() && features.commandeCommune !== "lots";
  const fetchRegroupements = useCallback((signal: AbortSignal) => (moisActif ? api<ListeRegroupements>("/v1/regroupements", { signal }) : Promise.resolve(null)), [moisActif]);
  const { data: regroupements } = useResource(fetchRegroupements);
  // Business model final (même jour) : en mode humain, l'encart compte les besoins négociés et les veilles à trancher.
  const fetchNegocie = useCallback((signal: AbortSignal) => api<MesBesoins>("/v1/negocie", { signal }).catch(() => null), []);
  const { data: negocie } = useResource(fetchNegocie);
  const enCours = negocie?.mode === "humain" ? negocie.besoins.filter((b) => b.statut === "declare").length + negocie.veille.filter((v) => v.regroupementDisponible).length : (regroupements?.regroupements.length ?? 0);
  const offreAAccepter = negocie?.mode === "humain" && negocie.besoins.some((b) => b.statut === "declare" && b.offre?.valide);
  const fetchDroits = useCallback((signal: AbortSignal) => api<Droits>("/v1/droits", { signal }), []);
  const { data: droits } = useResource(fetchDroits);

  const firstName = me.user.name.split(" ")[0] ?? me.user.name;
  const todo: { key: string; title: string; text: string; href: string; action: string; icon: React.ReactNode }[] = (next?.items ?? []).slice(0, 5).map((a) => ({
    key: a.projectId,
    title: a.projectName,
    text: a.detail ?? "",
    href: `/chantiers/${a.projectId}#${a.target}`,
    action: a.label,
    icon: <Warehouse size={20} aria-hidden="true" />,
  }));
  if (billing?.limitReached) {
    todo.unshift({
      key: "plan",
      title: billing.plan.key === "trial" ? "Ton essai est terminé" : "Limite de ta formule atteinte",
      text: "Choisis une formule pour créer de nouveaux chantiers.",
      href: "/abonnement",
      action: "Voir",
      icon: <Sparkles size={20} aria-hidden="true" />,
    });
  }
  if (!me.user.emailVerified && features.email) {
    todo.push({ key: "email", title: "Confirme ton adresse e-mail", text: "Nécessaire avant d'écrire à tes négoces.", href: "/compte", action: "Voir", icon: <MailCheck size={20} aria-hidden="true" /> });
  }

  // Simplification (21 octobre) : accueil vide = une phrase et un bouton, rien d'autre. Nouveau cap (22 octobre) : la promesse.
  if (recent && recent.items.length === 0 && !error) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 text-center">
        <h1 className="max-w-[18ch] text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">Bonjour {firstName}. Dépose ton devis, ton quantitatif est prêt en quelques minutes.</h1>
        <ButtonLink href="/chantiers/nouveau" className="w-full max-w-sm">
          <Plus size={20} aria-hidden="true" /> Nouveau chantier
        </ButtonLink>
        {/* Landing du 22 octobre : « Inviter un collègue » aussi dans l'app, juste après l'inscription. */}
        <div className="flex w-full max-w-xl flex-col gap-4 text-left">
          <BandeauReprises />
          <InviterCollegue texte="Plus on est nombreux dans le secteur, plus on pèse face aux négoces." />
          {moisActif ? <BoucleNegoce compact /> : null}
        </div>
      </div>
    );
  }

  const chargement = (recent === null || next === null) && !error;
  return (
    <>
      {/* Maquette du 25 octobre : le prénom, le gros bouton « Nouveau chantier » d'abord. */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">Bonjour {firstName}</h1>
        <p className="text-[16px] text-muted">Ton devis, ton quantitatif, tes prix : tout part d&apos;ici.</p>
      </div>
      <ButtonLink href="/chantiers/nouveau" className="w-full">
        <Plus size={20} aria-hidden="true" /> Nouveau chantier
      </ButtonLink>
      <BandeauReprises />
      {droits?.preavis ? (
        <p role="status" className="rounded-xl bg-accent-soft p-4 text-[15px] font-semibold text-ink">
          {droits.preavis}
        </p>
      ) : null}
      {enCours > 0 ? (
        <Link href="/regroupements" aria-label={`Regroupements en cours : ${enCours}`} className="pressable flex items-center gap-4 rounded-2xl bg-accent-soft p-4 shadow-card">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-ink" aria-hidden="true">
            <Users size={24} />
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[16px] font-extrabold">
              Regroupements en cours
              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-[13px] font-extrabold text-on-accent">{enCours}</span>
            </span>
            <span className="text-[14px] text-muted">{offreAAccepter ? "Une offre négociée t'attend : accepte ou refuse." : "D'autres artisans du secteur ont besoin des mêmes gros matériaux que toi."}</span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ) : null}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          router.push(q ? `/chantiers?q=${encodeURIComponent(q)}` : "/chantiers");
        }}
      >
        <label htmlFor="home-search" className="sr-only">
          Chercher un chantier, un client ou une adresse
        </label>
        <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 transition-[border-color] duration-150 focus-within:border-accent">
          <Search size={20} className="text-muted" aria-hidden="true" />
          <input id="home-search" name="q" type="search" enterKeyHint="search" placeholder="Chantier, client, adresse…" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" />
        </div>
      </form>

      {/* « À faire » : une liste blanche, chaque ligne est un lien (plus de bouton plein en concurrence avec celui du mois). */}
      <section aria-labelledby="todo-title" className="flex flex-col gap-3">
        <SectionTitle id="todo-title">{chargement ? "À faire" : todo.length === 0 ? "Tout est à jour" : `${todo.length} action${todo.length > 1 ? "s" : ""} à faire`}</SectionTitle>
        {chargement ? (
          <Skeleton lines={2} label="Chargement de ce qu'il y a à faire…" />
        ) : todo.length === 0 ? (
          <p className="rounded-xl bg-surface px-4 py-4 text-[15px] text-muted shadow-card">Rien à faire pour l&apos;instant.</p>
        ) : (
          <ListCard>
            {todo.map((t) => (
              <ListRow key={t.key} href={t.href} icon={t.icon} title={t.title} subtitle={t.text ? `${t.text} · ${t.action}` : t.action} />
            ))}
          </ListCard>
        )}
      </section>
      {/* Revue à froid (21 octobre) : le conseil « écran d'accueil » vient après ce qu'il y a à faire, jamais avant. */}
      <InstallHint />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <SectionTitle>Mes chantiers</SectionTitle>
          <Link href="/chantiers" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent-text">
            Voir tout
          </Link>
        </div>
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {recent === null && !error ? <Skeleton lines={3} label="Chargement des chantiers…" /> : null}
        {/* Toujours montée : le bandeau « Annuler » survit au dernier chantier rangé. */}
        {recent ? (
          <ProjectList
            projects={recent.items}
            show="active"
            onChanged={() => {
              reload();
              reloadNext();
            }}
          />
        ) : null}
      </section>
    </>
  );
}
