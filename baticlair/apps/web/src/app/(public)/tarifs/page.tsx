import type { Metadata } from "next";
import Link from "next/link";
import { ArgumentTarif } from "@/components/argument-tarif";
import { LiensLegaux } from "@/components/legal";
import { ButtonLink } from "@/components/ui";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = {
  title: `Tarifs — ${NOM_APP}`,
  description: "Gratuit pour rejoindre et tester sur un cycle complet. Ensuite 29 € HT par mois, sans engagement. Gratuit pour les négoces.",
};

/**
 * LA PAGE TARIFS (Greg, 24 octobre 2026) : trois étapes, « Gratuit pour les négoces », une FAQ courte (résiliation,
 * factures, après l'essai), le bouton d'inscription. Même registre que la landing : nuit, un jaune signal.
 */
const ETAPES = [
  { titre: "Rejoins la communauté, c'est gratuit", texte: "Inscription en deux minutes, sans carte bancaire." },
  { titre: "Teste sur un cycle complet", texte: "Dépose ta liste, les négoces répondent, tu vois les prix. L'essai court jusqu'à 30 jours après tes premiers résultats." },
  { titre: "Continue seulement si tu as vraiment économisé : 29 € HT par mois, sans engagement", texte: "Tu vois ce que tu as gagné sur ton premier cycle avant de décider." },
] as const;

const FAQ = [
  { q: "Comment je résilie ?", r: "En deux clics dans « Mon abonnement ». Tu gardes l'accès jusqu'à la fin du mois payé, puis rien n'est plus prélevé." },
  { q: "Est-ce que j'ai des factures ?", r: "Oui, une facture chaque mois, émise par BATI INVEST, avec la TVA. Elles sont toutes dans « Mes factures »." },
  { q: "Que se passe-t-il après l'essai ?", r: "Rien n'est prélevé tout seul. Tu continues pour 29 € HT par mois si tu veux. Sinon, tes listes, tes bons et ton historique restent consultables." },
] as const;

export default function TarifsPage() {
  const h2 = "font-display text-[32px] leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-[48px]";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pt-6 pb-16 sm:gap-20 sm:px-6 sm:pt-12">
      <section aria-labelledby="tarifs" className="flex flex-col gap-6">
        <h1 id="tarifs" className="font-display text-[48px] leading-[0.96] font-extrabold tracking-[-0.03em] sm:text-[72px]">
          Tarifs
        </h1>
        <ArgumentTarif className="max-w-[30ch] text-[22px] leading-snug font-bold text-accent sm:text-[28px]" />
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
        <p className="text-[17px] leading-relaxed">Les négoces répondent aux commandes communes sans abonnement ni commission.</p>
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
          Je rejoins la communauté
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
