import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NouvelleDemandeForm } from "@/components/demande/nouvelle-demande-form";
import { getSuppliers } from "@/lib/suppliers";
import { getCurrentUserId } from "@/lib/current-user";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

/** Formulaire de création d'un chantier : demande de devis envoyée aux fournisseurs (étape 7). */
export default async function NouvelleDemandePage() {
  const userId = await getCurrentUserId();
  const suppliers = await getSuppliers(userId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/demande" className="inline-flex items-center gap-1 font-sans text-sm text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </Link>
      <h1 className="font-display text-2xl font-black">Nouveau chantier</h1>
      <NouvelleDemandeForm suppliers={suppliers} />
    </div>
  );
}
