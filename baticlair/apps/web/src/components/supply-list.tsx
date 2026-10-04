"use client";

import { Check, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { Assumptions, ItemForm, Suggestions, type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { InlineLineForm, Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import type { ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { doubtText, shortName } from "@/lib/labels";

/**
 * UN SEUL ÉCRAN : LA LISTE DES FOURNITURES (retour du fondateur, 2026-10-04, « un enfant de 10 ans s'en sort »).
 *  - chaque ligne a un point de couleur : vert = sûr, rien à faire ; orange = à vérifier, un tap ouvre SA question en
 *    bas de l'écran ; gris = à préciser avec le fournisseur, la ligne part telle quelle ;
 *  - en haut, « 11 fournitures · 2 à vérifier » ; en bas, UN gros bouton : « Vérifier les 2 lignes » tant qu'il reste
 *    de l'orange, sinon « Envoyer au fournisseur » ;
 *  - crayon pour modifier, glisser vers la gauche pour mettre de côté (« Annuler » pendant 3 s) ; « Voir le calcul »
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
}: {
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
  const [aside, setAside] = useState<ScreenRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const hidden = (r: ScreenRow) => aside?.key === r.key;
  const rows = screen.groups.flatMap((g) => g.rows).filter((r) => !hidden(r));
  const toCheck = rows.filter((r) => r.status === "check");
  const labelOf = (r: ScreenRow) =>
    r.itemKey ? (items.get(r.itemKey)?.kind === "direct" ? shortName(items.get(r.itemKey)!.label) : (items.get(r.itemKey)?.label ?? "")) : r.quoteKey ? shortName(quotes.get(r.quoteKey)?.label ?? "") : (r.pending?.label ?? "");

  const putAside = (r: ScreenRow) => {
    if (timer.current) clearTimeout(timer.current);
    setAside(r);
    timer.current = setTimeout(() => {
      void onSetAside(r).finally(() => setAside(null));
    }, 3000);
  };
  const undo = () => {
    if (timer.current) clearTimeout(timer.current);
    setAside(null);
  };
  const verify = () => {
    const first = toCheck[0];
    if (!first) return;
    document.getElementById(`ligne-${first.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setAsking(first);
  };

  // La question ouverte n'existe plus (réponse donnée, ligne passée au vert) : la feuille se ferme d'elle-même.
  const open = asking && rows.some((r) => r.key === asking.key && r.status === "check") ? asking : null;
  const decision = open?.decisionKey ? decisions.get(open.decisionKey) : undefined;
  const consumables = screen.groups.some((g) => g.kind === "consommables");

  return (
    // La barre du gros bouton est HORS de la carte : collée au-dessus de la barre de chat, elle ne laisse jamais de blanc
    // dans la carte quand on arrive au bas de la liste.
    <section aria-label="Liste des fournitures" className="flex flex-col">
      <div className="flex flex-col overflow-hidden rounded-[20px] bg-surface pb-2 shadow-card">
      <div className="flex flex-col gap-0.5 px-4 pt-4 pb-2">
        <h2 className="font-display text-[24px] font-extrabold tracking-[-0.02em]">Fournitures à chiffrer</h2>
        <p className="text-[15px] font-bold text-muted" aria-live="polite">
          {rows.length} fourniture{rows.length > 1 ? "s" : ""}
          {toCheck.length > 0 ? (
            <span className="text-warn"> · {toCheck.length} à vérifier</span>
          ) : (
            <span className="text-ok"> · {validated ? "liste validée" : "tout est prêt"}</span>
          )}
        </p>
      </div>
      {screen.groups.map((g) => {
        const visible = g.rows.filter((r) => !hidden(r));
        if (visible.length === 0 && !(g.kind === "consommables" && editable && p.suggestions.length > 0)) return null;
        return (
          <div key={g.key} className="flex flex-col border-t border-line px-4 pt-3 pb-1">
            <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-muted uppercase">
              {g.label}
              {g.measure ? ` · ${g.measure}` : ""}
            </h3>
            <ul aria-label={g.label} className="flex flex-col divide-y divide-line">
              {visible.map((r) => (
                <Row
                  key={r.key}
                  row={r}
                  takeoff={takeoff}
                  label={labelOf(r)}
                  editable={editable}
                  pending={pending}
                  onAsk={() => setAsking(r)}
                  onEdit={onEditItem}
                  onSetAside={() => putAside(r)}
                  sketches={sketches.filter((s) => r.itemKey && s.article === r.itemKey)}
                  {...(sketchHandlers ? { sketchHandlers } : {})}
                />
              ))}
            </ul>
            {g.kind === "consommables" && editable && p.suggestions.length > 0 ? (
              <Suggestions items={p.suggestions} pending={pending} onAnswer={onSuggestion} onEdit={onEditItem} />
            ) : null}
          </div>
        );
      })}
      {!consumables && editable && p.suggestions.length > 0 ? <Suggestions items={p.suggestions} pending={pending} onAnswer={onSuggestion} onEdit={onEditItem} /> : null}
      {p.assumptions.length > 0 ? <Assumptions assumptions={p.assumptions} editable={editable} pending={pending} onAnswer={handlers.onAnswer} /> : null}
      </div>

      {editable ? (
        // Un fondu sous le bouton : le texte de la liste ne passe jamais sous lui en se lisant mal.
        <div className="sticky bottom-[68px] z-10 -mt-4 bg-gradient-to-t from-ground from-60% to-transparent pt-8 pb-5 lg:bottom-[70px]">
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
        <div role="status" className="fixed inset-x-4 bottom-[max(96px,calc(env(safe-area-inset-bottom)+96px))] z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-card">
          <span className="min-w-0 truncate text-sm font-bold">Mis de côté : {labelOf(aside)}</span>
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
          onClose={() => setAsking(null)}
          onNext={() => {
            // Après la réponse, la ligne orange suivante s'ouvre d'elle-même si l'artisan enchaîne.
            setAsking(null);
          }}
        />
      ) : null}
    </section>
  );
}

const DOT: Record<ScreenRow["status"], { className: string; label: string }> = {
  ok: { className: "bg-ok", label: "sûr" },
  check: { className: "bg-warn", label: "à vérifier" },
  supplier: { className: "bg-[#b8bcc6]", label: "à préciser avec le fournisseur" },
};

/** Une ligne : le point, la désignation, la quantité en unité de vente, une sous-ligne grise facultative. */
function Row({
  row,
  takeoff,
  label,
  editable,
  pending,
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
  onAsk: () => void;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onSetAside: () => void;
  sketches: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const [editing, setEditing] = useState(false);
  const [proof, setProof] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const item = row.itemKey ? takeoff.purchase.toBuy.find((b) => b.key === row.itemKey) : undefined;
  const quote = row.quoteKey ? takeoff.purchase.toQuote.find((q) => q.key === row.quoteKey) : undefined;
  const proofs = item ? takeoff.view.items.filter((i) => (item.kind === "computed" ? i.kind === "need" && item.needIds.includes(i.id) : i.kind === "line" && item.lineIds.includes(i.id))) : [];
  // Une ligne reprise du devis n'a pas de calcul : on montre d'où elle vient.
  const what = item?.kind === "direct" ? "la ligne du devis" : "le calcul";
  const quantity = item?.quantity ?? quote?.measure ?? row.pending?.quantity ?? null;
  const sub =
    row.status === "check"
      ? "À vérifier : touchez la ligne"
      : row.status === "supplier"
        ? "À préciser avec le fournisseur"
        : ([item?.approx, item?.precision].filter(Boolean).join(" · ") || null);
  const dot = DOT[row.status];
  // Glisser vers la gauche met la ligne de côté (une ligne qui attend une réponse n'a rien à mettre de côté).
  const swipable = editable && !row.pending;
  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipable) return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    if (Math.abs(e.clientY - start.current.y) > Math.abs(x)) return;
    setDx(Math.min(0, x));
  };
  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    if (dx < -90) onSetAside();
    setDx(0);
  };

  const body = (
    <>
      <span className={`mt-1.5 size-3 shrink-0 rounded-full ${dot.className}`} role="img" aria-label={dot.label} />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{label}</span>
        {sub ? <span className={`text-[13px] leading-snug ${row.status === "check" ? "font-bold text-warn" : "text-muted"}`}>{sub}</span> : null}
      </span>
      <span className="shrink-0 text-right text-[16px] font-extrabold whitespace-nowrap tabular-nums">{quantity ?? ""}</span>
    </>
  );
  return (
    <li id={`ligne-${row.key}`} className="relative flex scroll-mt-24 flex-col gap-1 overflow-hidden py-2">
      {dx < 0 ? (
        <span aria-hidden="true" className="absolute inset-y-0 right-0 flex items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white">
          Mettre de côté
        </span>
      ) : null}
      <div
        className="relative flex items-start gap-1 bg-surface"
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {row.status === "check" ? (
          <button type="button" onClick={onAsk} aria-label={`À vérifier : ${label}`} className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl text-left active:bg-ground/60">
            {body}
          </button>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-3">{body}</div>
        )}
        {editable && item ? (
          <button type="button" onClick={() => setEditing(!editing)} aria-label={`Modifier : ${label}`} aria-expanded={editing} className="-mr-2 inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-xl text-subtle active:text-accent-text">
            <Pencil size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {proofs.length > 0 && !editing ? (
        <button type="button" onClick={() => setProof(!proof)} aria-expanded={proof} aria-label={`${proof ? "Masquer" : "Voir"} ${what} : ${label}`} className="ml-6 inline-flex min-h-6 items-center self-start text-[11px] font-semibold text-subtle">
          {proof ? `Masquer ${what}` : `Voir ${what}`}
        </button>
      ) : null}
      {sketches.length > 0 ? (
        <ul aria-label={`Croquis joints : ${label}`} className="ml-6 flex flex-wrap gap-2">
          {sketches.map((sk) => (
            <li key={sk.id} className="flex max-w-full items-center gap-1 rounded-xl bg-[#eeedff] pl-2.5 text-[13px] font-bold text-[#4a37d6]">
              <button type="button" onClick={() => void openDocument(sk.id)} className="flex min-h-9 min-w-0 items-center gap-1.5 text-left">
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
      {editing && item ? (
        <div className="flex flex-col gap-2">
          <ItemForm
            item={item}
            pending={pending}
            {...(sketchHandlers ? { onAttach: (file: File, commentaire: string) => sketchHandlers.onAttach(item.key, file, commentaire) } : {})}
            onCancel={() => setEditing(false)}
            onSave={async (e) => {
              await onEdit(item, e);
              setEditing(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              onSetAside();
            }}
            className="inline-flex min-h-11 items-center self-start text-sm font-bold text-danger"
          >
            Mettre de côté
          </button>
        </div>
      ) : null}
      {proof ? proofs.map((i) => <Proof key={`${i.kind}:${i.id}`} item={i} />) : null}
    </li>
  );
}

/**
 * LA QUESTION D'UNE LIGNE ORANGE, en bas de l'écran : des boutons (ou un champ court), comme dans le chat. La réponse
 * recalcule la liste ; la ligne passe au vert et la feuille se referme.
 */
/** Le titre de la question, en une phrase d'artisan, selon ce que la décision propose. */
function headline(d: TakeoffDecision, many: number): string {
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
  onClose,
  onNext,
}: {
  title: string;
  decision: TakeoffDecision | undefined;
  takeoff: Takeoff;
  pending: boolean;
  handlers: DecisionHandlers;
  onClose: () => void;
  onNext: () => void;
}) {
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
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-ground">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {!decision ? (
          <p className="text-[15px]">Cette ligne attend une information du devis. Corrigez-la avec le crayon.</p>
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

/** Une ligne du devis à garder, modifier ou retirer : la question, la carte de la ligne, trois gestes. */
function SheetDecision({ decision: d, lines, pending, handlers }: { decision: TakeoffDecision; lines: Takeoff["lines"]; pending: boolean; handlers: DecisionHandlers }) {
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const concerned = d.lineIds.map((id) => lines.find((l) => l.id === id)).filter((l): l is Takeoff["lines"][number] => Boolean(l));
  const single = concerned.length === 1 ? concerned[0]! : null;
  const title = single ? shortName(d.title) : d.title;
  const explain = doubtText(d.text);
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
          {single.designation.trim() !== title ? (
            <>
              <p className={`text-[14px] leading-snug text-muted ${full ? "" : "line-clamp-2"}`}>{single.designation}</p>
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
              <span className="line-clamp-1 min-w-0 text-[15px] font-semibold">{shortName(l.designation)}</span>
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
