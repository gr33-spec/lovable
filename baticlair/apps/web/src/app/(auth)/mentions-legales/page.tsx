import type { Metadata } from "next";
import Link from "next/link";
import { LiensLegaux, styleLegal as s } from "@/components/legal";
import { PageTitle } from "@/components/ui";
import { EDITEUR, HEBERGEUR } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales — BatiClair" };

export default function MentionsLegalesPage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Mentions légales</PageTitle>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Éditeur</h2>
        <p className={s.p}>
          {EDITEUR.produit} est édité par {EDITEUR.nom}, {EDITEUR.forme}, SIRET {EDITEUR.siret}, {EDITEUR.adresse}. TVA intracommunautaire {EDITEUR.tva}.
        </p>
        <p className={s.p}>Contact : par courrier à l&apos;adresse ci-dessus, ou en répondant à un e-mail reçu de BatiClair.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Hébergeur</h2>
        <p className={s.p}>
          {HEBERGEUR.nom}, {HEBERGEUR.adresse} ({HEBERGEUR.site}). Les serveurs de l&apos;application sont en Union européenne (Francfort). La base de données est hébergée par Neon, également à Francfort.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Propriété</h2>
        <p className={s.p}>
          Le nom BatiClair, l&apos;application et ses référentiels métier appartiennent à {EDITEUR.nom}. Les listes et les devis que vous déposez restent les vôtres :
          BatiClair les lit pour vous rendre le service, rien d&apos;autre.
        </p>
      </section>
      <LiensLegaux sauf="/mentions-legales" />
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
