import { Truck } from "lucide-react";
import { EmptyState, PageTitle } from "@/components/ui";

export default function FournisseursPage() {
  return (
    <>
      <PageTitle>Fournisseurs</PageTitle>
      <EmptyState icon={<Truck size={40} />} title="Bientôt ici">
        <p className="max-w-xs text-[15px] text-muted">
          Votre carnet de fournisseurs : appel en un geste, historique des devis. Ils se créeront aussi tout seuls à la
          réception de leur premier devis.
        </p>
      </EmptyState>
    </>
  );
}
