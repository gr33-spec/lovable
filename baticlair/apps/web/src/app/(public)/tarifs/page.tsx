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

/** Le prix en grand, le reste en petit : « 19,90 € » · « HT par mois » ; « Gratuit » · « sans limite de temps ». */
function prixEnDeux(sous: string): [string, string] {
  const euros = /^(.+?€)\s+(.+)$/.exec(sous);
  if (euros) return [euros[1]!, euros[2]!];
  const [a, ...b] = sous.split(", ");
  return [a!.charAt(0).toUpperCase() + a!.slice(1), b.join(", ")];
}

function Coche() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-[3px] size-[18px] shrink-0 text-accent">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".14" />
      <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * LA DA DE LA LANDING (Greg, 31 octobre 2026, soir : « pas belle avec le marron, classe et premium en conservant la DA ») :
 * noir profond, ivoire, jaune Mobiiz en accent seul ; cartes en verre sombre à filet fin, prix en grand ; une lueur jaune
 * très douce derrière le titre. Les mots et les prix restent ceux du domaine.
 */
export default function TarifsPage() {
  const h2 = "font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] text-[#FBF8F3] sm:text-[48px]";
  const carte = "rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.015] shadow-[0_30px_70px_rgba(0,0,0,0.45)]";
  const [avant, apres] = PHRASE_TARIFS.split(" : ");
  return (
    <div className="relative overflow-x-clip bg-[#0C0A08]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(254,210,6,0.1),rgba(254,210,6,0))] blur-2xl" />
      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pt-8 pb-16 sm:gap-24 sm:px-6 sm:pt-16">
        <section aria-labelledby="tarifs" className="flex flex-col gap-5">
          <span className="text-[13px] font-extrabold tracking-[0.18em] text-accent uppercase">Simple et sans engagement</span>
          <h1 id="tarifs" className="font-display text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] text-[#FBF8F3] sm:text-[80px]">
            Tarifs
          </h1>
          <p className="max-w-[40ch] text-[19px] leading-[1.5] text-[#FBF8F3]/75 sm:text-[22px]">
            <strong className="font-extrabold text-accent">{avant} :</strong> {apres}
          </p>
        </section>

        <section aria-label="Les formules" className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {FORMULES.map((f, i) => {
            const [prix, detail] = prixEnDeux(f.sous);
            return (
              <div key={f.titre} className={`relative flex flex-col gap-6 p-6 sm:p-7 ${carte} ${i === 0 ? "ring-1 ring-accent/40" : ""}`}>
                {i === 0 ? <span aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" /> : null}
                <h2 className="flex flex-col gap-3">
                  <span className="text-[13px] font-extrabold tracking-[0.16em] text-[#FBF8F3]/60 uppercase">{f.titre}</span>{" "}
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[40px] leading-none font-extrabold tracking-[-0.04em] text-[#FBF8F3]">{prix}</span>{" "}
                    <span className="text-[15px] font-semibold text-[#FBF8F3]/55">{detail}</span>
                  </span>
                </h2>
                <div aria-hidden="true" className="h-px bg-white/[0.08]" />
                <ul className="flex flex-col gap-3 text-[15.5px] leading-snug text-[#FBF8F3]/80">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-3">
                      <Coche />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section aria-label="Les trois étapes">
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className={`flex flex-col gap-4 p-6 sm:p-7 ${carte}`}>
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-accent font-display text-[19px] font-extrabold text-[#0C0A08] tabular-nums shadow-[0_0_30px_rgba(254,210,6,0.35)]">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2">
                  <h2 className="text-[20px] leading-snug font-extrabold tracking-[-0.02em] text-[#FBF8F3]">{e.titre}</h2>
                  <p className="text-[15.5px] leading-relaxed text-[#FBF8F3]/65">{e.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="negoces" className="relative flex flex-col gap-3 overflow-hidden rounded-[28px] bg-accent p-7 text-[#0C0A08] sm:p-12">
          <span aria-hidden="true" className="absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-[#0C0A08]/10" />
          <h2 id="negoces" className="relative font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[48px]">
            Gratuit pour les négoces
          </h2>
          <p className="relative max-w-[52ch] text-[17px] leading-relaxed">Une liste propre, prête à chiffrer ligne par ligne, et des volumes engagés sur lesquels vous positionner. Sans abonnement.</p>
        </section>

        <section aria-labelledby="faq" className="grid grid-cols-1 gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
          <h2 id="faq" className={h2}>
            Questions
          </h2>
          <dl className="flex flex-col divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQ.map((f) => (
              <div key={f.q} className="flex flex-col gap-2 py-5">
                <dt className="text-[17px] font-bold text-[#FBF8F3]">{f.q}</dt>
                <dd className="text-[15.5px] leading-relaxed text-[#FBF8F3]/65">{f.r}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <ButtonLink href="/inscription" variant="accent" className="min-h-14 rounded-full px-9 text-[16px] shadow-[0_18px_45px_rgba(254,210,6,0.25)]">
            Commencer gratuitement
          </ButtonLink>
          <Link href="/" className="min-h-11 content-center text-[15px] font-semibold text-[#FBF8F3]/60 underline underline-offset-4 hover:text-[#FBF8F3]">
            Retour à l&apos;accueil
          </Link>
        </section>

        <footer className="border-t border-white/[0.08] pt-8">
          <LiensLegaux clair />
        </footer>
      </main>
    </div>
  );
}
