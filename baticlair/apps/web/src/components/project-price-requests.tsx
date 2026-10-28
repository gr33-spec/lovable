"use client";

import { FileUp, Loader2, Mail, MoreHorizontal, Plus, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AssistantMessage, Say } from "@/components/chat";
import { DemoAnswer, isDemoSupplier } from "@/components/demo";
import { NotificationsPrompt } from "@/components/notifications-prompt";
import { RappelAdresseMobiiz } from "@/components/adresse-mobiiz";
import { OfferLines, ProjectComparison } from "@/components/project-offers";
import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { attachFile } from "@/lib/upload";
import { fetchWhole } from "@/components/file-viewer";
import { api, ApiError, getActiveCompanyId, MAX_DOCUMENT_BYTES, newActionKey, type EmailRecu, type Offer, type PriceRequest, type PriceRequestRecipient, type PriceRequestSettings, type Supplier } from "@/lib/api";
import { openDocument, openFile } from "@/lib/open-document";
import { isPhoto, MAX_QUOTE_PHOTOS, preparePhotos } from "@/lib/photos";
import { useProgressRefresh } from "@/components/project-progress";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import { useAncienMode } from "@/components/negocie";
import { useActionChantier } from "@/lib/actions-chantier";
import { dateHeureCourte, premiereLigneDuMessage } from "../../../../packages/domain/src/groupe/reponse-negoce";


function toError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("internal_error", 500);
}

/** Lien qui ouvre la messagerie de l'artisan avec l'e-mail déjà rempli. */
function mailtoHref(r: PriceRequestRecipient): string {
  if (!r.email) return `mailto:${r.supplier.email}`;
  const body = r.email.body.replace(/\r?\n/g, "\r\n");
  return `mailto:${r.supplier.email}?subject=${encodeURIComponent(r.email.subject)}&body=${encodeURIComponent(body)}`;
}

/** L'exemplaire PDF de la demande de devis au nom d'un destinataire, prêt à joindre. */
async function demandePdf(requestId: string, recipientId: string): Promise<File> {
  const headers: Record<string, string> = {};
  const companyId = getActiveCompanyId();
  if (companyId) headers["x-company-id"] = companyId;
  const blob = await fetchWhole(`/v1/price-requests/${encodeURIComponent(requestId)}/demande-de-devis.pdf?destinataire=${encodeURIComponent(recipientId)}`, headers);
  return new File([blob], "demande-de-devis.pdf", { type: "application/pdf" });
}

/**
 * Sans service d'envoi côté serveur, le mail part de la messagerie de l'artisan, ET LE PDF AVEC (retour du fondateur,
 * 2026-10-05) : un lien « mailto » ne sait pas joindre un fichier. Sur téléphone, la feuille de partage ouvre Mail avec le
 * PDF déjà joint et le texte (l'adresse est copiée, à coller dans « À ») ; sur ordinateur, le PDF se télécharge et la
 * messagerie s'ouvre, remplie.
 */
async function sendWithOwnMail(r: PriceRequestRecipient, pdf: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [pdf] })) {
    await navigator.clipboard?.writeText(r.supplier.email).catch(() => undefined);
    try {
      await navigator.share({ files: [pdf], title: r.email?.subject ?? "Demande de devis", text: r.email?.body ?? "" });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      throw e;
    }
  }
  const url = URL.createObjectURL(pdf);
  const a = document.createElement("a");
  a.href = url;
  a.download = pdf.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  window.location.href = mailtoHref(r);
  return "downloaded";
}

/**
 * Demandes de prix du chantier, après validation de la liste de matériaux :
 * choisir les fournisseurs, envoyer l'e-mail préparé depuis sa messagerie,
 * puis déposer le devis reçu de chacun (PDF ou photos).
 */
export function ProjectPriceRequests({
  projectId,
  archived,
  canCreate,
  quantitatifId,
  openSignal = 0,
  refreshSignal = 0,
  onSentChange,
  onPreviewClosed,
}: {
  projectId: string;
  archived: boolean;
  canCreate: boolean;
  quantitatifId?: string | null;
  /** « Envoyer aux négoces » du document : ouvre « À qui j'envoie ? » (ou montre les fournisseurs si la demande est partie). */
  openSignal?: number;
  /** §48.5 : une sélection vient de partir depuis la liste : on relit les demandes. */
  refreshSignal?: number;
  /** La demande est-elle déjà partie ? La liste le dit sur son gros bouton. */
  onSentChange?: (sent: boolean) => void;
  /** « Revenir à la liste » de l'aperçu : la liste revient à l'écran (§48). */
  onPreviewClosed?: () => void;
}) {
  const fetchRequests = useCallback(
    (signal: AbortSignal) => api<{ items: PriceRequest[] }>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchRequests);
  useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  const refreshProgress = useProgressRefresh();
  // Commande du mois (Greg, 23 octobre) : plus de « X offres reçues / Comparer les offres » par chantier ; le prix vient de
  // le regroupement, le chantier garde seulement l'envoi aux négoces.
  const { features } = useSession();
  const modeMois = useAncienMode() && features.commandeCommune !== "lots";
  // Des e-mails partent-ils du serveur (§43) ? Sinon, l'artisan envoie depuis sa messagerie.
  const fetchSettings = useCallback((signal: AbortSignal) => api<PriceRequestSettings & { deliversEmail: boolean }>("/v1/price-requests/settings", { signal }), []);
  const deliversEmail = useResource(fetchSettings).data?.deliversEmail ?? false;
  // § 43.4 : après un envoi (jamais avant), l'écran « Active tes notifications » peut se proposer.
  const [sentCount, setSentCount] = useState(0);
  // §48.5 : la demande du chantier est celle de TOUTE la liste ; les sélections envoyées à part se suivent à côté.
  const requestId = data?.items.find((r) => !r.articles?.length)?.id ?? null;
  // Devis déjà lus, par destinataire ; `version` fait suivre la comparaison.
  const [version, setVersion] = useState(0);
  const fetchOffers = useCallback(
    (signal: AbortSignal) =>
      requestId
        ? api<{ aiAvailable: boolean; items: Offer[] }>(`/v1/price-requests/${requestId}/offers`, { signal })
        : Promise.resolve({ aiAvailable: false, items: [] as Offer[] }),
    [requestId],
  );
  const offers = useResource(fetchOffers);
  // R7 : les e-mails reçus des négoces pour ce chantier (la première ligne de leur message va sur leur carte).
  const fetchRecus = useCallback((signal: AbortSignal) => api<{ items: EmailRecu[] }>(`/v1/recus?projectId=${encodeURIComponent(projectId)}`, { signal }), [projectId]);
  const recus = useResource(fetchRecus);
  // Point 8 (Greg, 28 octobre 2026) : un seul bouton principal par étape ; le reste dans le menu « ··· » du chantier.
  const [feuille, setFeuille] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [renvoi, setRenvoi] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const whole = (data?.items ?? []).filter((r) => !r.articles?.length);
  const parts = (data?.items ?? []).filter((r) => (r.articles?.length ?? 0) > 0);
  const sent = Boolean(whole[0]);
  useEffect(() => {
    if (data) onSentChange?.(sent);
  }, [data, sent, onSentChange]);
  const enCours = whole[0] ?? null;
  const retenue = Boolean(enCours?.retainedSupplierIds.length);
  const actif = Boolean(enCours) && !archived;
  const montrer = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  async function classer(retenus: string[]) {
    if (!enCours) return;
    setActionError(null);
    try {
      const r = await api<PriceRequest>(`/v1/price-requests/${enCours.id}/classification`, { method: "PATCH", body: retenus.length ? { classified: true, retainedSupplierIds: retenus } : { classified: false } });
      setData({ items: [r, ...(data?.items ?? []).filter((x) => x.id !== r.id)] });
      setFeuille(false);
      refreshProgress();
    } catch (e) {
      setActionError(toError(e));
    }
  }
  async function supprimer() {
    if (!enCours) return;
    setActionError(null);
    try {
      await api<null>(`/v1/price-requests/${enCours.id}`, { method: "DELETE" });
      setSuppression(false);
      reload();
      refreshProgress();
    } catch (e) {
      setActionError(toError(e));
    }
  }
  useActionChantier("ajouter-negoce", "Ajouter un négoce", () => (setAjout(true), montrer("ajouter-negoce")), actif && !retenue);
  useActionChantier("renvoyer", "Renvoyer à un négoce", () => (setRenvoi(true), montrer("renvoyer")), actif && !retenue && Boolean(enCours?.recipients.some((r) => r.status === "sent")));
  useActionChantier("changer-negoce", "Changer de négoce", () => void classer([]), actif && retenue);
  useActionChantier("supprimer-demande", "Supprimer la demande", () => (setSuppression(true), montrer("supprimer-demande")), actif);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const request = whole[0] ?? null;
  if (request && openSignal > 0) requestAnimationFrame(() => document.getElementById("fournisseurs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const offerOf = (recipientId: string) => offers.data?.items.find((o) => o.recipientId === recipientId) ?? null;
  const offerChanged = (offer: Offer) => {
    const items = (offers.data?.items ?? []).filter((o) => o.recipientId !== offer.recipientId);
    offers.setData({ aiAvailable: offers.data?.aiAvailable ?? true, items: [...items, offer] });
    setVersion((v) => v + 1);
    refreshProgress();
  };
  const replace = (r: PriceRequest) => {
    setData({ items: [r, ...data.items.filter((x) => x.id !== r.id)] });
    refreshProgress();
  };
  const reloadAll = () => {
    reload();
    offers.reload();
    setVersion((v) => v + 1);
    refreshProgress();
  };

  const partsBlock =
    parts.length > 0 ? (
      <section aria-label="Envoyé à part" className="flex flex-col gap-2">
        <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">ENVOYÉ À PART</h2>
        <ul className="flex flex-col gap-2">
          {parts.flatMap((part) =>
            part.recipients.map((r) => (
              <li key={r.id} className="flex flex-col gap-1">
                <p className="text-[13px] font-bold text-muted">
                  {part.articles!.length} ligne{part.articles!.length > 1 ? "s" : ""} de la liste
                </p>
                <RecipientCard
                  recipient={r}
                  offer={null}
                  request={part}
                  archived={archived}
                  deliversEmail={deliversEmail}
                  onSent={() => setSentCount((n) => n + 1)}
                  onChange={replace}
                  onOfferChange={offerChanged}
                  onReload={reloadAll}
                />
              </li>
            )),
          )}
        </ul>
      </section>
    ) : null;

  if (!request) {
    if (archived || !canCreate) return partsBlock;
    return (
      <>
      <section id="fournisseurs" aria-labelledby="price-request-title" className="scroll-mt-4">
        <AssistantMessage>
          <h2 id="price-request-title" className="text-base leading-relaxed font-semibold">
            À qui j&apos;envoie la liste ?
          </h2>
          <NewRequest
            key={openSignal}
            openAtStart={openSignal > 0}
            {...(onPreviewClosed ? { onPreviewClosed } : {})}
            projectId={projectId}
            quantitatifId={quantitatifId ?? null}
            deliversEmail={deliversEmail}
            onSent={() => setSentCount((n) => n + 1)}
            onCreated={replace}
          />
        </AssistantMessage>
      </section>
      {partsBlock}
      </>
    );
  }

  const emailDe = (recipientId: string) =>
    (recus.data?.items ?? []).filter((e) => e.demande?.recipientId === recipientId).sort((x, y) => y.recuLe.localeCompare(x.recuLe))[0] ?? null;
  // Point 7 (Greg, 28 octobre 2026) : un devis reçu ne se lit plus par l'IA ; il s'ouvre, et l'artisan retient un négoce.
  const repondus = request.recipients.filter((r) => r.document || emailDe(r.id));
  const retenus = request.recipients.filter((r) => request.retainedSupplierIds.includes(r.supplier.id));
  const aEnvoyer = request.recipients.filter((r) => r.status === "to_send");
  const hasOffers = (offers.data?.items.length ?? 0) > 0;

  return (
    <section id="fournisseurs" aria-label="Fournisseurs" className="flex scroll-mt-4 flex-col gap-3">
      {retenus.length > 0 ? (
        <div role="status" aria-label="Commandé" className="flex flex-col gap-2 rounded-xl bg-ok-bg p-4 text-ok">
          <p className="text-[16px] font-extrabold">Commandé chez {retenus.map((r) => r.supplier.name).join(", ")}.</p>
          <p className="text-[14px]">
            {request.lines.length} ligne{request.lines.length > 1 ? "s" : ""}
            {request.classifiedAt ? ` · retenu le ${dateHeureCourte(new Date(request.classifiedAt))}` : ""}
          </p>
          {retenus
            .filter((r) => r.document)
            .map((r) => (
              <button key={r.id} type="button" onClick={() => void openDocument(r.document!.id, `Devis ${r.supplier.name}`, "devis.pdf")} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-ink underline">
                Ouvrir le devis (PDF)
              </button>
            ))}
        </div>
      ) : aEnvoyer.length > 0 ? (
        <AssistantMessage>
          <Say>La demande est prête. Envoie-la à chaque négoce :</Say>
        </AssistantMessage>
      ) : repondus.length > 0 ? (
        // Le suivi du chantier dit déjà « N devis reçus sur M demandes » : ici, seulement le bouton de l'étape.
        <Button onClick={() => setFeuille(true)} className="w-full">
          {repondus.length > 1 ? "Voir les devis reçus" : "Voir le devis reçu"}
        </Button>
      ) : null}
      {actionError ? <ErrorNotice error={actionError} /> : null}
      {suppression ? (
        <div id="supprimer-demande" role="group" aria-label="Supprimer la demande" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-[15px] font-semibold">Supprimer cette demande ? Les négoces ne sont pas prévenus ; ta liste reste.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setSuppression(false)}>
              Annuler
            </Button>
            <Button variant="ink" onClick={() => void supprimer()}>
              Oui, supprimer
            </Button>
          </div>
        </div>
      ) : null}
      {renvoi ? (
        <div id="renvoyer" role="group" aria-label="Renvoyer à un négoce" className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <p className="text-[15px] font-semibold">À qui renvoyer la demande ?</p>
          {request.recipients
            .filter((r) => r.status === "sent")
            .map((r) => (
              <a key={r.id} href={mailtoHref(r)} onClick={() => setRenvoi(false)} className="inline-flex min-h-12 items-center justify-between rounded-xl border border-line px-3 text-[15px] font-semibold">
                Renvoyer à {r.supplier.name}
                <Mail size={18} aria-hidden="true" />
              </a>
            ))}
          <button type="button" onClick={() => setRenvoi(false)} className="min-h-11 self-start text-[15px] font-semibold text-muted underline">
            Fermer
          </button>
        </div>
      ) : null}
      <div id="ajouter-negoce">{!archived ? <AddRecipients request={request} open={ajout} onClose={() => setAjout(false)} onChange={replace} /> : null}</div>
      {hasOffers && !modeMois && retenus.length === 0 ? <ProjectComparison request={request} version={version} archived={archived} onRequestChange={replace} /> : null}
      <NotificationsPrompt trigger={sentCount} />
      <ul className="flex flex-col gap-2" aria-label="Tes fournisseurs">
        {request.recipients.map((r) => (
          <li key={r.id}>
            <RecipientCard
              recipient={r}
              offer={offerOf(r.id)}
              request={request}
              archived={archived}
              deliversEmail={deliversEmail}
              onSent={() => setSentCount((k) => k + 1)}
              onChange={replace}
              onOfferChange={offerChanged}
              onReload={reloadAll}
            />
          </li>
        ))}
      </ul>
      {partsBlock}
      {feuille ? <DevisRecus request={request} repondus={repondus} emailDe={emailDe} onRetenir={(supplierId) => void classer([supplierId])} onFermer={() => setFeuille(false)} /> : null}
    </section>
  );
}

/**
 * « Voir les devis reçus » (Greg, 28 octobre 2026, points 7 et 8) : en plein écran, une carte par négoce qui a répondu :
 * « X t'a répondu · 28 oct. à 8 h 31 », la première ligne de son message, « Ouvrir le devis (PDF) » et « Je retiens ce
 * négoce » (la demande passe à « Commandé »). Aucune lecture IA, aucun nom de fichier.
 */
function DevisRecus({ request, repondus, emailDe, onRetenir, onFermer }: { request: PriceRequest; repondus: PriceRequestRecipient[]; emailDe: (id: string) => EmailRecu | null; onRetenir: (supplierId: string) => void; onFermer: () => void }) {
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="Devis reçus" className="fixed top-0 left-0 z-50 flex h-dvh w-full flex-col bg-ground">
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <h2 className="font-display text-[20px] font-extrabold">{repondus.length > 1 ? "Devis reçus" : "Devis reçu"}</h2>
        <button type="button" onClick={onFermer} aria-label="Revenir au chantier" className="inline-flex size-11 items-center justify-center rounded-xl">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <ul className="mx-auto flex w-full max-w-2xl min-h-0 grow flex-col gap-3 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {repondus.map((r) => {
          const e = emailDe(r.id);
          const quand = e ? new Date(e.recuLe) : r.sentAt ? null : null;
          const ligne = premiereLigneDuMessage(e?.texte);
          const autres = (e?.fichiers ?? []).filter((f) => !f.devisRecu);
          return (
            <li key={r.id}>
              <Card aria-label={`Devis de ${r.supplier.name}`} className="flex flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[16px] font-extrabold">
                    {r.supplier.name} t&apos;a répondu{quand ? ` · ${dateHeureCourte(quand)}` : ""}
                  </p>
                  {r.document ? <Badge tone="ok">Devis reçu</Badge> : null}
                </div>
                {ligne ? <p className="text-[15px] text-muted">{ligne}</p> : null}
                {r.document ? (
                  <Button variant="secondary" onClick={() => void openDocument(r.document!.id, `Devis ${r.supplier.name}`, "devis.pdf")}>
                    Ouvrir le devis (PDF)
                  </Button>
                ) : null}
                {e
                  ? autres.map((f, i) => (
                      <Button key={f.id} variant="secondary" onClick={() => openFile({ url: `/v1/recus/${encodeURIComponent(e.id)}/fichiers/${encodeURIComponent(f.id)}`, title: `Pièce jointe de ${r.supplier.name}`, fileName: f.nom })}>
                        {autres.length > 1 ? `Ouvrir la pièce jointe ${i + 1}` : "Ouvrir la pièce jointe"}
                      </Button>
                    ))
                  : null}
                {request.retainedSupplierIds.length === 0 ? (
                  <Button variant="ink" onClick={() => onRetenir(r.supplier.id)}>
                    Je retiens ce négoce
                  </Button>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SupplierPicker({
  exclude = [],
  selected,
  onToggle,
  dark,
  onNames,
  allByDefault = false,
}: {
  /** Retour du fondateur (2026-10-10) : « les fournisseurs cochés par défaut » ; l'artisan décoche ceux qui ne reçoivent pas. */
  allByDefault?: boolean;
  exclude?: string[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  dark: boolean;
  /** Les noms des fournisseurs (le destinataire de l'aperçu, §45.3). */
  onNames?: (names: Map<string, string>) => void;
}) {
  const fetchSuppliers = useCallback((signal: AbortSignal) => api<{ items: Supplier[] }>("/v1/suppliers", { signal }), []);
  const { data, setData, error, reload } = useResource(fetchSuppliers);
  const [creating, setCreating] = useState(false);
  // Une seule fois, à l'arrivée du carnet : tout coché ; ensuite, seuls les gestes de l'artisan comptent.
  const defaulted = useRef(false);
  useEffect(() => {
    if (!data || !allByDefault || defaulted.current) return;
    defaulted.current = true;
    for (const s of data.items) if (!exclude.includes(s.id)) onToggle(s.id, true);
  }, [data, allByDefault, exclude, onToggle]);
  useEffect(() => {
    if (data && onNames) onNames(new Map(data.items.map((s) => [s.id, s.name])));
  }, [data, onNames]);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const choices = data.items.filter((s) => !exclude.includes(s.id));

  return (
    <div className="flex flex-col gap-2">
      {choices.length === 0 && !creating ? (
        <p className={`text-sm ${dark ? "text-[#c9ced6]" : "text-muted"}`}>
          {data.items.length === 0 ? "Ton carnet de fournisseurs est vide. Ajoutes-en un :" : "Tous tes fournisseurs sont déjà dans cette demande."}
        </p>
      ) : null}
      {choices.map((s) => (
        <label key={s.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-surface px-4 text-ink shadow-card">
          <input type="checkbox" checked={selected.has(s.id)} onChange={(e) => onToggle(s.id, e.target.checked)} className="size-5 accent-accent" />
          <span className="flex min-w-0 flex-col">
            <span className="font-bold">{s.name}</span>
            <span className="truncate text-[13px] text-muted">{s.email}</span>
          </span>
        </label>
      ))}
      {creating ? (
        <Card className="flex flex-col gap-3 p-4 text-ink">
          <h3 className="font-display text-lg font-extrabold">Nouveau fournisseur</h3>
          <SupplierForm
            submitLabel="Ajouter"
            others={data.items}
            onDone={(s) => {
              if (s) {
                setData({ items: [...data.items, s] });
                onToggle(s.id, true);
              }
              setCreating(false);
            }}
          />
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-[15px] font-bold ${dark ? "border-white/40 text-white" : "border-accent/40 text-accent-text"}`}
        >
          <Plus size={18} aria-hidden="true" />
          Ajouter un fournisseur
        </button>
      )}
    </div>
  );
}

function NewRequest({
  openAtStart,
  projectId,
  quantitatifId,
  deliversEmail,
  onSent,
  onCreated,
  onPreviewClosed,
}: {
  openAtStart: boolean;
  onPreviewClosed?: () => void;
  projectId: string;
  quantitatifId: string | null;
  deliversEmail: boolean;
  onSent: () => void;
  onCreated: (r: PriceRequest) => void;
}) {
  const id = useId();
  const [previewing, setPreviewing] = useState(openAtStart && quantitatifId !== null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const key = useRef(newActionKey());
  // §42.2 : « Joindre le détail du chantier (sans prix) », cochée par défaut, mémorisée par entreprise.
  const fetchSettings = useCallback((signal: AbortSignal) => api<PriceRequestSettings>("/v1/price-requests/settings", { signal }), []);
  const settings = useResource(fetchSettings);
  const attachDetail = settings.data?.attachQuoteDetail ?? true;
  const setAttachDetail = async (value: boolean) => {
    settings.setData((prev) => (prev ? { ...prev, attachQuoteDetail: value } : prev));
    await api<PriceRequestSettings>("/v1/price-requests/settings", { method: "PATCH", body: { attachQuoteDetail: value } });
  };

  const toggle = (supplierId: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(supplierId);
      else next.delete(supplierId);
      return next;
    });

  // §45.9 : « Envoyer » de l'aperçu crée la demande et, quand le serveur envoie les mails, l'envoie à chacun.
  async function create() {
    setPending(true);
    setError(null);
    try {
      let request = await api<PriceRequest>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, {
        method: "POST",
        body: { supplierIds: [...selected], message: message || null, dueDate: dueDate || null },
        idempotencyKey: key.current,
      });
      if (deliversEmail) {
        for (const r of request.recipients) request = await api<PriceRequest>(`/v1/price-request-recipients/${r.id}/send`, { method: "POST" });
        onSent();
      }
      setPreviewing(false);
      onCreated(request);
    } catch (e) {
      setError(toError(e));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SupplierPicker allByDefault selected={selected} onToggle={toggle} dark={false} />
      <details className="rounded-2xl bg-surface p-3 text-sm shadow-card">
        <summary className="cursor-pointer font-bold">Ajouter un message ou une date de réponse (facultatif)</summary>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={attachDetail} onChange={(e) => void setAttachDetail(e.target.checked)} className="size-5 accent-accent" />
          Joindre le détail du chantier (sans prix)
        </label>
        <div className="mt-3 flex flex-col gap-3">
          <label htmlFor={`${id}-message`} className="font-bold">
            Message
          </label>
          <textarea
            id={`${id}-message`}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ex. Livraison sur chantier possible ?"
            className="rounded-2xl bg-surface p-3 text-base text-ink outline-none placeholder:text-muted"
          />
          <label htmlFor={`${id}-due`} className="font-bold">
            Réponse souhaitée avant le
          </label>
          <input
            id={`${id}-due`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="min-h-12 rounded-2xl bg-surface px-3 text-base text-ink outline-none"
          />
        </div>
      </details>
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant="accent" pending={pending} disabled={selected.size === 0} onClick={() => void create()}>
        <Mail size={18} aria-hidden="true" />
        {selected.size === 0 ? "Coche au moins un fournisseur" : "Envoyer la demande de devis"}
      </Button>
      {previewing ? (
        // §50.7 : l'écran « Ton chantier » EST le document ; l'envoi ne montre plus d'aperçu, seulement à qui il part.
        <SendSheet
          canSend={selected.size > 0}
          sending={pending}
          onSend={() => void create()}
          onClose={() => {
            setPreviewing(false);
            onPreviewClosed?.();
          }}
        >
          {/* R7 : le rappel en une ligne au premier envoi (Greg, 27 octobre 2026). */}
          <RappelAdresseMobiiz />
          <SupplierPicker allByDefault selected={selected} onToggle={toggle} dark={false} />
        </SendSheet>
      ) : null}
    </div>
  );
}

/** « Ajouter un négoce » (menu « ··· » du chantier, point 8) : le carnet, sans ceux qui ont déjà la demande. */
function AddRecipients({ request, open, onClose, onChange }: { request: PriceRequest; open: boolean; onClose: () => void; onChange: (r: PriceRequest) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const setOpen = (v: boolean) => {
    if (!v) onClose();
  };

  if (!open) return null;

  async function add() {
    setPending(true);
    setError(null);
    try {
      onChange(await api<PriceRequest>(`/v1/price-requests/${request.id}/recipients`, { method: "POST", body: { supplierIds: [...selected] } }));
      setOpen(false);
      setSelected(new Set());
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <span className="font-bold">Ajouter un négoce à la demande</span>
      <SupplierPicker
        exclude={request.recipients.map((r) => r.supplier.id)}
        selected={selected}
        dark={false}
        onToggle={(id, on) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
          })
        }
      />
      {error ? <ErrorNotice error={error} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
        <Button pending={pending} disabled={selected.size === 0} onClick={() => void add()}>
          Ajouter
        </Button>
      </div>
    </Card>
  );
}

type CardState = { label: string; tone: "ok" | "warn" | "neutral"; info: string };

/** Où en est le fournisseur, en deux mots, et une seule information utile. */
function cardState(r: PriceRequestRecipient): CardState {
  switch (r.status) {
    case "to_send":
      return { label: "À envoyer", tone: "warn", info: r.supplier.email };
    case "sent":
      return { label: "En attente", tone: "neutral", info: r.sentAt ? `Demande envoyée le ${dateHeureCourte(new Date(r.sentAt))}` : "Demande envoyée" };
    case "received":
      // Point 7 (28 octobre 2026) : plus de « Prêt à comparer » : le devis s'ouvre tel quel.
      return { label: "Devis reçu", tone: "ok", info: "" };
    case "declined":
      return { label: "Pas de réponse", tone: "neutral", info: "" };
  }
}

type Panel = "email" | "lines" | "upload" | null;

/**
 * Un fournisseur : son nom, où il en est, et au plus une action utile à
 * l'étape (envoyer, ajouter son devis). Tout le reste est dans « ••• ».
 */
function RecipientCard({
  recipient: r,
  offer,
  request,
  archived,
  deliversEmail,
  onSent,
  onChange,
  onOfferChange,
  onReload,
}: {
  recipient: PriceRequestRecipient;
  offer: Offer | null;
  request: PriceRequest;
  archived: boolean;
  deliversEmail: boolean;
  onSent: () => void;
  onChange: (req: PriceRequest) => void;
  onOfferChange: (offer: Offer) => void;
  onReload: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const state = cardState(r);
  const demo = isDemoSupplier(r.supplier.email);
  const send = () =>
    run(async () => {
      onChange(await api<PriceRequest>(`/v1/price-request-recipients/${r.id}/send`, { method: "POST" }));
      setNotice("Envoyé, avec la demande de devis en PDF.");
      onSent();
    });
  // Le PDF est préparé dès que la carte s'affiche : le partage doit partir au moment même de l'appui (téléphone).
  const manual = !deliversEmail && !archived && !demo && r.status === "to_send" && !!request.packet;
  const [pdf, setPdf] = useState<File | null>(null);
  useEffect(() => {
    if (!manual) return;
    let cancelled = false;
    demandePdf(request.id, r.id)
      .then((f) => !cancelled && setPdf(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [manual, request.id, r.id]);
  const sendOwn = () =>
    run(async () => {
      const file = pdf ?? (await demandePdf(request.id, r.id));
      const how = await sendWithOwnMail(r, file);
      if (how === "cancelled") return;
      onChange(await api<PriceRequest>(`/v1/price-request-recipients/${r.id}`, { method: "PATCH", body: { status: "sent" } }));
      setNotice(
        how === "shared"
          ? `PDF joint. L'adresse ${r.supplier.email} est copiée : collez-la dans « À » si Mail ne l'a pas remplie.`
          : "Le PDF « demande-de-devis.pdf » est téléchargé : glisse-le dans l'e-mail qui vient de s'ouvrir.",
      );
      onSent();
    });

  async function run(action: () => Promise<void>) {
    setMenu(false);
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }
  const setStatus = (next: "to_send" | "sent" | "declined") =>
    run(async () => onChange(await api<PriceRequest>(`/v1/price-request-recipients/${r.id}`, { method: "PATCH", body: { status: next } })));
  const removeQuote = (documentId: string) =>
    run(async () => {
      await api<null>(`/v1/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
      onReload();
    });
  const simulate = () =>
    run(async () => {
      onChange(await api<PriceRequest>(`/v1/demo/recipients/${r.id}/quote`, { method: "POST" }));
    });
  const copy = () =>
    run(async () => {
      if (!r.email) return;
      await navigator.clipboard.writeText(`${r.email.subject}\n\n${r.email.body}`);
      setNotice("Texte de l'e-mail copié.");
      setTimeout(() => setNotice(null), 2500);
    });
  const toggle = (p: Panel) => {
    setMenu(false);
    setPanel(panel === p ? null : p);
  };

  const items: { label: string; onSelect: () => void }[] = [];
  if (r.email) items.push({ label: panel === "email" ? "Masquer l'e-mail" : "Voir l'e-mail", onSelect: () => toggle("email") });
  if (offer) items.push({ label: panel === "lines" ? "Masquer les lignes" : "Voir les lignes de son devis", onSelect: () => toggle("lines") });
  if (request.packet)
    items.push({ label: "Voir la demande de devis (PDF)", onSelect: () => openFile({ url: `/v1/price-requests/${encodeURIComponent(request.id)}/demande-de-devis.pdf`, title: "Demande de devis", fileName: "demande-de-devis.pdf" }) });
  if (!archived) {
    if (r.status === "to_send") {
      items.push({ label: "Copier le texte de l'e-mail", onSelect: () => void copy() });
      items.push({ label: "Déjà envoyé", onSelect: () => void setStatus("sent") });
    }
    if (r.status === "sent") {
      items.push({ label: "Renvoyer l'e-mail", onSelect: () => window.open(mailtoHref(r), "_self") });
      if (!demo) items.push({ label: "Test : simuler un devis fictif", onSelect: () => void simulate() });
      items.push({ label: "N'a pas répondu", onSelect: () => void setStatus("declined") });
    }
    if (r.status === "declined") items.push({ label: "Remettre en attente", onSelect: () => void setStatus("sent") });
    // Devis reçu par un autre chemin (téléphone, comptoir, photo) : on peut toujours le ranger ici.
    if (!r.document) items.push({ label: panel === "upload" ? "Masquer l'ajout du devis" : "Ajouter son devis reçu", onSelect: () => toggle("upload") });
    if (r.document) items.push({ label: "Retirer ce devis", onSelect: () => void removeQuote(r.document!.id) });
  }

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[17px] leading-snug font-extrabold">{r.supplier.name}</span>
          {state.info ? <span className="text-[13px] text-muted">{state.info}</span> : null}
        </div>
        <Badge tone={state.tone}>{state.label}</Badge>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={`Plus d'actions : ${r.supplier.name}`}
            className="-mt-1.5 -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-muted"
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {menu ? (
        <ul role="menu" aria-label={`Actions : ${r.supplier.name}`} className="flex flex-col divide-y divide-line rounded-2xl bg-ground px-3">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); item.onSelect(); }} className="flex min-h-11 w-full items-center text-left text-sm font-bold">
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <ErrorNotice error={error} /> : null}
      {notice ? (
        <p role="status" className="text-sm font-semibold text-ok">
          {notice}
        </p>
      ) : null}
      {panel === "email" && r.email ? <EmailPreview to={r.supplier.email} email={r.email} /> : null}
      {panel === "lines" && offer ? <OfferLines offer={offer} request={request} archived={archived} onChange={onOfferChange} /> : null}

      {/* Au plus une action à l'écran : celle de l'étape. */}
      {!archived && demo && !r.document && (r.status === "to_send" || r.status === "sent") ? (
        <DemoAnswer recipientId={r.id} onChange={onChange} />
      ) : null}
      {!archived && !demo && r.status === "to_send" ? (
        deliversEmail ? (
          // §43 : le serveur envoie le mail (trois blocs) avec le PDF joint.
          <Button pending={pending} onClick={() => void send()}>
            <Send size={18} aria-hidden="true" />
            Envoyer à {r.supplier.name}
          </Button>
        ) : (
          // Depuis la messagerie de l'artisan, le PDF joint (partage sur téléphone, téléchargement sur ordinateur).
          <Button pending={pending} onClick={() => void sendOwn()}>
            <Send size={18} aria-hidden="true" />
            Envoyer l&apos;e-mail avec le PDF
          </Button>
        )
      ) : null}
      {r.document ? (
        // Point 7 (Greg, 28 octobre 2026) : le devis reçu s'ouvre tel quel (aucune lecture IA).
        <Button variant="secondary" onClick={() => void openDocument(r.document!.id, `Devis ${r.supplier.name}`, "devis.pdf")}>
          Ouvrir le devis (PDF)
        </Button>
      ) : null}
      {!archived && !r.document && panel === "upload" ? <QuoteUpload recipientId={r.id} onChange={onChange} /> : null}
      {pending ? <Spinner /> : null}
    </Card>
  );
}

function QuoteUpload({ recipientId, onChange }: { recipientId: string; onChange: (r: PriceRequest) => void }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /** Un PDF, ou une ou plusieurs photos du devis (une par page). */
  async function send(files: File[]) {
    setError(null);
    const photos = files.filter(isPhoto);
    if (files.length > 1 && photos.length < files.length) {
      setError(new ApiError("validation_failed", 400, undefined, undefined, "one_pdf_or_photos"));
      return;
    }
    if (photos.length > MAX_QUOTE_PHOTOS) {
      setError(new ApiError("validation_failed", 400, undefined, undefined, "too_many_photos"));
      return;
    }
    if (photos.length === 0 && files[0]!.size > MAX_DOCUMENT_BYTES) {
      setError(new ApiError("payload_too_large", 413));
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      if (photos.length > 0) for (const file of await preparePhotos(photos)) form.append("file", file, file.name);
      else await attachFile(form, files[0]!);
      onChange(await api<PriceRequest>(`/v1/price-request-recipients/${recipientId}/quote`, { method: "POST", body: form }));
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf,image/*"
        multiple
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length > 0) void send(files);
        }}
      />
      <label
        htmlFor={inputId}
        aria-disabled={pending}
        className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ground px-4 font-extrabold text-ink focus-within:ring-2 ${pending ? "pointer-events-none opacity-70" : ""}`}
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
        {pending ? "Enregistrement du devis…" : "Ajouter son devis (PDF ou photos)"}
      </label>
    </div>
  );
}

/** Ce qui part (ou est parti) chez le fournisseur, mot pour mot : aucune surprise. */
function EmailPreview({ to, email }: { to: string; email: { subject: string; body: string } }) {
  return (
    <div className="rounded-2xl bg-ground px-3 py-2 text-sm">
      <dl className="flex flex-col gap-1">
        <div>
          <dt className="inline font-bold">À : </dt>
          <dd className="inline">{to}</dd>
        </div>
        <div>
          <dt className="inline font-bold">Objet : </dt>
          <dd className="inline">{email.subject}</dd>
        </div>
      </dl>
      <pre className="mt-2 font-sans text-[13px] leading-snug whitespace-pre-wrap">{email.body}</pre>
    </div>
  );
}

/**
 * §50.7 : après « Envoyer aux négoces », une seule chose à faire : choisir à qui. Le document est l'écran « Ton chantier »
 * qu'on vient de quitter (plus d'écran « Ce que le fournisseur va recevoir »).
 */
function SendSheet({ canSend, sending, onSend, onClose, children }: { canSend: boolean; sending: boolean; onSend: () => void; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="À qui j'envoie ?" className="fixed top-0 left-0 z-50 flex h-dvh w-full flex-col bg-ground">
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <h2 className="font-display text-[20px] font-extrabold">À qui j&apos;envoie ?</h2>
        <button type="button" onClick={onClose} aria-label="Revenir à mon chantier" className="inline-flex size-11 items-center justify-center rounded-xl">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 grow overflow-y-auto px-3 pb-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">{children}</div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 bg-ground px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-line">
        <Button className="min-h-14 w-full max-w-2xl text-[17px]" pending={sending} disabled={!canSend} onClick={onSend}>
          <Send size={18} aria-hidden="true" />
          {canSend ? "Envoyer" : "Choisis un fournisseur"}
        </Button>
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center text-sm font-bold text-muted">
          Revenir à la liste
        </button>
      </div>
    </div>
  );
}
