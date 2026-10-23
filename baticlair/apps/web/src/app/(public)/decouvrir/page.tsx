import type { Metadata } from "next";
import Link from "next/link";
import { CLE_DEMO_VUE, DemoGuidee } from "@/components/demo-guidee";
import { EXEMPLE } from "@/lib/exemple";
import { ButtonLink } from "@/components/ui";
import { LiensLegaux } from "@/components/legal";
import { Visuel, type EmplacementPhoto } from "@/components/landing-illustrations";
import { NOM } from "@/lib/nom";
import { CompteurInscrits, InviterCollegue } from "@/components/inviter";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BatiClair, la commande commune des couvreurs",
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
 * TON FUN ET DIRECT (Greg, 22 octobre) : « fun dans les mots, pro dans le visuel ». « Enfumer » vise le prix, jamais une
 * personne : les négoces lisent aussi la page, et ce sont eux qui répondent. Le compteur d'inscrits est le vrai chiffre de la
 * base (masqué sous 10), le partage passe par WhatsApp, SMS ou le lien copié (`InviterCollegue`). Gratuit pour l'artisan.
 */
const ETAPES = [
  {
    titre: "1. Dépose ta liste avant la clôture",
    texte: "Une photo, un bon, un PDF ou une capture. Mets seulement ce que tu es sûr de commander.",
    image: { src: "/landing/capture-entree.jpg", alt: "L'écran « Donne ta liste de matériaux » de BatiClair" },
  },
  {
    titre: "2. On envoie tout le volume aux négoces",
    texte: "Les listes du mois sont additionnées : une seule grille pour tous les négoces de la région.",
    image: { src: "/landing/capture-preciser.jpg", alt: "Une ligne « Ardoise naturelle 32×22 » à préciser : origine et choix en boutons" },
  },
  { titre: "3. Tu vois le meilleur prix et tu commandes si ça te plaît", texte: "Ton prix livré chez chaque négoce, le moins cher en avant. Sans engagement.", image: null },
] as const;

const GROUPE = [
  { titre: "Une commande par mois", texte: "Tu déposes ta liste jusqu'à la clôture, le 25. Personne ne voit ton nom ni tes chantiers." },
  { titre: "Les négoces chiffrent tout le volume", texte: "Un prix par article, le même pour tous, ferme pour le mois. Ils ont deux semaines." },
  { titre: "Le moins cher pour toi, livraison comprise", texte: "Chaque grille est appliquée à ta liste. Tu choisis, ou tu ne commandes pas." },
];

const COMMANDE = EXEMPLE.commande;
const PHRASE_COMMANDE = `${COMMANDE.tout}. ${COMMANDE.cloture}.`;

/**
 * Le cadre d'un iPhone propre autour d'une VRAIE capture de l'app (780 × 1688, prise sur iPhone après la passe UI/UX) :
 * bordure noire, rayon d'écran, l'îlot en haut. Toujours l'écran entier : jamais un cadre coupé ni vide (Greg, 23 octobre).
 */
function Telephone({ src, alt, priorite = false, className = "" }: { src: string; alt: string; priorite?: boolean; className?: string }) {
  return (
    <div className={`relative rounded-[44px] border-[10px] border-ink bg-ink ${className}`}>
      <span aria-hidden="true" className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="overflow-hidden rounded-[34px] bg-ground">
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier local, taille fixe, sans optimiseur */}
        <img src={src} alt={alt} width={780} height={1688} className="block h-auto w-full" loading={priorite ? "eager" : "lazy"} fetchPriority={priorite ? "high" : "auto"} decoding="async" />
      </div>
    </div>
  );
}

/** Un emplacement de photo de chantier : un aplat neutre tant que la photo n'est pas fournie (`PHOTOS_LANDING`). */
function Photo({ emplacement, className }: { emplacement: EmplacementPhoto; className: string }) {
  return (
    <Visuel emplacement={emplacement} className={`${className} rounded-xl`}>
      <div aria-hidden="true" data-photo={emplacement} className={`${className} rounded-xl bg-ground`} />
    </Visuel>
  );
}

/** Le compteur de la commande commune, tel que l'artisan le voit (données de la démo) : façon Qonto, un chiffre, une phrase. */
function Compteur() {
  return (
    <div role="img" aria-label={PHRASE_COMMANDE} className="flex h-full flex-col justify-center gap-4 rounded-xl border border-line bg-surface p-6">
      <p className="text-[13px] font-semibold text-muted">{`Exemple · Commande ${COMMANDE.de}`}</p>
      <p className="text-[32px] leading-none font-extrabold tracking-[-0.03em] text-accent-text">{COMMANDE.cloture}</p>
      <p className="text-[16px] leading-snug font-semibold">{COMMANDE.tout}</p>
      <p className="border-t border-line pt-4 text-[14px] text-muted">{COMMANDE.toi}</p>
    </div>
  );
}

const BOUTON = "min-h-13 px-8 text-[16px]";

/** Les sections sous la ligne de flottaison apparaissent en douceur au défilement : 200 ms, opacité et 12 px, aucun décalage. */
const REVEAL_SCRIPT = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var els=[].slice.call(document.querySelectorAll("[data-reveal]"));var h=innerHeight;els.forEach(function(e){if(e.getBoundingClientRect().top<h)e.setAttribute("data-vu","")});document.documentElement.setAttribute("data-reveal-pret","");var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.setAttribute("data-vu","");io.unobserve(x.target)}})},{rootMargin:"0px 0px -10% 0px"});els.forEach(function(e){if(!e.hasAttribute("data-vu"))io.observe(e)})}catch(e){}})();`;

export default function BienvenuePage() {
  const h2 = "text-[34px] leading-[1.04] font-extrabold tracking-[-0.035em] sm:text-[48px]";
  const intro = "max-w-[52ch] text-[18px] leading-relaxed text-muted";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-6 pb-16 sm:gap-32 sm:px-6 sm:pt-12 lg:gap-40">
      {/* Plan 2, bloc 3 : au premier lancement, la démo guidée (trois écrans, « Passer ») vient avant l'accroche. Plan
          « finition », bloc 5 (Lighthouse 66, décalage 0,88) : elle est rendue par le serveur, et ce script, lu avant
          l'affichage, la cache déjà vue (sauf `?demo`) : la page ne saute plus quand le navigateur relit la clé locale. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem(${JSON.stringify(CLE_DEMO_VUE)})!==null&&!/[?&]demo\b/.test(location.search))document.documentElement.dataset.demoVue="1"}catch(e){}`,
        }}
      />
      <DemoGuidee />

      {/* L'accroche (façon Stripe) : la promesse à gauche, en très grand ; l'app dans un iPhone à droite. */}
      <section aria-labelledby="accroche" className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <p className="text-[14px] font-semibold text-accent-text">Pour les couvreurs des Côtes-d&apos;Armor</p>
          <h1 id="accroche" className="max-w-[16ch] text-[44px] leading-[1.0] font-extrabold tracking-[-0.045em] sm:text-[64px]">
            Marre de te faire enfumer sur le prix de tes matériaux ?
          </h1>
          <div className="flex flex-col gap-4">
            <p className="max-w-[44ch] text-[18px] leading-relaxed text-muted sm:text-[20px]">Rassemblons-nous et mettons nos forces en commun pour négocier les meilleurs prix.</p>
            <p className="max-w-[44ch] text-[18px] leading-relaxed font-semibold sm:text-[20px]">Une commande par mois avec les couvreurs de ta région.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
              Je rejoins le mouvement
            </ButtonLink>
            <a href="#comment" className="inline-flex min-h-13 items-center gap-2 text-[16px] font-semibold text-ink transition-[color] duration-150 hover:text-accent-text">
              Voir comment ça marche <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="text-[15px] font-semibold text-muted">Gratuit pour l&apos;artisan. Sans engagement.</p>
        </div>
        <div className="flex justify-center lg:col-span-5 lg:justify-end">
          <Telephone src="/landing/capture-liste.jpg" alt="Une liste de couverture dans BatiClair : ardoise, crochets, liteaux, écran, faîtage zinc, chaque ligne avec sa quantité" priorite className="w-[280px] sm:w-[320px]" />
        </div>
      </section>

      {/* Le principe en une phrase, et le vrai compteur d'inscrits (rien sous 10). Chiffres façon Qonto. */}
      <section aria-labelledby="principe" data-reveal className="flex flex-col gap-8 border-y border-line py-16 sm:py-24">
        <h2 id="principe" className={`${h2} max-w-[22ch]`}>
          Plus on est nombreux, plus on pèse face aux négoces.
        </h2>
        <CompteurInscrits />
      </section>

      {/* Les trois étapes (façon Linear), chacune avec un écran ENTIER de l'app. Sur le téléphone, elles défilent de côté. */}
      <section aria-labelledby="comment-titre" className="flex scroll-mt-24 flex-col gap-12" id="comment">
        <div className="flex flex-col gap-4" data-reveal>
          <h2 id="comment-titre" className={h2}>
            Comment ça marche
          </h2>
          <p className={intro}>Trois étapes. Le reste, c&apos;est nous : on additionne les listes, on interroge les négoces, on compare.</p>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
          {ETAPES.map((e, i) => (
            <li key={e.titre} data-reveal className="flex w-[80vw] max-w-[340px] shrink-0 snap-center flex-col gap-6 sm:w-auto sm:max-w-none">
              <div className="flex min-h-[560px] items-center justify-center rounded-xl bg-ground px-8 py-8">
                {e.image ? <Telephone src={e.image.src} alt={e.image.alt} className="w-full max-w-[240px]" /> : <Compteur />}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-accent-text tabular-nums">0{i + 1}</p>
                <h3 className="text-[20px] leading-snug font-extrabold tracking-[-0.02em]">{e.titre}</h3>
                <p className="text-[16px] leading-relaxed text-muted">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
        <div data-reveal className="flex sm:justify-center">
          <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
            Je rejoins le mouvement
          </ButtonLink>
        </div>
      </section>

      {/* Ce que commande un couvreur : la liste de l'exemple, telle qu'elle part au négoce. */}
      <section aria-labelledby="fournitures" data-reveal className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <div className="flex flex-col gap-4">
            <h2 id="fournitures" className={h2}>
              Ardoise, zinc, liteaux, écran
            </h2>
            <p className={intro}>Chaque ligne part au négoce comme tu la lui dirais au comptoir.</p>
          </div>
          <ul aria-label="Exemple de liste de couverture" className="flex flex-col divide-y divide-line border-y border-line">
            {EXEMPLE.liste.map((l) => (
              <li key={l.designation} className="flex items-baseline justify-between gap-4 py-4">
                <span className="text-[16px] font-semibold">{l.designation}</span>
                <span className="shrink-0 text-[15px] text-muted tabular-nums">{l.quantite}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-5">
          <Photo emplacement="ardoise" className="aspect-[4/3] w-full lg:aspect-auto lg:h-full" />
        </div>
      </section>

      {/* La commande commune : texte et compteur, sur le fond gris 1 (le seul aplat de la page avec la section noire). */}
      <section aria-labelledby="groupe" data-reveal className="rounded-xl bg-ground p-6 sm:p-12 lg:p-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-semibold text-accent-text">{NOM}</p>
              <h2 id="groupe" className={`${h2} max-w-[18ch]`}>
                Les couvreurs de ton secteur, ensemble
              </h2>
              <p className={intro}>Plus on est nombreux sur la même ligne, plus les négoces se battent pour la livrer. Tu commandes sur ton compte, comme d&apos;habitude.</p>
            </div>
            <ol className="flex flex-col divide-y divide-line">
              {GROUPE.map((e, i) => (
                <li key={e.titre} className="flex gap-6 py-6 first:pt-0 last:pb-0">
                  <span className="pt-1 text-[14px] font-semibold text-accent-text tabular-nums" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[18px] leading-snug font-extrabold tracking-[-0.01em]">{e.titre}</h3>
                    <p className="text-[16px] leading-relaxed text-muted">{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Compteur />
            <Photo emplacement="chantier" className="aspect-[16/10] w-full" />
          </div>
        </div>
      </section>

      {/* Le partage : une vraie section, pleine et sombre (façon Revolut). Le même bloc vit dans l'app. */}
      <div data-reveal>
        <InviterCollegue grand titre="L'union fait la force : fais venir tes collègues" texte="Plus on est nombreux dans le secteur, plus les prix baissent. Envoie-leur le lien en deux secondes." />
      </div>

      <section aria-labelledby="commencer" data-reveal className="flex flex-col items-start gap-8 border-t border-line pt-16 sm:items-center sm:pt-24 sm:text-center">
        <h2 id="commencer" className="max-w-[18ch] text-[40px] leading-[1.02] font-extrabold tracking-[-0.04em] sm:text-[56px]">
          Rejoins les couvreurs du secteur
        </h2>
        <p className="max-w-[44ch] text-[18px] leading-relaxed text-muted">Un compte, une photo de ta liste, et les négoces de ton secteur se mettent au travail. Gratuit pour l&apos;artisan.</p>
        <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
          Je rejoins le mouvement
        </ButtonLink>
        {/* Tous les métiers restent ouverts (nouveau cap) : une ligne. */}
        <p className="text-[15px] text-muted">Aussi pour la charpente, la maçonnerie, l&apos;isolation…</p>
      </section>

      {/* Rassurant pour les négoces : ils lisent aussi la page, et ce sont eux qui répondent. */}
      <p className="text-center text-[15px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">Négoces :</span> des commandes communes, des volumes sûrs. Répondez aux demandes, on vous apporte les clients.
      </p>

      <footer className="flex flex-col gap-6 border-t border-line pt-10 text-[13px] leading-relaxed text-muted">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <span className="text-[16px] font-extrabold text-ink">BatiClair</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <LiensLegaux />
            <Link href="/connexion" className="text-[14px] font-semibold text-muted underline">
              Se connecter
            </Link>
            {/* Un vrai chargement : la démo relit l'adresse au démarrage (plus de lecture par le routeur, qui l'empêchait d'être
                rendue par le serveur). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement voulu */}
            <a href="/?demo" className="text-[14px] font-semibold text-muted underline">
              Revoir la démo
            </a>
          </div>
        </div>
        <p className="max-w-[90ch]">
          BatiClair est édité par BATI INVEST, SARL, SIRET 910 796 325 00017, 6 impasse du Ouipoure, 22620 Ploubazlanec, TVA intracommunautaire FR61910796325. Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
      </footer>
      <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
    </main>
  );
}
