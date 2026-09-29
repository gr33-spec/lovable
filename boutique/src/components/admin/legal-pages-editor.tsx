"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLegalPageAction } from "@/app/admin/actions";
import { hasPlaceholders } from "@/lib/rich-text";
import { useToast } from "./ui";

export function LegalPagesEditor({ pages }: { pages: { slug: string; title: string; body: string }[] }) {
  const [slug, setSlug] = useState(pages[0]?.slug ?? "");
  const page = pages.find((p) => p.slug === slug);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(pages.map((p) => [p.slug, { title: p.title, body: p.body }])));
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!page) return null;
  const draft = drafts[slug];
  return (
    <section id="pages" className="mt-12 scroll-mt-6" aria-labelledby="titre-pages">
      <h2 id="titre-pages" className="mb-1 font-serif text-2xl">
        Pages légales
      </h2>
      <p className="mb-3 text-sm text-text-2">Les passages entre crochets « [À COMPLÉTER …] » apparaissent surlignés sur le site tant qu&apos;ils ne sont pas remplacés.</p>
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {pages.map((p) => (
            <button key={p.slug} type="button" className="chip" aria-pressed={p.slug === slug} onClick={() => setSlug(p.slug)}>
              {drafts[p.slug].title}
              {hasPlaceholders(drafts[p.slug].body) && <span className="h-2 w-2 rounded-full bg-warning" aria-label="à compléter" />}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="field-label">Titre</span>
          <input className="input" value={draft.title} maxLength={120} onChange={(e) => setDrafts({ ...drafts, [slug]: { ...draft, title: e.target.value } })} />
        </label>
        <label className="block">
          <span className="field-label">Texte</span>
          <textarea className="input !min-h-80 font-mono text-sm" value={draft.body} onChange={(e) => setDrafts({ ...drafts, [slug]: { ...draft, body: e.target.value } })} />
          <span className="field-hint">« ## Titre » pour un intertitre, « - » pour une liste, **texte** pour du gras, [texte](https://…) pour un lien.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveLegalPageAction(slug, draft.title, draft.body);
                if (res.ok) {
                  toast("Page enregistrée.");
                  router.refresh();
                } else toast(res.error, "error");
              })
            }
          >
            Enregistrer cette page
          </button>
          <a href={`/${slug}`} target="_blank" className="btn btn-ghost btn-sm">
            Voir la page
          </a>
        </div>
      </div>
    </section>
  );
}
