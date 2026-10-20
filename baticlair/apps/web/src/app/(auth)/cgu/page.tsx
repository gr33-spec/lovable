import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux, styleLegal as s } from "@/components/legal";
import { PageTitle } from "@/components/ui";
import { EDITEUR, VERSION_CGU } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions générales d'utilisation — BatiClair" };

/** Les CGU artisan, en mots simples : ce que fait le service, ce que vous vous engagez à faire, ce qui est gratuit, ce qui ne l'est pas. */
export default function CguPage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions générales d&apos;utilisation</PageTitle>
      <p className="text-sm text-muted">Version du {VERSION_CGU.split("-").reverse().join("/")}. Elles s&apos;appliquent à tout compte créé sur BatiClair.</p>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>1. Le service</h2>
        <p className={s.p}>
          BatiClair, édité par {EDITEUR.nom}, lit les devis que vous déposez, en sort la liste des fournitures à commander, prépare vos demandes de prix à vos
          fournisseurs et, si vous le souhaitez, regroupe vos commandes avec celles d&apos;autres artisans de votre département (« BatiClair Groupé »).
        </p>
        <p className={s.p}>
          Les quantités sont calculées à partir du devis et de référentiels métier. Elles sont une aide : vous restez responsable de ce que vous commandez et de
          ce que vous facturez à votre client. Une ligne marquée « à préciser » ou « à vérifier » attend votre décision.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>2. Votre compte</h2>
        <ul className={s.ul}>
          <li>Un compte par personne, rattaché à une entreprise du bâtiment. Vous gardez votre mot de passe pour vous.</li>
          <li>Les informations de l&apos;entreprise (nom, adresse, SIRET) doivent être exactes : le SIRET est vérifié auprès de l&apos;INSEE avant l&apos;accès au groupé.</li>
          <li>Vous pouvez supprimer votre compte à tout moment depuis Compte → Mes données : tout est effacé.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>3. Le groupé</h2>
        <ul className={s.ul}>
          <li>Gratuit pour l&apos;artisan : aucun abonnement, aucune commission sur vos achats. Le négoce retenu verse 2 % du montant HT du lot à BatiClair.</li>
          <li>
            « Chantier signé » est un engagement ferme : en le cochant, vous vous engagez à commander ces quantités au prix groupé obtenu, chez le négoce retenu. Vous
            pouvez retirer une ligne tant que la demande n&apos;est pas partie aux négoces.
          </li>
          <li>
            Vous commandez sur votre propre compte chez le négoce, qui vous livre et vous facture. BatiClair ne vend rien, n&apos;encaisse rien et ne porte pas la
            commande.
          </li>
          <li>
            Ne pas commander après un bon de commande transmis est un désistement : un avertissement la première fois, puis la fermeture du groupé pendant six mois au
            deuxième désistement sur douze mois. Le négoce en est informé.
          </li>
          <li>Les autres artisans ne voient ni votre nom ni vos chantiers ; vous ne voyez pas les leurs.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>4. Prix et essai</h2>
        <p className={s.p}>
          La lecture des devis est proposée avec un essai gratuit, puis des formules par nombre de chantiers, affichées dans l&apos;application avant tout paiement. Les
          prix affichés sont hors taxes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>5. Responsabilité</h2>
        <p className={s.p}>
          BatiClair est fourni tel quel, avec le soin d&apos;un service en construction. {EDITEUR.nom} n&apos;est pas responsable d&apos;une commande passée sur une quantité
          que vous n&apos;avez pas vérifiée, ni d&apos;un retard ou d&apos;un défaut de livraison d&apos;un négoce. Le service peut être interrompu pour maintenance ; vos données
          restent récupérables depuis Compte → Mes données.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>6. Données et droit applicable</h2>
        <p className={s.p}>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          . Ces conditions sont soumises au droit français ; en cas de litige, les tribunaux compétents sont ceux du siège de {EDITEUR.nom}, après recherche d&apos;une
          solution amiable.
        </p>
      </section>

      <LiensLegaux sauf="/cgu" />
      <Link href="/inscription" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour
      </Link>
    </article>
  );
}
