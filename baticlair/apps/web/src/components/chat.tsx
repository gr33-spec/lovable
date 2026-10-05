"use client";

import { Check, ChevronDown, Mic, SendHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { Takeoff } from "@/lib/api";

/**
 * Le CHAT du chantier (référentiel §21) : BatiClair parle à gauche, l'artisan
 * à droite. Les messages se déduisent de l'état du chantier (devis, liste,
 * demandes) : un rechargement retrouve la même conversation.
 */

export function AssistantMessage({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-start gap-2.5" aria-label={label}>
      {/* Sur téléphone, pas de colonne d'avatar : chaque pixel de largeur sert au contenu. */}
      <span aria-hidden="true" className="flex size-8 shrink-0 max-lg:hidden items-center justify-center rounded-[10px] bg-accent font-display text-[15px] font-extrabold text-white">
        B
      </span>
      <div className="flex min-w-0 grow flex-col gap-3 lg:pt-1">{children}</div>
    </div>
  );
}

export function UserBubble({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[85%] self-end rounded-[18px_18px_4px_18px] bg-accent px-4 py-3 text-base font-semibold text-white">{children}</div>;
}

export function Say({ children }: { children: React.ReactNode }) {
  return <p className="text-[17px] leading-snug font-semibold">{children}</p>;
}

function Step({ done, children, delay = 0 }: { done: boolean; children: React.ReactNode; delay?: number }) {
  return (
    <li className="flex animate-[bc-step_.35s_ease-out_both] items-start gap-2.5 text-[15px] leading-snug" style={{ animationDelay: `${delay}ms` }}>
      {done ? (
        <Check size={20} strokeWidth={2.5} className="mt-px shrink-0 text-ok" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
          <span className="size-2 animate-pulse rounded-full bg-accent" />
        </span>
      )}
      <span className={done ? "" : "text-muted"}>{children}</span>
    </li>
  );
}

/** Pendant la lecture (jusqu'à une minute) : les étapes s'affichent au fil du travail, la dernière reste en cours. */
const READING_STEPS = ["J'ouvre le devis.", "Je lis les lignes une à une.", "Je reconnais les ouvrages du devis.", "Je calcule les fournitures, aux unités du fournisseur."];

export function ThinkingSteps() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= READING_STEPS.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 4000);
    return () => clearTimeout(t);
  }, [shown]);
  return (
    <ol aria-live="polite" aria-label="BatiClair lit le devis" className="flex flex-col gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
      {READING_STEPS.slice(0, shown).map((s, i) => (
        <Step key={s} done={i < shown - 1}>
          {s}
        </Step>
      ))}
    </ol>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/** Ce que BatiClair a compris, en phrases courtes : tiré de la liste, jamais inventé. */
export function reasoningOf(takeoff: Takeoff): React.ReactNode[] {
  const p = takeoff.purchase;
  const steps: React.ReactNode[] = [
    <>
      J&apos;ai lu les <strong>{plural(takeoff.lines.length, "ligne")}</strong> du devis.
    </>,
  ];
  for (const u of p.understood) steps.push(<>{u}.</>);
  const pente = p.assumptions.find((a) => a.key === "param:pente");
  if (pente) {
    steps.push(
      <>
        Pente non écrite : je prends <strong>{pente.value}°</strong>.
      </>,
    );
  }
  const zone = p.assumptions.find((a) => a.key === "param:zone");
  if (zone) {
    steps.push(
      <>
        {/* « région ardoise III » pour l'ardoise, « zone climatique 3 » pour les tuiles. */}
        Pas de code postal : je prends la <strong>{zone.label.toLowerCase()} {zone.value}</strong>
        {zone.value === "3" || zone.value === "III" ? " (bord de mer, le plus prudent)" : ""}.
      </>,
    );
  }
  steps.push(
    <>
      J&apos;ai calculé <strong>{plural(p.toBuy.length, "fourniture")}</strong> à chiffrer.
    </>,
  );
  return steps;
}

/** Le raisonnement : déplié juste après la lecture, replié ensuite (« Ce que j'ai compris »). */
export function ReasoningSteps({ takeoff, fresh }: { takeoff: Takeoff; fresh: boolean }) {
  // Replié, même juste après la lecture : la liste des fournitures d'abord (retour du fondateur, « on s'y perd »).
  const [open, setOpen] = useState(false);
  const steps = reasoningOf(takeoff);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-xl bg-surface px-3 text-sm font-semibold text-muted shadow-card"
      >
        <Check size={16} strokeWidth={2.5} className="text-ok" aria-hidden="true" />
        Ce que j&apos;ai compris
        <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
      </button>
      {open ? (
        <ol aria-label="Ce que BatiClair a compris" className="flex flex-col gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
          {steps.map((s, i) => (
            <Step key={i} done delay={fresh ? i * 350 : 0}>
              {s}
            </Step>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** Une commande tapée ou dictée : seulement ce que BatiClair comprend sans se tromper. */
export type ChatCommand = { key: string; value: { value: string; unit: string }; said: string } | null;

export function parseCommand(raw: string): ChatCommand {
  const text = raw.toLowerCase().replace(",", ".").trim();
  const zone = /\bzone\s*([123])\b/.exec(text);
  if (zone) return { key: "param:zone", value: { value: zone[1]!, unit: "u" }, said: `Zone ${zone[1]}` };
  const degrees = /(\d{1,2}(?:\.\d)?)\s*(?:°|degr[ée]s?)/.exec(text) ?? (/\bpente\b/.test(text) ? /(\d{1,2}(?:\.\d)?)/.exec(text) : null);
  if (degrees) {
    const v = Number(degrees[1]);
    if (v >= 5 && v <= 80) return { key: "param:pente", value: { value: degrees[1]!, unit: "°" }, said: `Pente ${degrees[1]!.replace(".", ",")}°` };
  }
  const surface = /(\d{1,4}(?:\.\d+)?)\s*(?:m²|m2|mètres? carrés?)/.exec(text);
  if (surface) return { key: "param:surface", value: { value: surface[1]!, unit: "m2" }, said: `${surface[1]!.replace(".", ",")} m²` };
  return null;
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscription = () => () => {};

/** La barre du bas : écrire ou dicter (« mets 30° de pente », « zone 1 »). */
export function ChatInput({ onSend, disabled, placeholder }: { onSend: (text: string) => void; disabled: boolean; placeholder: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  // Le micro n'apparaît que si le navigateur sait dicter (absent au rendu serveur).
  const canDictate = useSyncExternalStore(noSubscription, () => speechRecognition() !== null, () => false);
  const recognition = useRef<Recognition | null>(null);

  function dictate() {
    const Ctor = speechRecognition();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = "fr-FR";
    r.interimResults = false;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" "));
    r.onend = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }

  return (
    <form
      className="sticky bottom-3 z-20 flex items-center gap-2 rounded-[28px] bg-surface p-1.5 shadow-float lg:bottom-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || disabled) return;
        onSend(text.trim());
        setText("");
      }}
    >
      <label htmlFor={id} className="sr-only">
        Message à BatiClair
      </label>
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="min-h-12 min-w-0 grow rounded-3xl bg-ground px-4 text-base outline-none placeholder:text-subtle disabled:opacity-60"
      />
      {canDictate ? (
        <button
          type="button"
          onClick={dictate}
          disabled={disabled}
          aria-label={listening ? "Arrêter la dictée" : "Dicter"}
          aria-pressed={listening}
          className={`flex size-12 shrink-0 items-center justify-center rounded-full ${listening ? "bg-danger text-white" : "bg-ground text-ink"}`}
        >
          <Mic size={20} aria-hidden="true" />
        </button>
      ) : null}
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Envoyer" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40">
        <SendHorizontal size={20} aria-hidden="true" />
      </button>
    </form>
  );
}
