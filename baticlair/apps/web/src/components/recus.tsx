"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, Skeleton } from "@/components/ui";
import { api, messageErreur, type DemandePartie, type DemandesPourClasser, type EmailRecu } from "@/lib/api";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/** R7 : la carte d'un e-mail reçu sur l'adresse Mobiiz (page « Mes reçus » et bloc « Reçu par e-mail » du chantier). */
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Une réponse reçue par e-mail (Greg, 12 novembre 2026, dossier de corrections UX, point 3). Reconnue, elle est déjà dans
 * son quantitatif : la carte dit où et permet de corriger. Non reconnue, Mobiiz PROPOSE la demande la plus probable, dit
 * pourquoi, et l'artisan confirme ou choisit : rien n'est jamais classé en silence.
 */
export function RecuCard({ email, onChange, compact = false }: { email: EmailRecu; onChange: (e: EmailRecu) => void; compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  async function detacher() {
    setPending(true);
    setRefus(null);
    try {
      onChange(await api<EmailRecu>(`/v1/recus/${encodeURIComponent(email.id)}/detacher`, { method: "POST", body: {} }));
    } catch (e) {
      setRefus(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold break-words">{email.demande ? email.demande.negoce : email.expediteur}</p>
          <p className="truncate text-[14px] text-muted">{email.objet || "(sans objet)"}</p>
        </div>
        <span className="shrink-0 text-[12px] text-muted">{dateCourte(email.recuLe)}</span>
      </div>
      {email.texte ? <p className={`text-[14px] leading-relaxed break-words whitespace-pre-line ${compact || email.demande ? "line-clamp-3" : "line-clamp-6"}`}>{email.texte}</p> : null}
      {email.fichiers.length || email.tropLourdes.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Pièces jointes">
          {email.fichiers.map((f) => (
            <li key={f.id} className="max-w-full">
              <button
                type="button"
                onClick={() => openFile({ url: `/v1/recus/${encodeURIComponent(email.id)}/fichiers/${encodeURIComponent(f.id)}`, title: f.nom, fileName: f.nom })}
                className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[14px] font-bold"
              >
                <FileText size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{f.nom}</span>
                {f.devisRecu ? <span className="shrink-0 text-[12px] font-semibold text-muted">· devis reçu</span> : null}
              </button>
            </li>
          ))}
          {email.tropLourdes.map((nom) => (
            <li key={nom} className="inline-flex min-h-11 items-center text-[13px] text-muted">
              {nom} (trop lourd, non gardé)
            </li>
          ))}
        </ul>
      ) : null}
      {email.demande ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-ok-bg px-3 py-2">
          <p className="text-[14px] font-bold text-ok">
            Classée dans {email.demande.chantier ? `« ${email.demande.chantier} »` : "son quantitatif"} · {email.demande.negoce}
          </p>
          {!compact ? (
            <div className="flex flex-wrap items-center gap-x-4">
              <Link href={`/chantiers/${encodeURIComponent(email.demande.projectId)}#fournisseurs`} className="inline-flex min-h-11 items-center text-[14px] font-bold underline underline-offset-4">
                Voir la proposition
              </Link>
              <button type="button" onClick={() => void detacher()} disabled={pending} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-muted underline underline-offset-4 disabled:opacity-60">
                Ce n&apos;est pas la bonne demande
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <Classer email={email} onDone={onChange} />
      )}
      {refus ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {refus}
        </p>
      ) : null}
    </Card>
  );
}

/** Classer une réponse non reconnue : la proposition de Mobiiz et sa raison, sinon le choix parmi les demandes récentes. */
function Classer({ email, onDone }: { email: EmailRecu; onDone: (e: EmailRecu) => void }) {
  const charger = useCallback((signal: AbortSignal) => api<DemandesPourClasser>(`/v1/recus/demandes?email=${encodeURIComponent(email.id)}`, { signal }), [email.id]);
  const { data, error, reload } = useResource(charger);
  const [choisir, setChoisir] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  async function classer(d: DemandePartie) {
    if (pending) return;
    setPending(d.recipientId);
    setRefus(null);
    try {
      onDone(await api<EmailRecu>(`/v1/recus/${encodeURIComponent(email.id)}/rattacher`, { method: "POST", body: { recipientId: d.recipientId } }));
    } catch (e) {
      setRefus(messageErreur(e));
      setPending(null);
    }
  }
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={2} label="Recherche de la demande…" />;
  const proposee = data.suggestion ? (data.items.find((d) => d.recipientId === data.suggestion!.recipientId) ?? null) : null;
  const resume = (d: DemandePartie) => `${d.envoyeeLe ? `Envoyée le ${dateCourte(d.envoyeeLe)}` : "Envoyée"}${d.etat ? ` · ${d.etat}` : ""}`;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-ground p-3" role="group" aria-label="Classer cette réponse">
      {data.items.length === 0 ? (
        <p className="text-[14px] text-muted">Aucune demande de prix envoyée ces derniers mois : cette réponse reste ici, rien n&apos;est perdu.</p>
      ) : proposee && !choisir ? (
        <>
          <p className="text-[13px] font-bold text-muted">Mobiiz propose</p>
          <p className="text-[16px] font-extrabold break-words">
            {proposee.negoce} · {proposee.chantier}
          </p>
          <p className="text-[14px] text-muted">{resume(proposee)}</p>
          <p className="text-[14px]">{data.suggestion!.raison}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" className="min-h-12 px-4 text-[15px]" pending={pending === proposee.recipientId} onClick={() => void classer(proposee)}>
              Oui, classer ici
            </Button>
            <Button type="button" variant="secondary" className="min-h-12 px-4 text-[15px]" disabled={pending !== null} onClick={() => setChoisir(true)}>
              Choisir une autre demande
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[14px] font-semibold">{proposee ? "De quelle demande est-ce la réponse ?" : "Mobiiz ne reconnaît pas l'expéditeur. De quelle demande est-ce la réponse ?"}</p>
          <ul className="flex flex-col gap-1" aria-label="Demandes récentes">
            {data.items.map((d) => (
              <li key={d.recipientId}>
                <button type="button" onClick={() => void classer(d)} disabled={pending !== null} className="flex min-h-13 w-full flex-col justify-center rounded-xl bg-surface px-3 py-2 text-left disabled:opacity-60">
                  <span className="text-[15px] break-words">
                    <span className="font-bold">{d.negoce}</span> · {d.chantier}
                  </span>
                  <span className="text-[13px] text-muted">{resume(d)}</span>
                </button>
              </li>
            ))}
          </ul>
          {proposee ? (
            <button type="button" onClick={() => setChoisir(false)} className="inline-flex min-h-11 items-center self-start text-[14px] font-bold text-muted underline underline-offset-4">
              Revenir à la proposition
            </button>
          ) : null}
        </>
      )}
      {refus ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {refus}
        </p>
      ) : null}
    </div>
  );
}
