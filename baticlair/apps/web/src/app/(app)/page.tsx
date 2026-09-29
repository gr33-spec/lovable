"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Search, Warehouse } from "lucide-react";
import { useCallback } from "react";
import { ProjectList } from "@/components/project-row";
import { ErrorNotice, Spinner } from "@/components/ui";
import { api, type ProjectPage } from "@/lib/api";
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

  const firstName = me.user.name.split(" ")[0] ?? me.user.name;
  const todo: { key: string; title: string; text: string; href: string; action: string; icon: React.ReactNode }[] = [];
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
      <h1 className="mt-1.5 font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">Bonjour {firstName}</h1>

      <section aria-labelledby="todo-title" className="flex flex-col gap-1 rounded-[28px] bg-[radial-gradient(130%_90%_at_100%_0%,rgba(255,90,31,0.45)_0%,rgba(255,90,31,0)_55%)] bg-ink px-4 pt-4.5 pb-2.5 text-white shadow-[0_18px_40px_rgba(14,17,22,0.22)]">
        <h2 id="todo-title" className="pb-1.5 font-display text-[22px] font-extrabold tracking-[-0.02em]">
          À faire
        </h2>
        {recent === null && !error ? (
          <p className="border-t border-white/10 py-3 text-sm text-[#c9ced6]">Chargement…</p>
        ) : todo.length === 0 ? (
          <p className="border-t border-white/10 py-3 text-[15px] text-[#c9ced6]">Rien d&apos;urgent. Vos chantiers sont à jour.</p>
        ) : (
          todo.map((t) => (
            <div key={t.key} className="flex items-center gap-3 border-t border-white/10 py-2.5">
              <span className="text-[#ffb48f]">{t.icon}</span>
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[15px] font-bold">{t.title}</span>
                <span className="text-[13px] text-[#c9ced6]">{t.text}</span>
              </span>
              <Link href={t.href} className="inline-flex min-h-10 items-center rounded-xl bg-accent px-3.5 text-[13px] font-extrabold">
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
        {recent && recent.items.length > 0 ? <ProjectList projects={recent.items} /> : null}
        {recent && recent.items.length === 0 ? (
          <p className="rounded-3xl bg-surface p-4 text-[15px] text-muted shadow-card">Aucun chantier pour l&apos;instant. Touchez « + » pour en créer un.</p>
        ) : null}
      </section>
    </>
  );
}
