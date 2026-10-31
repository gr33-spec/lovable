"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Les trois mouvements de la landing « premium V3 » (Greg, 30 octobre 2026), repris du script de la maquette : le menu du
 * téléphone, le bouton d'inscription fixe en bas (visible seulement quand celui de l'accroche a quitté l'écran, caché devant
 * celui du bas et menu ouvert) et la démonstration des 20 artisans (au défilement, une fois, puis « Rejouer »). Les styles
 * sont dans `app/(public)/decouvrir/premium.css`.
 */

function Fleche() {
  return (
    <svg className="arrow" aria-hidden="true">
      <use href="#i-arrow" />
    </svg>
  );
}

const ANCRES = [
  { href: "#fonctionnement", label: "Comment ça marche" },
  { href: "#collectif", label: "Achats groupés" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "#questions", label: "Questions" },
] as const;

export function EntetePremium() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <header className="site-header">
      <div className="wrap nav">
        <a href="#haut" className="brand" aria-label="Mobiiz, retour en haut">
          {/* eslint-disable-next-line @next/next/no-img-element -- le logo de la maquette, déjà à la bonne taille */}
          <img src="/landing/v3/logo-mobiiz.png" alt="Mobiiz" width={151} height={44} />
        </a>
        <nav className={`nav-links${ouvert ? " open" : ""}`} id="navMenu" aria-label="Navigation principale">
          {ANCRES.map((a) => (
            <a key={a.href} href={a.href} onClick={() => setOuvert(false)}>
              {a.label}
            </a>
          ))}
          {/* Sur téléphone, l'en-tête cache « Se connecter » (maquette) : il revient dans le menu, sinon on ne peut plus se connecter. */}
          <Link href="/connexion" className="nav-mobile">
            Se connecter
          </Link>
        </nav>
        <div className="nav-right">
          <Link href="/connexion">Se connecter</Link>
          <Link className="btn btn-yellow" href="/inscription">
            Commencer gratuitement <Fleche />
          </Link>
          <button type="button" className="menu-toggle" aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={ouvert} aria-controls="navMenu" onClick={() => setOuvert((o) => !o)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

/** `haut` et `bas` : les identifiants des deux boutons d'inscription de la page. */
/** `aussi` : d'autres boutons principaux de la page ; le bouton fixe s'efface quand l'un d'eux est à l'écran (un seul à la fois). */
export function CtaFixePremium({ haut, bas, aussi = [], bouton }: { haut: string; bas: string; aussi?: readonly string[]; bouton: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let image = 0;
    const synchro = () => {
      image = 0;
      const h = document.getElementById(haut)?.getBoundingClientRect();
      const b = document.getElementById(bas)?.getBoundingClientRect();
      if (!h || !b || window.innerWidth > 900) return setVisible(false);
      const hautVisible = h.bottom > 100 && h.top < window.innerHeight - 15;
      const basVisible = b.bottom > 100 && b.top < window.innerHeight - 20;
      const menuOuvert = !!document.querySelector(".mzp .nav-links.open");
      const autreVisible = aussi.some((id) => {
        const r = document.getElementById(id)?.getBoundingClientRect();
        return !!r && r.bottom > 60 && r.top < window.innerHeight - 15;
      });
      setVisible(!hautVisible && !basVisible && !autreVisible && !menuOuvert && window.scrollY > 240);
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
  }, [haut, bas, aussi]);
  return (
    <div className={`sticky-cta${visible ? " visible" : ""}`} aria-hidden={!visible} data-visible={visible ? "" : undefined}>
      <Link className="btn btn-yellow" href="/inscription" tabIndex={visible ? 0 : -1}>
        {bouton} <Fleche />
      </Link>
      <div className="under">Gratuit · Sans carte bancaire</div>
    </div>
  );
}

const TOTAL = 20;
const DUREE_MS = 4700;
/** Exemple fictif de la maquette : 6,00 € HT/L seul, 3,00 € à vingt. Jamais un prix réel. */
const PRIX_SEUL = 6;
const PRIX_A_VINGT = 3;
const prixPour = (n: number) => PRIX_SEUL - ((PRIX_SEUL - PRIX_A_VINGT) * (n - 1)) / (TOTAL - 1);
const euros = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** La démonstration des 20 casques : démarre quand la carte entre à l'écran, une seule fois ; « Rejouer » la relance. */
export function DemoVingtArtisans() {
  const [n, setN] = useState(1);
  const carte = useRef<HTMLDivElement>(null);
  const anim = useRef(0);
  const jouer = useCallback(() => {
    if (anim.current) cancelAnimationFrame(anim.current);
    setN(1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(TOTAL);
      return;
    }
    let debut = 0;
    const image = (t: number) => {
      if (!debut) debut = t;
      const p = Math.min(1, (t - debut) / DUREE_MS);
      const adouci = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setN(1 + Math.floor(adouci * (TOTAL - 1) + 1e-8));
      anim.current = p < 1 ? requestAnimationFrame(image) : 0;
    };
    anim.current = requestAnimationFrame(image);
  }, []);
  useEffect(() => {
    const el = carte.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => jouer());
      return () => cancelAnimationFrame(id);
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          obs.disconnect();
          jouer();
        }
      },
      { threshold: 0.22 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (anim.current) cancelAnimationFrame(anim.current);
    };
  }, [jouer]);
  const prix = prixPour(n);
  return (
    <div className="animation-card" id="animationSurface" ref={carte} data-artisans={n}>
      <div className="demo-header">
        <span className="smallcap">Démonstration interactive</span>
        <span className="demo-tag">EXEMPLE FICTIF</span>
      </div>
      <div className="demo-numbers">
        <div className="metric">
          <span className="metric-label">Artisans réunis</span>
          <div className="metric-main">
            <strong>{n}</strong>
            <small>/ {TOTAL}</small>
          </div>
          <div className="metric-foot">Le collectif se construit</div>
        </div>
        <div className="metric is-price">
          <span className="metric-label">Prix de peinture HT / L</span>
          <div className="metric-main">
            <strong>{euros(prix)}</strong>
            <small>€</small>
          </div>
          <div className="metric-foot">{n === 1 ? "Prix de départ" : `−${Math.round(((PRIX_SEUL - prix) / PRIX_SEUL) * 100)} % dans cet exemple`}</div>
        </div>
      </div>
      <div className="workers-head">
        <span>La force du nombre</span>
        <small>
          {n} artisan{n > 1 ? "s" : ""} sur {TOTAL}
        </small>
      </div>
      <div className="worker-grid" role="img" aria-label={`${n} artisan${n > 1 ? "s" : ""} sur ${TOTAL} réunis`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} className={i < n ? "worker on pop" : "worker"}>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <use href="#i-helmet" />
            </svg>
          </span>
        ))}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${n * 5}%` }} />
      </div>
      <div className="demo-payoff">
        <p aria-live="polite">{n === TOTAL ? "20 artisans réunis. Plus on est, moins on paie." : "À plusieurs, on négocie plus fort."}</p>
        <button className="replay" type="button" aria-label="Revoir l'animation" onClick={jouer}>
          <span aria-hidden="true">↻</span> Rejouer
        </button>
      </div>
      <p className="disclaimer">Simulation pédagogique fictive (6 € → 3 € HT/L). Aucun prix ni pourcentage d’économie garanti ; les prix réels dépendent des offres reçues.</p>
    </div>
  );
}

/**
 * « PLUS ON EST, MOINS ON PAIE » EN TROIS PALIERS (maquette de Greg, 31 octobre 2026) : 1 artisan, 5, puis 20 ; les prix
 * d'exemple baissent, le dernier en jaune. Les paliers s'allument l'un après l'autre quand la bande arrive à l'écran
 * (`data-palier` de 0 à 3) ; sous « réduire les animations », tout est allumé d'emblée. Exemple fictif, jamais un prix réel.
 */
const PALIERS = [
  { artisans: 1, prix: "1 480 €", ico: "i-person" },
  { artisans: 5, prix: "1 280 €", ico: "i-people" },
  { artisans: 20, prix: "1 190 €", ico: "i-people" },
] as const;

export function PaliersCollectif() {
  const ref = useRef<HTMLDivElement>(null);
  const [palier, setPalier] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setPalier(PALIERS.length));
      return () => cancelAnimationFrame(id);
    }
    let minuteries: number[] = [];
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        obs.disconnect();
        minuteries = PALIERS.map((_, i) => window.setTimeout(() => setPalier(i + 1), 250 + i * 650));
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      minuteries.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return (
    <div ref={ref} className="mz2-paliers" data-palier={palier} role="img" aria-label="Exemple fictif : 1 480 € seul, 1 280 € à 5 artisans, 1 190 € à 20 artisans">
      {PALIERS.map((p, i) => (
        <div key={p.artisans} className={`mz2-palier${i < palier ? " on" : ""}${i === PALIERS.length - 1 ? " dernier" : ""}`}>
          <svg className="mz2-palier-ico" aria-hidden="true">
            <use href={`#${p.ico}`} />
          </svg>
          <span className="mz2-palier-qui">
            {p.artisans} artisan{p.artisans > 1 ? "s" : ""}
          </span>
          <span className="mz2-palier-prix">{p.prix}</span>
          {i < PALIERS.length - 1 ? (
            <span className="mz2-palier-fleche" aria-hidden="true">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
