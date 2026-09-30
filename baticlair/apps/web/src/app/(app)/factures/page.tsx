import { ReceiptText } from "lucide-react";
import { EmptyState, PageTitle } from "@/components/ui";

export default function FacturesPage() {
  return (
    <>
      <PageTitle>Factures</PageTitle>
      <EmptyState icon={<ReceiptText size={40} />} title="Bientôt ici">
        <p className="max-w-xs text-[15px] text-muted">
          Ajoutez vos factures fournisseurs, même en vrac : je repérerai les hausses de prix, les remises qui
          disparaissent et les écarts avec les devis acceptés.
        </p>
      </EmptyState>
    </>
  );
}
