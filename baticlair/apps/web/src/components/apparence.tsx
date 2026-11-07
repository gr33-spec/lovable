"use client";

import { Moon, Sun } from "lucide-react";
import { Card } from "./ui";
import { choisirTheme, useTheme, type Theme } from "@/lib/theme";

const CHOIX: { theme: Theme; libelle: string; icone: typeof Sun }[] = [
  { theme: "clair", libelle: "Clair", icone: Sun },
  { theme: "sombre", libelle: "Sombre", icone: Moon },
];

/** Profil : « Apparence », Clair ou Sombre (Greg, 31 octobre 2026). Sombre par défaut ; gardé sur cet appareil. */
export function CarteApparence() {
  const theme = useTheme();
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Apparence</h2>
      <div role="group" aria-label="Apparence de Mobiiz" className="grid grid-cols-2 gap-2">
        {CHOIX.map(({ theme: t, libelle, icone: Icone }) => {
          const actif = theme === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actif}
              onClick={() => choisirTheme(t)}
              className={`pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-[15px] font-semibold ${
                actif ? "border-ink bg-ink text-white" : "border-line text-ink"
              }`}
            >
              <Icone size={18} aria-hidden="true" />
              {libelle}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted">Gardé sur cet appareil.</p>
    </Card>
  );
}
