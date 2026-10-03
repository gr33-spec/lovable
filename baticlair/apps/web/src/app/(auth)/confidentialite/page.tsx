import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Confidentialité — BatiClair" };

/**
 * Politique de confidentialité (RGPD, audit de lancement B4), en mots simples. Ce que BatiClair
 * garde, pourquoi, combien de temps, chez qui, et comment tout récupérer ou tout effacer.
 */
export default function ConfidentialitePage() {
  const h2 = "font-display text-lg font-extrabold";
  const p = "text-[15px] leading-relaxed";
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Confidentialité</PageTitle>
      <p className={p}>
        BatiClair lit les devis de vos clients pour vous sortir la liste des matériaux à commander. Voici ce que nous gardons, pourquoi, combien de temps, et
        comment le récupérer ou l&apos;effacer.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Ce que nous gardons</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>Votre compte : nom, adresse e-mail, mot de passe (chiffré, jamais lisible), entreprise et métiers.</li>
          <li>Vos chantiers : nom, client, adresse, tels que vous les saisissez.</li>
          <li>Les devis que vous déposez (le fichier PDF) et les devis reçus de vos fournisseurs.</li>
          <li>Les listes de matériaux (quantitatifs), vos réponses et vos corrections.</li>
          <li>Votre carnet de fournisseurs et vos demandes de prix.</li>
        </ul>
        <p className={p}>Rien d&apos;autre : pas de publicité, pas de revente, pas de pistage d&apos;un site à l&apos;autre.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Pourquoi</h2>
        <p className={p}>
          Uniquement pour vous rendre le service : lire vos devis, calculer les quantités, préparer vos demandes de prix et vous souvenir de vos habitudes (vos
          corrections améliorent vos prochaines listes).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Combien de temps</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>
            Vos devis et vos quantitatifs sont conservés <strong>3 ans après votre dernière connexion</strong>, puis effacés.
          </li>
          <li>
            À votre demande, <strong>tout est supprimé immédiatement</strong> : compte, entreprise, chantiers, devis et leurs fichiers, listes, fournisseurs.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Où sont vos données</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>
            <strong>Hébergement : Vercel</strong>, serveurs à Francfort (Allemagne, Union européenne). La base de données est chez Neon, à Francfort.
          </li>
          <li>
            <strong>Lecture des devis : Anthropic</strong> (États-Unis), uniquement pour lire le texte du devis que vous déposez. D&apos;après ses conditions
            commerciales, Anthropic n&apos;utilise pas ces devis pour entraîner ses modèles.
          </li>
          <li>
            <strong>E-mails</strong> (confirmation d&apos;adresse, mot de passe oublié) : Resend.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Vos droits</h2>
        <p className={p}>
          Depuis <strong>Compte → Mes données</strong>, sans rien demander à personne :
        </p>
        <ul className={`${p} list-disc pl-5`}>
          <li>« Télécharger mes données » : tout ce que nous gardons, dans un fichier.</li>
          <li>« Supprimer mon compte » : effacement immédiat et définitif.</li>
        </ul>
        <p className={p}>
          Pour corriger une information, modifiez-la directement dans l&apos;application. Vous pouvez aussi saisir la CNIL (cnil.fr) si vous estimez que vos droits
          ne sont pas respectés.
        </p>
      </section>

      <Link href="/connexion" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour
      </Link>
    </article>
  );
}
