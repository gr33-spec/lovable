"use client";

import { FileUp, Loader2, Mail, MoreHorizontal, Plus, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AssistantMessage, Say } from "@/components/chat";
import { DemoAnswer, isDemoSupplier } from "@/components/demo";
import { NotificationsPrompt } from "@/components/notifications-prompt";
import { CompareQuotes, OfferLines, offerFacts, ProjectComparison } from "@/components/project-offers";
import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { attachFile } from "@/lib/upload";
import { fetchWhole } from "@/components/file-viewer";
import { api, ApiError, getActiveCompanyId, MAX_DOCUMENT_BYTES, newActionKey, type Offer, type PriceRequest, type PriceRequestRecipient, type PriceRequestSettings, type Supplier } from "@/lib/api";
import { openDocument, openFile } from "@/lib/open-document";
import { isPhoto, MAX_QUOTE_PHOTOS, preparePhotos } from "@/lib/photos";
import { useProgressRefresh } from "@/components/project-progress";
import { useResource } from "@/lib/use-resource";


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
  /** « Envoyer au fournisseur » du document : ouvre « À qui j'envoie ? » (ou montre les fournisseurs si la demande est partie). */
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
  const whole = (data?.items ?? []).filter((r) => !r.articles?.length);
  const parts = (data?.items ?? []).filter((r) => (r.articles?.length ?? 0) > 0);
  const sent = Boolean(whole[0]);
  useEffect(() => {
    if (data) onSentChange?.(sent);
  }, [data, sent, onSentChange]);

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

  const received = request.recipients.filter((r) => r.status === "received" && r.document);
  const unread = received.filter((r) => !offerOf(r.id)).length;
  const waiting = request.recipients.filter((r) => r.status === "sent").length;
  const hasOffers = (offers.data?.items.length ?? 0) > 0;

  return (
    <section id="fournisseurs" aria-label="Fournisseurs" className="flex scroll-mt-4 flex-col gap-3">
      {/* Une fois les offres comparées, la phrase d'attente n'a plus rien à dire : la comparaison parle. */}
      {hasOffers && waiting === 0 ? null : (
        <AssistantMessage>
          <Say>
            {request.recipients.some((r) => r.status === "to_send")
              ? "La demande est prête. Envoie-la à chaque fournisseur :"
              : "Demande envoyée. Quand un fournisseur te répond, ajoute son devis sur sa carte."}
          </Say>
        </AssistantMessage>
      )}
      {!archived && unread > 0 && offers.data ? (
        <CompareQuotes
          requestId={request.id}
          received={received.length}
          waiting={waiting}
          aiAvailable={offers.data.aiAvailable}
          onDone={(result) => {
            offers.setData({ aiAvailable: result.aiAvailable, items: result.items });
            setVersion((v) => v + 1);
            refreshProgress();
          }}
        />
      ) : null}
      {hasOffers ? <ProjectComparison request={request} version={version} archived={archived} onRequestChange={replace} /> : null}
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">FOURNISSEURS</h2>
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
              onSent={() => setSentCount((n) => n + 1)}
              onChange={replace}
              onOfferChange={offerChanged}
              onReload={reloadAll}
            />
          </li>
        ))}
      </ul>
      {!archived ? <AddRecipients request={request} onChange={replace} /> : null}
      {partsBlock}
    </section>
  );
}

function SupplierPicker({
  exclude = [],
  selected,
  onToggle,
  dark,
  onNames,
}: {
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
          className={`inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold ${dark ? "text-white" : "text-accent-text"}`}
        >
          <Plus size={18} aria-hidden="true" />
          Nouveau fournisseur
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
      <SupplierPicker selected={selected} onToggle={toggle} dark={false} />
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
            className="rounded-2xl bg-surface p-3 text-base text-ink outline-none placeholder:text-subtle"
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
          <SupplierPicker selected={selected} onToggle={toggle} dark={false} />
        </SendSheet>
      ) : null}
    </div>
  );
}

function AddRecipients({ request, onChange }: { request: PriceRequest; onChange: (r: PriceRequest) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={18} aria-hidden="true" />
        Demander à un autre fournisseur
      </Button>
    );
  }

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
      <span className="font-bold">Ajouter des fournisseurs à la demande</span>
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
function cardState(r: PriceRequestRecipient, offer: Offer | null): CardState {
  if (offer) {
    const facts = offerFacts(offer);
    return { label: facts.toCheck ? "À vérifier" : "Comparé", tone: facts.toCheck ? "warn" : "ok", info: facts.text };
  }
  switch (r.status) {
    case "to_send":
      return { label: "À envoyer", tone: "warn", info: r.supplier.email };
    case "sent":
      return { label: "En attente", tone: "neutral", info: r.sentAt ? `Demande envoyée le ${new Date(r.sentAt).toLocaleDateString("fr-FR")}` : "Demande envoyée" };
    case "received":
      return { label: "Devis reçu", tone: "ok", info: "Prêt à comparer" };
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
  const state = cardState(r, offer);
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
  if (r.document) items.push({ label: "Ouvrir son devis", onSelect: () => void openDocument(r.document!.id, r.document!.name, r.document!.name) });
  if (offer) items.push({ label: panel === "lines" ? "Masquer les lignes" : "Voir les lignes de son devis", onSelect: () => toggle("lines") });
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
    if (!r.document && (r.status !== "sent" || demo)) {
      items.push({ label: panel === "upload" ? "Masquer l'ajout du devis" : "Ajouter son devis reçu", onSelect: () => toggle("upload") });
    }
    if (r.document) items.push({ label: "Retirer ce devis", onSelect: () => void removeQuote(r.document!.id) });
  }

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[17px] leading-snug font-extrabold">{r.supplier.name}</span>
          {state.info ? <span className={`text-[13px] ${state.tone === "warn" && offer ? "font-semibold text-warn" : "text-muted"}`}>{state.info}</span> : null}
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
              <button type="button" role="menuitem" onClick={item.onSelect} className="flex min-h-11 w-full items-center text-left text-sm font-bold">
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
      {!archived && request.packet ? (
        <button
          type="button"
          onClick={() => openFile({ url: `/v1/price-requests/${encodeURIComponent(request.id)}/demande-de-devis.pdf`, title: "Demande de devis", fileName: "demande-de-devis.pdf" })}
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-accent-text"
        >
          Voir la demande de devis (PDF)
        </button>
      ) : null}
      {!archived && !r.document && ((!demo && r.status === "sent") || panel === "upload") ? (
        <QuoteUpload recipientId={r.id} onChange={onChange} />
      ) : null}
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
 * §50.7 : après « Envoyer au fournisseur », une seule chose à faire : choisir à qui. Le document est l'écran « Ton chantier »
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
    <div role="dialog" aria-modal="true" aria-label="À qui j'envoie ?" className="fixed inset-0 z-50 flex flex-col bg-ground">
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <h2 className="font-display text-[20px] font-extrabold">À qui j&apos;envoie ?</h2>
        <button type="button" onClick={onClose} aria-label="Revenir à mon chantier" className="inline-flex size-11 items-center justify-center rounded-xl">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="grow overflow-y-auto px-3 pb-40">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">{children}</div>
      </div>
      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-ground/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
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
