import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Clock, Mail, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemandeStatusBadge } from "@/components/demande/status-badge";
import { getDemande, markComparee } from "@/lib/demandes";
import { getCurrentUserId } from "@/lib/current-user";
import { formatDate } from "@/lib/utils";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

interface DemandeDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Détail d'une demande de devis : destinataires, réponses reçues et relances (étape 7). */
export default async function DemandeDetailPage({ params }: DemandeDetailPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const demande = await getDemande(userId, id);

  if (!demande) {
    notFound();
  }

  async function comparer() {
    "use server";
    const userId = await getCurrentUserId();
    await markComparee(userId, id);
    revalidatePath(`/demande/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/demande" className="inline-flex items-center gap-1 font-sans text-sm text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </Link>

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-black">{demande.objet}</h1>
        <DemandeStatusBadge status={demande.status} className="mt-1" />
      </div>
      <p className="font-sans text-xs text-muted">
        Envoyée le {formatDate(demande.createdAt)}
        {demande.relances > 0
          ? ` · ${demande.relances} relance${demande.relances > 1 ? "s" : ""}`
          : ""}
      </p>

      <Card>
        <p className="mb-2 font-display text-sm font-bold">Produits / prestations</p>
        <p className="whitespace-pre-wrap font-sans text-sm">{demande.produitsText}</p>
      </Card>

      <div>
        <p className="mb-2 font-display text-sm font-bold">Fournisseurs contactés</p>
        <div className="flex flex-col gap-2">
          {demande.destinataires.map((destinataire) => (
            <Card key={destinataire.id} className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-semibold">{destinataire.email}</p>
                <p className="font-sans text-xs text-muted">
                  {destinataire.repondu && destinataire.reponduAt
                    ? `Répondu le ${formatDate(destinataire.reponduAt)}`
                    : "En attente de réponse"}
                </p>
              </div>
              {destinataire.repondu ? (
                <span className="shrink-0 font-sans text-xs font-bold text-green">Reçu</span>
              ) : (
                <Clock className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              )}
            </Card>
          ))}
        </div>
      </div>

      {demande.reponses.length > 0 ? (
        <div>
          <p className="mb-2 font-display text-sm font-bold">Réponses reçues</p>
          <div className="flex flex-col gap-2">
            {demande.reponses.map((reponse) => (
              <Card key={reponse.id} className="flex flex-col gap-1">
                <p className="font-sans text-sm font-semibold">{reponse.fromEmail}</p>
                <p className="font-sans text-xs text-muted">{formatDate(reponse.receivedAt)}</p>
                {reponse.subject ? <p className="font-sans text-sm">{reponse.subject}</p> : null}
                {reponse.attachments.length > 0 ? (
                  <div className="mt-1 flex flex-col gap-1">
                    {reponse.attachments.map((attachment) => (
                      <span
                        key={attachment}
                        className="inline-flex items-center gap-1 font-sans text-xs text-blue"
                      >
                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                        {attachment}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {demande.status !== "comparee" && demande.reponses.length > 0 ? (
        <form action={comparer}>
          <Button type="submit" variant="secondary" fullWidth>
            Marquer comme comparée
          </Button>
        </form>
      ) : null}
    </div>
  );
}
