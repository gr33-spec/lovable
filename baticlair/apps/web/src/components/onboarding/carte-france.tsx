"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OUTRE_MER, REGIONS_CARTE, VUE_FRANCE, type RegionCarte } from "@/lib/carte/france-regions";
import { departementConnu } from "@/lib/metiers-inscription";

/**
 * LA CARTE DE L'ONBOARDING (Greg, 19 novembre 2026) : la France découpée en régions ; un toucher sur une région la zoome
 * et la découpe en départements (`/cartes/region-<code>.json`, 3 à 24 Ko). Le reste de la France reste derrière, flouté.
 * « Toute la France » revient en arrière. Sous la carte, les mêmes choix en boutons, faciles au pouce (les petits
 * départements d'Île-de-France compris) ; la Corse est sur la carte et dans la liste, l'outre-mer dans la liste.
 *
 * LA TRANSITION (retour de Greg, 20 novembre 2026 : « pas tout à fait fluide ») : un seul mouvement, une transformation CSS
 * du groupe de la carte, menée par le navigateur (avant : le cadre recalculé et toute la carte redessinée par React à chaque
 * image). Les traits gardent leur épaisseur à l'écran (`vector-effect`). Le flou du reste de la France et l'ombre des
 * départements ne se posent qu'une fois le zoom fini (avant : un flou recalculé à chaque image, le plus coûteux). Les
 * départements sont préchargés (au survol ou au toucher d'une région, puis toutes les régions quand la page est au repos) :
 * ils apparaissent pendant le zoom, plus après. Sous « réduire les animations », le zoom est immédiat.
 */
type Vue = readonly [number, number, number, number];

interface DepartementCarte {
  code: string;
  nom: string;
  d: string;
  boite: Vue;
  centre: readonly [number, number];
}

export type ChoixRegion = { type: "metropole"; region: RegionCarte } | { type: "outre-mer"; code: string; nom: string };

const DUREE_ZOOM = 700;
const cache = new Map<string, Promise<DepartementCarte[]>>();
function chargerDepartements(code: string): Promise<DepartementCarte[]> {
  let p = cache.get(code);
  if (!p) {
    p = fetch(`/cartes/region-${code}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { departements: DepartementCarte[] }) => j.departements);
    p.catch(() => cache.delete(code));
    cache.set(code, p);
  }
  return p;
}

/** Le cadre d'une région, avec une marge, au rapport du cadre de la France (le zoom ne déforme rien). */
function cadreRegion(r: RegionCarte): Vue {
  const [x0, y0, x1, y1] = r.boite;
  const ratio = VUE_FRANCE[2] / VUE_FRANCE[3];
  let l = (x1 - x0) * 1.18;
  let h = (y1 - y0) * 1.18;
  if (l / h > ratio) h = l / ratio;
  else l = h * ratio;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [cx - l / 2, cy - h / 2, l, h];
}

/** La transformation qui amène le cadre `b` (unités de la carte) dans le cadre de la France entière. */
function transformation(b: Vue): string {
  const echelle = VUE_FRANCE[2] / b[2];
  const tx = -(b[0] - VUE_FRANCE[0]) * echelle;
  const ty = -(b[1] - VUE_FRANCE[1]) * echelle;
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${echelle.toFixed(4)})`;
}

/** Les départements de toutes les régions, quand la page est au repos : le premier zoom n'attend plus le réseau. */
function precharger() {
  const lancer = (k: number) => {
    const r = REGIONS_CARTE[k];
    if (!r) return;
    chargerDepartements(r.code)
      .catch(() => undefined)
      .finally(() => window.setTimeout(() => lancer(k + 1), 120));
  };
  const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(() => lancer(0), { timeout: 2500 });
  else window.setTimeout(() => lancer(0), 1200);
}

export function CarteFrance({
  departement,
  onDepartement,
  onZoom,
}: {
  departement: string | null;
  onDepartement: (code: string, nom: string) => void;
  /** Une région (ou l'outre-mer) est ouverte : la barre « Continuer » ne cache pas la France entière. */
  onZoom?: (ouvert: boolean) => void;
}) {
  const [choix, setChoix] = useState<ChoixRegion | null>(null);
  const [deps, setDeps] = useState<DepartementCarte[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const region = choix?.type === "metropole" ? choix.region : null;
  useEffect(() => {
    onZoom?.(!!choix);
  }, [choix, onZoom]);
  // Le cadre visé (stable tant que la région ne change pas) et sa transformation ; « posé » une fois le zoom fini.
  const cible = useMemo(() => (region ? cadreRegion(region) : VUE_FRANCE), [region]);
  const [posee, setPosee] = useState<string | null>(null);
  const pose = !!region && posee === region.code;
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    precharger();
  }, []);
  // La fin du zoom : à la fin de la transition, ou au plus tard un peu après (onglet caché, animations coupées).
  useEffect(() => {
    if (!region) return;
    const id = window.setTimeout(() => setPosee(region.code), DUREE_ZOOM + 120);
    return () => window.clearTimeout(id);
  }, [region]);

  // Le département déjà choisi (retour en arrière dans l'onboarding) rouvre sa région, une fois, à l'arrivée sur la carte ;
  // « Toute la France » n'est ensuite jamais annulé.
  const rouverte = useRef(false);
  useEffect(() => {
    if (rouverte.current) return;
    rouverte.current = true;
    if (!departement || choix) return;
    const r = REGIONS_CARTE.find((x) => x.departements.includes(departement));
    const om = OUTRE_MER.find((x) => x.code === departement);
    const id = requestAnimationFrame(() => {
      if (r) setChoix({ type: "metropole", region: r });
      else if (om) setChoix({ type: "outre-mer", code: om.code, nom: om.nom });
    });
    return () => cancelAnimationFrame(id);
  }, [departement, choix]);

  useEffect(() => {
    if (!region) return;
    let fini = false;
    chargerDepartements(region.code).then(
      (d) => {
        if (!fini) {
          setDeps(d);
          setErreur(false);
        }
      },
      () => {
        if (!fini) setErreur(true);
      },
    );
    return () => {
      fini = true;
    };
  }, [region]);

  const choisirRegion = useCallback((r: RegionCarte) => {
    setDeps(null);
    setPosee(null);
    setChoix({ type: "metropole", region: r });
    requestAnimationFrame(() => titre.current?.focus());
  }, []);
  const revenir = () => {
    setChoix(null);
    setDeps(null);
    setPosee(null);
  };

  // Tailles en unités de la carte, pour le cadre d'arrivée : le texte des départements a sa taille d'écran une fois zoomé.
  const echelle = cible[2] / VUE_FRANCE[2];
  const police = cible[2] / 30;
  const depsAffiches = region && deps && deps.every((d) => region.departements.includes(d.code)) ? deps : null;

  return (
    <div className="mzo-carte">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 ref={titre} tabIndex={-1} className="text-[20px] font-extrabold outline-none">
          {choix ? (choix.type === "metropole" ? choix.region.nom : choix.nom) : "Tu travailles où ?"}
        </h2>
        {choix ? (
          <button
            type="button"
            onClick={revenir}
            className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-semibold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Toute la France
          </button>
        ) : null}
      </div>
      <p className="text-[15px] text-muted">{choix ? "Touche ton département." : "Touche ta région."}</p>

      {choix?.type === "outre-mer" ? null : (
        <div className="mzo-carte-cadre">
          <svg
            className={`mzo-carte-svg${pose ? " posee" : ""}`}
            viewBox={`0 0 ${VUE_FRANCE[2]} ${VUE_FRANCE[3]}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={region ? `Carte : départements de la région ${region.nom}` : "Carte des régions de France"}
          >
            <defs>
              <filter id="mzo-flou" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation={2.6 * echelle} />
              </filter>
            </defs>
            <g
              className="mzo-scene"
              style={{ transform: transformation(cible) }}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && region) setPosee(region.code);
              }}
            >
              <g transform={`translate(${-VUE_FRANCE[0]} ${-VUE_FRANCE[1]})`}>
                <g filter={pose ? "url(#mzo-flou)" : undefined} className={region ? "mzo-fond" : undefined}>
                  {REGIONS_CARTE.map((r) => (
                    <path
                      key={r.code}
                      d={r.d}
                      className={`mzo-region${region?.code === r.code ? " courante" : ""}`}
                      data-region={r.code}
                      role={region ? undefined : "button"}
                      tabIndex={region ? -1 : 0}
                      aria-label={region ? undefined : r.nom}
                      onPointerEnter={region ? undefined : () => void chargerDepartements(r.code).catch(() => undefined)}
                      onPointerDown={region ? undefined : () => void chargerDepartements(r.code).catch(() => undefined)}
                      onClick={region ? undefined : () => choisirRegion(r)}
                      onKeyDown={
                        region
                          ? undefined
                          : (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                choisirRegion(r);
                              }
                            }
                      }
                    />
                  ))}
                </g>
                <g className={`mzo-noms${region ? " caches" : ""}`} aria-hidden="true">
                  {REGIONS_CARTE.map((r) => (
                    <text key={r.code} x={r.centre[0]} y={r.centre[1]} className="mzo-nom-region" textAnchor="middle" fontSize={VUE_FRANCE[2] / 58}>
                      {r.code === "11"
                        ? "IDF"
                        : r.nom
                            .replace("Provence-Alpes-Côte d'Azur", "PACA")
                            .replace("Bourgogne-Franche-Comté", "Bourgogne-F.-C.")
                            .replace("Centre-Val de Loire", "Centre-VdL")
                            .replace("Auvergne-Rhône-Alpes", "Auvergne-R.-A.")}
                    </text>
                  ))}
                </g>
                {depsAffiches ? (
                  <>
                    {depsAffiches.map((d) => {
                      const on = d.code === departement;
                      return (
                        <g
                          key={d.code}
                          className={`mzo-dep${on ? " on" : ""}`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={on}
                          aria-label={`${d.nom} (${d.code})`}
                          data-departement={d.code}
                          onClick={() => onDepartement(d.code, d.nom)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onDepartement(d.code, d.nom);
                            }
                          }}
                        >
                          <path d={d.d} />
                        </g>
                      );
                    })}
                    {/* Les noms par-dessus tous les contours : un département voisin ne les coupe jamais. */}
                    <g className="mzo-noms-deps" aria-hidden="true">
                      {depsAffiches.map((d) => {
                        // Le nom tient dans son département : réduit au besoin (jusqu'aux trois quarts), sinon le numéro seul.
                        const largeur = d.boite[2] - d.boite[0];
                        const ajuste = Math.min(1, (largeur * 0.9) / (d.nom.length * police * 0.56));
                        const petit = largeur < cible[2] / 7 || ajuste < 0.72;
                        return (
                          <text
                            key={d.code}
                            x={d.centre[0]}
                            y={d.centre[1]}
                            textAnchor="middle"
                            className={d.code === departement ? "on" : undefined}
                            fontSize={petit ? police * 0.85 : police * ajuste}
                          >
                            {petit ? d.code : d.nom}
                            {petit ? null : (
                              <tspan x={d.centre[0]} dy={police * 1.15} fontSize={police * 0.8} className="mzo-code">
                                {d.code}
                              </tspan>
                            )}
                          </text>
                        );
                      })}
                    </g>
                  </>
                ) : null}
              </g>
            </g>
          </svg>
          {region && !depsAffiches && (pose || erreur) ? (
            <p className="mzo-chargement">{erreur ? "La carte ne s'affiche pas : choisis dans la liste dessous." : "Je zoome…"}</p>
          ) : null}
        </div>
      )}

      {/* Les mêmes choix en boutons : au pouce, au clavier, et pour les petits départements. */}
      {!choix ? (
        <>
          <ul className="mzo-pastilles" aria-label="Choisis ta région">
            {REGIONS_CARTE.map((r) => (
              <li key={r.code}>
                <button
                  type="button"
                  data-pastille-region={r.code}
                  onPointerDown={() => void chargerDepartements(r.code).catch(() => undefined)}
                  onClick={() => choisirRegion(r)}
                >
                  {r.nom}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] font-semibold text-muted">Outre-mer</p>
          <ul className="mzo-pastilles" aria-label="Outre-mer">
            {OUTRE_MER.map((o) => (
              <li key={o.code}>
                <button type="button" data-pastille-region={o.code} onClick={() => setChoix({ type: "outre-mer", code: o.code, nom: o.nom })}>
                  {o.nom}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="mzo-pastilles" aria-label="Choisis ton département">
          {(choix.type === "metropole"
            ? choix.region.departements.map((c) => ({ code: c, nom: departementConnu(c)?.nom ?? null }))
            : [{ code: choix.code, nom: choix.nom }]
          ).map((d) => (
            <li key={d.code}>
              <button type="button" aria-pressed={d.code === departement} data-pastille={d.code} onClick={() => onDepartement(d.code, d.nom ?? d.code)}>
                {d.code === departement ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
                {d.nom ?? d.code} <span>{d.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
