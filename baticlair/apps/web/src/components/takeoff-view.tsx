"use client";

import { AlertTriangle, Check, ChevronDown, CircleCheck, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui";
import type { TakeoffOuvrage, Origin, ProofCriterion, TakeoffDecision, TakeoffLine, TakeoffView, TakeoffViewItem } from "@/lib/api";
import { doubtText, shortName } from "@/lib/labels";

/**
 * L'écran de la liste, vu par l'artisan : trois compteurs, les décisions à
 * prendre (regroupées : une réponse règle toutes les lignes concernées), le
 * reste prêt et replié. Toute la preuve est derrière « Voir le calcul ».
 */

const ORIGIN_LABEL: Record<Origin, string> = {
  devis: "lu dans le devis",
  referential: "donnée vérifiée BatiClair",
  company: "habitude de votre entreprise",
  project: "choisi pour ce chantier",
  assumption: "hypothèse, modifiable",
};

const CRITERION_LABEL: Record<ProofCriterion["key"], string> = {
  reading: "Lecture du devis",
  work_item: "Article",
  product: "Produit",
  manufacturer_data: "Donnée fabricant",
  rule: "Règle de calcul",
  site_data: "Chantier",
  consistency: "Cohérence",
  packaging: "Conditionnement",
};

export function TrustHeader({ counts }: { counts: TakeoffView["counts"] }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[20px] font-extrabold">Votre liste de matériaux</h2>
      <p className="text-[15px] font-semibold text-muted">
        <span className="text-ok">✓ {counts.verified} prêts</span>
        {counts.toConfirm > 0 ? <span className="text-warn"> · ⚠ {counts.toConfirm} à confirmer</span> : null}
        {counts.missing > 0 ? <span> · ? {counts.missing} information{counts.missing > 1 ? "s" : ""} manquante{counts.missing > 1 ? "s" : ""}</span> : null}
      </p>
    </div>
  );
}

export interface DecisionHandlers {
  onDecide: (d: TakeoffDecision) => Promise<void>;
  onAnswer: (key: string, value: string | { value: string; unit: string } | null) => Promise<void>;
  onSaveLine: (lineId: string, fields: { designation: string; quantity: string | null; unit: string | null; reference: string | null }) => Promise<void>;
  onDeleteLine: (lineId: string) => Promise<void>;
}

/** Une décision : une phrase, deux gros boutons. Si elle règle plusieurs lignes, elles sont à un appui. */
export function DecisionCard({
  decision: d,
  lines,
  editable,
  pending,
  handlers,
}: {
  decision: TakeoffDecision;
  lines: TakeoffLine[];
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const concerned = d.lineIds.map((id) => lines.find((l) => l.id === id)).filter((l): l is TakeoffLine => Boolean(l));
  const single = concerned.length === 1 ? concerned[0]! : null;
  const title = single ? shortName(d.title) : d.title;
  const missing = d.state === "missing";
  const bigButton = "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-base font-extrabold disabled:opacity-60";

  return (
    <section aria-label={`À régler : ${title}`} className={`flex flex-col gap-3 rounded-3xl border-l-4 bg-surface p-5 shadow-card ${missing ? "border-ink" : "border-warn"}`}>
      <span className={`flex items-center gap-1.5 text-sm font-extrabold ${missing ? "text-ink" : "text-warn"}`}>
        {missing ? <HelpCircle size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
        {missing ? "Information manquante" : "À confirmer"}
      </span>
      <p className="text-[20px] leading-tight font-extrabold">{title}</p>
      {single ? (
        <p className="text-[17px]">
          <strong>{single.quantity ?? "Quantité ?"}</strong> {single.unit ?? ""}
        </p>
      ) : null}
      <p className="text-[15px] leading-snug">{doubtText(d.text)}</p>

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
      ) : editable ? (
        <>
          <DecisionButtons d={d} single={single} pending={pending} handlers={handlers} bigButton={bigButton} onEdit={() => (single ? setEditing(true) : setOpen(true))} />
          {d.secondary.includes("remove") && single ? (
            confirmRemove ? (
              <div role="group" aria-label="Confirmer le retrait" className="flex gap-2">
                <button type="button" disabled={pending} onClick={() => void handlers.onDeleteLine(single.id)} className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white">
                  Oui, retirer
                </button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} aria-label={`Retirer ${single.designation}`} className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-muted">
                <Trash2 size={16} aria-hidden="true" />
                Retirer de la liste
              </button>
            )
          ) : null}
        </>
      ) : null}

      {concerned.length > 1 ? (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-accent-text">
            <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
            {open ? "Masquer" : "Voir"} les {concerned.length} lignes
          </button>
          {open ? (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {concerned.map((l) => (
                <ConcernedLine key={l.id} line={l} editable={editable} pending={pending} handlers={handlers} />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function DecisionButtons({
  d,
  single,
  pending,
  handlers,
  bigButton,
  onEdit,
}: {
  d: TakeoffDecision;
  single: TakeoffLine | null;
  pending: boolean;
  handlers: DecisionHandlers;
  bigButton: string;
  onEdit: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const q = d.question;
  if (q?.kind === "param" && q.options.length > 0) {
    // Une question à boutons (« Combien de descentes ? 1 · 2 · 3 · 4 ») : l'artisan ne tape rien, et peut passer.
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o) => (
            <button key={o.value} type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, { value: o.value, unit: q.unit ?? "" })} className={`${bigButton} bg-accent text-white`}>
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, null)} className={`${bigButton} bg-ground text-ink`}>
          Je ne sais pas
        </button>
      </div>
    );
  }
  if (q?.kind === "param") {
    return (
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) void handlers.onAnswer(q.key, { value: value.trim(), unit: q.unit ?? "" });
        }}
      >
        <label htmlFor={id} className="flex grow flex-col gap-1 text-sm font-bold">
          {q.unit ? `Valeur (${q.unit})` : "Valeur"}
          <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-12 rounded-2xl bg-ground px-3 text-base" />
        </label>
        <Button type="submit" pending={pending}>
          Renseigner
        </Button>
      </form>
    );
  }
  if (q?.kind === "choose_product") {
    return (
      <div className="flex flex-col gap-2">
        {q.options.map((o) => (
          <button key={o.value} type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, o.value)} className={`${bigButton} bg-accent text-white`}>
            {o.label}
          </button>
        ))}
        <button type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, null)} className={`${bigButton} bg-ground text-ink`}>
          Aucun de ces modèles
        </button>
      </div>
    );
  }
  if (q?.kind === "choose") {
    // Deux lectures possibles d'une même ligne (« 6 ardoises » ou « 6 jouées ») : l'artisan tranche.
    return (
      <div className="flex flex-col gap-2">
        {q.options.map((o) => (
          <button key={o.value} type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, o.value)} className={`${bigButton} bg-accent text-white`}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  if (q?.kind === "confirm_product") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, q.options[0]?.value ?? "")} className={`${bigButton} bg-accent text-white`}>
          <Check size={20} aria-hidden="true" />
          {d.primary?.label ?? "Oui"}
        </button>
        <button type="button" disabled={pending} onClick={() => void handlers.onAnswer(q.key, "")} className={`${bigButton} bg-ground text-ink`}>
          Modifier
        </button>
      </div>
    );
  }
  const primary = d.primary;
  return (
    <div className={`grid gap-2 ${primary && primary.action !== "edit" && d.secondary.includes("edit") ? "grid-cols-2" : "grid-cols-1"}`}>
      {primary && primary.action !== "edit" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void handlers.onDecide(d)}
          aria-label={single ? `${primary.label} : ${single.designation}` : primary.label}
          className={`${bigButton} bg-accent text-white`}
        >
          <Check size={20} aria-hidden="true" />
          {primary.label}
        </button>
      ) : null}
      {primary?.action === "edit" || d.secondary.includes("edit") ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={single ? `Corriger ${single.designation}` : "Corriger ligne par ligne"}
          className={`${bigButton} ${primary?.action === "edit" ? "bg-accent text-white" : "bg-ground text-ink"}`}
        >
          <Pencil size={18} aria-hidden="true" />
          {primary?.action === "edit" ? primary.label : single ? "Corriger" : "Ligne par ligne"}
        </button>
      ) : null}
    </div>
  );
}

function ConcernedLine({ line, editable, pending, handlers }: { line: TakeoffLine; editable: boolean; pending: boolean; handlers: DecisionHandlers }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="py-2">
        <InlineLineForm
          line={line}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={async (f) => {
            await handlers.onSaveLine(line.id, f);
            setEditing(false);
          }}
        />
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 grow">
        <span className="line-clamp-1 font-semibold">{shortName(line.article ?? line.designation)}</span>
        <span className="text-muted">
          {line.quantity ?? "?"} {line.unit ?? "(sans unité)"}
        </span>
      </span>
      {editable ? (
        <>
          <button type="button" onClick={() => setEditing(true)} aria-label={`Corriger ${line.designation}`} className="flex size-11 shrink-0 items-center justify-center text-accent-text">
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button type="button" disabled={pending} onClick={() => void handlers.onDeleteLine(line.id)} aria-label={`Retirer ${line.designation}`} className="flex size-11 shrink-0 items-center justify-center text-muted">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </li>
  );
}

export function InlineLineForm({
  line,
  pending,
  onSubmit,
  onCancel,
}: {
  line: TakeoffLine;
  pending: boolean;
  onSubmit: (f: { designation: string; quantity: string | null; unit: string | null; reference: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [designation, setDesignation] = useState(line.designation);
  const [quantity, setQuantity] = useState(line.quantity ?? "");
  const [unit, setUnit] = useState(line.unit ?? "");
  const input = "min-h-12 w-full rounded-2xl bg-ground px-3 text-base";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!designation.trim()) return;
        void onSubmit({ designation: designation.trim(), quantity: quantity.trim() || null, unit: unit.trim() || null, reference: line.reference });
      }}
    >
      {/* Tout se réécrit d'un tap (§41.4) : la désignation aussi, pas seulement la quantité. */}
      <label htmlFor={`${id}-d`} className="flex flex-col gap-1 text-sm font-bold">
        Désignation
        <textarea id={`${id}-d`} rows={3} className={`${input} py-3 leading-snug`} value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor={`${id}-q`} className="flex flex-col gap-1 text-sm font-bold">
          Quantité
          <input id={`${id}-q`} className={input} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label htmlFor={`${id}-u`} className="flex flex-col gap-1 text-sm font-bold">
          Unité
          <input id={`${id}-u`} className={input} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="u, m², ml…" />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="grow">
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** « Voir le calcul » : la preuve, seulement si l'artisan la demande. */
export function Proof({ item }: { item: TakeoffViewItem }) {
  if (item.calculation) {
    return (
      <ul className="flex flex-col gap-1 rounded-2xl bg-ground p-3 text-sm">
        {item.calculation.trace.map((t, i) => (
          <li key={i}>
            <strong>{t.label}</strong> : {t.value} {t.unit} <span className="text-muted">— {t.from}{t.origin ? ` (${ORIGIN_LABEL[t.origin]})` : ""}</span>
            {t.url ? (
              <>
                {" "}
                <a href={t.url} target="_blank" rel="noreferrer" className="font-bold text-accent-text">
                  source
                </a>
              </>
            ) : null}
          </li>
        ))}
        {item.proof
          .filter((p) => p.key === "packaging")
          .map((p, i) => (
            <li key={`p${i}`}>
              <strong>Quantité de vente</strong> : {p.detail}
              {p.comparisonRisk ? <span className="text-muted"> — à surveiller en comparant les offres</span> : null}
            </li>
          ))}
        {item.calculation.exclusions ? <li className="text-muted">Non compté : {item.calculation.exclusions}</li> : null}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-1 rounded-2xl bg-ground p-3 text-sm">
      {item.proof
        .filter((p) => p.key !== "consistency" || p.status !== "established")
        .map((p, i) => (
          <li key={i}>
            <strong>{CRITERION_LABEL[p.key]}</strong> : {p.detail}
            {p.origin ? <span className="text-muted"> ({ORIGIN_LABEL[p.origin]})</span> : null}
            {p.status === "no_effect" ? <span className="text-muted"> — sans effet sur la liste</span> : null}
            {p.status === "supplier" && p.comparisonRisk ? <span className="text-muted"> — à surveiller en comparant les offres</span> : null}
          </li>
        ))}
    </ul>
  );
}

/** Une ligne prête : nom, quantité, et la preuve à un appui. Un produit habituel se dit simplement. */
function ReadyRow({ item, onAnswer, editable }: { item: TakeoffViewItem; onAnswer: DecisionHandlers["onAnswer"]; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const habit = item.calculation?.productOrigin === "preference" ? item.proof.find((p) => p.key === "product" && p.origin === "company") : null;
  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center gap-3">
        <CircleCheck size={18} className="shrink-0 text-ok" aria-hidden="true" />
        <span className="min-w-0 grow">
          <span className="line-clamp-2 text-[15px] leading-snug font-bold">{shortName(item.label)}</span>
          {item.quantity ? <span className="text-sm text-muted">{item.quantity}</span> : null}
        </span>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Voir le calcul : ${item.label}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent-text">
          Voir le calcul
        </button>
      </div>
      {habit ? (
        <p className="flex items-center gap-2 pl-7 text-sm">
          <span className="grow">Habituel de votre entreprise : {item.label}</span>
          {editable ? (
            <button type="button" onClick={() => void onAnswer(`product:${item.calculation!.slot}`, "")} className="inline-flex min-h-11 items-center font-bold text-accent-text">
              Modifier
            </button>
          ) : null}
        </p>
      ) : null}
      {open ? <Proof item={item} /> : null}
    </li>
  );
}

/** Tout ce qui est prêt, replié : l'artisan n'a pas à le contrôler ligne par ligne. */
export function ReadyList({ items, onAnswer, editable }: { items: TakeoffViewItem[]; onAnswer: DecisionHandlers["onAnswer"]; editable: boolean }) {
  const ready = items.filter((i) => i.state === "verified");
  if (ready.length === 0) return null;
  return (
    <details className="rounded-2xl bg-surface px-4 py-3 shadow-card">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-extrabold">
        <CircleCheck size={20} className="text-ok" aria-hidden="true" />
        {ready.length} élément{ready.length > 1 ? "s" : ""} prêt{ready.length > 1 ? "s" : ""}
      </summary>
      <ul className="mt-1 flex flex-col divide-y divide-line">
        {ready.map((i) => (
          <ReadyRow key={`${i.kind}:${i.id}`} item={i} onAnswer={onAnswer} editable={editable} />
        ))}
      </ul>
    </details>
  );
}

/** Ouvrages mesurés : une information, pas une décision. Ils partent au fournisseur pour leur mesure. */
/** « 349,85 m », « 2 pièces » : le besoin dans sa propre unité. */
const needUnit = (u: string) => (u === "u" ? "pièce(s)" : u === "m2" ? "m²" : u);
const frNumber = (v: string) => v.replace(".", ",");

export function MeasuresNote({ measures, items, ouvrages = [] }: { measures: NonNullable<TakeoffView["measures"]>; items: TakeoffViewItem[]; ouvrages?: TakeoffOuvrage[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <details className="rounded-2xl bg-surface px-4 py-3 shadow-card">
      <summary className="flex min-h-11 cursor-pointer items-start gap-2 text-[15px] font-bold">
        <HelpCircle size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        <span>{measures.text}</span>
      </summary>
      <ul className="mt-1 flex flex-col divide-y divide-line text-sm">
        {measures.lineIds.map((id) => {
          const item = items.find((i) => i.kind === "line" && i.id === id);
          if (!item) return null;
          return (
            <li key={id} className="flex flex-col gap-1 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 grow">
                  <span className="line-clamp-1 font-semibold">{shortName(item.label)}</span>
                  {/* Niveau 1 : la mesure de l'ouvrage, jamais présentée comme une quantité de matériau. */}
                  <span className="block text-muted">Lu dans le devis : {item.quantity ?? "?"}</span>
                  {(ouvrages.find((o) => o.lineId === id)?.needs ?? []).map((n) => (
                    <span key={n.slot} className="block text-muted">
                      Il faut : {n.label} —{" "}
                      {n.need ? `${frNumber(n.need.value)} ${needUnit(n.need.unit)}` : <span className="font-semibold text-warn">à calculer</span>}
                      {n.need && n.provisional ? <span className="font-semibold text-warn"> (provisoire, règle à valider)</span> : null}
                      {n.order ? ` · à chiffrer : ${n.order.count} ${Number(n.order.count) > 1 ? n.order.unit.many : n.order.unit.one}${n.provisional ? " (provisoire)" : ""}` : null}
                      {n.usual ? <span className="block text-xs">{n.usual}</span> : null}
                    </span>
                  ))}
                </span>
                <button type="button" onClick={() => setOpenId(openId === id ? null : id)} aria-expanded={openId === id} className="inline-flex min-h-11 shrink-0 items-center font-bold text-accent-text">
                  Voir le calcul
                </button>
              </div>
              {openId === id ? <Proof item={item} /> : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
