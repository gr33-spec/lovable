import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoGuidee } from "@/components/demo-guidee";
import { EXEMPLE } from "@/lib/exemple";
import { ButtonLink } from "@/components/ui";
import { LiensLegaux } from "@/components/legal";
import { Visuel, type EmplacementPhoto } from "@/components/landing-illustrations";
import { NOM } from "@/lib/nom";

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
 * LA PAGE D'ACCUEIL PUBLIQUE. NOUVEAU CAP (22 octobre 2026, section 0 de `docs/groupe/parcours-complet.md`) : une seule
 * idée, « Paie tes matériaux moins cher », pour les couvreurs d'abord ; les autres métiers en une ligne, en bas. Rien sur la
 * rémunération (en suspens).
 *
 * REGISTRE PRO ET SOBRE (Greg, 22 octobre : « elle fait enfantin ») : fond blanc, texte noir, une seule couleur d'accent,
 * bouton uni, beaucoup d'espace. Aucun dessin : de vraies captures de l'app dans un cadre de téléphone, et des emplacements
 * neutres pour les photos de chantier de Greg (`PHOTOS_LANDING`, une ligne par photo). Une seule liste fictive sur toute
 * la page, celle de la démo (`EXEMPLE`) : mêmes articles, mêmes chiffres. Aucune ressource extérieure, aucun script.
 */
const ETAPES = [
  {
    titre: "Ta liste",
    texte: "Une photo de ta liste, un bon, un PDF ou une capture. Elle revient au propre, ligne par ligne.",
    image: { src: "/landing/capture-entree.jpg", alt: "L'écran « Donne ta liste de matériaux » de BatiClair", position: "top" },
  },
  {
    titre: "Précise-la",
    texte: "Format, origine, choix : un tap par ligne. Une ligne précise rejoint la commande commune.",
    image: { src: "/landing/capture-preciser.jpg", alt: "Une ligne « Ardoise naturelle 32×22 » à préciser : origine et choix en boutons", position: "bottom" },
  },
  { titre: "Ton prix", texte: "Les négoces de ton secteur se font concurrence. Tu vois ton prix livré, le moins cher est retenu.", image: null },
] as const;

const GROUPE = [
  { titre: "Tes lignes rejoignent celles des couvreurs du secteur", texte: "Même article, même secteur : un seul groupe. Personne ne voit ton nom ni tes chantiers." },
  { titre: "Chacun ajoute son négoce", texte: "La demande commune part à tous les négoces du groupe. Ils savent qu'en face, il y a du volume." },
  { titre: "Le moins cher qui livre tout l'emporte", texte: "Chaque devis est lu à son arrivée et comparé au meilleur prix, livraison comprise." },
];

const COMPTEUR = EXEMPLE.compteur;
const PHRASE_COMPTEUR = `${COMPTEUR.couvreurs} couvreurs, ${COMPTEUR.demandes} demandes envoyées, ${COMPTEUR.devis} devis reçus, meilleur prix ${COMPTEUR.meilleurPrix}`;

/** Le cadre d'un téléphone autour d'une vraie capture de l'app. `hauteur` recadre la capture (haut ou bas de l'écran). */
function Telephone({ src, alt, priorite = false, hauteur, position = "top", className = "" }: { src: string; alt: string; priorite?: boolean; hauteur?: string; position?: "top" | "bottom"; className?: string }) {
  return (
    <div className={`rounded-[40px] bg-ink p-2 ${className}`}>
      <div className="overflow-hidden rounded-[32px] bg-ground">
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier local, taille fixe, sans optimiseur */}
        <img
          src={src}
          alt={alt}
          width={780}
          height={1688}
          className={`block w-full ${hauteur ? `${hauteur} object-cover ${position === "bottom" ? "object-bottom" : "object-top"}` : "h-auto"}`}
          loading={priorite ? "eager" : "lazy"}
          fetchPriority={priorite ? "high" : "auto"}
          decoding="async"
        />
      </div>
    </div>
  );
}

/** Un emplacement de photo de chantier : un aplat neutre tant que la photo n'est pas fournie (`PHOTOS_LANDING`). */
function Photo({ emplacement, className }: { emplacement: EmplacementPhoto; className: string }) {
  return (
    <Visuel emplacement={emplacement} className={`${className} rounded-2xl`}>
      <div aria-hidden="true" data-photo={emplacement} className={`${className} rounded-2xl bg-[#eef0f3]`} />
    </Visuel>
  );
}

/** Le compteur de la commande commune, tel que l'artisan le voit (données de la démo). */
function Compteur() {
  return (
    <div role="img" aria-label={PHRASE_COMPTEUR} className="flex h-full flex-col justify-center gap-4 rounded-2xl border border-[#e3e6ea] bg-surface p-5">
      <p className="text-[13px] font-semibold text-muted">
        {EXEMPLE.lot.reference} · {EXEMPLE.lot.departement}
      </p>
      <dl className="grid grid-cols-3 gap-2">
        {[
          [String(COMPTEUR.couvreurs), "couvreurs"],
          [String(COMPTEUR.demandes), "demandes"],
          [String(COMPTEUR.devis), "devis"],
        ].map(([n, l]) => (
          <div key={l} className="relative flex flex-col gap-1 rounded-xl bg-ground px-3 py-3">
            <dt className="sr-only">{l}</dt>
            <dd className="font-display text-[24px] leading-none font-bold tabular-nums">{n}</dd>
            <dd className="text-[12px] font-semibold whitespace-nowrap text-muted">{l}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-baseline justify-between border-t border-[#e3e6ea] pt-4">
        <span className="text-[14px] font-semibold text-muted">Meilleur prix, l&apos;unité HT</span>
        <span className="font-display text-[28px] leading-none font-bold text-accent-text tabular-nums">{COMPTEUR.meilleurPrix}</span>
      </p>
    </div>
  );
}

const BOUTON = "min-h-13 rounded-xl px-6 text-[16px] font-bold hover:bg-accent-text";

export default function BienvenuePage() {
  const h2 = "font-display text-[30px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[40px]";
  const intro = "max-w-[56ch] text-[17px] leading-relaxed text-muted";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-6 pb-16 sm:gap-32 sm:px-6 sm:pt-12">
      {/* Plan 2, bloc 3 : au premier lancement, la démo guidée (trois écrans, « Passer ») vient avant l'accroche. */}
      <Suspense>
        <DemoGuidee />
      </Suspense>

      {/* L'accroche : la promesse à gauche, la vraie liste dans un téléphone à droite. */}
      <section aria-labelledby="accroche" className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <p className="text-[14px] font-semibold text-accent-text">Pour les couvreurs des Côtes-d&apos;Armor</p>
          <h1 id="accroche" className="font-display text-[44px] leading-[1.02] font-bold tracking-[-0.035em] sm:text-[60px]">
            Paie tes matériaux moins cher.
          </h1>
          <p className="max-w-[46ch] text-[18px] leading-relaxed text-muted sm:text-[20px]">Donne ta liste. On regroupe les couvreurs de ton secteur et on fait jouer la concurrence entre les négoces.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
              Créer un compte
            </ButtonLink>
            <a href="#comment" className="inline-flex min-h-13 items-center text-[16px] font-semibold text-ink underline decoration-[#c4c9d1] decoration-1 underline-offset-[6px] transition hover:decoration-ink">
              Voir comment ça marche
            </a>
          </div>
        </div>
        <div className="flex justify-center lg:col-span-5 lg:justify-end">
          <Telephone src="/landing/capture-liste.jpg" alt="Une liste de couverture dans BatiClair : ardoise, crochets, liteaux, écran, faîtage zinc, chaque ligne avec sa quantité" priorite className="w-[280px] sm:w-[300px]" />
        </div>
      </section>

      {/* Les trois gestes, chacun avec son écran. Sur le téléphone, ils défilent de côté. */}
      <section aria-labelledby="comment-titre" className="flex scroll-mt-20 flex-col gap-10" id="comment">
        <div className="flex flex-col gap-3">
          <h2 id="comment-titre" className={h2}>
            Ta liste, précise-la, ton prix
          </h2>
          <p className={intro}>Trois gestes. Le reste, c&apos;est nous : le regroupement, les demandes aux négoces, la comparaison.</p>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="flex w-[80vw] max-w-[340px] shrink-0 snap-center flex-col gap-5 sm:w-auto sm:max-w-none">
              <div className="flex h-[360px] items-end justify-center overflow-hidden rounded-2xl bg-ground px-6 pt-6">
                {e.image ? (
                  <Telephone src={e.image.src} alt={e.image.alt} hauteur="h-[330px]" position={e.image.position} className="w-full max-w-[250px] rounded-b-none pb-0 [&>div]:rounded-b-none" />
                ) : (
                  <div className="mb-6 w-full">
                    <Compteur />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-semibold text-muted tabular-nums">0{i + 1}</p>
                <h3 className="text-[19px] leading-snug font-bold">{e.titre}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Ce que commande un couvreur : la liste de l'exemple, telle qu'elle part au négoce. */}
      <section aria-labelledby="fournitures" className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <h2 id="fournitures" className={h2}>
              Ardoise, zinc, liteaux, écran
            </h2>
            <p className={intro}>Chaque ligne part au négoce comme tu la lui dirais au comptoir.</p>
          </div>
          <ul aria-label="Exemple de liste de couverture" className="flex flex-col divide-y divide-[#e3e6ea] border-y border-[#e3e6ea]">
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

      {/* La commande commune : texte et compteur, sur un fond à peine gris (le seul aplat de la page). */}
      <section aria-labelledby="groupe" className="rounded-3xl bg-ground p-6 sm:p-10 lg:p-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-semibold text-accent-text">{NOM}</p>
              <h2 id="groupe" className={`${h2} max-w-[18ch]`}>
                Les couvreurs de ton secteur, ensemble
              </h2>
              <p className={intro}>Plus on est nombreux sur la même ligne, plus les négoces se battent pour la livrer. Tu commandes sur ton compte, comme d&apos;habitude.</p>
            </div>
            <ol className="flex flex-col divide-y divide-[#e3e6ea]">
              {GROUPE.map((e, i) => (
                <li key={e.titre} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                  <span className="pt-0.5 text-[14px] font-semibold text-muted tabular-nums" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[17px] leading-snug font-bold">{e.titre}</h3>
                    <p className="text-[15px] leading-relaxed text-muted">{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Compteur />
            <Photo emplacement="chantier" className="aspect-[16/10] w-full" />
          </div>
        </div>
      </section>

      <section aria-labelledby="commencer" className="flex flex-col items-start gap-6 border-t border-[#e3e6ea] pt-16 sm:items-center sm:text-center">
        <h2 id="commencer" className="font-display text-[34px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[48px]">
          Ta première liste, maintenant
        </h2>
        <p className="max-w-[44ch] text-[17px] leading-relaxed text-muted">Un compte, une photo de ta liste, et les négoces de ton secteur se mettent au travail.</p>
        <ButtonLink href="/inscription" variant="accent" className={BOUTON}>
          Créer un compte
        </ButtonLink>
        {/* Tous les métiers restent ouverts (nouveau cap) : une ligne. */}
        <p className="text-[15px] text-muted">Aussi pour la charpente, la maçonnerie, l&apos;isolation…</p>
      </section>

      <footer className="flex flex-col gap-5 border-t border-[#e3e6ea] pt-8 text-[13px] leading-relaxed text-muted">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <span className="text-[15px] font-bold text-ink">BatiClair</span>
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
