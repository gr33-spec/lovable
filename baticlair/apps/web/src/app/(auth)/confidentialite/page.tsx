import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux } from "@/components/legal";
import { PageTitle } from "@/components/ui";
import { nom } from "@/lib/nom";

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
        BatiClair lit vos listes de matériaux et vos devis pour en sortir la liste des fournitures à chiffrer, et regroupe les besoins de plusieurs artisans
        pour obtenir un meilleur prix auprès des négoces. Voici ce que nous gardons, pourquoi, combien de temps, et comment le récupérer ou l&apos;effacer.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Ce que nous gardons</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>Votre compte : nom, adresse e-mail, mot de passe (chiffré, jamais lisible), entreprise et métiers.</li>
          <li>Vos chantiers : nom, client, adresse, tels que vous les saisissez.</li>
          <li>Les listes (photo ou PDF) et les devis que vous déposez, et les devis reçus de vos fournisseurs.</li>
          <li>Les listes de matériaux (quantitatifs), vos réponses et vos corrections.</li>
          <li>Votre carnet de fournisseurs et vos demandes de prix.</li>
          <li>
            Pour la {nom} : le SIRET de votre entreprise (vérifié auprès de l&apos;INSEE), vos négoces (nom, e-mail, ce qu&apos;ils vendent, votre numéro de compte),
            vos lignes proposées, vos bons de commande et vos livraisons. Les négoces : leurs coordonnées, l&apos;adresse de leur dépôt, leurs conditions de
            livraison, leurs devis et leur accord aux conditions (date, e-mail, adresse IP).
          </li>
          <li>Si vous les activez, l&apos;adresse technique de votre téléphone pour vous prévenir quand une liste est prête ou qu&apos;un devis arrive.</li>
        </ul>
        <p className={p}>Rien d&apos;autre : pas de publicité, pas de revente, pas de pistage d&apos;un site à l&apos;autre.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Pourquoi</h2>
        <p className={p}>
          Uniquement pour vous rendre le service : lire vos listes et vos devis, calculer les quantités, préparer vos demandes de prix, regrouper les besoins
          pour la {nom}, comparer les devis des négoces livraison comprise, vous prévenir et vous souvenir de vos habitudes (vos corrections améliorent vos
          prochaines listes).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Combien de temps</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>
            Votre compte, vos listes, vos devis et vos quantitatifs sont conservés <strong>3 ans après votre dernière connexion</strong>, puis effacés.
          </li>
          <li>
            À votre demande, <strong>tout est supprimé immédiatement</strong> : compte, entreprise, chantiers, devis et leurs fichiers, listes, fournisseurs.
          </li>
          <li>
            Les bons de commande, accords et factures de commission de la {nom} sont gardés <strong>10 ans</strong> (obligation comptable), sans votre nom une fois le
            compte supprimé.
          </li>
          <li>Un négoce qui répond « stop » au mail de la {nom} ne reçoit plus rien ; ses coordonnées ne servent plus qu&apos;à garder trace de ce refus.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Où sont vos données</h2>
        <ul className={`${p} list-disc pl-5`}>
          <li>
            <strong>Hébergement : Vercel</strong>, serveurs à Francfort (Allemagne, Union européenne). La base de données est chez Neon, à Francfort.
          </li>
          <li>
            <strong>Lecture des listes et des devis : Anthropic</strong> (États-Unis), uniquement pour lire les listes et les devis déposés, les vôtres comme
            ceux des négoces. D&apos;après ses conditions commerciales, Anthropic n&apos;utilise pas ces documents pour entraîner ses modèles.
          </li>
          <li>
            <strong>E-mails</strong> (confirmation d&apos;adresse, mot de passe oublié, demandes de prix aux négoces, bons de commande) : Resend, qui ne garde que les
            journaux d&apos;envoi.
          </li>
          <li>
            <strong>Vérification du SIRET</strong> : l&apos;API Sirene de l&apos;INSEE (France), qui reçoit seulement le numéro.
          </li>
          <li>
            <strong>Distances de livraison</strong> : l&apos;API Adresse de l&apos;État (data.gouv.fr, France), qui reçoit seulement l&apos;adresse du chantier et
            celle du dépôt.
          </li>
          <li>
            <strong>Notifications</strong>, si vous les activez : le service de votre téléphone (Apple ou Google) transmet le message, sans le garder.
          </li>
        </ul>
        <p className={p}>Responsable du traitement : BATI INVEST, SARL, 6 impasse du Ouipoure, 22620 Ploubazlanec (voir les mentions légales).</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Cookies</h2>
        <p className={p}>
          Un seul cookie, celui qui vous garde connecté, et quelques réglages gardés dans votre navigateur (l&apos;entreprise choisie, une aide déjà vue). Ils
          sont indispensables au service : pas de cookie de publicité ni de mesure d&apos;audience, donc rien à accepter. Vous pouvez les effacer depuis les
          réglages de votre navigateur ; il faudra alors vous reconnecter.
        </p>
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
          Pour corriger une information, modifiez-la directement dans l&apos;application. Accès, rectification, effacement, opposition, portabilité : ces droits
          s&apos;exercent aussi en écrivant à l&apos;éditeur (voir les mentions légales). Vous pouvez saisir la CNIL (cnil.fr) si vous estimez que vos droits ne sont pas respectés.
        </p>
      </section>

      <LiensLegaux sauf="/confidentialite" />
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
