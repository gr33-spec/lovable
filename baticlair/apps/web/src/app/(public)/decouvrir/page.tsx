import type { Metadata } from "next";
import Link from "next/link";
import { DemoSurBouton } from "@/components/demo-guidee";
import { ButtonLink } from "@/components/ui";
import { ArgumentTarif } from "@/components/argument-tarif";
import { LiensLegaux } from "@/components/legal";
import { CompteurInscrits, InviterCollegue } from "@/components/inviter";
import { Logo } from "@/components/logo";
import { ACCROCHE_APP, EDITEUR_APP, NOM_APP, SLOGAN_APP } from "@/lib/nom";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NOM_APP}, la commande commune des artisans du bâtiment`,
  description: "Marre de te faire enfumer sur le prix de tes matériaux ? Rassemblons-nous et mettons nos forces en commun pour négocier les meilleurs prix.",
};

/**
 * LA PAGE D'ACCUEIL PUBLIQUE. NOUVEAU CAP (22 octobre 2026, section 0 de `docs/groupe/parcours-complet.md`) : une seule
 * idée, « Paie tes matériaux moins cher », pour les couvreurs d'abord ; les autres métiers en une ligne, en bas. Rien sur la
 * rémunération (en suspens).
 *
 * REGISTRE PRO ET SOBRE (Greg, 22 octobre : « elle fait enfantin ») : fond blanc, texte noir, une seule couleur d'accent,
 * bouton uni, beaucoup d'espace. Aucun dessin : de vraies captures de l'app dans un cadre de téléphone, et des emplacements
 * neutres pour les photos de chantier de Greg (`PHOTOS_LANDING`, une ligne par photo). Une seule liste fictive sur toute
 * la page, celle de la démo (`EXEMPLE`) : mêmes articles, mêmes chiffres. Aucune ressource extérieure, aucun script.
 *
 * MOINS DE TEXTE (Greg, 23 octobre au soir : « trop de texte, laisse le nécessaire ») : l'accroche et une phrase, le
 * principe et le compteur, trois étapes en une ligne chacune, le partage, un titre et un bouton, une ligne pour les
 * négoces. L'exemple de liste et la section « ensemble » sont retirés (redondants avec les étapes).
 * HAUTE VISIBILITÉ (Greg, 23 octobre au soir : « ça ne donne pas envie, je veux un truc qui déchire ») : la page est
 * sombre d'un bloc (noir profond), un seul jaune signal pour le mot clé du titre, les boutons, l'aplat du téléphone et le
 * bloc du compteur ; titres en Bricolage Grotesque, très grands. Toujours aucun dessin : de vraies captures.
 * TON FUN ET DIRECT (Greg, 22 octobre) : « fun dans les mots, pro dans le visuel ». « Enfumer » vise le prix, jamais une
 * personne : les négoces lisent aussi la page, et ce sont eux qui répondent. Le compteur d'inscrits est le vrai chiffre de la
 * base (masqué sous 10), le partage passe par WhatsApp, SMS ou le lien copié (`InviterCollegue`). Gratuit pour l'artisan.
 */
const ETAPES = [
  {
    titre: "1. Dépose ta liste avant la clôture",
    texte: "Une photo, un bon ou un PDF.",
    image: { src: "/landing/capture-entree.jpg", alt: `L'écran « Nouvelle liste » de ${NOM_APP}` },
  },
  {
    titre: "2. On envoie tout le volume aux négoces",
    texte: "Une seule grille pour tous les négoces de ta région.",
    image: { src: "/landing/capture-commande.jpg", alt: `L'écran « Commande commune » de ${NOM_APP} : la clôture dans quelques jours, ta liste dans la commande` },
  },
  { titre: "3. Tu vois le meilleur prix et tu commandes si ça te plaît", texte: "Ton prix livré chez chaque négoce. Sans engagement.", image: { src: "/landing/capture-prix.jpg", alt: `L'écran des prix reçus dans ${NOM_APP} : ton prix livré chez chaque négoce, le moins cher coché` } },
] as const;



/**
 * Le cadre d'un iPhone propre autour d'une VRAIE capture de l'app (780 × 1688, prise sur iPhone après la passe UI/UX) :
 * bordure noire, rayon d'écran, l'îlot en haut. Toujours l'écran entier : jamais un cadre coupé ni vide (Greg, 23 octobre).
 */
function Telephone({ src, alt, priorite = false, className = "" }: { src: string; alt: string; priorite?: boolean; className?: string }) {
  return (
    <div className={`relative rounded-[44px] border-[10px] border-ink bg-ink ${className}`}>
      <span aria-hidden="true" className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="overflow-hidden rounded-[34px] bg-night-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier local, taille fixe, sans optimiseur */}
        <img src={src} alt={alt} width={780} height={1688} className="block h-auto w-full" loading={priorite ? "eager" : "lazy"} fetchPriority={priorite ? "high" : "auto"} decoding="async" />
      </div>
    </div>
  );
}



const BOUTON = "min-h-13 px-8 text-[16px]";

/** Les sections sous la ligne de flottaison apparaissent en douceur au défilement : 200 ms, opacité et 12 px, aucun décalage. */
const REVEAL_SCRIPT = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var els=[].slice.call(document.querySelectorAll("[data-reveal]"));var h=innerHeight;els.forEach(function(e){if(e.getBoundingClientRect().top<h)e.setAttribute("data-vu","")});document.documentElement.setAttribute("data-reveal-pret","");var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.setAttribute("data-vu","");io.unobserve(x.target)}})},{rootMargin:"0px 0px -10% 0px"});els.forEach(function(e){if(!e.hasAttribute("data-vu"))io.observe(e)})}catch(e){}})();`;

/**
 * Une visite comptée par le serveur du site (tableau de bord, 24 octobre 2026) : ni cookie, ni adresse, ni rien sur la
 * personne ; un nombre par jour. Sans réponse de l'API, la page s'affiche quand même.
 */
function compterLaVisite() {
  const api = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  void fetch(`${api}/v1/public/visite`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => undefined);
}

export default function BienvenuePage() {
  compterLaVisite();
  const h2 = "font-display text-[36px] leading-[1.0] font-extrabold tracking-[-0.03em] sm:text-[56px]";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-6 pb-16 sm:gap-28 sm:px-6 sm:pt-12 lg:gap-32">
      {/* Greg, 24 octobre 2026 : le visiteur arrive sur l'accroche ; la démo ne s'ouvre jamais d'elle-même, seulement par
          « Voir comment ça marche (30 s) », juste sous l'accroche (`DemoSurBouton`). */}

      {/* L'accroche : la promesse en très grand, le mot « enfumer » en jaune signal ; l'app dans un iPhone posé sur un
          grand aplat jaune, comme une affiche de chantier. */}
      <section aria-labelledby="accroche" className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-5 min-[400px]:gap-8 lg:col-span-7">
          <p className="inline-flex w-fit items-center rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.02em] text-white/85 uppercase">
            {ACCROCHE_APP}
          </p>
          <h1 id="accroche" className="max-w-[14ch] text-[40px] leading-[0.94] font-extrabold tracking-[-0.03em] min-[400px]:text-[52px] sm:text-[84px]">
            Marre de te faire <span className="text-accent">enfumer</span> sur le prix de tes matériaux&nbsp;?
          </h1>
          <p className="max-w-[38ch] text-[16px] leading-relaxed text-white/70 min-[400px]:text-[18px] sm:text-[21px]">Une commande toutes les deux semaines avec les artisans de ton métier, dans ta région.</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
              Je rejoins le mouvement
            </ButtonLink>
            <DemoSurBouton className="pressable inline-flex min-h-13 items-center gap-2 rounded-full border border-white/25 px-5 text-[15px] font-semibold whitespace-nowrap text-white min-[400px]:px-6 min-[400px]:text-[16px] transition-[color,border-color] duration-150 hover:border-accent hover:text-accent" />
          </div>
          {/* L'argument phare (24 octobre 2026) : une possibilité, la vraie moyenne dès 3 cycles publiés ; puis l'offre. */}
          <ArgumentTarif className="max-w-[40ch] text-[17px] font-bold text-accent" />
          <p className="text-[15px] font-semibold text-white/60">
            Essai gratuit sur un cycle complet, puis dès 29 € HT par mois à l&apos;année, ou 49 € HT au mois sans engagement.{" "}
            <Link href="/tarifs" className="underline">
              Voir les tarifs
            </Link>
          </p>
        </div>
        <div className="flex justify-center lg:col-span-5 lg:justify-end">
          <div className="flex w-full max-w-[420px] justify-center overflow-hidden rounded-2xl bg-accent px-8 pt-10 sm:px-12 sm:pt-14">
            <Telephone src="/landing/capture-accueil.jpg" alt={`L'accueil de ${NOM_APP} : la commande commune en cours et le temps qui reste avant la clôture`} priorite className="w-[260px] translate-y-3 sm:w-[300px]" />
          </div>
        </div>
      </section>

      {/* Le principe en une phrase, et le vrai compteur d'inscrits (rien sous 10), sur un bloc jaune : le chiffre en noir. */}
      <section aria-labelledby="principe" data-reveal className="flex flex-col gap-8 rounded-2xl bg-accent p-6 text-ink sm:p-12 lg:p-16">
        <p className="text-[15px] font-bold tracking-[0.02em] uppercase">{SLOGAN_APP}</p>
        <h2 id="principe" className={`${h2} max-w-[20ch]`}>
          Plus on est nombreux, plus on pèse face aux négoces.
        </h2>
        <CompteurInscrits surAccent />
      </section>

      {/* Les trois étapes, chacune avec un écran ENTIER de l'app sur une carte de nuit, le numéro en jaune et en grand.
          Sur le téléphone, elles défilent de côté. */}
      <section aria-labelledby="comment-titre" className="flex scroll-mt-24 flex-col gap-12" id="comment">
        <div className="flex flex-col gap-4" data-reveal>
          <h2 id="comment-titre" className={h2}>
            Comment ça marche
          </h2>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
          {ETAPES.map((e, i) => (
            <li key={e.titre} data-reveal className="flex w-[80vw] max-w-[340px] shrink-0 snap-center flex-col gap-6 rounded-2xl bg-night-2 p-5 ring-1 ring-white/10 sm:w-auto sm:max-w-none sm:p-6">
              <p className="font-display text-[64px] leading-none font-extrabold tracking-[-0.04em] text-accent tabular-nums" aria-hidden="true">
                0{i + 1}
              </p>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-[22px] leading-snug font-extrabold tracking-[-0.02em]">{e.titre}</h3>
                <p className="text-[16px] leading-relaxed text-white/65">{e.texte}</p>
              </div>
              <div className="flex items-end justify-center overflow-hidden rounded-xl bg-white/5 px-8 pt-8">
                <Telephone src={e.image.src} alt={e.image.alt} className="w-full max-w-[220px] translate-y-10" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Le partage : une vraie section, pleine. Le même bloc vit dans l'app. */}
      <div data-reveal>
        <InviterCollegue grand titre="Fais venir tes collègues" texte="Plus on est nombreux, plus les prix baissent." />
      </div>

      <section aria-labelledby="commencer" data-reveal className="flex flex-col items-start gap-8 border-t border-white/10 pt-16 sm:items-center sm:pt-24 sm:text-center">
        <h2 id="commencer" className="font-display max-w-[16ch] text-[44px] leading-[0.96] font-extrabold tracking-[-0.03em] sm:text-[72px]">
          Rejoins les artisans <span className="text-accent">du secteur</span>
        </h2>
        <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
          Je rejoins le mouvement
        </ButtonLink>
      </section>

      {/* Rassurant pour les négoces : ils lisent aussi la page, et ce sont eux qui répondent. */}
      <p className="text-center text-[15px] leading-relaxed text-white/60">
        <span className="font-semibold text-white">Négoces :</span> des volumes sûrs, des clients en plus. Répondez aux grilles.
      </p>

      <footer className="flex flex-col gap-6 border-t border-white/10 pt-10 text-[13px] leading-relaxed text-white/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo fond="sombre" hauteur={28} />
            <p className="text-[14px] font-semibold text-white/70">{SLOGAN_APP}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <LiensLegaux clair />
            <Link href="/tarifs" className="text-[14px] font-semibold text-white/70 underline">
              Tarifs
            </Link>
            <Link href="/connexion" className="text-[14px] font-semibold text-white/70 underline">
              Se connecter
            </Link>
            {/* Un vrai chargement : la démo relit l'adresse au démarrage (plus de lecture par le routeur, qui l'empêchait d'être
                rendue par le serveur). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement voulu */}
            <a href="/?demo" className="text-[14px] font-semibold text-white/70 underline">
              Revoir la démo
            </a>
          </div>
        </div>
        <p className="max-w-[90ch]">
          Service édité par {EDITEUR_APP}, SARL, SIRET 910 796 325 00017, 6 impasse du Ouipoure, 22620 Ploubazlanec, TVA intracommunautaire FR61910796325. Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
      </footer>
      <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
    </main>
  );
}
