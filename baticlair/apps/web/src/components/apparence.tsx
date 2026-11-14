"use client";

import { Moon, Smartphone, Sun } from "lucide-react";
import { Card } from "./ui";
import { choisirTheme, useChoixTheme, type ChoixTheme } from "@/lib/theme";

const CHOIX: { theme: ChoixTheme; libelle: string; icone: typeof Sun }[] = [
  { theme: "auto", libelle: "Automatique", icone: Smartphone },
  { theme: "clair", libelle: "Clair", icone: Sun },
  { theme: "sombre", libelle: "Sombre", icone: Moon },
];

/** Profil : « Apparence », Automatique, Clair ou Sombre (Greg, 31 octobre puis 10 novembre 2026, capture 20). Sombre par défaut ; gardé sur cet appareil. */
export function CarteApparence() {
  const theme = useChoixTheme();
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Apparence</h2>
      <div role="group" aria-label="Apparence de Mobiiz" className="grid grid-cols-3 gap-2">
        {CHOIX.map(({ theme: t, libelle, icone: Icone }) => {
          const actif = theme === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actif}
              onClick={() => choisirTheme(t)}
              className={`pressable flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-[13px] font-semibold min-[400px]:flex-row min-[400px]:gap-2 min-[400px]:text-[15px] ${
                actif ? "border-ink bg-ink text-white" : "border-line text-ink"
              }`}
            >
              <Icone size={18} aria-hidden="true" />
              {libelle}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted">« Automatique » suit le réglage de ton appareil. Le choix est gardé sur cet appareil.</p>
    </Card>
  );
}
