"use client";

import { AlertTriangle, ChevronDown, Loader2, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import { parseQuantity } from "@/lib/labels";
import { ApiError, type ItemSketch, type PurchaseAssumption, type PurchaseItem, type Takeoff } from "@/lib/api";
import { openDocument } from "@/lib/open-document";
import { ErrorNotice } from "@/components/ui";
import { shortName } from "@/lib/labels";

/**
 * LA CARTE DU QUANTITATIF (chat, référentiel §21) : les articles à commander
 * rangés par ouvrage (« Couverture en ardoises · 200 m² »), ce que le
 * fournisseur chiffrera, une ligne d'hypothèses modifiable d'un geste, puis
 * « Envoyer au fournisseur ». Jamais de quantité demandée à l'artisan.
 */
/** Ce que l'artisan réécrit sur une ligne (§41.4) : le texte lui-même, et la quantité avec son unité. */
export interface ItemEdit {
  libelle: string;
  quantite: string | null;
  unite: string | null;
}

export function QuantityCard({
  takeoff,
  editable,
  pending,
  onAnswer,
  onEditItem,
  onSuggestion,
  sketches = [],
  onAttach,
  onDetach,
}: {
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  onAnswer: DecisionHandlers["onAnswer"];
  onEditItem?: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  /** §45.8 « On ajoute ? » : Oui / Non d'un tap. */
  onSuggestion?: (item: PurchaseItem, answer: "oui" | "non") => Promise<void>;
  /** Croquis rattachés aux articles (clé de l'article) : visibles sous la ligne, joints à la commande. */
  sketches?: readonly ItemSketch[];
  onAttach?: SketchHandlers["onAttach"];
  onDetach?: SketchHandlers["onDetach"];
}) {
  const p = takeoff.purchase;
  const byKey = new Map(p.toBuy.map((b) => [b.key, b]));
  const caption = "text-sm font-bold text-muted";
  return (
    <section aria-label="Quantitatif" className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="font-display text-[24px] font-extrabold tracking-[-0.02em]">Fournitures à chiffrer</h2>
        {p.toBuy.length > 0 ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[13px] font-extrabold text-accent-text">
            {p.toBuy.length} article{p.toBuy.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      {p.toBuy.length === 0 ? <p className="px-4 pb-3 text-sm text-muted">Aucune fourniture à chiffrer pour l&apos;instant.</p> : null}
      {p.groups.map((g) => (
        <div key={g.key} className="flex flex-col border-t border-line px-4 pt-3 pb-1">
          <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-muted uppercase">
            {g.label}
            {g.measure ? ` · ${g.measure}` : ""}
          </h3>
          <ul aria-label={g.label} className="flex flex-col divide-y divide-line">
            {g.itemKeys.map((k) => {
              const item = byKey.get(k);
              return item ? (
                <BuyRow
                  key={k}
                  item={item}
                  takeoff={takeoff}
                  editable={editable}
                  pending={pending}
                  onEdit={onEditItem}
                  sketches={sketches.filter((x) => x.article === item.key)}
                  {...(onAttach && onDetach ? { sketchHandlers: { onAttach, onDetach } } : {})}
                />
              ) : null;
            })}
          </ul>
        </div>
      ))}
      {editable && onSuggestion && (p.suggestions ?? []).length > 0 ? <Suggestions items={p.suggestions} pending={pending} onAnswer={onSuggestion} onEdit={onEditItem} /> : null}
      {p.toQuote.length > 0 ? (
        <div className="flex flex-col gap-1 bg-warn-bg px-4 py-3">
          <h3 className={`${caption} text-warn`}>À préciser avec le fournisseur</h3>
          <ul aria-label="À préciser avec le fournisseur" className="flex flex-col gap-1">
            {p.toQuote.map((q) => (
              <li key={q.key} className="text-[15px] leading-snug">
                <span className="font-bold">{shortName(q.label)}</span>
                {q.measure ? <span className="text-muted"> · {q.measure}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {p.assumptions.length > 0 ? <Assumptions assumptions={p.assumptions} editable={editable} pending={pending} onAnswer={onAnswer} /> : null}
    </section>
  );
}

/**
 * §45.8 « ON AJOUTE ? » : les consommables que le devis ne cite pas, avec une quantité déjà proposée. Un tap sur
 * Oui ou Non, un tap sur la quantité pour la changer. Pas un formulaire : rien d'obligatoire.
 */
export function Suggestions({
  items,
  pending,
  onAnswer,
  onEdit,
}: {
  items: PurchaseItem[];
  pending: boolean;
  onAnswer: (item: PurchaseItem, answer: "oui" | "non") => Promise<void>;
  onEdit?: ((item: PurchaseItem, edit: ItemEdit) => Promise<void>) | undefined;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section aria-label="On ajoute ?" className="flex flex-col gap-1 border-t border-line bg-ground/50 px-4 py-3">
      <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-muted uppercase">On ajoute ?</h3>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((s) => (
          <li key={s.key} className="flex flex-col gap-2 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex min-w-0 grow flex-col">
                <span className="text-[15px] leading-snug font-semibold">{s.label}</span>
                {s.precision ? <span className="text-[13px] text-muted">{s.precision}</span> : null}
              </span>
              {onEdit ? (
                <button type="button" onClick={() => setEditing(editing === s.key ? null : s.key)} aria-label={`Changer la quantité : ${s.label}`} className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-2 text-[15px] font-extrabold whitespace-nowrap tabular-nums underline decoration-dotted underline-offset-4">
                  {s.quantity}
                </button>
              ) : (
                <span className="shrink-0 text-[15px] font-extrabold whitespace-nowrap tabular-nums">{s.quantity}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => void onAnswer(s, "oui")} aria-label={`Oui, ajouter ${s.label}`} className="inline-flex min-h-11 grow items-center justify-center rounded-xl bg-cta text-[15px] font-extrabold text-white shadow-cta disabled:opacity-60">
                Oui
              </button>
              <button type="button" disabled={pending} onClick={() => void onAnswer(s, "non")} aria-label={`Non, pas de ${s.label}`} className="inline-flex min-h-11 grow items-center justify-center rounded-xl bg-surface text-[15px] font-extrabold shadow-card disabled:opacity-60">
                Non
              </button>
            </div>
            {editing === s.key && onEdit ? (
              <ItemForm
                item={s}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={async (e) => {
                  await onEdit(s, e);
                  setEditing(null);
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface SketchHandlers {
  onAttach: (itemKey: string, file: File, commentaire: string) => Promise<void>;
  onDetach: (sketchId: string) => Promise<void>;
}

/** Un article à acheter : nom, quantité, le calcul à un appui, et le crayon pour tout réécrire (§41.4) ou joindre un croquis. */
function BuyRow({
  item,
  takeoff,
  editable,
  pending,
  onEdit,
  sketches,
  sketchHandlers,
}: {
  item: PurchaseItem;
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  onEdit?: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  sketches: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const proofs = takeoff.view.items.filter((i) => (item.kind === "computed" ? i.kind === "need" && item.needIds.includes(i.id) : i.kind === "line" && item.lineIds.includes(i.id)));
  const name = item.kind === "direct" ? shortName(item.label) : item.label;
  // Une ligne = l'article à gauche, sa quantité à droite ; un appui sur la ligne montre le calcul.
  const row = (
    <>
      {item.state === "to_confirm" ? <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-label="à confirmer" /> : null}
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[15px] leading-snug font-semibold">{name}</span>
        {item.precision ? <span className="text-[13px] leading-snug text-muted">{item.precision}</span> : null}
        {proofs.length > 0 ? <span className="text-[12px] font-semibold text-subtle">{open ? "Masquer le calcul" : "Voir le calcul"}</span> : null}
      </span>
      <span className="flex shrink-0 flex-col items-end text-right">
        <span className="text-[16px] font-extrabold whitespace-nowrap tabular-nums">{item.quantity ?? "à préciser"}</span>
        {item.approx ? <span className="text-[12px] whitespace-nowrap text-muted">{item.approx}</span> : null}
      </span>
    </>
  );
  const edit = editable && onEdit;
  return (
    <li className={`flex flex-col gap-1.5 py-2.5 transition-colors ${editing ? "-mx-2 my-1 rounded-2xl bg-[#eef2ff] px-2" : ""}`}>
      <div className="flex items-start gap-0.5">
        {proofs.length > 0 ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Voir le calcul : ${item.label}`} className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl text-left active:bg-ground/60">
            {row}
          </button>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-3">{row}</div>
        )}
        {edit ? (
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            aria-label={editing ? `Fermer : ${item.label}` : `Modifier : ${item.label}`}
            aria-expanded={editing}
            className={`-mr-2 inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-xl ${editing ? "text-accent-text" : "text-subtle active:text-accent-text"}`}
          >
            {editing ? <X size={18} aria-hidden="true" /> : <Pencil size={17} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {item.edited?.length ? <p className="text-[13px] text-muted">Réécrit par vous : {item.edited.map((e) => (e === "label" ? "le libellé" : e === "quantity" ? "la quantité" : "la précision")).join(" et ")}.</p> : null}
      {sketches.length > 0 ? (
        <ul aria-label={`Croquis joints : ${item.label}`} className="flex flex-wrap gap-2">
          {sketches.map((sk) => (
            <li key={sk.id} className="flex max-w-full items-center gap-1 rounded-xl bg-[#eeedff] pl-2.5 text-[13px] font-bold text-[#4a37d6]">
              <button type="button" onClick={() => void openDocument(sk.id, sk.nom, sk.nom)} className="flex min-h-9 min-w-0 items-center gap-1.5 text-left">
                <Paperclip size={14} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{sk.commentaire ? `${sk.nom} · ${sk.commentaire}` : sk.nom}</span>
              </button>
              {editable && sketchHandlers ? (
                <button type="button" disabled={pending} onClick={() => void sketchHandlers.onDetach(sk.id)} aria-label={`Retirer le croquis ${sk.nom}`} className="flex size-9 shrink-0 items-center justify-center text-[#4a37d6]/70">
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editing && edit ? (
        <ItemForm
          item={item}
          {...(sketchHandlers ? { onAttach: (file: File, commentaire: string) => sketchHandlers.onAttach(item.key, file, commentaire) } : {})}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSave={async (e) => {
            await onEdit(item, e);
            setEditing(false);
          }}
        />
      ) : null}
      {open ? proofs.map((i) => <Proof key={`${i.kind}:${i.id}`} item={i} />) : null}
    </li>
  );
}

/** La fiche qui s'ouvre sous une ligne : un panneau blanc bordé, des champs au contour net (mêmes pour toutes les lignes). */
export const EDIT_PANEL = "flex scroll-mb-52 flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-accent/25";
export const EDIT_FIELD =
  "min-h-12 w-full rounded-xl border border-[#d5d9e0] bg-surface px-3 text-base font-normal outline-none transition-colors placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20";

/** Le texte et la quantité d'une ligne, tels que l'artisan veut les voir partir chez le fournisseur. */
export function ItemForm({
  item,
  pending,
  onSave,
  onCancel,
  onAttach,
  onRemove,
}: {
  item: PurchaseItem;
  pending: boolean;
  onSave: (e: ItemEdit) => Promise<void>;
  onCancel: () => void;
  onAttach?: (file: File, commentaire: string) => Promise<void>;
  onRemove?: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const parsed = item.quantity ? parseQuantity(item.quantity) : null;
  const [libelle, setLibelle] = useState(item.label);
  const [quantite, setQuantite] = useState(parsed?.quantity ?? "");
  const [unite, setUnite] = useState(parsed?.unit ?? "");
  // La fiche s'ouvre sous la ligne : on la fait venir à l'écran, sans ouvrir le clavier tout seul.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, []);
  const input = EDIT_FIELD;
  return (
    <form
      ref={ref}
      aria-label={`Modifier : ${item.label}`}
      className={EDIT_PANEL}
      onSubmit={(e) => {
        e.preventDefault();
        if (!libelle.trim()) return;
        void onSave({ libelle: libelle.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null });
      }}
    >
      <p className="text-[12px] font-extrabold tracking-[0.04em] text-accent-text">MODIFIER L&apos;ARTICLE</p>
      <label htmlFor={`${id}-l`} className="flex flex-col gap-1 text-sm font-bold">
        Désignation
        <input id={`${id}-l`} className={input} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-sm font-bold">
          Quantité
          <input id={`${id}-q`} className={input} inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </label>
        <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-sm font-bold">
          Unité
          <input id={`${id}-u`} className={input} value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="pièces, ml, kg…" />
        </label>
      </div>
      {onAttach ? <SketchPicker label={item.label} onAttach={onAttach} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" pending={pending}>
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="-mb-1 inline-flex min-h-11 items-center justify-center gap-1.5 border-t border-line pt-2 text-sm font-bold text-danger">
          <Trash2 size={16} aria-hidden="true" />
          Retirer de la liste
        </button>
      ) : null}
    </form>
  );
}

/**
 * Joindre un croquis à l'article (couvertine, habillage, bande façonnée…) : une photo ou un PDF, et une précision
 * facultative. Il part avec la commande (PDF et mail) ; jamais lu par l'IA, jamais une mesure de calcul.
 */
function SketchPicker({ label, onAttach }: { label: string; onAttach: (file: File, commentaire: string) => Promise<void> }) {
  const id = useId();
  const [commentaire, setCommentaire] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#c9c2ff] bg-white p-3">
      <p className="text-sm font-bold">Croquis ou photo (facultatif)</p>
      <input
        aria-label={`Précision du croquis : ${label}`}
        className="min-h-11 w-full rounded-xl bg-ground px-3 text-[15px]"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Ex. dév. 330, 2 plis, longueurs de 2 m"
        maxLength={1000}
      />
      {error ? <ErrorNotice error={error} /> : null}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            await onAttach(file, commentaire.trim());
            setCommentaire("");
          } catch (err) {
            setError(err instanceof ApiError ? err : new ApiError("internal_error", 500));
          } finally {
            setBusy(false);
          }
        }}
      />
      <label htmlFor={id} className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#eeedff] px-3 text-sm font-extrabold text-[#4a37d6] ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Paperclip size={16} aria-hidden="true" />}
        {busy ? "Envoi du croquis…" : "Joindre une photo ou un PDF"}
      </label>
    </div>
  );
}

/** Les hypothèses par défaut, sur une ligne repliée ; chacune se change d'un appui. */
/** « 45° » collé, « 60 cm » espacé, « 3 » pour les pièces. */
function withUnit(value: string, unit: string): string {
  // Une valeur dite en mots (« standard », « zinc naturel ») ne prend pas d'unité : jamais « standard mm ».
  if (!unit || unit === "u" || !/^\d/.test(value)) return value;
  return unit === "°" ? `${value}°` : `${value} ${unit}`;
}

export function Assumptions({ assumptions, editable, pending, onAnswer }: { assumptions: PurchaseAssumption[]; editable: boolean; pending: boolean; onAnswer: DecisionHandlers["onAnswer"] }) {
  const [open, setOpen] = useState(false);
  const text = assumptions.map((a) => `${a.label.toLowerCase()} ${withUnit(a.value, a.unit)}`).join(" · ");
  return (
    <section aria-label="Hypothèses" className="px-4 py-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-start gap-2 text-left text-sm">
        <ChevronDown size={16} aria-hidden="true" className={`mt-1 shrink-0 ${open ? "rotate-180" : ""}`} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>
            <span className="font-extrabold">Hypothèses</span>
            {editable ? <span className="font-bold text-accent-text"> · modifier</span> : null}
          </span>
          {/* Deux lignes au plus, repliées : le détail s'ouvre d'un appui (retour du fondateur, « on s'y perd »). */}
          {open ? null : <span className="line-clamp-2 text-muted">{text}</span>}
        </span>
      </button>
      {open ? (
        <ul className="mt-1 flex flex-col divide-y divide-line">
          {assumptions.map((a) => (
            <AssumptionRow key={a.key} a={a} editable={editable} pending={pending} onAnswer={onAnswer} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AssumptionRow({ a, editable, pending, onAnswer }: { a: PurchaseAssumption; editable: boolean; pending: boolean; onAnswer: DecisionHandlers["onAnswer"] }) {
  const id = useId();
  const [value, setValue] = useState("");
  const isParam = a.key.startsWith("param:");
  const unit = a.unit === "u" ? "" : a.unit;
  return (
    <li className="flex flex-col gap-2 py-2.5">
      <p className="text-sm">
        <span className="font-bold">{a.label}</span> : {withUnit(a.value, a.unit)}
        {a.note ? <span className="text-muted"> — {a.note}</span> : null}
      </p>
      {!editable ? null : a.choices.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Modifier : ${a.label}`}>
          {a.choices.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={pending || c.value === a.value.replace(",", ".")}
              onClick={() => void onAnswer(a.key, { value: c.value, unit: a.unit })}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold ${c.value === a.value.replace(",", ".") ? "bg-accent text-white" : "bg-ground text-ink"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : isParam ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) void onAnswer(a.key, { value: value.trim(), unit: a.unit });
          }}
        >
          <label htmlFor={id} className="flex grow flex-col gap-1 text-sm font-bold">
            {unit ? `Nouvelle valeur (${unit})` : "Nouvelle valeur"}
            <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-12 rounded-2xl bg-ground px-3 text-base" />
          </label>
          <Button type="submit" pending={pending} variant="secondary">
            Modifier
          </Button>
        </form>
      ) : a.key.startsWith("product:") ? (
        <button type="button" disabled={pending} onClick={() => void onAnswer(a.key, "")} className="inline-flex min-h-11 items-center self-start rounded-xl bg-ground px-3 text-sm font-bold">
          Choisir un autre modèle
        </button>
      ) : null}
    </li>
  );
}
