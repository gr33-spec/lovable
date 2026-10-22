import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux, styleLegal as s } from "@/components/legal";
import { PageTitle } from "@/components/ui";
import { EDITEUR } from "@/lib/legal";
import { NOM, nom } from "@/lib/nom";

export const metadata: Metadata = { title: "Conditions négoce — BatiClair" };

/**
 * Les conditions pour un négoce. Plan « finition » (Greg, 22 octobre) : la rémunération de BatiClair n'est pas encore décidée,
 * donc aucune clause chiffrée ici ; la page renvoie au contrat présenté sur la page de dépôt (`texteContrat`), seul à faire foi
 * sur ce point (voir `docs/A-FAIRE-RELIRE.md`).
 */
export default function ConditionsNegocePage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions négoce</PageTitle>
      <p className={s.p}>
        Vous recevez de BatiClair des demandes de prix de la « {NOM} » : plusieurs artisans d&apos;un même département, une même référence, un seul lot. Voici ce qui
        s&apos;applique si vous répondez.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>1. Objet</h2>
        <p className={s.p}>
          {EDITEUR.nom} (BatiClair) met en relation des artisans réunis dans la « {NOM} » et des négoces de matériaux. Vous répondez librement, par un
          devis, à une demande de prix de la {nom}.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>2. Votre devis et votre livraison</h2>
        <p className={s.p}>
          Vous déposez votre devis (PDF ou photo) sur la page reçue par e-mail, avec vos conditions de livraison : l&apos;adresse d&apos;où partent vos livraisons,
          la distance jusqu&apos;à laquelle la livraison est gratuite et le prix d&apos;une livraison au-delà. Votre devis est lu automatiquement ; BatiClair calcule
          la distance jusqu&apos;à chaque chantier et compare les devis livraison comprise. Le devis le moins cher livraison comprise, dans la fenêtre de
          livraison demandée, est retenu.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>3. Rémunération de BatiClair</h2>
        <p className={s.p}>
          Les conditions de rémunération de BatiClair sont celles du contrat présenté à côté de la case, sur la page de dépôt du devis. Elles ne
          s&apos;appliquent qu&apos;à un devis retenu.
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
          BatiClair garde votre nom, votre adresse e-mail, les familles de produits que vous vendez, l&apos;adresse de votre dépôt, vos conditions de
          livraison, vos devis déposés et vos accords. Pour les faire corriger ou effacer : le lien « stop », ou en écrivant à l&apos;éditeur (voir les{" "}
          <Link href="/mentions-legales" className="font-semibold underline">
            mentions légales
          </Link>
          ). Voir aussi la{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
      <LiensLegaux sauf="/conditions-negoce" />
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
