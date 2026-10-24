import type { Metadata } from "next";
import Link from "next/link";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { EDITEUR, TRIBUNAL, VERSION_CGU } from "@/lib/legal";
import { NOM, nom } from "@/lib/nom";

export const metadata: Metadata = { title: "Conditions générales d'utilisation — BatiClair" };

/**
 * LES CGU ARTISAN (mise en conformité du 24 octobre 2026), en mots simples : un service entre professionnels, la commande
 * commune toutes les deux semaines, sans engagement d'achat ; BATI INVEST n'est ni vendeur ni acheteur ; la concurrence ;
 * les documents déposés ; la responsabilité ; la suspension ; le droit applicable. Versionnées : une version majeure est
 * redemandée à chaque compte (`VERSION_CGU_MAJEURE`), l'acceptation est horodatée. À relire par l'avocat.
 */
export default function CguPage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions générales d&apos;utilisation</PageTitle>
      <p className="text-sm text-muted">
        Version du {VERSION_CGU.split("-").reverse().join("/")}. Elles s&apos;appliquent à tout compte artisan créé sur BatiClair. Une nouvelle version majeure vous est
        présentée dans l&apos;application et doit être acceptée pour continuer ; la date et la version acceptées sont enregistrées.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>1. Un service réservé aux professionnels</h2>
        <p className={s.p}>
          BatiClair est édité par {EDITEUR.nom} (voir les{" "}
          <Link href="/mentions-legales" className="font-semibold underline">
            mentions légales
          </Link>
          ). C&apos;est un service entre professionnels : il est réservé aux entreprises du bâtiment dont le SIRET est actif. Le SIRET est vérifié auprès de
          l&apos;INSEE avant l&apos;accès à la {nom}. Les informations de l&apos;entreprise (nom, adresse, SIRET) doivent être exactes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>2. Ce que fait BatiClair</h2>
        <ul className={s.ul}>
          <li>
            BatiClair lit les listes de matériaux et les devis que vous déposez et en sort la liste des fournitures. Une liste est reprise telle que vous l&apos;avez
            écrite ; d&apos;un devis, les quantités sont calculées à partir du devis et de référentiels métier. C&apos;est une aide : vous restez responsable de ce que
            vous commandez.
          </li>
          <li>
            La « {NOM} » : toutes les deux semaines, le 1er et le 15 du mois à 12 h, les listes déposées par les artisans d&apos;un même métier et d&apos;un même
            département sont réunies en une seule grille, envoyée aux négoces de ce secteur. Les négoces ont cinq jours ouvrés pour répondre. Vous voyez ensuite votre
            prix livré chez chaque négoce qui a répondu.
          </li>
          <li>
            <strong>Sans engagement d&apos;achat</strong> : déposer une liste ne vous oblige à rien. Vous commandez seulement si le prix vous plaît, en confirmant
            la commande dans l&apos;application.
          </li>
          <li>
            Le service est gratuit pour l&apos;artisan. Si des formules payantes sont proposées plus tard, elles seront annoncées dans l&apos;application et dans
            ces conditions avant tout paiement ; rien ne vous sera facturé sans votre accord.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>3. BATI INVEST n&apos;est ni vendeur ni acheteur</h2>
        <p className={s.p}>
          Quand vous commandez, le contrat de vente est conclu directement entre vous et le négoce : vous commandez sur votre compte chez lui, il vous livre et vous
          facture, vous le payez comme d&apos;habitude. {EDITEUR.nom} ne vend rien, n&apos;achète rien, n&apos;encaisse aucun paiement et ne porte pas la commande. En
          commandant, vous transmettez vos coordonnées et votre adresse de livraison au négoce choisi, et à lui seul.
        </p>
        <p className={s.p}>
          {EDITEUR.nom} ne garantit ni les prix, ni les délais, ni la qualité des produits ou des livraisons d&apos;un négoce. Le prix livré affiché est une estimation
          calculée avec les conditions de livraison du négoce et une distance estimée : la facture du négoce fait foi.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>4. Concurrence</h2>
        <p className={s.p}>
          Les prix d&apos;un négoce ne sont jamais communiqués à un autre négoce, ni pendant ni après la consultation. Les artisans ne se voient pas : ni nom, ni
          chantier, ni prix obtenu. La {nom} additionne des volumes, elle ne sert pas à vous coordonner avec d&apos;autres artisans : vous restez seul maître de vos
          achats, de vos prix de vente et de vos clients, et vous vous engagez à ne pas utiliser le service pour vous entendre avec d&apos;autres entreprises.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>5. Les documents que vous déposez</h2>
        <ul className={s.ul}>
          <li>
            Vous garantissez avoir le droit de transmettre chaque liste ou devis que vous déposez. Un devis peut contenir les coordonnées de votre client : BatiClair
            les retire du texte avant de l&apos;enregistrer et avant toute lecture automatique, et ne garde que la commune du chantier (voir la{" "}
            <Link href="/confidentialite" className="font-semibold underline">
              politique de confidentialité
            </Link>
            ).
          </li>
          <li>
            Quand vous invitez un collègue, le message part de votre téléphone (WhatsApp, SMS ou lien copié) : BatiClair n&apos;envoie rien et ne garde pas son numéro.
            Quand vous ajoutez votre négoce, BatiClair lui écrit une seule fois pour l&apos;inviter, en disant qu&apos;un artisan de son secteur l&apos;a ajouté, sans votre
            nom.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>6. Responsabilité</h2>
        <p className={s.p}>
          BatiClair est fourni avec le soin d&apos;un service en construction. La responsabilité de {EDITEUR.nom} est limitée aux dommages directs causés par une faute
          prouvée de sa part ; elle ne couvre ni une commande passée sur une quantité que vous n&apos;avez pas vérifiée, ni le fait d&apos;un négoce (prix, retard,
          défaut). Le service peut être interrompu pour maintenance ; vos données restent récupérables depuis Compte → Mes données.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>7. Votre compte, sa suspension et sa suppression</h2>
        <ul className={s.ul}>
          <li>Un compte par personne, rattaché à une entreprise du bâtiment. Vous gardez votre mot de passe pour vous.</li>
          <li>
            {EDITEUR.nom} peut suspendre un compte en cas d&apos;abus : faux SIRET, usage contraire à ces conditions, tentative d&apos;accéder aux données d&apos;un autre,
            entente entre entreprises. Sauf urgence, vous êtes prévenu par e-mail et pouvez répondre avant la suspension.
          </li>
          <li>Vous pouvez supprimer votre compte à tout moment depuis Compte → Mes données.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>8. Données et droit applicable</h2>
        <p className={s.p}>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          . Ces conditions sont soumises au droit français. En cas de litige, et après recherche d&apos;une solution amiable, le {TRIBUNAL} est seul compétent.
        </p>
      </section>
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
