import Link from "next/link";
import { ArrowRight, Camera, FileUp, Handshake, PencilLine, Users } from "lucide-react";
import { DemoSurBouton } from "@/components/demo-guidee";
import { CompteurInscrits } from "@/components/inviter";
import { Apparition, BoutonFixeInscription, CompteurVingt, PartageVitrine } from "@/components/landing-mouvement";
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
function Ecran({ nom, alt, prioritaire = false }: { nom: string; alt: string; prioritaire?: boolean }) {
  const srcset = (ext: string) => `/landing/${nom}-390.${ext} 390w, /landing/${nom}-786.${ext} 786w`;
  const sizes = "(min-width: 1024px) 286px, (min-width: 768px) 246px, 72vw";
  return (
    <div className="mz-ecran">
      <picture>
        <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
        <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
        <img src={`/landing/${nom}-390.webp`} alt={alt} width={786} height={1704} loading={prioritaire ? "eager" : "lazy"} decoding="async" />
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

/** Les trois façons, en cartes (maquette de Greg, 28 octobre 2026) : l'icône, le nom du choix dans l'app, sa phrase. */
const CHOIX_LISTE = [
  { icone: FileUp, titre: "Depuis mon devis — on t'avance" },
  { icone: Camera, titre: "Photo de ma liste" },
  { icone: PencilLine, titre: "Je la note moi-même" },
] as const;

function CoupDeMain() {
  return (
    <section aria-labelledby="coup-de-main" className="mz-section" data-apparait="">
      <h2 id="coup-de-main" className="mz-titre mz-h2 mz-souligne">
        {COUP_DE_MAIN.titre}
      </h2>
      <p className="mz-gris" style={{ marginTop: 12, marginBottom: 20 }}>
        {COUP_DE_MAIN.sous}
      </p>
      <ol className="mz-choix" aria-label="Trois façons de faire ta liste">
        {COUP_DE_MAIN.choix.map((c, i) => {
          const Icone = CHOIX_LISTE[i]!.icone;
          return (
            <li key={c}>
              <span className="mz-icone" aria-hidden="true">
                <Icone size={26} strokeWidth={2} />
              </span>
              <span className="mz-choix-texte">
                <strong>{CHOIX_LISTE[i]!.titre}</strong>
                <span>{c}</span>
              </span>
              <Link href="/inscription" className="mz-fleche" aria-label={`${CHOIX_LISTE[i]!.titre} : ${INSCRIPTION.bouton}`}>
                <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Le mécanisme en trois phrases, mot pour mot (Greg, 28 octobre 2026, point 4). */
export const MECANISME = "Les artisans de ton secteur mettent leurs commandes en commun. Mobiiz demande un prix aux négoces pour le total. Tu commandes au meilleur prix reçu.";

/** Un seul libellé pour tous les boutons d'inscription, avec « Sans carte bancaire » dessous (Greg, 28 octobre 2026, point 4). */
export const INSCRIPTION = { bouton: "Créer mon compte gratuit", sous: "Sans carte bancaire" } as const;

export function BoutonInscription() {
  return (
    <span className="mz-cta">
      <Link href="/inscription" className="mz-bouton">
        {INSCRIPTION.bouton} <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />
      </Link>
      <span className="mz-cta-sous">{INSCRIPTION.sous}</span>
    </span>
  );
}

/** Trois questions franches, mot pour mot (Greg, 28 octobre 2026, point 4). Visibles d'un coup, sans accordéon. */
export const TROIS_QUESTIONS = [
  {
    q: "Je suis obligé de commander ?",
    r: "Oui, mais seulement ce que tu as coché, et au moins cher entre l'offre du groupe et ton négoce habituel. Tu ne paies jamais plus cher qu'aujourd'hui. Deux sorties possibles : chantier annulé ou aucune offre livrable à temps.",
  },
  { q: "Je garde mes négoces ?", r: "Oui. C'est toi qui les ajoutes, et Mobiiz leur demande un prix de ta part." },
  { q: "C'est gratuit ?", r: "Les listes, l'envoi à tes négoces et les achats groupés de ton secteur sont gratuits, sans limite de durée. Ton premier achat groupé est offert." },
] as const;

function TroisQuestions() {
  return (
    <section aria-labelledby="questions" className="mz-section" data-apparait="">
      <Cote gauche="Trois questions franches" />
      <h2 id="questions" className="mz-titre mz-h2">
        Ce que tu te demandes.
      </h2>
      <dl className="mz-questions">
        {TROIS_QUESTIONS.map((x) => (
          <div key={x.q}>
            <dt className="mz-titre">{x.q}</dt>
            <dd>{x.r}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * « Par un artisan, pour les artisans » en pleine place (Greg, 28 octobre 2026, point 4) : Grégory, couvreur à Paimpol depuis
 * plus de 20 ans. Sans photo (Greg, 29 octobre 2026 : « je ne mettrai pas ma photo ») : le texte seul.
 */
function ParUnArtisan() {
  return (
    <section aria-labelledby="artisan" className="mz-section mz-artisan" data-apparait="">
      <div>
        <Cote gauche="Qui est derrière" />
        <h2 id="artisan" className="mz-titre mz-h2">
          {ACCROCHE_APP}
        </h2>
        <p className="mz-artisan-texte">Grégory, couvreur à Paimpol depuis plus de 20 ans. {NOM_APP}, c&apos;est son outil de chantier, ouvert aux artisans du secteur.</p>
      </div>
    </section>
  );
}


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
              {/* Greg, 28 octobre 2026, point 4 : le mécanisme, mot pour mot, visible sans défiler sur un iPhone SE ; « Arrête de
                  perdre du temps sur tes quantitatifs. » vient APRÈS, jamais avant. */}
              <p className="mz-mecanisme">{MECANISME}</p>
              <p className="mz-concept" style={{ fontWeight: 800 }}>
                Arrête de perdre du temps sur tes quantitatifs.
              </p>
              {couvreurs ? <p style={{ fontWeight: 700, marginBottom: 10 }}>Pour les couvreurs : ardoise, zinc, bois de charpente, isolation de toiture.</p> : null}
              {peintres ? <p style={{ fontWeight: 700, marginBottom: 10 }}>Pour les peintres : peinture, sous-couche, enduit, toile de verre.</p> : null}
              <div className="mz-actions" id="mz-cta-haut">
                <BoutonInscription />
                <DemoSurBouton className="mz-lien" />
              </div>
              {/* Point 34 : aucun montant ; la phrase entière est sur /tarifs, ici seulement l'essentiel. */}
              <p className="mz-prix-detail">
                Gratuit. Ton premier achat groupé est offert. <Link href="/tarifs">Voir les tarifs</Link>
              </p>
            </div>

            {/* Maquette de Greg (28 octobre 2026) : le vrai écran de l'app dans un téléphone, à côté de l'accroche. */}
            <div className="mz-hero-tel">
              <Ecran nom={ECRANS.depot.nom} alt={ECRANS.depot.alt} prioritaire />
            </div>
          </section>

          {/* /peintres : le bloc peinture juste sous l'accroche (Greg, 26 octobre 2026), puis le coup de main (point 30). */}
          {peintres ? <BlocPeinture /> : null}

          {/* « D'un devis ou une simple photo… à une liste claire » : le vrai devis DE00000071 lu ligne par ligne. */}
          <section aria-labelledby="du-devis" className="mz-section mz-du-devis" data-apparait="">
            <h2 id="du-devis" className="mz-titre mz-h2 mz-souligne">
              D&apos;un devis ou d&apos;une simple photo…
            </h2>
            <LectureAnimee />
            <h2 className="mz-titre mz-h2" style={{ marginTop: 28 }}>
              … à une liste de matériaux claire et rangée.
            </h2>
            <p className="mz-gris" style={{ marginTop: 12, maxWidth: "44ch" }}>
              {NOM_APP} sort ton quantitatif ligne par ligne. Tu vérifies, tu ajustes si besoin.
            </p>
          </section>

          <CoupDeMain />

          {/* Achats groupés, la force du collectif (maquette de Greg, 28 octobre 2026) : la phrase clé, mot pour mot, puis deux
              cartes : le compteur 1 → 20 et les chasseurs d'opportunités. */}
          <section aria-labelledby="vingt" className="mz-section mz-vingt" data-apparait="">
            <span className="mz-trame" aria-hidden="true" />
            <div className="mz-colonne">
              <p className="mz-kicker mz-etiq">Achats groupés, la force du collectif</p>
              <h2 id="vingt" className="mz-titre mz-h2 mz-phrase">
                <span>Seul, tu es un client parmi d&apos;autres.</span> À vingt, vous êtes le plus gros client du département.
              </h2>
              <div className="mz-collectif">
                <div className="mz-carte">
                  <span className="mz-icone" aria-hidden="true">
                    <Users size={26} strokeWidth={2} />
                  </span>
                  <CompteurVingt />
                  <p className="mz-gris">Les artisans du secteur mettent leurs commandes en commun.</p>
                </div>
                <div className="mz-carte">
                  <span className="mz-icone" aria-hidden="true">
                    <Handshake size={26} strokeWidth={2} />
                  </span>
                  <p className="mz-chasse">Des chasseurs d&apos;opportunités négocient pour toi.</p>
                  <p className="mz-gris">Ils demandent un prix aux négoces pour le total du secteur.</p>
                </div>
              </div>
              <div className="mz-inscrits">
                <CompteurInscrits />
              </div>
            </div>
          </section>

          <TroisQuestions />

          <ParUnArtisan />

          {/* Un regroupement, marqué « exemple » jusqu'au premier vrai : seulement sur /couvreurs (27 octobre 2026 : l'accueil
              se lit vite ; le bloc peinture ne reste que sur /peintres). */}
          {couvreurs ? (
            <section aria-labelledby="regroupement" className="mz-section mz-deux" data-apparait="">
              <div>
                <Cote gauche="Un regroupement" />
                <h2 id="regroupement" className="mz-titre mz-h2">
                  Les mêmes ardoises, dans le même département.
                </h2>
                <p className="mz-gris" style={{ marginTop: 16, maxWidth: "40ch" }}>
                  Les volumes du secteur réunis, une seule demande aux négoces.
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
          ) : null}

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
                  <div className="mz-etape-texte">
                    <span className="mz-rond mz-num" aria-hidden="true">
                      {i + 1}
                    </span>
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
            <div className="mz-actions" id="mz-cta-bas">
              <BoutonInscription />
            </div>
          </section>

          <section aria-labelledby="negoces" className="mz-negoce" data-apparait="">
            <div>
              <p className="mz-etiq" style={{ marginBottom: 10 }}>
                Vous êtes négoce ?
              </p>
              <h2 id="negoces" className="mz-titre mz-h2">
                Gratuit pour vous.
              </h2>
              <p style={{ marginTop: 12, maxWidth: "52ch" }}>
                Des demandes prêtes à chiffrer, des volumes groupés.
              </p>
            </div>
            <Link href="/negoce/connexion" className="mz-bouton" data-blanc="">
              Accès négoce <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </section>
        </main>

        <PiedVitrine />
        <BoutonFixeInscription haut="mz-cta-haut" bas="mz-cta-bas">
          <BoutonInscription />
        </BoutonFixeInscription>
      </div>
    </div>
  );
}
