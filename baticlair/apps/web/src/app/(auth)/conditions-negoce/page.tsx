import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux, styleLegal as s } from "@/components/legal";
import { PageTitle } from "@/components/ui";
import { EDITEUR } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions négoce — BatiClair" };

/**
 * Les conditions pour un négoce (reprend le contrat d'apporteur d'affaires à 2 %, celui du PDF à côté de la case sur la page
 * de dépôt). Le texte de référence est celui du domaine (`texteContrat`) ; cette page le dit en clair, avec le même fond.
 */
export default function ConditionsNegocePage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions négoce</PageTitle>
      <p className={s.p}>
        Vous recevez de BatiClair des demandes de prix groupées : plusieurs artisans d&apos;un même département, une même référence, un seul lot. Voici ce qui
        s&apos;applique si vous répondez.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>1. Objet</h2>
        <p className={s.p}>
          {EDITEUR.nom} (BatiClair) met en relation des artisans regroupés (« Regroupement artisans ») et des négoces de matériaux. Vous répondez librement, par un
          devis, à une demande de prix groupée.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>2. Commission</h2>
        <p className={s.p}>
          Si votre devis est retenu pour un lot, vous versez à BatiClair une commission d&apos;apporteur d&apos;affaires de <strong>2 % du montant hors taxes du lot</strong>,
          c&apos;est-à-dire de la somme des bons de commande des artisans du lot passés chez vous au tarif groupé. Intégrez-la à votre prix.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>3. Facturation</h2>
        <p className={s.p}>
          La commission est facturée par BatiClair au moment de la transmission des bons de commande, payable à 30 jours, TVA en sus. Une relance automatique est envoyée
          après l&apos;échéance.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>4. Aucun autre frais</h2>
        <p className={s.p}>
          Répondre est gratuit ; un devis non retenu ne donne lieu à aucune facturation. BatiClair n&apos;encaisse aucun paiement de commande, n&apos;est ni acheteur ni
          revendeur, et ne porte aucun risque d&apos;impayé des artisans : chaque artisan commande sur son propre compte chez vous.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>5. Acceptation</h2>
        <p className={s.p}>
          L&apos;acceptation se fait en cochant la case sur la page de dépôt du devis ; la date, l&apos;adresse e-mail et l&apos;adresse IP de l&apos;acceptation sont
          enregistrées. Sans acceptation, le devis n&apos;est pas pris en compte.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>6. Retrait</h2>
        <p className={s.p}>
          Vous pouvez à tout moment cesser de recevoir des demandes (lien « stop » dans chaque e-mail, ou « pas concerné » pour une famille de produits) ; les
          commissions dues sur les lots déjà retenus restent dues.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>7. Vos données</h2>
        <p className={s.p}>
          BatiClair garde votre nom, votre adresse e-mail, les familles de produits que vous vendez, vos devis déposés et vos accords. Pour les faire corriger ou
          effacer : le lien « stop », ou un e-mail à l&apos;éditeur. Voir la{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
      <LiensLegaux sauf="/conditions-negoce" />
    </article>
  );
}
