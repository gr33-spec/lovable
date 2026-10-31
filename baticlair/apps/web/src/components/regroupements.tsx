"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, MapPin, Users } from "lucide-react";
import type { Regroupement } from "@/lib/recentrage";

/**
 * LES REGROUPEMENTS, CÔTÉ ÉCRAN (Greg, 25 octobre 2026, maquette des trois iPhone, corrigée) : une carte par regroupement,
 * la vignette du matériau, la famille, le département (jamais une commune), « Regroupement en cours » sous 5 entreprises
 * (jamais un nombre ni des villes en dessous), la date de consultation, les pastilles des matériaux concernés, un seul
 * bouton. Pas de prix affiché.
 */

/**
 * La vignette du matériau : une texture dessinée en CSS par famille (ardoise, bois, isolant…). Un emplacement à remplacer
 * par une vraie photo quand Greg en fournira (DECISIONS.md, 25 octobre 2026).
 */
const TEXTURES: Record<string, string> = {
  couverture:
    "repeating-linear-gradient(0deg, rgba(251,248,243,0.10) 0 2px, transparent 2px 18px), repeating-linear-gradient(90deg, rgba(13,6,1,0.18) 0 2px, transparent 2px 26px), linear-gradient(135deg, #614822, #614822 55%, #2E1B05)",
  charpente: "repeating-linear-gradient(90deg, rgba(97,72,34,0.35) 0 3px, transparent 3px 14px), linear-gradient(160deg, #CA8A1B, #96580C 60%, #96580C)",
  second_oeuvre: "radial-gradient(circle at 30% 30%, rgba(251,248,243,0.35) 0 3px, transparent 4px), radial-gradient(circle at 70% 60%, rgba(251,248,243,0.25) 0 2px, transparent 3px), linear-gradient(135deg, #F4DB5C, #CA8A1B)",
};

export function VignetteMateriau({ famille, className = "size-20" }: { famille: string; className?: string }) {
  return <span aria-hidden="true" className={`block shrink-0 rounded-xl shadow-card ${className}`} style={{ backgroundImage: TEXTURES[famille] ?? TEXTURES.couverture, backgroundSize: "auto, auto, cover" }} />;
}

export function Pastille({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink">{children}</span>;
}

export function phraseCloture(r: Pick<Regroupement, "phase" | "clotureDans" | "nonConsulte" | "cycle">): string {
  if (r.nonConsulte) return "Pas assez de volume ce cycle";
  if (r.phase === "inscriptions") return `Consultation dans ${r.clotureDans ?? "quelques jours"}`;
  if (r.phase === "negoces") return "Les négoces chiffrent";
  return "Les prix sont là";
}

export function CarteRegroupement({ r }: { r: Regroupement }) {
  return (
    <article aria-label={`${r.titre}, ${r.participants}`} className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex gap-4">
        <VignetteMateriau famille={r.famille} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] leading-tight font-extrabold">{r.titre}</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-bold text-ink">{r.participants}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[14px] text-muted">
            <MapPin size={15} aria-hidden="true" /> Département {r.departement}
          </span>
          <span className="flex items-center gap-1.5 text-[14px] text-muted">
            <CalendarClock size={15} aria-hidden="true" /> {phraseCloture(r)}
          </span>
          {r.jeSuisDedans ? (
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ok">
              <Users size={15} aria-hidden="true" /> Tu es dedans
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Matériaux concernés">
        {r.materiaux.map((m) => (
          <Pastille key={m.cle}>{m.libelle}</Pastille>
        ))}
      </div>
      <Link href={`/regroupements/${r.id}`} className="pressable inline-flex min-h-12 items-center justify-center gap-1 rounded-full bg-accent-soft px-5 text-[16px] font-bold text-ink">
        Voir les détails <ChevronRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
