import Link from "next/link";
import { PAGES_LEGALES } from "@/lib/legal";
import { CONTOUR_FRANCE, TRACES_DEPARTEMENTS } from "@/lib/regions/carte-france";
import type { FichePageLocale, Photo } from "@/lib/regions/fiche";
import { CarteRegion, CtaFixeLocal, EnteteLocale, LienCommencer, type TraceRegion } from "./carte-region";

/**
 * LA PAGE LOCALE (Greg, 19 novembre 2026), pilotée par sa fiche (`lib/regions/fiche.ts`) : la landing générale en
 * direction artistique (mêmes couleurs, polices, composants : `.mzp` de `premium.css`), ses informations essentielles, et
 * ce qui est propre au lieu (carte, toiture typique, petite histoire, ambiance). Styles propres : `.mzr` (`page-locale.css`).
 * Aucune donnée inventée : la carte lit les vrais regroupements, l'histoire cite ses sources, les photos leur auteur.
 */

/** Le cadrage de la carte : la région et ses abords, un peu plus vers l'intérieur des terres (le reste de la France). */
function cadrage(codes: readonly string[]): { viewBox: string; ratioTelephone: number } {
  const boites = codes.map((c) => TRACES_DEPARTEMENTS[c]!.boite);
  const x0 = Math.min(...boites.map((b) => b[0]));
  const y0 = Math.min(...boites.map((b) => b[1]));
  const x1 = Math.max(...boites.map((b) => b[2]));
  const y1 = Math.max(...boites.map((b) => b[3]));
  const l = x1 - x0;
  const h = y1 - y0;
  const marge = Math.max(l, h) * 0.05;
  const viewBox = [x0 - marge, y0 - marge * 1.6, l + marge + l * 0.34, h + marge * 3].map((n) => Math.round(n)).join(" ");
  return { viewBox, ratioTelephone: Math.round(((l + marge * 3) / (h + marge * 3)) * 1000) / 1000 };
}

function FondFrance({ viewBox }: { viewBox: string }) {
  const [x, y, l, h] = viewBox.split(" ").map(Number) as [number, number, number, number];
  return (
    <g aria-hidden="true">
      <defs>
        <filter id="mzr-flou" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <linearGradient id="mzr-fondu" x1={x} y1={y} x2={x + l} y2={y} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
        <mask id="mzr-masque">
          <rect x={x} y={y} width={l} height={h} fill="url(#mzr-fondu)" />
        </mask>
      </defs>
      <g mask="url(#mzr-masque)">
        <path className="mzr-france" d={CONTOUR_FRANCE} filter="url(#mzr-flou)" />
      </g>
    </g>
  );
}

function Drapeau() {
  // Le Gwenn-ha-du, dessiné simple : neuf bandes, le canton d'hermine. Discret, jamais criard.
  return (
    <svg className="mzr-drapeau" viewBox="0 0 27 18" role="img" aria-label="Gwenn-ha-du, le drapeau breton">
      <rect width="27" height="18" fill="#fff" />
      {[0, 2, 4, 6, 8].map((i) => (
        <rect key={i} y={i * 2} width="27" height="2" fill="#111" />
      ))}
      <rect width="12" height="10" fill="#fff" />
      {(
        [
          [2.4, 2.4],
          [6, 2.4],
          [9.6, 2.4],
          [4.2, 5.4],
          [7.8, 5.4],
          [2.4, 8.4],
          [6, 8.4],
          [9.6, 8.4],
        ] as const
      ).map(([cx, cy]) => (
        <path key={`${cx}-${cy}`} d={`M${cx} ${cy - 1.1}l.7 1.6h-1.4z`} fill="#111" />
      ))}
      <rect width="27" height="18" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth=".6" />
    </svg>
  );
}

function Sprite() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M4 12h16m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-people" viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M2.5 20v-2.6A5.4 5.4 0 018 12h2a5.4 5.4 0 015.5 5.4V20M17 4a3 3 0 010 6m1.5 3c2.2.6 3 2.3 3 4.3V20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </symbol>
      <symbol id="i-person" viewBox="0 0 24 24">
        <circle cx="12" cy="7.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 20.5v-1.6A5.9 5.9 0 0110.4 13h3.2a5.9 5.9 0 015.9 5.9v1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-truck" viewBox="0 0 24 24">
        <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </symbol>
    </svg>
  );
}

const ECRANS = [
  {
    src: "/landing/v3/ecran-liste.webp",
    alt: "L'app Mobiiz : ta liste de fournitures, prête à partir (exemple)",
  },
  {
    src: "/landing/v3/ecran-negoces.webp",
    alt: "L'app Mobiiz : la liste envoyée à tes négoces en une fois (exemple)",
  },
  {
    src: "/landing/v3/ecran-reponses.webp",
    alt: "L'app Mobiiz : les réponses des négoces au même endroit (exemple)",
  },
] as const;

function Telephone({ n }: { n: number }) {
  const e = ECRANS[n]!;
  return (
    <figure className={`mz2-tel mz2-tel-${n + 1}`}>
      <div className="mz2-tel-ecran">
        <div className="mz2-tel-barre" aria-hidden="true">
          <span>9:41</span>
          <span className="mz2-tel-ilot" />
          <span className="mz2-tel-etat" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- captures déjà optimisées (WebP), chargées tard */}
        <img
          src={e.src}
          srcSet={`${e.src} 600w, ${e.src.replace(".webp", "-900.webp")} 900w, ${e.src.replace(".webp", "-1170.webp")} 1170w`}
          sizes="(max-width: 900px) 150px, 400px"
          alt={e.alt}
          width={1170}
          height={2532}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption className="mz2-tel-exemple">Exemple</figcaption>
    </figure>
  );
}

function PhotoLocale({ photo, sizes, priorite = false, className }: { photo: Photo; sizes: string; priorite?: boolean; className?: string }) {
  return (
    <figure className={`mzr-photo${className ? ` ${className}` : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- photo déjà compressée (WebP), dimensions données */}
      <img src={photo.src} alt={photo.alt} width={photo.largeur} height={photo.hauteur} sizes={sizes} loading={priorite ? "eager" : "lazy"} decoding="async" />
      <figcaption>
        <span>{photo.legende}</span>
        <a href={photo.source} rel="noopener nofollow" target="_blank">
          {photo.credit}
        </a>
      </figcaption>
    </figure>
  );
}

/** Les données structurées : la page, le fil d'Ariane, les questions (rien d'autre que ce que la page dit). */
function donneesStructurees(fiche: FichePageLocale, origine: string) {
  const url = `${origine}/${fiche.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url,
      url,
      name: fiche.seo.titre,
      description: fiche.seo.description,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "WebSite", name: "Mobiiz", url: origine },
      about: {
        "@type": "Thing",
        name: `${fiche.metier.nomPluriel} ${fiche.region.en}`,
      },
      spatialCoverage: {
        "@type": "AdministrativeArea",
        name: fiche.region.nom,
        containsPlace: fiche.region.departements.map((d) => ({
          "@type": "AdministrativeArea",
          name: d.nom,
          identifier: d.code,
        })),
      },
      publisher: {
        "@type": "Organization",
        name: "Mobiiz",
        url: origine,
        logo: `${origine}/landing/v3/logo-mobiiz.png`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Mobiiz", item: origine },
        {
          "@type": "ListItem",
          position: 2,
          name: fiche.accroche.kicker,
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: fiche.questions.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.r },
      })),
    },
  ];
}

export function PageLocale({ fiche, origine, nonce }: { fiche: FichePageLocale; origine: string; nonce: string | undefined }) {
  const codes = fiche.region.departements.map((d) => d.code);
  const { viewBox, ratioTelephone } = cadrage(codes);
  const traces: TraceRegion[] = fiche.region.departements.map((d) => ({
    ...d,
    d: TRACES_DEPARTEMENTS[d.code]!.d,
    centre: TRACES_DEPARTEMENTS[d.code]!.centre,
  }));
  const commun = { metier: fiche.metier.id, codes, depuis: fiche.slug };
  const sourcesParId = new Map(fiche.sources.map((s) => [s.id, s]));
  const numero = new Map(fiche.sources.map((s, i) => [s.id, i + 1]));
  const jsonLd = JSON.stringify(donneesStructurees(fiche, origine)).replace(/</g, "\\u003c");
  return (
    <div className="mzp mzr">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Sprite />
      <EnteteLocale
        ancres={[
          { href: "#fonctionnement", label: "Comment ça marche" },
          { href: "#collectif", label: "Achats groupés" },
          { href: "#toiture", label: fiche.emblematique.surtitre },
          { href: "#histoire", label: "La petite histoire" },
          { href: "#questions", label: "Questions" },
        ]}
        {...commun}
      />
      <main id="haut">
        <div className="mz2-nappes" aria-hidden="true">
          <span className="n1" />
          <span className="n2" />
          <span className="n3" />
        </div>

        <section className="mz2-hero mzr-hero" aria-labelledby="heroTitle">
          <div className="wrap mzr-hero-grid">
            <div className="mz2-hero-copy mzr-hero-haut">
              <span className="mz2-kicker mzr-kicker">
                {fiche.region.drapeau === "gwenn-ha-du" ? <Drapeau /> : null}
                {fiche.accroche.kicker}
              </span>
              <h1 id="heroTitle">
                <span className="l1">{fiche.accroche.titre[0]}</span> <span>{fiche.accroche.titre[1]}</span>
              </h1>
            </div>
            <CarteRegion
              departements={traces}
              viewBox={viewBox}
              ratioTelephone={ratioTelephone}
              fond={<FondFrance viewBox={viewBox} />}
              lots={fiche.metier.lots}
              invite={`Tu travailles où ? Touche ton département.`}
              metier={fiche.metier.id}
              depuis={fiche.slug}
            />
            <div className="mz2-hero-copy mzr-hero-bas">
              <p className="mz2-lead">{fiche.accroche.lead}</p>
              <div className="hero-actions">
                <LienCommencer id="heroPrimaryCTA" className="btn btn-yellow" {...commun}>
                  Commencer gratuitement{" "}
                  <svg className="arrow" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </LienCommencer>
                <a className="text-link" href="#fonctionnement">
                  <span className="circle-down" aria-hidden="true">
                    ↓
                  </span>{" "}
                  Voir comment ça marche
                </a>
              </div>
              <p className="under-cta">
                Gratuit · Sans carte bancaire · <Link href="/tarifs">Voir les tarifs</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="mz2-carte" id="fonctionnement" aria-labelledby="stepsTitle">
          <div className="wrap">
            <h2 id="stepsTitle" className="mz2-souligne">
              Comment ça marche ?
            </h2>
            <ol className="mz2-etapes">
              {fiche.etapes.map((e, i) => (
                <li className="mz2-etape" key={e.titre}>
                  <div className="mz2-etape-texte">
                    <span className="mz2-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3>{e.titre}</h3>
                      <p>{e.texte}</p>
                    </div>
                  </div>
                  <Telephone n={i} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mz2-collectif-wrap" id="collectif" aria-labelledby="collectiveTitle">
          <div className="wrap">
            <div className="mz2-collectif mzr-collectif">
              <div className="mz2-collectif-texte">
                <span className="mz2-collectif-ico" aria-hidden="true">
                  <svg>
                    <use href="#i-people" />
                  </svg>
                </span>
                <div>
                  <h2 id="collectiveTitle">{fiche.collectif.titre}</h2>
                  <p>{fiche.collectif.texte}</p>
                  <LienCommencer id="collectifCTA" className="mz2-lien-jaune" {...commun}>
                    Rejoindre les couvreurs de mon département{" "}
                    <svg className="arrow" aria-hidden="true">
                      <use href="#i-arrow" />
                    </svg>
                  </LienCommencer>
                </div>
              </div>
              <ol className="mzr-chemin" aria-label="Le regroupement en trois temps">
                <li>
                  <svg aria-hidden="true">
                    <use href="#i-person" />
                  </svg>
                  <span>Ton besoin</span>
                </li>
                <li>
                  <svg aria-hidden="true">
                    <use href="#i-people" />
                  </svg>
                  <span>Les {fiche.metier.nomPluriel} de ton département</span>
                </li>
                <li className="dernier">
                  <svg aria-hidden="true">
                    <use href="#i-truck" />
                  </svg>
                  <span>Une commande au prix des gros</span>
                </li>
              </ol>
            </div>
            <p className="mz2-note">{fiche.collectif.note}</p>
          </div>
        </section>

        <section className="mzr-toiture" id="toiture" aria-labelledby="toitureTitle">
          <div className="wrap mzr-toiture-grid">
            <PhotoLocale photo={fiche.emblematique.photo} sizes="(max-width: 900px) calc(100vw - 32px), 600px" className="mzr-toiture-photo" />
            <div>
              <span className="label">{fiche.emblematique.surtitre}</span>
              <h2 id="toitureTitle">{fiche.emblematique.titre}</h2>
              {fiche.emblematique.paragraphes.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <ul className="mzr-points">
                {fiche.emblematique.points.map((p) => (
                  <li key={p.titre}>
                    <svg aria-hidden="true">
                      <use href="#i-check" />
                    </svg>
                    <div>
                      <h3>{p.titre}</h3>
                      <p>{p.texte}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mzr-histoire" id="histoire" aria-labelledby="histoireTitle">
          <div className="wrap">
            <span className="label">{fiche.histoire.surtitre}</span>
            <h2 id="histoireTitle">{fiche.histoire.titre}</h2>
            <div className="mzr-chapitres">
              {fiche.histoire.chapitres.map((c) => (
                <article key={c.titre} className="mzr-chapitre">
                  <h3>{c.titre}</h3>
                  {c.paragraphes.map((p) => (
                    <p key={p.texte}>
                      {p.texte}
                      {p.sources.map((s) => (
                        <sup key={s}>
                          <a href={`#source-${s}`} aria-label={`Source : ${sourcesParId.get(s)?.titre ?? s}`}>
                            {numero.get(s)}
                          </a>
                        </sup>
                      ))}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <details className="mzr-sources">
              <summary>Les sources</summary>
              <ol>
                {fiche.sources.map((s) => (
                  <li key={s.id} id={`source-${s.id}`}>
                    <a href={s.url} rel="noopener nofollow" target="_blank">
                      {s.titre}
                    </a>{" "}
                    <span>· {s.editeur}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </section>

        {fiche.ambiance.photos.length ? (
          <section className="mzr-ambiance" aria-label={fiche.ambiance.titre}>
            <div className="wrap">
              <h2 className="mzr-ambiance-titre">{fiche.ambiance.titre}</h2>
              <div className="mzr-galerie">
                {fiche.ambiance.photos.map((p) => (
                  <PhotoLocale key={p.src} photo={p} sizes="(max-width: 900px) 80vw, 400px" />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bridge mzr-local" aria-labelledby="localTitle">
          <div className="wrap">
            <div className="bridge-content">
              <span className="label">{fiche.local.surtitre}</span>
              <h2 id="localTitle">{fiche.local.titre}</h2>
              <div className="histoire">
                <p>{fiche.local.texte}</p>
              </div>
              <p className="histoire-signature">Mobiiz. Plus on est, moins on paie.</p>
            </div>
          </div>
        </section>

        <section className="final-section" id="commencer" aria-labelledby="finalTitle">
          <div className="wrap">
            <div className="final-card">
              <span className="label">Par un artisan. Pour les artisans.</span>
              <h2 id="finalTitle">
                {fiche.final.titre[0]} <span>{fiche.final.titre[1]}</span>
              </h2>
              <p>{fiche.final.texte}</p>
              <LienCommencer id="finalPrimaryCTA" className="btn btn-yellow" {...commun}>
                Commencer gratuitement{" "}
                <svg className="arrow" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </LienCommencer>
              <small>Gratuit · Sans carte bancaire</small>
            </div>
          </div>
        </section>

        <section className="faq-section" id="questions" aria-labelledby="faqTitle">
          <div className="wrap faq-layout">
            <div>
              <span className="section-kicker smallcap">On répond sans détour</span>
              <h2 id="faqTitle">Tu te poses des questions ?</h2>
              <p className="faq-intro">Normal. Voilà l’essentiel avant de te lancer.</p>
            </div>
            <div className="faq-list">
              {fiche.questions.map((x) => (
                <details key={x.q}>
                  <summary>{x.q}</summary>
                  <p>{x.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-flex">
            <Link className="brand" href="/" aria-label="Mobiiz, accueil">
              {/* eslint-disable-next-line @next/next/no-img-element -- le logo de la maquette */}
              <img className="mzr-logo-sombre" src="/landing/v3/logo-mobiiz.png" alt="Mobiiz" width={115} height={34} loading="lazy" />
              {/* eslint-disable-next-line @next/next/no-img-element -- le logo aux lettres noires, pour le thème clair */}
              <img className="mzr-logo-clair" src="/marque/logo-clair.png" alt="" aria-hidden="true" width={127} height={34} loading="lazy" />
            </Link>
            <nav className="footer-links" aria-label="Informations et liens légaux">
              <Link href="/">Mobiiz</Link>
              <Link href="/tarifs">Tarifs</Link>
              {PAGES_LEGALES.map((p) => (
                <Link key={p.href} href={p.href}>
                  {p.label}
                </Link>
              ))}
              <Link href="/negoce/connexion">Accès négoce</Link>
            </nav>
          </div>
          <p className="footer-bottom" style={{ display: "block" }}>
            {/* Discrétion (Greg, 28 novembre 2026) : l'éditeur, son adresse et son immatriculation ne sont que dans les mentions légales. */}
          Mobiiz · <a href="mailto:contact@mobiiz.fr">contact@mobiiz.fr</a> · <Link href="/mentions-legales">Mentions légales</Link>
          </p>
          <div className="footer-bottom">
            <span>© Mobiiz</span>
            <span>Tracés de la carte : IGN Admin Express, Licence ouverte.</span>
          </div>
        </div>
      </footer>
      <CtaFixeLocal haut="heroPrimaryCTA" bas="finalPrimaryCTA" {...commun} />
    </div>
  );
}
