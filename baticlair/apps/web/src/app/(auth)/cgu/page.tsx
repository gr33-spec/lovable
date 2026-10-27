import type { Metadata } from "next";

import Link from "next/link";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { EDITEUR, TRIBUNAL, VERSION_CGU } from "@/lib/legal";
import { nom, NOM_APP } from "@/lib/nom";

/**
 * Les prix des deux formules (Greg, 24 octobre 2026 ; réglables dans l'admin : un changement se fait ici aussi, avec 30
 * jours de préavis).
 */
const PRIX_MENSUEL = "49 €";
const PRIX_ANNUEL = "348 €";

/** Le plafond du gratuit (Greg, 25 octobre 2026), réglé côté API par `LECTURES_GRATUITES_MOIS`. */
const LECTURES_GRATUITES = 2;

export const metadata: Metadata = { title: `Conditions générales d'utilisation — ${NOM_APP}` };

/**
 * LES CGU ARTISAN (mise en conformité du 24 octobre 2026), en mots simples : un service entre professionnels, la commande
 * commune toutes les deux semaines, sans engagement d'achat ; BATI INVEST n'est ni vendeur ni acheteur ; la concurrence ;
 * l'abonnement (24 octobre 2026 : mensuel 49 € HT, annuel 348 € HT, passage du mois à l'année, renouvellement, essai, résiliation, échec de paiement) ; les documents déposés ; la responsabilité ; la suspension ; le droit applicable. Versionnées : une version majeure est
 * redemandée à chaque compte (`VERSION_CGU_MAJEURE`), l'acceptation est horodatée. À relire par l'avocat.
 * Version du 26 octobre 2026 (points D de Greg) : rôle d'intermédiaire, commission dans le prix, adresse Mobiiz, limites de
 * l'IA ; passages à faire relire marqués dans `docs/groupe/CONFORMITE.md`.
 */
export default function CguPage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions générales d&apos;utilisation</PageTitle>
      <p className="text-sm text-muted">
        Version du {VERSION_CGU.split("-").reverse().join("/")}. Elles s&apos;appliquent à tout compte artisan créé sur {NOM_APP}. Une nouvelle version majeure vous est
        présentée dans l&apos;application et doit être acceptée pour continuer ; la date et la version acceptées sont enregistrées.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>1. Un service réservé aux professionnels</h2>
        <p className={s.p}>
          {NOM_APP} est édité par {EDITEUR.nom} (voir les{" "}
          <Link href="/mentions-legales" className="font-semibold underline">
            mentions légales
          </Link>
          ). C&apos;est un service entre professionnels : il est réservé aux entreprises du bâtiment dont le SIRET est actif. Le SIRET est vérifié auprès de
          l&apos;INSEE avant l&apos;accès à le {nom}. Les informations de l&apos;entreprise (nom, adresse, SIRET) doivent être exactes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>2. Ce que fait {NOM_APP}</h2>
        <ul className={s.ul}>
          <li>
            {NOM_APP} lit les listes de matériaux et les devis que vous déposez et en sort la liste des fournitures. Une liste est reprise telle que vous l&apos;avez
            écrite ; d&apos;un devis, les quantités sont calculées à partir du devis et de référentiels métier. C&apos;est une aide : vous restez responsable de ce que
            vous commandez.
          </li>
          <li>
            <strong>La demande perso</strong> : vous envoyez votre liste aux négoces de votre choix (vos habituels, ceux de votre zone, ou un nouveau par
            e-mail). Avec votre accord, l&apos;e-mail part à votre nom ; le négoce chiffre en ligne, sans compte : prix par ligne, livraison, délai et validité.
            Les réponses sont comparées livraison comprise. Une relance part au négoce après 48 heures ouvrées sans réponse ; la demande se clôt à votre date de
            besoin. Quand vous commandez, un bon de commande part au négoce choisi ; sa commande suit les statuts Reçue, Confirmée, Livrée.
          </li>
          <li>
            <strong>« Mes prix »</strong> : l&apos;historique des prix que vous avez reçus et payés, article par article. Ce sont vos prix : personne d&apos;autre ne les
            voit, et vous ne voyez jamais ceux d&apos;un autre artisan.
          </li>
          <li>
            <strong>Les regroupements</strong> : pour les gros articles identiques seulement (même référence ; dans le doute, pas de regroupement), le 1er et le
            15 du mois à 12 h, les volumes des entreprises d&apos;un même département sont réunis et proposés aux négoces de la famille et aux négoces
            généralistes de la zone. Sous un volume minimum, aucun négoce n&apos;est consulté et vous choisissez la suite (cycle suivant ou demande perso). Le
            statut de votre participation évolue : intention, quantité confirmée, commande. Les négoces voient le volume et la zone, jamais votre nom ; sous 5
            entreprises, aucun nombre ni aucune ville n&apos;est affiché. Aucun meilleur prix n&apos;est garanti.
          </li>
          <li>
            <strong>Les regroupements négociés</strong> : vous déclarez un gros besoin (ardoise, zinc, bois, isolant, à la référence exacte) ; il rejoint ceux
            d&apos;autres entreprises du même département aux dates compatibles. Un chasseur d&apos;opportunités {NOM_APP} négocie par téléphone avec les négoces de
            la zone et vous propose une offre, le nom du négoce masqué jusqu&apos;à votre acceptation. Le prix affiché inclut la commission {NOM_APP}. « J&apos;accepte »
            vaut commande ferme sur votre quantité et vous recevez un bon de commande ; vous pouvez refuser sans motif. Sur ces commandes groupées, {NOM_APP} peut
            percevoir une commission du négoce.
          </li>
          <li>
            <strong>Les achats groupés</strong> : vous lancez un achat groupé (un matériau à la référence exacte, votre quantité, votre commune, votre date
            de besoin et au moins un négoce) ou vous rejoignez celui d&apos;une entreprise de votre secteur. Les entreprises du même métier et du même secteur
            en sont prévenues, sans votre nom. À la clôture, chaque négoce choisi reçoit une seule demande, de la part de ses seuls clients participants, avec le
            volume total, la référence exacte, les communes et les dates. Vous voyez l&apos;offre de votre négoce, la meilleure offre du groupe et l&apos;économie en
            euros ; le nom du négoce de la meilleure offre est réservé aux abonnés qui participent avec une quantité. Vous ne voyez jamais le nom ni le prix d&apos;un
            autre artisan. « Commander » envoie votre bon de commande au négoce : vous le payez directement, sur votre compte habituel ; {NOM_APP} ne touche jamais
            l&apos;argent et peut percevoir une commission du négoce. Avant la clôture, vous pouvez modifier ou retirer votre participation ; après, « Me désister »
            reste possible et est enregistré. Sans assez de volume ou sans offre comparable, votre demande part chez vos négoces en un clic. Les achats groupés
            sont réservés aux entreprises du bâtiment dont le SIRET est vérifié.
          </li>
          <li>
            <strong>L&apos;adresse {NOM_APP}</strong> : quand elle est ouverte sur votre compte, votre entreprise reçoit une adresse à son nom sur le domaine
            mobiiz.fr (par exemple bati-invest@mobiiz.fr), modifiable une fois, l&apos;ancienne restant redirigée 90 jours. Vos demandes aux négoces partent sous
            la forme « Votre entreprise via {NOM_APP} », et les réponses des négoces (e-mails et pièces jointes) arrivent à cette adresse : {NOM_APP} les range dans
            le chantier concerné et vous prévient. Ces e-mails sont traités comme vos autres données (politique de confidentialité) et ne sont lus par personne
            d&apos;autre que vous, sauf demande de votre part au support.
          </li>
          <li>
            <strong>Statistiques anonymes</strong> : les prix reçus servent, anonymisés et agrégés (moyennes arrondies sur 3 mois, par département, à partir de 2
            regroupements ou 5 réponses), à afficher des « prix observés dans ton secteur ». Jamais votre nom, ni celui d&apos;un négoce, ni un prix isolé.
          </li>
          <li>
            <strong>Sans engagement d&apos;achat</strong> : envoyer une demande ou rejoindre un regroupement ne vous oblige à rien. Vous commandez seulement si le prix
            vous plaît, en confirmant la commande dans l&apos;application.
          </li>
          <li>
            <strong>Gratuit et payant</strong> (article 3) : en gratuit, {LECTURES_GRATUITES} devis lus par mois, un négoce par demande, « Mes prix » sur les 3 derniers
            mois, pas de regroupement. Le payant ouvre les lectures sans limite, jusqu&apos;à 5 négoces par demande, les regroupements et tout l&apos;historique de
            « Mes prix ». Dans une zone qui démarre (moins de 10 artisans actifs), le payant est offert ; quand la zone franchit ce seuil, vous êtes prévenu 30 jours
            avant la fin de l&apos;offre. Le service est gratuit pour les négoces.
          </li>
        </ul>
      </section>

      <section id="abonnement" className="flex scroll-mt-24 flex-col gap-2">
        <h2 className={s.h2}>3. L&apos;abonnement</h2>
        <ul className={s.ul}>
          <li>
            <strong>Deux formules</strong>, au choix, payées d&apos;avance par carte bancaire (TVA en sus au taux en vigueur, 20 % aujourd&apos;hui) :
            <ul className="mt-1 list-disc pl-5">
              <li>
                <strong>Mensuelle</strong> : {PRIX_MENSUEL} HT par mois, sans engagement de durée.
              </li>
              <li>
                <strong>Annuelle</strong> : {PRIX_ANNUEL} HT par an, payés en une fois pour douze mois.
              </li>
            </ul>
            Une facture émise par {EDITEUR.nom} est disponible à chaque paiement dans « Mes factures ».
          </li>
          <li>
            <strong>Essai gratuit</strong> : de l&apos;inscription jusqu&apos;à 30 jours après les résultats de votre premier {nom} ; si vous ne déposez aucune liste,
            l&apos;essai s&apos;arrête 60 jours après l&apos;inscription. Aucune carte n&apos;est demandée pendant l&apos;essai et rien n&apos;est prélevé à sa fin sans
            votre accord.
          </li>
          <li>
            <strong>Après l&apos;essai, sans abonnement</strong> : votre compte passe en gratuit, avec ses plafonds (article 2). Restent accessibles votre historique,
            vos bons de commande, vos factures, vos données, votre compte. Une liste déposée pendant l&apos;essai reste dans son regroupement et ses résultats restent
            visibles.
          </li>
          <li>
            <strong>Renouvellement</strong> : la formule mensuelle se renouvelle chaque mois à la date anniversaire, sans engagement de durée. La formule
            annuelle se renouvelle automatiquement pour un an à sa date anniversaire, au prix alors en vigueur ; un e-mail vous rappelle la date et le montant 30
            jours avant le renouvellement.
          </li>
          <li>
            <strong>Passer du mois à l&apos;année</strong> : à tout moment, depuis « Mon abonnement ». La période annuelle commence le jour du passage ; la part non
            utilisée du mois en cours est déduite du premier paiement annuel, au prorata. Le passage de l&apos;année au mois n&apos;est pas proposé en cours
            d&apos;année : il suffit de résilier l&apos;annuel puis de choisir le mensuel à son échéance.
          </li>
          <li>
            <strong>Résiliation</strong> : à tout moment, en deux clics dans « Mon abonnement ». Elle prend effet à la fin de la période déjà payée (le mois en
            cours, ou l&apos;échéance de l&apos;année pour la formule annuelle), sans remboursement au prorata de la période commencée ; vous gardez l&apos;accès
            jusqu&apos;à cette date et une confirmation vous est envoyée par e-mail.
          </li>
          <li>
            <strong>Échec de paiement</strong> : si un paiement est refusé, vous êtes prévenu par e-mail et gardez l&apos;accès 7 jours pour mettre votre
            carte à jour ; passé ce délai, l&apos;accès est limité comme après l&apos;essai, jusqu&apos;au paiement.
          </li>
          <li>
            <strong>Pas de droit de rétractation</strong> : le service est conclu entre professionnels, pour les besoins de votre activité ; le droit de
            rétractation du code de la consommation ne s&apos;applique pas.
          </li>
          <li>
            <strong>Changement de prix</strong> : tout changement vous est annoncé par e-mail au moins 30 jours avant de s&apos;appliquer ; vous pouvez résilier
            avant cette date.
          </li>
          <li>Le paiement est traité par Stripe ; {EDITEUR.nom} ne voit ni ne garde jamais votre numéro de carte.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>4. BATI INVEST est un intermédiaire : ni vendeur ni acheteur</h2>
        <p className={s.p}>
          {EDITEUR.nom} met en relation des entreprises du bâtiment et des négoces, et peut négocier pour leur compte un prix sur des volumes regroupés. Ce rôle
          d&apos;intermédiaire est rémunéré par l&apos;abonnement des artisans et, sur les seuls regroupements négociés, par une commission versée par le négoce et
          déjà comprise dans le prix affiché (« Commission {NOM_APP} incluse dans le prix ») : vous ne payez jamais de commission en plus.
        </p>
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
        <h2 className={s.h2}>5. Les limites de la lecture automatique</h2>
        <p className={s.p}>
          Les listes et les devis sont lus par une intelligence artificielle, puis les quantités sont calculées par des règles écrites. L&apos;IA peut se tromper :
          mal lire une ligne, oublier un article, se tromper d&apos;unité. Chaque ligne reste modifiable et une ligne douteuse est signalée en orange, mais la
          liste qui part au négoce est celle que vous validez : relisez-la avant d&apos;envoyer et avant de commander. Les ratios des métiers que l&apos;application
          signale « en cours de validation » n&apos;ont pas encore été relus par un professionnel du métier. Le texte de vos documents est anonymisé avant
          d&apos;être lu ; il ne sert pas à entraîner les modèles du prestataire d&apos;IA.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>6. Concurrence</h2>
        <p className={s.p}>
          Les prix d&apos;un négoce ne sont jamais communiqués à un autre négoce, ni pendant ni après la consultation. Les artisans ne se voient pas : ni nom, ni
          chantier, ni prix obtenu. Le {nom} additionne des volumes, elle ne sert pas à vous coordonner avec d&apos;autres artisans : vous restez seul maître de vos
          achats, de vos prix de vente et de vos clients, et vous vous engagez à ne pas utiliser le service pour vous entendre avec d&apos;autres entreprises.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>7. Les documents que vous déposez</h2>
        <ul className={s.ul}>
          <li>
            Vous garantissez avoir le droit de transmettre chaque liste ou devis que vous déposez. Un devis peut contenir les coordonnées de votre client : {NOM_APP}
            les retire du texte avant de l&apos;enregistrer et avant toute lecture automatique, et ne garde que la commune du chantier (voir la{" "}
            <Link href="/confidentialite" className="font-semibold underline">
              politique de confidentialité
            </Link>
            ).
          </li>
          <li>
            Quand vous invitez un collègue, le message part de votre téléphone (WhatsApp, SMS ou lien copié) : {NOM_APP} n&apos;envoie rien et ne garde pas son numéro.
            Quand vous ajoutez votre négoce, {NOM_APP} lui écrit une seule fois pour l&apos;inviter, en disant qu&apos;un artisan de son secteur l&apos;a ajouté, sans votre
            nom.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>8. Responsabilité</h2>
        <p className={s.p}>
          {NOM_APP} est fourni avec le soin d&apos;un service en construction. La responsabilité de {EDITEUR.nom} est limitée aux dommages directs causés par une faute
          prouvée de sa part ; elle ne couvre ni une commande passée sur une quantité que vous n&apos;avez pas vérifiée, ni le fait d&apos;un négoce (prix, retard,
          défaut). Le service peut être interrompu pour maintenance ; vos données restent récupérables depuis Compte → Mes données.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>9. Votre compte, sa suspension et sa suppression</h2>
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
        <h2 className={s.h2}>10. Données, contact et droit applicable</h2>
        <p className={s.p}>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          . Pour toute question : {EDITEUR.contact}. Ces conditions sont soumises au droit français. En cas de litige, et après recherche d&apos;une solution amiable, le {TRIBUNAL} est seul compétent.
        </p>
      </section>
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
