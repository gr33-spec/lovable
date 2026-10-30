import Link from "next/link";
import { CtaFixePremium, DemoVingtArtisans, EntetePremium } from "@/components/landing-premium";
import { HEBERGEUR, PAGES_LEGALES } from "@/lib/legal";
import { ACCROCHE_APP, BLOC_LEGAL } from "@/lib/nom";
import { TARIFS } from "../../../../../../packages/domain/src/groupe/tarifs";
import { TROIS_QUESTIONS } from "./landing";
import "./premium.css";

/**
 * LA LANDING « PREMIUM V3 » (Greg, 30 octobre 2026, maquette Mobiiz_Landing_Premium_V3), REPENSÉE LE MÊME JOUR (« Mobiiz,
 * évolution stratégique », points 1 à 5) : d'abord le collectif, ensuite le temps gagné, l'aide à la lecture en dernier.
 * L'ordre : l'accroche (regrouper ses achats, « Plus on est, moins on paie. »), « L'union fait la force » et l'animation
 * des 20 artisans, le fonctionnement en quatre étapes (seulement ce qui marche aujourd'hui), l'histoire de Greg, l'offre,
 * les questions, le dernier appel. Styles de la maquette bornés à `.mzp` (`premium.css`).
 *
 * Vérifié contre les conditions en vigueur (`TARIFS`, réponses validées par Greg le 28 octobre) : depuis le 30 octobre
 * (décisions de Greg), les achats groupés sont GRATUITS ; seuls les outils IA ont des quotas. Le bouton reste « Rejoindre
 * le collectif », avec « Gratuit · Sans carte bancaire » dessous (décision 4). Le pied garde l'éditeur,
 * l'hébergeur, les quatre documents, le contact et l'accès négoce. L'ancienne page (`Landing`) reste pour /couvreurs et
 * /peintres.
 */

/** Une visite comptée (tableau de bord, 24 octobre 2026) : ni cookie, ni adresse ; sans réponse, la page s'affiche. */
function compterLaVisite() {
  const api = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  void fetch(`${api}/v1/public/visite`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => undefined);
}

const [OBLIGE, NEGOCES] = TROIS_QUESTIONS;

/** Le bouton principal : un seul libellé, partout (en-tête mis à part, qui dit « S'inscrire »). */
export const CTA_COLLECTIF = { bouton: "Rejoindre le collectif", sous: "Gratuit · Sans carte bancaire" } as const;

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
  {
    q: "Avec qui je suis regroupé ?",
    r: "Avec les artisans de ton métier, dans ton département. Chacun garde sa livraison sur son chantier.",
    lien: null,
  },
] as const;

/**
 * Les quatre étapes (Greg, 30 octobre 2026, point 3), dites avec ce qui marche aujourd'hui : la liste (devis, photo ou à
 * la main), l'envoi à plusieurs négoces avec le PDF, l'achat groupé du métier et du département, les réponses qui
 * arrivent dans Mobiiz. Rien sur une comparaison automatique des devis reçus en PDF : l'artisan les lit lui-même.
 */
const ETAPES = [
  { ico: "i-list", titre: "Prépare ta liste.", texte: "Depuis ton devis, une photo ou à la main. Une ligne par matériau, tu gardes la main sur les quantités." },
  { ico: "i-upload", titre: "Envoie à plusieurs négoces.", texte: "Ta demande de prix part avec un PDF propre, à tous tes négoces en une fois. Fini les appels un par un." },
  { ico: "i-people", titre: "Rejoins un achat groupé.", texte: "Ta liste s’ajoute à celles des artisans de ton métier dans ton département. Les négoces chiffrent le volume." },
  { ico: "i-search", titre: "Choisis ton offre.", texte: "Les réponses arrivent dans Mobiiz. Tu choisis selon le prix, le délai et la livraison." },
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
                  Regroupe tes achats avec d’autres artisans. <span>Plus on est, moins on paie.</span>
                </h1>
                <p className="hero-lead">Mobiiz réunit les besoins en matériaux des artisans de ton secteur pour demander aux négoces un prix sur le volume. Et au quotidien, tu prépares ta liste et tu l’envoies à tous tes négoces en une fois.</p>
                <div className="hero-actions">
                  <Link id="heroPrimaryCTA" className="btn btn-yellow" href="/inscription">
                    {CTA_COLLECTIF.bouton} <Icone id="i-arrow" className="arrow" />
                  </Link>
                  <a className="text-link" href="#fonctionnement">
                    <span className="circle-down" aria-hidden="true">
                      ↓
                    </span>{" "}
                    Voir comment ça marche
                  </a>
                </div>
                <p className="under-cta">
                  {CTA_COLLECTIF.sous} · <Link href="/tarifs">Voir les conditions</Link>
                </p>
              </div>
              <div className="hero-media" role="group" aria-label="Artisans du bâtiment réunis, et un exemple d'achat groupé">
                <div className="hero-photo">
                  <picture>
                    <source media="(max-width: 900px)" srcSet="/landing/v3/artisans-collectif-720.webp" />
                    <img src="/landing/v3/artisans-collectif.webp" alt="Un collectif d'artisans du bâtiment réunis" width={1080} height={465} fetchPriority="high" />
                  </picture>
                  <span className="photo-stamp">La force des pros réunis</span>
                </div>
                {/* L'aperçu dit le collectif d'abord (Greg, 30 octobre 2026, point 1) ; marqué « Exemple », sans chiffre réel. */}
                <div className="product-card" role="group" aria-label="Exemple d'achat groupé dans Mobiiz">
                  <div className="product-card-top">
                    <span className="mini-brand">Mobiiz</span>
                    <span className="mini-counter">Exemple</span>
                  </div>
                  <h3>Achat groupé · Couverture</h3>
                  {[
                    ["i-people", "Les artisans du département réunis"],
                    ["i-list", "Leurs listes additionnées"],
                    ["i-upload", "Une seule demande aux négoces"],
                  ].map(([ico, t]) => (
                    <div className="product-action" key={t}>
                      <span className="pic">
                        <Icone id={ico!} />
                      </span>
                      <strong>{t}</strong>
                      <span className="tiny-arrow" aria-hidden="true">
                        ✓
                      </span>
                    </div>
                  ))}
                </div>
                <div className="glass-note">
                  <Icone id="i-people" /> L’union fait la force.
                </div>
              </div>
            </div>
            <div className="value-line">
              <div className="value-item">
                <Icone id="i-people" />
                <span>
                  Des achats groupés
                  <br />
                  entre artisans
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-upload" />
                <span>
                  Tous tes négoces
                  <br />
                  en une demande
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-list" />
                <span>
                  Ta liste prête,
                  <br />
                  sans tout retaper
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="ticker">
          <div className="wrap ticker-inner" role="group" aria-label="Les avantages Mobiiz">
            {[
              ["✳", "Regroupe"],
              ["↗", "Demande"],
              ["✳", "Choisis"],
              ["↓", "Plus on est, moins on paie"],
            ].map(([s, t]) => (
              <span className="ticker-item" key={t}>
                <b aria-hidden="true">{s}</b>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* L'argument principal, juste sous l'accroche (Greg, 30 octobre 2026, points 1 et 4). */}
        <section className="collective-section" id="collectif" aria-labelledby="collectiveTitle">
          <div className="wrap collective-layout">
            <div className="collective-copy">
              <span className="label">L’union fait la force</span>
              <h2 id="collectiveTitle">
                Plus on est, <span className="gold">moins on paie.</span>
              </h2>
              <p>Seul, tu représentes une commande. Ensemble, on représente un volume, et un volume se négocie autrement. Regarde le principe sur un exemple.</p>
              <ol className="explain" style={{ listStyle: "none", padding: 0 }}>
                {["Les artisans de ton secteur se regroupent", "Leurs besoins s’additionnent", "Les négoces chiffrent le volume"].map((t, i) => (
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

        <section className="section light" id="fonctionnement" aria-labelledby="stepsTitle">
          <div className="wrap">
            <div className="heading-row">
              <div>
                <span className="section-kicker smallcap">Comment ça marche</span>
                <h2 id="stepsTitle">
                  Moins de temps au téléphone.
                  <br />
                  Plus de poids pour tes achats.
                </h2>
              </div>
              <p className="aside">Quatre étapes, sans changer ta façon de travailler. Tu gardes tes négoces.</p>
            </div>
            <ol className="steps steps-4" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {ETAPES.map((e, i) => (
                <li className="step" key={e.titre}>
                  <div className="step-top">
                    <span className="step-count">ÉTAPE 0{i + 1}</span>
                    <span className="step-ico">
                      <Icone id={e.ico} />
                    </span>
                  </div>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* L'histoire de Greg (point 5), ses mots raccourcis ; les négoces ne sont pas des adversaires. */}
        <section className="bridge" id="histoire" aria-labelledby="histoireTitle">
          <div className="wrap">
            <figure className="bridge-content" style={{ margin: 0 }}>
              <span className="label">Pourquoi j’ai créé Mobiiz</span>
              <h2 id="histoireTitle">
                Et si on achetait <span className="accent-underline">ensemble ?</span>
              </h2>
              <blockquote className="histoire">
                <p>Je suis artisan. Un jour, j’achète deux palettes et j’obtiens un excellent prix. Quelques jours plus tard, je retourne au même négoce pour quelques fournitures : le prix n’a plus rien à voir.</p>
                <p>À chaque commande, c’est la même histoire : discuter, négocier, presque demander la remise. Alors je me suis posé une question toute simple : et si, au lieu d’acheter chacun dans notre coin, on regroupait nos besoins ?</p>
                <p>Pour le négoce aussi, un volume regroupé et bien préparé, c’est plus simple à chiffrer et à livrer. C’est comme ça qu’est né Mobiiz.</p>
              </blockquote>
              <figcaption className="histoire-signature">Grégory, couvreur à Paimpol, fondateur de Mobiiz</figcaption>
            </figure>
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
              <p className="aside">Commence par tes listes et tes négoces. Rejoins un achat groupé quand c’est le bon moment pour toi.</p>
            </div>
            <div className="benefits">
              <article className="benefit highlight">
                <span className="benefit-label">01 / La force du groupe</span>
                <h3>Les achats groupés.</h3>
                <p>Ta liste rejoint celles des artisans de ton métier, dans ton département. Les négoces chiffrent le volume.</p>
                <ul>
                  <li>
                    <Icone id="i-check" /> Les volumes de plusieurs artisans réunis
                  </li>
                  <li>
                    <Icone id="i-check" /> Livraison sur ton chantier
                  </li>
                  <li>
                    <Icone id="i-check" /> Gratuit, pour tous les artisans
                  </li>
                </ul>
                <Link className="cta-text" href="/tarifs">
                  Découvrir l&apos;offre <Icone id="i-arrow" className="arrow" />
                </Link>
              </article>
              <article className="benefit">
                <span className="benefit-label">02 / Ton quotidien</span>
                <h3>Mes listes &amp; mes négoces.</h3>
                <p>Un outil simple pour garder la main sur tes quantités et demander des prix.</p>
                <ul>
                  <li>
                    <Icone id="i-check" /> Des listes de matériaux claires, avec leur PDF
                  </li>
                  <li>
                    <Icone id="i-check" /> Tous tes négoces habituels en une demande
                  </li>
                  <li>
                    <Icone id="i-check" /> 1 analyse de devis et 3 scans de liste offerts
                  </li>
                </ul>
                <Link className="cta-text" href="/inscription">
                  Créer ma première liste <Icone id="i-arrow" className="arrow" />
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
              <p>Inscris-toi, prépare ta première liste et rejoins les artisans de ton secteur.</p>
              <Link id="finalPrimaryCTA" className="btn btn-yellow" href="/inscription">
                {CTA_COLLECTIF.bouton} <Icone id="i-arrow" className="arrow" />
              </Link>
              <small>{CTA_COLLECTIF.sous}</small>
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
