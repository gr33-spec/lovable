"use client";

import { AlertTriangle, Check, ChevronDown, CircleCheck, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { DecisionCard, Proof, type DecisionHandlers } from "@/components/takeoff-view";
import { Button, Card } from "@/components/ui";
import type { PurchaseAssumption, PurchaseItem, Takeoff } from "@/lib/api";
import { shortName } from "@/lib/labels";

/**
 * LA LISTE D'ACHATS : ce que l'artisan voit, et rien d'autre.
 *  - une phrase « J'ai compris » (les ouvrages du devis et leur mesure) ;
 *  - les questions, seulement si une réponse change la commande (boutons) ;
 *  - « À acheter » : un article, une quantité ;
 *  - « À faire chiffrer » : ce que le fournisseur chiffre pour la mesure du devis ;
 *  - « Hypothèses » : une ligne repliée, modifiable d'un geste ;
 *  - « Valider la liste ».
 */
export function PurchaseList({
  takeoff,
  editable,
  pending,
  handlers,
  onValidate,
  onShowLines,
}: {
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  onValidate: () => void;
  onShowLines: () => void;
}) {
  const p = takeoff.purchase;
  const questions = takeoff.view.decisions;
  const materials = takeoff.lines.filter((l) => l.kind !== "labor").length;
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-extrabold">Votre liste d&apos;achats</h2>
        {p.understood.length > 0 ? (
          <p className="text-[15px] text-muted">
            <span className="font-semibold">J&apos;ai compris :</span> {p.understood.join(" · ")}
          </p>
        ) : null}
      </div>

      {questions.map((d) => (
        <DecisionCard key={d.key} decision={d} lines={takeoff.lines} editable={editable} pending={pending} handlers={handlers} />
      ))}

      <Card className="flex flex-col px-4 py-2">
        <h3 className="flex min-h-11 items-center gap-2 text-[15px] font-extrabold">
          <CircleCheck size={20} className="text-ok" aria-hidden="true" />À acheter
        </h3>
        {p.toBuy.length === 0 ? (
          <p className="pb-3 text-sm text-muted">Rien à acheter pour l&apos;instant.</p>
        ) : (
          <ul aria-label="À acheter" className="flex flex-col divide-y divide-line">
            {p.toBuy.map((b) => (
              <BuyRow key={b.key} item={b} takeoff={takeoff} />
            ))}
          </ul>
        )}
      </Card>

      {p.toQuote.length > 0 ? (
        <Card className="flex flex-col px-4 py-2">
          <h3 className="flex min-h-11 items-center gap-2 text-[15px] font-extrabold">
            <Pencil size={18} className="text-muted" aria-hidden="true" />À faire chiffrer par le fournisseur
          </h3>
          <ul aria-label="À faire chiffrer par le fournisseur" className="flex flex-col divide-y divide-line">
            {p.toQuote.map((q) => (
              <li key={q.key} className="flex flex-col py-2.5">
                <span className="text-[15px] leading-snug font-bold">
                  {shortName(q.label)} <span className="font-normal text-muted">· {q.measure}</span>
                </span>
                <span className="text-sm text-muted">{q.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {p.assumptions.length > 0 ? <Assumptions assumptions={p.assumptions} editable={editable} pending={pending} onAnswer={handlers.onAnswer} /> : null}

      {editable && takeoff.status === "draft" ? (
        p.canValidate ? (
          <Card className="flex flex-col gap-3 p-5">
            <p className="flex items-center gap-2 text-[20px] font-extrabold">
              <CircleCheck size={24} className="text-ok" aria-hidden="true" />
              Votre liste est prête
            </p>
            <p className="text-[15px] text-muted">
              {p.toBuy.length} article{p.toBuy.length > 1 ? "s" : ""} à demander aux fournisseurs
              {p.toQuote.length > 0 ? `, ${p.toQuote.length} à faire chiffrer` : ""}.
            </p>
            <Button pending={pending} onClick={onValidate}>
              <Check size={18} aria-hidden="true" />
              Valider la liste
            </Button>
          </Card>
        ) : (
          <p className="flex items-center gap-2 text-[15px] font-semibold text-warn">
            <AlertTriangle size={18} aria-hidden="true" />
            Répondez aux questions ci-dessus pour valider la liste.
          </p>
        )
      ) : null}

      <button type="button" onClick={onShowLines} className="inline-flex min-h-11 items-center justify-center gap-1.5 self-center text-sm font-bold text-accent-text">
        Voir le devis lu ({materials} ligne{materials > 1 ? "s" : ""})
      </button>
    </>
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
function Assumptions({ assumptions, editable, pending, onAnswer }: { assumptions: PurchaseAssumption[]; editable: boolean; pending: boolean; onAnswer: DecisionHandlers["onAnswer"] }) {
  const [open, setOpen] = useState(false);
  const text = assumptions.map((a) => `${a.label.toLowerCase()} ${a.value}${a.unit && a.unit !== "u" ? ` ${a.unit}` : ""}`).join(" · ");
  return (
    <section aria-label="Hypothèses" className="rounded-2xl bg-surface px-4 py-3 shadow-card">
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
        <span className="font-bold">{a.label}</span> : {a.value}
        {unit ? ` ${unit}` : ""}
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
