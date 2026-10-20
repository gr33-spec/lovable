import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
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
 * LA PAGE D'ACCUEIL PUBLIQUE (plan du 20 octobre 2026, bloc 5) : une page, le téléphone d'abord, ton direct, zéro
 * jargon. Accroche, trois étapes du quantitatif, trois étapes du groupé, « gratuit pour l'artisan, le négoce paie
 * 2 % », les métiers couverts, « Créer un compte », pied de page avec les mentions légales. Aucune image ni script
 * extérieur : tout est dans la page.
 */
const QUANTITATIF = [
  { titre: "Tu déposes le devis de ton client", texte: "Une photo ou un PDF, depuis ton téléphone. Rien à saisir." },
  { titre: "BatiClair sort la liste des fournitures", texte: "Les quantités à commander, ligne par ligne, avec les mots du comptoir. Deux ou trois questions au plus." },
  { titre: "Tu l'envoies à tes négoces", texte: "Un e-mail avec le PDF, en un geste. Les réponses reviennent dans l'app, comparées." },
];

const GROUPE = [
  { titre: "Tu proposes une ligne au groupé", texte: "Une référence, une fenêtre de livraison, « chantier signé ». Ton nom ne part pas avec." },
  { titre: "On regroupe par département", texte: "Même référence, même département : un seul lot, une seule demande de prix aux négoces." },
  { titre: "Tu commandes au prix du lot", texte: "Sur ton compte, chez le négoce retenu, livré sur ton chantier. Tu dis « Livré » quand c'est arrivé." },
];

const METIERS = TRADES.filter((t) => t.id !== "other");

export default function BienvenuePage() {
  const h2 = "font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-3xl";
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 pt-6 pb-16 sm:px-6 sm:gap-20 sm:pt-12">
      <section aria-labelledby="accroche" className="flex flex-col gap-5 sm:max-w-3xl">
        <h1 id="accroche" className="font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-5xl">
          Tes devis deviennent tes bons de commande, et tes commandes se regroupent avec les autres artisans du département.
        </h1>
        <p className="max-w-[60ch] text-[17px] leading-relaxed text-muted">Dépose le devis de ton client. BatiClair sort la liste des fournitures, l&apos;envoie à tes négoces, et regroupe tes achats avec ceux des autres.</p>
        <ButtonLink href="/inscription" className="min-h-14 self-start bg-cta px-6 text-[17px] shadow-cta">
          Créer un compte
        </ButtonLink>
      </section>

      <section aria-labelledby="quantitatif" className="flex flex-col gap-6">
        <h2 id="quantitatif" className={h2}>
          Du devis à la liste de fournitures, en trois étapes
        </h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUANTITATIF.map((e, i) => (
            <li key={e.titre} className="flex gap-4 rounded-[20px] bg-surface p-4 shadow-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-extrabold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-[17px] leading-snug font-extrabold">{e.titre}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="groupe" className="flex flex-col gap-6 rounded-[28px] bg-ink p-5 text-white sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 id="groupe" className={h2}>
            Le groupé : un seul négoce, un seul prix
          </h2>
          <p className="max-w-[60ch] text-[16px] leading-relaxed text-white/75">Tes commandes regroupées avec celles des autres artisans du département. Personne ne voit ton nom ni tes chantiers.</p>
        </div>
        <ol className="flex flex-col gap-0 border-l-2 border-white/15 pl-5 sm:grid sm:grid-cols-3 sm:gap-6 sm:border-l-0 sm:pl-0">
          {GROUPE.map((e, i) => (
            <li key={e.titre} className="relative flex flex-col gap-1 pb-6 sm:border-t-2 sm:border-white/15 sm:pt-4 sm:pb-0">
              <span className="absolute top-0.5 -left-[31px] size-4 rounded-full bg-accent-on-dark ring-4 ring-ink sm:hidden" aria-hidden="true" />
              <span className="text-[13px] font-extrabold text-accent-on-dark">Étape {i + 1}</span>
              <h3 className="text-[17px] leading-snug font-extrabold">{e.titre}</h3>
              <p className="text-[15px] leading-relaxed text-white/75">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="prix" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-[20px] bg-surface p-5 shadow-card">
          <h2 id="prix" className={h2}>
            Gratuit pour l&apos;artisan
          </h2>
          <p className="text-[16px] leading-relaxed text-muted">Pas d&apos;abonnement pour le groupé, pas de commission sur tes achats. Tu commandes sur ton compte, au prix du lot.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[20px] bg-ok-bg p-5">
          <p className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em] text-ok sm:text-3xl">Le négoce paie 2 %</p>
          <p className="text-[16px] leading-relaxed text-ok">Quand son offre est retenue, le négoce reverse 2 % du montant HT du lot à BatiClair. Il l&apos;accepte avant de répondre, et l&apos;intègre à son prix.</p>
        </div>
      </section>

      <section aria-labelledby="metiers" className="flex flex-col gap-4">
        <h2 id="metiers" className={h2}>
          Les métiers couverts
        </h2>
        <p className="max-w-[60ch] text-[16px] leading-relaxed text-muted">Un référentiel par métier, relu par des artisans : les quantités sortent avec les mots de ton comptoir.</p>
        <ul aria-label="Métiers couverts" className="flex flex-wrap gap-2">
          {METIERS.map((t) => (
            <li key={t.id} className="rounded-full bg-surface px-3.5 py-2 text-[14px] font-bold shadow-card">
              {t.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="commencer" className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="commencer" className={h2}>
            Ton premier devis, maintenant
          </h2>
          <p className="text-[16px] leading-relaxed text-muted">Un compte, un devis déposé, ta liste en deux minutes.</p>
        </div>
        <ButtonLink href="/inscription" className="min-h-14 shrink-0 bg-cta px-6 text-[17px] shadow-cta">
          Créer un compte
        </ButtonLink>
      </section>

      <footer className="flex flex-col gap-3 border-t border-line pt-6 text-[13px] leading-relaxed text-muted">
        <p>
          <span className="font-bold text-ink">Mentions légales.</span> BatiClair est édité par BATI INVEST, SARL, SIRET 910 796 325 00017, 6 impasse du Ouipoure, 22620 Ploubazlanec, TVA intracommunautaire FR61910796325. Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
        <nav aria-label="Pages légales" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/confidentialite" className="font-bold text-accent-text underline decoration-dotted underline-offset-4">
            Confidentialité
          </Link>
          <Link href="/connexion" className="font-bold text-accent-text underline decoration-dotted underline-offset-4">
            Se connecter
          </Link>
        </nav>
      </footer>
    </main>
  );
}
