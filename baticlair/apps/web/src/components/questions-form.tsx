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

  const answered = required - missing;
  return (
    <section aria-label="Questions sur le chantier" className="flex flex-col rounded-[24px] bg-surface shadow-card">
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <p className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.01em]">
          {required > 0 ? `${required} question${required > 1 ? "s" : ""}, et c'est calculé` : "Vérifiez mes valeurs"}
        </p>
        <p className="text-[15px] leading-snug text-muted">Les cases bleues sont mes valeurs par défaut : touchez seulement ce qui est faux.</p>
        {required > 1 ? (
          <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-ground">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(answered / required) * 100}%` }} />
          </div>
        ) : null}
      </div>
      {rows.map((r, i) => {
        const current = value(r);
        const done = !!current;
        return (
          <fieldset key={r.key} className="flex flex-col gap-2.5 border-t border-line px-4 py-4">
            <legend className="sr-only">{r.title}</legend>
            <div aria-hidden="true" className="flex items-start gap-2.5">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${done ? "bg-accent text-white" : "bg-ground text-muted"}`}>
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <p className="text-[17px] leading-snug font-extrabold">{r.title}</p>
            </div>
            {r.hint ? <p className="pl-8.5 text-sm leading-snug text-muted">{r.hint}</p> : null}
            <div className="flex flex-wrap gap-2 pl-8.5" role="group" aria-label={r.title}>
              {r.options.map((o) => {
                const on = current === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled || pending}
                    onClick={() => setPicked((p) => ({ ...p, [r.key]: o.value }))}
                    className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-4 text-left text-[15px] leading-tight font-extrabold transition-colors active:scale-[0.97] ${on ? "bg-accent text-white shadow-[0_4px_12px_var(--color-accent-glow)]" : "bg-ground text-ink"}`}
                  >
                    {on ? <Check size={16} strokeWidth={3} aria-hidden="true" className="shrink-0" /> : null}
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
                  className={`inline-flex min-h-12 items-center rounded-2xl px-3 text-sm font-bold ${current === SKIP ? "bg-ink text-white" : "text-muted underline underline-offset-2"}`}
                >
                  Je ne sais pas
                </button>
              ) : null}
            </div>
          </fieldset>
        );
      })}
      {/* Le bouton reste sous le pouce pendant qu'on fait défiler les questions, juste au-dessus de la barre de message. */}
      <div className="sticky bottom-[84px] z-10 rounded-b-[24px] border-t border-line bg-surface px-4 pt-3 pb-4 lg:bottom-[92px]">
        <Button className="w-full" pending={pending} disabled={disabled || missing > 0} onClick={submit}>
          {missing > 0 ? `Encore ${missing} réponse${missing > 1 ? "s" : ""}` : "Valider et calculer"}
        </Button>
      </div>
    </section>
  );
}
