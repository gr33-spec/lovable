"use client";

import { Bell, Check, Coffee, FileUp, Loader2, Pencil, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import type { ApiError, Takeoff } from "@/lib/api";
import { askPush, ensurePush, pushSupport } from "@/lib/push";

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

/** Au-delà de 10 s : un mot pour patienter, et de quoi être prévenu (par le serveur, téléphone verrouillé compris). */
function WaitNote({ what }: { what: string }) {
  const permission = useSyncExternalStore(noSubscription, notificationState, () => "unsupported");
  const support = useSyncExternalStore(noSubscription, pushSupport, () => "unsupported" as const);
  const [state, setState] = useState<"idle" | "asking" | "on" | "off">("idle");
  // Déjà autorisé : l'appareil s'abonne sans rien demander.
  useEffect(() => {
    if (permission !== "granted") return;
    let live = true;
    void ensurePush().then((ok) => live && setState(ok ? "on" : "off"));
    return () => {
      live = false;
    };
  }, [permission]);
  const on = state === "on";
  return (
    <div role="status" className="flex items-start gap-3 rounded-[22px] bg-surface p-4 shadow-card">
      <span aria-hidden="true" className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1d6] text-[#8a5300]">
        <Coffee size={22} />
        <span className="absolute -top-1 left-[17px] h-2.5 w-0.5 rounded-full bg-[#8a5300]/60" style={{ animation: "bc-steam 1.8s ease-out infinite" }} />
        <span className="absolute -top-1 left-[23px] h-2.5 w-0.5 rounded-full bg-[#8a5300]/60" style={{ animation: "bc-steam 1.8s ease-out .6s infinite" }} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-2">
        <span className="text-[15px] leading-snug font-bold">{on ? "Va boire un café, je te préviens quand c'est prêt." : "Va boire un café, ça arrive."}</span>
        <span className="text-[13px] leading-snug text-muted">{what === "le calcul" ? "Je vérifie chaque fixation, chaque joint, chaque cartouche." : "Un gros devis, ou un scan : je prends le temps de tout lire."}</span>
        {on ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ok">
            <Check size={14} aria-hidden="true" />
            Notification activée : tu peux fermer l&apos;appli ou verrouiller le téléphone.
          </span>
        ) : support === "iphone-browser" ? (
          <span className="text-[13px] leading-snug text-muted">
            Pour être prévenu sur iPhone : touche <span className="font-bold">Partager</span> puis <span className="font-bold">Sur l&apos;écran d&apos;accueil</span>, et ouvre BatiClair depuis l&apos;icône. En attendant, garde cette page ouverte.
          </span>
        ) : permission === "denied" ? (
          <span className="text-[13px] leading-snug text-muted">Les notifications sont bloquées pour BatiClair : autorise-les dans les réglages du téléphone. En attendant, garde cette page ouverte.</span>
        ) : support === "ok" && permission === "default" ? (
          <button
            type="button"
            disabled={state === "asking"}
            onClick={() => {
              setState("asking");
              void askPush().then((ok) => setState(ok ? "on" : "off"));
            }}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-xl bg-ground px-3 text-sm font-extrabold disabled:opacity-60"
          >
            <Bell size={16} aria-hidden="true" />
            Me prévenir
          </button>
        ) : state === "off" || support === "unsupported" ? (
          <span className="text-[13px] leading-snug text-muted">Ce téléphone ne peut pas recevoir la notification : garde cette page ouverte.</span>
        ) : null}
      </span>
    </div>
  );
}

// ——— 4. Le calcul ———

const CALCUL_STEPS = ["Je calcule les quantités avec tes réponses.", "Je repasse ligne par ligne : rien que ce qui est écrit dans ton devis.", "Je mets en orange tout ce qui mérite ton œil."];

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
  /** La valeur prise sans réponse (hypothèse dite, habitude) : marquée sur son bouton. */
  usual: string | null;
}

export interface CounterAnswers {
  reponses: { question: string; valeur: string; unite?: string }[];
  ajouts: { id: string; reponse: "oui" | "non" }[];
  retraits?: string[];
}

type Given = { value: string; label: string };

const SECTIONS: { kind: QuestionKind; title: string; text: string | null }[] = [
  { kind: "decision", title: "Ce que le devis ne dit pas", text: null },
  { kind: "habit", title: "Comme d'habitude ?", text: "Ta réponse habituelle est déjà cochée : touche pour la changer sur ce chantier." },
  { kind: "assumption", title: "Je pars sur ces valeurs", text: "Marquées « par défaut » : touche une autre réponse si ton chantier est différent." },
  { kind: "onsite", title: "Dépose / repose : déjà sur place ?", text: "Ce qui est déjà sur le toit ne part pas dans la commande." },
  { kind: "ajout", title: "Consommables", text: "Seuls ceux qui servent aux lignes de ton devis entrent dans la liste." },
];

/** La question consommables du moteur (§49.1 point 4). */
const CONSUMABLES_KEY = "param:consommables";

const ONSITE = /\b(liteaux?|contre-?liteaux?|[ée]cran|pare-?pluie|hpv|voliges?|voligeage)\b/i;
const REWORK = /\b(d[ée]pose|repose|r[ée]fection|r[ée]novation|reprise)\b/i;

/** Les questions de comptoir d'un quantitatif lu, rangées par famille. */
export function counterQuestions(takeoff: Takeoff): CounterQuestion[] {
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
      };
    });
  const asked = new Set(decisions.map((d) => d.key.replace(/^engine:/, "")));
  const habits: CounterQuestion[] = (takeoff.habits ?? []).map((h) => ({ key: h.key, kind: "habit", text: h.question, options: h.options, unit: h.unit, about: null, hint: null, numeric: false, usual: h.value }));
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
      return { key: a.key, kind: "assumption", text: `${a.label} ?`, options: a.choices, unit: a.key.startsWith("param:") ? a.unit : null, about: null, hint: a.note, numeric: false, usual };
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
  }));
  return [...decisions, ...habits, ...assumptions, ...onsite, ...ajouts];
}

/**
 * Ce qui part au calcul : ce que l'artisan a touché, et les valeurs de « Je pars sur ces valeurs » qu'il a vues sans les
 * changer : il les CONFIRME en lançant le calcul (§49.2.5 : une ligne reste orange tant qu'un défaut non confirmé la porte).
 */
export function counterAnswers(questions: readonly CounterQuestion[], given: Readonly<Record<string, Given>>): CounterAnswers {
  const out: Required<CounterAnswers> = { reponses: [], ajouts: [], retraits: [] };
  for (const q of questions) {
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

/** Ce qui compte comme « sans réponse » : les questions du calcul et les « déjà sur place ? » (le reste a sa valeur dite). */
const needsAnswer = (q: CounterQuestion) => q.kind === "decision" || q.kind === "onsite";
/** §49.4 : le façonnage d'une pièce de zinguerie écrite est obligatoire avant le calcul (même règle que l'API). */
const mandatory = (q: CounterQuestion) => /^(?:engine:)?param:faconnage(?:@|$)/.test(q.key);

export function QuestionsScreen({ takeoff, pending, error, onSubmit }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void }) {
  const questions = useMemo(() => counterQuestions(takeoff), [takeoff]);
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
  const required = questions.filter(needsAnswer);
  const open = required.filter((q) => !given[q.key]).length;
  const toForm = questions.filter((q) => mandatory(q) && !given[q.key]).length;
  // Le numéro de chaque question, dans l'ordre des familles affichées.
  const numbers = new Map(SECTIONS.flatMap((sec) => questions.filter((q) => q.kind === sec.kind)).map((q, i) => [q.key, i + 1]));

  return (
    <section aria-labelledby="questions-titre" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 rounded-[24px] bg-hero px-5 py-5 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)]">
        <h2 id="questions-titre" className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
          J&apos;ai quelques questions pour éviter les allers-retours avec ton fournisseur.
        </h2>
        <p className="text-[14px] leading-snug text-white/75">Tout se règle ici, d&apos;un appui. Le façonnage est obligatoire ; après, plus de question : ce qui reste sans réponse sortira en orange dans la liste.</p>
        {required.length > 0 ? (
          <p aria-live="polite" className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-white/12 px-3 py-1 text-[13px] font-extrabold">
            <Check size={14} strokeWidth={3} aria-hidden="true" />
            {required.length - open} sur {required.length} renseignée{required.length - open > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      {SECTIONS.map((section) => {
        const list = questions.filter((q) => q.kind === section.kind);
        if (list.length === 0) return null;
        const ajouts = section.kind === "ajout";
        return (
          <section key={section.kind} aria-label={section.title} className="flex flex-col gap-2.5">
            <div className="flex items-end justify-between gap-3 px-1 pt-2">
              <span className="flex flex-col">
                <h3 className="font-display text-[17px] font-extrabold tracking-[-0.01em]">{section.title}</h3>
                {section.text ? <span className="text-[13px] leading-snug text-muted">{section.text}</span> : null}
              </span>
              {ajouts && list.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setGiven((prev) => ({ ...prev, ...Object.fromEntries(list.map((q) => [q.key, { value: "oui", label: "Oui" }])) }))}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-surface px-3 text-sm font-extrabold shadow-card"
                >
                  Tout oui
                </button>
              ) : null}
            </div>
            <ol className="flex flex-col gap-2.5">
              {list.map((q) => (
                <QuestionCard key={q.key} index={numbers.get(q.key) ?? 0} question={q} given={given[q.key] ?? null} onChange={(g) => set(q.key, g)} />
              ))}
            </ol>
          </section>
        );
      })}
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ground from-70% to-transparent px-4 pt-6 pb-[max(14px,env(safe-area-inset-bottom))] lg:sticky lg:inset-auto lg:px-0">
        <div className="mx-auto max-w-2xl">
          <Button className="w-full" pending={pending} disabled={toForm > 0} onClick={() => onSubmit(counterAnswers(questions, given))}>
            <Sparkles size={18} aria-hidden="true" />
            {toForm > 0 ? `Dis-moi d'abord si tu façonnes (${toForm})` : open > 0 ? `Calculer ma liste (${open} sans réponse)` : "Calculer ma liste"}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Le pas du plus / moins d'une valeur à régler (jamais au clavier). */
const stepOf = (unit: string | null) => (unit === "°" ? 5 : unit === "mm" ? 10 : unit === "cm" ? 5 : unit === "m" || unit === "ml" ? 0.5 : 1);

function QuestionCard({ index, question: q, given, onChange }: { index: number; question: CounterQuestion; given: Given | null; onChange: (g: Given | null) => void }) {
  const id = useId();
  const unitLabel = q.unit && q.unit !== "u" ? (q.unit === "m2" ? "m²" : q.unit) : "";
  const shown = (n: number) => `${String(n).replace(".", ",")}${unitLabel ? (unitLabel === "°" ? "°" : ` ${unitLabel}`) : ""}`;
  const bump = (d: number) => {
    const current = given ? Number(given.value) : 0;
    const next = Math.max(0, Math.round((current + d) * 100) / 100);
    onChange(next > 0 ? { value: String(next), label: shown(next) } : null);
  };
  return (
    <li className={`flex flex-col gap-2.5 rounded-[20px] bg-surface p-4 shadow-card transition ${given ? "ring-2 ring-ok/50" : ""}`}>
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${given ? "bg-ok text-white" : "bg-ground text-muted"}`}>
          {given ? <Check size={16} strokeWidth={3} /> : index}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          {q.about ? <span className="line-clamp-1 text-[13px] font-bold text-muted">{q.about}</span> : null}
          <span id={`${id}-q`} className="text-[16px] leading-snug font-extrabold">
            {q.text}
          </span>
          {q.hint ? <span className="text-[13px] leading-snug text-muted">{q.hint}</span> : null}
        </span>
      </div>
      {q.numeric ? (
        <div role="group" aria-labelledby={`${id}-q`} className="flex items-center justify-center gap-4">
          <button type="button" onClick={() => bump(-stepOf(q.unit))} disabled={!given} aria-label="Moins" className="flex size-12 items-center justify-center rounded-full bg-ground text-[24px] font-extrabold active:scale-95 disabled:opacity-40">
            −
          </button>
          <span className="min-w-[5rem] text-center text-[22px] font-extrabold tabular-nums" aria-live="polite">
            {given ? given.label : "?"}
          </span>
          <button type="button" onClick={() => bump(stepOf(q.unit))} aria-label="Plus" className="flex size-12 items-center justify-center rounded-full bg-ground text-[24px] font-extrabold active:scale-95">
            +
          </button>
        </div>
      ) : (
        <div role="group" aria-labelledby={`${id}-q`} className={`grid gap-2 ${q.options.length <= 2 || q.options.every((o) => o.label.length <= 14) ? "grid-cols-2" : "grid-cols-1"}`}>
          {q.options.map((o) => {
            const on = given?.value === o.value;
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
        </div>
      )}
    </li>
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
    onSubmit({ reponses: [], ajouts: [], retraits: [] });
  }, [none, onSubmit]);
  if (none) return error ? <ErrorNotice error={error} /> : <CalculScreen />;
  return <QuestionsScreen takeoff={takeoff} pending={pending} error={error} onSubmit={onSubmit} />;
}
