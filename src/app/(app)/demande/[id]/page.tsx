import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CheckCircle2, Clock, Mail, Paperclip, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DemandeStatusBadge } from "@/components/demande/status-badge";
import { ChantierAnalyse } from "@/components/demande/chantier-analyse";
import { getDemande, relancerFournisseur, relancerTousFournisseurs, MAX_RELANCES } from "@/lib/demandes";
import { getSuppliers } from "@/lib/suppliers";
import { getCurrentUserId } from "@/lib/current-user";
import { formatDate } from "@/lib/utils";
import type { ComparisonResult, ExtractedDocument, LigneArticle } from "@/lib/ai/types";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

interface DemandeDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Fiche d'un chantier : suivi des devis reçus, relances et comparaison IA (étape 7+). */
export default async function DemandeDetailPage({ params }: DemandeDetailPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const [demande, suppliers] = await Promise.all([getDemande(userId, id), getSuppliers(userId)]);

  if (!demande) {
    notFound();
  }

  const total = demande.destinataires.length;
  const repondus = demande.destinataires.filter((d) => d.repondu).length;
  const aRelancer = demande.destinataires.filter((d) => !d.repondu && d.relances < MAX_RELANCES);

  const supplierEmails: Record<string, string> = {};
  for (const supplier of suppliers) {
    supplierEmails[supplier.nom.toLowerCase()] = supplier.email;
  }

  const derniereAnalyse = demande.analyses[0] ?? null;
  const initialResult = derniereAnalyse ? (derniereAnalyse.resultJson as unknown as ComparisonResult) : null;
  const initialExtracted: ExtractedDocument[] = derniereAnalyse
    ? derniereAnalyse.extractedDocs.map((doc) => ({
        fournisseur: doc.fournisseur,
        date: doc.date,
        lignes: doc.lignesJson as unknown as LigneArticle[],
        totalHT: doc.totalHT,
        totalTTC: doc.totalTTC,
        fraisLivraison: 0,
        validite: "",
        conditionsPaiement: "",
      }))
    : [];

  /** Relance un fournisseur précis (bouton "Relancer", limité à MAX_RELANCES). */
  async function relancerUn(destinataireId: string) {
    "use server";
    const userId = await getCurrentUserId();
    await relancerFournisseur(userId, id, destinataireId);
    revalidatePath(`/demande/${id}`);
  }

  /** Relance tous les fournisseurs n'ayant pas encore répondu. */
  async function relancerTous() {
    "use server";
    const userId = await getCurrentUserId();
    await relancerTousFournisseurs(userId, id);
    revalidatePath(`/demande/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/demande" className="inline-flex items-center gap-1 font-sans text-sm text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </Link>

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-black">{demande.nom}</h1>
        <DemandeStatusBadge status={demande.status} className="mt-1" />
      </div>
      <p className="font-sans text-xs text-muted">
        {demande.objet} · Envoyée le {formatDate(demande.createdAt)}
      </p>

      <div className="flex flex-col gap-1.5">
        <ProgressBar value={total > 0 ? repondus / total : 0} />
        <p className="font-sans text-sm font-semibold">
          {repondus} / {total} devis reçu{repondus > 1 ? "s" : ""}
        </p>
      </div>

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
                    ? `Devis reçu le ${formatDate(destinataire.reponduAt)}`
                    : destinataire.relances > 0
                      ? `En attente · relancé ${destinataire.relances} fois`
                      : "En attente de réponse"}
                </p>
              </div>
              {destinataire.repondu ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green" aria-hidden="true" />
              ) : destinataire.relances < MAX_RELANCES ? (
                <form action={relancerUn.bind(null, destinataire.id)}>
                  <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                    Relancer
                  </Button>
                </form>
              ) : (
                <Clock className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              )}
            </Card>
          ))}
        </div>
      </div>

      {aRelancer.length > 0 ? (
        <form action={relancerTous}>
          <Button type="submit" variant="secondary" fullWidth>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Relancer tous les manquants ({aRelancer.length})
          </Button>
        </form>
      ) : null}

      {demande.reponses.length > 0 ? (
        <div>
          <p className="mb-2 font-display text-sm font-bold">Devis reçus</p>
          <div className="flex flex-col gap-2">
            {demande.reponses.map((reponse) => (
              <Card key={reponse.id} className="flex flex-col gap-1">
                <p className="font-sans text-sm font-semibold">{reponse.fromEmail}</p>
                <p className="font-sans text-xs text-muted">{formatDate(reponse.receivedAt)}</p>
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

      <ChantierAnalyse
        demandeId={id}
        reponsesCount={demande.reponses.length}
        lastAnalysisReponses={demande.lastAnalysisReponses}
        initialResult={initialResult}
        initialExtracted={initialExtracted}
        supplierEmails={supplierEmails}
      />
    </div>
  );
}
