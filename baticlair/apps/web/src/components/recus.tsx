"use client";

import { FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, Skeleton } from "@/components/ui";
import { api, messageErreur, type DemandePartie, type EmailRecu } from "@/lib/api";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/** R7 : la carte d'un e-mail reçu sur l'adresse Mobiiz (page « Mes reçus » et bloc « Reçu par e-mail » du chantier). */
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Un e-mail reçu : qui, quoi, ses fichiers à ouvrir, et « Rattacher » quand il n'a pas de demande. */
export function RecuCard({ email, onChange, compact = false }: { email: EmailRecu; onChange: (e: EmailRecu) => void; compact?: boolean }) {
  const [rattacher, setRattacher] = useState(false);
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{email.demande ? `${email.demande.negoce} t'a répondu par e-mail` : email.expediteur}</p>
          <p className="truncate text-[14px] text-muted">{email.objet || "(sans objet)"}</p>
        </div>
        <span className="shrink-0 text-[12px] text-muted">{dateCourte(email.recuLe)}</span>
      </div>
      {email.texte ? <p className={`text-[14px] leading-relaxed whitespace-pre-line ${compact ? "line-clamp-4" : ""}`}>{email.texte}</p> : null}
      {email.fichiers.length || email.tropLourdes.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Pièces jointes">
          {email.fichiers.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => openFile({ url: `/v1/recus/${encodeURIComponent(email.id)}/fichiers/${encodeURIComponent(f.id)}`, title: f.nom, fileName: f.nom })}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[14px] font-bold"
              >
                <FileText size={16} aria-hidden="true" />
                {f.nom}
                {f.devisRecu ? <span className="text-[12px] font-semibold text-muted">· devis reçu</span> : null}
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
      {email.demande && !compact ? (
        <Link href={`/chantiers/${encodeURIComponent(email.demande.projectId)}#fournisseurs`} className="inline-flex min-h-11 items-center text-[14px] font-bold text-accent-text">
          Voir le chantier
        </Link>
      ) : null}
      {!email.demande ? (
        rattacher ? (
          <Rattacher email={email} onDone={(e) => { setRattacher(false); onChange(e); }} onCancel={() => setRattacher(false)} />
        ) : (
          <Button type="button" variant="secondary" className="min-h-11 self-start px-3 text-[14px]" onClick={() => setRattacher(true)}>
            <Link2 size={16} aria-hidden="true" />
            Rattacher à une demande
          </Button>
        )
      ) : null}
    </Card>
  );
}

function Rattacher({ email, onDone, onCancel }: { email: EmailRecu; onDone: (e: EmailRecu) => void; onCancel: () => void }) {
  const charger = useCallback((signal: AbortSignal) => api<{ items: DemandePartie[] }>("/v1/recus/demandes", { signal }), []);
  const { data, error, reload } = useResource(charger);
  const [pending, setPending] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  async function choisir(d: DemandePartie) {
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
  if (!data) return <Skeleton lines={2} label="Chargement des demandes…" />;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-ground p-3" role="group" aria-label="Rattacher à une demande">
      <p className="text-[14px] font-semibold">De quelle demande est-ce la réponse ?</p>
      {data.items.length === 0 ? <p className="text-[14px] text-muted">Aucune demande de prix envoyée pour l&apos;instant.</p> : null}
      <ul className="flex flex-col gap-1">
        {data.items.map((d) => (
          <li key={d.recipientId}>
            <button type="button" onClick={() => void choisir(d)} disabled={pending !== null} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-surface px-3 text-left text-[14px] disabled:opacity-60">
              <span className="min-w-0 truncate">
                <span className="font-bold">{d.negoce}</span> · {d.chantier}
              </span>
              <span className="shrink-0 text-[12px] text-muted">{d.recue ? "déjà reçu" : d.envoyeeLe ? dateCourte(d.envoyeeLe) : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      {refus ? <p className="text-[14px] font-semibold text-danger">{refus}</p> : null}
      <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center self-start text-[14px] font-bold text-muted">
        Annuler
      </button>
    </div>
  );
}
