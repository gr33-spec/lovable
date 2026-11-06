"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Card, ErrorNotice, Skeleton } from "@/components/ui";
import {
  api,
  messageErreur,
  type PriceRequest,
  type PriceRequestRecipient,
  type ProjectDocument,
} from "@/lib/api";
import { openDocument, openFile } from "@/lib/open-document";
import { euros, type DemandePerso } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * LE DOSSIER D'UNE DEMANDE (Greg, 6 novembre 2026, prompt maître point 18 : Suivi / Offres / Documents ; avant, Résumé /
 * Réponses / Offres / Documents). Suivi : où en est chaque négoce (va répondre, précision à donner, ne chiffre pas) et
 * chaque ligne (cycle de vie), puis l'écran du chantier tel qu'il était (liste, envoi, suivi), jamais démonté.
 * Offres : ce que chacun a envoyé (prix par le lien, devis PDF). Documents : tout ce qui est rangé dans la demande.
 * PAS DE FAUSSE MESSAGERIE : l'artisan ne peut pas encore répondre depuis MOBIIZ, donc aucun fil de discussion ; « Écrire à »
 * ouvre sa vraie messagerie.
 */
export const ONGLETS_DOSSIER = [
  { value: "suivi", label: "Suivi" },
  { value: "offres", label: "Offres" },
  { value: "documents", label: "Documents" },
] as const;
export type OngletDossier = (typeof ONGLETS_DOSSIER)[number]["value"];

/** L'onglet de l'adresse ; les anciennes adresses (« resume », « reponses ») mènent au Suivi (6 novembre 2026). */
export function ongletDossier(v: string | null): OngletDossier {
  if (v === "offres" || v === "documents") return v;
  return "suivi";
}

/**
 * La barre n'apparaît qu'une fois la demande partie (ou un onglet demandé dans l'adresse) : avant l'envoi, Réponses et Offres
 * seraient vides, et la liste garde toute la place sur téléphone.
 */
export function BarreOnglets({
  projectId,
  onglet,
  onChoisir,
}: {
  projectId: string;
  onglet: OngletDossier;
  onChoisir: (o: OngletDossier) => void;
}) {
  const { data } = useDossier(projectId);
  const partie = Boolean(
    data &&
      (data.demandes.some((d) => d.recipients.some((r) => r.sentAt)) ||
        data.perso.some((d) => d.destinataires.some((r) => r.statut !== "a_envoyer"))),
  );
  if (!partie && onglet === "suivi") return null;
  return (
    <div
      role="tablist"
      aria-label="Dossier de la demande"
      className="flex flex-wrap gap-1.5 pb-1"
    >
      {ONGLETS_DOSSIER.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={onglet === o.value}
          onClick={() => onChoisir(o.value)}
          className={`pressable min-h-11 shrink-0 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap ${onglet === o.value ? "bg-ink text-white" : "border border-line bg-surface text-ink active:bg-ground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUT_DEMANDE: Record<
  PriceRequestRecipient["status"],
  { texte: string; ton: "ok" | "warn" | "neutral" }
> = {
  to_send: { texte: "À envoyer", ton: "neutral" },
  sent: { texte: "En attente de réponse", ton: "warn" },
  received: { texte: "A répondu", ton: "ok" },
  declined: { texte: "Ne chiffre pas", ton: "neutral" },
};

const STATUT_PERSO: Record<
  DemandePerso["destinataires"][number]["statut"],
  { texte: string; ton: "ok" | "warn" | "neutral" }
> = {
  a_envoyer: { texte: "À envoyer", ton: "neutral" },
  envoye: { texte: "En attente de réponse", ton: "warn" },
  relance: { texte: "Relancé, en attente", ton: "warn" },
  repondu: { texte: "A répondu", ton: "ok" },
  refuse: { texte: "Ne chiffre pas", ton: "neutral" },
};

const jour = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
    : null;

function useDossier(projectId: string) {
  const id = encodeURIComponent(projectId);
  const charger = useCallback(
    async (signal: AbortSignal) => {
      const [demandes, perso, documents] = await Promise.all([
        api<{ items: PriceRequest[] }>(`/v1/projects/${id}/price-requests`, {
          signal,
        }),
        api<DemandePerso[]>(`/v1/projects/${id}/demandes-perso`, {
          signal,
        }).catch(() => [] as DemandePerso[]),
        api<{ items: ProjectDocument[] }>(`/v1/projects/${id}/documents`, {
          signal,
        }),
      ]);
      return { demandes: demandes.items, perso, documents: documents.items };
    },
    [id],
  );
  return useResource(charger);
}

const RIEN_ENVOYE =
  "Rien n'est encore parti. Quand ta liste partira chez tes négoces, tu suivras ici leurs réponses.";

/** Où en est chaque négoce (Suivi) : sa réponse, son intention, sa question à laquelle l'artisan répond d'ici. */
export function SuiviDemande({ projectId }: { projectId: string }) {
  const { data, reload } = useDossier(projectId);
  const { data: cycle } = useResource(
    useCallback((signal: AbortSignal) => api<{ lignes: LigneCycle[] }>(`/v1/projects/${encodeURIComponent(projectId)}/cycle`, { signal }).catch(() => null), [projectId]),
  );
  if (!data) return null;
  const lignes: LigneNegoce[] = [
    ...data.demandes.flatMap((d) =>
      d.recipients
        .filter((r) => r.sentAt)
        .map((r) => ({
          cle: r.id,
          nom: r.supplier.name,
          statut: STATUT_DEMANDE[r.status],
          envoye: jour(r.sentAt),
          email: r.supplier.email,
          vaRepondre: Boolean(r.negoce?.vaRepondreLe) && r.status === "sent",
          refusMotif: r.negoce?.refusMotif ?? null,
          precision: r.negoce?.precision ?? null,
        })),
    ),
    ...data.perso.flatMap((d) =>
      d.destinataires
        .filter((r) => r.statut !== "a_envoyer")
        .map((r) => ({ cle: r.id, nom: r.nom, statut: STATUT_PERSO[r.statut], envoye: null as string | null, email: null as string | null, vaRepondre: Boolean(r.vaRepondre), refusMotif: r.refusMotif ?? null, precision: r.precision ?? null })),
    ),
  ];
  if (lignes.length === 0) return null;
  const etats = cycle?.lignes ?? [];
  return (
    <section aria-label="Suivi de la demande" className="flex flex-col gap-3">
      <ul aria-label="Les négoces" className="flex flex-col divide-y divide-line rounded-xl bg-surface shadow-card">
        {lignes.map((l) => (
          <LigneSuiviNegoce key={l.cle} l={l} onRepondu={reload} />
        ))}
      </ul>
      {etats.length > 0 ? (
        <details className="rounded-xl bg-surface p-4 shadow-card">
          <summary className="cursor-pointer text-[15px] font-bold">Où en est chaque ligne ({etats.length})</summary>
          <ul aria-label="État des lignes" className="mt-2 flex flex-col gap-1.5">
            {etats.map((e) => (
              <li key={e.key} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span className="min-w-0">{e.designation}</span>
                <Badge tone={e.etat.startsWith("commandee") ? "ok" : e.etat === "libre" ? "neutral" : "warn"}>{e.groupe && e.etat === "dans_un_groupe" ? `${e.libelle} · ${e.groupe.titre}` : e.libelle}</Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

interface LigneCycle {
  key: string;
  designation: string;
  etat: string;
  libelle: string;
  groupe: { titre: string; avantCloture: boolean } | null;
}

interface LigneNegoce {
  cle: string;
  nom: string;
  statut: { texte: string; ton: "ok" | "warn" | "neutral" };
  envoye: string | null;
  email: string | null;
  vaRepondre: boolean;
  refusMotif: string | null;
  precision: { question: string; reponse: string | null } | null;
}

function LigneSuiviNegoce({ l, onRepondu }: { l: LigneNegoce; onRepondu: () => void }) {
  const [reponse, setReponse] = useState("");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  async function repondre(e: React.FormEvent) {
    e.preventDefault();
    if (!reponse.trim()) return setErreur("Écris ta réponse.");
    setPending(true);
    setErreur(null);
    try {
      await api(`/v1/price-request-recipients/${encodeURIComponent(l.cle)}/precision`, { method: "POST", body: { reponse: reponse.trim() } });
      setReponse("");
      onRepondu();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPending(false);
    }
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[16px] font-bold">{l.nom}</p>
          {l.envoye ? <p className="text-[13px] text-muted">Envoyé le {l.envoye}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={l.vaRepondre ? "ok" : l.statut.ton}>{l.vaRepondre ? "Va répondre" : l.statut.texte}</Badge>
          {l.email ? (
            <a href={`mailto:${l.email}`} className="pressable inline-flex min-h-11 items-center rounded-xl px-2 text-[14px] font-semibold underline">
              Écrire à {l.nom}
            </a>
          ) : null}
        </div>
      </div>
      {l.refusMotif ? <p className="text-[14px] text-muted">Motif : « {l.refusMotif} »</p> : null}
      {l.precision ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <p className="text-[14px]">
            <span className="font-semibold">Question de {l.nom} :</span> « {l.precision.question} »
          </p>
          {l.precision.reponse ? (
            <p className="text-[14px] text-muted">Ta réponse : « {l.precision.reponse} »</p>
          ) : (
            <form onSubmit={(e) => void repondre(e)} className="flex flex-col gap-2">
              <label htmlFor={`precision-${l.cle}`} className="text-[14px] font-semibold">
                Ta réponse
              </label>
              <textarea id={`precision-${l.cle}`} value={reponse} onChange={(e) => setReponse(e.target.value)} rows={2} maxLength={1000} className="rounded-xl border border-line bg-surface p-3 text-[16px] outline-none focus-visible:border-accent" />
              {erreur ? (
                <p role="alert" className="text-[14px] font-semibold text-danger">
                  {erreur}
                </p>
              ) : null}
              <Button type="submit" pending={pending}>
                Envoyer ma réponse à {l.nom}
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function OngletOffres({
  projectId,
  onComparer,
}: {
  projectId: string;
  onComparer: () => void;
}) {
  const { data, error, reload } = useDossier(projectId);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data)
    return <Skeleton card="h-20" lines={2} label="Chargement des offres…" />;
  const pdfs = data.demandes.flatMap((d) =>
    d.recipients
      .filter((r) => r.document)
      .map((r) => ({ id: r.id, nom: r.supplier.name, document: r.document! })),
  );
  const prix = data.perso.flatMap((d) => d.offres);
  if (pdfs.length === 0 && prix.length === 0) {
    const parti =
      data.demandes.some((d) => d.recipients.some((r) => r.sentAt)) ||
      data.perso.some((d) =>
        d.destinataires.some((r) => r.statut !== "a_envoyer"),
      );
    return (
      <p className="rounded-xl bg-surface p-4 text-[15px] text-muted shadow-card">
        {parti
          ? "Aucune offre reçue pour l'instant. Tu seras prévenu à chaque réponse."
          : RIEN_ENVOYE}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {[...prix]
        .sort((a, b) => a.totalLivreHt - b.totalLivreHt)
        .map((o) => (
          <Card
            key={o.recipientId}
            aria-label={`Offre de ${o.nom}`}
            className="flex flex-col gap-1 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[16px] font-extrabold">{o.nom}</p>
              {o.complete && o.valide && o.ecartHt === 0 ? (
                <Badge tone="ok">Le moins cher</Badge>
              ) : null}
            </div>
            <p className="text-[18px] font-extrabold tabular-nums">
              {euros(o.totalLivreHt)} HT livré
            </p>
            <p className="text-[14px] text-muted">
              {o.lignesChiffrees} ligne{o.lignesChiffrees > 1 ? "s" : ""}{" "}
              chiffrée{o.lignesChiffrees > 1 ? "s" : ""}
              {o.lignesManquantes.length
                ? ` · ${o.lignesManquantes.length} non chiffrée${o.lignesManquantes.length > 1 ? "s" : ""}`
                : ""}
              {o.valide ? "" : " · offre échue"}
            </p>
          </Card>
        ))}
      {pdfs.map((p) => (
        <Card
          key={p.id}
          aria-label={`Devis de ${p.nom}`}
          className="flex flex-col gap-2 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[16px] font-extrabold">{p.nom}</p>
            <Badge tone="ok">Devis reçu</Badge>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              void openDocument(p.document.id, `Devis ${p.nom}`, "devis.pdf")
            }
          >
            Ouvrir le devis (PDF)
          </Button>
        </Card>
      ))}
      <Button variant="ink" onClick={onComparer}>
        Comparer et choisir dans le résumé
      </Button>
    </div>
  );
}

const NATURE: Record<ProjectDocument["purpose"], string> = {
  client_quote: "Devis déposé",
  supplier_quote: "Devis d'un négoce",
  sketch: "Croquis",
};

export function OngletDocuments({ projectId }: { projectId: string }) {
  const { data, error, reload } = useDossier(projectId);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data)
    return <Skeleton card="h-20" lines={2} label="Chargement des documents…" />;
  const envoyes = data.demandes.flatMap((d) =>
    d.recipients
      .filter((r) => r.sentAt)
      .map((r) => ({
        cle: `${d.id}:${r.id}`,
        titre: `Demande envoyée à ${r.supplier.name}`,
        quand: jour(r.sentAt),
        ouvrir: () =>
          openFile({
            url: `/v1/price-requests/${encodeURIComponent(d.id)}/demande-de-devis.pdf?destinataire=${encodeURIComponent(r.id)}`,
            title: `Demande à ${r.supplier.name}`,
            fileName: "demande-de-prix.pdf",
          }),
      })),
  );
  const ranges = data.documents.map((doc) => ({
    cle: doc.id,
    titre: NATURE[doc.purpose],
    quand: jour(doc.createdAt),
    ouvrir: () => void openDocument(doc.id, NATURE[doc.purpose], doc.name),
  }));
  const tout = [...ranges, ...envoyes];
  if (tout.length === 0)
    return (
      <p className="rounded-xl bg-surface p-4 text-[15px] text-muted shadow-card">
        Aucun document dans cette demande pour l&apos;instant.
      </p>
    );
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl bg-surface shadow-card">
      {tout.map((d) => (
        <li key={d.cle}>
          <button
            type="button"
            onClick={d.ouvrir}
            className="pressable flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="min-w-0 text-[16px] font-semibold">{d.titre}</span>
            {d.quand ? (
              <span className="shrink-0 text-[13px] text-muted">{d.quand}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
