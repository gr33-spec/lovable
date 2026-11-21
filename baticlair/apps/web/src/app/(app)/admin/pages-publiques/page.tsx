"use client";

import { ExternalLink, Flag } from "lucide-react";
import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, getActiveCompanyId, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface PagePublique {
  adresse: string;
  nom: string;
  metier: string;
  verifiee: boolean;
  visible: boolean;
  masquee: boolean;
  motif: string | null;
  signalements: number;
  majLe: string;
}
interface SignalementPage {
  id: string;
  adresse: string | null;
  nom: string;
  motif: string;
  precision: string | null;
  le: string;
}
const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function rafraichir(adresse: string) {
  const companyId = getActiveCompanyId();
  await fetch("/api/pages-entreprises/rafraichir", { method: "POST", headers: { "content-type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: JSON.stringify({ admin: adresse }) }).catch(() => undefined);
}

/**
 * MA PAGE MOBIIZ, MODÉRATION (Greg, 16 novembre 2026) : les pages publiques (et celles masquées), les signalements des
 * visiteurs ; « Masquer » retire la page tout de suite (cache régénéré), « Rétablir » la remet. Chaque geste au journal.
 */
export default function AdminPagesPubliques() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Pages publiques</PageTitle>
      <PorteAdmin>
        <Liste />
      </PorteAdmin>
    </div>
  );
}

function Liste() {
  const charger = useCallback((signal: AbortSignal) => api<{ pages: PagePublique[]; signalements: SignalementPage[] }>("/v1/admin/pages-publiques", { signal }), []);
  const { data, error, reload } = useResource(charger);
  const [erreur, setErreur] = useState<string | null>(null);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const masquer = async (p: PagePublique, oui: boolean) => {
    const motif = oui ? window.prompt(`Masquer la page de ${p.nom} ? Motif (visible dans le journal) :`, "Signalement fondé") : null;
    if (oui && motif === null) return;
    try {
      await api(`/v1/admin/pages-publiques/${p.adresse}/masquage`, { method: "PUT", body: { masquer: oui, motif } });
      await rafraichir(p.adresse);
      reload();
    } catch (e) {
      setErreur(messageErreur(e));
    }
  };
  return (
    <>
      {erreur ? <p role="alert" className="font-bold text-red-700">{erreur}</p> : null}
      <section className="flex flex-col gap-3" aria-labelledby="t-signalements">
        <h2 id="t-signalements" className="text-[20px] font-extrabold">
          Signalements à traiter · {data.signalements.length}
        </h2>
        {data.signalements.length === 0 ? (
          <Card className="p-4 text-[15px]">Aucun signalement en attente.</Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.signalements.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-col gap-2 p-4">
                  <p className="flex items-center gap-2 font-bold">
                    <Flag size={16} aria-hidden="true" /> {s.nom} · {s.motif}
                  </p>
                  {s.precision ? <p className="text-[15px]">« {s.precision} »</p> : null}
                  <p className="text-[13px] text-muted">{quand(s.le)}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.adresse ? (
                      <a href={`/e/${s.adresse}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 font-bold underline">
                        <ExternalLink size={16} aria-hidden="true" /> Voir la page
                      </a>
                    ) : null}
                    <Button variant="secondary" onClick={async () => { await api(`/v1/admin/pages-publiques/signalements/${s.id}/traite`, { method: "POST" }).catch((e) => setErreur(messageErreur(e))); reload(); }}>
                      Marquer traité
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="t-pages">
        <h2 id="t-pages" className="text-[20px] font-extrabold">
          Pages en ligne ou masquées · {data.pages.length}
        </h2>
        <ul className="flex flex-col gap-2">
          {data.pages.map((p) => (
            <li key={p.adresse}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">
                    {p.nom} <span className="font-normal text-muted">· {p.metier}{p.verifiee ? " · vérifiée" : ""}</span>
                  </p>
                  <p className="text-[13px] text-muted">
                    /e/{p.adresse} · {p.masquee ? `masquée (${p.motif ?? "sans motif"})` : p.visible ? "en ligne" : "privée"} · {p.signalements} signalement(s) · {quand(p.majLe)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!p.masquee && p.visible ? (
                    <a href={`/e/${p.adresse}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 font-bold underline">
                      Voir
                    </a>
                  ) : null}
                  <Button variant={p.masquee ? "secondary" : "ink"} onClick={() => masquer(p, !p.masquee)}>
                    {p.masquee ? "Rétablir" : "Masquer"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
