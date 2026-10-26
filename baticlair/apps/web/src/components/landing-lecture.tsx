"use client";

import { useEffect, useRef, useState } from "react";
import { DEVIS_EXEMPLE } from "@/lib/landing";
import { NOM_APP } from "@/lib/nom";

/**
 * LE DEVIS LU SOUS LES YEUX DU VISITEUR (Greg, 26 octobre 2026, capture iPhone : « qu'on voie un vrai devis puis les lignes
 * de quantitatif sortir, une sorte d'animation ») : la page du vrai devis DE00000071 (en-tête anonymisé, colonnes), un
 * surligneur qui la lit ligne par ligne, et chaque fourniture qui sort dans « Ta liste » ; une ligne de main-d'œuvre est
 * marquée « sans fourniture ». La lecture rejoue tant qu'elle est à l'écran (une fois par 11 s environ) et s'arrête hors
 * de l'écran. Sans JavaScript ou sous « réduire les animations » : l'état final, immobile.
 */
const LIGNES = DEVIS_EXEMPLE.lignes;
const N: number = LIGNES.length;
const PAS_MS = 1050;
const PAUSE_MS = 3600;
const TOTAL_FOURNITURES = LIGNES.reduce((n, l) => n + l.fournitures.length, 0);
const SANS_FOURNITURE = LIGNES.filter((l) => l.fournitures.length === 0).length;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function LectureAnimee() {
  // -1 : page vierge ; i : la ligne i est en cours de lecture ; N : tout est lu.
  const [etape, setEtape] = useState<number>(N);
  const [anime, setAnime] = useState(false);
  const cadre = useRef<HTMLElement>(null);
  const corps = useRef<HTMLDivElement>(null);

  // Sur téléphone, le devis tient dans une fenêtre basse qui suit le surligneur : le devis et la liste restent ensemble à l'écran.
  useEffect(() => {
    const c = corps.current;
    if (!c || c.scrollHeight <= c.clientHeight + 1) return;
    const ligne = etape >= 0 && etape < N ? c.children[etape] : null;
    const cible = ligne instanceof HTMLElement ? Math.max(0, ligne.offsetTop - c.offsetTop - 24) : etape < 0 ? 0 : c.scrollTop;
    c.scrollTo({ top: cible, behavior: "smooth" });
  }, [etape]);

  useEffect(() => {
    const el = cadre.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    let courante = -1;
    const pas = () => {
      if (!visible) return;
      if (courante < N) {
        courante += 1;
        setEtape(courante);
        minuterie = setTimeout(pas, courante === N ? PAUSE_MS : PAS_MS);
      } else {
        courante = -1;
        setEtape(-1);
        minuterie = setTimeout(pas, 700);
      }
    };
    const obs = new IntersectionObserver(
      ([x]) => {
        const avant = visible;
        visible = Boolean(x?.isIntersecting);
        if (visible && !avant) {
          setAnime(true);
          clearTimeout(minuterie);
          courante = -1;
          setEtape(-1);
          minuterie = setTimeout(pas, 500);
        } else if (!visible) clearTimeout(minuterie);
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      clearTimeout(minuterie);
    };
  }, []);

  const finie = etape >= N;
  const enCours = etape >= 0 && etape < N ? (LIGNES as readonly (typeof LIGNES)[number][])[etape] : undefined;
  const sorties = LIGNES.slice(0, Math.max(0, Math.min(etape + 1, N))).reduce((n, l) => n + l.fournitures.length, 0);
  const statut = finie
    ? `${pluriel(TOTAL_FOURNITURES, "fourniture")}, ${pluriel(SANS_FOURNITURE, "ligne")} sans fourniture`
    : enCours
      ? `Je lis la ligne ${enCours.n}…`
      : "Je lis ton devis…";

  return (
    <figure ref={cadre} className="mz-lecture" data-anime={anime ? "" : undefined} aria-label={`Un vrai devis de couvreur lu par ${NOM_APP}`}>
      <div className="mz-devis">
        <div className="mz-devis-entete">
          <div aria-hidden="true" className="mz-caviardage">
            <span style={{ width: "62%" }} />
            <span style={{ width: "86%" }} />
            <span style={{ width: "48%" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="mz-titre" style={{ fontSize: 26, lineHeight: 1 }}>
              Devis
            </p>
            <p className="mz-num" style={{ fontSize: 12, marginTop: 4 }}>
              N° {DEVIS_EXEMPLE.reference}
            </p>
          </div>
        </div>
        <p className="mz-devis-objet">
          <span>Objet : {DEVIS_EXEMPLE.sujet.toLowerCase()}</span>
          <span className="mz-gris">Client et adresse retirés</span>
        </p>
        <div className="mz-devis-colonnes" aria-hidden="true">
          <span>N°</span>
          <span>Désignation</span>
          <span>Qté</span>
        </div>
        <div ref={corps} className="mz-devis-corps">
        {LIGNES.map((l, i) => {
          const lue = i <= etape;
          return (
            <p
              key={l.n}
              className="mz-ligne-devis"
              data-lue={lue ? "" : undefined}
              data-active={i === etape ? "" : undefined}
              data-vide={l.fournitures.length === 0 ? "" : undefined}
            >
              <span className="mz-gris mz-num">{l.n}</span>
              <span>
                {l.texte}
                {l.fournitures.length === 0 ? <em className="mz-sans">sans fourniture</em> : null}
              </span>
              <span className="mz-num">{l.quantite}</span>
            </p>
          );
        })}
        </div>
      </div>

      <p className="mz-statut" aria-hidden="true">
        <span className="mz-statut-point" data-actif={!finie ? "" : undefined} />
        {statut}
      </p>

      <div className="mz-liste">
        <p className="mz-liste-tete">
          <span className="mz-etiq" style={{ color: "var(--mz-jaune)" }}>
            Ta liste
          </span>
          <span className="mz-num" style={{ color: "rgba(255,255,255,.62)" }}>
            {sorties} / {TOTAL_FOURNITURES}
          </span>
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {LIGNES.flatMap((l, i) =>
            l.fournitures.map((f, j) => (
              <li key={`${l.n}-${j}`} className="mz-fourniture" data-sortie={i <= etape ? "" : undefined} style={{ "--j": j } as React.CSSProperties}>
                <span className="mz-point" data-orange={f.aPreciser ? "" : undefined} aria-hidden="true" />
                <span>
                  {f.nom}
                  <small>{f.aPreciser ?? `Ligne ${l.n} du devis`}</small>
                </span>
                <b className="mz-num">{f.quantite}</b>
              </li>
            )),
          )}
        </ul>
      </div>
      <figcaption className="mz-source">
        Extrait d&apos;un vrai devis de couvreur, lu par {NOM_APP}. Les lignes 2, 4 et 6 sont de la main-d&apos;œuvre : elles ne donnent aucune fourniture. En
        orange, ce que {NOM_APP} te demandera.
      </figcaption>
    </figure>
  );
}
