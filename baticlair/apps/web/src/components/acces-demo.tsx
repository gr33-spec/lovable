"use client";

import { useEffect, useState } from "react";
import { api, setActiveCompanyId } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * L'ACCÈS DÉMO (Greg, 7 novembre 2026, option 1, test.mobiiz.fr seulement) : « Découvrir l'application » ouvre un espace
 * fictif sans inscription ni mot de passe. Le bouton n'existe que si le serveur l'a allumé (`ACCES_DEMO=on`).
 */
export const DOMAINE_VISITEUR = "@demo.mobiiz.fr";
export const estVisiteurDemo = (email: string | null | undefined) => !!email && email.startsWith("visiteur-") && email.endsWith(DOMAINE_VISITEUR);

async function ouvrirLaDemo(): Promise<void> {
  await api("/v1/public/demo/session", { method: "POST" });
  setActiveCompanyId(null);
  // Rechargement complet voulu : « / » est servi par le proxy (landing sans session, app avec), la session repart de zéro.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}

export function BoutonDecouvrir({ className = "btn btn-outline" }: { className?: string }) {
  const [actif, setActif] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    api<{ actif: boolean }>("/v1/public/demo").then(
      (r) => vivant && setActif(r.actif === true),
      () => undefined,
    );
    return () => {
      vivant = false;
    };
  }, []);
  if (!actif) return null;
  return (
    <>
      <button
        type="button"
        id="decouvrirDemo"
        className={className}
        disabled={enCours}
        onClick={() => {
          setEnCours(true);
          setErreur(null);
          ouvrirLaDemo().catch(() => {
            setEnCours(false);
            setErreur("La démonstration n'a pas pu s'ouvrir. Réessaie dans un instant.");
          });
        }}
      >
        {enCours ? "Ouverture…" : "Découvrir l'application"}
      </button>
      {erreur ? (
        <p role="alert" style={{ width: "100%", margin: 0, fontSize: 14 }}>
          {erreur}
        </p>
      ) : null}
    </>
  );
}

/** Dans l'app, sur chaque écran du visiteur : ce qui est fictif et ce qui ne part pas, se dit en une ligne. */
export function BandeauDemo() {
  const { me } = useSession();
  const [enCours, setEnCours] = useState(false);
  if (!estVisiteurDemo(me.user.email)) return null;
  return (
    <div role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-ink" data-testid="bandeau-demo">
      <p className="m-0">
        <strong>Mode démonstration</strong> : données fictives, rien ne part (ni e-mail, ni paiement).
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="pressable min-h-11 rounded-2xl border border-line bg-surface px-4 text-[14px] font-semibold text-ink"
          disabled={enCours}
          onClick={() => {
            setEnCours(true);
            ouvrirLaDemo().catch(() => setEnCours(false));
          }}
        >
          Recommencer
        </button>
        <button
          type="button"
          className="pressable min-h-11 rounded-2xl px-4 text-[14px] font-semibold text-ink underline"
          onClick={() => {
            void api("/v1/auth/sign-out", { method: "POST", body: {} })
              .catch(() => undefined)
              .then(() => {
                setActiveCompanyId(null);
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- même raison qu'à l'ouverture
                window.location.assign("/");
              });
          }}
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
