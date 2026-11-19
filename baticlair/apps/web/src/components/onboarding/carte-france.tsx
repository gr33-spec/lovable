"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { OUTRE_MER, REGIONS_CARTE, VUE_FRANCE, type RegionCarte } from "@/lib/carte/france-regions";
import { departementConnu } from "@/lib/metiers-inscription";

/**
 * LA CARTE DE L'ONBOARDING (Greg, 19 novembre 2026) : la France découpée en régions ; un toucher sur une région la zoome
 * (animation du cadre, coupée sous « réduire les animations ») et la découpe en départements, chargés à ce moment-là
 * (`/cartes/region-<code>.json`, 3 à 24 Ko). Le reste de la France reste derrière, flouté. « Toute la France » revient en
 * arrière. Sous la carte, les mêmes choix en boutons, faciles au pouce (les petits départements d'Île-de-France compris) ;
 * la Corse est sur la carte et dans la liste, l'outre-mer dans la liste.
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

const DUREE_ZOOM = 650;
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

function useCadreAnime(cible: Vue): Vue {
  const [vue, setVue] = useState<Vue>(cible);
  const depuis = useRef<Vue>(cible);
  const courant = useRef<Vue>(cible);
  useEffect(() => {
    const reduit = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) {
      courant.current = cible;
      // Sans animation : le cadre suit la cible au prochain affichage.
      const id = requestAnimationFrame(() => setVue(cible));
      return () => cancelAnimationFrame(id);
    }
    depuis.current = courant.current;
    let debut = 0;
    let id = 0;
    const image = (t: number) => {
      if (!debut) debut = t;
      const p = Math.min(1, (t - debut) / DUREE_ZOOM);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const v = depuis.current.map((a, i) => a + (cible[i]! - a) * e) as unknown as Vue;
      courant.current = v;
      setVue(v);
      if (p < 1) id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [cible]);
  return vue;
}

export function CarteFrance({ departement, onDepartement }: { departement: string | null; onDepartement: (code: string, nom: string) => void }) {
  const [choix, setChoix] = useState<ChoixRegion | null>(null);
  const [deps, setDeps] = useState<DepartementCarte[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const region = choix?.type === "metropole" ? choix.region : null;
  const cible = region ? cadreRegion(region) : VUE_FRANCE;
  const vue = useCadreAnime(cible);
  const titre = useRef<HTMLHeadingElement>(null);

  // Le département déjà choisi (retour en arrière dans l'onboarding) rouvre sa région.
  useEffect(() => {
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
    setChoix({ type: "metropole", region: r });
    requestAnimationFrame(() => titre.current?.focus());
  }, []);
  const revenir = () => {
    setChoix(null);
    setDeps(null);
  };

  // Tailles en unités de la carte, d'après la largeur visible : le texte garde la même taille à l'écran à chaque zoom.
  const echelle = vue[2] / VUE_FRANCE[2];
  const police = vue[2] / 30;
  const trait = vue[2] / 420;
  const depsAffiches = region && deps && deps.every((d) => region.departements.includes(d.code)) ? deps : null;

  return (
    <div className="mzo-carte">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 ref={titre} tabIndex={-1} className="text-[20px] font-extrabold outline-none">
          {choix ? (choix.type === "metropole" ? choix.region.nom : choix.nom) : "Tu travailles où ?"}
        </h2>
        {choix ? (
          <button type="button" onClick={revenir} className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-semibold">
            <ArrowLeft size={16} aria-hidden="true" /> Toute la France
          </button>
        ) : null}
      </div>
      <p className="text-[15px] text-muted">{choix ? "Touche ton département." : "Touche ta région."}</p>

      {choix?.type === "outre-mer" ? null : (
        <div className="mzo-carte-cadre">
          <svg className="mzo-carte-svg" viewBox={vue.join(" ")} preserveAspectRatio="xMidYMid meet" role="group" aria-label={region ? `Carte : départements de la région ${region.nom}` : "Carte des régions de France"}>
            <defs>
              <filter id="mzo-flou" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation={3 * echelle} />
              </filter>
            </defs>
            <g filter={region ? "url(#mzo-flou)" : undefined} className={region ? "mzo-fond" : undefined}>
              {REGIONS_CARTE.map((r) => (
                <path
                  key={r.code}
                  d={r.d}
                  className={`mzo-region${region?.code === r.code ? " courante" : ""}`}
                  data-region={r.code}
                  role={region ? undefined : "button"}
                  tabIndex={region ? -1 : 0}
                  aria-label={region ? undefined : r.nom}
                  strokeWidth={trait}
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
            {!region
              ? REGIONS_CARTE.map((r) => (
                  <text key={r.code} x={r.centre[0]} y={r.centre[1]} className="mzo-nom-region" textAnchor="middle" aria-hidden="true" fontSize={VUE_FRANCE[2] / 58}>
                    {r.code === "11" ? "IDF" : r.nom.replace("Provence-Alpes-Côte d'Azur", "PACA").replace("Bourgogne-Franche-Comté", "Bourgogne-F.-C.").replace("Centre-Val de Loire", "Centre-VdL").replace("Auvergne-Rhône-Alpes", "Auvergne-R.-A.")}
                  </text>
                ))
              : null}
            {depsAffiches
              ? depsAffiches.map((d) => {
                  const on = d.code === departement;
                  const petit = d.boite[2] - d.boite[0] < vue[2] / 7;
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
                      <path d={d.d} strokeWidth={trait * 1.2} />
                      <text x={d.centre[0]} y={d.centre[1]} textAnchor="middle" aria-hidden="true" fontSize={petit ? police * 0.85 : police}>
                        {petit ? d.code : d.nom}
                        {petit ? null : (
                          <tspan x={d.centre[0]} dy={police * 1.15} fontSize={police * 0.8} className="mzo-code">
                            {d.code}
                          </tspan>
                        )}
                      </text>
                    </g>
                  );
                })
              : null}
          </svg>
          {region && !depsAffiches ? <p className="mzo-chargement">{erreur ? "La carte ne s'affiche pas : choisis dans la liste dessous." : "Je zoome…"}</p> : null}
        </div>
      )}

      {/* Les mêmes choix en boutons : au pouce, au clavier, et pour les petits départements. */}
      {!choix ? (
        <>
          <ul className="mzo-pastilles" aria-label="Choisis ta région">
            {REGIONS_CARTE.map((r) => (
              <li key={r.code}>
                <button type="button" data-pastille-region={r.code} onClick={() => choisirRegion(r)}>
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
