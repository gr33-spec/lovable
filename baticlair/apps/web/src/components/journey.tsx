"use client";

import { Bell, Check, Coffee, FileUp, Keyboard, Loader2, Mic, Pencil, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import type { ApiError, Takeoff } from "@/lib/api";
import { matchAnswers, type VoiceQuestion } from "@/lib/voice-answers";

/*
 * LE PARCOURS (§48, retour du fondateur, 2026-10-06) : zéro saisie, un écran par étape, un ton direct et cool.
 *  1. déposer le PDF (seule action) ;  2. l'analyse (nom du chantier lu dans le devis, renommable d'un tap) ;
 *  3. les questions de comptoir, toutes d'un coup, AVANT le calcul (texte ou voix) ;  4. le calcul (moteur + IA qui
 *  complète) ;  5. le résultat : « C'est bon » puis « À vérifier », et l'envoi au fournisseur.
 * L'IA peut se tromper, et elle le dit.
 */

// ——— L'animation : un devis qui devient une liste de matériaux ———

const SHEET_LINES = ["w-[82%]", "w-[64%]", "w-[74%]", "w-[56%]"];
const LIST_ROWS = ["Ardoises 32×22", "Crochets inox", "Liteaux 27×40", "Écran HPV"];
const CYCLE = 4.8;

/** Les lignes du devis s'effacent, les articles arrivent un à un dans la liste, cochés. Pas de photo : du vrai produit. */
export function DevisAnimation({ size = "lg" }: { size?: "lg" | "sm" }) {
  const sm = size === "sm";
  return (
    <div aria-hidden="true" className={`relative flex items-center justify-center gap-3 ${sm ? "h-28" : "h-40"}`}>
      <div className={`relative flex flex-col gap-2 rounded-xl bg-white p-3 shadow-[0_12px_30px_-12px_rgba(14,17,22,0.35)] ${sm ? "w-24" : "w-32"} rotate-[-4deg]`}>
        <span className="mb-0.5 h-2 w-10 rounded-full bg-[#1c3fd1]/70" />
        {SHEET_LINES.map((w, i) => (
          <span key={w} className={`h-1.5 rounded-full bg-[#c9ced8] ${w}`} style={{ animation: `bc-line-out ${CYCLE}s ease-in-out ${i * 0.45}s infinite both` }} />
        ))}
        <span className="mt-1 flex justify-end">
          <span className="h-1.5 w-8 rounded-full bg-[#0e1116]/60" />
        </span>
      </div>
      <Sparkles size={sm ? 18 : 22} className="shrink-0 text-[#ffb547]" style={{ animation: "bc-float 2.4s ease-in-out infinite" }} />
      <ul className={`flex flex-col gap-1.5 rounded-xl bg-white/95 p-2.5 shadow-[0_12px_30px_-12px_rgba(14,17,22,0.35)] ${sm ? "w-32" : "w-40"} rotate-[3deg]`}>
        {LIST_ROWS.map((r, i) => (
          <li key={r} className="flex items-center gap-1.5" style={{ animation: `bc-row-in ${CYCLE}s ease-out ${i * 0.45}s infinite both` }}>
            <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#0b7a53]" style={{ animation: `bc-check-pop ${CYCLE}s ease-out ${i * 0.45}s infinite both` }}>
              <Check size={9} strokeWidth={4} className="text-white" />
            </span>
            <span className={`truncate font-bold text-[#0e1116] ${sm ? "text-[9px]" : "text-[10.5px]"}`}>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ——— 1. Déposer le devis ———

/**
 * LA SEULE ACTION D'UN NOUVEAU CHANTIER : déposer le PDF. Une grande zone (toucher pour choisir, ou glisser le fichier
 * sur ordinateur), l'animation, une phrase. Le nom, l'adresse et le client viennent du devis.
 */
export function DropZone({ onFile, pending, error, title = "Dépose ton devis, je te sors le quantitatif." }: { onFile: (file: File) => void; pending: boolean; error: ApiError | null; title?: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (file: File | undefined) => {
    if (!file || pending) return;
    onFile(file);
    if (input.current) input.current.value = "";
  };
  return (
    <section aria-labelledby={`${id}-t`} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[28px] bg-hero px-5 pt-6 pb-5 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <DevisAnimation />
        <h1 id={`${id}-t`} className="mt-4 font-display text-[27px] leading-[1.08] font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-snug text-white/75">Un PDF, même scanné. Rien à taper : le nom du chantier, l&apos;adresse et les quantités viennent du devis.</p>
      </div>
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
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border-[2.5px] border-dashed px-6 py-6 text-center transition focus-within:ring-2 ${
          over ? "border-[#6b46ff] bg-[#efeaff]" : "border-[#b9b2ff] bg-surface"
        } ${pending ? "pointer-events-none opacity-80" : "active:scale-[0.99]"}`}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-cta text-white shadow-cta">
          {pending ? <Loader2 size={28} className="animate-spin" aria-hidden="true" /> : <FileUp size={28} aria-hidden="true" />}
        </span>
        <span className="font-display text-[20px] font-extrabold tracking-[-0.01em]">{pending ? "J'envoie ton devis…" : "Choisir le devis (PDF)"}</span>
        <span className="text-[14px] font-semibold text-muted">{pending ? "Quelques secondes." : "Touche ici, ou glisse le fichier."}</span>
      </label>
    </section>
  );
}

// ——— 2. L'analyse ———

const ANALYSIS_STEPS = ["J'ouvre ton devis.", "Je lis chaque ligne, même les petites.", "Je reconnais les ouvrages : couverture, zinguerie, gouttières…", "Je repère ce que le devis ne dit pas."];

/** Une feuille qu'un trait lumineux parcourt, et les étapes qui se cochent au fil de la lecture. */
export function AnalysisScreen({ fileName }: { fileName: string | null }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= ANALYSIS_STEPS.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 3500);
    return () => clearTimeout(t);
  }, [shown]);
  const long = useElapsed(10_000);
  return (
    <section aria-label="Analyse du devis" className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-5 rounded-[28px] bg-hero px-5 py-7 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <div aria-hidden="true" className="relative h-44 w-36 overflow-hidden rounded-2xl bg-white p-4 shadow-[0_20px_40px_-14px_rgba(0,0,0,0.55)]">
          <span className="block h-2.5 w-14 rounded-full bg-[#1c3fd1]/70" />
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="mt-2.5 block h-1.5 rounded-full bg-[#c9ced8]" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
          ))}
          <span className="absolute inset-x-0 top-3 h-6 bg-gradient-to-b from-transparent via-[#6b46ff]/45 to-transparent" style={{ animation: "bc-scan 2.6s ease-in-out infinite" }} />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.02em]">Je lis ton devis</h2>
          {fileName ? <p className="max-w-full truncate text-[13px] text-white/60">{fileName}</p> : null}
        </div>
      </div>
      <ol aria-live="polite" aria-label="Étapes de la lecture" className="flex flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-card">
        {ANALYSIS_STEPS.slice(0, shown).map((s, i) => (
          <li key={s} className="flex animate-[bc-step_.35s_ease-out_both] items-start gap-2.5 text-[15px] leading-snug">
            {i < shown - 1 ? (
              <Check size={20} strokeWidth={2.5} className="mt-px shrink-0 text-ok" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
              </span>
            )}
            <span className={i < shown - 1 ? "" : "text-muted"}>{s}</span>
          </li>
        ))}
      </ol>
      {long ? <WaitNote what="la lecture" /> : null}
    </section>
  );
}

/** Vrai après `ms` millisecondes passées sur l'écran. */
function useElapsed(ms: number): boolean {
  const [over, setOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOver(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return over;
}

// ——— Prévenir l'artisan quand c'est prêt ———

const noSubscription = () => () => {};
const notificationState = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

/** Une notification (le téléphone vibre, l'onglet change de titre) : seulement si l'artisan a regardé ailleurs. */
export function notifyReady(title: string, body: string): void {
  if (typeof document === "undefined") return;
  if (!document.hidden) return;
  document.title = `✓ ${title}`;
  const restore = () => {
    document.title = "BatiClair";
    document.removeEventListener("visibilitychange", restore);
  };
  document.addEventListener("visibilitychange", restore);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body, icon: "/icon.svg", data: { url: window.location.href } };
  // Sur téléphone, une notification passe par le service worker ; sur ordinateur, directement.
  const sw = "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration("/sw.js") : Promise.resolve(undefined);
  void sw
    .then((reg) => (reg ? reg.showNotification(title, options) : void new Notification(title, options)))
    .catch(() => undefined);
}

async function askNotifications(): Promise<void> {
  if (typeof Notification === "undefined") return;
  if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  if (Notification.permission === "default") await Notification.requestPermission();
}

/** Au-delà de 10 s : un mot pour patienter, et de quoi être prévenu. */
function WaitNote({ what }: { what: string }) {
  const permission = useSyncExternalStore(noSubscription, notificationState, () => "unsupported");
  const [asked, setAsked] = useState(false);
  return (
    <div role="status" className="flex items-start gap-3 rounded-[22px] bg-surface p-4 shadow-card">
      <span aria-hidden="true" className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1d6] text-[#8a5300]">
        <Coffee size={22} />
        <span className="absolute -top-1 left-[17px] h-2.5 w-0.5 rounded-full bg-[#8a5300]/60" style={{ animation: "bc-steam 1.8s ease-out infinite" }} />
        <span className="absolute -top-1 left-[23px] h-2.5 w-0.5 rounded-full bg-[#8a5300]/60" style={{ animation: "bc-steam 1.8s ease-out .6s infinite" }} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-2">
        <span className="text-[15px] leading-snug font-bold">Va boire un café, je te préviens quand c&apos;est prêt.</span>
        <span className="text-[13px] leading-snug text-muted">{what === "le calcul" ? "Je vérifie chaque fixation, chaque joint, chaque cartouche." : "Un gros devis, ou un scan : je prends le temps de tout lire."}</span>
        {permission === "default" && !asked ? (
          <button
            type="button"
            onClick={() => {
              setAsked(true);
              void askNotifications();
            }}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-xl bg-ground px-3 text-sm font-extrabold"
          >
            <Bell size={16} aria-hidden="true" />
            Me prévenir
          </button>
        ) : null}
      </span>
    </div>
  );
}

// ——— 4. Le calcul ———

const CALCUL_STEPS = ["Je calcule les quantités avec tes réponses.", "Je passe derrière, côté comptoir : fixations, scellements, étanchéité, consommables.", "Je mets en orange tout ce qui mérite ton œil."];

export function CalculScreen() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= CALCUL_STEPS.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 3500);
    return () => clearTimeout(t);
  }, [shown]);
  const long = useElapsed(10_000);
  return (
    <section aria-label="Calcul de la liste" className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-[28px] bg-hero px-5 py-7 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <DevisAnimation />
        <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.02em]">Je prépare ta liste</h2>
      </div>
      <ol aria-live="polite" aria-label="Étapes du calcul" className="flex flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-card">
        {CALCUL_STEPS.slice(0, shown).map((s, i) => (
          <li key={s} className="flex animate-[bc-step_.35s_ease-out_both] items-start gap-2.5 text-[15px] leading-snug">
            {i < shown - 1 ? (
              <Check size={20} strokeWidth={2.5} className="mt-px shrink-0 text-ok" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
              </span>
            )}
            <span className={i < shown - 1 ? "" : "text-muted"}>{s}</span>
          </li>
        ))}
      </ol>
      {long ? <WaitNote what="le calcul" /> : null}
    </section>
  );
}

// ——— 3. Les questions de comptoir ———

type QuestionKind = "decision" | "habit" | "ajout";

interface CounterQuestion extends VoiceQuestion {
  kind: QuestionKind;
  /** De quoi parle la question (la ligne du devis), en petit au-dessus. */
  about: string | null;
  hint: string | null;
  /** Une valeur à dire, en chiffres (« 35 » °), au lieu de boutons. */
  numeric: boolean;
  /** « Comme d'habitude » : la réponse habituelle de l'entreprise. */
  usual: string | null;
}

export interface CounterAnswers {
  reponses: { question: string; valeur: string; unite?: string }[];
  ajouts: { id: string; reponse: "oui" | "non" }[];
}

type Given = { value: string; label: string; via: "tap" | "voix" | "habitude" };

/** Les questions de comptoir d'un quantitatif lu : du calcul, des habitudes, et « On ajoute ? ». */
export function counterQuestions(takeoff: Takeoff): CounterQuestion[] {
  const fromDecisions: CounterQuestion[] = takeoff.view.decisions
    .filter((d) => d.question)
    .map((d) => {
      const q = d.question!;
      const engine = d.key.startsWith("engine:") || q.key.startsWith("param:");
      return {
        key: d.key,
        kind: "decision",
        text: engine ? d.text.replace(/ Cela change la commande :.*$/, "") : d.text,
        options: q.options,
        unit: q.unit,
        about: engine ? null : d.title,
        hint: q.hint,
        numeric: q.kind === "param" && q.options.length === 0,
        usual: null,
      };
    });
  const habits: CounterQuestion[] = (takeoff.habits ?? []).map((h) => ({
    key: h.key,
    kind: "habit",
    text: h.question,
    options: h.options,
    unit: h.unit,
    about: null,
    hint: null,
    numeric: false,
    usual: h.value,
  }));
  const ajouts: CounterQuestion[] = takeoff.purchase.suggestions.map((s) => ({
    key: `ajout:${s.key}`,
    kind: "ajout",
    text: `On ajoute : ${s.label}${s.quantity ? ` (${s.quantity})` : ""} ?`,
    options: [
      { label: "Oui", value: "oui" },
      { label: "Non", value: "non" },
    ],
    unit: null,
    about: null,
    hint: null,
    numeric: false,
    usual: null,
  }));
  return [...fromDecisions, ...habits, ...ajouts];
}

/** Ce qui part au calcul : les réponses données ; une question laissée sans réponse ne part pas (sa ligne sera orange). */
export function counterAnswers(questions: readonly CounterQuestion[], given: Readonly<Record<string, Given>>): CounterAnswers {
  const out: CounterAnswers = { reponses: [], ajouts: [] };
  for (const q of questions) {
    const g = given[q.key];
    if (!g) continue;
    if (q.kind === "ajout") out.ajouts.push({ id: q.key.slice("ajout:".length), reponse: g.value === "oui" ? "oui" : "non" });
    else if (q.numeric || q.kind === "habit") out.reponses.push({ question: q.key, valeur: g.value, unite: q.unit ?? "u" });
    else out.reponses.push({ question: q.key, valeur: g.value });
  }
  return out;
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * TOUTES LES QUESTIONS D'UN COUP, AVANT LE CALCUL, seulement sur ce que le devis ne dit pas. Trois façons de répondre :
 * toucher une réponse, l'écrire en bas, ou la dire au micro (chaque morceau dit est relié à sa question, cochée). Une
 * question sans réponse ne bloque rien : sa ligne sortira orange. Jamais de deuxième vague après le calcul.
 */
export function QuestionsScreen({ takeoff, pending, error, onSubmit }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void }) {
  const questions = useMemo(() => counterQuestions(takeoff), [takeoff]);
  const [given, setGiven] = useState<Record<string, Given>>(() => {
    // « Comme d'habitude » : la réponse habituelle est déjà cochée, un tap la change.
    const start: Record<string, Given> = {};
    for (const q of questions) {
      if (q.kind !== "habit" || q.usual === null) continue;
      const o = q.options.find((x) => x.value === q.usual);
      if (o) start[q.key] = { value: o.value, label: o.label, via: "habitude" };
    }
    return start;
  });
  const [heard, setHeard] = useState<{ text: string; matched: number } | null>(null);
  const answered = questions.filter((q) => given[q.key]).length;
  const set = (key: string, g: Given | null) =>
    setGiven((prev) => {
      const next = { ...prev };
      if (g) next[key] = g;
      else delete next[key];
      return next;
    });
  const understand = (text: string) => {
    const matches = matchAnswers(text, questions);
    setGiven((prev) => ({ ...prev, ...Object.fromEntries(matches.map((m) => [m.key, { value: m.value, label: m.label, via: "voix" as const }])) }));
    setHeard({ text, matched: matches.length });
  };

  return (
    <section aria-labelledby="questions-titre" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 rounded-[24px] bg-hero px-5 py-5 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <h2 id="questions-titre" className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
          J&apos;ai quelques questions pour éviter les allers-retours avec ton fournisseur.
        </h2>
        <p className="text-[14px] leading-snug text-white/75">Touche, écris ou dis tes réponses d&apos;un trait. Pas de réponse ? La ligne sortira en orange, on la verra ensemble.</p>
        <p aria-live="polite" className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-white/12 px-3 py-1 text-[13px] font-extrabold">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          {answered} sur {questions.length} renseignée{answered > 1 ? "s" : ""}
        </p>
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      <ol aria-label="Questions de comptoir" className="flex flex-col gap-2.5">
        {questions.map((q, i) => (
          <QuestionCard key={q.key} index={i + 1} question={q} given={given[q.key] ?? null} onChange={(g) => set(q.key, g)} />
        ))}
      </ol>
      {heard ? (
        <p role="status" className="rounded-2xl bg-surface px-4 py-3 text-[14px] leading-snug shadow-card">
          <span className="font-bold">J&apos;ai entendu : </span>« {heard.text} »
          <span className={`mt-1 block font-bold ${heard.matched > 0 ? "text-ok" : "text-warn"}`}>
            {heard.matched > 0 ? `${heard.matched} réponse${heard.matched > 1 ? "s" : ""} cochée${heard.matched > 1 ? "s" : ""}.` : "Je n'ai relié aucune réponse : dis le sujet avec la réponse (« zinc 0,65 », « pente 35 degrés »)."}
          </span>
        </p>
      ) : null}
      <div className="h-44 lg:hidden" aria-hidden="true" />
      <AnswerDock
        pending={pending}
        onText={understand}
        onSubmit={() => onSubmit(counterAnswers(questions, given))}
        submitLabel={answered < questions.length ? `Calculer ma liste (${questions.length - answered} en orange)` : "Calculer ma liste"}
      />
    </section>
  );
}

function QuestionCard({ index, question: q, given, onChange }: { index: number; question: CounterQuestion; given: Given | null; onChange: (g: Given | null) => void }) {
  const id = useId();
  const [value, setValue] = useState(given?.value ?? "");
  const unitLabel = q.unit && q.unit !== "u" ? (q.unit === "m2" ? "m²" : q.unit) : "";
  return (
    <li className={`flex flex-col gap-2.5 rounded-[20px] p-4 shadow-card transition ${given ? "bg-surface ring-2 ring-ok/50" : "bg-surface"}`}>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${given ? "bg-ok text-white" : "bg-ground text-muted"}`}
        >
          {given ? <Check size={16} strokeWidth={3} /> : index}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          {q.kind === "habit" ? <span className="text-[12px] font-extrabold tracking-[0.04em] text-[#6b46ff] uppercase">Comme d&apos;habitude ?</span> : null}
          {q.about ? <span className="line-clamp-1 text-[13px] font-bold text-muted">{q.about}</span> : null}
          <span id={`${id}-q`} className="text-[16px] leading-snug font-extrabold">
            {q.text}
          </span>
          {q.hint ? <span className="text-[13px] leading-snug text-muted">{q.hint}</span> : null}
          {given?.via === "voix" ? <span className="text-[12px] font-bold text-ok">Réponse entendue : {given.label}</span> : null}
        </span>
      </div>
      {q.numeric ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = value.trim().replace(",", ".");
            if (/^\d+(?:\.\d+)?$/.test(v)) onChange({ value: v, label: `${v.replace(".", ",")}${unitLabel ? ` ${unitLabel}` : ""}`, via: "tap" });
          }}
        >
          <span className="flex min-h-12 grow items-center gap-2 rounded-2xl border-2 border-line bg-ground px-3 focus-within:border-accent">
            <input
              aria-labelledby={`${id}-q`}
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
              className="min-h-11 w-full bg-transparent text-[18px] font-extrabold outline-none"
            />
            {unitLabel ? <span className="text-base font-bold text-muted">{unitLabel}</span> : null}
          </span>
          <button type="submit" className="inline-flex min-h-12 items-center rounded-2xl bg-ink px-4 text-sm font-extrabold text-white">
            OK
          </button>
        </form>
      ) : (
        <div role="group" aria-labelledby={`${id}-q`} className={`grid gap-2 ${q.options.length <= 2 || q.options.every((o) => o.label.length <= 14) ? "grid-cols-2" : "grid-cols-1"}`}>
          {q.options.map((o) => {
            const on = given?.value === o.value;
            return (
              <button
                key={o.value || "aucun"}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? null : { value: o.value, label: o.label, via: "tap" })}
                className={`inline-flex min-h-12 items-center justify-center rounded-2xl border-2 px-3 text-center text-[15px] leading-tight font-extrabold transition active:scale-[0.98] ${
                  on ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}

/**
 * Le bas de l'écran : le MICRO bien visible, le champ pour écrire, et « Calculer ma liste ». Sans dictée dans le
 * navigateur, le micro ouvre le champ (la dictée du clavier du téléphone fait le reste).
 */
function AnswerDock({ pending, onText, onSubmit, submitLabel }: { pending: boolean; onText: (text: string) => void; onSubmit: () => void; submitLabel: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [typing, setTyping] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const canDictate = useSyncExternalStore(noSubscription, () => speechRecognition() !== null, () => false);
  const recognition = useRef<Recognition | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const said = useRef("");

  function dictate() {
    setMicError(null);
    const Ctor = speechRecognition();
    if (!Ctor) {
      setTyping(true);
      setTimeout(() => field.current?.focus(), 0);
      return;
    }
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = "fr-FR";
    r.interimResults = false;
    r.continuous = true;
    said.current = "";
    r.onresult = (e) => {
      said.current = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? "")
        .join(". ");
    };
    r.onerror = (e) => setMicError(e.error === "not-allowed" ? "Le micro est bloqué : autorise-le dans les réglages du navigateur, ou écris ta réponse." : "Je n'ai pas bien entendu. Réessaie, ou écris ta réponse.");
    r.onend = () => {
      setListening(false);
      if (said.current.trim()) onText(said.current.trim());
    };
    recognition.current = r;
    setListening(true);
    r.start();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ground from-70% to-transparent px-4 pt-6 pb-[max(14px,env(safe-area-inset-bottom))] lg:sticky lg:inset-auto lg:px-0">
      <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
        {micError ? (
          <p role="alert" className="rounded-xl bg-warn-bg px-3 py-2 text-[13px] font-bold text-warn">
            {micError}
          </p>
        ) : null}
        {listening ? (
          <p role="status" className="text-center text-[14px] font-extrabold text-[#c42a63]">
            Je t&apos;écoute… dis tes réponses, puis touche le micro.
          </p>
        ) : null}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={dictate}
            disabled={pending}
            aria-label={listening ? "Arrêter et comprendre" : "Répondre à la voix"}
            aria-pressed={listening}
            className={`flex size-16 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-60 ${listening ? "bg-[#ff3d8b]" : "bg-cta shadow-cta"}`}
            style={listening ? { animation: "bc-ring 1.2s ease-out infinite" } : undefined}
          >
            <Mic size={28} aria-hidden="true" />
          </button>
          {typing || !canDictate || text ? (
            <form
              className="flex min-w-0 grow items-center gap-1.5 rounded-[22px] bg-surface p-1.5 shadow-float"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                onText(text.trim());
                setText("");
              }}
            >
              <label htmlFor={id} className="sr-only">
                Écrire mes réponses
              </label>
              <input
                ref={field}
                id={id}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="« je façonne, zinc 0,65, pente 35° »"
                autoComplete="off"
                enterKeyHint="send"
                className="min-h-11 min-w-0 grow rounded-2xl bg-ground px-3 text-[15px] outline-none placeholder:text-subtle"
              />
              <button type="submit" disabled={!text.trim()} aria-label="Envoyer ma réponse" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40">
                <SendHorizontal size={18} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTyping(true);
                setTimeout(() => field.current?.focus(), 0);
              }}
              className="inline-flex min-h-14 min-w-0 grow items-center gap-2 rounded-[22px] bg-surface px-4 text-left text-[15px] font-bold text-muted shadow-float"
            >
              <Keyboard size={18} aria-hidden="true" className="shrink-0" />
              <span className="truncate">Écrire mes réponses</span>
            </button>
          )}
        </div>
        <Button className="w-full" pending={pending} onClick={onSubmit}>
          <Sparkles size={18} aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </div>
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
        <Pencil size={15} aria-hidden="true" className="shrink-0 text-subtle" />
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
    onSubmit({ reponses: [], ajouts: [] });
  }, [none, onSubmit]);
  if (none) return error ? <ErrorNotice error={error} /> : <CalculScreen />;
  return <QuestionsScreen takeoff={takeoff} pending={pending} error={error} onSubmit={onSubmit} />;
}
