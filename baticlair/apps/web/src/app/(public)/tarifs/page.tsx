import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux } from "@/components/legal";
import { ButtonLink } from "@/components/ui";
import { NOM_APP } from "@/lib/nom";
import { TARIFS } from "../../../../../../packages/domain/src/groupe/tarifs";

export const metadata: Metadata = {
  title: `Tarifs — ${NOM_APP}`,
  description: TARIFS.enUneLigne,
};

/**
 * LA PAGE TARIFS (Greg, 27 octobre 2026, 2e message, point 34 ; RÈGLE CHANGÉE le 30 octobre 2026, réponses aux six
 * décisions) : les achats groupés sont GRATUITS pour tous ; trois formules, Découverte (gratuit), Essentiel et Pro (les
 * outils IA chaque mois). Les mots et les prix viennent de `TARIFS` et `OFFRES` (domaine), les mêmes que la landing et l'app.
 */
const PHRASE_TARIFS = TARIFS.enUneLigne;
const FORMULES = [TARIFS.gratuit, TARIFS.essentiel, TARIFS.pro] as const;

const ETAPES = [
  { titre: "Commence gratuitement", texte: "Inscription en deux minutes, sans carte bancaire." },
  { titre: "Rejoins les achats groupés", texte: "Ta liste rejoint celles des artisans de ton métier dans ton département. C'est gratuit, à chaque fois." },
  { titre: "Abonne-toi si l'aide à la lecture te sert", texte: "Essentiel ou Pro, au mois, sans engagement. Sinon, tu restes en Découverte : tes listes, tes négoces et les achats groupés restent à toi." },
] as const;

const FAQ = [
  { q: "Qu'est-ce qui est gratuit ?", r: TARIFS.question.r },
  { q: "Qu'est-ce qui est payant ?", r: "Seulement l'aide à la lecture au-delà des crédits offerts : les analyses de devis et les scans de liste chaque mois, avec Essentiel ou Pro. Rien n'est jamais facturé au-delà d'un quota : tu notes ta liste à la main, c'est gratuit." },
  { q: "Un gros devis compte double ?", r: "Un devis de plus de 150 lignes compte pour 2 analyses. Tu le vois avant que l'analyse parte." },
  { q: "Comment je résilie ?", r: "En deux clics dans « Mon abonnement ». Tu gardes l'accès jusqu'à la fin du mois payé, puis rien n'est plus prélevé." },
  { q: "Est-ce que j'ai des factures ?", r: "Oui, une à chaque paiement, émise par BATI INVEST, avec la TVA. Elles sont toutes dans « Mes factures »." },
  { q: "Un achat groupé, ça m'engage à quoi ?", r: "À commander tes quantités chez le moins cher entre la meilleure offre du groupe et ton négoce habituel. Deux sorties seulement : chantier annulé, ou aucune offre livrable." },
] as const;

export default function TarifsPage() {
  const h2 = "font-display text-[32px] leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-[48px]";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pt-6 pb-16 sm:gap-20 sm:px-6 sm:pt-12">
      <section aria-labelledby="tarifs" className="flex flex-col gap-6">
        <h1 id="tarifs" className="font-display text-[48px] leading-[0.96] font-extrabold tracking-[-0.03em] sm:text-[72px]">
          Tarifs
        </h1>
        <p className="max-w-[34ch] text-[22px] leading-snug font-bold text-accent sm:text-[28px]">{PHRASE_TARIFS}</p>
      </section>

      <section aria-label="Les formules" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {FORMULES.map((f) => (
          <div key={f.titre} className="flex flex-col gap-3 rounded-2xl bg-night-2 p-5 ring-1 ring-white/10 sm:p-7">
            <h2 className="text-[24px] font-extrabold">
              {f.titre} <span className="text-[16px] font-semibold text-white/60">{f.sous}</span>
            </h2>
            <ul className="flex flex-col gap-2 text-[16px] leading-relaxed text-white/80">
              {f.points.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-label="Les trois étapes">
        <ol className="flex flex-col gap-4">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="flex gap-5 rounded-2xl bg-night-2 p-5 ring-1 ring-white/10 sm:p-7">
              <span aria-hidden="true" className="font-display text-[44px] leading-none font-extrabold text-accent tabular-nums">
                {i + 1}
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-[20px] leading-snug font-extrabold sm:text-[22px]">{e.titre}</h2>
                <p className="text-[16px] leading-relaxed text-white/70">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="negoces" className="flex flex-col gap-3 rounded-2xl bg-accent p-6 text-ink sm:p-10">
        <h2 id="negoces" className={h2}>
          Gratuit pour les négoces
        </h2>
        <p className="text-[17px] leading-relaxed">Une liste propre, prête à chiffrer ligne par ligne, et des volumes engagés sur lesquels vous positionner. Sans abonnement.</p>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-6">
        <h2 id="faq" className={h2}>
          Questions
        </h2>
        <dl className="flex flex-col divide-y divide-white/10 border-y border-white/10">
          {FAQ.map((f) => (
            <div key={f.q} className="flex flex-col gap-2 py-5">
              <dt className="text-[18px] font-bold">{f.q}</dt>
              <dd className="text-[16px] leading-relaxed text-white/70">{f.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col items-start gap-4">
        <ButtonLink href="/inscription" variant="accent" className="min-h-13 px-8 text-[16px]">
          Commencer gratuitement
        </ButtonLink>
        <Link href="/" className="min-h-11 content-center text-[15px] font-semibold text-white/70 underline">
          Retour à l&apos;accueil
        </Link>
      </section>

      <footer className="border-t border-white/10 pt-8">
        <LiensLegaux clair />
      </footer>
    </main>
  );
}
