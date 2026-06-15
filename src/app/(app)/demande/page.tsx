import Link from "next/link";
import { BookUser, Plus, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { DemandeStatusBadge } from "@/components/demande/status-badge";
import { getDemandes } from "@/lib/demandes";
import { getCurrentUserId } from "@/lib/current-user";
import { formatDate } from "@/lib/utils";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

/** Écran Demande : liste des demandes de devis envoyées aux fournisseurs (§6.3, étape 7). */
export default async function DemandePage() {
  const userId = await getCurrentUserId();
  const demandes = await getDemandes(userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-black">Demande</h1>

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/demande/nouvelle" fullWidth>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nouvelle demande
        </LinkButton>
        <LinkButton href="/demande/fournisseurs" variant="secondary" fullWidth>
          <BookUser className="h-5 w-5" aria-hidden="true" />
          Fournisseurs
        </LinkButton>
      </div>

      {demandes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {demandes.map((demande) => {
            const repondus = demande.destinataires.filter((d) => d.repondu).length;
            return (
              <Link key={demande.id} href={`/demande/${demande.id}`} className="block">
                <Card className="flex items-center gap-3 transition-transform active:scale-[0.98]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold">{demande.objet}</p>
                    <p className="truncate font-sans text-xs text-muted">
                      {formatDate(demande.createdAt)} · {repondus}/{demande.destinataires.length} réponse
                      {repondus > 1 ? "s" : ""}
                    </p>
                  </div>
                  <DemandeStatusBadge status={demande.status} />
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="flex items-start gap-2">
          <Send className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
          <p className="font-sans text-sm text-muted">
            Envoie une demande de devis à tes fournisseurs pour comparer leurs prix.
          </p>
        </Card>
      )}
    </div>
  );
}
