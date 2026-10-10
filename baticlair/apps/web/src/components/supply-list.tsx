"use client";

import { Check, ChevronDown, ChevronUp, Eye, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { type DecisionHandlers } from "@/components/takeoff-view";
import { SelectionBar, type SelectionSend } from "@/components/selection-send";
import { Button, ErrorNotice } from "@/components/ui";
import type { ApiError, ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { parseQuantity, shortName } from "@/lib/labels";

/**
 * §50.7 L'ÉCRAN 3 EST LE DOCUMENT (fondateur, 2026-10-10) : « Ton chantier », ce que le fournisseur recevra.
 *  - en haut, « Le chantier en bref » (le même que chez le fournisseur) : chaque ligne se corrige ou se retire ;
 *  - la liste : une ligne par fourniture (point, nom, quantité, unité) ; une ligne orange garde son point et sa raison en
 *    cinq mots, sans carte dépliée ;
 *  - sur le document même : un tap ouvre la ligne (moins / plus, boutons de choix, « C'est bon », corbeille), un tap sur
 *    le nom le corrige, un glissement vers la gauche la retire ; aucun écran intermédiaire, plus de voix ;
 *  - en bas, figés, deux boutons : « Aperçu » (le mail et le PDF du fournisseur) et « Envoyer au fournisseur » ; en petit
 *    dessous, « Ajouter un article », « Envoyer une sélection ».
 */
export function SupplyList({
  takeoff,
  editable,
  pending,
  handlers,
  onEditItem,
  onSetAside,
  onSend,
  onPreview,
  sketches = [],
  sketchHandlers,
  sent = false,
  docked = true,
  selection,
  onAdd,
  onBrief,
  error = null,
}: {
  /** Le dernier geste refusé par le serveur : dit DANS la ligne ouverte, là où l'artisan vient de toucher. */
  error?: ApiError | null;
  /** §50.3 : « Ajouter un article », en petit sous le bouton d'envoi. */
  onAdd?: () => void;
  /** §50.7 : une ligne du chantier en bref, réécrite (texte) ou retirée (vide). */
  onBrief?: (cle: string, texte: string) => Promise<void>;
  /** §48.5 : « Envoyer une sélection à un autre fournisseur » (absent : la fonction n'existe pas ici). */
  selection?: SelectionSend;
  /** Une barre de chat est en bas de l'écran : le gros bouton se pose au-dessus d'elle. Sur la page des fournitures, non. */
  docked?: boolean;
  /** La demande est déjà partie : le gros bouton mène aux fournisseurs, il ne propose plus un premier envoi. */
  sent?: boolean;
  /** Liste déjà validée (elle peut partir) : dit en haut, et « Envoyer » ouvre directement l'aperçu. */
  validated?: boolean;
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  onEditItem: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  /** Mettre la ligne de côté (après les 3 s d'« Annuler »). */
  onSetAside: (row: ScreenRow) => Promise<void>;
  onSend: () => void;
  /** « Aperçu » (retour du fondateur, 2026-10-10) : le mail et le PDF tels que le fournisseur les reçoit. */
  onPreview?: () => void;
  sketches?: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const p = takeoff.purchase;
  const screen = p.screen;
  const items = new Map(p.toBuy.map((b) => [b.key, b]));
  const quotes = new Map(p.toQuote.map((q) => [q.key, q]));
  const decisions = new Map(takeoff.view.decisions.map((d) => [d.key, d]));
  const [removing, setRemoving] = useState<string[]>([]);
  // §48.5 : cases à cocher seulement après le petit bouton ; par défaut l'écran ne change pas.
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const articleOf = (r: ScreenRow) => r.itemKey ?? (r.quoteKey ? `quote:${r.quoteKey}` : null);
  const hidden = (r: ScreenRow) => removing.includes(r.key);
  const rows = screen.groups.flatMap((g) => g.rows).filter((r) => !hidden(r));
  const toCheck = rows.filter((r) => r.status === "check");
  const baseLabel = (r: ScreenRow) =>
    r.itemKey ? (items.get(r.itemKey)?.kind === "direct" ? shortName(items.get(r.itemKey)!.label) : (items.get(r.itemKey)?.label ?? "")) : r.quoteKey ? shortName(quotes.get(r.quoteKey)?.label ?? "") : (r.pending?.label ?? "");
  // Deux cartes au même nom (« Bandes zinc » de la rive et de la ventilation) : chacune dit sa pièce, telle qu'écrite au devis.
  const allRows = screen.groups.flatMap((g) => g.rows);
  const twins = new Set(allRows.map(baseLabel).filter((l, i, a) => l && a.indexOf(l) !== i));
  const labelOf = (r: ScreenRow) => {
    const label = baseLabel(r);
    const line = twins.has(label) && r.lineIds.length === 1 ? takeoff.lines.find((l) => l.id === r.lineIds[0]) : undefined;
    return line ? `${label} · ${shortName(line.article ?? line.designation)}` : label;
  };

  // Retirer une ligne (glisser à gauche, ou « Retirer » dans sa fiche) : cachée tout de suite, retirée pour de bon ; jamais de
  // message flottant (§50.4). Un retrait après l'autre : la dernière réponse du serveur les contient tous.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const putAside = (r: ScreenRow) => {
    setRemoving((keys) => [...keys, r.key]);
    queue.current = queue.current
      .then(() => onSetAside(r))
      .catch(() => undefined)
      .finally(() => setRemoving((keys) => keys.filter((k) => k !== r.key)));
  };
  // Une info manquante se demande UNE fois : ses boutons sont sur la première carte qui en dépend ; les autres renvoient
  // à elle (un seul choix règle toutes les lignes qui en dépendent).
  const askKeysOf = (r: ScreenRow) => {
    const d = r.decisionKey ? decisions.get(r.decisionKey) : undefined;
    if (d?.question?.options.length) return [d.key];
    return (r.itemKey ? (items.get(r.itemKey)?.asks ?? []) : []).map((a) => a.key);
  };
  const askOwner = new Map<string, ScreenRow>();
  for (const r of screen.groups.flatMap((g) => g.rows).filter((x) => x.status === "check" && !hidden(x))) {
    for (const k of askKeysOf(r)) if (!askOwner.has(k)) askOwner.set(k, r);
  }
  const sharedFor = (r: ScreenRow) => new Map(askKeysOf(r).flatMap((k) => (askOwner.get(k) && askOwner.get(k)!.key !== r.key ? [[k, labelOf(askOwner.get(k)!)] as const] : [])));

  // §50.3 : une liste, comme un bon de commande : les oranges d'abord, puis les vertes, chacune dans l'ordre du devis.
  const ordered = [...rows.filter((r) => r.status === "check"), ...rows.filter((r) => r.status !== "check")];
  const link = "inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-muted underline decoration-dotted underline-offset-4";

  return (
    <section aria-label="Liste des fournitures" className="flex flex-col">
      {editable && !selecting && toCheck.length > 0 ? (
        // §50.3 : une barre fixe discrète en haut, qui disparaît à zéro. Rien d'autre.
        <div role="status" className="sticky top-[max(8px,env(safe-area-inset-top))] z-20 mb-2 flex min-h-10 items-center gap-2 rounded-[20px] border border-warn/25 bg-surface/95 px-3 py-1.5 shadow-[0_2px_10px_rgba(16,24,40,0.08)] backdrop-blur">
          <span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" />
          <span className="text-[13px] leading-tight font-extrabold text-warn">
            {toCheck.length} ligne{toCheck.length > 1 ? "s" : ""} à régler
          </span>
        </div>
      ) : null}
      <header className="mb-3 flex flex-col gap-0.5">
        <h2 className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.01em]">Ton chantier</h2>
        <p className="text-[13px] text-muted">C&apos;est ce que reçoit le fournisseur.</p>
      </header>
      {takeoff.bref && takeoff.bref.length > 0 ? (
        <section aria-label="Le chantier en bref" className="mb-4 flex flex-col gap-1">
          <h3 className="text-[13px] font-extrabold text-muted">Le chantier en bref</h3>
          <ul className="flex flex-col divide-y divide-line rounded-[20px] border border-[#dde1e8] bg-surface px-3">
            {takeoff.bref.map((l) => (
              <BriefLine key={l.cle} text={l.texte} editable={editable && Boolean(onBrief)} pending={pending} onSave={(t) => onBrief!(l.cle, t)} />
            ))}
          </ul>
        </section>
      ) : null}
      <h3 className="mb-1 text-[13px] font-extrabold text-muted">Fournitures</h3>
      <ul aria-label="Fournitures" className="flex flex-col divide-y divide-line rounded-[20px] border border-[#dde1e8] bg-surface">
        {ordered.map((r) => (
          <Row
            key={r.key}
            {...(selection && articleOf(r) && selection.sent.has(articleOf(r)!) ? { sentTo: selection.sent.get(articleOf(r)!)! } : {})}
            {...(selecting
              ? {
                  selectMode: {
                    checked: checked.has(articleOf(r) ?? ""),
                    // Une ligne orange se vérifie d'abord ; une ligne sans article (question) ne part pas.
                    disabled: !articleOf(r) || r.status === "check",
                    onToggle: () =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        const k = articleOf(r)!;
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      }),
                  },
                }
              : {})}
            row={r}
            takeoff={takeoff}
            label={labelOf(r)}
            editable={editable}
            pending={pending}
            handlers={handlers}
            decision={r.decisionKey ? decisions.get(r.decisionKey) : undefined}
            shared={sharedFor(r)}
            onEdit={onEditItem}
            onSetAside={() => putAside(r)}
            error={error}
            sketches={sketches.filter((s) => r.itemKey && s.article === r.itemKey)}
            {...(sketchHandlers ? { sketchHandlers } : {})}
          />
        ))}
      </ul>
      {/* §49.9 : les lignes du devis sans fourniture (heures, forfait, évacuation) ne sont pas dans la liste et ne partent
          jamais ; repliées, fermées par défaut, pour que l'artisan voie qu'elles ont été lues. */}
      {takeoff.sansFourniture && takeoff.sansFourniture.length > 0 ? (
        <details className="group mt-3 rounded-2xl px-1">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-[13px] font-bold text-muted">
            {takeoff.sansFourniture.length} ligne{takeoff.sansFourniture.length > 1 ? "s" : ""} sans fourniture
            <ChevronDown size={15} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <ul aria-label="Lignes sans fourniture" className="flex flex-col gap-1.5 pt-1 pb-1">
            {takeoff.sansFourniture.map((l) => (
              <li key={l.lineId} className="flex items-baseline justify-between gap-3 text-[13px] leading-snug text-muted">
                <span className="min-w-0">{l.label}</span>
                {l.measure ? <span className="shrink-0 font-bold">{l.measure}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* §50.3 : en bas, l'aperçu et l'envoi ; dessous, en petit, les autres gestes. Seuls les deux boutons restent collés en
          bas ; les liens suivent la liste, jamais par-dessus. */}
      {selecting && selection ? (
        <div className={`sticky z-10 mt-2 bg-gradient-to-t from-ground from-70% to-transparent pt-6 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]"}`}>
          <SelectionBar
            count={checked.size}
            onCancel={() => setSelecting(false)}
            onSend={async (supplierId) => {
              await selection.send([...checked], supplierId);
              setSelecting(false);
              setChecked(new Set());
            }}
          />
        </div>
      ) : (
        <>
          {/* RIEN NE PART VIDE : sans aucune fourniture (un devis de main-d'œuvre seule), pas de bouton d'envoi. */}
          {editable && toCheck.length === 0 && rows.length > 0 ? (
            // Retour du fondateur (2026-10-10) : « deux boutons flottants d'actions en bas (figé), un pour l'envoi et l'autre pour
            // prévisualiser le PDF et le mail envoyé ».
            <div
              role="group"
              aria-label="Envoyer la liste"
              className={`sticky z-10 mt-2 flex gap-2 bg-gradient-to-t from-ground from-70% to-transparent pt-6 ${docked ? "bottom-[68px] pb-3 lg:bottom-[70px]" : "bottom-0 pb-[max(8px,env(safe-area-inset-bottom))]"}`}
            >
              {onPreview ? (
                <Button variant="secondary" className="shrink-0 px-4" onClick={onPreview}>
                  <Eye size={18} aria-hidden="true" />
                  Aperçu
                </Button>
              ) : null}
              {sent ? (
                <Button className="min-w-0 flex-1 px-3" variant="secondary" onClick={onSend}>
                  <Send size={18} aria-hidden="true" />
                  Voir la demande envoyée
                </Button>
              ) : (
                <Button className="min-w-0 flex-1 px-3 shadow-card!" pending={pending} onClick={onSend}>
                  <Send size={18} aria-hidden="true" />
                  Envoyer au fournisseur
                </Button>
              )}
            </div>
          ) : null}
          {editable ? (
            <nav aria-label="Autres gestes sur la liste" className="mt-1 flex flex-wrap justify-center gap-x-4 pb-2">
              {onAdd ? (
                <button type="button" onClick={onAdd} className={link}>
                  Ajouter un article
                </button>
              ) : null}
              {selection && rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Retour du fondateur (2026-10-10) : « je dois tout avoir de coché » : chaque ligne prête et pas encore
                    // envoyée à part l'est d'office ; l'artisan décoche ce qui ne part pas.
                    setChecked(new Set(rows.filter((r) => r.status !== "check" && articleOf(r) && !selection.sent.has(articleOf(r)!)).map((r) => articleOf(r)!)));
                    setSelecting(true);
                  }}
                  className={link}
                >
                  Envoyer une sélection à un autre fournisseur
                </button>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}

const toNumber = (q: string) => Number(q.replace(/\s/g, "").replace(",", "."));
const shownNumber = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Plus / moins sur la quantité d'une ligne orange (§48) : chaque appui bouge d'une unité, la quantité part une seconde
 * après le dernier appui (une seule correction au journal, pas une par appui).
 */
function Stepper({ label, value, unit, pending, onChange }: { label: string; value: number; unit: string; pending: boolean; onChange: (n: number) => Promise<void> }) {
  const [n, setN] = useState(value);
  const [seen, setSeen] = useState(value);
  // La liste revient du serveur avec une autre quantité : elle remplace la nôtre.
  if (value !== seen) {
    setSeen(value);
    setN(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const bump = (d: number) => {
    const next = Math.max(0, Math.round((n + d) * 100) / 100);
    setN(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void onChange(next), 1000);
  };
  const btn = "flex size-9 items-center justify-center rounded-full bg-ground text-[19px] font-extrabold leading-none active:scale-90 disabled:opacity-40";
  return (
    <span role="group" aria-label={`Quantité : ${label}`} className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center gap-1">
        <button type="button" className={btn} disabled={pending || n <= 0} onClick={() => bump(-1)} aria-label={`Moins : ${label}`}>
          −
        </button>
        <span className="min-w-[2.6rem] text-center text-[15px] font-extrabold tabular-nums" aria-live="polite">
          {shownNumber(n)}
        </span>
        <button type="button" className={btn} disabled={pending} onClick={() => bump(1)} aria-label={`Plus : ${label}`}>
          +
        </button>
      </span>
      {unit ? <span className="min-w-0 truncate text-[13px] font-bold text-muted">{unit}</span> : null}
    </span>
  );
}

/** Le point dit l'état d'un coup d'œil : vert prêt, orange à régler (§50.3). */
const DOT: Record<ScreenRow["status"], { className: string; label: string }> = {
  ok: { className: "bg-ok", label: "sûr" },
  check: { className: "bg-warn", label: "à vérifier" },
  // §50.3 : vert ou orange, rien d'autre ; une ligne laissée au fournisseur est prête à partir.
  supplier: { className: "bg-ok", label: "sûr" },
};

const FIELD = "min-h-11 w-full min-w-0 rounded-xl border-2 border-line bg-surface px-3 text-[15px] outline-none focus:border-accent";

/** Un texte qui se corrige sur place (le nom d'une ligne, une ligne du bref) : un tap, la case, « OK ». */
function InlineText({ label, value, pending, onSave, onCancel }: { label: string; value: string; pending: boolean; onSave: (v: string) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const [text, setText] = useState(value);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && text.trim() !== value) void onSave(text.trim());
        else onCancel();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} autoFocus value={text} onChange={(e) => setText(e.target.value)} className={FIELD} />
      <Button type="submit" className="min-h-11 shrink-0 px-4" pending={pending}>
        OK
      </Button>
    </form>
  );
}

/** §50.7 : une ligne du chantier en bref ; un tap la corrige, la corbeille la retire (au document comme chez le fournisseur). */
function BriefLine({ text, editable, pending, onSave }: { text: string; editable: boolean; pending: boolean; onSave: (t: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <li className="flex flex-col gap-2 py-2">
        <InlineText label={`Modifier le bref : ${text}`} value={text} pending={pending} onCancel={() => setEditing(false)} onSave={async (t) => void (await onSave(t), setEditing(false))} />
        <button type="button" onClick={() => void onSave("")} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold text-danger">
          <Trash2 size={15} aria-hidden="true" />
          Retirer du bref
        </button>
      </li>
    );
  return (
    <li className="flex min-h-11 items-center">
      {editable ? (
        <button type="button" onClick={() => setEditing(true)} aria-label={`Modifier le bref : ${text}`} className="flex min-h-11 w-full items-center text-left text-[14px] leading-snug">
          {text}
        </button>
      ) : (
        <span className="text-[14px] leading-snug">{text}</span>
      )}
    </li>
  );
}

/**
 * §50.7 : une ligne du document. Fermée : le point, le nom, la quantité ; si orange, sa raison en cinq mots. Un tap l'ouvre
 * (moins / plus, boutons de choix, « C'est bon », corbeille) ; ouverte, un tap sur le nom le corrige ; un glissement vers la
 * gauche la retire. Aucun écran intermédiaire.
 */
function Row({
  row,
  takeoff,
  label,
  editable,
  pending,
  handlers,
  decision,
  shared,
  onEdit,
  onSetAside,
  sketches,
  sketchHandlers,
  selectMode,
  sentTo,
  error = null,
}: {
  error?: ApiError | null;
  /** §48.5 : mode sélection, une case à cocher à la place du point ; toucher la ligne la coche. */
  selectMode?: { checked: boolean; disabled: boolean; onToggle: () => void };
  /** §48.5 : déjà envoyée à part (« Envoyé · fournisseur »), toujours visible dans la liste. */
  sentTo?: string;
  row: ScreenRow;
  takeoff: Takeoff;
  label: string;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  /** La remarque qui met la ligne en orange : elle se règle dans la ligne ouverte (§49.8). */
  decision?: TakeoffDecision | undefined;
  /** Les questions de cette ligne posées sur une autre ligne (clé → nom de la ligne qui porte les boutons). */
  shared?: ReadonlyMap<string, string>;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onSetAside: () => void;
  sketches: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  // Un glissement n'est pas un appui : il n'ouvre pas la ligne.
  const swiped = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const item = row.itemKey ? takeoff.purchase.toBuy.find((b) => b.key === row.itemKey) : undefined;
  const quote = row.quoteKey ? takeoff.purchase.toQuote.find((q) => q.key === row.quoteKey) : undefined;
  const lines = row.lineIds.map((id) => takeoff.lines.find((l) => l.id === id)).filter((l): l is Takeoff["lines"][number] => Boolean(l));
  const quantity = item?.quantity ?? quote?.measure ?? row.pending?.quantity ?? null;
  const sub = sentTo ? `Envoyé · ${sentTo}` : row.status === "check" ? (row.reason ?? "À vérifier") : null;
  const dot = sentTo ? DOT.supplier : DOT[row.status];
  const parsed = item?.quantity ? parseQuantity(item.quantity) : null;
  const stepper = editable && !sentTo && item && parsed && Number.isFinite(toNumber(parsed.quantity)) ? { value: toNumber(parsed.quantity), unit: parsed.unit } : null;
  const removable = editable && (row.itemKey !== undefined || row.lineIds.length > 0);
  // Le nom se corrige sur l'article, sinon sur la ligne du devis (une seule) d'où vient la ligne.
  const nameLine = !item && lines.length === 1 ? lines[0] : undefined;
  const renamable = editable && !sentTo && (item !== undefined || nameLine !== undefined);
  const opens = editable && !sentTo;
  // Une ligne orange qui se valide d'un geste (« C'est bon », garder la quantité du devis) ; jamais une question à trancher.
  const quick = row.status === "check" && decision?.primary && decision.primary.action !== "edit" && decision.primary.action !== "answer" && !decision.key.startsWith(AI_ADDITION);
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false;
    if (!removable || open) return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    if (Math.abs(e.clientY - start.current.y) > Math.abs(x)) return;
    if (x < -8) swiped.current = true;
    setDx(Math.min(0, x));
  };
  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    if (dx < -90) onSetAside();
    setDx(0);
  };
  const rename = async (name: string) => {
    if (item) await onEdit(item, { libelle: name, quantite: parsed?.quantity ?? null, unite: parsed?.unit ?? null });
    else if (nameLine) await handlers.onSaveLine(nameLine.id, { designation: name, quantity: nameLine.quantity, unit: nameLine.unit, reference: nameLine.reference });
    setNaming(false);
  };

  const body = (
    <>
      <span className={`mt-[6px] size-2.5 shrink-0 rounded-full ${dot.className}`} role="img" aria-label={dot.label} />
      <span className="flex min-w-0 grow flex-col">
        {/* Le nom entier : c'est ce que le comptoir lit (jamais coupé). Sur téléphone, la quantité passe dessous. */}
        <span className="text-[14px] leading-snug font-semibold">{label}</span>
        {quantity || sub ? (
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug">
            {quantity ? <span className="shrink-0 text-[14px] font-extrabold tabular-nums sm:hidden">{quantity}</span> : null}
            {sub ? <span className={`min-w-0 ${sentTo ? "font-bold text-muted" : "font-bold text-warn"}`}>{sub}</span> : null}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-[15px] font-extrabold whitespace-nowrap tabular-nums max-sm:hidden">{quantity ?? ""}</span>
    </>
  );
  // §48.5 : en mode sélection, la ligne entière coche sa case ; rien d'autre ne s'ouvre.
  if (selectMode) {
    return (
      <li id={`ligne-${row.key}`} className={`px-3 py-2 ${selectMode.checked ? "bg-accent/5" : ""} ${selectMode.disabled ? "opacity-60" : ""}`}>
        <label className={`flex min-h-11 items-start gap-2.5 ${selectMode.disabled ? "" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={selectMode.checked}
            disabled={selectMode.disabled}
            onChange={selectMode.onToggle}
            aria-label={`Envoyer à part : ${label}`}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span className="flex min-w-0 grow flex-col">
            <span className="text-[14px] leading-snug font-semibold">{label}</span>
            <span className="text-[13px] leading-snug text-muted">
              {quantity ? <span className="font-extrabold text-ink tabular-nums">{quantity}</span> : null}
              {row.status === "check" ? `${quantity ? " · " : ""}à vérifier d'abord` : sentTo ? `${quantity ? " · " : ""}Envoyé · ${sentTo}` : ""}
            </span>
          </span>
        </label>
      </li>
    );
  }
  return (
    <li id={`ligne-${row.key}`} className={`relative flex scroll-mt-24 flex-col gap-2 overflow-hidden px-3 py-1.5 transition-colors ${open ? "bg-accent/5" : ""}`}>
      {dx < 0 ? (
        <span aria-hidden="true" className="absolute inset-y-0 right-0 flex items-center bg-danger px-4 text-sm font-extrabold text-white">
          Retirer
        </span>
      ) : null}
      <div
        className={`relative ${open ? "" : "bg-surface"}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {opens ? (
          <div className="flex min-w-0 items-start gap-1">
            <button
              type="button"
              onClick={() => {
                if (swiped.current) return void (swiped.current = false);
                setNaming(false);
                setOpen(!open);
              }}
              aria-expanded={open}
              aria-label={`${open ? "Fermer" : "Modifier"} : ${label}`}
              className="flex min-h-11 min-w-0 grow items-start gap-2.5 text-left"
            >
              {body}
            </button>
            {/* Retour du fondateur (2026-10-10) : « un bouton pour valider, ligne par ligne. Et un crayon pour modifier. » Le ✓
                fait le geste de la carte (« C'est bon », « Garder » l'écart du devis) sans l'ouvrir ; le crayon l'ouvre. */}
            {quick && !open ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void handlers.onDecide(decision!)}
                aria-label={`Valider : ${label}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-ok active:bg-ok/10 disabled:opacity-50"
              >
                <Check size={20} aria-hidden="true" />
              </button>
            ) : null}
            {/* Ouverte, le crayon devient une croix : on voit comment refermer (retour du fondateur, 2026-10-10). */}
            <button
              type="button"
              onClick={() => {
                setNaming(false);
                setOpen(!open);
              }}
              aria-label={`${open ? "Fermer la ligne" : "Modifier la ligne"} : ${label}`}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full active:bg-ground ${open ? "bg-surface text-ink shadow-card" : "text-muted"}`}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
            </button>
          </div>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-2.5">{body}</div>
        )}
      </div>
      {open ? (
        <div role="group" aria-label={`Ligne ouverte : ${label}`} className="flex flex-col gap-2 pb-2 pl-5">
          {/* Retour du fondateur (2026-10-10) : « quand je clique sur un bouton, rien ne se passe ». Un geste refusé se dit ici. */}
          {error ? <ErrorNotice error={error} /> : null}
          {renamable ? (
            naming ? (
              <InlineText label={`Nom : ${label}`} value={item?.label ?? nameLine?.article ?? nameLine?.designation ?? label} pending={pending} onCancel={() => setNaming(false)} onSave={rename} />
            ) : (
              <button type="button" onClick={() => setNaming(true)} aria-label={`Modifier le nom : ${label}`} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold text-accent-text">
                <Pencil size={14} aria-hidden="true" />
                Modifier le nom
              </button>
            )
          ) : null}
          {stepper ? (
            <Stepper label={label} value={stepper.value} unit={stepper.unit} pending={pending} onChange={(n) => onEdit(item!, { libelle: item!.label, quantite: String(n), unite: stepper.unit || null })} />
          ) : null}
          {row.status === "check" ? <CardActions label={label} decision={decision} item={item} pending={pending} handlers={handlers} onEdit={onEdit} {...(shared ? { shared } : {})} /> : null}
          {sketches.length > 0 ? (
            <ul aria-label={`Croquis joints : ${label}`} className="flex flex-wrap gap-2">
              {sketches.map((sk) => (
                <li key={sk.id} className="flex max-w-full items-center gap-1 rounded-xl bg-surface pl-2.5 text-[13px] font-bold text-accent-text">
                  <button type="button" onClick={() => void openDocument(sk.id, sk.nom, sk.nom)} className="flex min-h-9 min-w-0 items-center gap-1.5 text-left">
                    <Paperclip size={14} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{sk.commentaire ? `${sk.nom} · ${sk.commentaire}` : sk.nom}</span>
                  </button>
                  {sketchHandlers ? (
                    <button type="button" disabled={pending} onClick={() => void sketchHandlers.onDetach(sk.id)} aria-label={`Retirer le croquis ${sk.nom}`} className="flex size-9 shrink-0 items-center justify-center text-accent-text/70">
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4">
            {item && sketchHandlers ? (
              <>
                <input
                  ref={file}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  aria-label={`Joindre un croquis : ${label}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void sketchHandlers.onAttach(item.key, f, "");
                    e.target.value = "";
                  }}
                />
                <button type="button" onClick={() => file.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-accent-text">
                  <Paperclip size={14} aria-hidden="true" />
                  Joindre un croquis
                </button>
              </>
            ) : null}
            {removable ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSetAside();
                }}
                className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
                Retirer de la liste
              </button>
            ) : null}
          </div>
          {/* Un geste clair pour refermer la ligne, en bas, là où le pouce arrive. */}
          <Button
            variant="secondary"
            className="min-h-11 w-full"
            onClick={() => {
              setNaming(false);
              setOpen(false);
            }}
          >
            <ChevronUp size={18} aria-hidden="true" />
            Fermer
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** Ajout proposé par l'appel IA n° 2 : jamais vert d'office, il attend un oui ou un non. */
const AI_ADDITION = "ia-ajout:";

/** Une quantité tapée par l'artisan, au format du serveur (« 1 234,5 » → « 1234.5 »). */
const plainNumber = (q: string) => q.replace(/[\s  ]/g, "").replace(",", ".");
const OPTION = "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-line bg-surface px-3 text-[14px] font-extrabold transition active:scale-[0.97] active:border-accent active:bg-accent/10 disabled:opacity-60";

/**
 * §49.8 : CE QUI RÈGLE UNE LIGNE ORANGE, DANS SA CARTE. Un geste, jamais un autre écran : les choix en boutons (un tap,
 * la ligne se recalcule et passe au vert), un écart en deux boutons (« Garder 20 » / « Mettre 21 »), sinon « C'est bon ».
 */
function CardActions({
  label,
  decision: d,
  item,
  pending,
  handlers,
  onEdit,
  shared = new Map(),
}: {
  shared?: ReadonlyMap<string, string>;
  label: string;
  decision: TakeoffDecision | undefined;
  item: PurchaseItem | undefined;
  pending: boolean;
  handlers: DecisionHandlers;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const q = d?.question;
  // Une question encore ouverte (avant le calcul) répond à sa décision ; après, la ligne porte ses propres choix.
  const asks: { key: string; text: string; unit: string | null; options: { label: string; value: string }[] }[] =
    d && q?.options.length ? [{ key: d.key, text: d.text.replace(/ Cela change la commande :.*$/, "").replace(/\s*\?$/, ""), unit: null, options: q.options }] : (item?.asks ?? []);
  const answer = (key: string, unit: string | null, v: string) => handlers.onAnswer(key, unit ? { value: v, unit } : v);
  const gap = d && item?.gap ? item.gap : null;
  const parsed = item?.quantity ? parseQuantity(item.quantity) : null;
  const done = d && d.primary && d.primary.action !== "edit" && !d.key.startsWith(AI_ADDITION);
  const btn = "min-h-11 flex-1 basis-[9rem]";
  return (
    <div role="group" aria-label={`Régler : ${label}`} aria-busy={pending || undefined} className="flex flex-col gap-2">
      {asks.map((a) =>
        // §50.3 : la raison dit déjà ce qui manque ; la carte ne montre que les boutons (une question partagée avec une autre
        // carte se règle sur la première, sans phrase de renvoi).
        shared.has(a.key) ? null : (
        <div key={a.key} role="group" aria-label={a.text} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {a.options.map((o) => (
              <button key={o.value || "aucun"} type="button" disabled={pending} onClick={() => void answer(a.key, a.unit, o.value)} className={`${OPTION} grow`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        ),
      )}
      {d && q && q.kind === "param" && q.options.length === 0 ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = plainNumber(value.trim());
            if (/^\d+(?:\.\d+)?$/.test(v)) void handlers.onAnswer(d.key, { value: v, unit: q.unit ?? "u" });
          }}
        >
          <label htmlFor={id} className="sr-only">
            {d.text}
          </label>
          <span className="flex min-w-0 grow items-center gap-1 rounded-xl border-2 border-line bg-surface px-3 focus-within:border-accent">
            <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-10 w-full min-w-0 bg-transparent text-[15px] font-extrabold outline-none" />
            {q.unit && q.unit !== "u" ? <span className="text-[13px] font-bold text-muted">{q.unit === "m2" ? "m²" : q.unit}</span> : null}
          </span>
          <Button type="submit" className="shrink-0" pending={pending}>
            OK
          </Button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {gap && d && item ? (
          <>
            <button type="button" disabled={pending} className={`${OPTION} flex-1`} onClick={() => void handlers.onDecide(d)} aria-label={`Garder ${gap.written} : ${label}`}>
              Garder {gap.written}
            </button>
            <button
              type="button"
              disabled={pending}
              className={`${OPTION} flex-1`}
              onClick={() => void onEdit(item, { libelle: item.label, quantite: plainNumber(gap.computed), unite: parsed?.unit || gap.unit || null })}
              aria-label={`Mettre ${gap.computed} : ${label}`}
            >
              Mettre {gap.computed}
            </button>
          </>
        ) : done ? (
          <Button className={btn} variant="secondary" pending={pending} onClick={() => void handlers.onDecide(d)} aria-label={`C'est bon : ${label}`}>
            <Check size={18} aria-hidden="true" />
            C&apos;est bon
          </Button>
        ) : null}
        {d?.suggestion && item ? (
          <Button
            className={btn}
            variant="secondary"
            pending={pending}
            onClick={async () => {
              // La remarque est levée d'abord (au journal), puis l'article prend la désignation proposée.
              await handlers.onDecide(d);
              await onEdit(item, { libelle: d.suggestion!.label, quantite: d.suggestion!.quantity ?? parsed?.quantity ?? null, unite: d.suggestion!.unit ?? parsed?.unit ?? null });
            }}
          >
            Remplacer par : {d.suggestion.label}
          </Button>
        ) : null}
        {d?.key.startsWith(AI_ADDITION) ? (
          <>
            <Button className={btn} pending={pending} onClick={() => void handlers.onAnswer(d.key, "ok")}>
              Oui, on l&apos;ajoute
            </Button>
            <Button className={btn} variant="secondary" pending={pending} onClick={() => void handlers.onAnswer(d.key, "non")}>
              Non
            </Button>
          </>
        ) : null}
        {/* §49.8 : les choix en boutons dans la carte, puis « C'est bon » ; plus de gros bouton « Corriger » : la ligne se
            réécrit d'un tap sur son nom. */}
      </div>
    </div>
  );
}
