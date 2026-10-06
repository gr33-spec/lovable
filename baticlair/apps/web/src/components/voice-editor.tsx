"use client";

import { Check, Mic, Minus, Pencil, Plus, SendHorizontal } from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { parseEdits, type VoiceEdit, type VoiceItem } from "@/lib/voice-edits";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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
const noSubscription = () => () => {};

/** Une modification appliquée (ou pas comprise), pour la montrer à l'artisan. */
type Applied = { edit: VoiceEdit; ok: boolean };

/**
 * §48.4 : LA VOIX SUR L'ÉCRAN DU QUANTITATIF, la liste sous les yeux. « Modifie ton quantitatif à la voix : dis-moi ce
 * que tu enlèves, ce que tu ajoutes, ce que tu as oublié. » Chaque morceau dit devient une modification de ligne,
 * appliquée tout de suite et montrée (« Ce que j'ai modifié »). Une zone de texte fait la même chose. La main reste :
 * plus / moins, crayon, corbeille, comme avant.
 */
export function VoiceEditor({ items, pending, onApply }: { items: readonly VoiceItem[]; pending: boolean; onApply: (edit: Exclude<VoiceEdit, { kind: "unknown" }>) => Promise<boolean> }) {
  const id = useId();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Applied[] | null>(null);
  const canDictate = useSyncExternalStore(noSubscription, () => speechRecognition() !== null, () => false);
  const recognition = useRef<Recognition | null>(null);
  const said = useRef("");
  const field = useRef<HTMLTextAreaElement>(null);

  async function apply(spoken: string) {
    const edits = parseEdits(spoken, items);
    setBusy(true);
    const out: Applied[] = [];
    for (const edit of edits) out.push({ edit, ok: edit.kind === "unknown" ? false : await onApply(edit).catch(() => false) });
    setApplied(out);
    setBusy(false);
  }

  function dictate() {
    setMicError(null);
    const Ctor = speechRecognition();
    if (!Ctor) {
      field.current?.focus();
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
    r.onerror = (e) => setMicError(e.error === "not-allowed" ? "Le micro est bloqué : autorise-le dans les réglages du téléphone, ou écris à côté." : "Je n'ai pas bien entendu. Réessaie, ou écris à côté.");
    r.onend = () => {
      setListening(false);
      if (said.current.trim()) void apply(said.current.trim());
    };
    recognition.current = r;
    setListening(true);
    r.start();
  }

  const disabled = pending || busy;
  return (
    <section aria-label="Modifier à la voix" className="flex flex-col gap-3 rounded-[22px] bg-hero p-4 text-white shadow-[0_18px_40px_-16px_rgba(26,21,80,0.6)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dictate}
          disabled={disabled}
          aria-label={listening ? "Arrêter et appliquer" : "Modifier à la voix"}
          aria-pressed={listening}
          className={`flex size-16 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-60 ${listening ? "bg-[#ff3d8b]" : "bg-cta shadow-cta"}`}
          style={listening ? { animation: "bc-ring 1.2s ease-out infinite" } : undefined}
        >
          <Mic size={28} aria-hidden="true" />
        </button>
        <p className="text-[15px] leading-snug font-bold">
          {listening ? "Je t'écoute… touche le micro quand tu as fini." : "Modifie ton quantitatif à la voix : dis-moi ce que tu enlèves, ce que tu ajoutes, ce que tu as oublié."}
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
