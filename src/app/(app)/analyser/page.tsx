import { Card } from "@/components/ui/card";

export default function AnalyserPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Analyser</h1>
      <Card>
        <p className="font-sans text-sm text-muted">
          Compare tes devis ou vérifie une facture : cet écran arrive à
          l&apos;étape suivante.
        </p>
      </Card>
    </div>
  );
}
