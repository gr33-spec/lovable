"use client";

import { ChevronLeft, ChevronRight, Images, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { lienAppel, type RealisationPublique } from "@baticlair/domain/page-entreprise";
import { Photo } from "./photo";

/**
 * Les gestes de la page publique, en îlots client (le reste est rendu par le serveur) : le menu déroulant du téléphone,
 * le bouton « Appeler » fixé en bas une fois l'accueil passé (sans doublon avec celui de la barre du haut), et la
 * visionneuse des photos d'un chantier. Aucun écouteur de défilement : un IntersectionObserver sur l'accueil.
 */
export function SuiviDefilement() {
  const repere = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const racine = repere.current?.closest<HTMLElement>(".pe");
    const accueil = racine?.querySelector("#accueil");
    if (!racine || !accueil || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (!e) return;
      if (!e.isIntersecting && e.boundingClientRect.top < 0) racine.dataset.defile = "1";
      else delete racine.dataset.defile;
    });
    io.observe(accueil);
    return () => io.disconnect();
  }, []);
  return <span ref={repere} hidden />;
}

export function EnTeteSite({ nom, logo, initiales, telephone, menu }: { nom: string; logo: string | null; initiales: string; telephone: string | null; menu: { id: string; libelle: string }[] }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <header className="pe-entete">
      <div className="pe-cadre pe-entete-ligne">
        <a href="#accueil" className="pe-marque" onClick={() => setOuvert(false)}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="pe-logo" width={40} height={40} />
          ) : (
            <span className="pe-initiales" aria-hidden="true">
              {initiales}
            </span>
          )}
          <span className="pe-marque-nom">{nom}</span>
        </a>
        <nav className="pe-nav" aria-label="Menu de la page">
          {menu.map((m) => (
            <a key={m.id} href={`#${m.id}`}>
              {m.libelle}
            </a>
          ))}
        </nav>
        {telephone ? (
          <a href={lienAppel(telephone)} className="pe-btn pe-btn-appel pe-entete-appel">
            <Phone size={17} strokeWidth={2.4} aria-hidden="true" />
            <span className="pe-entete-appel-court">Appeler</span>
            <span className="pe-entete-appel-long">{telephone}</span>
          </a>
        ) : null}
        <button type="button" className="pe-menu-bouton" aria-expanded={ouvert} aria-controls="pe-menu-tel" aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOuvert((v) => !v)}>
          {ouvert ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      {ouvert ? (
        <nav id="pe-menu-tel" className="pe-menu-tel" aria-label="Menu">
          {menu.map((m) => (
            <a key={m.id} href={`#${m.id}`} onClick={() => setOuvert(false)}>
              {m.libelle}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

/** Un chantier : sa première photo en grand, son titre dessus ; on touche pour voir toutes ses photos. */
export function ChantierRealise({ realisation: r, nom }: { realisation: RealisationPublique; nom: string }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const bande = useRef<HTMLDivElement>(null);
  const aller = (pas: number) => {
    const b = bande.current;
    if (b) b.scrollBy({ left: pas * b.clientWidth, behavior: "smooth" });
  };
  useEffect(() => {
    if (ouvert === null) return;
    const allerDe = (pas: number) => {
      const b = bande.current;
      if (b) b.scrollBy({ left: pas * b.clientWidth, behavior: "smooth" });
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(null);
      if (e.key === "ArrowRight") allerDe(1);
      if (e.key === "ArrowLeft") allerDe(-1);
    };
    document.addEventListener("keydown", touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    bande.current?.children[ouvert]?.scrollIntoView({ inline: "start", block: "nearest" });
    return () => {
      document.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
  }, [ouvert]);
  const premiere = r.photos[0];
  if (!premiere) return null;
  return (
    <>
      <button type="button" className="pe-chantier" onClick={() => setOuvert(0)} aria-label={`${r.titre} : voir ${r.photos.length > 1 ? `les ${r.photos.length} photos` : "la photo"}`}>
        <Photo photo={premiere} alt="" sizes="(min-width: 900px) 50vw, 100vw" />
        <span className="pe-chantier-legende">
          <span className="pe-chantier-titre">{r.titre}</span>
          {r.photos.length > 1 ? (
            <span className="pe-chantier-nombre">
              <Images size={16} aria-hidden="true" /> {r.photos.length} photos
            </span>
          ) : null}
        </span>
      </button>
      {ouvert !== null ? (
        <div className="pe-visionneuse" role="dialog" aria-modal="true" aria-label={`${r.titre}, photos de ${nom}`}>
          <div className="pe-visionneuse-haut">
            <p>{r.titre}</p>
            <button type="button" onClick={() => setOuvert(null)} aria-label="Fermer" className="pe-rond">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div ref={bande} className="pe-visionneuse-bande">
            {r.photos.map((ph, i) => (
              <figure key={ph.id}>
                <Photo photo={ph} alt={ph.legende ?? `${r.titre}, photo ${i + 1}`} sizes="100vw" />
                {ph.legende && ph.legende !== r.titre ? <figcaption>{ph.legende}</figcaption> : null}
              </figure>
            ))}
          </div>
          {r.photos.length > 1 ? (
            <div className="pe-visionneuse-bas">
              <button type="button" onClick={() => aller(-1)} aria-label="Photo précédente" className="pe-rond">
                <ChevronLeft size={24} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => aller(1)} aria-label="Photo suivante" className="pe-rond">
                <ChevronRight size={24} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
