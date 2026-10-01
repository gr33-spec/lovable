"use client";

import { Check, Copy, FileUp, Loader2, Mail, Plus, Send } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { DemoAnswer, isDemoSupplier } from "@/components/demo";
import { OfferPanel, ProjectComparison, ReadAllQuotes } from "@/components/project-offers";
import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, newActionKey, type Offer, type PriceRequest, type PriceRequestRecipient, type Supplier } from "@/lib/api";
import { openDocument } from "@/lib/open-document";
import { useProgressRefresh } from "@/components/project-progress";
import { useResource } from "@/lib/use-resource";

const STATUS: Record<PriceRequestRecipient["status"], { label: string; tone: "ok" | "warn" | "neutral" }> = {
  to_send: { label: "À envoyer", tone: "warn" },
  sent: { label: "En attente de réponse", tone: "neutral" },
  received: { label: "Devis reçu", tone: "ok" },
  declined: { label: "Pas de réponse", tone: "neutral" },
};

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
 * puis déposer le devis PDF reçu de chacun.
 */
export function ProjectPriceRequests({ projectId, archived, canCreate }: { projectId: string; archived: boolean; canCreate: boolean }) {
  const fetchRequests = useCallback(
    (signal: AbortSignal) => api<{ items: PriceRequest[] }>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, { signal }),
    [projectId],
  );
  const { data, setData, error, reload } = useResource(fetchRequests);
  const refreshProgress = useProgressRefresh();
  const requestId = data?.items[0]?.id ?? null;
  // Devis déjà lus par l'IA, par destinataire ; `version` fait suivre la comparaison.
  const [version, setVersion] = useState(0);
  const fetchOffers = useCallback(
    (signal: AbortSignal) =>
      requestId
        ? api<{ aiAvailable: boolean; items: Offer[] }>(`/v1/price-requests/${requestId}/offers`, { signal })
        : Promise.resolve({ aiAvailable: false, items: [] as Offer[] }),
    [requestId],
  );
  const offers = useResource(fetchOffers);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const request = data.items[0] ?? null;
  const unread = request ? request.recipients.filter((r) => r.status === "received" && r.document && !offers.data?.items.some((o) => o.recipientId === r.id)).length : 0;
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

  if (!request) {
    if (archived || !canCreate) return null;
    return (
      <section
        id="fournisseurs"
        aria-labelledby="price-request-title"
        className="scroll-mt-4 flex flex-col gap-3 rounded-[26px] bg-[radial-gradient(130%_100%_at_100%_0%,rgba(255,90,31,0.45)_0%,rgba(255,90,31,0)_55%)] bg-ink p-4.5 text-white shadow-[0_18px_40px_rgba(14,17,22,0.22)]"
      >
        <span className="text-xs font-extrabold tracking-[0.04em] text-[#ffb48f]">PROCHAINE ÉTAPE</span>
        <h2 id="price-request-title" className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
          Demander les prix aux fournisseurs
        </h2>
        <p className="text-sm text-[#c9ced6]">Cochez les fournisseurs : chacun recevra la liste validée, prête à envoyer depuis votre messagerie.</p>
        <NewRequest projectId={projectId} onCreated={replace} />
      </section>
    );
  }

  return (
    <section id="fournisseurs" aria-labelledby="price-request-title" className="flex scroll-mt-4 flex-col gap-3">
      <h2 id="price-request-title" className="text-xs font-extrabold tracking-[0.04em] text-muted">
        DEMANDES DE PRIX
      </h2>
      <p role="status" className="text-sm">
        {summary(request)}
      </p>
      {!archived && unread > 0 && offers.data ? (
        <ReadAllQuotes
          requestId={request.id}
          unread={unread}
          waiting={request.recipients.filter((r) => r.status === "sent").length}
          aiAvailable={offers.data.aiAvailable}
          onRead={(result) => {
            offers.setData({ aiAvailable: result.aiAvailable, items: result.items });
            setVersion((v) => v + 1);
            refreshProgress();
          }}
        />
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {request.recipients.map((r) => (
          <li key={r.id}>
            <RecipientCard
              recipient={r}
              archived={archived}
              onChange={replace}
              onReload={() => {
                reload();
                offers.reload();
                setVersion((v) => v + 1);
                refreshProgress();
              }}
              offerSlot={
                r.status === "received" && r.document ? (
                  <OfferPanel
                    offer={offerOf(r.id)}
                    request={request}
                    archived={archived}
                    onChange={offerChanged}
                  />
                ) : null
              }
            />
          </li>
        ))}
      </ul>
      {!archived ? <AddRecipients request={request} onChange={replace} /> : null}
      {(offers.data?.items.length ?? 0) > 0 ? <ProjectComparison request={request} version={version} archived={archived} onRequestChange={replace} /> : null}
    </section>
  );
}

function summary(request: PriceRequest): string {
  const count = (s: PriceRequestRecipient["status"]) => request.recipients.filter((r) => r.status === s).length;
  const parts = [`${request.lines.length} ligne${request.lines.length > 1 ? "s" : ""} demandée${request.lines.length > 1 ? "s" : ""}`];
  const toSend = count("to_send");
  const received = count("received");
  if (toSend > 0) parts.push(`${toSend} à envoyer`);
  parts.push(`${received} devis reçu${received > 1 ? "s" : ""} sur ${request.recipients.length}`);
  return parts.join(" · ");
}

/** Liste des fournisseurs à cocher, avec création rapide d'un nouveau. */
function SupplierPicker({
  exclude = [],
  selected,
  onToggle,
  dark,
}: {
  exclude?: string[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  dark: boolean;
}) {
  const fetchSuppliers = useCallback((signal: AbortSignal) => api<{ items: Supplier[] }>("/v1/suppliers", { signal }), []);
  const { data, setData, error, reload } = useResource(fetchSuppliers);
  const [creating, setCreating] = useState(false);

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
          <input type="checkbox" checked={selected.has(s.id)} onChange={(e) => onToggle(s.id, e.target.checked)} className="size-5 accent-[#ff5a1f]" />
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

function NewRequest({ projectId, onCreated }: { projectId: string; onCreated: (r: PriceRequest) => void }) {
  const id = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const key = useRef(newActionKey());

  const toggle = (supplierId: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(supplierId);
      else next.delete(supplierId);
      return next;
    });

  async function create() {
    setPending(true);
    setError(null);
    try {
      onCreated(
        await api<PriceRequest>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, {
          method: "POST",
          body: { supplierIds: [...selected], message: message || null, dueDate: dueDate || null },
          idempotencyKey: key.current,
        }),
      );
    } catch (e) {
      setError(toError(e));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SupplierPicker selected={selected} onToggle={toggle} dark />
      <details className="rounded-2xl bg-white/8 p-3 text-sm">
        <summary className="cursor-pointer font-bold">Ajouter un message ou une date de réponse (facultatif)</summary>
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
        {selected.size === 0
          ? "Cochez au moins un fournisseur"
          : `Préparer ${selected.size > 1 ? `les ${selected.size} e-mails` : "l'e-mail"}`}
      </Button>
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

function RecipientCard({
  recipient: r,
  archived,
  onChange,
  onReload,
  offerSlot,
}: {
  recipient: PriceRequestRecipient;
  archived: boolean;
  onChange: (req: PriceRequest) => void;
  onReload: () => void;
  /** Lecture du devis reçu (résumé, détail), fournie par la section. */
  offerSlot: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const status = STATUS[r.status];
  const demo = isDemoSupplier(r.supplier.email);

  async function setStatus(next: "to_send" | "sent" | "declined") {
    setPending(true);
    setError(null);
    try {
      onChange(await api<PriceRequest>(`/v1/price-request-recipients/${r.id}`, { method: "PATCH", body: { status: next } }));
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }

  /** Devis déposé par erreur : on le retire, la demande repasse « Envoyée ». */
  async function removeQuote(documentId: string) {
    setPending(true);
    setError(null);
    try {
      await api<null>(`/v1/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
      onReload();
    } catch (e) {
      setError(toError(e));
      setPending(false);
    }
  }

  async function copy() {
    if (!r.email) return;
    try {
      await navigator.clipboard.writeText(`${r.email.subject}\n\n${r.email.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* presse-papiers indisponible : l'artisan peut encore utiliser « Envoyer » */
    }
  }

  const small = "inline-flex min-h-11 items-center gap-1.5 text-sm font-bold disabled:opacity-60";

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[17px] font-extrabold">{r.supplier.name}</span>
          <span className="truncate text-[13px] text-muted">{r.supplier.email}</span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {error ? <ErrorNotice error={error} /> : null}

      {r.email ? <EmailPreview to={r.supplier.email} email={r.email} /> : null}

      {r.status === "received" && r.document ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => void openDocument(r.document!.id)} className={`${small} min-w-0 text-accent-text`}>
            <span className="truncate">Ouvrir son devis ({r.document.name})</span>
          </button>
          {!archived ? (
            <button type="button" onClick={() => void removeQuote(r.document!.id)} disabled={pending} className={`${small} text-muted`}>
              Retirer ce devis
            </button>
          ) : null}
        </div>
      ) : null}
      {offerSlot}

      {!archived && demo && !r.document && r.status !== "declined" ? <DemoAnswer recipientId={r.id} onChange={onChange} /> : null}

      {!archived && r.status === "to_send" && !demo ? (
        <>
          {/* Ouvre la messagerie avec l'e-mail rempli, et note la demande comme envoyée. */}
          <a
            href={mailtoHref(r)}
            onClick={() => void setStatus("sent")}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-base font-extrabold text-white"
          >
            <Send size={18} aria-hidden="true" />
            Envoyer l&apos;e-mail
          </a>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => void copy()} className={`${small} text-accent-text`}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? "Texte copié" : "Copier le texte"}
            </button>
            <button type="button" onClick={() => void setStatus("sent")} disabled={pending} className={`${small} text-muted`}>
              Déjà envoyé
            </button>
          </div>
        </>
      ) : null}

      {!archived && (r.status === "sent" || r.status === "declined") ? (
        <>
          {r.status === "sent" && r.sentAt ? (
            <p className="text-sm text-muted">Envoyée le {new Date(r.sentAt).toLocaleDateString("fr-FR")}. Déposez son devis dès qu&apos;il arrive.</p>
          ) : null}
          <QuoteUpload recipientId={r.id} onChange={onChange} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={mailtoHref(r)} className={`${small} text-accent-text`}>
              <Mail size={16} aria-hidden="true" />
              Renvoyer l&apos;e-mail
            </a>
            {r.status === "sent" ? (
              <button type="button" onClick={() => void setStatus("declined")} disabled={pending} className={`${small} text-muted`}>
                N&apos;a pas répondu
              </button>
            ) : (
              <button type="button" onClick={() => void setStatus("sent")} disabled={pending} className={`${small} text-muted`}>
                Remettre en attente
              </button>
            )}
          </div>
        </>
      ) : null}

      {!archived && !demo && !r.document && r.status !== "declined" ? <DemoAnswer recipientId={r.id} discreet onChange={onChange} /> : null}
    </Card>
  );
}

function QuoteUpload({ recipientId, onChange }: { recipientId: string; onChange: (r: PriceRequest) => void }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function send(file: File) {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(new ApiError("payload_too_large", 413));
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
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
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
        }}
      />
      <label
        htmlFor={inputId}
        aria-disabled={pending}
        className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-4 font-extrabold text-white focus-within:ring-2 ${pending ? "pointer-events-none opacity-70" : ""}`}
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
        {pending ? "Enregistrement du devis…" : "Ajouter son devis (PDF)"}
      </label>
    </div>
  );
}

/** Ce qui part (ou est parti) chez le fournisseur, mot pour mot : aucune surprise. */
function EmailPreview({ to, email }: { to: string; email: { subject: string; body: string } }) {
  return (
    <details className="rounded-2xl bg-ground px-3 py-2 text-sm">
      <summary className="cursor-pointer font-bold">Voir l&apos;e-mail</summary>
      <dl className="mt-2 flex flex-col gap-1">
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
    </details>
  );
}
