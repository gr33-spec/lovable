import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoGuidee } from "@/components/demo-guidee";
import { ButtonLink } from "@/components/ui";
import { LiensLegaux } from "@/components/legal";
import { TRADES } from "@/lib/trades";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BatiClair, tes devis deviennent tes bons de commande",
  description: "Dépose le devis de ton client, BatiClair sort la liste des fournitures et l'envoie à tes négoces. Tes commandes se regroupent avec les autres artisans du département.",
};

/**
 * LA PAGE D'ACCUEIL PUBLIQUE (plan du 20 octobre 2026, bloc 5 ; refonte « premium » du 21 octobre à la demande du
 * fondateur). Une page, le téléphone d'abord, ton direct, zéro jargon. Les visuels sont de vraies captures de l'app
 * (mode démo, données fictives marquées), servies depuis `public/landing` : aucune ressource extérieure, aucun script.
 * Sections : accroche, trois étapes du quantitatif, les réponses comparées, le groupé, « gratuit pour l'artisan, le
 * négoce paie 2 % », les métiers couverts, « Créer un compte », pied de page avec les mentions légales.
 */
const QUANTITATIF = [
  { titre: "Tu déposes le devis de ton client", texte: "Une photo ou un PDF, depuis ton téléphone. Rien à saisir.", image: "/landing/depot.jpg", alt: "L'écran « Déposer mon devis » de BatiClair" },
  { titre: "BatiClair sort la liste des fournitures", texte: "Les quantités à commander, ligne par ligne, avec les mots du comptoir. Deux ou trois questions au plus.", image: "/landing/questions.jpg", alt: "Les questions de comptoir avant le calcul de la liste" },
  { titre: "Tu l'envoies à tes négoces", texte: "Un e-mail avec le PDF, en un geste. Les réponses reviennent dans l'app, comparées.", image: "/landing/envoi.jpg", alt: "Le choix des négoces à qui envoyer la demande" },
];

const GROUPE = [
  { titre: "Tu proposes une ligne au groupé", texte: "Une référence, une fenêtre de livraison, « chantier signé ». Ton nom ne part pas avec." },
  { titre: "On regroupe par département", texte: "Même référence, même département : un seul lot, une seule demande de prix aux négoces." },
  { titre: "Tu commandes au prix du lot", texte: "Sur ton compte, chez le négoce retenu, livré sur ton chantier. Tu dis « Livré » quand c'est arrivé." },
];

const METIERS = TRADES.filter((t) => t.id !== "other");

/** Une vraie capture de l'app dans un téléphone. `priorite` pour celle du haut de page (LCP), sinon chargée à la demande. */
function Telephone({ src, alt, priorite = false, className = "" }: { src: string; alt: string; priorite?: boolean; className?: string }) {
  return (
    <div className={`w-[272px] shrink-0 rounded-[44px] bg-ink p-[9px] shadow-float ${className}`}>
      <div className="overflow-hidden rounded-[36px] bg-ground">
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier local, taille fixe, sans optimiseur */}
        <img src={src} alt={alt} width={780} height={1688} className="block h-auto w-full" loading={priorite ? "eager" : "lazy"} fetchPriority={priorite ? "high" : "auto"} decoding="async" />
      </div>
    </div>
  );
}

export default function BienvenuePage() {
  const h2 = "font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[40px]";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-4 pb-16 sm:px-6 sm:gap-28 sm:pt-10">
      {/* Plan 2, bloc 3 : au premier lancement, la démo guidée (trois écrans, « Passer ») vient avant l'accroche. */}
      <Suspense>
        <DemoGuidee />
      </Suspense>
      {/* L'accroche : le texte à gauche, le vrai écran de la liste à droite, coupé en bas comme un téléphone posé. */}
      <section aria-labelledby="accroche" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-7 animate-rise">
          <p className="text-[13px] font-extrabold tracking-[0.08em] text-accent-text uppercase">Pour les artisans du bâtiment</p>
          <h1 id="accroche" className="font-display text-[40px] leading-[0.98] font-extrabold tracking-[-0.035em] sm:text-[54px] lg:text-[60px]">
            Tes devis deviennent tes bons de commande.
          </h1>
          <p className="max-w-[52ch] text-[17px] leading-relaxed text-muted sm:text-[19px]">Dépose le devis de ton client. BatiClair sort la liste des fournitures, l&apos;envoie à tes négoces et regroupe tes achats avec les autres artisans du département.</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/inscription" className="min-h-14 bg-cta px-7 text-[17px] shadow-cta">
              Créer un compte
            </ButtonLink>
            <a href="#quantitatif" className="inline-flex min-h-14 items-center rounded-2xl px-4 text-[16px] font-extrabold text-ink underline decoration-line decoration-2 underline-offset-[6px] transition hover:decoration-ink">
              Voir comment ça marche
            </a>
          </div>
        </div>
        <div className="relative lg:col-span-5 animate-rise [animation-delay:120ms]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(107,70,255,0.42)_0%,rgba(43,85,255,0.18)_45%,transparent_72%)]" aria-hidden="true" />
          <div className="relative mx-auto h-[400px] overflow-hidden pt-4 sm:h-[520px]">
            <Telephone src="/landing/hero.jpg" alt="La liste des fournitures d'un chantier de couverture : ardoises, écran, gouttières, chaque ligne avec sa quantité" priorite className="mx-auto" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ground to-transparent" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Trois faits, sans carte : des chiffres vrais. */}
      <section aria-label="En bref" className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { chiffre: "24", texte: "métiers couverts, chacun avec son référentiel relu par des artisans" },
          { chiffre: "2 ou 3", texte: "questions au plus avant que ta liste sorte" },
          { chiffre: "0 €", texte: "pour l'artisan : pas d'abonnement au groupé, pas de commission" },
        ].map((f) => (
          <div key={f.chiffre} className="flex flex-col gap-1 py-5 sm:px-8 sm:py-2 first:sm:pl-0 last:sm:pr-0">
            <span className="font-display text-[34px] leading-none font-extrabold tracking-[-0.03em]">{f.chiffre}</span>
            <span className="text-[15px] leading-snug text-muted">{f.texte}</span>
          </div>
        ))}
      </section>

      {/* Les trois étapes, chacune avec son écran ; sur le téléphone, on les fait défiler de côté. */}
      <section aria-labelledby="quantitatif" className="flex scroll-mt-20 flex-col gap-8" id="quantitatif">
        <div className="flex flex-col gap-3">
          <h2 id="quantitatif-titre" className={`${h2} max-w-[18ch]`}>
            Du devis à la liste de fournitures, en trois étapes
          </h2>
          <p className="max-w-[55ch] text-[17px] leading-relaxed text-muted">Zéro saisie. Tu déposes, tu réponds à deux questions, tu envoies.</p>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0">
          {QUANTITATIF.map((e, i) => (
            <li key={e.titre} className="flex w-[80vw] max-w-[340px] shrink-0 snap-center flex-col gap-4 sm:w-auto sm:max-w-none">
              <div className="relative h-[300px] overflow-hidden rounded-[28px] bg-surface pt-6 shadow-card sm:h-[340px]">
                <Telephone src={e.image} alt={e.alt} className="mx-auto scale-[0.92] origin-top" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" aria-hidden="true" />
              </div>
              <div className="flex gap-3.5 px-1">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-extrabold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-[18px] leading-snug font-extrabold">{e.titre}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{e.texte}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Les réponses comparées : l'écran à gauche, trois phrases à droite. */}
      <section aria-labelledby="comparer" className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="relative order-2 lg:order-1 lg:col-span-5">
          <div className="relative mx-auto h-[380px] overflow-hidden rounded-[32px] bg-ok-bg pt-6 sm:h-[440px]">
            <Telephone src="/landing/comparer.jpg" alt="Trois devis de négoces comparés, le moins cher des offres complètes en tête, un article manquant signalé" className="mx-auto" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ok-bg to-transparent" aria-hidden="true" />
          </div>
        </div>
        <div className="order-1 flex flex-col gap-5 lg:order-2 lg:col-span-7">
          <h2 id="comparer" className={`${h2} max-w-[16ch]`}>
            Les réponses reviennent dans l&apos;app, comparées
          </h2>
          <ul className="flex flex-col gap-3 text-[17px] leading-relaxed">
            <li className="flex gap-3">
              <span className="mt-[11px] size-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />
              Le moins cher des offres complètes, en tête.
            </li>
            <li className="flex gap-3">
              <span className="mt-[11px] size-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />
              Un article manquant chez un négoce ? Signalé, et le total estimé avec.
            </li>
            <li className="flex gap-3">
              <span className="mt-[11px] size-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />
              Tu retiens une offre d&apos;un geste. Rien à ressaisir.
            </li>
          </ul>
        </div>
      </section>

      {/* Le groupé : une seule carte sombre, le seul bloc inversé de la page. */}
      <section aria-labelledby="groupe" className="relative overflow-hidden rounded-[36px] bg-hero p-6 text-white sm:p-10 lg:p-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-extrabold tracking-[0.08em] text-accent-on-dark uppercase">BatiClair Groupé</p>
              <h2 id="groupe" className={`${h2} max-w-[18ch]`}>
                Le groupé : un seul négoce, un seul prix
              </h2>
              <p className="max-w-[52ch] text-[17px] leading-relaxed text-white/75">Tes commandes regroupées avec celles des autres artisans du département. Personne ne voit ton nom ni tes chantiers.</p>
            </div>
            <ol className="flex flex-col divide-y divide-white/12">
              {GROUPE.map((e, i) => (
                <li key={e.titre} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                  <span className="font-display text-[28px] leading-none font-extrabold text-accent-on-dark tabular-nums" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[18px] leading-snug font-extrabold">{e.titre}</h3>
                    <p className="text-[15px] leading-relaxed text-white/75">{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto h-[360px] overflow-hidden sm:h-[460px] lg:h-full lg:min-h-[520px]">
              <Telephone src="/landing/groupe.jpg" alt="L'écran Groupé de l'app : tes commandes d'ardoise regroupées avec les autres couvreurs du département" className="mx-auto lg:absolute lg:top-0 lg:right-0" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a1550] to-transparent" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Le prix, en deux blocs inégaux. */}
      <section aria-labelledby="prix" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 rounded-[32px] bg-surface p-7 shadow-card lg:col-span-7 lg:p-10">
          <h2 id="prix" className={h2}>
            Gratuit pour l&apos;artisan
          </h2>
          <p className="max-w-[48ch] text-[17px] leading-relaxed text-muted">Pas d&apos;abonnement pour le groupé, pas de commission sur tes achats. Tu commandes sur ton compte, au prix du lot.</p>
        </div>
        <div className="flex flex-col justify-between gap-6 rounded-[32px] bg-ok-bg p-7 lg:col-span-5 lg:p-10">
          <p className="font-display text-[56px] leading-none font-extrabold tracking-[-0.04em] text-ok sm:text-[72px]">2 %</p>
          <div className="flex flex-col gap-2">
            <p className="text-[20px] leading-tight font-extrabold text-ok">Le négoce paie 2 %</p>
            <p className="text-[15px] leading-relaxed text-ok">Quand son offre est retenue, il reverse 2 % du montant HT du lot à BatiClair. Il l&apos;accepte avant de répondre, et l&apos;intègre à son prix.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="metiers" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 id="metiers" className={h2}>
            Les métiers couverts
          </h2>
          <p className="max-w-[55ch] text-[17px] leading-relaxed text-muted">Un référentiel par métier, relu par des artisans : les quantités sortent avec les mots de ton comptoir.</p>
        </div>
        <ul aria-label="Métiers couverts" className="flex flex-wrap gap-2">
          {METIERS.map((t) => (
            <li key={t.id} className="rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-bold">
              {t.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="commencer" className="flex flex-col items-start gap-6 rounded-[36px] bg-ink px-7 py-10 text-white sm:items-center sm:px-10 sm:py-16 sm:text-center">
        <h2 id="commencer" className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-[52px]">
          Ton premier devis, maintenant
        </h2>
        <p className="max-w-[40ch] text-[17px] leading-relaxed text-white/75">Un compte, un devis déposé, ta liste en deux minutes.</p>
        <ButtonLink href="/inscription" className="min-h-14 bg-cta px-7 text-[17px] shadow-cta">
          Créer un compte
        </ButtonLink>
      </section>

      <footer className="flex flex-col gap-5 border-t border-line pt-8 text-[13px] leading-relaxed text-muted">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <span className="text-[15px] font-extrabold text-ink">BatiClair</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <LiensLegaux />
            <Link href="/connexion" className="text-sm font-semibold text-muted underline">
              Se connecter
            </Link>
            <Link href="/?demo" className="text-sm font-semibold text-muted underline">
              Revoir la démo.
            </Link>
          </div>
        </div>
        <p className="max-w-[90ch]">
          BatiClair est édité par BATI INVEST, SARL, SIRET 910 796 325 00017, 6 impasse du Ouipoure, 22620 Ploubazlanec, TVA intracommunautaire FR61910796325. Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
      </footer>
    </main>
  );
}
