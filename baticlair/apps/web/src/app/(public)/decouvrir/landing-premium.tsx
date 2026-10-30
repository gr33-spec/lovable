import Link from "next/link";
import { CtaFixePremium, DemoVingtArtisans, EntetePremium } from "@/components/landing-premium";
import { HEBERGEUR, PAGES_LEGALES } from "@/lib/legal";
import { ACCROCHE_APP, BLOC_LEGAL } from "@/lib/nom";
import { TARIFS } from "../../../../../../packages/domain/src/groupe/tarifs";
import { TROIS_QUESTIONS } from "./landing";
import "./premium.css";

/**
 * LA LANDING « PREMIUM V3 » (Greg, 30 octobre 2026 : « remplacer la landing actuelle par la nouvelle version fournie dans le
 * ZIP », Mobiiz_Landing_Premium_V3) : la maquette mot pour mot, en composants du site, styles bornés à `.mzp`
 * (`premium.css`). L'animation des 20 artisans est dans « Plus on est, moins on paie », juste après les trois étapes et le
 * pont « Seul, tu représentes une commande ».
 *
 * Vérifié contre les conditions en vigueur avant publication (`TARIFS`, réponses validées par Greg le 28 octobre) ; ce qui
 * s'en écartait est dit avec les mots actuels (docs/DECISIONS.md, 30/10) : le premier achat groupé est offert SUR
 * ABONNEMENT ; « C'est gratuit ? », « Je garde mes négoces ? » et « Je suis obligé de commander ? » reprennent les réponses
 * en vigueur. Le pied garde l'éditeur, l'hébergeur, les quatre documents, le contact et l'accès négoce. Liens internes
 * (jamais l'adresse test.mobiiz.fr écrite en dur). L'ancienne page (`Landing`) reste pour /couvreurs et /peintres.
 */

/** Une visite comptée (tableau de bord, 24 octobre 2026) : ni cookie, ni adresse ; sans réponse, la page s'affiche. */
function compterLaVisite() {
  const api = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  void fetch(`${api}/v1/public/visite`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => undefined);
}

const [OBLIGE, NEGOCES] = TROIS_QUESTIONS;

function Icone({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

/** Les icônes de la maquette, une fois pour toute la page. */
function Sprite() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M4 12h16m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-upload" viewBox="0 0 24 24">
        <path d="M12 16V3m0 0L7 8m5-5 5 5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-list" viewBox="0 0 24 24">
        <rect x="5" y="3" width="14" height="19" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-people" viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M2.5 20v-2.6A5.4 5.4 0 018 12h2a5.4 5.4 0 015.5 5.4V20M17 4a3 3 0 010 6m1.5 3c2.2.6 3 2.3 3 4.3V20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="m15 15 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </symbol>
      <symbol id="i-helmet" viewBox="0 0 32 32">
        <path d="M5.8 19.5v-4.2a10.2 10.2 0 0120.4 0v4.2" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
        <path d="M16 7v7m-13 7h26m-19.5 0v3.7c0 3 2.8 4.3 6.5 4.3s6.5-1.3 6.5-4.3V21" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
    </svg>
  );
}

const QUESTIONS = [
  { q: "Je peux garder mes négoces habituels ?", r: NEGOCES.r, lien: null },
  { q: "Est-ce que Mobiiz est gratuit ?", r: TARIFS.question.r, lien: { href: "/tarifs", label: "Voir les tarifs détaillés" } },
  { q: "Est-ce que je dois obligatoirement commander ?", r: OBLIGE.r, lien: { href: "/cgu", label: "Lire les CGU" } },
  {
    q: "Est-ce que je vais forcément payer moins cher ?",
    r: "Non, aucun prix ni niveau d’économie n’est garanti. Les négoces proposent des prix selon les volumes et les conditions de la demande. La simulation de 6 € à 3 € est uniquement pédagogique.",
    lien: null,
  },
] as const;

export function LandingPremium() {
  compterLaVisite();
  return (
    <div className="mzp">
      <Sprite />
      <EntetePremium />
      <main id="haut">
        <section className="hero" aria-labelledby="heroTitle">
          <div className="wrap">
            <div className="hero-layout">
              <div className="hero-copy">
                <span className="label">{ACCROCHE_APP.replace(/\.$/, "")}</span>
                <h1 id="heroTitle">
                  Achète tes matériaux <span>au prix des gros.</span>
                </h1>
                <p className="hero-lead">Prépare ta liste, compare les prix de tes négoces et profite de la force du collectif pour mieux acheter.</p>
                <div className="hero-actions">
                  <Link id="heroPrimaryCTA" className="btn btn-yellow" href="/inscription">
                    Créer mon compte gratuit <Icone id="i-arrow" className="arrow" />
                  </Link>
                  <a className="text-link" href="#fonctionnement">
                    <span className="circle-down" aria-hidden="true">
                      ↓
                    </span>{" "}
                    Voir comment ça marche
                  </a>
                </div>
                <p className="under-cta">
                  Sans carte bancaire · Tes listes et tes négoces restent gratuits · <Link href="/tarifs">Voir les conditions</Link>
                </p>
              </div>
              <div className="hero-media" role="group" aria-label="Artisans du bâtiment et aperçu de Mobiiz">
                <div className="hero-photo">
                  <picture>
                    <source media="(max-width: 900px)" srcSet="/landing/v3/artisans-collectif-720.webp" />
                    <img src="/landing/v3/artisans-collectif.webp" alt="Un collectif d'artisans du bâtiment réunis" width={1080} height={465} fetchPriority="high" />
                  </picture>
                  <span className="photo-stamp">La force des pros réunis</span>
                </div>
                <div className="product-card" role="group" aria-label="Aperçu de l'interface de création de liste Mobiiz">
                  <div className="product-card-top">
                    <span className="mini-brand">Mobiiz</span>
                    <span className="mini-counter">Ma liste de matériaux</span>
                  </div>
                  <h3>Comment veux-tu commencer ?</h3>
                  {[
                    ["i-upload", "Depuis mon devis"],
                    ["i-list", "Photo de ma liste"],
                    ["i-list", "Je la note moi-même"],
                  ].map(([ico, t]) => (
                    <div className="product-action" key={t}>
                      <span className="pic">
                        <Icone id={ico!} />
                      </span>
                      <strong>{t}</strong>
                      <span className="tiny-arrow" aria-hidden="true">
                        ›
                      </span>
                    </div>
                  ))}
                </div>
                <div className="glass-note">
                  <Icone id="i-people" /> Ensemble, on pèse plus.
                </div>
              </div>
            </div>
            <div className="value-line">
              <div className="value-item">
                <Icone id="i-upload" />
                <span>
                  3 façons de créer
                  <br />
                  ta liste
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-search" />
                <span>
                  Compare les offres
                  <br />
                  de tes négoces
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-people" />
                <span>
                  Accède à la force
                  <br />
                  des achats groupés
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="ticker">
          <div className="wrap ticker-inner" role="group" aria-label="Les avantages Mobiiz">
            {[
              ["✳", "Prépare"],
              ["↗", "Compare"],
              ["✳", "Regroupe"],
              ["↓", "Économise selon les offres"],
            ].map(([s, t]) => (
              <span className="ticker-item" key={t}>
                <b aria-hidden="true">{s}</b>
                {t}
              </span>
            ))}
          </div>
        </div>

        <section className="section light" id="fonctionnement" aria-labelledby="stepsTitle">
          <div className="wrap">
            <div className="heading-row">
              <div>
                <span className="section-kicker smallcap">Comment ça marche</span>
                <h2 id="stepsTitle">
                  Simple pour toi.
                  <br />
                  Plus de poids pour tes achats.
                </h2>
              </div>
              <p className="aside">Trois étapes claires, sans changer ta manière de travailler.</p>
            </div>
            <ol className="steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              <li className="step">
                <div className="step-top">
                  <span className="step-count">ÉTAPE 01</span>
                  <span className="step-ico">
                    <Icone id="i-upload" />
                  </span>
                </div>
                <h3>Prépare ta liste.</h3>
                <p>Depuis un devis, une photo ou en saisie manuelle. Tu gardes le contrôle des quantités.</p>
                <div className="step-bottom" aria-hidden="true">
                  <div className="quote-paper">
                    <div className="paper-top">DEVIS · Fournitures</div>
                    <div className="paper-line" />
                    <div className="paper-line short" />
                    <div className="paper-line" />
                    <div className="paper-line short" />
                  </div>
                </div>
              </li>
              <li className="step">
                <div className="step-top">
                  <span className="step-count">ÉTAPE 02</span>
                  <span className="step-ico">
                    <Icone id="i-list" />
                  </span>
                </div>
                <h3>Vérifie le quantitatif.</h3>
                <p>Une liste nette, prête à transmettre. Tu ajustes ce qu’il faut avant de demander les prix.</p>
                <div className="step-bottom" aria-hidden="true">
                  <div className="phone-list">
                    {["Parpaing 20 × 20 × 50", "Ciment 25 kg", "Plaque BA13"].map((t) => (
                      <div className="list-line" key={t}>
                        <Icone id="i-list" /> {t} <b>✓</b>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
              <li className="step">
                <div className="step-top">
                  <span className="step-count">ÉTAPE 03</span>
                  <span className="step-ico">
                    <Icone id="i-search" />
                  </span>
                </div>
                <h3>Compare et choisis.</h3>
                <p>Retrouve les propositions de tes négoces, puis décide selon tes besoins.</p>
                <div className="step-bottom" aria-hidden="true">
                  <div className="comparison">
                    <div className="comparison-line best">
                      <span>Offre A</span>
                      <strong>✓ Comparer</strong>
                    </div>
                    <div className="comparison-line">
                      <span>Offre B</span>
                      <strong>Voir le détail</strong>
                    </div>
                    <div className="comparison-line">
                      <span>Offre C</span>
                      <strong>Voir le détail</strong>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
            <p className="step-nudge">
              Et pour aller encore plus loin ? <a href="#collectif">Découvre la force du collectif ↓</a>
            </p>
          </div>
        </section>

        <section className="bridge" aria-labelledby="bridgeTitle">
          <div className="wrap">
            <div className="bridge-content">
              <span className="label">Une idée simple. Un vrai changement.</span>
              <h2 id="bridgeTitle">
                Seul, tu représentes une commande.
                <br />
                <span className="accent-underline">Ensemble, un volume.</span>
              </h2>
              <p>Quand les artisans regroupent leurs besoins, les négoces peuvent proposer un prix pour l’ensemble des quantités. Voilà le pouvoir du collectif.</p>
            </div>
          </div>
        </section>

        <section className="collective-section" id="collectif" aria-labelledby="collectiveTitle">
          <div className="wrap collective-layout">
            <div className="collective-copy">
              <span className="label">La force du collectif</span>
              <h2 id="collectiveTitle">
                Plus on est, <span className="gold">moins on paie.</span>
              </h2>
              <p>Regarde ce qui pourrait se passer quand les artisans se rassemblent autour d’une même commande. Un exemple simple pour comprendre le principe.</p>
              <ol className="explain" style={{ listStyle: "none", padding: 0 }}>
                {["Les artisans rejoignent le collectif", "Les volumes de matériaux s’additionnent", "Les négoces proposent leurs prix"].map((t, i) => (
                  <li className="explain-item" key={t}>
                    <span className="number" aria-hidden="true">
                      0{i + 1}
                    </span>{" "}
                    {t}
                  </li>
                ))}
              </ol>
            </div>
            <DemoVingtArtisans />
          </div>
        </section>

        <section className="choice-section" id="offre" aria-labelledby="offerTitle">
          <div className="wrap">
            <div className="heading-row">
              <div>
                <span className="section-kicker smallcap">Deux façons d&apos;avancer</span>
                <h2 id="offerTitle">
                  À ton rythme.
                  <br />
                  Avec tes besoins.
                </h2>
              </div>
              <p className="aside">Commence par préparer tes achats. Rejoins le collectif quand c’est le bon moment pour toi.</p>
            </div>
            <div className="benefits">
              <article className="benefit">
                <span className="benefit-label">01 / Ton quotidien</span>
                <h3>Mes listes &amp; mes négoces.</h3>
                <p>Un outil simple pour garder la main sur tes quantités et demander des prix.</p>
                <ul>
                  <li>
                    <Icone id="i-check" /> Des listes de matériaux claires
                  </li>
                  <li>
                    <Icone id="i-check" /> Tes négoces habituels
                  </li>
                  <li>
                    <Icone id="i-check" /> 3 premières listes préparées depuis un devis ou une photo
                  </li>
                </ul>
                <Link className="cta-text" href="/inscription">
                  Créer ma première liste <Icone id="i-arrow" className="arrow" />
                </Link>
              </article>
              <article className="benefit highlight">
                <span className="benefit-label">02 / La force du groupe</span>
                <h3>Les achats groupés.</h3>
                <p>Rassemble les commandes de ton secteur pour accéder aux offres négociées pour le groupe.</p>
                <ul>
                  <li>
                    <Icone id="i-check" /> Les volumes de plusieurs artisans réunis
                  </li>
                  <li>
                    <Icone id="i-check" /> Sur abonnement : le premier achat groupé est offert
                  </li>
                  <li>
                    <Icone id="i-check" /> Des conditions à consulter avant participation
                  </li>
                </ul>
                <Link className="cta-text" href="/tarifs">
                  Découvrir l&apos;offre <Icone id="i-arrow" className="arrow" />
                </Link>
              </article>
            </div>
            <p className="condition-note">
              Les fonctionnalités, quotas et conditions d’engagement varient selon l’offre et le type d’achat groupé. Consulte les{" "}
              <Link href="/tarifs" style={{ textDecoration: "underline" }}>
                tarifs
              </Link>{" "}
              et les{" "}
              <Link href="/cgu" style={{ textDecoration: "underline" }}>
                CGU
              </Link>{" "}
              à jour.
            </p>
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
              {QUESTIONS.map((x) => (
                <details key={x.q}>
                  <summary>{x.q}</summary>
                  <p>
                    {x.r}
                    {x.lien ? (
                      <>
                        {" "}
                        <Link href={x.lien.href}>{x.lien.label}</Link>.
                      </>
                    ) : null}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-section" id="commencer" aria-labelledby="finalTitle">
          <div className="wrap">
            <div className="final-card">
              <span className="label">Par les artisans. Pour les artisans.</span>
              <h2 id="finalTitle">
                Le prochain bon prix <span>commence ensemble.</span>
              </h2>
              <p>Prépare ta première liste et découvre une autre façon d&apos;acheter tes matériaux.</p>
              <Link id="finalPrimaryCTA" className="btn btn-yellow" href="/inscription">
                Créer mon compte gratuit <Icone id="i-arrow" className="arrow" />
              </Link>
              <small>Inscription gratuite · Sans carte bancaire</small>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-flex">
            <a className="brand" href="#haut" aria-label="Mobiiz, retour en haut">
              {/* eslint-disable-next-line @next/next/no-img-element -- le logo de la maquette */}
              <img src="/landing/v3/logo-mobiiz.png" alt="Mobiiz" width={115} height={34} loading="lazy" />
            </a>
            <nav className="footer-links" aria-label="Informations et liens légaux">
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
            Service édité par {BLOC_LEGAL} Hébergeur : {HEBERGEUR.nom}, {HEBERGEUR.adresse}.
          </p>
          <div className="footer-bottom">
            <span>© Mobiiz · Un service de Bati Invest</span>
            <span>Les matériaux, c&apos;est mieux ensemble.</span>
          </div>
        </div>
      </footer>
      <CtaFixePremium haut="heroPrimaryCTA" bas="finalPrimaryCTA" />
    </div>
  );
}
