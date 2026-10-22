import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoGuidee } from "@/components/demo-guidee";
import { ButtonLink } from "@/components/ui";
import { LiensLegaux } from "@/components/legal";
import { FOURNITURES_EXEMPLE, OutilsArtisan, SceneChantier, TourneeGroupee, Visuel } from "@/components/landing-illustrations";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BatiClair, paie tes matériaux moins cher",
  description: "Donne ta liste de matériaux. On regroupe les couvreurs de ton secteur et on fait jouer la concurrence entre les négoces.",
};

/**
 * LA PAGE D'ACCUEIL PUBLIQUE. NOUVEAU CAP (22 octobre 2026, décidé avec Greg) : une seule idée, « Paie tes matériaux moins
 * cher », pour les couvreurs d'abord (Côtes-d'Armor) ; tous les métiers restent ouverts dans l'app, une ligne le dit en bas.
 * Trois images : ta liste → précise-la → ton prix. Rémunération en suspens : la page ne parle ni d'abonnement ni de 2 %.
 * Aucune ressource extérieure, aucun script : captures de l'app et dessins servis par la page (`landing-illustrations.tsx`).
 */
const FOURNITURES_COUVREUR = FOURNITURES_EXEMPLE.filter((f) => f.metier === "Couverture" || f.metier === "Zinguerie" || f.metier === "Charpente");

const ETAPES = [
  { titre: "Ta liste", texte: "Une photo de ta liste, un bon, un PDF ou une capture. Je la remets au propre, ligne par ligne." },
  { titre: "Précise-la", texte: "Format, origine, choix, marque : un tap par ligne. Plus c'est précis, plus tu trouves d'autres couvreurs." },
  { titre: "Ton prix", texte: "Les négoces de ton secteur se font concurrence. Tu vois ton prix livré chez toi, et le moins cher est retenu." },
];

const GROUPE = [
  { titre: "Tes lignes rejoignent celles des couvreurs du secteur", texte: "Même article, même secteur : un seul groupe. Personne ne voit ton nom ni tes chantiers." },
  { titre: "Chacun ajoute son négoce", texte: "La demande commune part à tous les négoces du groupe, avec un mail type. Ils savent qu'en face, il y a du volume." },
  { titre: "Le moins cher qui livre tout l'emporte", texte: "Chaque devis est lu à son arrivée et comparé au meilleur prix. Livraison comprise, chez toi." },
];

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

/** Image 1 : la liste telle qu'on la donne, écrite à la main sur un bout de papier. */
function ImageListe() {
  const lignes = ["Ardoise 32x22 — 2760", "Crochets inox — 3 paq.", "Liteau 27x38 — 480 m", "Écran HPV — 4 rlx", "Gouttière zinc 33 — 4 l."];
  return (
    <div role="img" aria-label="Une liste de matériaux écrite à la main" className="flex h-full items-center justify-center bg-[#f6ebdd] p-5">
      <div className="w-full max-w-[250px] -rotate-2 rounded-md bg-[#fffdf6] px-5 py-4 shadow-card">
        <p className="mb-2 font-display text-[15px] font-extrabold text-ink/80">Chantier Kerity</p>
        <ul className="flex flex-col gap-2 border-l-2 border-[#f2a7a7] pl-3">
          {lignes.map((l) => (
            <li key={l} className="border-b border-[#cfe0f5] pb-1 font-[cursive] text-[15px] leading-tight text-[#24316b]">
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Image 2 : une ligne vague, sa pastille orange et sa question en boutons. */
function ImagePreciser() {
  return (
    <div role="img" aria-label="Une ligne « Ardoise naturelle » à préciser : format en boutons" className="flex h-full flex-col justify-center gap-2.5 bg-[#e7ebf3] p-5">
      <div className="rounded-2xl bg-surface p-3.5 shadow-card">
        <div className="flex items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full bg-mark-warn" />
          <span className="text-[15px] font-bold">Ardoise naturelle</span>
          <span className="ml-auto text-[14px] font-extrabold tabular-nums">2 760</span>
        </div>
        <p className="mt-1 pl-5.5 text-[13px] font-semibold text-warn">Précise pour trouver d&apos;autres couvreurs</p>
        <p className="mt-3 text-[13px] font-bold text-muted">Format ?</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {["32×22", "40×22", "40×25", "Autre"].map((o, i) => (
            <span key={o} className={`rounded-xl px-3 py-1.5 text-[13px] font-bold ${i === 0 ? "bg-ink text-white" : "bg-ground"}`}>
              {o}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl bg-surface p-3.5 shadow-card">
        <span className="size-3 shrink-0 rounded-full bg-mark-ok" />
        <span className="text-[15px] font-bold">Liteau sapin traité 27×38</span>
        <span className="ml-auto text-[14px] font-extrabold tabular-nums">480 m</span>
      </div>
    </div>
  );
}

/** Image 3 : le compteur du groupe et le prix. */
function ImagePrix() {
  return (
    <div role="img" aria-label="30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 €" className="flex h-full items-center justify-center bg-ok-bg p-5">
      <div className="w-full max-w-[270px] rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-[13px] font-bold text-muted">Ardoise naturelle 32×22 · Côtes-d&apos;Armor</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["30", "couvreurs"],
            ["15", "demandes"],
            ["3", "devis reçus"],
          ].map(([n, l]) => (
            <div key={l} className="relative rounded-xl bg-ground px-1 py-2">
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-[22px] leading-none font-extrabold">{n}</dd>
              <dd className="mt-1 text-[11px] font-bold text-muted">{l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-baseline justify-between rounded-xl bg-ok-bg px-3 py-2.5">
          <span className="text-[13px] font-bold text-ok">Meilleur prix</span>
          <span className="font-display text-[26px] leading-none font-extrabold text-ok">1,12 €</span>
        </p>
      </div>
    </div>
  );
}

const IMAGES = [ImageListe, ImagePreciser, ImagePrix];

export default function BienvenuePage() {
  const h2 = "font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[40px]";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-4 pb-16 sm:px-6 sm:gap-28 sm:pt-10">
      {/* Plan 2, bloc 3 : au premier lancement, la démo guidée (trois écrans, « Passer ») vient avant l'accroche. */}
      <Suspense>
        <DemoGuidee />
      </Suspense>
      {/* L'accroche : la promesse à gauche, le couvreur sur son toit à droite. */}
      <section aria-labelledby="accroche" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-7 animate-rise">
          <p className="text-[13px] font-extrabold tracking-[0.08em] text-accent-text uppercase">Pour les couvreurs</p>
          <h1 id="accroche" className="font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.035em] sm:text-[58px] lg:text-[64px]">
            Paie tes matériaux moins cher.
          </h1>
          <p className="max-w-[46ch] text-[18px] leading-relaxed text-muted sm:text-[20px]">Donne ta liste. On regroupe les couvreurs de ton secteur et on fait jouer la concurrence entre les négoces.</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/inscription" className="min-h-14 bg-cta px-7 text-[17px] shadow-cta">
              Créer un compte
            </ButtonLink>
            <a href="#comment" className="inline-flex min-h-14 items-center rounded-2xl px-4 text-[16px] font-extrabold text-ink underline decoration-line decoration-2 underline-offset-[6px] transition hover:decoration-ink">
              Voir comment ça marche
            </a>
          </div>
        </div>
        <div className="relative lg:col-span-5 animate-rise [animation-delay:120ms]">
          {/* Le chantier en fond, le téléphone posé devant, décalé pour laisser voir le couvreur sur son échelle. */}
          <div className="relative h-[440px] overflow-hidden rounded-[36px] shadow-card sm:h-[540px]">
            <Visuel emplacement="chantier" className="absolute inset-0 h-full w-full">
              <SceneChantier className="absolute inset-0 h-full w-full" />
            </Visuel>
            <div className="absolute right-[-36px] bottom-[-150px] origin-bottom-right scale-[0.78] sm:right-2 sm:bottom-[-110px] sm:scale-[0.9]">
              <Telephone src="/landing/hero.jpg" alt="Une liste de couverture dans BatiClair : ardoises, écran, gouttières, chaque ligne avec sa quantité" priorite />
            </div>
          </div>
        </div>
      </section>

      {/* Les trois images : ta liste → précise-la → ton prix. Sur le téléphone, elles défilent de côté. */}
      <section aria-labelledby="comment-titre" className="flex scroll-mt-20 flex-col gap-8" id="comment">
        <div className="flex flex-col gap-3">
          <h2 id="comment-titre" className={`${h2} max-w-[20ch]`}>
            Ta liste, précise-la, ton prix
          </h2>
          <p className="max-w-[55ch] text-[17px] leading-relaxed text-muted">Trois gestes. Le reste, c&apos;est nous : le regroupement, les demandes aux négoces, la comparaison.</p>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0">
          {ETAPES.map((e, i) => {
            const Illustration = IMAGES[i]!;
            return (
              <li key={e.titre} className="flex w-[80vw] max-w-[340px] shrink-0 snap-center flex-col gap-4 sm:w-auto sm:max-w-none">
                <div className="h-[280px] overflow-hidden rounded-[28px] shadow-card sm:h-[300px]">
                  <Illustration />
                </div>
                <div className="flex gap-3.5 px-1">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-extrabold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[19px] leading-snug font-extrabold">{e.titre}</h3>
                    <p className="text-[15px] leading-relaxed text-muted">{e.texte}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Ce que commande un couvreur, dessiné : la désignation et la quantité telles qu'elles partent au négoce. */}
      <section aria-labelledby="fournitures" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 id="fournitures" className={`${h2} max-w-[20ch]`}>
            Ardoise, tuile, zinc, liteaux : tout ce que tu commandes
          </h2>
          <p className="max-w-[55ch] text-[17px] leading-relaxed text-muted">Chaque ligne part au négoce comme tu la lui dirais au comptoir.</p>
        </div>
        <ul aria-label="Exemples de fournitures" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {FOURNITURES_COUVREUR.map(({ photo, nom, quantite, metier, Dessin, fond }) => (
            <li key={nom} className="flex flex-col overflow-hidden rounded-[24px] bg-surface shadow-card">
              <div className={`${fond} relative flex aspect-[16/11] items-center justify-center overflow-hidden p-3`}>
                <Visuel emplacement={photo} className="absolute inset-0 h-full w-full">
                  <Dessin />
                </Visuel>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-[12px] font-extrabold tracking-[0.06em] text-muted uppercase">{metier}</span>
                <span className="text-[15px] leading-snug font-extrabold">{nom}</span>
                <span className="mt-auto pt-1 text-[15px] font-bold text-accent-text tabular-nums">{quantite}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Le regroupement : une seule carte sombre, le seul bloc inversé de la page. */}
      <section aria-labelledby="groupe" className="relative overflow-hidden rounded-[36px] bg-hero p-6 text-white sm:p-10 lg:p-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-extrabold tracking-[0.08em] text-accent-on-dark uppercase">Le regroupement</p>
              <h2 id="groupe" className={`${h2} max-w-[18ch]`}>
                Les couvreurs de ton secteur, ensemble
              </h2>
              <p className="max-w-[52ch] text-[17px] leading-relaxed text-white/75">Plus on est nombreux sur la même ligne, plus les négoces se battent pour la livrer. Tu commandes sur ton compte, comme d&apos;habitude.</p>
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
          <div className="flex flex-col justify-center gap-6 lg:col-span-5">
            <div className="overflow-hidden rounded-[28px] text-ink">
              <ImagePrix />
            </div>
            <Visuel emplacement="tournee" className="aspect-[3/1] w-full rounded-2xl">
              <TourneeGroupee className="w-full" />
            </Visuel>
          </div>
        </div>
      </section>

      <section aria-labelledby="commencer" className="flex flex-col items-start gap-6 rounded-[36px] bg-ink px-7 py-10 text-white sm:items-center sm:px-10 sm:py-16 sm:text-center">
        <Visuel emplacement="outils" className="aspect-[16/10] w-[200px] rounded-2xl sm:w-[240px]">
          <OutilsArtisan className="w-[200px] sm:w-[240px]" />
        </Visuel>
        <h2 id="commencer" className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-[52px]">
          Ta première liste, maintenant
        </h2>
        <p className="max-w-[40ch] text-[17px] leading-relaxed text-white/75">Un compte, une photo de ta liste, et les négoces de ton secteur se mettent au travail.</p>
        <ButtonLink href="/inscription" className="min-h-14 bg-cta px-7 text-[17px] shadow-cta">
          Créer un compte
        </ButtonLink>
      </section>

      {/* Tous les métiers restent ouverts (nouveau cap) : une ligne, en bas. */}
      <p className="-mt-10 text-center text-[16px] font-bold text-muted sm:-mt-16">Aussi pour la charpente, la maçonnerie, l&apos;isolation…</p>

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
