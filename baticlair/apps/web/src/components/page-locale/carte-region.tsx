"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { choisirDepartement, lienInscription, useDepartementChoisi } from "@/lib/regions/departement-choisi";
import type { Departement } from "@/lib/regions/fiche";

export interface TraceRegion extends Departement {
  d: string;
  centre: readonly [number, number];
}

/**
 * LA CARTE DE LA RÉGION (Greg, 19 novembre 2026) : le reste de la France flouté en fond (rendu par le serveur, `fond`),
 * la région nette par-dessus, chaque département touchable (le tracé, et sa pastille dessous pour le pouce et le
 * clavier). Toucher un département le retient (`choisirDepartement`) : il suit les boutons « Commencer » et se retrouve
 * rempli à l'inscription ; le bloc dessous dit les regroupements en cours de ce département.
 */
export function CarteRegion({
  departements,
  viewBox,
  ratioTelephone,
  fond,
  metier,
  lots,
  depuis,
  invite,
}: {
  departements: readonly TraceRegion[];
  viewBox: string;
  /** Sur téléphone, le cadre ne garde que la région (le reste de la France est coupé à droite) : largeur / hauteur. */
  ratioTelephone: number;
  fond: React.ReactNode;
  metier: string;
  lots: readonly string[];
  depuis: string;
  invite: string;
}) {
  const codes = departements.map((d) => d.code);
  const choisi = useDepartementChoisi(codes);
  const dep = departements.find((d) => d.code === choisi) ?? null;
  return (
    <div className="mzr-carte">
      <div className="mzr-carte-cadre" style={{ "--mzr-ratio-tel": ratioTelephone, "--mzr-ratio": viewBox.split(" ").slice(2).map(Number).reduce((l, h) => l / h) } as React.CSSProperties}>
        <svg
          className="mzr-carte-svg"
          viewBox={viewBox}
          role="group"
          aria-label={`Carte : ${departements.map((d) => d.nom).join(", ")}`}
          preserveAspectRatio="xMinYMid slice"
        >
          {fond}
          {departements.map((d) => {
            const on = d.code === choisi;
            return (
              <g
                key={d.code}
                className={`mzr-dep${on ? " on" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`Je suis ${d.dans}`}
                data-departement={d.code}
                onClick={() => choisirDepartement(d.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    choisirDepartement(d.code);
                  }
                }}
              >
                <path d={d.d} />
                <text x={d.centre[0]} y={d.centre[1]} textAnchor="middle" aria-hidden="true">
                  <tspan className="mzr-dep-nom">{d.nom}</tspan>
                  <tspan className="mzr-dep-code" x={d.centre[0]} dy="13">
                    {d.code}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mzr-carte-invite" aria-live="polite">
        {dep ? (
          <>
            <span className="mzr-coche" aria-hidden="true">
              ✓
            </span>{" "}
            Je suis {dep.dans}
          </>
        ) : (
          invite
        )}
      </p>
      <ul className="mzr-pastilles" aria-label="Choisis ton département">
        {departements.map((d) => (
          <li key={d.code}>
            <button type="button" aria-pressed={d.code === choisi} onClick={() => choisirDepartement(d.code)} data-pastille={d.code}>
              {d.nom} <span>{d.code}</span>
            </button>
          </li>
        ))}
      </ul>
      <Regroupements dep={dep} metier={metier} lots={lots} depuis={depuis} />
    </div>
  );
}

interface Achat {
  nom: string;
  finLe: string;
}

function finDans(iso: string): string {
  const jours = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
  if (jours <= 1) return "Se termine demain";
  return `Se termine dans ${jours} jours`;
}

/**
 * LES REGROUPEMENTS EN COURS du département touché : le nom du produit et sa fin, jamais une entreprise ni une quantité.
 * Aucun : jamais « 0 », mais « Sois le premier à lancer un regroupement dans ton département ». Le serveur injoignable
 * se tait (pas de faux « aucun »).
 */
function Regroupements({ dep, metier, lots, depuis }: { dep: Departement | null; metier: string; lots: readonly string[]; depuis: string }) {
  const [etat, setEtat] = useState<{ code: string; achats: Achat[]; total: number } | "erreur" | null>(null);
  const code = dep?.code ?? null;
  useEffect(() => {
    if (!code) return;
    let fini = false;
    const p = new URLSearchParams({ departement: code, lots: lots.join(",") });
    fetch(`/v1/public/regroupements?${p.toString()}`, {
      headers: { accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { total: number; achats: Achat[] }) => {
        if (!fini) setEtat({ code, achats: b.achats ?? [], total: b.total ?? 0 });
      })
      .catch(() => {
        if (!fini) setEtat("erreur");
      });
    return () => {
      fini = true;
    };
  }, [code, lots]);

  const lien = lienInscription(metier, code, depuis);
  if (!dep) {
    return (
      <div className="mzr-regroupements mzr-regroupements-vide" id="regroupements">
        <p>Touche ton département : tu verras les regroupements en cours près de chez toi.</p>
      </div>
    );
  }
  const pret = etat && etat !== "erreur" && etat.code === dep.code ? etat : null;
  return (
    <div
      className="mzr-regroupements"
      id="regroupements"
      aria-live="polite"
      data-etat={pret ? (pret.total ? "en-cours" : "aucun") : etat === "erreur" ? "erreur" : "chargement"}
    >
      <h2 className="mzr-regroupements-titre">Regroupements en cours {dep.dans}</h2>
      {pret && pret.total > 0 ? (
        <>
          <ul className="mzr-achats">
            {pret.achats.map((a) => (
              <li key={`${a.nom}-${a.finLe}`}>
                <span className="mzr-achat-nom">{a.nom}</span>
                <span className="mzr-achat-fin">{finDans(a.finLe)}</span>
              </li>
            ))}
          </ul>
          {pret.total > pret.achats.length ? <p className="mzr-achats-plus">Et d’autres dans l’application.</p> : null}
          <Link className="btn btn-yellow mzr-btn" href={lien}>
            Rejoindre un regroupement <Fleche />
          </Link>
        </>
      ) : pret ? (
        <>
          <p className="mzr-premier">Sois le premier à lancer un regroupement dans ton département.</p>
          <Link className="btn btn-yellow mzr-btn" href={lien}>
            Lancer le premier <Fleche />
          </Link>
        </>
      ) : etat === "erreur" ? (
        <p className="mzr-premier">Les regroupements se voient dans l’application, une fois inscrit.</p>
      ) : (
        <p className="mzr-chargement">Je regarde…</p>
      )}
    </div>
  );
}

function Fleche() {
  return (
    <svg className="arrow" aria-hidden="true">
      <use href="#i-arrow" />
    </svg>
  );
}

/** Un bouton « Commencer » qui suit le département touché sur la carte. */
export function LienCommencer({
  id,
  className,
  metier,
  codes,
  depuis,
  children,
}: {
  id?: string;
  className: string;
  metier: string;
  codes: readonly string[];
  depuis: string;
  children: React.ReactNode;
}) {
  const choisi = useDepartementChoisi(codes);
  return (
    <Link id={id} className={className} href={lienInscription(metier, choisi, depuis)}>
      {children}
    </Link>
  );
}

/**
 * Le bouton fixe du téléphone (même comportement que la landing, `CtaFixePremium`) : visible quand les boutons du haut et
 * du bas ont quitté l'écran, avec le département touché.
 */
export function CtaFixeLocal({ haut, bas, metier, codes, depuis }: { haut: string; bas: string; metier: string; codes: readonly string[]; depuis: string }) {
  const [visible, setVisible] = useState(false);
  const choisi = useDepartementChoisi(codes);
  useEffect(() => {
    let image = 0;
    const synchro = () => {
      image = 0;
      const h = document.getElementById(haut)?.getBoundingClientRect();
      const b = document.getElementById(bas)?.getBoundingClientRect();
      if (!h || !b || window.innerWidth > 900) return setVisible(false);
      const vu = (r: DOMRect) => r.bottom > 100 && r.top < window.innerHeight - 15;
      const menuOuvert = !!document.querySelector(".mzp .nav-links.open");
      setVisible(!vu(h) && !vu(b) && !menuOuvert && window.scrollY > 240);
    };
    const planifier = () => {
      if (!image) image = requestAnimationFrame(synchro);
    };
    synchro();
    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier, { passive: true });
    return () => {
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
      if (image) cancelAnimationFrame(image);
    };
  }, [haut, bas]);
  return (
    <div className={`sticky-cta${visible ? " visible" : ""}`} aria-hidden={!visible} data-visible={visible ? "" : undefined}>
      <Link className="btn btn-yellow" href={lienInscription(metier, choisi, depuis)} tabIndex={visible ? 0 : -1}>
        Commencer gratuitement <Fleche />
      </Link>
      <div className="under">Gratuit · Sans carte bancaire</div>
    </div>
  );
}

/** Le menu du téléphone de la page locale (mêmes classes que la landing). */
export function EnteteLocale({
  ancres,
  metier,
  codes,
  depuis,
}: {
  ancres: readonly { href: string; label: string }[];
  metier: string;
  codes: readonly string[];
  depuis: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link href="/" className="brand" aria-label="Mobiiz, accueil">
          {/* eslint-disable-next-line @next/next/no-img-element -- le logo de la maquette, déjà à la bonne taille */}
          <img className="mzr-logo-sombre" src="/landing/v3/logo-mobiiz.png" alt="Mobiiz" width={151} height={44} />
          {/* eslint-disable-next-line @next/next/no-img-element -- le logo aux lettres noires, pour le thème clair */}
          <img className="mzr-logo-clair" src="/marque/logo-clair.png" alt="" aria-hidden="true" width={163} height={44} />
        </Link>
        <nav className={`nav-links${ouvert ? " open" : ""}`} id="navMenu" aria-label="Navigation de la page">
          {ancres.map((a) => (
            <a key={a.href} href={a.href} onClick={() => setOuvert(false)}>
              {a.label}
            </a>
          ))}
          <Link href="/connexion" className="nav-mobile">
            Se connecter
          </Link>
        </nav>
        <div className="nav-right">
          <Link href="/connexion">Se connecter</Link>
          <LienCommencer className="btn btn-yellow" metier={metier} codes={codes} depuis={depuis}>
            Commencer <Fleche />
          </LienCommencer>
          <button
            type="button"
            className="menu-toggle"
            aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={ouvert}
            aria-controls="navMenu"
            onClick={() => setOuvert((o) => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
