import type { Metadata } from "next";
import Link from "next/link";
import { ArgumentTarif } from "@/components/argument-tarif";
import { LiensLegaux } from "@/components/legal";
import { OffresPubliques } from "@/components/offres-abonnement";
import { ButtonLink } from "@/components/ui";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = {
  title: `Tarifs — ${NOM_APP}`,
  description: "Gratuit pour commencer. Dès 29 € HT par mois à l'année (348 € HT par an), ou 49 € HT par mois sans engagement, pour comparer et acheter en groupe. Gratuit pour les négoces.",
};

/**
 * LA PAGE TARIFS (Greg, 24 octobre 2026) : les deux formules (l'annuel mis en avant, le mensuel à côté), trois étapes, « Gratuit pour les négoces », une FAQ courte (résiliation,
 * factures, après l'essai), le bouton d'inscription. Même registre que la landing : nuit, un jaune signal.
 */
/**
 * GRATUIT / PAYANT (Greg, 25 octobre 2026, recentrage) : ce que donne chaque formule. Les chiffres viennent des réglages de
 * l'API (`LECTURES_GRATUITES_MOIS`, 5 négoces, 3 mois d'historique) ; l'essai reste ; le payant est offert dans une zone qui
 * démarre (moins de 10 artisans actifs), puis 30 jours de préavis.
 */
const FORMULES = [
  { titre: "Gratuit", sous: "pour commencer", points: ["2 devis lus par mois", "1 négoce par demande", "Mes prix : tes 3 derniers mois"] },
  { titre: "Payant", sous: "dès 29 € HT par mois", points: ["Devis lus sans limite", "Jusqu'à 5 négoces par demande, réponses comparées livraison comprise", "Les regroupements", "Mes prix : tout ton historique"] },
] as const;

const ETAPES = [
  { titre: "Commence gratuitement", texte: "Inscription en deux minutes, sans carte bancaire." },
  { titre: "Teste le payant", texte: "L'essai te donne tout, regroupements compris. Dans une zone qui démarre, le payant est offert : on te prévient 30 jours avant la fin." },
  { titre: "Continue si ça te sert : dès 29 € HT par mois", texte: "À l'année ou au mois, tu choisis. Sinon, tu restes en gratuit." },
] as const;

const FAQ = [
  { q: "Annuel ou mensuel ?", r: "L'annuel : 348 € HT payés en une fois, soit 29 € par mois, 240 € de moins qu'au mois. Le mensuel : 49 € HT par mois, sans engagement. Tu passes du mois à l'année quand tu veux, ce qui reste de ton mois est déduit." },
  { q: "Comment je résilie ?", r: "En deux clics dans « Mon abonnement ». Tu gardes l'accès jusqu'à la fin de la période payée (le mois, ou l'année), puis rien n'est plus prélevé. Une année commencée n'est pas remboursée au prorata." },
  { q: "L'annuel se renouvelle tout seul ?", r: "Oui, chaque année. Je te préviens par e-mail 30 jours avant : tu as le temps de résilier si tu veux arrêter." },
  { q: "Est-ce que j'ai des factures ?", r: "Oui, une à chaque paiement (chaque mois, ou chaque année), émise par BATI INVEST, avec la TVA. Elles sont toutes dans « Mes factures »." },
  { q: "Que se passe-t-il après l'essai ?", r: "Rien n'est prélevé tout seul. Tu continues si tu veux, à l'année ou au mois. Sinon, tu passes en gratuit : tes chantiers et tes bons restent consultables." },
  { q: "Les regroupements, ça fait baisser les prix ?", r: "On réunit les volumes des gros matériaux identiques pour tenter un meilleur prix. Rien n'est garanti : tu compares et tu commandes seulement si le prix te plaît." },
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

      <section aria-label="Gratuit ou payant" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <section aria-label="Les formules">
        <OffresPubliques />
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
        <p className="text-[17px] leading-relaxed">Des demandes structurées, prêtes à chiffrer, et des volumes groupés sur lesquels vous positionner. Sans abonnement ni commission.</p>
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
