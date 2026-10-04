"use client";

import { Plus, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Button, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type QuotePreview, type SupplyRow } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { parseQuantity } from "@/lib/labels";

/**
 * §45.9 L'APERÇU AVANT ENVOI : le document exactement comme le fournisseur le recevra (même générateur que le PDF),
 * en plein écran, lisible sur téléphone. Chaque ligne se corrige d'un tap (désignation, quantité, précision, croix),
 * « + Ajouter une ligne » en bas du tableau. Ce n'est pas une copie : chaque geste corrige la liste elle-même (et va
 * au journal, §45.6). Rien ne part avant « Envoyer ».
 */
export function QuotePreviewScreen({
  projectId,
  quantitatifId,
  destinataire,
  message,
  dueDate,
  onMessage,
  sending,
  onSend,
  onClose,
  onListChanged,
}: {
  projectId: string;
  quantitatifId: string;
  destinataire: string | null;
  message: string;
  dueDate: string;
  onMessage: (m: string) => void;
  sending: boolean;
  onSend: () => void;
  onClose: () => void;
  onListChanged?: () => void;
}) {
  const fetchPreview = useCallback(
    (signal: AbortSignal) =>
      api<QuotePreview>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests/preview`, {
        method: "POST",
        body: { message: message || null, dueDate: dueDate || null, destinataire },
        signal,
      }),
    [projectId, message, dueDate, destinataire],
  );
  const { data: preview, error: loadError, reload } = useResource(fetchPreview);
  const [actionError, setError] = useState<ApiError | null>(null);
  const error = actionError ?? loadError;
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const load = async () => reload();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Le même chemin que la correction d'un tap sur la liste (§41.4, journal §45.6).
  const correct = async (body: unknown) => {
    setBusy(true);
    try {
      await api(`/v1/quantitatifs/${encodeURIComponent(quantitatifId)}/corrections`, { method: "POST", body });
      await load();
      onListChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setBusy(false);
    }
  };
  const saveRow = async (row: SupplyRow, next: { designation: string; quantite: string; precision: string }) => {
    if (!row.cle) return;
    const before = parseQuantity(row.quantite.replace(/\s*\(.*\)$/, ""));
    const after = parseQuantity(next.quantite);
    if (row.cle.startsWith("line:")) {
      // Une ligne reprise du devis : c'est la ligne du devis qu'on corrige, la liste reste validée.
      const changed = next.designation !== row.designation || next.quantite !== row.quantite;
      if (changed)
        await correct({
          action: "modifier_ligne",
          id: row.cle.slice("line:".length),
          depuis_apercu: true,
          ligne: { libelle: next.designation, quantite: after?.quantity.replace(/\s/g, "") ?? null, unite: after?.unit || null },
        });
    } else {
      if (next.designation !== row.designation) await correct({ action: "renommer", id: row.cle, libelle: next.designation });
      if (after && after.unit && (after.quantity !== before?.quantity || after.unit !== before?.unit))
        await correct({ action: "fixer_quantite", id: row.cle, quantite: after.quantity.replace(/\s/g, ""), unite: after.unit });
    }
    if (next.precision !== (row.precision ?? "")) await correct({ action: "preciser", id: row.cle, precision: next.precision });
    setEditing(null);
  };

  const doc = preview?.document;
  return (
    <div role="dialog" aria-modal="true" aria-label="Aperçu de la demande de devis" className="fixed inset-0 z-50 flex flex-col bg-ground">
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <span className="text-sm font-extrabold tracking-[0.04em] text-muted">CE QUE LE FOURNISSEUR VA RECEVOIR</span>
        <button type="button" onClick={onClose} aria-label="Fermer l'aperçu" className="inline-flex size-11 items-center justify-center rounded-xl">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="grow overflow-y-auto px-3 pb-40">
        {error ? <ErrorNotice error={error} onRetry={() => void load()} /> : null}
        {!doc ? (
          <Spinner />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {/* Le mail court (§45.2) : l'objet, le texte ; le mot de l'artisan se réécrit ici. */}
            <section aria-label="Le mail" className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-card">
              <p className="text-[13px] text-muted">
                <span className="font-bold">Objet : </span>
                {preview.subject}
              </p>
              <MailText mail={preview.mail} message={message} onMessage={onMessage} />
            </section>
            {/* Le PDF (§45.3), page blanche comme à l'impression. */}
            <article aria-label="Demande de devis" className="flex flex-col gap-4 rounded-md bg-white p-4 text-[#1c1f26] shadow-card sm:p-6">
              <header className="flex items-start justify-between gap-3 border-b border-[#d9dbe2] pb-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  {preview.hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/v1/company/logo" alt={`Logo ${doc.entete.entreprise}`} className="mb-1 max-h-12 max-w-36 object-contain object-left" />
                  ) : null}
                  <span className={preview.hasLogo ? "text-[13px] font-bold" : "text-[19px] font-extrabold"}>{doc.entete.entreprise}</span>
                  {doc.entete.coordonnees.map((c) => (
                    <span key={c} className="text-[11px] text-[#6b707f]">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex shrink-0 flex-col items-end text-right">
                  <span className="text-[16px] font-extrabold">{doc.entete.titre}</span>
                  <span className="text-[12px]">{doc.entete.chantier}</span>
                  {doc.entete.ville ? <span className="text-[12px]">{doc.entete.ville}</span> : null}
                  <span className="text-[12px]">{doc.entete.date}</span>
                  {doc.entete.reference ? <span className="text-[12px]">Réf. {doc.entete.reference}</span> : null}
                </div>
              </header>
              {doc.destinataire ? (
                <p className="flex flex-col">
                  <span className="text-[11px] text-[#6b707f]">Destinataire</span>
                  <span className="text-[14px] font-bold">{doc.destinataire}</span>
                </p>
              ) : null}
              {doc.blocs.map((b) => (
                <section key={b.titre} aria-label={b.titre} className="flex flex-col gap-1.5">
                  <h3 className="text-[14px] font-extrabold">
                    {b.numero}. {b.titre}
                  </h3>
                  {b.kind === "list" ? (
                    <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[13px]">
                      {b.lignes.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col">
                      <div className="grid grid-cols-[1fr_auto] gap-2 rounded bg-[#f2f3f5] px-2 py-1 text-[11px] font-bold text-[#6b707f]">
                        <span>Désignation · précision</span>
                        <span>Quantité</span>
                      </div>
                      <ul className="flex flex-col divide-y divide-[#e6e7eb]">
                        {b.lignes.map((r, i) =>
                          editing === i ? (
                            <li key={i} className="py-2">
                              <RowForm row={r} pending={busy} onCancel={() => setEditing(null)} onSave={(next) => void saveRow(r, next)} />
                            </li>
                          ) : (
                            <li key={i} className="flex items-start gap-1">
                              <button
                                type="button"
                                disabled={!r.cle || busy}
                                onClick={() => setEditing(i)}
                                aria-label={`Modifier : ${r.designation}`}
                                className="grid min-h-11 grow grid-cols-[1fr_auto] items-start gap-2 py-1.5 text-left"
                              >
                                <span className="flex min-w-0 flex-col">
                                  <span className="text-[13px] leading-snug font-semibold">
                                    {r.consommable && (i === 0 || !b.lignes[i - 1]?.consommable) ? <span className="mb-0.5 block text-[10px] font-bold text-[#6b707f] uppercase">Consommables</span> : null}
                                    {r.designation}
                                  </span>
                                  {r.precision ? <span className="text-[11px] text-[#6b707f]">{r.precision}</span> : null}
                                </span>
                                <span className="text-right text-[13px] font-extrabold">{r.quantite}</span>
                              </button>
                              {r.cle ? (
                                <button type="button" disabled={busy} onClick={() => void correct({ action: "retirer_article", id: r.cle })} aria-label={`Retirer : ${r.designation}`} className="inline-flex size-11 shrink-0 items-center justify-center text-[#9aa0ad]">
                                  <X size={16} aria-hidden="true" />
                                </button>
                              ) : null}
                            </li>
                          ),
                        )}
                      </ul>
                      {adding ? (
                        <AddRow
                          pending={busy}
                          onCancel={() => setAdding(false)}
                          onSave={async (row) => {
                            await correct({ action: "ajouter", depuis_apercu: true, ligne: { libelle: row.designation, quantite: row.quantite, unite: row.unite } });
                            setAdding(false);
                          }}
                        />
                      ) : (
                        <button type="button" onClick={() => setAdding(true)} className="mt-1 inline-flex min-h-11 items-center gap-1.5 self-start text-[13px] font-bold text-accent-text">
                          <Plus size={16} aria-hidden="true" />
                          Ajouter une ligne
                        </button>
                      )}
                    </div>
                  )}
                </section>
              ))}
              {doc.croquis.length > 0 ? (
                <p className="text-[12px] text-[#6b707f]">Croquis joints : {doc.croquis.map((c) => `${c.article} (${c.nom})`).join(", ")}</p>
              ) : null}
              <footer className="flex items-center justify-between gap-2 border-t border-[#d9dbe2] pt-2 text-[10px] text-[#6b707f]">
                <span>{doc.pied.question}</span>
                <span>{doc.pied.mention}</span>
              </footer>
            </article>
          </div>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-ground/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
        <Button className="min-h-14 w-full max-w-2xl text-[17px]" pending={sending} disabled={!preview || busy} onClick={onSend}>
          <Send size={18} aria-hidden="true" />
          Envoyer
        </Button>
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center text-sm font-bold text-muted">
          Revenir à la liste
        </button>
      </div>
    </div>
  );
}

/** Le mail court : seul le mot de l'artisan se réécrit (le reste suit le gabarit du §45.2). */
function MailText({ mail, message, onMessage }: { mail: string; message: string; onMessage: (m: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] leading-relaxed whitespace-pre-line">{mail}</p>
      {open ? (
        <label htmlFor={id} className="flex flex-col gap-1 text-sm font-bold">
          Votre mot (facultatif)
          <textarea id={id} rows={2} defaultValue={message} onBlur={(e) => onMessage(e.target.value.trim())} className="rounded-2xl bg-ground p-3 text-base font-normal" placeholder="ex. Livraison sur chantier possible ?" />
        </label>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center self-start text-sm font-bold text-accent-text">
          {message ? "Modifier votre mot" : "Ajouter un mot au fournisseur"}
        </button>
      )}
    </div>
  );
}

function RowForm({ row, pending, onSave, onCancel }: { row: SupplyRow; pending: boolean; onSave: (next: { designation: string; quantite: string; precision: string }) => void; onCancel: () => void }) {
  const id = useId();
  const [designation, setDesignation] = useState(row.designation);
  // « 4 longueurs de 4 m (13 ml à couvrir) » : on corrige la quantité achetée, pas ce qu'elle couvre.
  const [quantite, setQuantite] = useState(row.quantite.replace(/\s*\(.*\)$/, ""));
  const [precision, setPrecision] = useState(row.precision ?? "");
  const input = "min-h-11 w-full rounded-xl bg-[#f2f3f5] px-3 text-base";
  return (
    <form
      aria-label={`Modifier : ${row.designation}`}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (designation.trim()) onSave({ designation: designation.trim(), quantite: quantite.trim(), precision: precision.trim() });
      }}
    >
      <label htmlFor={`${id}-d`} className="flex flex-col gap-1 text-[12px] font-bold">
        Désignation
        <input id={`${id}-d`} className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </label>
      <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-[12px] font-bold">
        Quantité
        <input id={`${id}-q`} className={input} value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="ex. 5 longueurs de 4 m" />
      </label>
      <label htmlFor={`${id}-p`} className="flex flex-col gap-1 text-[12px] font-bold">
        Précision
        <input id={`${id}-p`} className={input} value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="ex. pour façonnage naissances" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function AddRow({ pending, onSave, onCancel }: { pending: boolean; onSave: (row: { designation: string; quantite: string | null; unite: string | null }) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("");
  const input = "min-h-11 w-full rounded-xl bg-[#f2f3f5] px-3 text-base";
  return (
    <form
      aria-label="Ajouter une ligne"
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (designation.trim()) void onSave({ designation: designation.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null });
      }}
    >
      <label htmlFor={`${id}-d`} className="flex flex-col gap-1 text-[12px] font-bold">
        Désignation
        <input id={`${id}-d`} className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="ex. Chevilles à frapper 6 × 40 mm" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-[12px] font-bold">
          Quantité
          <input id={`${id}-q`} className={input} inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </label>
        <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-[12px] font-bold">
          Unité
          <input id={`${id}-u`} className={input} value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="pièces, boîtes…" />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>
          Ajouter
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
