"use client";

import { Paperclip, Pencil, Send, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { Assumptions, ItemForm, Suggestions, type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { DecisionCard, Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import type { ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { shortName } from "@/lib/labels";

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
}: {
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
    <section aria-label="Liste des fournitures" className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card">
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

      {editable ? (
        <div className="sticky bottom-[84px] z-10 px-4 pt-2 pb-3 lg:bottom-[92px]">
          {toCheck.length > 0 ? (
            <Button className="w-full" variant="accent" onClick={verify}>
              Vérifier {toCheck.length > 1 ? `les ${toCheck.length} lignes` : "la ligne"}
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
        <span className="text-[15px] leading-snug font-semibold">{label}</span>
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
        <button type="button" onClick={() => setProof(!proof)} aria-expanded={proof} aria-label={`${proof ? "Masquer" : "Voir"} le calcul : ${label}`} className="ml-6 inline-flex min-h-6 items-center self-start text-[11px] font-semibold text-subtle">
          {proof ? "Masquer le calcul" : "Voir le calcul"}
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
  return (
    <div role="dialog" aria-modal="true" aria-label={`Question : ${title}`} className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <button type="button" aria-label="Fermer la question" onClick={onClose} className="fixed inset-0 -z-10 bg-ink/30" />
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-card">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-extrabold text-warn">
            <span className="size-3 rounded-full bg-warn" aria-hidden="true" />
            {title}
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {!decision ? (
          <p className="text-[15px]">Cette ligne attend une information du devis. Corrigez-la avec le crayon.</p>
        ) : q && options.length > 0 ? (
          <>
            <p className="text-[19px] leading-snug font-extrabold">{q.key.startsWith("param:") || decision.key.startsWith("engine:") ? decision.text.replace(/ Cela change la commande :.*$/, "") : decision.text}</p>
            {q.hint ? <p className="text-sm text-muted">{q.hint}</p> : null}
            <div className="flex flex-col gap-2">
              {options.map((o) => (
                <button key={o.value || "aucun"} type="button" disabled={pending} onClick={() => void answer(o.value)} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-ground px-4 text-base font-extrabold active:bg-accent/15 disabled:opacity-60">
                  {o.label}
                </button>
              ))}
              {decision.key.startsWith("engine:") ? (
                <button type="button" disabled={pending} onClick={() => void answer(null)} className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-muted">
                  Je ne sais pas
                </button>
              ) : null}
            </div>
          </>
        ) : q && q.kind === "param" ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = value.trim().replace(",", ".");
              if (/^\d+(?:\.\d+)?$/.test(v)) void answer({ value: v, unit: q.unit ?? "u" });
            }}
          >
            <label htmlFor={id} className="text-[19px] leading-snug font-extrabold">
              {decision.text.replace(/ Cela change la commande :.*$/, "")}
            </label>
            <div className="flex items-center gap-2">
              <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-13 w-full rounded-2xl bg-ground px-4 text-base" autoFocus />
              {q.unit && q.unit !== "u" ? <span className="text-base font-bold">{q.unit === "m2" ? "m²" : q.unit}</span> : null}
            </div>
            <Button type="submit" pending={pending}>
              Valider
            </Button>
          </form>
        ) : (
          <DecisionCard decision={decision} lines={takeoff.lines} editable pending={pending} handlers={handlers} />
        )}
      </div>
    </div>
  );
}
