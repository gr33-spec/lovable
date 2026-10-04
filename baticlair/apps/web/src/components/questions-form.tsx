"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { PurchaseAssumption, TakeoffDecision } from "@/lib/api";

/** Une réponse telle que la porte /v1/quantitatifs/{id}/reponses la reçoit. */
export interface FormAnswer {
  question: string;
  valeur: string | null;
  unite?: string;
}

interface Row {
  /** Clé envoyée à la porte (« engine:param:pente », « param:pente », « role:… »). */
  key: string;
  title: string;
  hint: string | null;
  unit: string | null;
  options: { label: string; value: string }[];
  /** Valeur déjà retenue par BatiClair (hypothèse par défaut) : cochée d'office, modifiable d'un tap. */
  preset: string | null;
  /** Une question sans réponse par défaut : il faut un tap (ou « Je ne sais pas »). */
  required: boolean;
}

const KEEP = "__garder__";
const SKIP = "__je_ne_sais_pas__";
const norm = (s: string) => s.replace(",", ".").replace(/\s/g, "").toLowerCase();

/** Les questions du calcul, puis les hypothèses par défaut : tout ce qui peut changer la commande, sur un seul écran. */
export function questionRows(decisions: readonly TakeoffDecision[], assumptions: readonly PurchaseAssumption[]): Row[] {
  const rows: Row[] = [];
  for (const d of decisions) {
    const q = d.question;
    if (!q || q.options.length === 0) continue;
    rows.push({ key: d.key, title: d.text, hint: q.hint, unit: q.unit, options: q.options.filter((o) => o.value !== ""), preset: null, required: true });
  }
  const asked = new Set(rows.map((r) => r.key.replace(/^engine:/, "")));
  for (const a of assumptions) {
    if (a.choices.length === 0 || asked.has(a.key)) continue;
    const match = a.choices.find((c) => norm(c.value) === norm(a.value) || norm(c.label) === norm(a.value) || norm(c.label).startsWith(norm(`${a.value}${a.unit === "u" ? "" : a.unit}`)));
    const unit = !a.unit || a.unit === "u" ? "" : a.unit === "°" ? "°" : ` ${a.unit.replace("m2", "m²")}`;
    const options = match ? a.choices : [{ label: `${a.value}${unit}`, value: KEEP }, ...a.choices];
    rows.push({ key: a.key, title: `${a.label} ?`, hint: a.note, unit: a.unit, options, preset: match ? match.value : KEEP, required: false });
  }
  return rows;
}

/**
 * TOUTES LES QUESTIONS D'UN COUP (retour du fondateur, 2026-10-04) : l'artisan enchaîne les réponses sans attendre
 * un recalcul à chaque tap, puis valide une fois. Les questions sans valeur par défaut viennent d'abord ; les
 * hypothèses suivent, déjà cochées : un doute = une question, mais une question déjà remplie ne coûte qu'un regard.
 */
export function QuestionsForm({
  decisions,
  assumptions,
  pending,
  disabled,
  onSubmit,
}: {
  decisions: readonly TakeoffDecision[];
  assumptions: readonly PurchaseAssumption[];
  pending: boolean;
  disabled: boolean;
  onSubmit: (answers: FormAnswer[]) => void;
}) {
  const rows = questionRows(decisions, assumptions);
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (rows.length === 0) return null;
  const value = (r: Row) => picked[r.key] ?? r.preset;
  const missing = rows.filter((r) => r.required && !value(r)).length;
  const required = rows.filter((r) => r.required).length;

  const submit = () => {
    const answers: FormAnswer[] = [];
    for (const r of rows) {
      const v = value(r);
      // Une valeur par défaut laissée telle quelle ne s'envoie pas : elle reste une hypothèse, pas une réponse.
      if (!v || v === KEEP || (!r.required && v === r.preset)) continue;
      answers.push(v === SKIP ? { question: r.key, valeur: null } : { question: r.key, valeur: v, ...(r.unit && r.unit !== "" ? { unite: r.unit } : {}) });
    }
    onSubmit(answers);
  };

  return (
    <section aria-label="Questions sur le chantier" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <p className="text-[20px] leading-tight font-extrabold">
          {required > 0 ? `${required} question${required > 1 ? "s" : ""} pour une commande exacte` : "Vérifiez mes valeurs"}
        </p>
        <p className="text-[15px] text-muted">Répondez à tout d&apos;un coup. Les cases déjà cochées sont mes valeurs par défaut : changez-les si besoin.</p>
      </div>
      {rows.map((r) => {
        const current = value(r);
        return (
          <fieldset key={r.key} className="flex flex-col gap-2 border-t border-line pt-4">
            <legend className="sr-only">{r.title}</legend>
            <p aria-hidden="true" className="text-[17px] leading-snug font-extrabold">
              {r.title}
            </p>
            {r.hint ? <p className="text-sm text-muted">{r.hint}</p> : null}
            <div className="flex flex-wrap gap-2" role="group" aria-label={r.title}>
              {r.options.map((o) => {
                const on = current === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled || pending}
                    onClick={() => setPicked((p) => ({ ...p, [r.key]: o.value }))}
                    className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl border-2 px-4 text-base font-extrabold ${on ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink"}`}
                  >
                    {on ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}
                    {o.label}
                  </button>
                );
              })}
              {r.required ? (
                <button
                  type="button"
                  aria-pressed={current === SKIP}
                  disabled={disabled || pending}
                  onClick={() => setPicked((p) => ({ ...p, [r.key]: SKIP }))}
                  className={`inline-flex min-h-12 items-center rounded-2xl px-3 text-sm font-bold ${current === SKIP ? "bg-ground text-ink underline" : "text-muted"}`}
                >
                  Je ne sais pas
                </button>
              ) : null}
            </div>
          </fieldset>
        );
      })}
      <Button pending={pending} disabled={disabled || missing > 0} onClick={submit}>
        {missing > 0 ? `Encore ${missing} réponse${missing > 1 ? "s" : ""}` : "Valider et calculer"}
      </Button>
    </section>
  );
}
