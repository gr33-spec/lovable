"use client";

import { useEffect, useState } from "react";
import type { Formule, OffreAbonnement } from "@/lib/api";

/**
 * LES DEUX FORMULES (Greg, 24 octobre 2026) : l'annuel mis en avant, son badge « -40 % », « 29 € par mois, payé à
 * l'année » et « 239 € économisés par an » ; le mensuel juste à côté. Les textes viennent de l'API (les prix se règlent
 * dans l'admin) ; ceux-ci servent seulement en attendant la réponse.
 */
export const OFFRES_PAR_DEFAUT: OffreAbonnement[] = [
  { formule: "annuel", titre: "Annuel", badge: "-40 %", prix: "29 € HT par mois, payé à l'année", details: ["349 € HT par an, en une fois", "239 € économisés par an", "Renouvelé chaque année, rappel 30 jours avant"], enAvant: true },
  { formule: "mensuel", titre: "Mensuel", badge: null, prix: "49 € HT par mois", details: ["Sans engagement", "Résiliable quand tu veux"], enAvant: false },
];

/**
 * Les deux cartes côte à côte (l'une sous l'autre sur un petit téléphone), l'annuel d'abord. Avec `onChoisir`, chaque
 * carte est un bouton et la carte choisie est cochée ; sans, elles s'affichent seulement (page /tarifs).
 */
export function OffresAbonnement({ offres, choisie, onChoisir, sombre = false }: { offres: OffreAbonnement[]; choisie?: Formule; onChoisir?: (f: Formule) => void; sombre?: boolean }) {
  return (
    <div role={onChoisir ? "radiogroup" : undefined} aria-label="Choisis ta formule" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
      {offres.map((o) => {
        const coche = onChoisir ? choisie === o.formule : o.enAvant;
        const fond = sombre ? (o.enAvant ? "bg-accent text-ink" : "bg-night-2 text-white ring-1 ring-white/15") : coche ? "bg-surface ring-2 ring-ink" : "bg-surface ring-1 ring-line";
        const contenu = (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold tracking-[0.06em] uppercase">{o.titre}</span>
              {o.badge ? <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-extrabold ${sombre ? "bg-ink text-accent" : "bg-accent text-ink"}`}>{o.badge}</span> : null}
            </span>
            <span className="text-[20px] leading-tight font-extrabold">{o.prix}</span>
            <span className="flex flex-col gap-0.5">
              {o.details.map((d) => (
                <span key={d} className={`text-[14px] ${sombre ? (o.enAvant ? "text-ink/80" : "text-white/70") : "text-muted"}`}>
                  {d}
                </span>
              ))}
            </span>
          </>
        );
        const classes = `flex flex-col gap-2 rounded-[20px] p-4 text-left shadow-card ${fond}`;
        return onChoisir ? (
          <button key={o.formule} type="button" role="radio" aria-checked={coche} onClick={() => onChoisir(o.formule)} className={`${classes} min-h-11`}>
            {contenu}
          </button>
        ) : (
          <div key={o.formule} className={classes}>
            {contenu}
          </div>
        );
      })}
    </div>
  );
}

/** Les deux formules de la page publique (`/v1/public/tarif`), les textes par défaut en attendant. */
export function OffresPubliques() {
  const [offres, setOffres] = useState(OFFRES_PAR_DEFAUT);
  useEffect(() => {
    let vivant = true;
    fetch("/v1/public/tarif", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { offres?: OffreAbonnement[] } | null) => {
        if (vivant && b?.offres?.length) setOffres(b.offres);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  return <OffresAbonnement offres={offres} sombre />;
}
