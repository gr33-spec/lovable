"use client";

import { ArrowLeft, ArrowUp, Eye, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logo } from "./logo";

/**
 * LA CONVERSATION MOBIIZ (Greg, 31 octobre 2026, capture « Assistant Mobiiz » : « une véritable interface de discussion,
 * inspirée de l'ergonomie mobile de ChatGPT, à l'identité MOBIIZ ») : les pièces communes de « Décris ton chantier » et de
 * l'assistant. Fond noir profond #111111, texte ivoire #FBF8F3, l'assistant à gauche (pastille jaune), l'artisan à droite
 * dans des bulles jaunes #FED206 à texte #111111 ; un en-tête compact ; une barre de saisie fixe en bas, micro intégré,
 * envoi rond jaune ; le clavier natif ne la masque jamais.
 */
export const COULEURS_CHAT = { fond: "#111111", ivoire: "#FBF8F3", jaune: "#FED206", bulle: "#1F1E1C", trait: "rgba(251,248,243,0.12)" };

/**
 * LE CLAVIER NATIF : l'écran prend la zone VISIBLE (`visualViewport`, qui rétrécit quand le clavier s'ouvre sur iPhone comme
 * sur Android), et suit son décalage sur Safari ; la barre de saisie, en bas de cette zone, reste donc juste au-dessus du
 * clavier. Sans `visualViewport` : 100dvh (jamais 100vh). Le dernier message reste visible à chaque changement.
 */
export function useZoneVisible(surChangement?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const rappel = useRef(surChangement);
  useEffect(() => {
    rappel.current = surChangement;
  }, [surChangement]);
  useLayoutEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const maj = () => {
      el.style.height = `${vv.height}px`;
      el.style.transform = vv.offsetTop ? `translateY(${vv.offsetTop}px)` : "";
      rappel.current?.();
    };
    maj();
    vv.addEventListener("resize", maj);
    vv.addEventListener("scroll", maj);
    window.addEventListener("orientationchange", maj);
    return () => {
      vv.removeEventListener("resize", maj);
      vv.removeEventListener("scroll", maj);
      window.removeEventListener("orientationchange", maj);
    };
  }, []);
  // Page derrière figée (écrans plein écran, CLAUDE.md).
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);
  return ref;
}

/** L'en-tête compact : retour, le vrai logo et « Assistant Mobiiz », « Voir PDF » (téléphone) quand un PDF existe. */
export function EnTeteChat({ onFermer, onVoirPdf, croix = false }: { onFermer: () => void; onVoirPdf?: (() => void) | undefined; croix?: boolean }) {
  return (
    <header className="flex shrink-0 items-center gap-2.5 border-b px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 lg:px-6" style={{ borderColor: COULEURS_CHAT.trait }}>
      <button type="button" onClick={onFermer} aria-label="Fermer l'assistant" className="pressable -ml-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-[#FBF8F3] active:bg-white/10">
        {croix ? <X size={20} aria-hidden="true" /> : <ArrowLeft size={20} aria-hidden="true" />}
      </button>
      <Logo fond="sombre" hauteur={19} className="shrink-0" />
      <span className="h-4 w-px shrink-0 bg-white/25" aria-hidden="true" />
      <h2 className="min-w-0 truncate text-[14px] font-semibold text-[#FBF8F3]">
        Assistant<span className="max-[399px]:hidden"> Mobiiz</span>
      </h2>
      <span className="flex-1" />
      {onVoirPdf ? (
        <button
          type="button"
          onClick={onVoirPdf}
          className="pressable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap text-[#FBF8F3] lg:hidden"
          style={{ borderColor: COULEURS_CHAT.trait, backgroundColor: "rgba(251,248,243,0.06)" }}
        >
          <Eye size={16} aria-hidden="true" className="text-[#FED206]" />
          Voir PDF
        </button>
      ) : null}
    </header>
  );
}

/** Une bulle : l'assistant à gauche avec sa pastille, l'artisan à droite en jaune. */
export function Bulle({ de, children, label }: { de: "mobiiz" | "moi"; children: React.ReactNode; label?: string }) {
  if (de === "moi")
    return (
      <p className="max-w-[82%] self-end rounded-[22px] rounded-br-md px-4 py-2.5 text-[16px] leading-snug whitespace-pre-line text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
        {children}
      </p>
    );
  return (
    <div className="flex max-w-[90%] items-start gap-2 self-start" {...(label ? { role: "group", "aria-label": label } : {})}>
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }} aria-hidden="true">
        <Sparkles size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

/** Le texte d'une bulle de l'assistant. */
export function TexteMobiiz({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[22px] rounded-bl-md px-4 py-2.5 text-[16px] leading-snug whitespace-pre-line text-[#FBF8F3]" style={{ backgroundColor: COULEURS_CHAT.bulle }}>
      {children}
    </p>
  );
}

/** Une proposition rapide (réponse d'un tap), compacte. */
export function Puce({ children, onClick, disabled, discret = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; discret?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`pressable min-h-11 rounded-full border px-4 text-[15px] font-semibold disabled:opacity-50 ${discret ? "text-[#FBF8F3]/70" : "text-[#FBF8F3]"}`}
      style={{ borderColor: discret ? "transparent" : "rgba(251,248,243,0.28)" }}
    >
      {children}
    </button>
  );
}

const LIGNES_MAX = 5;

/**
 * LA BARRE DE SAISIE (façon ChatGPT) : fixe en bas, un champ « Réponds ici… » qui commence sur une ligne et grandit
 * jusqu'à cinq ; le micro DANS la barre (bien visible quand le champ est vide) ; l'envoi rond jaune, actif dès qu'il y a
 * du texte. Pendant la dictée : « Je t'écoute… », Arrêter ou Annuler ; le texte dicté reste dans le champ, à corriger avant
 * l'envoi, jamais envoyé seul.
 */
export function BarreSaisie({
  valeur,
  onChange,
  onEnvoyer,
  occupe,
  ecoute,
  probleme,
  onDicter,
  onArreter,
  onAnnulerDictee,
  avant,
  onPlus,
  invite,
}: {
  valeur: string;
  onChange: (v: string) => void;
  onEnvoyer: () => void;
  occupe: boolean;
  ecoute: boolean;
  probleme: string | null;
  onDicter: () => void;
  onArreter: () => void;
  onAnnulerDictee: () => void;
  /** Ce qui se pose juste au-dessus de la barre (« Annuler la dernière modification »). */
  avant?: React.ReactNode;
  /** Le « + » jaune à gauche (photos, document, catalogue ; Greg, 7 novembre 2026). */
  onPlus?: () => void;
  /** Le texte d'attente de la case (« Décris ton besoin… »). */
  invite?: string;
}) {
  const champ = useRef<HTMLTextAreaElement>(null);
  const ajuster = useCallback(() => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    const style = getComputedStyle(el);
    const ligne = Number.parseFloat(style.lineHeight) || 22;
    const marges = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    el.style.height = `${Math.min(el.scrollHeight, ligne * LIGNES_MAX + marges)}px`;
  }, []);
  useLayoutEffect(ajuster, [valeur, ajuster]);
  const plein = valeur.trim().length > 0;
  return (
    <div className="shrink-0 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] lg:px-6" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      {avant}
      {probleme ? (
        <p role="alert" className="px-2 pb-2 text-[14px] font-semibold text-[#FF8A6B]">
          {probleme}
        </p>
      ) : null}
      {ecoute ? (
        <div role="status" className="flex items-center gap-2 px-2 pb-2 text-[14px] text-[#FBF8F3]">
          <span className="size-2.5 animate-pulse rounded-full bg-[#FF5A3C]" aria-hidden="true" />
          <span className="flex-1 font-semibold">Je t&apos;écoute… tu pourras corriger avant d&apos;envoyer.</span>
          <button type="button" onClick={onAnnulerDictee} className="min-h-9 rounded-full px-3 font-semibold text-[#FBF8F3]/75">
            Annuler
          </button>
        </div>
      ) : null}
      <form
        className="flex items-end gap-2 rounded-[28px] p-1.5"
        style={{ backgroundColor: COULEURS_CHAT.ivoire }}
        onSubmit={(e) => {
          e.preventDefault();
          if (plein && !occupe) onEnvoyer();
        }}
      >
        {onPlus ? (
          <button type="button" aria-label="Ajouter : photo, document ou catalogue" onClick={onPlus} className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
            <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        ) : null}
        <label className="flex min-h-11 flex-1 items-center pl-3">
          <span className="sr-only">Ton message</span>
          <textarea
            ref={champ}
            rows={1}
            value={valeur}
            enterKeyHint="send"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Ordinateur : Entrée envoie, Maj + Entrée va à la ligne. Téléphone : la touche « Envoyer » du clavier.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (plein && !occupe) onEnvoyer();
              }
            }}
            placeholder={ecoute ? "Je t'écoute…" : (invite ?? "Réponds ici…")}
            className="w-full resize-none bg-transparent py-2.5 text-[16px] leading-[22px] text-[#111111] outline-none placeholder:text-[#111111]/45"
          />
        </label>
        <button
          type="button"
          aria-label={ecoute ? "Arrêter la dictée" : "Dicter"}
          aria-pressed={ecoute}
          onClick={ecoute ? onArreter : onDicter}
          className={`pressable flex size-11 shrink-0 items-center justify-center rounded-full ${ecoute ? "bg-[#FF5A3C] text-white" : "bg-[#111111]/[0.07] text-[#111111]"}`}
        >
          {ecoute ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
        </button>
        <button
          type="submit"
          aria-label="Envoyer le message"
          disabled={!plein || occupe}
          className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-[#111111] transition-opacity disabled:opacity-35"
          style={{ backgroundColor: COULEURS_CHAT.jaune }}
        >
          <ArrowUp size={21} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

/** Un fil qui défile tout seul vers le dernier message. */
export function useFil(deps: readonly unknown[]) {
  const fil = useRef<HTMLDivElement>(null);
  const enBas = useCallback(() => {
    const el = fil.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    const el = fil.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { fil, enBas };
}

/** La dictée branchée sur un champ : ce qui était écrit avant est gardé, la voix s'ajoute derrière ; Annuler le rend. */
export function useChampDicte() {
  const [saisie, setSaisieBrute] = useState("");
  const base = useRef("");
  const setSaisie = useCallback((v: string) => {
    base.current = v;
    setSaisieBrute(v);
  }, []);
  const surVoix = useCallback((texte: string) => {
    setSaisieBrute(`${base.current}${base.current && texte ? " " : ""}${texte}`.trimStart());
  }, []);
  const avantDictee = useCallback(() => {
    base.current = saisie;
  }, [saisie]);
  const rendre = useCallback(() => setSaisieBrute(base.current), []);
  return { saisie, setSaisie, surVoix, avantDictee, rendre };
}
