import type { Metadata } from "next";
import Link from "next/link";
import { ConditionsNegoceListe } from "@/components/conditions-negoce";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = { title: `Conditions négoces — ${NOM_APP}` };

/**
 * Les conditions pour les négoces (mise en conformité du 24 octobre 2026) : le même texte que l'espace négoce, une seule
 * source. Plus aucune commission chiffrée : la formulation unique « Aucun frais pour l'instant… » (`PHRASE_REMUNERATION_NEGOCE`).
 */
export default function ConditionsNegocePage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions négoces</PageTitle>
      <ConditionsNegoceListe />
      <p className={s.p}>
        Vous créez votre accès depuis le lien reçu par e-mail ; votre espace :{" "}
        <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">
          me connecter
        </Link>
        .
      </p>
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
