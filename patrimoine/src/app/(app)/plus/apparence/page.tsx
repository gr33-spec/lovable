"use client";

import { useState } from "react";
import { Check, FileText, Home, KeyRound, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { paletteChecks, paletteFor, themeDef, THEMES } from "@/lib/theme";
import { Button, Card, Page, PageHeader, Pill, SectionTitle, Segmented } from "@/components/ui";

export default function ApparencePage() {
  const { data, role, setSettings } = useStore();
  const current = themeDef(data.settings.theme);
  const checks = paletteChecks(paletteFor(current.base));
  const worst = Math.min(...checks.filter((c) => c.min === 4.5).map((c) => c.ratio));
  const [tab, setTab] = useState<"a" | "b">("a");

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
                onClick={() => setSettings({ theme: t.id })}
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
        <p className="mt-3 text-[13px] text-muted">Le choix s&apos;applique tout de suite et est enregistré avec vos données : il vous suit sur tous vos appareils.</p>

        <SectionTitle>Aperçu</SectionTitle>
        <Card>
          <div className="space-y-4">
            <div className="flex rounded-[22px] bg-bg p-1.5">
              {[
                { icon: <Home size={18} />, label: "Accueil", active: true },
                { icon: <KeyRound size={18} />, label: "Gestion" },
                { icon: <FileText size={18} />, label: "Plus" },
              ].map((n) => (
                <span key={n.label} className={`flex flex-1 flex-col items-center gap-0.5 rounded-[18px] py-1.5 text-[11px] font-semibold ${n.active ? "bg-brand text-on-brand shadow-sm" : "text-muted"}`}>
                  {n.icon}
                  {n.label}
                </span>
              ))}
            </div>
            <Segmented value={tab} onChange={setTab} options={[{ value: "a", label: "Onglet actif" }, { value: "b", label: "Autre onglet" }]} />
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="blue">Pastille</Pill>
              <span className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-brand">Action secondaire</span>
              <span className="text-[15px] font-semibold text-brand underline-offset-2 hover:underline">Lien important</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary">Annuler</Button>
              <Button>Enregistrer</Button>
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
