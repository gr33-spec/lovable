"use client";

import { Check, ChevronDown, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { EDIT_FIELD, EDIT_PANEL, ItemForm, type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { SelectionBar, type SelectionSend } from "@/components/selection-send";
import { Button } from "@/components/ui";
import type { ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { doubtText, parseQuantity, shortName } from "@/lib/labels";

/**
 * UN SEUL ÉCRAN : LA LISTE DES FOURNITURES (retour du fondateur, 2026-10-04, « un enfant de 10 ans s'en sort »).
 *  - chaque ligne a un point de couleur : vert = sûr, rien à faire ; orange = à vérifier, et elle se RÈGLE DANS SA CARTE
 *    (§49.8) : la raison en entier, les choix en boutons, « Garder 20 » / « Mettre 21 », « C'est bon » ; un geste, jamais
 *    un autre écran ; gris = à préciser avec le fournisseur, la ligne part telle quelle ;
 *  - en haut, « 11 fournitures · 2 à vérifier » et « Tout est bon » ; en bas, « Envoyer au fournisseur » quand tout est
 *    vert ou gris ;
 *  - crayon pour modifier, corbeille (ou glisser vers la gauche) pour retirer (« Annuler » pendant 3 s) ; « Voir le calcul »
 *    en tout petit.
 */
export function SupplyList({
  takeoff,
  editable,
  pending,
  handlers,
  onEditItem,
  onSetAside,
  onSuggestion,
  onSend,
  sketches = [],
  sketchHandlers,
  validated = false,
  sent = false,
  docked = true,
  selection,
}: {
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
  onSuggestion: (item: PurchaseItem, answer: "oui" | "non") => Promise<void>;
  onSend: () => void;
  sketches?: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const p = takeoff.purchase;
  const screen = p.screen;
  const items = new Map(p.toBuy.map((b) => [b.key, b]));
  const quotes = new Map(p.toQuote.map((q) => [q.key, q]));
  const decisions = new Map(takeoff.view.decisions.map((d) => [d.key, d]));
  const [aside, setAside] = useState<ScreenRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const [removing, setRemoving] = useState<string[]>([]);
  // §48.5 : cases à cocher seulement après le petit bouton ; par défaut l'écran ne change pas.
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const articleOf = (r: ScreenRow) => r.itemKey ?? (r.quoteKey ? `quote:${r.quoteKey}` : null);
  const hidden = (r: ScreenRow) => aside?.key === r.key || removing.includes(r.key);
  const rows = screen.groups.flatMap((g) => g.rows).filter((r) => !hidden(r));
  const toCheck = rows.filter((r) => r.status === "check");
  const labelOf = (r: ScreenRow) =>
    r.itemKey ? (items.get(r.itemKey)?.kind === "direct" ? shortName(items.get(r.itemKey)!.label) : (items.get(r.itemKey)?.label ?? "")) : r.quoteKey ? shortName(quotes.get(r.quoteKey)?.label ?? "") : (r.pending?.label ?? "");

  // Retirer une ligne : cachée tout de suite, « Annuler » pendant 3 s, puis retirée pour de bon. Retirer une autre ligne
  // pendant ces 3 s retire aussitôt la précédente (elle ne revient jamais en silence).
  const current = useRef<ScreenRow | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const commit = (r: ScreenRow) => {
    setRemoving((keys) => [...keys, r.key]);
    // Un retrait après l'autre : la dernière réponse du serveur les contient tous.
    queue.current = queue.current
      .then(() => onSetAside(r))
      .catch(() => undefined)
      .finally(() => setRemoving((keys) => keys.filter((k) => k !== r.key)));
  };
  const putAside = (r: ScreenRow) => {
    if (timer.current) clearTimeout(timer.current);
    if (current.current && current.current.key !== r.key) commit(current.current);
    current.current = r;
    setAside(r);
    timer.current = setTimeout(() => {
      current.current = null;
      setAside(null);
      commit(r);
    }, 3000);
  };
  const undo = () => {
    if (timer.current) clearTimeout(timer.current);
    current.current = null;
    setAside(null);
  };
  // « Tout est bon » (retour du fondateur, 2026-10-05 : « 182 lignes à corriger, c'est hyper long ») : les lignes
  // orange qui n'attendent qu'une confirmation (garder telle qu'écrite, compter à la pièce, ratio à confirmer) se règlent
  // d'un appui ; seules les vraies questions (un choix à faire) restent une par une.
  const simple = [
    ...new Map(
      toCheck
        .map((r) => (r.decisionKey ? decisions.get(r.decisionKey) : undefined))
        .filter((d): d is TakeoffDecision => d !== undefined && !d.question?.options?.length && !d.key.startsWith(AI_ADDITION) && (d.key.startsWith(RATIO) || d.primary?.action === "keep" || d.primary?.action === "pieces"))
        .map((d) => [d.key, d]),
    ).values(),
  ];
  const simpleRows = toCheck.filter((r) => r.decisionKey && simple.some((d) => d.key === r.decisionKey)).length;

  // Deux blocs titrés seulement quand il y a les deux : une liste toute prête n'a pas besoin de titre.
  const split = rows.some((r) => r.status === "check") && rows.some((r) => r.status !== "check");

  return (
    // La barre du gros bouton est HORS de la carte : collée au-dessus de la barre de chat, elle ne laisse jamais de blanc
    // dans la carte quand on arrive au bas de la liste.
    <section aria-label="Liste des fournitures" className="flex flex-col">
      <div className="flex flex-col overflow-hidden rounded-[20px] bg-surface pb-2 shadow-card">
      <div className="flex flex-col px-4 pt-3 pb-2">
        <h2 className="font-display text-[20px] font-extrabold tracking-[-0.02em]">Fournitures à chiffrer</h2>
        <p className="text-[14px] font-bold text-muted" aria-live="polite">
          {rows.length} fourniture{rows.length > 1 ? "s" : ""}
          {toCheck.length > 0 ? (
            <span className="text-warn"> · {toCheck.length} à vérifier</span>
          ) : (
            <span className="text-ok"> · {validated ? "liste validée" : "tout est prêt"}</span>
          )}
        </p>
      </div>
      {/* §48 : transparent et direct. L'IA peut se tromper, et elle le dit. */}
      <p className="mx-4 mb-2 rounded-2xl bg-[#eeedff] px-3 py-2 text-[13px] leading-snug font-semibold text-[#3a2bb0]">
        L&apos;IA peut se tromper, n&apos;hésite pas à peaufiner. Pense aussi à <strong>+5 % de coupes</strong> si besoin.
      </p>
      {/* §18 : l'amiante se dit à l'artisan, en haut de la liste ; rien de cela ne part au fournisseur. */}
      {(p.warnings ?? []).map((w) => (
        <p key={w} role="note" className="mx-4 mb-2 rounded-2xl bg-warn-bg px-3 py-2 text-[14px] font-bold text-warn">
          {w}
        </p>
      ))}
      {/* Ce qui est prêt d'abord, ce qui reste à vérifier ensuite (retour du fondateur, 2026-10-05) ; dans chaque bloc,
          les lignes restent rangées par ouvrage. */}
      {BLOCKS.map((b) => {
        const groups = screen.groups
          .map((g) => ({ g, visible: g.rows.filter((r) => !hidden(r) && b.statuses.includes(r.status)) }))
          .filter(({ visible }) => visible.length > 0);
        const count = groups.reduce((n, { visible }) => n + visible.length, 0);
        if (count === 0) return null;
        return (
          <div key={b.key} className="flex flex-col border-t border-line">
            {split ? (
              <h3 className={`flex items-center gap-2 px-4 pt-2.5 text-[13px] font-extrabold ${b.key === "check" ? "text-warn" : "text-ok"}`}>
                <span className={`size-2 rounded-full ${b.key === "check" ? "bg-warn" : "bg-ok"}`} aria-hidden="true" />
                {b.label} ({count})
              </h3>
            ) : null}
            {b.key === "check" && editable && handlers.onDecideMany && simpleRows >= 2 ? (
              // §49.8 : « Tout est bon » en haut, un appui, pour tout valider d'un coup ; chaque carte garde le sien.
              <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-2xl bg-warn-bg p-3">
                <p className="text-[14px] leading-snug font-semibold">
                  {simpleRows} lignes n&apos;attendent qu&apos;un « C&apos;est bon ».
                </p>
                <Button className="shrink-0" variant="secondary" pending={pending} onClick={() => void handlers.onDecideMany!(simple)}>
                  <Check size={18} aria-hidden="true" />
                  Tout est bon ({simpleRows})
                </Button>
              </div>
            ) : null}
            {groups.map(({ g, visible }) => (
              <div key={g.key} className="flex flex-col gap-2 px-4 pt-4">
                <p className="text-[12px] font-extrabold tracking-[0.05em] text-muted uppercase">
                  {g.label}
                  {g.measure ? ` · ${g.measure}` : ""}
                </p>
                {/* Une ligne = une carte (retour du fondateur, 2026-10-06 : « on a l'impression d'un texte, pas de lignes »). */}
                <ul aria-label={g.label} className="flex flex-col gap-2">
                  {visible.map((r) => (
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
                      onEdit={onEditItem}
                      onSetAside={() => putAside(r)}
                      sketches={sketches.filter((s) => r.itemKey && s.article === r.itemKey)}
                      {...(sketchHandlers ? { sketchHandlers } : {})}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
      {/* Retour du fondateur (2026-10-06) : plus de bloc « Hypothèses » sous la liste ; seules les suggestions restent. */}
      {selection && !selecting && rows.length > 1 ? (
        // §48.5 : discret, pour l'usage occasionnel (devis multi-lots) ; l'envoi normal ne change pas.
        <button
          type="button"
          onClick={() => {
            setChecked(new Set());
            setSelecting(true);
          }}
          className="mx-4 mt-3 inline-flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold text-muted underline decoration-dotted underline-offset-4"
        >
          <Send size={14} aria-hidden="true" />
          Envoyer une sélection à un autre fournisseur
        </button>
      ) : null}
      {editable ? (
        <SuggestionsBlock
          items={[
            ...p.suggestions.map((s) => ({ key: s.key, label: s.label, quantity: s.quantity, reason: null as string | null, add: () => onSuggestion(s, "oui") })),
            ...(takeoff.aiSuggestions ?? []).map((a) => ({
              key: a.key,
              label: a.label,
              quantity: [a.quantity, a.unit].filter(Boolean).join(" ") || null,
              reason: a.reason,
              add: () => handlers.onAnswer(a.key, "ok"),
            })),
          ]}
          pending={pending}
        />
      ) : null}
      </div>

      {selecting && selection ? (
        <div className={`sticky z-10 -mt-4 bg-gradient-to-t from-ground from-60% to-transparent pt-8 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]"}`}>
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
      ) : editable ? (
        // Un fondu sous le bouton : le texte de la liste ne passe jamais sous lui en se lisant mal.
        <div className={`sticky z-10 -mt-4 bg-gradient-to-t from-ground from-60% to-transparent pt-8 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]"}`}>
          {toCheck.length > 0 ? (
            // §49.8 : plus de bouton vers un autre écran ; la liste EST l'écran, chaque carte orange se règle sur place.
            <p role="status" className="rounded-2xl bg-surface px-4 py-3 text-center text-[14px] font-bold text-warn shadow-card">
              Encore {toCheck.length} ligne{toCheck.length > 1 ? "s" : ""} orange : règle-{toCheck.length > 1 ? "les" : "la"} dans la liste, d&apos;un geste.
            </p>
          ) : sent ? (
            <Button className="w-full" variant="secondary" onClick={onSend}>
              <Send size={18} aria-hidden="true" />
              Voir la demande envoyée
            </Button>
          ) : (
            <Button className="w-full shadow-[0_10px_24px_var(--color-accent-glow)]" pending={pending} onClick={onSend}>
              <Send size={18} aria-hidden="true" />
              Envoyer au fournisseur
            </Button>
          )}
        </div>
      ) : null}

      {aside ? (
        <div role="status" className={`fixed inset-x-4 z-[60] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-card bottom-[max(96px,calc(env(safe-area-inset-bottom)+96px))]`}>
          <span className="min-w-0 truncate text-sm font-bold">Retiré de la liste : {labelOf(aside)}</span>
          <button type="button" onClick={undo} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-extrabold text-[#9db8ff]">
            Annuler
          </button>
        </div>
      ) : null}

    </section>
  );
}

/**
 * §48.4 « INTERDICTION D'INVENTER » : ce que le devis ne demande pas (un consommable proposé, un ajout de l'IA) n'entre
 * jamais tout seul. Un petit bloc à part, en bas, DÉCOCHÉ ; une coche le fait entrer dans la liste.
 */
function SuggestionsBlock({ items, pending }: { items: { key: string; label: string; quantity: string | null; reason: string | null; add: () => Promise<void> }[]; pending: boolean }) {
  const [adding, setAdding] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <section aria-label="Suggestions" className="mx-4 mt-3 flex flex-col gap-1 rounded-2xl border border-dashed border-line bg-ground/60 px-3 py-2.5">
      <p className="text-[13px] font-extrabold">Suggestions</p>
      <p className="text-[12px] leading-snug text-muted">Pas dans ton devis : rien n&apos;entre dans la liste sans ta coche.</p>
      <ul className="mt-1 flex flex-col">
        {items.map((it) => (
          <li key={it.key}>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5">
              <input
                type="checkbox"
                checked={adding === it.key}
                disabled={pending || adding !== null}
                onChange={async (e) => {
                  if (!e.target.checked) return;
                  setAdding(it.key);
                  try {
                    await it.add();
                  } finally {
                    setAdding(null);
                  }
                }}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] leading-snug font-semibold">
                  {it.label}
                  {it.quantity ? <span className="font-extrabold tabular-nums"> · {it.quantity}</span> : null}
                </span>
                {it.reason ? <span className="text-[12px] leading-snug text-muted">{it.reason}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

const BLOCKS: { key: string; label: string; statuses: ScreenRow["status"][] }[] = [
  { key: "ready", label: "C'est bon", statuses: ["ok", "supplier"] },
  { key: "check", label: "À vérifier", statuses: ["check"] },
];

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
    <span role="group" aria-label={`Quantité : ${label}`} className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
      <span className="flex items-center gap-1">
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
      {unit ? <span className="max-w-[7.5rem] truncate text-[11px] font-bold text-muted">{unit}</span> : null}
    </span>
  );
}

/** Le bord gauche de la carte dit son état d'un coup d'œil : vert prêt, orange à vérifier, gris au fournisseur. */
const BORDER: Record<ScreenRow["status"], string> = { ok: "border-l-ok", check: "border-l-warn", supplier: "border-l-[#b8bcc6]" };

const DOT: Record<ScreenRow["status"], { className: string; label: string }> = {
  ok: { className: "bg-ok", label: "sûr" },
  check: { className: "bg-warn", label: "à vérifier" },
  supplier: { className: "bg-[#b8bcc6]", label: "à préciser avec le fournisseur" },
};

/**
 * Une ligne : le point, la désignation, la quantité, une sous-ligne grise facultative. UN SEUL GESTE (retour du
 * fondateur, 2026-10-05, « on s'y perd ») : toucher la ligne ouvre sa fiche, où tout se trouve (modifier, croquis, calcul,
 * retirer). Une ligne orange se règle DANS SA CARTE (§49.8), sans autre écran. Toutes les lignes se modifient, grises comprises. Glisser à gauche retire.
 */
function Row({
  row,
  takeoff,
  label,
  editable,
  pending,
  handlers,
  decision,
  onEdit,
  onSetAside,
  sketches,
  sketchHandlers,
  selectMode,
  sentTo,
}: {
  /** §48.5 : mode sélection, une case à cocher à la place du point ; toucher la ligne la coche. */
  selectMode?: { checked: boolean; disabled: boolean; onToggle: () => void };
  /** §48.5 : déjà envoyée à part (gris « Envoyé · fournisseur »), toujours visible dans la liste. */
  sentTo?: string;
  row: ScreenRow;
  takeoff: Takeoff;
  label: string;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  /** La remarque qui met la ligne en orange : elle se règle dans la carte (§49.8). */
  decision?: TakeoffDecision | undefined;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onSetAside: () => void;
  sketches: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  // Un glissement n'est pas un appui : il n'ouvre pas la fiche.
  const swiped = useRef(false);
  const item = row.itemKey ? takeoff.purchase.toBuy.find((b) => b.key === row.itemKey) : undefined;
  const quote = row.quoteKey ? takeoff.purchase.toQuote.find((q) => q.key === row.quoteKey) : undefined;
  const lines = row.lineIds.map((id) => takeoff.lines.find((l) => l.id === id)).filter((l): l is Takeoff["lines"][number] => Boolean(l));
  const proofs = item ? takeoff.view.items.filter((i) => (item.kind === "computed" ? i.kind === "need" && item.needIds.includes(i.id) : i.kind === "line" && item.lineIds.includes(i.id))) : [];
  // Une ligne reprise du devis n'a pas de calcul : on montre d'où elle vient.
  const what = item?.kind === "direct" ? "la ligne du devis" : "le calcul";
  const quantity = item?.quantity ?? quote?.measure ?? row.pending?.quantity ?? null;
  const sub = sentTo
    ? `Envoyé · ${sentTo}`
    : row.status === "check"
      ? // §49.8 : la raison en entier, celle de la ligne, sinon celle de sa remarque.
        (row.reason ?? (decision ? doubtText(decision.text) : null) ?? "À vérifier")
      : row.status === "supplier"
        ? "À préciser avec le fournisseur"
        : ([item?.approx, item?.precision].filter(Boolean).join(" · ") || null);
  const dot = sentTo ? DOT.supplier : DOT[row.status];
  // §48 : une ligne orange se règle sur place, au plus / moins ; le crayon ouvre sa fiche (désignation, croquis).
  const parsed = item?.quantity ? parseQuantity(item.quantity) : null;
  const stepper = row.status === "check" && editable && item && parsed && Number.isFinite(toNumber(parsed.quantity)) ? { value: toNumber(parsed.quantity), unit: parsed.unit } : null;
  // Une pièce zinc commandée façonnée (bande, couvertine, noue…) peut partir avec son croquis (facultatif) ; jamais une
  // gouttière ni une descente (jamais façonnées), ni une bobine ou une feuille.
  const zincPiece = editable && item !== undefined && Boolean(sketchHandlers) && /\bzinc\b/i.test(item.label) && /\b(bandes?|couvertines?|noues?|solins?|abergements?|fa[iî]tages?|rives?|habillages?|bavettes?|chapeaux?|pi[eè]ces?)\b/i.test(item.label) && !/bobine|feuille|bobineau|goutti|descente|naissance|coude|collier/i.test(item.label);
  const removable = editable && (row.itemKey !== undefined || row.lineIds.length > 0);
  // Ce que la fiche peut montrer : l'article, sinon les lignes du devis ; sinon, en lecture seule, le calcul.
  const canEdit = editable && (item !== undefined || lines.length > 0);
  const opens = row.status === "check" ? editable : canEdit || proofs.length > 0;
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
  const remove = removable
    ? () => {
        setOpen(false);
        onSetAside();
      }
    : undefined;

  // L'indispensable pour valider (retour du fondateur, 2026-10-05) : le point, la désignation entière, la quantité ;
  // dessous, sur une ligne, ce qui reste à faire (orange) ou la précision utile. Le reste est dans la fiche.
  const body = (
    <>
      <span className={`mt-[6px] size-2.5 shrink-0 rounded-full ${dot.className}`} role="img" aria-label={dot.label} />
      <span className="flex min-w-0 grow flex-col">
        {/* La désignation entière : c'est ce que le comptoir lit (jamais coupée). Sur téléphone, la quantité passe dessous. */}
        <span className="text-[14px] leading-snug font-semibold">{label}</span>
        {quantity || sub || sketches.length > 0 ? (
          <span className="flex min-w-0 items-baseline gap-1.5 text-[13px] leading-snug">
            {quantity && !stepper ? <span className="shrink-0 text-[14px] font-extrabold tabular-nums sm:hidden">{quantity}</span> : null}
            {sub ? <span className={`min-w-0 ${sentTo ? "truncate font-bold text-muted" : row.status === "check" ? "font-bold text-warn" : "truncate text-muted"}`}>{sub}</span> : null}
            {sketches.length > 0 && !open ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#4a37d6]">
                <Paperclip size={12} aria-hidden="true" />
                {sketches.length}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {stepper ? null : <span className="shrink-0 text-right text-[15px] font-extrabold whitespace-nowrap tabular-nums max-sm:hidden">{quantity ?? ""}</span>}
      {open ? <X size={18} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" /> : null}
    </>
  );
  // §48.5 : en mode sélection, la ligne entière coche sa case ; rien d'autre ne s'ouvre.
  if (selectMode) {
    return (
      <li
        id={`ligne-${row.key}`}
        className={`rounded-2xl border border-[#dde1e8] border-l-4 px-3 py-2 ${BORDER[sentTo ? "supplier" : row.status]} ${selectMode.checked ? "bg-[#eef2ff]" : "bg-surface"} ${selectMode.disabled ? "opacity-60" : ""}`}
      >
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
    <li
      id={`ligne-${row.key}`}
      className={`relative flex scroll-mt-24 flex-col gap-2 overflow-hidden rounded-2xl border border-[#dde1e8] border-l-4 px-3 py-2 shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-colors ${BORDER[sentTo ? "supplier" : row.status]} ${open ? "bg-[#eef2ff]" : "bg-surface"}`}
    >
      {dx < 0 ? (
        <span aria-hidden="true" className="absolute inset-y-0 right-0 flex items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white">
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
          <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (swiped.current) return void (swiped.current = false);
              setOpen(!open);
            }}
            aria-expanded={open}
            aria-label={`${open ? "Fermer" : "Modifier"} : ${label}`}
            className="flex min-h-11 w-full min-w-0 items-start gap-2.5 rounded-xl text-left active:bg-ground/60"
          >
            {body}
          </button>
          {stepper ? (
            <Stepper
              label={label}
              value={stepper.value}
              unit={stepper.unit}
              pending={pending}
              onChange={(n) => onEdit(item!, { libelle: item!.label, quantite: String(n), unite: stepper.unit || null })}
            />
          ) : null}
          </div>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-2.5">{body}</div>
        )}
        {zincPiece && sketches.length === 0 && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-5 inline-flex min-h-9 items-center gap-1.5 text-[12px] font-bold text-[#4a37d6]"
          >
            <Paperclip size={13} aria-hidden="true" />
            Ajouter un croquis (facultatif)
          </button>
        ) : null}
      </div>
      {row.status === "check" && editable && !open && !sentTo ? (
        <CardActions label={label} decision={decision} item={item} pending={pending} handlers={handlers} onEdit={onEdit} onOpen={() => setOpen(true)} />
      ) : null}
      {open ? (
        <>
          {sketches.length > 0 ? (
            <ul aria-label={`Croquis joints : ${label}`} className="flex flex-wrap gap-2">
              {sketches.map((sk) => (
                <li key={sk.id} className="flex max-w-full items-center gap-1 rounded-xl bg-surface pl-2.5 text-[13px] font-bold text-[#4a37d6]">
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
          {canEdit && item ? (
            <ItemForm
              item={item}
              pending={pending}
              {...(sketchHandlers ? { onAttach: (file: File, commentaire: string) => sketchHandlers.onAttach(item.key, file, commentaire) } : {})}
              onCancel={() => setOpen(false)}
              onSave={async (e) => {
                await onEdit(item, e);
                setOpen(false);
              }}
              {...(remove ? { onRemove: remove } : {})}
            />
          ) : canEdit ? (
            lines.map((l, i) => (
              <LinePanel
                key={l.id}
                line={l}
                pending={pending}
                onCancel={() => setOpen(false)}
                onSave={async (f) => {
                  await handlers.onSaveLine(l.id, f);
                  setOpen(false);
                }}
                {...(remove && i === lines.length - 1 ? { onRemove: remove } : {})}
              />
            ))
          ) : null}
          {proofs.length > 0 ? (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setProof(!proof)} aria-expanded={proof} aria-label={`${proof ? "Masquer" : "Voir"} ${what} : ${label}`} className="inline-flex min-h-9 items-center gap-1 self-start text-[13px] font-bold text-accent-text">
                <ChevronDown size={16} aria-hidden="true" className={proof ? "rotate-180" : ""} />
                {proof ? `Masquer ${what}` : `Voir ${what}`}
              </button>
              {proof ? proofs.map((i) => <Proof key={`${i.kind}:${i.id}`} item={i} />) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

/** La fiche d'une ligne grise (reprise du devis, à préciser avec le fournisseur) : même panneau que pour un article. */
function LinePanel({
  line,
  pending,
  onSave,
  onCancel,
  onRemove,
}: {
  line: Takeoff["lines"][number];
  pending: boolean;
  onSave: (f: { designation: string; quantity: string | null; unit: string | null; reference: string | null }) => Promise<void>;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [designation, setDesignation] = useState(line.article ?? line.designation);
  const [quantity, setQuantity] = useState(line.quantity ?? "");
  const [unit, setUnit] = useState(line.unit ?? "");
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, []);
  return (
    <form
      ref={ref}
      aria-label={`Modifier : ${shortName(line.article ?? line.designation)}`}
      className={EDIT_PANEL}
      onSubmit={(e) => {
        e.preventDefault();
        if (!designation.trim()) return;
        void onSave({ designation: designation.trim(), quantity: quantity.trim() || null, unit: unit.trim() || null, reference: line.reference });
      }}
    >
      <p className="text-[12px] font-extrabold tracking-[0.04em] text-accent-text">MODIFIER L&apos;ARTICLE</p>
      <label htmlFor={`${id}-d`} className="flex flex-col gap-1 text-sm font-bold">
        Désignation
        <textarea id={`${id}-d`} rows={2} className={`${EDIT_FIELD} py-3 leading-snug`} value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-sm font-bold">
          Quantité
          <input id={`${id}-q`} className={EDIT_FIELD} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-sm font-bold">
          Unité
          <input id={`${id}-u`} className={EDIT_FIELD} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m², pièces, ml…" />
        </label>
      </div>
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

/** Clé d'une quantité calculée avec une règle « à vérifier » (§47.3). */
const RATIO = "ratio:";
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
  onOpen,
}: {
  label: string;
  decision: TakeoffDecision | undefined;
  item: PurchaseItem | undefined;
  pending: boolean;
  handlers: DecisionHandlers;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onOpen: () => void;
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
    <div role="group" aria-label={`Régler : ${label}`} aria-busy={pending || undefined} className="flex flex-col gap-2 pl-5">
      {asks.map((a) => (
        <div key={a.key} role="group" aria-label={a.text} className="flex flex-col gap-1.5">
          <p className="text-[13px] leading-snug font-bold">{a.text} ?</p>
          <div className="flex flex-wrap gap-1.5">
            {a.options.map((o) => (
              <button key={o.value || "aucun"} type="button" disabled={pending} onClick={() => void answer(a.key, a.unit, o.value)} className={`${OPTION} grow`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
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
            <Button className={btn} pending={pending} onClick={() => void handlers.onDecide(d)} aria-label={`Garder ${gap.written} : ${label}`}>
              Garder {gap.written}
            </Button>
            <Button
              className={btn}
              variant="secondary"
              pending={pending}
              onClick={() => void onEdit(item, { libelle: item.label, quantite: plainNumber(gap.computed), unite: parsed?.unit || gap.unit || null })}
              aria-label={`Mettre ${gap.computed} : ${label}`}
            >
              Mettre {gap.computed}
            </Button>
          </>
        ) : done ? (
          <Button className={btn} variant={asks.length > 0 ? "secondary" : "primary"} pending={pending} onClick={() => void handlers.onDecide(d)} aria-label={`C'est bon : ${label}`}>
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
        {!d || d.primary?.action === "edit" ? (
          <Button className={btn} variant={done ? "secondary" : "primary"} onClick={onOpen} aria-label={`Corriger : ${label}`}>
            <Pencil size={18} aria-hidden="true" />
            {d?.primary?.label ?? "Corriger"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
