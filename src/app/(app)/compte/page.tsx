import { CircleUserRound, Crown, PartyPopper, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/current-user";
import { getUsage, FREE_MONTHLY_LIMIT } from "@/lib/plan";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

type ComptePageProps = {
  searchParams: Promise<{ abonnement?: string }>;
};

export default async function ComptePage({ searchParams }: ComptePageProps) {
  const userId = await getCurrentUserId();
  const [session, usage, { abonnement }] = await Promise.all([
    auth(),
    getUsage(userId),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Mon compte</h1>

      {abonnement === "succes" ? (
        <Card className="flex items-center gap-2 bg-green/10">
          <PartyPopper className="h-5 w-5 shrink-0 text-green" aria-hidden="true" />
          <p className="font-sans text-sm">Abonnement Pro activé. Merci !</p>
        </Card>
      ) : null}

      {abonnement === "annule" ? (
        <Card>
          <p className="font-sans text-sm text-muted">
            Paiement annulé. Tu peux réessayer quand tu veux.
          </p>
        </Card>
      ) : null}

      {abonnement === "indisponible" ? (
        <Card>
          <p className="font-sans text-sm text-muted">
            Le paiement n&apos;est pas encore configuré. Réessaie plus tard.
          </p>
        </Card>
      ) : null}

      {abonnement === "erreur" ? (
        <Card>
          <p className="font-sans text-sm text-muted">
            Une erreur est survenue. Réessaie.
          </p>
        </Card>
      ) : null}

      <Card className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <CircleUserRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-sans text-xs text-muted">Connecté avec</p>
          <p className="truncate font-sans text-sm font-semibold">
            {session?.user?.email}
          </p>
        </div>
      </Card>

      {usage.plan === "pro" ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber" aria-hidden="true" />
            <p className="font-display text-base font-bold">Plan Pro</p>
          </div>
          <p className="font-sans text-sm text-muted">
            Analyses illimitées. Merci de soutenir BatiClair !
          </p>
          <form action="/api/stripe/portal" method="post">
            <Button type="submit" variant="secondary" fullWidth>
              Gérer mon abonnement
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue" aria-hidden="true" />
            <p className="font-display text-base font-bold">Plan gratuit</p>
          </div>
          <p className="font-sans text-sm text-muted">
            {usage.used}/{FREE_MONTHLY_LIMIT} analyses utilisées ce mois-ci.
          </p>
          <form action="/api/stripe/checkout" method="post">
            <Button type="submit" fullWidth>
              Passer au plan Pro
            </Button>
          </form>
        </Card>
      )}

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
