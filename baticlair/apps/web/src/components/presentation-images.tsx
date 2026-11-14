"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMissionsOuvertes } from "@/components/landing-missions";

/**
 * « VOIR MOBIIZ EN IMAGES » (Greg, 11 novembre 2026) : la présentation publique, à la place de l'ancienne démonstration.
 * STATIQUE : de vraies captures de l'application (données d'exemple), aucun compte, aucune session, aucune écriture,
 * aucun appel à l'API métier ; seul le réglage public des missions est lu (route de santé), comme le reste de la page.
 * Quatre écrans (trois quand les missions ne sont pas ouvertes : le mot n'est alors jamais prononcé). Une fenêtre
 * accessible : « Fermer » toujours visible, Échap, le focus gardé dedans puis rendu au bouton, aucune lecture seule.
 * Ce n'est PAS le guide d'accueil (`guide-premier-lancement.tsx`), qui accompagne un vrai compte après son inscription.
 */
interface Ecran {
  cle: string;
  titre: string;
  texte: string;
  alt: string;
}
const ECRANS: Ecran[] = [
  {
    cle: "quantitatif",
    titre: "Prépare ton quantitatif",
    texte:
      "Écris ta liste de matériaux ou pars de ton devis, puis vérifie chaque ligne et chaque quantité avant de l'envoyer.",
    alt: "L'écran Quantitatif de Mobiiz : la liste des fournitures (ardoises, crochets, liteaux, écran de sous-toiture) avec leurs quantités, et le bouton « Demander les prix à mes négoces »",
  },
  {
    cle: "negoces",
    titre: "Consulte tes négoces",
    texte:
      "Une seule demande, envoyée jusqu'à 5 négoces. Leurs réponses arrivent dans Mobiiz, au même endroit.",
    alt: "La feuille « À qui j'envoie ? » de Mobiiz : cinq négoces d'exemple cochés et la phrase « Jusqu'à 5 négoces par demande »",
  },
  {
    cle: "groupes",
    titre: "Achète à plusieurs",
    texte:
      "Un parcours à part de tes demandes individuelles : tu ajoutes certains matériaux aux achats groupés de ton métier et de ton secteur, et tu décides à la réception de l'offre.",
    alt: "L'écran Achats groupés de Mobiiz : un besoin confirmé de gouttière zinc et un achat ouvert dans le secteur",
  },
];
const ECRAN_MISSIONS: Ecran = {
  cle: "missions",
  titre: "Missions entre entreprises",
  texte:
    "Publie une mission ou indique tes disponibilités. Les coordonnées ne sont partagées qu'après l'accord des deux entreprises.",
  alt: "L'écran Missions de Mobiiz : « Je propose une mission », « Je propose mes services » et les missions proches",
};

export function PresentationImages({
  className = "btn btn-outline",
}: {
  className?: string;
}) {
  const missions = useMissionsOuvertes();
  const ecrans = missions ? [...ECRANS, ECRAN_MISSIONS] : ECRANS;
  // La fenêtre est posée à la racine de la page publique (`.mzp`), au-dessus de toutes les sections : dans le premier
  // écran, la carte « Comment ça marche ? » passait devant ses boutons.
  const bouton = useRef<HTMLButtonElement>(null);
  const [racinePage, setRacinePage] = useState<Element | null>(null);
  const ouvert = racinePage !== null;
  const setOuvert = useCallback(
    (o: boolean) =>
      setRacinePage(
        o ? (bouton.current?.closest(".mzp") ?? document.body) : null,
      ),
    [],
  );
  const [etape, setEtape] = useState(0);
  const fenetre = useRef<HTMLElement>(null);
  const titre = useId();
  const n = Math.min(etape, ecrans.length - 1);
  const e = ecrans[n]!;
  const dernier = n === ecrans.length - 1;

  const fermer = useCallback(() => {
    setOuvert(false);
    setEtape(0);
  }, [setOuvert]);

  useEffect(() => {
    if (!ouvert) return;
    // La page derrière ne défile pas, sans bouger : à la fermeture, le visiteur est au même endroit, le focus sur le bouton.
    const racine = document.documentElement;
    const avant = racine.style.overflow;
    racine.style.overflow = "hidden";
    const declencheur = bouton.current;
    fenetre.current?.focus();
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        fermer();
      } else if (ev.key === "ArrowRight")
        setEtape((x) => Math.min(x + 1, ecrans.length - 1));
      else if (ev.key === "ArrowLeft") setEtape((x) => Math.max(x - 1, 0));
      else if (ev.key === "Tab") {
        // Le focus reste dans la fenêtre.
        const cibles = [
          ...(fenetre.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href]",
          ) ?? []),
        ];
        if (cibles.length === 0) return;
        const premier = cibles[0]!;
        const fin = cibles[cibles.length - 1]!;
        const actif = document.activeElement;
        if (ev.shiftKey && (actif === premier || actif === fenetre.current)) {
          ev.preventDefault();
          fin.focus();
        } else if (!ev.shiftKey && actif === fin) {
          ev.preventDefault();
          premier.focus();
        }
      }
    };
    document.addEventListener("keydown", clavier);
    return () => {
      document.removeEventListener("keydown", clavier);
      racine.style.overflow = avant;
      declencheur?.focus({ preventScroll: true });
    };
  }, [ouvert, fermer, ecrans.length]);

  return (
    <>
      <button
        ref={bouton}
        type="button"
        id="voirEnImages"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOuvert(true)}
      >
        Voir Mobiiz en images
      </button>
      {racinePage
        ? createPortal(
            <div
              className="mz2-pres-fond"
              onClick={(ev) => ev.target === ev.currentTarget && fermer()}
            >
              <section
                ref={fenetre}
                className="mz2-pres"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titre}
                tabIndex={-1}
              >
                <div className="mz2-pres-tete">
                  <span className="mz2-pres-compteur" aria-live="polite">
                    {n + 1} sur {ecrans.length}
                  </span>
                  <button
                    type="button"
                    className="mz2-pres-fermer"
                    onClick={fermer}
                    aria-label="Fermer la présentation"
                  >
                    Fermer
                  </button>
                </div>
                <div className="mz2-pres-corps">
                  <figure className="mz2-pres-image">
                    {/* eslint-disable-next-line @next/next/no-img-element -- une capture statique, deux tailles, sans optimiseur */}
                    <img
                      key={e.cle}
                      src={`/landing/v3/pres-${e.cle}-900.webp`}
                      srcSet={`/landing/v3/pres-${e.cle}-540.webp 540w, /landing/v3/pres-${e.cle}-900.webp 900w`}
                      sizes="(max-width: 700px) 190px, 270px"
                      alt={e.alt}
                      width={900}
                      height={1569}
                      decoding="async"
                    />
                    <figcaption className="mz2-pres-exemple">
                      Exemple
                    </figcaption>
                  </figure>
                  <div className="mz2-pres-texte">
                    <h2 id={titre}>{e.titre}</h2>
                    <p>{e.texte}</p>
                  </div>
                </div>
                <div className="mz2-pres-pied">
                  <button
                    type="button"
                    className="mz2-pres-nav"
                    onClick={() => setEtape(n - 1)}
                    disabled={n === 0}
                  >
                    Précédent
                  </button>
                  {dernier ? (
                    <>
                      <Link
                        className="mz2-pres-nav mz2-pres-plein"
                        href="/inscription"
                      >
                        Commencer gratuitement
                      </Link>
                      <button
                        type="button"
                        className="mz2-pres-nav"
                        onClick={fermer}
                      >
                        Fermer
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="mz2-pres-nav mz2-pres-plein"
                      onClick={() => setEtape(n + 1)}
                    >
                      Suivant
                    </button>
                  )}
                </div>
              </section>
            </div>,
            racinePage,
          )
        : null}
    </>
  );
}
