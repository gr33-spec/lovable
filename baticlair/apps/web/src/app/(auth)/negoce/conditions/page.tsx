import Link from "next/link";
import { ConditionsNegoceListe } from "@/components/conditions-negoce";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { NOM, NOM_APP } from "@/lib/nom";

/**
 * LES CONDITIONS DE LA COMMANDE COMMUNE POUR UN NÉGOCE (Greg, 23 octobre 2026, point 7 ; mise en conformité du 24
 * octobre) : en français simple, vouvoyées, versionnées. L'inscription enregistre la version acceptée ; une nouvelle
 * version majeure est redemandée avant le prochain dépôt. À relire par l'avocat (`docs/A-FAIRE-RELIRE.md`).
 */
export default function ConditionsNegoceCommandePage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions de la {NOM}</PageTitle>
      <ConditionsNegoceListe />
      <p className={s.p}>
        Une question : répondez à un e-mail reçu de {NOM_APP}. Votre espace :{" "}
        <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">
          me connecter
        </Link>
        .
      </p>
    </article>
  );
}
