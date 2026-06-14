import { Card } from "@/components/ui/card";

export default function DemandePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Demande</h1>
      <Card>
        <p className="font-sans text-sm text-muted">
          Envoie une demande de devis à tes fournisseurs depuis cet écran
          (bientôt disponible).
        </p>
      </Card>
    </div>
  );
}
