import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { codeInvitationValide, PHRASE_DISPONIBILITE } from "../../../../../../../packages/domain/src/inscription/liste-attente";

/** Une page d'invitation n'est jamais indexée : elle porte un code personnel. */
export const metadata: Metadata = { title: "Invitation · Mobiiz", robots: { index: false, follow: false } };

/**
 * CHANTIER 05 (Greg, 28 novembre 2026) : l'arrivée par le lien qu'un artisan a partagé. Rien sur celui qui invite (ni nom,
 * ni adresse) : la page présente Mobiiz, dit la disponibilité réelle sans date, et garde le code jusqu'à l'inscription.
 * Un code faux mène à la même page, sans code.
 */
export default async function Invitation({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const valide = codeInvitationValide(code.toLowerCase());
  const commencer = valide ? `/commencer?invitation=${code.toLowerCase()}` : "/commencer";
  return (
    <section className="flex flex-col gap-5" aria-labelledby="t-invitation">
      <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Mobiiz</p>
      <h1 id="t-invitation" className="text-[30px] leading-tight font-extrabold tracking-tight">
        Un artisan t&apos;invite à découvrir Mobiiz.
      </h1>
      <p className="text-[17px] leading-relaxed">
        Par des artisans, pour les artisans : prépare ta liste de matériaux, compare tes négoces et achète en groupe avec les artisans de ton
        secteur. Plus on est, moins on paie.
      </p>
      <p className="text-[15px] leading-relaxed text-muted">{PHRASE_DISPONIBILITE}</p>
      <ButtonLink href={commencer} className="self-stretch sm:self-start">
        Commencer
      </ButtonLink>
      <p className="text-[15px]">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-accent-text underline">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
