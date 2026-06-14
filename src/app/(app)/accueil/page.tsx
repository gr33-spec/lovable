import { Card } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";

export default function AccueilPage() {
  return (
    <div className="flex flex-col gap-4">
      <Verdict
        tone="amber"
        label="Tu as économisé"
        amount="0 €"
        description="Dépose ton premier devis pour voir tes économies ici."
      />
      <Card>
        <p className="font-sans text-sm text-muted">
          Ton historique d&apos;analyses et tes alertes s&apos;afficheront ici.
        </p>
      </Card>
    </div>
  );
}
