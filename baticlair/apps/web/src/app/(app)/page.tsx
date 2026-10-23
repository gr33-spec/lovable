"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Search, Sparkles, Warehouse } from "lucide-react";
import { useCallback } from "react";
import { InstallHint } from "@/components/install-hint";
import { useBilling } from "@/components/paywall";
import { ProjectList } from "@/components/project-row";
import { ButtonLink, ErrorNotice, ListCard, ListRow, SectionTitle, Skeleton } from "@/components/ui";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import { InviterCollegue } from "@/components/inviter";
import { BlocDuMois, useProchaineCommande } from "@/components/commande-du-mois";

export default function AccueilPage() {
  const router = useRouter();
  const { me, features } = useSession();
  const fetchRecent = useCallback((signal: AbortSignal) => api<ProjectPage>("/v1/projects?limit=3", { signal }), []);
  const { data: recent, error, reload } = useResource(fetchRecent);
  const fetchNext = useCallback((signal: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal }), []);
  const { data: next, reload: reloadNext } = useResource(fetchNext);
  const { data: billing } = useBilling();
  // Greg (23 octobre) : la commande du mois en haut de l'accueil, avec son minuteur, TOUJOURS (règle par défaut si l'API
  // ne répond pas) : n'importe qui comprend en 10 secondes.
  const moisActif = features.groupe === true && features.commandeCommune !== "lots";
  const mois = useProchaineCommande(moisActif);

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
      href: "/formules",
      action: "Voir les formules",
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
        <h1 className="max-w-[18ch] text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">Paie tes matériaux moins cher. Donne ta liste, je fais jouer les négoces.</h1>
        <ButtonLink href="/chantiers/nouveau" className="w-full max-w-sm">
          Donner ma liste
        </ButtonLink>
        {/* Landing du 22 octobre : « Inviter un collègue » aussi dans l'app, juste après l'inscription. */}
        <div className="w-full max-w-xl text-left">
          <InviterCollegue texte="Plus on est nombreux dans le secteur, plus on pèse face aux négoces." />
        </div>
      </div>
    );
  }

  const chargement = (recent === null || next === null) && !error;
  return (
    <>
      {/* Passe UI/UX : le prénom d'abord, en très grand ; la recherche dessous. */}
      <h1 className="text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">Bonjour {firstName}</h1>
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

      {/* Le squelette seulement pendant le chargement ; ensuite le bloc, avec les dates de l'API ou la règle par défaut. */}
      {mois.prochaine ? <BlocDuMois prochaine={mois.prochaine} /> : mois.loading && moisActif ? <Skeleton card="h-64" label="Chargement de la commande du mois…" /> : null}

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
          <SectionTitle>Chantiers récents</SectionTitle>
          <Link href="/chantiers" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent-text">
            Tous
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
