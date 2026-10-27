import Link from "next/link";
import { DemoSurBouton } from "@/components/demo-guidee";
import { CompteurInscrits } from "@/components/inviter";
import { Apparition, CompteurVingt, PartageVitrine } from "@/components/landing-mouvement";
import { EnteteVitrine, PiedVitrine } from "@/components/vitrine";
import { ECART_PEINTURE, ECRANS, REGROUPEMENT_EXEMPLE } from "@/lib/landing";
import { LectureAnimee } from "@/components/landing-lecture";
import { ACCROCHE_APP, NOM_APP } from "@/lib/nom";

/**
 * LA PAGE D'ACCUEIL PUBLIQUE, « NIVEAU STUDIO » (Greg, 26 octobre 2026, direction artistique validée) : une page qui parle
 * comme un couvreur à un couvreur, la preuve plutôt que la promesse. Fond clair, jaune #FFC800 et noir, titres en Bricolage
 * Grotesque étroite, colonne décalée (`landing.css`). Trois mouvements seulement : le vrai devis DE00000071 lu ligne par ligne
 * en haut, ses fournitures qui sortent dans « Ta liste » (`LectureAnimee`, rejouée tant qu'elle est à l'écran), le compteur 1 → 20 sur la phrase clé, les sections et leurs lignes de cote au défilement ; tout s'arrête
 * sous « réduire les animations ». Rien d'extérieur, aucune photo tant que Greg n'en fournit pas une à lui.
 *
 * Gardé mot pour mot (Greg) : « Par un artisan, pour les artisans. », « Seul, tu es un client parmi d'autres. À vingt, vous
 * êtes le plus gros client du département. », « Des chasseurs d'opportunités négocient pour toi. » ; « Dès 29 € HT par mois »
 * avec le détail annuel et mensuel dessous. Chaque chiffre vient de `lib/landing.ts`, avec sa source.
 *
 * Avant (23 au 25 octobre) : page sombre « haute visibilité », un iPhone sur un aplat jaune dont la capture était coupée.
 */

/** Une vraie capture de l'app, entière (jamais coupée), en AVIF et WebP à deux largeurs. */
function Ecran({ nom, alt }: { nom: string; alt: string }) {
  const srcset = (ext: string) => `/landing/${nom}-390.${ext} 390w, /landing/${nom}-786.${ext} 786w`;
  const sizes = "(min-width: 1024px) 286px, (min-width: 768px) 246px, 72vw";
  return (
    <div className="mz-ecran">
      <picture>
        <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
        <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
        <img src={`/landing/${nom}-390.webp`} alt={alt} width={786} height={1704} loading="lazy" decoding="async" />
      </picture>
    </div>
  );
}

function Cote({ gauche, droite }: { gauche?: string; droite?: string }) {
  return (
    <p className="mz-cote mz-etiq" style={{ marginBottom: 26 }}>
      {gauche ? <span>{gauche}</span> : null}
      <i aria-hidden="true" />
      {droite ? <span>{droite}</span> : null}
    </p>
  );
}

/**
 * Une visite comptée par le serveur du site (tableau de bord, 24 octobre 2026) : ni cookie, ni adresse, ni rien sur la
 * personne ; un nombre par jour. Sans réponse de l'API, la page s'affiche quand même.
 */
function compterLaVisite() {
  const api = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  void fetch(`${api}/v1/public/visite`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => undefined);
}

const ETAPES = [
  { titre: "Dépose ton devis", texte: "Le PDF du devis client, tel quel, ou ta liste en photo. Rien à recopier.", ecran: ECRANS.depot },
  { titre: `${NOM_APP} prépare ton quantitatif`, texte: "Une ligne par fourniture, au nom du comptoir. Tu corriges d'un tap.", ecran: ECRANS.liste },
  { titre: "Envoie à tes négoces et compare", texte: "Leurs prix côte à côte, livraison comprise. Tu commandes où tu veux.", ecran: ECRANS.prix },
] as const;

/** L'écart pot seul / palette négociée (Greg, 26 octobre 2026) : la peinture, sans marque ni enseigne, marqué « Exemple ». */
function BlocPeinture() {
  return (
    <section aria-labelledby="ecart" className="mz-section mz-deux" data-apparait="">
      <div>
        <Cote gauche="Seul ou en palette" />
        <h2 id="ecart" className="mz-titre mz-h2">
          {ECART_PEINTURE.titre}
        </h2>
        <p className="mz-gris" style={{ marginTop: 16, maxWidth: "38ch" }}>
          Le prix palette, un artisan seul l&apos;a rarement. En regroupant les besoins du secteur, on va le chercher.
        </p>
      </div>
      <div>
        <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontWeight: 700 }}>{ECART_PEINTURE.article}</span>
          <span className="mz-badge">{ECART_PEINTURE.mention}</span>
        </p>
        <div className="mz-carte mz-duo">
          <div>
            <p className="mz-etiq">Acheté seul</p>
            <p className="mz-titre mz-num">{ECART_PEINTURE.seul.prix}</p>
            <p className="mz-gris" style={{ fontSize: 13 }}>
              {ECART_PEINTURE.seul.unite}
            </p>
          </div>
          <div>
            <p className="mz-etiq">En palette négociée</p>
            <p className="mz-titre mz-num">{ECART_PEINTURE.palette.prix}</p>
            <p style={{ fontSize: 13 }}>{ECART_PEINTURE.palette.unite}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * « Ta liste de matériaux ? On te file un coup de main. » (Greg, 27 octobre 2026, 2e message, point 30), mot pour mot :
 * trois façons, jamais les mots « précis », « exact », « automatique » ni « IA » (test `landing-coup-de-main.test.mjs`).
 */
export const COUP_DE_MAIN = {
  titre: "Ta liste de matériaux ? On te file un coup de main.",
  sous: "Pas besoin de tout taper. Choisis ce qui t'arrange.",
  choix: [
    "Donne-nous ton devis, on t'avance ta liste. C'est pas parfait, mais t'as plus qu'à vérifier et peaufiner.",
    "Tu as déjà ta liste sur papier ? Prends-la en photo, on la met dans l'app pour toi.",
    "Tu préfères la faire toi-même ? Note-la directement, ligne par ligne.",
  ],
} as const;

function CoupDeMain() {
  return (
    <section aria-labelledby="coup-de-main" className="mz-section" data-apparait="">
      <Cote gauche="Ta liste" />
      <h2 id="coup-de-main" className="mz-titre mz-h2">
        {COUP_DE_MAIN.titre}
      </h2>
      <p className="mz-gris" style={{ marginTop: 12, marginBottom: 20 }}>
        {COUP_DE_MAIN.sous}
      </p>
      <ol className="mz-trois" aria-label="Trois façons de faire ta liste">
        {COUP_DE_MAIN.choix.map((c, i) => (
          <li key={c}>
            <span className="mz-trois-n mz-num" aria-hidden="true">
              {i + 1}
            </span>
            {c}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Les trois lignes du haut de page, mot pour mot (Greg, 26 octobre 2026). */
const TROIS_LIGNES = ["Tu dis ce que tu vas commander (ton devis suffit).", "On l'additionne avec les artisans du coin.", "On négocie, tu achètes au prix des gros."] as const;

/**
 * `cible` : /couvreurs (la couverture d'abord, sans le bloc peinture) ou /peintres (le bloc peinture en pleine place, juste
 * sous l'accroche, sans l'exemple d'ardoise ; Greg, 26 octobre 2026). Sans cible : l'accueil.
 */
export function Landing({ cible, origine }: { cible?: "couvreurs" | "peintres"; origine: string }) {
  compterLaVisite();
  const couvreurs = cible === "couvreurs";
  const peintres = cible === "peintres";
  return (
    <div className="mz">
      <Apparition />
      <div className="mz-page">
        <EnteteVitrine />

        <main>
          {/* L'accroche, à gauche ; à droite, un vrai devis lu sous les yeux du visiteur. */}
          <section aria-labelledby="accroche" className="mz-accroche">
            <div>
              <p className="mz-kicker mz-etiq">{ACCROCHE_APP}</p>
              {/* Greg, 27 octobre 2026, 2e message, point 29 : le titre, puis la deuxième promesse juste en dessous. */}
              <h1 id="accroche" className="mz-titre mz-h1">
                Achète tes matériaux <span className="mz-surligne">au prix des gros.</span>
              </h1>
              <p className="mz-concept" style={{ fontWeight: 800 }}>
                Arrête de perdre du temps sur tes quantitatifs.
              </p>
              {/* Le concept, juste sous le titre et avant tout le reste (Greg, 26 octobre 2026 : « le concept n'est pas compris
                  en haut de page ») : la phrase en gros, puis trois lignes numérotées, visibles sans défiler sur un iPhone SE. */}
              <p className="mz-chapo">
                {NOM_APP} additionne les commandes de matériaux des artisans d&apos;un même secteur et négocie le prix de gros pour chacun.
              </p>
              <ol className="mz-trois" aria-label="En trois étapes">
                {TROIS_LIGNES.map((l, i) => (
                  <li key={l}>
                    <span className="mz-trois-n mz-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    {l}
                  </li>
                ))}
              </ol>
              {couvreurs ? <p style={{ fontWeight: 700, marginBottom: 10 }}>Pour les couvreurs : ardoise, zinc, bois de charpente, isolation de toiture.</p> : null}
              {peintres ? <p style={{ fontWeight: 700, marginBottom: 10 }}>Pour les peintres : peinture, sous-couche, enduit, toile de verre.</p> : null}
              <p className="mz-chapo">
                Le devis que tu as fait à ton client suffit : {NOM_APP} en sort ta liste de matériaux. Tu peux aussi l&apos;envoyer à tes propres négoces et comparer leurs prix.
              </p>
              <div className="mz-actions">
                <Link href="/inscription" className="mz-bouton">
                  Commencer gratuitement
                </Link>
                <DemoSurBouton className="mz-lien" />
              </div>
              {/* Point 34 : aucun montant tant que le prix n'est pas fixé. */}
              <p className="mz-prix-detail">
                Gratuit pour faire tes listes et les envoyer à tes négoces. Abonné pour profiter des achats groupés. Ton premier achat groupé est offert. <Link href="/tarifs">Voir les tarifs</Link>
              </p>
            </div>

            <LectureAnimee />
          </section>

          <CoupDeMain />

          {peintres ? <BlocPeinture /> : null}

          {/* La phrase clé et le compteur 1 → 20. */}
          <section aria-labelledby="vingt" className="mz-section mz-vingt" data-apparait="">
            <span className="mz-trame" aria-hidden="true" />
            <div className="mz-colonne">
              <Cote gauche="1" droite="20 artisans" />
              <CompteurVingt />
              <h2 id="vingt" className="mz-titre mz-h2 mz-phrase">
                <span>Seul, tu es un client parmi d&apos;autres.</span> À vingt, vous êtes le plus gros client du département.
              </h2>
              <p className="mz-chasse">Des chasseurs d&apos;opportunités négocient pour toi.</p>
              <div className="mz-inscrits">
                <CompteurInscrits />
              </div>
            </div>
          </section>

          {/* L'écart pot seul / palette négociée, à sa place sur l'accueil ; pas sur /couvreurs, où il ne parlerait pas au métier. */}
          {cible === undefined ? <BlocPeinture /> : null}

          {/* Un regroupement, marqué « exemple » jusqu'au premier vrai (d'ardoise : pas sur /peintres). */}
          {peintres ? null : (
            <section aria-labelledby="regroupement" className="mz-section mz-deux" data-apparait="">
              <div>
                <Cote gauche="Un regroupement" />
                <h2 id="regroupement" className="mz-titre mz-h2">
                  Les mêmes ardoises, dans le même département.
                </h2>
                <p className="mz-gris" style={{ marginTop: 16, maxWidth: "40ch" }}>
                  Quand d&apos;autres artisans du secteur ont besoin des mêmes gros matériaux, on réunit les volumes. Un chasseur d&apos;opportunités appelle les négoces et revient avec une offre. Tu acceptes ou pas.
                </p>
              </div>
              <div className="mz-carte mz-ticket">
                <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span className="mz-etiq">Regroupement</span>
                  <span className="mz-badge">Exemple</span>
                </p>
                <p className="mz-titre" style={{ fontSize: 34, marginTop: 14 }}>
                  {REGROUPEMENT_EXEMPLE.article}
                </p>
                <dl className="mz-num">
                  <dt>Département</dt>
                  <dd>{REGROUPEMENT_EXEMPLE.departement}</dd>
                  <dt>Entreprises</dt>
                  <dd>{REGROUPEMENT_EXEMPLE.entreprises}</dd>
                  <dt>Quantité réunie</dt>
                  <dd>{REGROUPEMENT_EXEMPLE.quantite}</dd>
                  <dt>Besoin</dt>
                  <dd>{REGROUPEMENT_EXEMPLE.besoin}</dd>
                </dl>
              </div>
            </section>
          )}

          {/* Les trois étapes, avec les vrais écrans de l'app, entiers. */}
          <section aria-labelledby="comment" id="comment" className="mz-section" style={{ scrollMarginTop: 24 }}>
            <div data-apparait="">
              <Cote gauche="Trois étapes, les vrais écrans" />
              <h2 id="comment" className="mz-titre mz-h2" style={{ marginBottom: 24 }}>
                Comment ça marche
              </h2>
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {ETAPES.map((e, i) => (
                <li key={e.titre} className="mz-etape" data-inverse={i === 1 ? "" : undefined} data-apparait="">
                  <span className="mz-titre mz-etape-no mz-num" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div className="mz-etape-texte">
                    <h3 className="mz-titre">
                      <span className="sr-only">{i + 1}. </span>
                      {e.titre}
                    </h3>
                    <p>{e.texte}</p>
                  </div>
                  <Ecran nom={e.ecran.nom} alt={e.ecran.alt} />
                </li>
              ))}
            </ol>
          </section>

          {/* Le partage, comme les artisans se passent la page : WhatsApp et SMS. */}
          <section aria-labelledby="partage" className="mz-section mz-deux" data-apparait="">
            <div>
              <Cote gauche="Fais venir tes collègues" />
              <h2 id="partage" className="mz-titre mz-h2">
                Plus on est nombreux, plus on pèse.
              </h2>
            </div>
            <PartageVitrine origine={origine} />
          </section>

          <section aria-labelledby="commencer" className="mz-section" data-apparait="">
            <h2 id="commencer" className="mz-titre mz-h2" style={{ maxWidth: "14ch" }}>
              Ton prochain chantier, <span className="mz-surligne">au propre.</span>
            </h2>
            <div className="mz-actions">
              <Link href="/inscription" className="mz-bouton">
                Commencer gratuitement
              </Link>
            </div>
          </section>

          <section aria-labelledby="negoces" className="mz-negoce" data-apparait="">
            <div>
              <p className="mz-etiq" style={{ color: "var(--mz-jaune)", marginBottom: 10 }}>
                Vous êtes négoce ?
              </p>
              <h2 id="negoces" className="mz-titre mz-h2">
                Gratuit pour vous.
              </h2>
              <p style={{ marginTop: 12, maxWidth: "52ch" }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>Négoces :</span> des demandes structurées, prêtes à chiffrer, et des volumes groupés. Vos clients artisans paient le juste prix, et vous vendez plus.
              </p>
            </div>
            <Link href="/negoce/connexion" className="mz-lien">
              Accès négoce
            </Link>
          </section>
        </main>

        <PiedVitrine />
      </div>
    </div>
  );
}
