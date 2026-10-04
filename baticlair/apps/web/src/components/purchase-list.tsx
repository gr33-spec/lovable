"use client";

import { AlertTriangle, ChevronDown, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import { parseQuantity } from "@/lib/labels";
import type { PurchaseAssumption, PurchaseItem, Takeoff } from "@/lib/api";
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
}: {
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  onAnswer: DecisionHandlers["onAnswer"];
  onEditItem?: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
}) {
  const p = takeoff.purchase;
  const byKey = new Map(p.toBuy.map((b) => [b.key, b]));
  const caption = "text-sm font-bold text-muted";
  return (
    <section aria-label="Quantitatif" className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="font-display text-[24px] font-extrabold tracking-[-0.02em]">À commander</h2>
        {p.toBuy.length > 0 ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[13px] font-extrabold text-accent-text">
            {p.toBuy.length} article{p.toBuy.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      {p.toBuy.length === 0 ? <p className="px-4 pb-3 text-sm text-muted">Rien à commander pour l&apos;instant.</p> : null}
      {p.groups.map((g) => (
        <div key={g.key} className="flex flex-col border-t border-line px-4 pt-3 pb-1">
          <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-muted uppercase">
            {g.label}
            {g.measure ? ` · ${g.measure}` : ""}
          </h3>
          <ul aria-label={g.label} className="flex flex-col divide-y divide-line">
            {g.itemKeys.map((k) => {
              const item = byKey.get(k);
              return item ? <BuyRow key={k} item={item} takeoff={takeoff} editable={editable} pending={pending} onEdit={onEditItem} /> : null;
            })}
          </ul>
        </div>
      ))}
      {p.toQuote.length > 0 ? (
        <div className="flex flex-col gap-1 bg-warn-bg px-4 py-3">
          <h3 className={`${caption} text-warn`}>Le fournisseur chiffrera</h3>
          <ul aria-label="Le fournisseur chiffrera" className="flex flex-col gap-1">
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

/** Un article à acheter : nom, quantité, le calcul à un appui, et le crayon pour tout réécrire (§41.4). */
function BuyRow({
  item,
  takeoff,
  editable,
  pending,
  onEdit,
}: {
  item: PurchaseItem;
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  onEdit?: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
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
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-start gap-0.5">
        {proofs.length > 0 ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Voir le calcul : ${item.label}`} className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl text-left active:bg-ground/60">
            {row}
          </button>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-3">{row}</div>
        )}
        {edit ? (
          <button type="button" onClick={() => setEditing(!editing)} aria-label={`Modifier : ${item.label}`} aria-expanded={editing} className="-mr-2 inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-xl text-subtle active:text-accent-text">
            <Pencil size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {item.edited?.length ? <p className="text-[13px] text-muted">Réécrit par vous : {item.edited.map((e) => (e === "label" ? "le libellé" : "la quantité")).join(" et ")}.</p> : null}
      {editing && edit ? (
        <ItemForm
          item={item}
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

/** Le texte et la quantité d'une ligne, tels que l'artisan veut les voir partir chez le fournisseur. */
function ItemForm({ item, pending, onSave, onCancel }: { item: PurchaseItem; pending: boolean; onSave: (e: ItemEdit) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const parsed = item.quantity ? parseQuantity(item.quantity) : null;
  const [libelle, setLibelle] = useState(item.label);
  const [quantite, setQuantite] = useState(parsed?.quantity ?? "");
  const [unite, setUnite] = useState(parsed?.unit ?? "");
  const input = "min-h-12 w-full rounded-2xl bg-ground px-3 text-base";
  return (
    <form
      aria-label={`Modifier : ${item.label}`}
      className="flex flex-col gap-2 rounded-2xl bg-ground/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!libelle.trim()) return;
        void onSave({ libelle: libelle.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null });
      }}
    >
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

/** Les hypothèses par défaut, sur une ligne repliée ; chacune se change d'un appui. */
/** « 45° » collé, « 60 cm » espacé, « 3 » pour les pièces. */
function withUnit(value: string, unit: string): string {
  if (!unit || unit === "u") return value;
  return unit === "°" ? `${value}°` : `${value} ${unit}`;
}

function Assumptions({ assumptions, editable, pending, onAnswer }: { assumptions: PurchaseAssumption[]; editable: boolean; pending: boolean; onAnswer: DecisionHandlers["onAnswer"] }) {
  const [open, setOpen] = useState(false);
  const text = assumptions.map((a) => `${a.label.toLowerCase()} ${withUnit(a.value, a.unit)}`).join(" · ");
  return (
    <section aria-label="Hypothèses" className="px-4 py-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-start gap-2 text-left text-sm">
        <ChevronDown size={16} aria-hidden="true" className={`mt-1 shrink-0 ${open ? "rotate-180" : ""}`} />
        <span>
          <span className="font-extrabold">Hypothèses :</span> <span className="text-muted">{text}</span>
          {editable ? <span className="font-bold text-accent-text"> — modifier</span> : null}
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
