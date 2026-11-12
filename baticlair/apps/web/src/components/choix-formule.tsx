"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { continuerAbonnement } from "@/components/abonnement";
import { messageErreur, type Abonnement, type Formule, type Periodicite } from "@/lib/api";

/**
 * LE CHOIX DE LA FORMULE (Greg, 12 novembre 2026, dossier de corrections UX, point 13). Avant : deux cartes sans bouton et
 * un seul « M'abonner » ambigu. Maintenant : le choix « au mois » ou « à l'année », une carte par formule avec SON bouton,
 * l'état choisi visible (bordure, « Choisie »), puis un récapitulatif qui dit sans détour ce qui sera réellement prélevé,
 * quand, le renouvellement et comment arrêter. Tous les montants viennent du serveur ; rien n'est calculé ici.
 * Les prix de l'annuel se lisent toujours ; il ne se PAIE que s'il est ouvert (`annuelDisponible`) : sinon l'écran le dit et
 * le bouton de paiement reste inactif (aucun prix n'est créé chez le prestataire sans l'accord de Greg).
 */
export function ChoixFormule({ abonnement: a, bouton = "Continuer vers le paiement" }: { abonnement: Abonnement; bouton?: string }) {
  const [periodicite, setPeriodicite] = useState<Periodicite>("mensuel");
  const [formule, setFormule] = useState<Formule | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const annuel = periodicite === "annuel";
  const ferme = annuel && a.annuelDisponible === false;
  const choisie = formule ? (a.offres.find((o) => o.formule === formule) ?? null) : null;

  async function continuer() {
    if (!formule || pending || ferme) return;
    setPending(true);
    setErreur(null);
    try {
      await continuerAbonnement(formule, periodicite);
    } catch (e) {
      setErreur(messageErreur(e));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {a.offres.some((o) => o.annuel) ? (
        <div role="radiogroup" aria-label="Facturation" className="grid grid-cols-2 gap-1 self-stretch rounded-full bg-ground p-1 sm:self-start">
          {(["mensuel", "annuel"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={periodicite === p}
              onClick={() => setPeriodicite(p)}
              className={`pressable flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-extrabold transition-colors duration-150 ${periodicite === p ? "bg-surface text-ink shadow-card" : "text-ink/75"}`}
            >
              {p === "mensuel" ? "Au mois" : "À l'année"}
              {p === "annuel" ? <span className="rounded-full bg-accent px-2 py-0.5 text-[12px] font-extrabold text-on-accent">2 mois offerts</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <ul aria-label="Formules" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {a.offres.map((o) => {
          const v = annuel && o.annuel ? o.annuel : null;
          const active = formule === o.formule;
          return (
            <li key={o.formule} className={`flex flex-col gap-3 rounded-[22px] bg-surface p-5 text-ink shadow-card transition-shadow duration-150 ${active ? "ring-2 ring-ink" : "ring-1 ring-line"}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-extrabold tracking-[0.06em] uppercase">{o.titre}</h3>
                {active ? (
                  <span className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[12px] font-extrabold text-ground">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                    Choisie
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em]">{v ? v.prix : o.prix}</p>
                {v ? (
                  <>
                    <p className="text-[15px] font-semibold">{v.equivalent}</p>
                    <p className="text-[14px] text-muted">{v.economie}.</p>
                  </>
                ) : (
                  <p className="text-[14px] text-muted">Sans engagement.</p>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {(v ? v.details : o.details).map((d) => (
                  <li key={d} className="flex items-start gap-2 text-[15px] leading-snug">
                    <Check size={16} strokeWidth={3} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setFormule(o.formule)}
                className={`pressable mt-auto min-h-12 rounded-full px-4 text-[16px] font-extrabold ${active ? "bg-ink text-ground" : "border-2 border-ink text-ink"}`}
              >
                {active ? `${o.titre} choisie` : `Choisir ${o.titre}`}
              </button>
            </li>
          );
        })}
      </ul>
      {choisie ? (
        <div role="status" className="flex flex-col gap-2 rounded-[18px] bg-accent-soft p-4 text-ink">
          <p className="text-[16px] font-extrabold">
            {choisie.titre}, {annuel ? "à l'année" : "au mois"}
          </p>
          <p className="text-[15px] leading-snug">
            {annuel && choisie.annuel
              ? `${choisie.annuel.prix}${choisie.annuel.ttc ? ` (${choisie.annuel.ttc} TTC)` : ""}, prélevés en une fois aujourd'hui pour douze mois, puis à chaque date anniversaire. Tu peux arrêter le renouvellement quand tu veux ; l'année payée reste acquise.`
              : `${choisie.prix}${choisie.ttc ? ` (${choisie.ttc} TTC)` : ""}, prélevés aujourd'hui puis chaque mois. Sans engagement : tu résilies quand tu veux, l'accès reste jusqu'à la fin du mois payé.`}
          </p>
        </div>
      ) : (
        <p className="text-[14px] text-muted">Choisis une formule pour voir ce qui sera prélevé.</p>
      )}
      {ferme ? (
        <p role="note" className="rounded-xl border border-line px-4 py-3 text-[15px] font-semibold">
          L&apos;abonnement annuel n&apos;est pas encore ouvert au paiement. Choisis « Au mois » pour t&apos;abonner dès maintenant.
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <button type="button" onClick={() => void continuer()} disabled={!formule || pending || ferme} className="pressable min-h-14 rounded-[18px] bg-accent px-5 text-[17px] font-extrabold text-on-accent disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Un instant…" : bouton}
      </button>
    </div>
  );
}
