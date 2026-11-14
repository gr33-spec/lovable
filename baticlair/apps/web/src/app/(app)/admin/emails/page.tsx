"use client";

import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Button, Card, ErrorNotice, Field, PageTitle, Spinner } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface MisDeCote {
  id: string;
  adresse: string;
  de: string;
  objet: string;
  texte: string | null;
  pieces: string[];
  recuLe: string;
}

/**
 * Correction après test de Greg (30 octobre 2026) : un e-mail reçu sur une adresse Mobiiz que personne n'a n'est jamais
 * perdu. Il attend ici ; on le rattache à l'entreprise d'une adresse Mobiiz, il rejoint ses reçus et l'artisan est prévenu.
 */
export default function AdminEmailsPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>E-mails mis de côté</PageTitle>
      <PorteAdmin>
        <Liste />
      </PorteAdmin>
    </div>
  );
}

function Liste() {
  const charger = useCallback((signal: AbortSignal) => api<{ items: MisDeCote[] }>("/v1/admin/emails-mis-de-cote", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.items.length === 0) return <Card className="p-5 text-[16px]">Aucun e-mail en attente : chaque e-mail reçu a trouvé son compte.</Card>;
  return (
    <ul className="flex flex-col gap-3" aria-label="E-mails mis de côté">
      {data.items.map((m) => (
        <li key={m.id}>
          <Ligne m={m} onFait={reload} />
        </li>
      ))}
    </ul>
  );
}

function Ligne({ m, onFait }: { m: MisDeCote; onFait: () => void }) {
  const [adresse, setAdresse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  async function rattacher() {
    setErreur(null);
    setEnvoi(true);
    try {
      await api(`/v1/admin/emails-mis-de-cote/${m.id}/rattacher`, { method: "POST", body: { adresse } });
      onFait();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Card className="flex flex-col gap-2 p-4">
      <p className="text-[14px] text-muted">
        À <strong className="text-ink">{m.adresse}</strong> · de {m.de} · {new Date(m.recuLe).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
      </p>
      <p className="text-[16px] font-bold">{m.objet || "Sans objet"}</p>
      {m.texte ? <p className="line-clamp-4 text-[14px] whitespace-pre-wrap">{m.texte}</p> : null}
      {m.pieces.length ? <p className="text-[13px] text-muted">Pièces jointes : {m.pieces.join(", ")}</p> : null}
      <Field id={`rattacher-${m.id}`} label="Rattacher à l'adresse Mobiiz" placeholder="bati-invest" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
      {erreur ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button onClick={() => void rattacher()} disabled={envoi || adresse.trim().length < 3}>
        Rattacher
      </Button>
    </Card>
  );
}
