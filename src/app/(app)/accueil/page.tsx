import { AlertTriangle, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Verdict } from "@/components/ui/verdict";
import { AnalysisListItem } from "@/components/analysis-list-item";
import { getDashboardData } from "@/lib/analysis";
import { getCurrentUserId } from "@/lib/current-user";
import { getUsage, FREE_MONTHLY_LIMIT } from "@/lib/plan";
import { formatEuros } from "@/lib/utils";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

/** Écran Accueil : le chiffre d'abord, puis les actions et l'historique (§6.2). */
export default async function AccueilPage() {
  const userId = await getCurrentUserId();
  const [{ totalEconomise, economieDuMois, alertes, historique }, usage] = await Promise.all([
    getDashboardData(userId),
    getUsage(userId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Verdict
        tone="accent"
        label="Tu as économisé"
        amount={formatEuros(totalEconomise)}
        description={
          economieDuMois > 0
            ? `Dont ${formatEuros(economieDuMois)} ce mois-ci.`
            : "Compare des devis pour commencer à économiser."
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/analyser?mode=devis" fullWidth>
          Comparer des devis
        </LinkButton>
        <LinkButton href="/analyser?mode=facture" variant="secondary" fullWidth>
          Vérifier une facture
        </LinkButton>
      </div>

      {usage.plan === "free" ? (
        <Card className="flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-muted">
            {usage.used}/{FREE_MONTHLY_LIMIT} analyses gratuites ce mois-ci
          </p>
          {usage.atteinte ? (
            <LinkButton href="/compte" variant="ghost" className="px-3 py-2 text-sm">
              <Crown className="h-4 w-4" aria-hidden="true" />
              Pro
            </LinkButton>
          ) : null}
        </Card>
      ) : null}

      {alertes.length > 0 ? (
        <Card className="bg-red/10">
          <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
            <AlertTriangle className="h-5 w-5 text-red" aria-hidden="true" />
            À surveiller
          </p>
          <ul className="flex flex-col gap-2">
            {alertes.map((alerte) => (
              <li key={alerte.id} className="font-sans text-sm">
                {alerte.resume || `Trop-payé de ${formatEuros(alerte.montant)} détecté.`}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div>
        <p className="mb-2 font-display text-sm font-bold">Tes dernières analyses</p>
        {historique.length > 0 ? (
          <div className="flex flex-col gap-2">
            {historique.map((analysis) => (
              <AnalysisListItem key={analysis.id} analysis={analysis} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="font-sans text-sm text-muted">
              Dépose ton premier devis pour voir tes analyses ici.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
