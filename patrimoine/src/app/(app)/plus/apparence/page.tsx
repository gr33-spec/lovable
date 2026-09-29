"use client";

import { Check, FileText, Home, KeyRound, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { paletteChecks, paletteFor, themeDef, THEMES } from "@/lib/theme";
import { Card, Page, PageHeader, SectionTitle } from "@/components/ui";
import { toast } from "@/components/swipe";

export default function ApparencePage() {
  const { data, role, setSettings } = useStore();
  const current = themeDef(data.settings.theme);
  const checks = paletteChecks(paletteFor(current.base));
  const worst = Math.min(...checks.filter((c) => c.min === 4.5).map((c) => c.ratio));

  return (
    <>
      <PageHeader title="Apparence" back="/plus" />
      <Page>
        <SectionTitle>Couleur principale</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Couleur principale">
          {THEMES.map((t) => {
            const p = paletteFor(t.base);
            const on = t.id === current.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={role === "lecture"}
                onClick={() => {
                  if (on) return;
                  setSettings({ theme: t.id });
                  toast(`${t.name} appliqué et enregistré`);
                }}
                className={`soft-card flex items-center gap-3 rounded-[22px] p-3.5 text-left transition active:scale-[0.98] ${on ? "ring-2 ring-brand" : ""}`}
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-inner" style={{ background: `linear-gradient(135deg, ${p.brandGlow} 0%, ${p.brand} 55%, ${p.deep} 100%)` }}>
                  {on && <Check size={20} className="text-white" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight text-ink">{t.name}</span>
                  <span className="mt-1 flex gap-1" aria-hidden>
                    {[p.brand, p.brandSoft, p.deep].map((c) => (
                      <span key={c} className="h-2.5 w-5 rounded-full ring-1 ring-black/5" style={{ background: c }} />
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-muted">Touchez une couleur : toute l&apos;application change aussitôt, et le choix est enregistré automatiquement (il vous suit sur tous vos appareils).</p>

        <SectionTitle>Aperçu</SectionTitle>
        <p className="-mt-1 mb-3 text-[13px] text-muted">Simple illustration des éléments qui prennent la couleur choisie : ces boutons ne sont pas cliquables. Rien à enregistrer, le choix est pris en compte dès que vous touchez une couleur.</p>
        <Card>
          {/* Maquette figée : rien n'y réagit au toucher, pour ne pas faire croire à de vrais boutons. */}
          <div className="pointer-events-none select-none space-y-4" aria-hidden>
            <div className="flex rounded-[22px] bg-bg p-1.5">
              {[
                { icon: <Home size={18} />, label: "Accueil", active: true },
                { icon: <KeyRound size={18} />, label: "Gestion" },
                { icon: <FileText size={18} />, label: "Plus" },
              ].map((n) => (
                <span key={n.label} className={`flex flex-1 flex-col items-center gap-0.5 rounded-[18px] py-1.5 text-[11px] font-semibold ${n.active ? "bg-brand text-on-brand shadow-sm" : "text-ink-2"}`}>
                  {n.icon}
                  {n.label}
                </span>
              ))}
            </div>
            <div className="flex rounded-2xl bg-black/5 p-1 text-sm">
              <span className="flex-1 rounded-xl bg-card px-3 py-2 text-center font-semibold text-brand shadow-sm">Onglet sélectionné</span>
              <span className="flex-1 px-3 py-2 text-center text-ink-2">Autre onglet</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-series-1/10 px-2.5 py-1 text-[12px] font-semibold text-brand">Pastille</span>
              <span className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-brand">Bouton secondaire</span>
              <span className="text-[15px] font-semibold text-brand">Lien</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="flex min-h-[52px] items-center justify-center rounded-2xl bg-soft text-[16px] font-semibold text-brand">Secondaire</span>
              <span className="flex min-h-[52px] items-center justify-center rounded-2xl bg-brand text-[16px] font-semibold text-on-brand shadow-sm">Principal</span>
            </div>
          </div>
        </Card>
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
          <ShieldCheck size={15} className="shrink-0 text-pos" />
          Lisibilité vérifiée : contraste minimal {worst.toFixed(1).replace(".", ",")}:1 (norme AA ≥ 4,5:1).
        </p>
      </Page>
    </>
  );
}
