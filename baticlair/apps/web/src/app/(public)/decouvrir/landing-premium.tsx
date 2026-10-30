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
 * RECENTRÉE SUR LES ÉCONOMIES (Greg, 30 octobre 2026, soir : « l'argent économisé est la finalité ») : d'abord faire
 * jouer la concurrence entre ses négoces (une demande, plusieurs négoces, les réponses au même endroit), en trois étapes ;
 * ensuite le collectif, facultatif, pour les grosses commandes (« Plus on est, moins on paie. », les 20 artisans) ; puis
 * « Pourquoi Mobiiz ? », l'offre, les questions, le dernier appel. La concurrence est saine : jamais un mot contre les négoces. Rien
 * n'est promis qui n'existe : la comparaison porte sur les prix donnés par le lien, un devis reçu par e-mail est rangé,
 * pas lu ; jamais « IA » sur la landing (règle du 27 octobre), la préparation depuis un devis est dite « on t'aide ».
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

/**
 * Le bouton principal (Greg, 30 octobre 2026, nuit : « Commencer gratuitement », plus universel : comparer ses négoces comme
 * rejoindre un achat groupé) : l'accroche, le bas de page et le bouton fixe du téléphone. « Rejoindre le collectif » ne
 * reste que dans la section du collectif ; sur téléphone, un seul bouton principal visible à la fois.
 */
export const CTA_PRINCIPAL = { bouton: "Commencer gratuitement", sous: "Gratuit · Sans carte bancaire" } as const;
export const CTA_COLLECTIF = { bouton: "Rejoindre le collectif" } as const;

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
  {
    q: "Où arrivent les réponses des négoces ?",
    r: "Dans Mobiiz, avec ton chantier. Un négoce qui répond par le lien donne ses prix ligne par ligne, et Mobiiz te montre le moins cher. Un devis envoyé à ton adresse Mobiiz est rangé au même endroit. Tu choisis ensuite le négoce que tu veux.",
    lien: null,
  },
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
 * Les trois étapes (Greg, 30 octobre 2026, soir : « quatre étapes, c'est confus, on croit l'achat groupé obligatoire ») :
 * préparer sa demande (à la main, une liste scannée, ou depuis un devis), consulter plusieurs négoces, retrouver et comparer
 * leurs réponses. L'achat groupé a sa section à part. Pas de badge « Recommandé » : chacun choisit sa façon.
 */
const ETAPES = [
  { ico: "i-list", titre: "Prépare ta demande.", texte: "Écris tes matériaux, prends ta liste en photo ou pars de ton devis, on t’aide à la préparer. Tu vérifies les quantités et c’est prêt." },
  { ico: "i-upload", titre: "Consulte plusieurs négoces.", texte: "Tes négoces habituels, et d’autres si tu veux. Ils reçoivent tous la même demande, avec un PDF propre, en un seul envoi." },
  { ico: "i-search", titre: "Compare et choisis.", texte: "Les réponses arrivent dans Mobiiz, avec ton chantier. Les prix donnés en ligne se comparent ligne par ligne : tu vois le moins cher." },
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
                  Ne te contente plus <span>d’un seul prix.</span>
                </h1>
                <p className="hero-lead">Prépare ta demande de matériaux une fois, envoie-la à plusieurs négoces et compare leurs réponses. Pour les grosses commandes, regroupe-toi avec d’autres artisans : plus on est, moins on paie.</p>
                <div className="hero-actions">
                  <Link id="heroPrimaryCTA" className="btn btn-yellow" href="/inscription">
                    {CTA_PRINCIPAL.bouton} <Icone id="i-arrow" className="arrow" />
                  </Link>
                  <a className="text-link" href="#fonctionnement">
                    <span className="circle-down" aria-hidden="true">
                      ↓
                    </span>{" "}
                    Voir comment ça marche
                  </a>
                </div>
                <p className="under-cta">
                  {CTA_PRINCIPAL.sous} · <Link href="/tarifs">Voir les conditions</Link>
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
                {/* L'aperçu dit la demande à plusieurs négoces (Greg, 30 octobre 2026, soir) ; marqué « Exemple », sans prix. */}
                <div className="product-card" role="group" aria-label="Exemple de demande de prix dans Mobiiz">
                  <div className="product-card-top">
                    <span className="mini-brand">Mobiiz</span>
                    <span className="mini-counter">Exemple</span>
                  </div>
                  <h3>Ta demande · 3 négoces</h3>
                  {[
                    ["i-list", "Ta liste, un PDF propre"],
                    ["i-upload", "Envoyée à tes négoces"],
                    ["i-search", "Leurs prix côte à côte"],
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
                  <Icone id="i-search" /> Fais jouer la concurrence.
                </div>
              </div>
            </div>
            <div className="value-line">
              <div className="value-item">
                <Icone id="i-upload" />
                <span>
                  Plusieurs négoces
                  <br />
                  en une demande
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-search" />
                <span>
                  Leurs réponses
                  <br />
                  au même endroit
                </span>
              </div>
              <div className="value-item">
                <Icone id="i-people" />
                <span>
                  Les achats groupés
                  <br />
                  en plus
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="ticker">
          <div className="wrap ticker-inner" role="group" aria-label="Les avantages Mobiiz">
            {[
              ["✳", "Prépare"],
              ["↗", "Consulte"],
              ["✳", "Compare"],
              ["↓", "Plus on est, moins on paie"],
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
                  Une demande.
                  <br />
                  Plusieurs négoces.
                </h2>
              </div>
              <p className="aside">Fais jouer la concurrence sans multiplier les appels ni les e-mails. Tu gardes tes négoces habituels.</p>
            </div>
            <ol className="steps steps-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {ETAPES.map((e, i) => (
                <li className="step" key={e.titre}>
                  <span className="step-ico">
                    <Icone id={e.ico} />
                  </span>
                  <div>
                    <span className="step-count">Étape {i + 1}</span>
                    <h3>{e.titre}</h3>
                    <p>{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Le collectif, en plus et facultatif (Greg, 30 octobre 2026, soir : un service complémentaire, pas une étape). */}
        <section className="collective-section" id="collectif" aria-labelledby="collectiveTitle">
          <div className="wrap collective-layout">
            <div className="collective-copy">
              <span className="label">En plus : l’union fait la force</span>
              <h2 id="collectiveTitle">
                Plus on est, <span className="gold">moins on paie.</span>
              </h2>
              <p>Pour tes grosses commandes, regroupe tes besoins avec les artisans de ton métier, dans ton département : ensemble, on pèse plus face aux négoces. C’est facultatif, Mobiiz te sert aussi pour tes seules demandes de prix.</p>
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
              <Link id="collectifCTA" className="btn btn-yellow collectif-cta" href="/inscription">
                {CTA_COLLECTIF.bouton} <Icone id="i-arrow" className="arrow" />
              </Link>
            </div>
            <DemoVingtArtisans />
          </div>
        </section>

        {/* « Pourquoi Mobiiz ? » (Greg, 30 octobre 2026, nuit : neutre, collectif, sans l'identité ni la photo du fondateur ;
            son texte raccourci). Les négoces ne sont pas des adversaires : des demandes claires facilitent les échanges. */}
        <section className="bridge" id="pourquoi" aria-labelledby="pourquoiTitle">
          <div className="wrap">
            <div className="bridge-content">
              <span className="label">Pourquoi Mobiiz ?</span>
              <h2 id="pourquoiTitle">
                Un même matériau ne devrait pas être <span className="accent-underline">une surprise à chaque commande.</span>
              </h2>
              <div className="histoire">
                <p>Dans le bâtiment, on l’a tous vu : un jour, un excellent tarif grâce au volume ; le lendemain, pour quelques fournitures, des conditions très différentes. Et quand on travaille toujours avec le même fournisseur, difficile de savoir si l’on a le bon prix.</p>
                <p>Mobiiz est né de ce constat : consulter facilement plusieurs négoces, comparer leurs propositions, et regrouper nos achats quand le volume s’y prête. Des demandes claires pour les négoces, plus de visibilité pour les artisans.</p>
              </div>
              <p className="histoire-signature">Mobiiz. Plus on est, moins on paie.</p>
            </div>
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
              <p className="aside">Commence par tes demandes de prix. Rejoins un achat groupé quand une grosse commande s’y prête.</p>
            </div>
            <div className="benefits">
              <article className="benefit highlight">
                <span className="benefit-label">01 / Ton quotidien</span>
                <h3>Tes négoces en concurrence.</h3>
                <p>Un outil simple pour préparer tes listes et demander des prix à plusieurs négoces.</p>
                <ul>
                  <li>
                    <Icone id="i-check" /> Des listes de matériaux claires, avec leur PDF
                  </li>
                  <li>
                    <Icone id="i-check" /> Plusieurs négoces en une demande, les réponses au même endroit
                  </li>
                  <li>
                    <Icone id="i-check" /> 1 analyse de devis et 3 scans de liste offerts
                  </li>
                </ul>
                <Link className="cta-text" href="/inscription">
                  Préparer ma première demande <Icone id="i-arrow" className="arrow" />
                </Link>
              </article>
              <article className="benefit">
                <span className="benefit-label">02 / En plus, le collectif</span>
                <h3>Les achats groupés.</h3>
                <p>Pour une grosse commande, ta liste rejoint celles des artisans de ton métier, dans ton département. Les négoces chiffrent le volume.</p>
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
                Le prochain bon prix <span>commence ici.</span>
              </h2>
              <p>Inscris-toi, prépare ta première demande et consulte tes négoces. Le collectif est là quand une commande s’y prête.</p>
              <Link id="finalPrimaryCTA" className="btn btn-yellow" href="/inscription">
                {CTA_PRINCIPAL.bouton} <Icone id="i-arrow" className="arrow" />
              </Link>
              <small>{CTA_PRINCIPAL.sous}</small>
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
      <CtaFixePremium haut="heroPrimaryCTA" bas="finalPrimaryCTA" aussi={["collectifCTA"]} bouton={CTA_PRINCIPAL.bouton} />
    </div>
  );
}
