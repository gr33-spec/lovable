import Link from "next/link";
import { ArrowRight, BookUser, Plus, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DemandeStatusBadge } from "@/components/demande/status-badge";
import { getDemandes } from "@/lib/demandes";
import { getCurrentUserId } from "@/lib/current-user";
import { formatDate } from "@/lib/utils";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

/** Écran Demande : liste des chantiers de l'artisan, du plus récent au plus ancien (§6.3, étape 7). */
export default async function DemandePage() {
  const userId = await getCurrentUserId();
  const demandes = await getDemandes(userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Mes chantiers</h1>

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/demande/nouvelle" fullWidth>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nouveau chantier
        </LinkButton>
        <LinkButton href="/demande/fournisseurs" variant="secondary" fullWidth>
          <BookUser className="h-5 w-5" aria-hidden="true" />
          Fournisseurs
        </LinkButton>
      </div>

      {demandes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {demandes.map((demande) => {
            const total = demande.destinataires.length;
            const repondus = demande.destinataires.filter((d) => d.repondu).length;
            const manquants = total - repondus;

            return (
              <Link key={demande.id} href={`/demande/${demande.id}`} className="block">
                <Card className="flex flex-col gap-3 transition-transform active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold">{demande.nom}</p>
                      <p className="truncate font-sans text-xs text-muted">
                        {demande.objet} · {formatDate(demande.createdAt)}
                      </p>
                    </div>
                    <DemandeStatusBadge status={demande.status} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <ProgressBar value={total > 0 ? repondus / total : 0} />
                    <p className="font-sans text-xs text-muted">
                      {repondus} / {total} devis reçu{repondus > 1 ? "s" : ""}
                    </p>
                  </div>

                  {manquants > 0 ? (
                    <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-accent">
                      Relancer les {manquants} manquant{manquants > 1 ? "s" : ""}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="flex items-start gap-2">
          <Send className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
          <p className="font-sans text-sm text-muted">
            Crée un chantier pour envoyer une demande de devis à tes fournisseurs et suivre leurs
            réponses au même endroit.
          </p>
        </Card>
      )}
    </div>
  );
}
