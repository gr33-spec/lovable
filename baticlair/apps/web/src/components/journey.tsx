"use client";

import { Check, ChevronLeft, FileUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ListScene, ReadingStage } from "@/components/chantier-scenes";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import type { ApiError, Takeoff } from "@/lib/api";
import { useTyping } from "@/lib/typing";

/*
 * §50 « Ce que voit l'artisan » (fondateur, 2026-10-09) : TROIS ÉCRANS, rien d'autre.
 *  1. je dépose mon devis : un bouton ; pendant la lecture, « Je lis ton devis » ; en cas d'échec, la raison et « Réessayer » ;
 *  2. les questions : une par carte, en boutons, groupées par ouvrage, puis « Calculer ma liste » ;
 *  3. ma liste (supply-list.tsx).
 */

// ——— 1. Déposer le devis ———

/**
 * LA SEULE ACTION D'UN NOUVEAU CHANTIER : déposer le PDF. Une grande zone (toucher pour choisir, ou glisser le fichier
 * sur ordinateur), l'animation, une phrase. Le nom, l'adresse et le client viennent du devis.
 */
export function DropZone({ onFile, pending, error }: { onFile: (file: File) => void; pending: boolean; error: ApiError | null }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (file: File | undefined) => {
    if (!file || pending) return;
    onFile(file);
    if (input.current) input.current.value = "";
  };
  // §50.1 : un bouton, « Déposer mon devis » (toucher pour choisir, ou glisser le fichier sur ordinateur). Rien d'autre.
  return (
    <section aria-label="Dépôt du devis" className="flex flex-col gap-4">
      {error ? <ErrorNotice error={error} /> : null}
      <input ref={input} id={id} type="file" accept="application/pdf,.pdf" className="sr-only" disabled={pending} onChange={(e) => take(e.target.files?.[0])} />
      <label
        htmlFor={id}
        aria-disabled={pending}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-[2.5px] border-dashed px-6 py-6 text-center transition focus-within:ring-2 ${
          over ? "border-accent bg-accent/5" : "border-accent/30 bg-surface"
        } ${pending ? "pointer-events-none opacity-80" : "active:scale-[0.99]"}`}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-cta text-white shadow-card">
          {pending ? <Loader2 size={28} className="animate-spin" aria-hidden="true" /> : <FileUp size={28} aria-hidden="true" />}
        </span>
        <span className="font-display text-[20px] font-extrabold tracking-[-0.01em]">Déposer mon devis</span>
      </label>
    </section>
  );
}

// ——— 2. L'analyse ———

/**
 * §50.1 : pendant la lecture, une seule phrase : « Je lis ton devis ». Retour du fondateur (2026-10-11) : « une animation
 * plus fun qui prend tout l'écran » : le devis en grand, lu au surligneur et balayé par le scanner, d'où sortent les
 * fournitures (`ReadingStage`). Plein écran, par-dessus le menu ; « Revenir à mes chantiers » laisse la lecture continuer
 * (le serveur prévient quand c'est prêt), on n'y reste jamais coincé.
 */
export function AnalysisScreen() {
  const router = useRouter();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <section aria-label="Analyse du devis" className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-chantier text-white">
      <div className="flex shrink-0 px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.push("/chantiers")}
          aria-label="Revenir à mes chantiers"
          className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-0 grow flex-col items-center justify-center gap-6 pb-[max(28px,env(safe-area-inset-bottom))]">
        <div className="origin-center scale-[0.92] min-[400px]:scale-100 sm:scale-[1.15]">
          <ReadingStage />
        </div>
        <h2 aria-live="polite" className="font-display text-[30px] leading-tight font-extrabold tracking-[-0.02em]">
          Je lis ton devis
        </h2>
      </div>
    </section>
  );
}

// ——— Prévenir l'artisan quand c'est prêt ———


/**
 * Quand l'artisan a regardé ailleurs, l'onglet change de titre et, si la page tourne encore, elle montre la
 * notification elle-même. Le SERVEUR envoie la même (Web Push, même étiquette : une seule s'affiche) : c'est elle qui
 * arrive téléphone verrouillé ou application fermée.
 */
export function notifyReady(title: string, body: string, tag: string): void {
  if (typeof document === "undefined") return;
  if (!document.hidden) return;
  document.title = `✓ ${title}`;
  const restore = () => {
    document.title = "BatiClair";
    document.removeEventListener("visibilitychange", restore);
  };
  document.addEventListener("visibilitychange", restore);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body, tag, icon: "/icon.svg", data: { url: window.location.href } };
  // Sur téléphone, une notification passe par le service worker ; sur ordinateur, directement.
  const sw = "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration("/sw.js") : Promise.resolve(undefined);
  void sw
    .then((reg) => (reg ? reg.showNotification(title, options) : void new Notification(title, options)))
    .catch(() => undefined);
}

// ——— 4. Le calcul ———

/** Après « Calculer ma liste » : une seule phrase, le temps du calcul ; les lignes du devis se posent une à une dans la liste (`ListScene`), pour tous les métiers. */
export function CalculScreen() {
  return (
    <section aria-label="Calcul de la liste" className="flex flex-col items-center gap-5 rounded-[20px] bg-chantier px-5 pt-8 pb-8 text-white shadow-card">
      <ListScene />
      <h2 aria-live="polite" className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
        Je prépare ta liste
      </h2>
    </section>
  );
}

// ——— 3. Les questions de comptoir ———

/**
 * §48.2 / §48.4 : TOUT ce qui manque pour calculer se demande ICI, en une fois, AU BOUTON (ni texte ni micro sur cet
 * écran). Après la sortie de la liste, plus aucune question : ce qui reste sans réponse est clos au calcul et la ligne
 * sort orange. Cinq familles :
 *  - « ce que le devis ne dit pas » : les questions du calcul (format, développé, façonnage pièce par pièce…) ;
 *  - « comme d'habitude ? » : les habitudes établies de l'entreprise ;
 *  - « je pars sur… » : les hypothèses du calcul (rampant, pente, liteaux…), la valeur prise par défaut est marquée ;
 *  - « déjà sur place ? » : liteaux, écran, voliges d'un ouvrage en dépose / repose ;
 *  - « consommables de pose » : UNE question (§49.1.4), seuls ceux des lignes écrites entrent dans la liste.
 */
type QuestionKind = "decision" | "habit" | "assumption" | "onsite" | "ajout";

interface CounterQuestion {
  key: string;
  kind: QuestionKind;
  text: string;
  options: { label: string; value: string }[];
  unit: string | null;
  /** De quoi parle la question (la ligne du devis), en petit au-dessus. */
  about: string | null;
  hint: string | null;
  /** Une valeur sans boutons proposés : elle se règle au plus / moins (jamais au clavier). */
  numeric: boolean;
  /** §50.2 : l'ouvrage sous lequel la carte se range (« Gouttière zinc », « Couverture zinc à joint debout »). */
  group: string;
  /**
   * Retour du fondateur (2026-10-10) : « quand l'application ne sait pas, elle demande et laisse de quoi écrire ». Une valeur
   * (pente, entraxe, développé) ou un modèle (tuile) qui n'est pas dans les boutons s'écrit sous « Autre ».
   */
  free?: "number" | "text" | "written";
  /** La valeur prise sans réponse (hypothèse dite, habitude) : marquée sur son bouton. */
  usual: string | null;
}

export interface CounterAnswers {
  /** `valeur: null` : la question retirée par l'artisan (la poubelle), partie sans réponse. */
  reponses: { question: string; valeur: string | null; unite?: string }[];
  ajouts: { id: string; reponse: "oui" | "non" }[];
  retraits?: string[];
}

type Given = { value: string; label: string; custom?: boolean };

/** Ce qui s'écrit sous « Autre » : un modèle (produit, question du comptoir), ou une valeur qui a son unité. */
function freeOf(key: string, kind: string | null, unit: string | null, options: readonly { value: string }[], named = false): CounterQuestion["free"] {
  // Un modèle, ou une qualité qui se nomme (l'ardoise, l'aspect du zinc, une teinte) : les boutons ne sont que les plus courants.
  // §51.2 : une donnée qu'une relecture a ouverte se répond en écrivant.
  if (key.startsWith("fiche:")) return "written";
  if (named || /^(?:engine:)?product:/.test(key) || kind === "choose_product" || kind === "confirm_product" || key.startsWith("comptoir:")) return "text";
  // Une valeur chiffrée à boutons (« 30° · 35° · 45° ») : toute autre valeur s'écrit, dans son unité.
  if (unit && unit !== "u" && options.length > 0 && options.every((o) => /^\d+(?:[.,]\d+)?$/.test(o.value))) return "number";
  // §51.2 et §51.4 : un choix du calcul (le façonnage) a aussi « Autre » ; ce qui s'y écrit est relu par l'IA, qui met la
  // fiche à jour. Pas pour oui / non (consommables).
  // Temps deux (directive du fondateur, 2026-10-12) : « Autre » PARTOUT où il y a des boutons, consommables compris.
  if (/^(?:engine:)?(?:param|fiche):/.test(key) && options.length > 0) return "written";
  if (options.length > 0) return "text";
  return undefined;
}

/** La question consommables du moteur (§49.1 point 4). */
const CONSUMABLES_KEY = "param:consommables";

const ONSITE = /\b(liteaux?|contre-?liteaux?|[ée]cran|pare-?pluie|hpv|voliges?|voligeage)\b/i;
const REWORK = /\b(d[ée]pose|repose|r[ée]fection|r[ée]novation|reprise)\b/i;

/** Les questions de comptoir d'un quantitatif lu, rangées par famille. */
export function counterQuestions(takeoff: Takeoff): CounterQuestion[] {
  const groupOf = ouvrageOf(takeoff);
  const decisions: CounterQuestion[] = takeoff.view.decisions
    .filter((d) => d.question)
    .map((d) => {
      const q = d.question!;
      const engine = d.key.startsWith("engine:") || q.key.startsWith("param:");
      return {
        key: d.key,
        // §49.4 : la question consommables (oui / non) a son bloc, « Consommables de pose ».
        kind: q.key === CONSUMABLES_KEY ? "ajout" : "decision",
        text: engine ? d.text.replace(/ Cela change la commande :.*$/, "") : d.text,
        options: q.options,
        unit: q.unit,
        about: engine ? null : d.title,
        hint: q.hint,
        numeric: q.kind === "param" && q.options.length === 0,
        usual: null,
        ...(freeOf(q.key, q.kind, q.unit, q.options, q.named) ? { free: freeOf(q.key, q.kind, q.unit, q.options, q.named)! } : {}),
        group: q.key === CONSUMABLES_KEY ? CONSUMABLES_GROUP : groupOf({ key: q.key, lineIds: d.lineIds }),
      };
    });
  const asked = new Set(decisions.map((d) => d.key.replace(/^engine:/, "")));
  const habits: CounterQuestion[] = (takeoff.habits ?? []).map((h) => ({ key: h.key, kind: "habit", text: h.question, options: h.options, unit: h.unit, about: null, hint: null, numeric: false, usual: h.value, group: groupOf({ key: h.key, lineIds: [] }), ...(freeOf(h.key, null, h.unit, h.options) ? { free: freeOf(h.key, null, h.unit, h.options)! } : {}) }));
  for (const h of habits) asked.add(h.key);
  // Les hypothèses à boutons (param ou produit) : « je pars sur 5,5 m de rampant », la valeur prise est marquée.
  const assumptions: CounterQuestion[] = takeoff.purchase.assumptions
    .filter((a) => /^(param|product):/.test(a.key) && a.choices.length > 1 && !asked.has(a.key))
    .map((a) => {
      // La valeur dite (« 5,5 », « standard ») retrouvée parmi les boutons, quelle que soit sa graphie (§49.2.5 : elle part
      // comme confirmée au calcul).
      const plain = (t: string) => t.toLowerCase().replace(",", ".").trim();
      const said = plain(a.value);
      const usual = a.choices.find((c) => plain(c.label) === said || plain(c.value) === said || plain(c.label).startsWith(said) || plain(c.label).startsWith(`${said} `))?.value ?? null;
      const unit = a.key.startsWith("param:") ? a.unit : null;
      const free = freeOf(a.key, null, unit, a.choices, a.named);
      return { key: a.key, kind: "assumption", text: `${a.label} ?`, options: a.choices, unit, about: null, hint: a.note, numeric: false, usual, group: groupOf({ key: a.key, lineIds: [] }), ...(free ? { free } : {}) };
    });
  // §48.2 : en dépose / repose, ce qui sert de support est peut-être déjà sur place.
  const rework = takeoff.lines.some((l) => REWORK.test(l.designation));
  const onsite: CounterQuestion[] = rework
    ? takeoff.purchase.toBuy
        .filter((b) => ONSITE.test(b.label))
        .map((b) => ({
          key: `onsite:${b.key}`,
          kind: "onsite",
          text: `${b.label} : à fournir, ou déjà sur place ?`,
          options: [
            { label: "À fournir", value: "fournir" },
            { label: "Déjà sur place", value: "place" },
          ],
          unit: null,
          about: null,
          hint: b.quantity,
          numeric: false,
          usual: null,
          group: groupOf({ key: b.key, lineIds: b.lineIds, itemKey: b.key }),
        }))
    : [];
  const ajouts: CounterQuestion[] = takeoff.purchase.suggestions.map((s) => ({
    key: `ajout:${s.key}`,
    kind: "ajout",
    text: `${s.label}${s.quantity ? ` (${s.quantity})` : ""}`,
    options: [
      { label: "Oui", value: "oui" },
      { label: "Non", value: "non" },
    ],
    unit: null,
    about: null,
    hint: null,
    numeric: false,
    usual: null,
    group: CONSUMABLES_GROUP,
  }));
  return [...decisions, ...habits, ...assumptions, ...onsite, ...ajouts];
}

const CONSUMABLES_GROUP = "Consommables";
const SITE_GROUP = "Le chantier";

/**
 * §50.2 : l'ouvrage d'une question, lu dans la liste déjà calculée : la ligne du devis qu'elle concerne, sinon l'ouvrage
 * nommé dans sa clé (« param:faconnage@bandes-zinc »), sinon le chantier en entier (pente, zone).
 */
function ouvrageOf(takeoff: Takeoff) {
  const groups = takeoff.purchase.screen.groups;
  const byWork = (work: string) =>
    groups.find((g) => g.key === work) ?? groups.find((g) => g.key.startsWith(work) || work.startsWith(g.key)) ?? takeoff.purchase.groups.find((g) => g.key === work || work.startsWith(g.key));
  return ({ key, lineIds, itemKey }: { key: string; lineIds: readonly string[]; itemKey?: string }): string => {
    const byLine = lineIds.length > 0 ? groups.find((g) => g.rows.some((r) => r.lineIds.some((id) => lineIds.includes(id)))) : undefined;
    if (byLine) return byLine.label;
    const byItem = itemKey ? groups.find((g) => g.rows.some((r) => r.itemKey === itemKey)) : undefined;
    if (byItem) return byItem.label;
    const work = /@([^:@]+)$/.exec(key)?.[1];
    const found = work ? byWork(work) : undefined;
    if (found) return found.label;
    const param = /^(?:engine:)?param:([a-z0-9_]+)/.exec(key)?.[1];
    if (param) {
      // Une donnée d'un seul ouvrage de ce devis (« développé » de la gouttière) se range sous lui.
      const owners = groups.filter((g) => g.rows.some((r) => r.decisionKey?.includes(param)));
      if (owners.length === 1) return owners[0]!.label;
    }
    return SITE_GROUP;
  };
}

/**
 * Ce qui part au calcul : ce que l'artisan a touché, et les valeurs de « Je pars sur ces valeurs » qu'il a vues sans les
 * changer : il les CONFIRME en lançant le calcul (§49.2.5 : une ligne reste orange tant qu'un défaut non confirmé la porte).
 */
export function counterAnswers(questions: readonly CounterQuestion[], given: Readonly<Record<string, Given>>, retired: ReadonlySet<string> = new Set()): CounterAnswers {
  const out: Required<CounterAnswers> = { reponses: [], ajouts: [], retraits: [] };
  for (const q of questions) {
    // Retour du fondateur (2026-10-12) : une question retirée part sans réponse ; sa ligne reste orange, réglée dans la liste.
    if (retired.has(q.key)) {
      if (q.kind !== "ajout" && q.kind !== "onsite") out.reponses.push({ question: q.key, valeur: null });
      continue;
    }
    const g = given[q.key] ?? (q.kind === "assumption" && q.key.startsWith("param:") && q.usual !== null ? { value: q.usual, label: q.usual } : undefined);
    if (!g) continue;
    if (q.kind === "ajout" && !q.key.startsWith("ajout:")) out.reponses.push({ question: q.key, valeur: g.value, unite: q.unit || "u" });
    else if (q.kind === "ajout") out.ajouts.push({ id: q.key.slice("ajout:".length), reponse: g.value === "oui" ? "oui" : "non" });
    else if (q.kind === "onsite") {
      if (g.value === "place") out.retraits.push(q.key.slice("onsite:".length));
    } else if (q.unit !== null && (q.numeric || q.kind === "habit" || (q.kind === "assumption" && q.key.startsWith("param:")))) out.reponses.push({ question: q.key, valeur: g.value, unite: q.unit || "u" });
    else out.reponses.push({ question: q.key, valeur: g.value });
  }
  return out;
}

/** §49.4 : le façonnage d'une pièce de zinguerie écrite est obligatoire avant le calcul (même règle que l'API). */
const mandatory = (q: CounterQuestion) => /^(?:engine:)?param:faconnage(?:@|$)/.test(q.key);

/**
 * Retour du fondateur (2026-10-12) : « Il faut mettre le voyant rouge avec une phrase là où il y a le problème. » Un refus du
 * serveur nomme la réponse fautive (`reponses.N.valeur`) : la phrase va sur la carte de cette question.
 */
function cardErrors(error: ApiError | null, sent: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of error?.details ?? []) {
    const n = /^reponses\.(\d+)(?:\.|$)/.exec(d.path)?.[1];
    const key = n !== undefined ? sent[Number(n)] : undefined;
    if (!key || out.has(key)) continue;
    const max = /<=\s*(\d+)/.exec(d.message)?.[1];
    out.set(key, max ? `Réponse trop longue : ${max} caractères au plus.` : "Cette réponse ne passe pas : choisis un bouton ou réécris-la.");
  }
  return out;
}

export function QuestionsScreen({ takeoff, pending, error, onSubmit }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void }) {
  const questions = useMemo(() => counterQuestions(takeoff), [takeoff]);
  const typing = useTyping();
  const [given, setGiven] = useState<Record<string, Given>>(() => {
    // « Comme d'habitude » : la réponse habituelle est déjà cochée, un tap la change.
    const start: Record<string, Given> = {};
    for (const q of questions) {
      if (q.kind !== "habit" || q.usual === null) continue;
      const o = q.options.find((x) => x.value === q.usual);
      if (o) start[q.key] = { value: o.value, label: o.label };
    }
    return start;
  });
  const set = (key: string, g: Given | null) =>
    setGiven((prev) => {
      const next = { ...prev };
      if (g) next[key] = g;
      else delete next[key];
      return next;
    });
  const [retired, setRetired] = useState<ReadonlySet<string>>(() => new Set());
  const retire = (key: string, out: boolean) =>
    setRetired((prev) => {
      const next = new Set(prev);
      if (out) next.add(key);
      else next.delete(key);
      return next;
    });
  // Les clés des réponses parties, dans l'ordre : un refus du serveur (`reponses.N`) retrouve sa carte.
  const [sent, setSent] = useState<readonly string[]>([]);
  const errors = useMemo(() => cardErrors(error, sent), [error, sent]);
  const firstError = [...errors.keys()][0];
  useEffect(() => {
    if (firstError) document.getElementById(`question-${firstError}`)?.scrollIntoView?.({ block: "center" });
  }, [firstError, error]);
  const toForm = questions.filter((q) => mandatory(q) && !given[q.key]);
  const [nudge, setNudge] = useState(false);
  // §50.2 : groupées par ouvrage, dans l'ordre où l'ouvrage arrive ; le chantier et les consommables à la fin.
  const order = [...new Set(questions.map((q) => q.group))].sort((a, b) => Number(a === SITE_GROUP || a === CONSUMABLES_GROUP) - Number(b === SITE_GROUP || b === CONSUMABLES_GROUP) || Number(a === CONSUMABLES_GROUP) - Number(b === CONSUMABLES_GROUP));

  return (
    <section aria-label="Les questions" className="flex flex-col gap-3">
      {error && errors.size === 0 ? <ErrorNotice error={error} /> : null}
      {order.map((group) => (
        <section key={group} aria-label={group} className="flex flex-col gap-2.5">
          <h3 className="px-1 pt-2 font-display text-[17px] font-extrabold tracking-[-0.01em]">{group}</h3>
          <ol className="flex flex-col gap-2.5">
            {questions
              .filter((q) => q.group === group)
              .map((q) =>
                retired.has(q.key) ? (
                  <RetiredCard key={q.key} question={q} onRestore={() => retire(q.key, false)} />
                ) : (
                  <QuestionCard
                    key={q.key}
                    question={q}
                    given={given[q.key] ?? null}
                    flagged={nudge && toForm.some((x) => x.key === q.key)}
                    problem={errors.get(q.key) ?? null}
                    onChange={(g) => set(q.key, g)}
                    {...(mandatory(q) ? {} : { onRetire: () => retire(q.key, true) })}
                  />
                ),
              )}
          </ol>
        </section>
      ))}
      {/* Retour du fondateur (2026-10-12, capture iPhone) : le bouton restait accroché au milieu de l'écran une fois le clavier
          refermé (case « Autre »). Sur téléphone : `position: fixed; bottom: 0`, la zone du geste en marge intérieure, caché
          pendant la saisie (`useTyping`, qui fait aussi recalculer l'écran à Safari), et la place gardée sous la dernière carte. */}
      <div aria-hidden="true" className="h-(--calc-space) lg:hidden" />
      <div
        role="group"
        aria-label="Calculer ma liste"
        data-typing={typing || undefined}
        className={`${typing ? "max-lg:pointer-events-none max-lg:translate-y-full max-lg:opacity-0 " : ""}z-30 bg-gradient-to-t from-ground from-70% to-transparent pt-6 transition-[translate,opacity] duration-200 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:px-4.5 max-lg:pb-[max(14px,env(safe-area-inset-bottom))] lg:sticky lg:bottom-0 lg:pb-4`}
      >
        <div className="mx-auto max-w-2xl">
          <Button
            className="w-full shadow-card!"
            pending={pending}
            onClick={() => {
              // §48.6 : le façonnage de chaque pièce de zinc est obligatoire ; la première carte sans réponse se montre.
              if (toForm.length > 0) {
                setNudge(true);
                document.getElementById(`question-${toForm[0]!.key}`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
                return;
              }
              const answers = counterAnswers(questions, given, retired);
              setSent(answers.reponses.map((r) => r.question));
              onSubmit(answers);
            }}
          >
            Calculer ma liste
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Une question retirée : sa phrase en une ligne, et « Remettre ». */
function RetiredCard({ question: q, onRestore }: { question: CounterQuestion; onRestore: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3 shadow-card">
      <span className="min-w-0 grow text-[14px] leading-snug text-muted">
        Question retirée : <span className="font-bold">{q.text}</span>
      </span>
      <Button variant="secondary" className="shrink-0" onClick={onRestore}>
        Remettre
      </Button>
    </li>
  );
}

function QuestionCard({
  question: q,
  given,
  flagged,
  problem,
  onChange,
  onRetire,
}: {
  question: CounterQuestion;
  given: Given | null;
  flagged: boolean;
  /** La phrase d'un refus du serveur sur cette réponse : voyant rouge sur la carte. */
  problem: string | null;
  onChange: (g: Given | null) => void;
  /** La poubelle (absente sur une question obligatoire). */
  onRetire?: () => void;
}) {
  const id = useId();
  return (
    <li id={`question-${q.key}`} className={`flex scroll-mt-24 flex-col gap-2.5 rounded-[20px] bg-surface p-4 shadow-card transition ${problem ? "ring-2 ring-danger" : given ? "ring-2 ring-ok/50" : flagged ? "ring-2 ring-warn" : ""}`}>
      <div className="flex items-start gap-2">
        <span id={`${id}-q`} className="grow text-[16px] leading-snug font-extrabold">
          {q.text}
        </span>
        {onRetire ? (
          <button type="button" onClick={onRetire} aria-label="Retirer cette question" className="-mt-1.5 -mr-1.5 flex size-10 shrink-0 items-center justify-center rounded-full text-muted active:scale-95">
            <Trash2 size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {problem ? (
        <p role="alert" className="flex items-center gap-2 text-[14px] font-bold text-danger">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-danger" />
          {problem}
        </p>
      ) : null}
      {q.options.length === 0 ? (
        // Temps deux : une valeur se tape dans une case, avec son unité (« 60 cm ») ; une réponse sans boutons s'écrit.
        <OtherAnswer question={{ ...q, free: q.numeric || (q.unit && q.unit !== "u") ? "number" : (q.free ?? "written") }} given={given} onChange={onChange} startOpen />
      ) : (
        <div role="group" aria-labelledby={`${id}-q`} className={`grid gap-2 ${q.options.length <= 2 || q.options.every((o) => o.label.length <= 14) ? "grid-cols-2" : "grid-cols-1"}`}>
          {q.options.map((o) => {
            const on = given?.value === o.value && !given.custom;
            const usual = !given && q.usual === o.value;
            return (
              <button
                key={o.value || "aucun"}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? null : { value: o.value, label: o.label })}
                className={`inline-flex min-h-12 flex-col items-center justify-center rounded-2xl border-2 px-3 py-1.5 text-center text-[15px] leading-tight font-extrabold transition active:scale-[0.98] ${
                  on ? "border-accent bg-accent text-white" : usual ? "border-accent/50 bg-[#eef2ff] text-ink" : "border-line bg-surface text-ink"
                }`}
              >
                {o.label}
                {usual ? <span className="text-[11px] font-bold text-accent-text">par défaut</span> : null}
              </button>
            );
          })}
          {q.free ? <OtherAnswer question={q} given={given} onChange={onChange} /> : null}
        </div>
      )}
    </li>
  );
}

/**
 * « Autre » : quand la bonne réponse n'est pas dans les boutons, elle s'écrit (un modèle de tuile, une pente de 38°). Un
 * appui sur « Autre » ouvre la case ; « OK » la garde comme réponse.
 */
function OtherAnswer({ question: q, given, onChange, startOpen = false }: { question: CounterQuestion; given: Given | null; onChange: (g: Given | null) => void; startOpen?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(startOpen || Boolean(given?.custom));
  const [value, setValue] = useState(given?.custom ? given.value : "");
  const numeric = q.free === "number";
  const unitLabel = q.unit && q.unit !== "u" ? (q.unit === "m2" ? "m²" : q.unit) : "";
  const clean = value.trim().replace(",", ".");
  const valid = numeric ? /^\d+(?:\.\d+)?$/.test(clean) && Number(clean) > 0 : value.trim().length >= 2;
  const save = () => {
    if (!valid) return;
    const v = numeric ? clean : value.trim();
    onChange({ value: v, label: numeric ? `${v.replace(".", ",")}${unitLabel ? (unitLabel === "°" ? "°" : ` ${unitLabel}`) : ""}` : v, custom: true });
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface px-3 py-1.5 text-[15px] font-extrabold text-ink active:scale-[0.98]"
      >
        Autre
      </button>
    );
  }
  return (
    <form
      className="col-span-full flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {numeric ? `Autre valeur : ${q.text}` : `Autre : ${q.text}`}
      </label>
      <span className={`flex min-w-0 grow items-center gap-1 rounded-2xl border-2 bg-surface px-3 ${given?.custom ? "border-accent" : "border-line"} focus-within:border-accent`}>
        <input
          id={id}
          autoFocus
          inputMode={numeric ? "decimal" : "text"}
          maxLength={numeric ? 8 : q.free === "written" ? 300 : 100}
          placeholder={numeric ? "Ta valeur" : q.free === "written" ? "Écris ta réponse" : "Écris le modèle"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          className="min-h-12 w-full min-w-0 bg-transparent text-[16px] font-extrabold outline-none"
        />
        {numeric && unitLabel ? <span className="shrink-0 text-[14px] font-bold text-muted">{unitLabel}</span> : null}
      </span>
      <Button type="submit" className="shrink-0" disabled={!valid}>
        OK
      </Button>
    </form>
  );
}

// ——— Le nom du chantier, renommable d'un tap ———

export function EditableName({ name, onSave, className = "" }: { name: string; onSave: (name: string) => Promise<void>; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        aria-label={`Renommer le chantier : ${name}`}
        className={`group inline-flex min-w-0 items-center gap-1.5 text-left ${className}`}
      >
        <span className="truncate">{name}</span>
        <Pencil size={15} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
    );
  }
  return (
    <form
      className="flex min-w-0 grow items-center gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v || v === name) return setEditing(false);
        setSaving(true);
        try {
          await onSave(v);
          setEditing(false);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor="nom-chantier" className="sr-only">
        Nom du chantier
      </label>
      <input
        id="nom-chantier"
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="min-h-11 min-w-0 grow rounded-xl bg-surface px-3 font-display text-[19px] font-extrabold shadow-card outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <button type="submit" disabled={saving} aria-label="Enregistrer le nom" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-60">
        {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      </button>
    </form>
  );
}

/** L'étape des questions : sans aucune question à poser, le calcul part tout seul (rien à valider pour rien). */
export function QuestionsStep({ takeoff, pending, error, onSubmit }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void }) {
  const none = counterQuestions(takeoff).length === 0;
  const started = useRef(false);
  useEffect(() => {
    if (!none || started.current) return;
    started.current = true;
    onSubmit({ reponses: [], ajouts: [], retraits: [] });
  }, [none, onSubmit]);
  if (none) return error ? <ErrorNotice error={error} /> : <CalculScreen />;
  return <QuestionsScreen takeoff={takeoff} pending={pending} error={error} onSubmit={onSubmit} />;
}
