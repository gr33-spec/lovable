import type { Metadata } from "next";
import Link from "next/link";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { EDITEUR, HEBERGEUR, HEBERGEUR_BASE } from "@/lib/legal";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = { title: `Mentions légales — ${NOM_APP}` };

/**
 * Les mentions légales (LCEN, article 6-III ; Greg, 24 octobre 2026). Les informations du Kbis que seul Greg peut donner
 * portent le repère « [A COMPLETER] » : la construction de production échoue tant qu'il en reste un.
 */
export default function MentionsLegalesPage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Mentions légales</PageTitle>
      <p className="text-sm text-muted">Version du 26/10/2026.</p>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Éditeur</h2>
        <p className={s.p}>Service édité par {EDITEUR.nom}.</p>
        <p className={s.p}>
          {EDITEUR.produit} est édité par {EDITEUR.nom}, {EDITEUR.forme} au capital de {EDITEUR.capital} €, immatriculée au RCS de {EDITEUR.rcs} sous le numéro {EDITEUR.siren}, SIRET{" "}
          {EDITEUR.siret}, dont le siège est situé {EDITEUR.adresse}. TVA intracommunautaire {EDITEUR.tva}.
        </p>
        <p className={s.p}>Directeur de la publication : {EDITEUR.directeurPublication}.</p>
      </section>
      <section id="contact" className="flex scroll-mt-24 flex-col gap-2">
        <h2 className={s.h2}>Contact</h2>
        <p className={s.p}>
          Par e-mail : {EDITEUR.contact}. Par courrier : {EDITEUR.nom}, {EDITEUR.adresse}. Les demandes sur vos données personnelles reçoivent une réponse dans un délai
          d&apos;un mois.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Hébergeurs</h2>
        <p className={s.p}>
          Site et application : {HEBERGEUR.nom}, {HEBERGEUR.adresse} ({HEBERGEUR.site}), serveurs à {HEBERGEUR.serveurs}.
        </p>
        <p className={s.p}>
          Base de données : {HEBERGEUR_BASE.nom}, {HEBERGEUR_BASE.adresse} ({HEBERGEUR_BASE.site}), serveurs à {HEBERGEUR_BASE.serveurs}.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Propriété</h2>
        <p className={s.p}>
          Le nom {NOM_APP}, l&apos;application et ses référentiels métier appartiennent à {EDITEUR.nom}. Les listes et les devis que vous déposez restent les vôtres :
          {NOM_APP} les lit pour vous rendre le service, rien d&apos;autre.
        </p>
      </section>
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
