"use client";

import { AlertTriangle, ChevronDown, CircleCheck } from "lucide-react";
import { useId, useState } from "react";
import { Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button } from "@/components/ui";
import type { PurchaseAssumption, PurchaseItem, Takeoff } from "@/lib/api";
import { shortName } from "@/lib/labels";

/**
 * LA CARTE DU QUANTITATIF (chat, référentiel §21) : les articles à commander
 * rangés par ouvrage (« Couverture en ardoises · 200 m² »), ce que le
 * fournisseur chiffrera, une ligne d'hypothèses modifiable d'un geste, puis
 * « Envoyer au fournisseur ». Jamais de quantité demandée à l'artisan.
 */
export function QuantityCard({
  takeoff,
  editable,
  pending,
  onAnswer,
}: {
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  onAnswer: DecisionHandlers["onAnswer"];
}) {
  const p = takeoff.purchase;
  const byKey = new Map(p.toBuy.map((b) => [b.key, b]));
  const caption = "text-[13px] font-extrabold tracking-[0.04em] text-muted uppercase";
  return (
    <section aria-label="Quantitatif" className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card">
      <h2 className="px-4 pt-4 pb-1 font-display text-[22px] font-extrabold">À commander</h2>
      {p.toBuy.length === 0 ? <p className="px-4 pb-3 text-sm text-muted">Rien à commander pour l&apos;instant.</p> : null}
      {p.groups.map((g) => (
        <div key={g.key} className="flex flex-col border-b border-line px-4 py-2">
          <h3 className={`${caption} pt-1`}>
            {g.label}
            {g.measure ? ` · ${g.measure}` : ""}
          </h3>
          <ul aria-label={g.label} className="flex flex-col divide-y divide-line">
            {g.itemKeys.map((k) => {
              const item = byKey.get(k);
              return item ? <BuyRow key={k} item={item} takeoff={takeoff} /> : null;
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

/** Un article à acheter : nom, quantité, et le calcul à un appui. */
function BuyRow({ item, takeoff }: { item: PurchaseItem; takeoff: Takeoff }) {
  const [open, setOpen] = useState(false);
  const proofs = takeoff.view.items.filter((i) => (item.kind === "computed" ? i.kind === "need" && item.needIds.includes(i.id) : i.kind === "line" && item.lineIds.includes(i.id)));
  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center gap-3">
        {item.state === "to_confirm" ? (
          <AlertTriangle size={18} className="shrink-0 text-warn" aria-label="à confirmer" />
        ) : (
          <CircleCheck size={18} className="shrink-0 text-ok" aria-hidden="true" />
        )}
        <span className="min-w-0 grow">
          <span className="line-clamp-2 text-[15px] leading-snug font-bold">{item.kind === "direct" ? shortName(item.label) : item.label}</span>
          <span className="block text-sm">
            <span className="font-extrabold">{item.quantity ?? "quantité à préciser"}</span>
            {item.approx ? <span className="text-muted"> · {item.approx}</span> : null}
          </span>
        </span>
        {proofs.length > 0 ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Voir le calcul : ${item.label}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent-text">
            Voir le calcul
          </button>
        ) : null}
      </div>
      {open ? proofs.map((i) => <Proof key={`${i.kind}:${i.id}`} item={i} />) : null}
    </li>
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
