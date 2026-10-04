"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Search, Sparkles, Warehouse } from "lucide-react";
import { useCallback } from "react";
import { DemoCard } from "@/components/demo";
import { useBilling } from "@/components/paywall";
import { ProjectList } from "@/components/project-row";
import { ErrorNotice, Spinner } from "@/components/ui";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";

/** « Jean Martin » → « JM » ; « Jean » → « JE ». */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]!.charAt(0) + words[words.length - 1]!.charAt(0) : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

export default function AccueilPage() {
  const router = useRouter();
  const { me, company, features } = useSession();
  const fetchRecent = useCallback((signal: AbortSignal) => api<ProjectPage>("/v1/projects?limit=3", { signal }), []);
  const { data: recent, error, reload } = useResource(fetchRecent);
  const fetchNext = useCallback((signal: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal }), []);
  const { data: next, reload: reloadNext } = useResource(fetchNext);
  const { data: billing } = useBilling();

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
      title: billing.plan.key === "trial" ? "Votre essai est terminé" : "Limite de votre formule atteinte",
      text: "Choisissez une formule pour créer de nouveaux chantiers.",
      href: "/formules",
      action: "Voir les formules",
      icon: <Sparkles size={20} aria-hidden="true" />,
    });
  }
  if (recent && recent.items.length === 0) {
    todo.push({ key: "first", title: "Créez votre premier chantier", text: "Nom, client, adresse : 30 secondes.", href: "/chantiers/nouveau", action: "Créer", icon: <Warehouse size={20} aria-hidden="true" /> });
  }
  if (!me.user.emailVerified && features.email) {
    todo.push({ key: "email", title: "Confirmez votre adresse e-mail", text: "Nécessaire avant d'écrire à vos fournisseurs.", href: "/compte", action: "Voir", icon: <MailCheck size={20} aria-hidden="true" /> });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-extrabold">{company?.name}</span>
        <Link href="/compte" aria-label="Mon compte" className="flex size-11 items-center justify-center rounded-full bg-surface text-sm font-extrabold shadow-card">
          {initials(me.user.name)}
        </Link>
      </div>
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
        <div className="flex min-h-13 items-center gap-2.5 rounded-2xl bg-surface px-4 shadow-card">
          <Search size={20} className="text-muted" aria-hidden="true" />
          <input id="home-search" name="q" type="search" enterKeyHint="search" placeholder="Chantier, client, adresse…" className="min-h-12 grow bg-transparent text-base outline-none placeholder:text-muted" />
        </div>
      </form>
      <h1 className="mt-1.5 font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">
        Bonjour {firstName}, <span className="font-serif text-[38px] font-normal tracking-normal italic">on avance&nbsp;?</span>
      </h1>

      <section aria-labelledby="todo-title" className="flex flex-col gap-1 rounded-[28px] bg-hero px-4 pt-4.5 pb-2.5 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <h2 id="todo-title" className="pb-1.5 font-display text-[22px] font-extrabold tracking-[-0.02em]">
          {(recent === null || next === null) && !error ? "À faire" : todo.length === 0 ? "Tout est à jour" : `${todo.length} action${todo.length > 1 ? "s" : ""} à faire`}
        </h2>
        {(recent === null || next === null) && !error ? (
          <p className="border-t border-white/10 py-3 text-sm text-[#c9ced6]">Chargement…</p>
        ) : todo.length === 0 ? (
          <p className="border-t border-white/10 py-3 text-[15px] text-[#c9ced6]">Rien à faire pour l&apos;instant.</p>
        ) : (
          todo.map((t) => (
            <div key={t.key} className="flex flex-col gap-2 border-t border-white/10 py-3">
              <span className="flex items-center gap-3">
                <span className="text-accent-on-dark">{t.icon}</span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold">{t.title}</span>
                  {t.text ? <span className="text-[13px] text-[#c9ced6]">{t.text}</span> : null}
                </span>
              </span>
              <Link href={t.href} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cta px-3.5 text-[15px] font-extrabold shadow-cta">
                {t.action}
              </Link>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold tracking-[-0.01em]">Chantiers récents</h2>
          <Link href="/chantiers" className="inline-flex min-h-9 items-center text-sm font-bold text-accent-text">
            Tous
          </Link>
        </div>
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {recent === null && !error ? <Spinner /> : null}
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
        {recent && recent.items.length === 0 ? (
          <p className="rounded-3xl bg-surface p-4 text-[15px] text-muted shadow-card">Aucun chantier pour l&apos;instant. Touchez « + » pour en créer un.</p>
        ) : null}
      </section>

      <DemoCard />
    </>
  );
}
