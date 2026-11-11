import Link from "next/link";
import { BoutonDecouvrir } from "@/components/acces-demo";
import { CtaFixePremium, EntetePremium, PaliersCollectif } from "@/components/landing-premium";
import { SiMissions } from "@/components/landing-missions";
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
      <symbol id="i-person" viewBox="0 0 24 24">
        <circle cx="12" cy="7.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 20.5v-1.6A5.9 5.9 0 0110.4 13h3.2a5.9 5.9 0 015.9 5.9v1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-case" viewBox="0 0 24 24">
        <rect x="3" y="7.5" width="18" height="12.5" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5M3 13h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-inbox" viewBox="0 0 24 24">
        <path d="M4 5.5h16v10H8.5L4 19.5z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M8 9.5h8M8 12.5h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="m15 15 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </symbol>
      {/* Le casque de chantier, en silhouette pleine (retour de Greg, 30 octobre 2026 : l'ancien dessin prêtait à confusion) :
          la calotte, sa nervure centrale, la visière qui déborde. */}
      <symbol id="i-helmet" viewBox="0 0 32 32">
        <path d="M5 21.5C5 14.6 9.6 9.2 16 9.2s11 5.4 11 12.3z" fill="currentColor" />
        <path d="M13.2 21.5v-9.6c0-1.3 1.2-2.4 2.8-2.4s2.8 1.1 2.8 2.4v9.6" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" />
        <rect x="2.5" y="21.2" width="27" height="3.6" rx="1.8" fill="currentColor" />
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
  {
    q: "Combien de négoces je peux consulter ?",
    r: "Jusqu’à 5 négoces par demande, quelle que soit ta formule, la gratuite comprise. Les abonnements n’ajoutent que des analyses de devis et des scans de liste.",
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
 * Les trois étapes (Greg, 30 octobre 2026, soir, puis la maquette du 31 octobre) : préparer sa liste, consulter ses
 * négoces, comparer et choisir. L'achat groupé a sa bande à part. Pas de badge « Recommandé ».
 */
const ETAPES = [
  { titre: "Prépare ta liste", texte: "Écris tes matériaux, photographie ta liste ou pars de ton devis. Tu vérifies, c’est prêt." },
  { titre: "Consulte tes négoces", texte: "Une seule demande, avec un PDF propre, envoyée jusqu’à 5 négoces." },
  { titre: "Compare et choisis", texte: "Les réponses arrivent dans Mobiiz. Les prix donnés en ligne se comparent ligne par ligne." },
] as const;

const BENEFICES = [
  { ico: "i-check", titre: "Simple et rapide", texte: "Une demande au lieu de cinq appels." },
  { ico: "i-search", titre: "Plus de visibilité", texte: "Tu compares facilement les propositions." },
  { ico: "i-people", titre: "Plus de poids", texte: "Le collectif négocie de meilleurs tarifs." },
] as const;

/** La question des missions : seulement quand elles sont ouvertes (`SiMissions`). */
const QUESTION_MISSIONS = {
  q: "Les missions entre entreprises, c’est quoi ?",
  r: "Une mise en relation entre entreprises indépendantes du bâtiment. Tu publies une mission quand tu recherches une entreprise, ou tu indiques tes disponibilités. Mobiiz met en relation, rien de plus : ce n’est ni de l’intérim ni du recrutement, et aucune mission n’est garantie. Les coordonnées ne sont partagées qu’après l’accord des deux entreprises.",
} as const;

/**
 * « Commence gratuitement » (Greg, 11 novembre 2026, après la première version) : trois grandes cartes sans prix donnaient
 * l'impression qu'une information manquait. Un bloc compact dit ce qui est gratuit et renvoie à la page Tarifs, seul
 * endroit où les trois formules et leurs prix sont détaillés. AUCUN montant ici (règle du 30 octobre 2026).
 */
const GRATUIT = ["Quantitatifs et listes saisies à la main", "Demandes jusqu’à 5 négoces", "Achats groupés de ton secteur"] as const;

/**
 * Les deux écrans de l'app de la section Missions : de VRAIES captures (données fictives, entreprises « Exemple »), dans
 * le même cadre de téléphone que les étapes. Aucune photo, aucun chiffre, aucun témoignage inventé.
 */
const ECRANS_MISSIONS = [
  { src: "/landing/v3/ecran-missions.webp", alt: "L'app Mobiiz : les missions publiées par des entreprises du secteur (exemple)" },
  { src: "/landing/v3/ecran-disponible.webp", alt: "L'app Mobiiz : une entreprise disponible, son secteur et son tarif journalier indicatif (exemple)" },
] as const;

const PARCOURS_MISSIONS = [
  { titre: "Je recherche une entreprise", texte: "Métier, lieu, dates et conditions indicatives." },
  { titre: "Je suis disponible", texte: "Secteur, disponibilités, profil professionnel et tarif HT/jour indicatif." },
] as const;

/** Les écrans de l'app mis en scène dans un téléphone : contenu d'exemple, jamais un vrai client ni un vrai prix. */
/**
 * LES VRAIS ÉCRANS DE L'APP (Greg, 31 octobre 2026 : « des vraies captures d'écran avec des téléphones type iPhone sans
 * nommer la marque », puis « des captures qui donnent envie : c'est une landing page »). Captures de l'app réelle, données
 * fictives (Toitures Exemple, Négoce A à E, prix d'exemple), dans un cadre de téléphone neutre : aucune marque, aucun logo.
 */
const ECRANS = [
  { src: "/landing/v3/ecran-liste.webp", alt: "L'app Mobiiz : ta liste de fournitures, prête à partir" },
  { src: "/landing/v3/ecran-negoces.webp", alt: "L'app Mobiiz : la liste envoyée à cinq négoces en une fois" },
  { src: "/landing/v3/ecran-reponses.webp", alt: "L'app Mobiiz : les devis reçus, du moins cher au plus cher (exemple)" },
] as const;

function Cadre({ src, alt, classe, exemple }: { src: string; alt: string; classe: string; exemple: boolean }) {
  return (
    <figure className={`mz2-tel ${classe}`}>
      <div className="mz2-tel-ecran">
        <div className="mz2-tel-barre" aria-hidden="true">
          <span>9:41</span>
          <span className="mz2-tel-ilot" />
          <span className="mz2-tel-etat" />
        </div>
        {/* Greg, 31 octobre 2026, soir (« ça pixelise sur PC ») : la capture d'origine (1170 px) et deux tailles plus
            légères ; l'écran incliné est servi au double de sa taille au moins, pour un texte net. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- une capture déjà optimisée (WebP, 600 px), chargée tard */}
        <img
          src={src}
          srcSet={`${src} 600w, ${src.replace(".webp", "-900.webp")} 900w, ${src.replace(".webp", "-1170.webp")} 1170w`}
          sizes="(max-width: 900px) 150px, 400px"
          alt={alt}
          width={1170}
          height={2532}
          loading="lazy"
          decoding="async"
        />
      </div>
      {exemple ? <figcaption className="mz2-tel-exemple">Exemple</figcaption> : null}
    </figure>
  );
}

function Telephone({ n }: { n: number }) {
  const e = ECRANS[n]!;
  return <Cadre src={e.src} alt={e.alt} classe={`mz2-tel-${n + 1}`} exemple={n === 2} />;
}

export function LandingPremium() {
  compterLaVisite();
  return (
    <div className="mzp">
      <Sprite />
      <EntetePremium />
      <main id="haut">
        {/* Les nappes de lumière du fond (Greg, 31 octobre 2026) : floues, très lentes, à peine visibles ; immobiles sous
            « réduire les animations ». Purement décoratives. */}
        <div className="mz2-nappes" aria-hidden="true">
          <span className="n1" />
          <span className="n2" />
          <span className="n3" />
          <span className="n4" />
        </div>

        <section className="mz2-hero" aria-labelledby="heroTitle">
          <div className="wrap mz2-hero-grid">
            <div className="mz2-hero-copy">
              <span className="mz2-kicker">{ACCROCHE_APP.replace(/\.$/, "")}</span>
              <h1 id="heroTitle">
                <span className="l1">Compare les négoces.</span> Achète tes matériaux <span>au bon prix.</span>
              </h1>
              <p className="mz2-lead">Une seule demande, envoyée jusqu’à 5 négoces. Compare leurs offres et, si tu le souhaites, regroupe tes achats pour négocier plus fort.</p>
              <div className="hero-actions">
                <Link id="heroPrimaryCTA" className="btn btn-yellow" href="/inscription">
                  {CTA_PRINCIPAL.bouton} <Icone id="i-arrow" className="arrow" />
                </Link>
                {/* L'accès démo (Greg, 7 novembre 2026, test.mobiiz.fr seulement) : absent tant que le serveur ne l'allume pas. */}
                <BoutonDecouvrir />
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
            {/* Le visuel choisi par Greg (31 octobre 2026, soir, second choix) : les matériaux des métiers (parpaing, liteaux,
                plaques, isolant, PVC, peinture) sur fond noir, lumière jaune, devant la bande jaune en diagonale de la
                maquette. Panoramique sur ordinateur ; sur téléphone, un cadrage moins large où tous les matériaux restent.
                WebP de 16 à 56 Ko, deux tailles chacun. */}
            <div className="mz2-hero-visuel">
              <span className="mz2-bande" aria-hidden="true" />
              <picture>
                <source media="(max-width: 900px)" type="image/webp" srcSet="/landing/v3/hero-materiaux-mobile-640.webp 640w, /landing/v3/hero-materiaux-mobile-1000.webp 1000w" sizes="calc(100vw - 32px)" width={1000} height={498} />
                <img
                  src="/landing/v3/hero-materiaux-1600.webp"
                  srcSet="/landing/v3/hero-materiaux-1000.webp 1000w, /landing/v3/hero-materiaux-1600.webp 1600w"
                  sizes="(max-width: 1240px) 50vw, 600px"
                  alt="Les matériaux du chantier : tuyau PVC, parpaing, plaques, liteaux, rouleau d'isolant, seau et rouleau de peinture"
                  width={1600}
                  height={689}
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
            </div>
          </div>
        </section>

        {/* « Comment ça marche ? » (maquette du 31 octobre) : trois étapes courtes, chacune avec son écran de l'app mis en
            scène (contenu d'exemple, prix marqués « Exemple »), téléphones légèrement inclinés, jamais deux fois pareil. */}
        <section className="mz2-carte" id="fonctionnement" aria-labelledby="stepsTitle">
          <div className="wrap">
            <h2 id="stepsTitle" className="mz2-souligne">
              Comment ça marche ?
            </h2>
            <ol className="mz2-etapes">
              {ETAPES.map((e, i) => (
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

        {/* Le collectif, fortement mis en avant mais facultatif (« si tu le souhaites ») : plus on est, moins on paie, en
            trois paliers qui s'allument au défilement (`PaliersCollectif`). Prix d'exemple, jamais une économie promise. */}
        <section className="mz2-collectif-wrap" id="collectif" aria-labelledby="collectiveTitle">
          <div className="wrap">
            <div className="mz2-collectif">
              <div className="mz2-collectif-texte">
                <span className="mz2-collectif-ico" aria-hidden="true">
                  <Icone id="i-people" />
                </span>
                <div>
                  <h2 id="collectiveTitle">
                    Achète en collectif <span className="mz2-pastille">si tu le souhaites</span>
                  </h2>
                  <p>Regroupe tes besoins avec d’autres artisans de ton métier et de ton département, et négociez ensemble un meilleur prix. Plus on est, moins on paie.</p>
                  <Link id="collectifCTA" className="mz2-lien-jaune" href="/inscription">
                    {CTA_COLLECTIF.bouton} <Icone id="i-arrow" className="arrow" />
                  </Link>
                </div>
              </div>
              <PaliersCollectif />
            </div>
            <p className="mz2-note">Gratuit, pour tous les artisans. Exemple fictif : les prix réels dépendent des offres reçues, aucune économie n’est garantie.</p>
          </div>
        </section>

        <section className="mz2-benefices-wrap" aria-label="Ce que Mobiiz t'apporte">
          <ul className="wrap mz2-benefices">
            {BENEFICES.map((b) => (
              <li key={b.titre}>
                <Icone id={b.ico} />
                <div>
                  <h3>{b.titre}</h3>
                  <p>{b.texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* LES MISSIONS ENTRE ENTREPRISES (Greg, 11 novembre 2026 : « une véritable section dédiée, clairement séparée des
            achats groupés ») : sur fond noir, le titre en deux questions, deux parcours, la ligne de confiance, et deux
            vrais écrans de l'app devant la bande jaune de l'accroche. Mobiiz met en relation des entreprises indépendantes :
            ni intérim, ni recrutement, ni mission garantie. La section n'existe que si le serveur a ouvert les missions. */}
        <SiMissions>
          <section className="mz2-ms" id="missions" aria-labelledby="missionsTitle">
            <div className="wrap mz2-ms-grid">
              <div className="mz2-ms-copy">
                <span className="label">Missions entre entreprises</span>
                <h2 id="missionsTitle">
                  Besoin d’une entreprise sur un chantier ? <span>Disponible pour une mission ?</span>
                </h2>
                <p className="mz2-ms-lead">Mobiiz met en relation des entreprises du bâtiment. Publie une mission ou indique tes disponibilités, ton secteur et ton tarif journalier indicatif.</p>
                <ol className="mz2-ms-parcours">
                  {PARCOURS_MISSIONS.map((x, i) => (
                    <li key={x.titre}>
                      <span className="mz2-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div>
                        <h3>{x.titre}</h3>
                        <p>{x.texte}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mz2-ms-confiance">
                  <Icone id="i-lock" />
                  <span>Les échanges restent liés à une mission. Les coordonnées ne sont partagées qu’après l’accord des deux entreprises.</span>
                </p>
                <Link id="missionsCTA" className="btn btn-yellow" href="/inscription">
                  Découvrir les missions <Icone id="i-arrow" className="arrow" />
                </Link>
              </div>
              <div className="mz2-ms-visuel">
                <span className="mz2-bande mz2-ms-bande" aria-hidden="true" />
                <Cadre src={ECRANS_MISSIONS[1].src} alt={ECRANS_MISSIONS[1].alt} classe="mz2-ms-tel-arriere" exemple={false} />
                <Cadre src={ECRANS_MISSIONS[0].src} alt={ECRANS_MISSIONS[0].alt} classe="mz2-ms-tel-avant" exemple />
              </div>
            </div>
          </section>
        </SiMissions>

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

        {/* « Commence gratuitement » : un bloc compact, sans prix ; les formules se lisent sur la page Tarifs. */}
        <section className="mz2-offre" id="offres" aria-labelledby="offreTitle">
          <div className="wrap">
            <div className="mz2-offre-carte">
              <div className="mz2-offre-titre">
                <span className="label">Sans carte bancaire</span>
                <h2 id="offreTitle">Commence gratuitement</h2>
              </div>
              <div className="mz2-offre-corps">
                <ul>
                  {GRATUIT.map((x) => (
                    <li key={x}>
                      <Icone id="i-check" /> {x}
                    </li>
                  ))}
                  <SiMissions>
                    <li>
                      <Icone id="i-check" /> Missions entre entreprises
                    </li>
                  </SiMissions>
                </ul>
                <p>Analyses de devis et scans de liste supplémentaires avec Essentiel ou Pro.</p>
              </div>
              <Link id="offresCTA" className="btn btn-outline" href="/tarifs">
                Voir les offres et les tarifs <Icone id="i-arrow" className="arrow" />
              </Link>
            </div>
          </div>
        </section>

        {/* « Le prochain bon prix » avant les questions (Greg, 31 octobre 2026, soir). */}
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
              <SiMissions>
                <details>
                  <summary>{QUESTION_MISSIONS.q}</summary>
                  <p>{QUESTION_MISSIONS.r}</p>
                </details>
              </SiMissions>
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
      <CtaFixePremium haut="heroPrimaryCTA" bas="finalPrimaryCTA" aussi={["collectif", "missionsCTA"]} bouton={CTA_PRINCIPAL.bouton} />
    </div>
  );
}
