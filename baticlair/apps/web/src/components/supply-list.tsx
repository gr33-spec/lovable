"use client";

import { Check, ChevronDown, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { EDIT_FIELD, EDIT_PANEL, ItemForm, type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { InlineLineForm, Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import type { ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { doubtText, parseQuantity, shortName } from "@/lib/labels";

/**
 * UN SEUL ÉCRAN : LA LISTE DES FOURNITURES (retour du fondateur, 2026-10-04, « un enfant de 10 ans s'en sort »).
 *  - chaque ligne a un point de couleur : vert = sûr, rien à faire ; orange = à vérifier, un tap ouvre SA question en
 *    bas de l'écran ; gris = à préciser avec le fournisseur, la ligne part telle quelle ;
 *  - en haut, « 11 fournitures · 2 à vérifier » ; en bas, UN gros bouton : « Vérifier les 2 lignes » tant qu'il reste
 *    de l'orange, sinon « Envoyer au fournisseur » ;
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
}: {
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
  const [asking, setAsking] = useState<ScreenRow | null>(null);
  // Une réponse donnée (ou une ligne retirée) : la question suivante s'ouvre d'elle-même, jusqu'à la dernière ligne
  // orange (retour du fondateur, 2026-10-05).
  const [chain, setChain] = useState(false);
  const [aside, setAside] = useState<ScreenRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const [removing, setRemoving] = useState<string[]>([]);
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
  const verify = () => {
    const first = toCheck[0];
    if (!first) return;
    document.getElementById(`ligne-${first.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setAsking(first);
  };

  // La question ouverte n'existe plus (réponse donnée, ligne passée au vert) : la feuille se ferme d'elle-même, ou, quand
  // l'artisan enchaîne, passe à la ligne orange suivante jusqu'à la dernière.
  const stillOpen = asking && rows.some((r) => r.key === asking.key && r.status === "check") ? asking : null;
  const nextToCheck = toCheck[0] ?? null;
  if (chain && !pending && !stillOpen && !nextToCheck) setChain(false);
  const open = stillOpen ?? (chain && !pending ? nextToCheck : null);
  const decision = open?.decisionKey ? decisions.get(open.decisionKey) : undefined;
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
  const [confirmAll, setConfirmAll] = useState(false);
  const removableRow = (r: ScreenRow) => editable && (r.itemKey !== undefined || r.lineIds.length > 0);
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
              <div className="mx-4 mt-2 flex flex-col gap-2 rounded-2xl bg-warn-bg p-3">
                {confirmAll ? (
                  <>
                    <p className="text-[14px] font-bold">
                      Garder les {simpleRows} lignes telles qu&apos;elles sont ? Les questions à choix restent à faire.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        pending={pending}
                        onClick={async () => {
                          await handlers.onDecideMany!(simple);
                          setConfirmAll(false);
                        }}
                      >
                        Oui, tout est bon
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                        Annuler
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] leading-snug font-semibold">
                      {simpleRows} lignes n&apos;attendent qu&apos;un « C&apos;est bon » : relisez-les d&apos;un coup d&apos;œil.
                    </p>
                    <Button variant="secondary" onClick={() => setConfirmAll(true)}>
                      <Check size={18} aria-hidden="true" />
                      Tout est bon ({simpleRows})
                    </Button>
                  </>
                )}
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
                      row={r}
                      takeoff={takeoff}
                      label={labelOf(r)}
                      editable={editable}
                      pending={pending}
                      handlers={handlers}
                      onAsk={() => setAsking(r)}
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

      {editable ? (
        // Un fondu sous le bouton : le texte de la liste ne passe jamais sous lui en se lisant mal.
        <div className={`sticky z-10 -mt-4 bg-gradient-to-t from-ground from-60% to-transparent pt-8 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]"}`}>
          {toCheck.length > 0 ? (
            <Button className="w-full" variant="accent" onClick={verify}>
              Vérifier {toCheck.length > 1 ? `les ${toCheck.length} lignes` : "la ligne"}
            </Button>
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
        <div role="status" className={`fixed inset-x-4 z-[60] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-card ${open ? "top-4" : "bottom-[max(96px,calc(env(safe-area-inset-bottom)+96px))]"}`}>
          <span className="min-w-0 truncate text-sm font-bold">Retiré de la liste : {labelOf(aside)}</span>
          <button type="button" onClick={undo} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-extrabold text-[#9db8ff]">
            Annuler
          </button>
        </div>
      ) : null}

      {open ? (
        <QuestionSheet
          title={labelOf(open)}
          decision={decision}
          takeoff={takeoff}
          pending={pending}
          handlers={handlers}
          onEditItem={onEditItem}
          onClose={() => {
            setAsking(null);
            setChain(false);
          }}
          {...(removableRow(open)
            ? {
                onRemove: () => {
                  putAside(open);
                  setAsking(null);
                  setChain(true);
                },
              }
            : {})}
          onNext={() => setChain(true)}
        />
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
 * retirer). Une ligne orange ouvre sa question. Toutes les lignes se modifient, grises comprises. Glisser à gauche retire.
 */
function Row({
  row,
  takeoff,
  label,
  editable,
  pending,
  handlers,
  onAsk,
  onEdit,
  onSetAside,
  sketches,
  sketchHandlers,
}: {
  row: ScreenRow;
  takeoff: Takeoff;
  label: string;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  onAsk: () => void;
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
  const sub =
    row.status === "check"
      ? (row.reason ?? "À vérifier : touchez la ligne")
      : row.status === "supplier"
        ? "À préciser avec le fournisseur"
        : ([item?.approx, item?.precision].filter(Boolean).join(" · ") || null);
  const dot = DOT[row.status];
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
            {sub ? <span className={`min-w-0 ${row.status === "check" ? "line-clamp-2 font-bold text-warn" : "truncate text-muted"}`}>{sub}</span> : null}
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
  return (
    <li
      id={`ligne-${row.key}`}
      className={`relative flex scroll-mt-24 flex-col gap-2 overflow-hidden rounded-2xl border border-[#dde1e8] border-l-4 px-3 py-2 shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-colors ${BORDER[row.status]} ${open ? "bg-[#eef2ff]" : "bg-surface"}`}
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
              if (row.status === "check") onAsk();
              else setOpen(!open);
            }}
            aria-expanded={row.status === "check" ? undefined : open}
            aria-label={row.status === "check" ? `À vérifier : ${label}` : `${open ? "Fermer" : "Modifier"} : ${label}`}
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
          {row.status === "check" && editable && item ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={`Modifier la désignation : ${label}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent-text active:bg-ground"
            >
              <Pencil size={17} aria-hidden="true" />
            </button>
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

/**
 * LA QUESTION D'UNE LIGNE ORANGE, en bas de l'écran : des boutons (ou un champ court), comme dans le chat. La réponse
 * recalcule la liste ; la ligne passe au vert et la feuille se referme.
 */
/** Le titre de la question, en une phrase d'artisan, selon ce que la décision propose. */
function headline(d: TakeoffDecision, many: number): string {
  if (d.key.startsWith(AI_ADDITION)) return `On ajoute ${d.title} ?`;
  if (d.key.startsWith(AI_DOUBT) || d.key.startsWith(FORBIDDEN) || d.key.startsWith(MISSING_INFO)) return d.title;
  // Le doute est déjà une question (« Chiffre peu lisible : 2 ou 3 paquets ? ») : c'est elle qu'on pose.
  if (doubtText(d.text).trim().endsWith("?")) return doubtText(d.text).trim();
  if (d.primary?.action === "keep") return many > 1 ? `On garde ces ${many} lignes telles quelles ?` : "On garde cette ligne telle quelle ?";
  if (d.primary?.action === "pieces") return many > 1 ? `On compte ces ${many} lignes à la pièce ?` : "On la compte à la pièce ?";
  if (d.primary?.action === "edit" || d.state === "missing") return "Il manque une information";
  return d.text;
}

/**
 * LA QUESTION EN BAS DE L'ÉCRAN (retour du fondateur, 2026-10-04 : « plus moderne et intuitif »). Une seule chose à
 * lire : la question en gros ; la ligne du devis dans une carte (texte replié, « Lire tout ») ; puis un geste par
 * bouton : garder, modifier, retirer. Jamais le même texte trois fois.
 */
function QuestionSheet({
  title,
  decision,
  takeoff,
  pending,
  handlers,
  onEditItem,
  onClose,
  onNext,
  onRemove,
}: {
  title: string;
  decision: TakeoffDecision | undefined;
  takeoff: Takeoff;
  pending: boolean;
  handlers: DecisionHandlers;
  onEditItem: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onClose: () => void;
  onNext: () => void;
  /** Retirer la ligne de la liste (« Annuler » pendant 3 s), puis la question suivante. */
  onRemove?: () => void;
}) {
  const itemKey = decision ? checkedItemKey(decision.key) : null;
  const ratioItem = itemKey ? takeoff.purchase.toBuy.find((b) => b.key === itemKey) : undefined;
  const id = useId();
  const [value, setValue] = useState("");
  const q = decision?.question;
  const options = q?.options ?? [];
  const answer = async (v: string | { value: string; unit: string } | null) => {
    if (!decision) return;
    await handlers.onAnswer(decision.key, v);
    onNext();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const engineQuestion = decision ? q?.key.startsWith("param:") || decision.key.startsWith("engine:") : false;
  // « Je ne sais pas » : une question du calcul passe, une précision de ligne part au fournisseur telle quelle.
  const canSkip = decision ? decision.key.startsWith("engine:") || decision.key.startsWith("precise:") : false;
  const optionButton = "inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-surface px-4 text-base font-extrabold transition active:scale-[0.98] active:border-accent active:bg-accent/10 disabled:opacity-60";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Question : ${title}`} className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <button type="button" aria-label="Fermer la question" onClick={onClose} className="fixed inset-0 -z-10 bg-ink/40 backdrop-blur-[2px]" />
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))] shadow-card">
        <span className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/12 px-3 py-1 text-[13px] font-extrabold text-warn">
            <span className="size-2 rounded-full bg-warn" aria-hidden="true" />À vérifier
          </span>
          <span className="-mr-2 flex items-center gap-1">
            {onRemove ? (
              <button type="button" onClick={onRemove} aria-label={`Retirer de la liste : ${title}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-ground active:text-danger">
                <Trash2 size={20} aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-ground">
              <X size={22} aria-hidden="true" />
            </button>
          </span>
        </div>
        {!decision ? (
          <p className="text-[15px]">Cette ligne attend une information du devis. Corrigez-la avec le crayon.</p>
        ) : ratioItem ? (
          <RatioSheet
            decision={decision}
            item={ratioItem}
            pending={pending}
            onConfirm={async () => {
              await handlers.onDecide(decision);
              onNext();
            }}
            onCorrect={async (e) => {
              await onEditItem(ratioItem, e);
              onNext();
            }}
            onReplace={async (e) => {
              // La remarque est levée d'abord (au journal), puis l'article prend la désignation proposée.
              await handlers.onDecide(decision);
              await onEditItem(ratioItem, e);
              onNext();
            }}
          />
        ) : q && options.length > 0 ? (
          <>
            <div className="flex flex-col gap-1">
              <p className="line-clamp-1 text-sm font-bold text-muted">{title}</p>
              <p className="text-[22px] leading-tight font-extrabold tracking-[-0.01em]">{engineQuestion ? decision.text.replace(/ Cela change la commande :.*$/, "") : decision.text}</p>
              {q.hint ? <p className="text-[15px] text-muted">{q.hint}</p> : null}
            </div>
            <div className={`grid gap-2 ${options.length > 3 && options.every((o) => o.label.length <= 12) ? "grid-cols-2" : "grid-cols-1"}`}>
              {options.map((o) => (
                <button key={o.value || "aucun"} type="button" disabled={pending} onClick={() => void answer(o.value)} className={optionButton}>
                  {o.label}
                </button>
              ))}
            </div>
            {canSkip ? (
              <button type="button" disabled={pending} onClick={() => void answer(null)} className="inline-flex min-h-11 items-center justify-center text-[15px] font-bold text-muted">
                Je ne sais pas
              </button>
            ) : null}
          </>
        ) : q && q.kind === "param" ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = value.trim().replace(",", ".");
              if (/^\d+(?:\.\d+)?$/.test(v)) void answer({ value: v, unit: q.unit ?? "u" });
            }}
          >
            <p className="line-clamp-1 text-sm font-bold text-muted">{title}</p>
            <label htmlFor={id} className="text-[22px] leading-tight font-extrabold tracking-[-0.01em]">
              {decision.text.replace(/ Cela change la commande :.*$/, "")}
            </label>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-accent">
              <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-14 w-full bg-transparent text-[20px] font-extrabold outline-none" autoFocus />
              {q.unit && q.unit !== "u" ? <span className="text-base font-bold text-muted">{q.unit === "m2" ? "m²" : q.unit}</span> : null}
            </div>
            <Button type="submit" pending={pending}>
              Valider
            </Button>
          </form>
        ) : (
          <SheetDecision decision={decision} lines={takeoff.lines} pending={pending} handlers={handlers} />
        )}
      </div>
    </div>
  );
}

/** Clé d'une quantité calculée avec une règle « à vérifier » (§47.3). */
const RATIO = "ratio:";
/** Interdits du code (aucune IA), doutes et ajouts de l'appel IA n° 2 : toujours orange, jamais verts d'office. */
const FORBIDDEN = "interdit:";
const AI_DOUBT = "ia-doute:";
const AI_ADDITION = "ia-ajout:";
/** §48.4 : une information restée sans réponse aux questions : la ligne est orange, « C'est bon » la laisse partir telle quelle. */
const MISSING_INFO = "manque:";

/** L'article visé par une remarque posée sur un article (ratio, interdit, doute du comptoir). */
function checkedItemKey(key: string): string | null {
  if (key.startsWith(RATIO)) return key.slice(RATIO.length);
  if (key.startsWith(AI_DOUBT)) return key.slice(AI_DOUBT.length);
  // interdit:<règle>:<article>
  if (key.startsWith(FORBIDDEN)) return key.slice(FORBIDDEN.length).replace(/^[^:]*:/, "");
  return null;
}

/**
 * §47.3 : une quantité calculée avec une règle « à vérifier » : le chiffre en grand, la règle en une ligne, « C'est bon »
 * la passe au vert ; un tap sur le chiffre la corrige (le chiffre de l'artisan remplace le calcul, et va au journal).
 */
function RatioSheet({
  decision: d,
  item,
  pending,
  onConfirm,
  onCorrect,
  onReplace,
}: {
  decision: TakeoffDecision;
  item: PurchaseItem;
  pending: boolean;
  onConfirm: () => Promise<void>;
  onCorrect: (e: ItemEdit) => Promise<void>;
  onReplace: (e: ItemEdit) => Promise<void>;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const parsed = item.quantity ? parseQuantity(item.quantity) : null;
  const [quantite, setQuantite] = useState(parsed?.quantity ?? "");
  const [unite, setUnite] = useState(parsed?.unit ?? "");
  return (
    <section aria-label={`À confirmer : ${item.label}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-muted">{item.label}</p>
        {editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = quantite.trim().replace(",", ".");
              if (/^\d+(?:\.\d+)?$/.test(v)) void onCorrect({ libelle: item.label, quantite: v, unite: unite.trim() || null });
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-sm font-bold">
                Quantité
                <input id={`${id}-q`} inputMode="decimal" autoFocus value={quantite} onChange={(e) => setQuantite(e.target.value)} className={EDIT_FIELD} />
              </label>
              <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-sm font-bold">
                Unité
                <input id={`${id}-u`} value={unite} onChange={(e) => setUnite(e.target.value)} className={EDIT_FIELD} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" pending={pending}>
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Corriger la quantité : ${item.quantity ?? ""}`}
            className="inline-flex items-center gap-2 self-start rounded-xl text-left text-[30px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums underline decoration-line decoration-dotted underline-offset-[6px]"
          >
            {item.quantity}
            <Pencil size={18} aria-hidden="true" className="text-subtle" />
          </button>
        )}
        {d.key.startsWith(RATIO) ? null : <p className="text-[13px] font-extrabold tracking-wide text-muted uppercase">{d.title}</p>}
        <p className="text-[15px] leading-snug font-semibold text-warn">{d.text}</p>
        {item.approx ? <p className="text-[13px] text-muted">{item.approx}</p> : null}
      </div>
      {editing ? null : (
        <div className="flex flex-col gap-2">
          <Button pending={pending} onClick={() => void onConfirm()} aria-label={`C'est bon : ${item.label}`}>
            <Check size={20} aria-hidden="true" />
            C&apos;est bon
          </Button>
          {d.suggestion ? (
            <Button
              variant="secondary"
              pending={pending}
              onClick={() => void onReplace({ libelle: d.suggestion!.label, quantite: d.suggestion!.quantity ?? parsed?.quantity ?? null, unite: d.suggestion!.unit ?? parsed?.unit ?? null })}
            >
              Remplacer par : {d.suggestion.label}
              {d.suggestion.quantity ? ` (${[d.suggestion.quantity, d.suggestion.unit].filter(Boolean).join(" ")})` : ""}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={18} aria-hidden="true" />
            Corriger le chiffre
          </Button>
        </div>
      )}
    </section>
  );
}

/** Une ligne du devis à garder, modifier ou retirer : la question, la carte de la ligne, trois gestes. */
function SheetDecision({ decision: d, lines, pending, handlers }: { decision: TakeoffDecision; lines: Takeoff["lines"]; pending: boolean; handlers: DecisionHandlers }) {
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const concerned = d.lineIds.map((id) => lines.find((l) => l.id === id)).filter((l): l is Takeoff["lines"][number] => Boolean(l));
  const single = concerned.length === 1 ? concerned[0]! : null;
  const title = single ? shortName(d.title) : d.title;
  const explain = doubtText(d.text.replace(/^À ajouter \? /, ""));
  const primary = d.primary && d.primary.action !== "edit" ? d.primary : null;
  const canEdit = single && (d.primary?.action === "edit" || d.secondary.includes("edit"));
  const qty = (l: Takeoff["lines"][number]) => (l.quantity ? `${l.quantity} ${l.unit ?? ""}`.trim() : "Quantité ?");

  return (
    <section aria-label={`À régler : ${title}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.01em]">{editing ? "Modifier la ligne" : headline(d, concerned.length)}</h3>
        {!editing && explain && explain.trim() !== headline(d, concerned.length) ? <p className="text-[15px] leading-snug text-muted">{explain}</p> : null}
      </div>

      {editing && single ? (
        <InlineLineForm
          line={single}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={async (f) => {
            await handlers.onSaveLine(single.id, f);
            setEditing(false);
          }}
        />
      ) : single ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-ground p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[16px] leading-snug font-extrabold">{title}</p>
            <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-[15px] font-extrabold whitespace-nowrap tabular-nums shadow-sm">{qty(single)}</span>
          </div>
          {(single.article ?? single.designation).trim() !== title ? (
            <>
              <p className={`text-[14px] leading-snug text-muted ${full ? "" : "line-clamp-2"}`}>{single.article ?? single.designation}</p>
              <button type="button" onClick={() => setFull(!full)} aria-expanded={full} className="inline-flex min-h-9 items-center self-start text-[13px] font-bold text-accent-text">
                {full ? "Réduire" : "Lire tout"}
              </button>
            </>
          ) : null}
        </div>
      ) : concerned.length > 1 ? (
        <ul className="flex flex-col divide-y divide-line rounded-2xl bg-ground px-4">
          {concerned.slice(0, full ? undefined : 4).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="line-clamp-1 min-w-0 text-[15px] font-semibold">{shortName(l.article ?? l.designation)}</span>
              <span className="shrink-0 text-[14px] font-extrabold text-muted tabular-nums">{qty(l)}</span>
            </li>
          ))}
          {concerned.length > 4 ? (
            <li>
              <button type="button" onClick={() => setFull(!full)} className="inline-flex min-h-11 items-center text-[13px] font-bold text-accent-text">
                {full ? "Réduire" : `Voir les ${concerned.length - 4} autres`}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {editing ? null : (
        <div className="flex flex-col gap-2">
          {primary ? (
            <Button pending={pending} onClick={() => void handlers.onDecide(d)} aria-label={single ? `${primary.label} : ${single.designation}` : primary.label}>
              <Check size={20} aria-hidden="true" />
              {primary.label}
            </Button>
          ) : null}
          {d.key.startsWith(AI_ADDITION) ? (
            <Button variant="secondary" pending={pending} onClick={() => void handlers.onAnswer(d.key, "non")}>
              <X size={18} aria-hidden="true" />
              Non, pas besoin
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant={primary ? "secondary" : "primary"} onClick={() => setEditing(true)} aria-label={`Corriger ${single!.designation}`}>
              <Pencil size={18} aria-hidden="true" />
              {d.primary?.action === "edit" ? d.primary.label : "Modifier"}
            </Button>
          ) : null}
          {d.secondary.includes("remove") && single ? (
            confirmRemove ? (
              <div role="group" aria-label="Confirmer le retrait" className="flex items-center justify-center gap-2">
                <button type="button" disabled={pending} onClick={() => void handlers.onDeleteLine(single.id)} className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white">
                  Oui, retirer
                </button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} aria-label={`Retirer ${single.designation}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-bold text-muted">
                <Trash2 size={16} aria-hidden="true" />
                Retirer de la liste
              </button>
            )
          ) : null}
        </div>
      )}
    </section>
  );
}
