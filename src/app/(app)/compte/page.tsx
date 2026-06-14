import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export default function ComptePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Mon compte</h1>
      <Card className="flex flex-col gap-2">
        <p className="font-sans text-sm text-muted">
          Connexion, abonnement et déconnexion arrivent à une étape
          suivante.
        </p>
      </Card>
      <LinkButton href="/connexion" variant="secondary">
        Se connecter
      </LinkButton>
    </div>
  );
}
