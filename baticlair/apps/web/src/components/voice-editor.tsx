"use client";

import { Check, Mic, Minus, Pencil, Plus, SendHorizontal } from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { parseEdits, type VoiceEdit, type VoiceItem } from "@/lib/voice-edits";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noSubscription = () => () => {};

/** Une modification appliquée (ou pas comprise), pour la montrer à l'artisan. */
type Applied = { edit: VoiceEdit; ok: boolean };

/**
 * §48.4 : LA VOIX SUR L'ÉCRAN DU QUANTITATIF, la liste sous les yeux. Retour de Greg (2026-10-06) : « je parle, je clique
 * sur Terminer, ça modifie direct ». Le texte s'écrit pendant qu'il parle ; les silences ne coupent rien (le micro se
 * relance seul, sur iPhone il s'arrête à chaque pause) ; « Terminer » applique tout de suite et montre « Ce que j'ai
 * modifié ». Une zone de texte fait la même chose. La main reste : plus / moins, crayon, corbeille.
 */
export function VoiceEditor({ items, pending, onApply }: { items: readonly VoiceItem[]; pending: boolean; onApply: (edit: Exclude<VoiceEdit, { kind: "unknown" }>) => Promise<boolean> }) {
  const id = useId();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Applied[] | null>(null);
  /** Ce qui a été entendu, dit dans le résumé : l'artisan voit ce que BatiClair a compris de sa phrase. */
  const [said, setSaid] = useState("");
  const canDictate = useSyncExternalStore(noSubscription, () => speechRecognition() !== null, () => false);
  const recognition = useRef<Recognition | null>(null);
  /** Les morceaux définitifs, dans l'ordre ; et ce qui s'entend encore (provisoire). */
  const finals = useRef<string[]>([]);
  const interim = useRef("");
  /** « Terminer » (appliquer) ou « Annuler » (rien) : sinon, une fin de micro est une pause, on relance. */
  const ending = useRef<"apply" | "cancel" | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  /** Le texte montré à l'artisan pendant qu'il parle : c'est LUI qui part à « Terminer » (ce qu'il a lu, rien d'autre). */
  const shownText = useRef("");
  const heard = () => [...finals.current, interim.current].map((x) => x.trim()).filter(Boolean).join(". ");
  const spokenText = () => {
    const now = heard();
    return now.length >= shownText.current.length ? now : shownText.current;
  };

  async function apply(spoken: string) {
    const edits = parseEdits(spoken, items);
    setSaid(spoken);
    setBusy(true);
    const out: Applied[] = [];
    for (const edit of edits) out.push({ edit, ok: edit.kind === "unknown" ? false : await onApply(edit).catch(() => false) });
    setApplied(out);
    setBusy(false);
  }

  function listen() {
    const Ctor = speechRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "fr-FR";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let now = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const t = (res[0]?.transcript ?? "").trim();
        if (!t) continue;
        if (res.isFinal) {
          // iPhone : les résultats repartent de zéro après une pause, ou répètent la phrase en l'allongeant.
          const last = finals.current[finals.current.length - 1];
          if (last && (t === last || t.startsWith(last))) finals.current[finals.current.length - 1] = t;
          else finals.current.push(t);
        } else now += `${now ? " " : ""}${t}`;
      }
      interim.current = now;
      shownText.current = heard();
      setLive(shownText.current);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      ending.current = "cancel";
      setMicError(e.error === "not-allowed" ? "Le micro est bloqué : autorise-le dans les réglages du téléphone, ou écris à côté." : "Je n'ai pas bien entendu. Réessaie, ou écris à côté.");
    };
    r.onend = () => {
      if (ending.current === null) {
        // Une pause : le micro s'est coupé tout seul, on continue d'écouter.
        try {
          listen();
          return;
        } catch {
          ending.current = "apply";
        }
      }
      const what = ending.current;
      ending.current = null;
      recognition.current = null;
      setListening(false);
      const spoken = spokenText();
      if (what === "apply" && spoken) void apply(spoken);
    };
    recognition.current = r;
    r.start();
  }

  function startDictation() {
    setMicError(null);
    setApplied(null);
    if (!speechRecognition()) {
      field.current?.focus();
      return;
    }
    finals.current = [];
    interim.current = "";
    shownText.current = "";
    ending.current = null;
    setLive("");
    setListening(true);
    try {
      listen();
    } catch {
      setListening(false);
      setMicError("Le micro ne démarre pas. Écris à côté.");
    }
  }

  function finish(how: "apply" | "cancel") {
    ending.current = how;
    const r = recognition.current;
    if (!r) return;
    if (how === "cancel" && r.abort) r.abort();
    else r.stop();
  }

  const disabled = pending || busy;
  if (listening) {
    return (
      <section aria-label="Modifier à la voix" className="flex flex-col gap-3 rounded-[22px] bg-hero p-4 text-white shadow-[0_18px_40px_-16px_rgba(26,21,80,0.6)]">
        <p className="flex items-center gap-2 text-[15px] font-extrabold">
          <span aria-hidden="true" className="size-3 rounded-full bg-[#ff3d8b]" style={{ animation: "bc-ring 1.2s ease-out infinite" }} />
          Je t&apos;écoute… parle normalement, puis touche « Terminer ».
        </p>
        <p aria-live="polite" aria-label="Ce que j'entends" className="min-h-20 rounded-2xl bg-white px-3 py-3 text-[16px] leading-snug text-ink">
          {live || <span className="text-subtle">« enlève l&apos;écran, mets 40 crochets, j&apos;ai oublié 2 cartouches de silicone »</span>}
        </p>
        <button type="button" onClick={() => finish("apply")} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[17px] font-extrabold text-accent-text active:scale-[0.98]">
          <Check size={20} aria-hidden="true" />
          Terminer
        </button>
        <button type="button" onClick={() => finish("cancel")} className="min-h-10 self-center text-[14px] font-bold text-white/80">
          Annuler
        </button>
      </section>
    );
  }
  return (
    <section aria-label="Modifier à la voix" className="flex flex-col gap-3 rounded-[22px] bg-hero p-4 text-white shadow-[0_18px_40px_-16px_rgba(26,21,80,0.6)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={startDictation}
          disabled={disabled}
          aria-label="Modifier à la voix"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-cta text-white shadow-cta transition active:scale-95 disabled:opacity-60"
        >
          <Mic size={28} aria-hidden="true" />
        </button>
        <p className="text-[15px] leading-snug font-bold">
          {busy ? "Je modifie ta liste…" : "Modifie ton quantitatif à la voix : dis-moi ce que tu enlèves, ce que tu ajoutes, ce que tu as oublié."}
        </p>
      </div>
      {micError ? (
        <p role="alert" className="rounded-xl bg-white/12 px-3 py-2 text-[13px] font-bold">
          {micError}
        </p>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || disabled) return;
          void apply(text.trim());
          setText("");
        }}
      >
        <label htmlFor={id} className="sr-only">
          Écrire mes modifications
        </label>
        <textarea
          ref={field}
          id={id}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canDictate ? "Ou écris ici…" : "« enlève l'écran, mets 40 crochets »"}
          className="min-h-12 min-w-0 grow resize-none rounded-2xl bg-white px-3 py-3 text-[15px] leading-snug text-ink outline-none placeholder:text-subtle"
        />
        <button type="submit" disabled={disabled || !text.trim()} aria-label="Appliquer mes modifications" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-accent disabled:opacity-40">
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </form>
      {applied ? (
        <div role="status" aria-label="Ce que j'ai modifié" className="flex flex-col gap-1.5 rounded-2xl bg-white p-3 text-ink">
          <p className="text-[13px] font-extrabold tracking-[0.04em] text-muted uppercase">Ce que j&apos;ai modifié</p>
          {said ? <p className="text-[13px] leading-snug text-muted">Tu as dit : « {said} »</p> : null}
          {applied.length === 0 ? <p className="text-[14px]">Rien à modifier dans ce que j&apos;ai entendu.</p> : null}
          <ul className="flex flex-col gap-1">
            {applied.map(({ edit, ok }, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] leading-snug">
                {edit.kind === "unknown" || !ok ? (
                  <>
                    <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full bg-warn" />
                    <span>
                      <span className="font-bold text-warn">Pas compris :</span> « {edit.heard} » — dis le nom de la ligne comme dans la liste, ou touche-la.
                    </span>
                  </>
                ) : edit.kind === "remove" ? (
                  <>
                    <Minus size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
                    <span>
                      <span className="font-bold">Retiré :</span> {edit.label}
                    </span>
                  </>
                ) : edit.kind === "set" ? (
                  <>
                    <Pencil size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-accent-text" />
                    <span>
                      <span className="font-bold">{edit.label} :</span> {edit.from ?? "?"} → {edit.to}
                      {edit.unit ? ` ${edit.unit}` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ok" />
                    <span>
                      <span className="font-bold">Ajouté :</span> {edit.label}
                      {edit.quantity ? ` · ${edit.quantity}${edit.unit ? ` ${edit.unit}` : ""}` : ""}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {applied.some((a) => a.ok) ? (
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-ok">
              <Check size={14} aria-hidden="true" />
              Appliqué à la liste. Tout se défait d&apos;un tap, à la main.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
