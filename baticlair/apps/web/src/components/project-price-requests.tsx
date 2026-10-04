"use client";

import { FileUp, Loader2, Mail, MoreHorizontal, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AssistantMessage, Say } from "@/components/chat";
import { DemoAnswer, isDemoSupplier } from "@/components/demo";
import { NotificationsPrompt } from "@/components/notifications-prompt";
import { CompareQuotes, OfferLines, offerFacts, ProjectComparison } from "@/components/project-offers";
import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { attachFile } from "@/lib/upload";
import { api, ApiError, MAX_DOCUMENT_BYTES, newActionKey, type Offer, type PriceRequest, type PriceRequestRecipient, type PriceRequestSettings, type Supplier } from "@/lib/api";
import { openDocument, openFile } from "@/lib/open-document";
import { isPhoto, MAX_QUOTE_PHOTOS, preparePhotos } from "@/lib/photos";
import { useProgressRefresh } from "@/components/project-progress";
import { QuotePreviewScreen } from "@/components/quote-preview";
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
  onListChanged,
  openSignal = 0,
  onSentChange,
}: {
  projectId: string;
  archived: boolean;
  canCreate: boolean;
  /** §45.9 : l'aperçu corrige la liste elle-même (par le quantitatif). */
  quantitatifId?: string | null;
  onListChanged?: () => void;
  /** « Envoyer au fournisseur » de la liste : ouvre l'aperçu (ou montre les fournisseurs si la demande est partie). */
  openSignal?: number;
  /** La demande est-elle déjà partie ? La liste le dit sur son gros bouton. */
  onSentChange?: (sent: boolean) => void;
}) {
  const fetchRequests = useCallback(
    (signal: AbortSignal) => api<{ items: PriceRequest[] }>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchRequests);
  const refreshProgress = useProgressRefresh();
  // Des e-mails partent-ils du serveur (§43) ? Sinon, l'artisan envoie depuis sa messagerie.
  const fetchSettings = useCallback((signal: AbortSignal) => api<PriceRequestSettings & { deliversEmail: boolean }>("/v1/price-requests/settings", { signal }), []);
  const deliversEmail = useResource(fetchSettings).data?.deliversEmail ?? false;
  // § 43.4 : après un envoi (jamais avant), l'écran « Active tes notifications » peut se proposer.
  const [sentCount, setSentCount] = useState(0);
  const requestId = data?.items[0]?.id ?? null;
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
  const sent = Boolean(data?.items[0]);
  useEffect(() => {
    if (data) onSentChange?.(sent);
  }, [data, sent, onSentChange]);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const request = data.items[0] ?? null;
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

  if (!request) {
    if (archived || !canCreate) return null;
    return (
      <section id="fournisseurs" aria-labelledby="price-request-title" className="scroll-mt-4">
        <AssistantMessage>
          <h2 id="price-request-title" className="text-base leading-relaxed font-semibold">
            À qui j&apos;envoie la liste ?
          </h2>
          <NewRequest
            key={openSignal}
            openAtStart={openSignal > 0}
            projectId={projectId}
            quantitatifId={quantitatifId ?? null}
            deliversEmail={deliversEmail}
            onListChanged={onListChanged}
            onSent={() => setSentCount((n) => n + 1)}
            onCreated={replace}
          />
        </AssistantMessage>
      </section>
    );
  }

  const received = request.recipients.filter((r) => r.status === "received" && r.document);
  const unread = received.filter((r) => !offerOf(r.id)).length;
  const waiting = request.recipients.filter((r) => r.status === "sent").length;
  const hasOffers = (offers.data?.items.length ?? 0) > 0;

  return (
    <section id="fournisseurs" aria-label="Fournisseurs" className="flex scroll-mt-4 flex-col gap-3">
      <AssistantMessage>
        <Say>
          {request.recipients.some((r) => r.status === "to_send")
            ? "La demande est prête. Envoyez-la à chaque fournisseur :"
            : "Demande envoyée. Ajoutez ici le devis de chaque fournisseur quand il répond."}
        </Say>
      </AssistantMessage>
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
      <ul className="flex flex-col gap-2" aria-label="Vos fournisseurs">
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
          {data.items.length === 0 ? "Votre carnet de fournisseurs est vide. Ajoutez-en un :" : "Tous vos fournisseurs sont déjà dans cette demande."}
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
  onListChanged,
  onSent,
  onCreated,
}: {
  openAtStart: boolean;
  projectId: string;
  quantitatifId: string | null;
  deliversEmail: boolean;
  onListChanged?: (() => void) | undefined;
  onSent: () => void;
  onCreated: (r: PriceRequest) => void;
}) {
  const id = useId();
  const [previewing, setPreviewing] = useState(openAtStart && quantitatifId !== null);
  const [supplierNames, setSupplierNames] = useState<Map<string, string>>(new Map());
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
      <SupplierPicker selected={selected} onToggle={toggle} dark={false} onNames={setSupplierNames} />
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
      {/* §45.9 : rien ne part sans l'aperçu ; il s'ouvre en plein écran, la liste s'y corrige d'un tap. */}
      <Button variant="accent" pending={pending} disabled={selected.size === 0} onClick={() => (quantitatifId ? setPreviewing(true) : void create())}>
        <Mail size={18} aria-hidden="true" />
        {selected.size === 0 ? "Cochez au moins un fournisseur" : "Voir la demande de devis"}
      </Button>
      {previewing && quantitatifId ? (
        <QuotePreviewScreen
          projectId={projectId}
          quantitatifId={quantitatifId}
          destinataire={selected.size === 1 ? (supplierNames.get([...selected][0]!) ?? null) : null}
          message={message}
          dueDate={dueDate}
          onMessage={setMessage}
          // Les fournisseurs se choisissent dans l'aperçu même : rien ne part sans un destinataire.
          top={<SupplierPicker selected={selected} onToggle={toggle} dark={false} onNames={setSupplierNames} />}
          canSend={selected.size > 0}
          sending={pending}
          onSend={() => void create()}
          onClose={() => setPreviewing(false)}
          {...(onListChanged ? { onListChanged } : {})}
        />
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
          <a
            href={mailtoHref(r)}
            onClick={() => void setStatus("sent")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-extrabold text-white"
          >
            <Send size={18} aria-hidden="true" />
            Envoyer l&apos;e-mail
          </a>
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
