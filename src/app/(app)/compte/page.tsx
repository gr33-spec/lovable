import { CircleUserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Mon compte</h1>

      <Card className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper">
          <CircleUserRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-sans text-xs text-muted">Connecté avec</p>
          <p className="truncate font-sans text-sm font-semibold">
            {session?.user?.email}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="font-sans text-sm text-muted">
          Abonnement : arrivée à une étape suivante.
        </p>
      </Card>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/connexion" });
        }}
      >
        <Button type="submit" variant="secondary" fullWidth>
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
