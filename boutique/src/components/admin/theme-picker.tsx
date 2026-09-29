"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveThemeAction } from "@/app/admin/actions";
import { THEMES, themeStyle } from "@/lib/themes";
import { useToast } from "./ui";

// Choix du thème : chaque carte est un vrai aperçu (bouton, carte, prix) dans
// les couleurs du thème. Tous les thèmes ont des contrastes vérifiés.
export function ThemePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <section className="mb-10" aria-labelledby="titre-theme">
      <h2 id="titre-theme" className="mb-1 font-serif text-2xl">
        Couleurs du site
      </h2>
      <p className="mb-4 text-sm text-text-2">Touchez un thème pour l&apos;appliquer à toute la boutique. Tous sont lisibles et accessibles.</p>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Thème">
        {THEMES.map((t) => {
          const active = selected === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => {
                  if (active) return;
                  const previous = selected;
                  setSelected(t.id);
                  start(async () => {
                    const res = await saveThemeAction(t.id);
                    if (res.ok) {
                      toast(`Thème « ${t.name} » appliqué à toute la boutique.`);
                      router.refresh();
                    } else {
                      setSelected(previous);
                      toast(res.error, "error");
                    }
                  });
                }}
                className={`relative block w-full overflow-hidden rounded-2xl border-2 text-left transition ${active ? "border-text shadow-lift" : "border-border hover:border-text/40"}`}
                style={themeStyle(t)}
              >
                <div className="p-3" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
                  <div className="rounded-xl p-2.5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                    <div className="h-12 rounded-lg" style={{ background: "linear-gradient(135deg, var(--c-primary-light), var(--c-secondary))" }} />
                    <p className="mt-2 font-serif text-[15px] leading-tight">Fleurs pailletées</p>
                    <p className="text-xs" style={{ color: "var(--c-text-2)" }}>
                      24 €
                    </p>
                    <span className="mt-2 block rounded-full py-1.5 text-center text-[11px] font-semibold" style={{ background: "var(--c-primary)", color: "var(--c-on-primary)" }}>
                      Ajouter au panier
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1" aria-hidden="true">
                    {[t.tokens.primary, t.tokens.accent, t.tokens.secondary, t.tokens.background].map((c) => (
                      <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-border bg-surface px-3 py-2">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    {active && <Check size={15} aria-hidden="true" />} {t.name}
                  </p>
                  <p className="text-xs text-text-2">{t.description}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
