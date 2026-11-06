"use client";

import { useCallback } from "react";
import { Badge, Button, Card, ErrorNotice, Skeleton } from "@/components/ui";
import {
  api,
  type PriceRequest,
  type PriceRequestRecipient,
  type ProjectDocument,
} from "@/lib/api";
import { openDocument, openFile } from "@/lib/open-document";
import { euros, type DemandePerso } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * LE DOSSIER D'UNE DEMANDE (Greg, 1er novembre 2026 : « Mes demandes » avec Résumé / Réponses / Offres / Documents).
 * Résumé : l'écran du chantier tel qu'il était (liste, envoi, suivi), jamais démonté. Réponses : où en est chaque négoce.
 * Offres : ce que chacun a envoyé (prix par le lien, devis PDF). Documents : tout ce qui est rangé dans la demande.
 * PAS DE FAUSSE MESSAGERIE : l'artisan ne peut pas encore répondre depuis MOBIIZ, donc aucun fil de discussion ; « Écrire à »
 * ouvre sa vraie messagerie.
 */
export const ONGLETS_DOSSIER = [
  { value: "resume", label: "Résumé" },
  { value: "reponses", label: "Réponses" },
  { value: "offres", label: "Offres" },
  { value: "documents", label: "Documents" },
] as const;
export type OngletDossier = (typeof ONGLETS_DOSSIER)[number]["value"];

export const estOngletDossier = (v: string | null): v is OngletDossier =>
  ONGLETS_DOSSIER.some((o) => o.value === v);

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
  if (!partie && onglet === "resume") return null;
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

export function OngletReponses({ projectId }: { projectId: string }) {
  const { data, error, reload } = useDossier(projectId);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data)
    return <Skeleton card="h-20" lines={2} label="Chargement des réponses…" />;
  const lignes = [
    ...data.demandes.flatMap((d) =>
      d.recipients.map((r) => ({
        cle: r.id,
        nom: r.supplier.name,
        statut: STATUT_DEMANDE[r.status],
        envoye: jour(r.sentAt),
        email: r.supplier.email,
      })),
    ),
    ...data.perso.flatMap((d) =>
      d.destinataires.map((r) => ({
        cle: r.id,
        nom: r.nom,
        statut: STATUT_PERSO[r.statut],
        envoye: null as string | null,
        email: null as string | null,
      })),
    ),
  ];
  if (lignes.length === 0)
    return (
      <p className="rounded-xl bg-surface p-4 text-[15px] text-muted shadow-card">
        {RIEN_ENVOYE}
      </p>
    );
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line rounded-xl bg-surface shadow-card">
        {lignes.map((l) => (
          <li
            key={l.cle}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[16px] font-bold">{l.nom}</p>
              {l.envoye ? (
                <p className="text-[13px] text-muted">Envoyé le {l.envoye}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={l.statut.ton}>{l.statut.texte}</Badge>
              {l.email ? (
                <a
                  href={`mailto:${l.email}`}
                  className="pressable inline-flex min-h-11 items-center rounded-xl px-2 text-[14px] font-semibold underline"
                >
                  Écrire à {l.nom}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">
        Tu ne peux pas encore répondre à un négoce depuis MOBIIZ : « Écrire à »
        ouvre ta messagerie. Sa réponse arrive ici.
      </p>
    </div>
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
