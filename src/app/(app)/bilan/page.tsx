import { Card } from "@/components/ui/card";

export default function BilanPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Bilan</h1>
      <Card>
        <p className="font-sans text-sm text-muted">
          Le prix moyen de tes produits et tes économies de l&apos;année
          s&apos;afficheront ici.
        </p>
      </Card>
    </div>
  );
}
