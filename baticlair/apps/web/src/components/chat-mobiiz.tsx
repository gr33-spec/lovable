"use client";

import { ArrowLeft, ArrowUp, Check, ChevronDown, Eye, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { aideMicro, PHRASES_DICTEE } from "@/lib/dictee";
import { useTheme } from "@/lib/theme";

/**
 * LA CONVERSATION MOBIIZ (Greg, 31 octobre 2026, capture « Assistant Mobiiz » : « une véritable interface de discussion,
 * inspirée de l'ergonomie mobile de ChatGPT, à l'identité MOBIIZ ») : les pièces communes de « Décris ton chantier » et de
 * l'assistant. Fond noir profond #111111, texte ivoire #FBF8F3, l'assistant à gauche (pastille jaune), l'artisan à droite
 * dans des bulles jaunes #FED206 à texte #111111 ; un en-tête compact ; une barre de saisie fixe en bas, micro intégré,
 * envoi rond jaune ; le clavier natif ne la masque jamais.
 */
export const COULEURS_CHAT = { fond: "var(--chat-fond)", ivoire: "var(--chat-texte)", jaune: "#FED206", bulle: "var(--chat-bulle)", trait: "var(--chat-trait)" };

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
  const theme = useTheme();
  return (
    <header className="flex shrink-0 items-center gap-2.5 border-b px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 lg:px-6" style={{ borderColor: COULEURS_CHAT.trait }}>
      <button type="button" onClick={onFermer} aria-label="Fermer l'assistant" className="pressable -ml-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--chat-texte)] active:bg-[var(--chat-texte)]/10">
        {croix ? <X size={20} aria-hidden="true" /> : <ArrowLeft size={20} aria-hidden="true" />}
      </button>
      <Logo fond={theme === "clair" ? "clair" : "sombre"} hauteur={19} className="shrink-0" />
      <span className="h-4 w-px shrink-0 bg-[var(--chat-texte)]/25" aria-hidden="true" />
      <h2 className="min-w-0 truncate text-[14px] font-semibold text-[var(--chat-texte)]">
        Assistant<span className="max-[399px]:hidden"> Mobiiz</span>
      </h2>
      <span className="flex-1" />
      {onVoirPdf ? (
        <button
          type="button"
          onClick={onVoirPdf}
          className="pressable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap text-[var(--chat-texte)] lg:hidden"
          style={{ borderColor: COULEURS_CHAT.trait, backgroundColor: "var(--chat-voile)" }}
        >
          <Eye size={16} aria-hidden="true" className="text-[var(--chat-jaune-texte)]" />
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
    <p className="rounded-[22px] rounded-bl-md px-4 py-2.5 text-[16px] leading-snug whitespace-pre-line text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.bulle }}>
      {children}
    </p>
  );
}

export interface EtapeIa {
  cle: string;
  titre: string;
  detail: string;
}

/**
 * CE QUI SE PASSE, EN DIRECT (Greg, 14 novembre 2026 : « affiche des étapes en direct comme dans Claude […] dépliables pour
 * voir le détail »). Repliée : l'étape en cours (ou « Terminé ») ; dépliée : chaque étape et ce qu'elle a fait. Les étapes
 * sont celles du serveur, jamais une animation qui ferait semblant.
 */
export function EtapesIa({ etapes, fini }: { etapes: readonly EtapeIa[]; fini: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const courante = etapes.at(-1);
  const titre = courante?.titre ?? "Réflexion…";
  return (
    <div className="ml-10 flex max-w-[90%] flex-col gap-1 self-start text-[14px] text-[var(--chat-texte)]/75">
      <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="pressable flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-semibold" style={{ backgroundColor: "var(--chat-voile)" }}>
        {fini ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
        <span aria-live="polite">{titre}</span>
        <ChevronDown size={16} aria-hidden="true" className={ouvert ? "rotate-180" : ""} />
        <span className="sr-only">{ouvert ? "Masquer le détail" : "Voir le détail"}</span>
      </button>
      {ouvert ? (
        <ol aria-label="Ce que Mobiiz a fait" className="flex flex-col gap-1.5 border-l-2 py-1 pl-3" style={{ borderColor: "var(--chat-trait-fort)" }}>
          {etapes.map((e, i) => (
            <li key={`${e.cle}-${i}`}>
              <span className="font-semibold text-[var(--chat-texte)]">{e.titre}</span>
              <span className="block">{e.detail}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/**
 * La réponse s'écrit au fil de l'eau. Elle est déjà relue par le code quand elle arrive (rien du modèle n'est montré avant
 * sa vérification) : c'est son affichage qui avance, mot après mot. Sous « réduire les animations » : tout d'un coup.
 */
export function AuFil({ texte, surAvance }: { texte: string; surAvance?: () => void }) {
  const [n, setN] = useState(() => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? texte.length : 0));
  const rappel = useRef(surAvance);
  useEffect(() => {
    rappel.current = surAvance;
  }, [surAvance]);
  useEffect(() => {
    if (n >= texte.length) return;
    const t = setTimeout(() => {
      setN((x) => Math.min(texte.length, x + 3));
      rappel.current?.();
    }, 16);
    return () => clearTimeout(t);
  }, [n, texte]);
  return (
    <>
      <span aria-hidden={n < texte.length ? "true" : undefined}>{texte.slice(0, n)}</span>
      {n < texte.length ? <span className="sr-only">{texte}</span> : null}
    </>
  );
}

/** Une proposition rapide (réponse d'un tap), compacte. */
export function Puce({ children, onClick, disabled, discret = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; discret?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`pressable min-h-11 rounded-full border px-4 text-[15px] font-semibold disabled:opacity-50 ${discret ? "text-[var(--chat-texte)]/70" : "text-[var(--chat-texte)]"}`}
      style={{ borderColor: discret ? "transparent" : "var(--chat-trait-fort)" }}
    >
      {children}
    </button>
  );
}

const LIGNES_MAX = 5;

/**
 * LA BARRE DE SAISIE (façon ChatGPT) : fixe en bas, un champ « Réponds ici… » qui commence sur une ligne et grandit
 * jusqu'à cinq ; le micro DANS la barre (bien visible quand le champ est vide) ; l'envoi rond jaune, actif dès qu'il y a
 * du texte. Pendant la dictée : « Je t'écoute… » dans le champ, le carré rouge arrête ; le texte dicté reste dans le champ, à corriger avant
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
  /** Gardé pour les appelants : il n'y a plus de bouton « Annuler » pendant la dictée (le carré rouge arrête). */
  onAnnulerDictee?: () => void;
  /** Ce qui se pose juste au-dessus de la barre (« Annuler la dernière modification »). */
  avant?: React.ReactNode;
  /** Le « + » jaune à gauche (photos, document ; Greg, 7 novembre 2026 ; le catalogue en est sorti le 13 novembre). */
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
      {probleme === PHRASES_DICTEE.refuse ? (
        <AideMicroBloque onReessayer={onDicter} />
      ) : probleme ? (
        <p role="alert" className="px-2 pb-2 text-[14px] font-semibold text-[#FF8A6B]">
          {probleme}
        </p>
      ) : null}
      {/* Pendant la dictée (Greg, 7 novembre 2026) : pas de ligne « Annuler » au-dessus, le carré rouge arrête. */}
      {ecoute ? (
        <p role="status" className="sr-only">
          Je t&apos;écoute… tu pourras corriger avant d&apos;envoyer.
        </p>
      ) : null}
      <form
        className="flex items-end gap-2 rounded-[28px] p-1.5"
        style={{ backgroundColor: "var(--chat-carte)" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (plein && !occupe) onEnvoyer();
        }}
      >
        {onPlus ? (
          <button type="button" aria-label="Ajouter : photo ou document" onClick={onPlus} className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
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

/** Le micro refusé : le chemin exact pour ce téléphone, puis « Réessayer » (une page web n'ouvre pas les Réglages). */
function AideMicroBloque({ onReessayer }: { onReessayer: () => void }) {
  const [aide] = useState(() => aideMicro(typeof navigator === "undefined" ? "" : navigator.userAgent));
  return (
    <div role="alert" className="mx-1 mb-2 flex flex-col gap-2 rounded-2xl p-3 text-[#111111]" style={{ backgroundColor: "var(--chat-carte)" }}>
      <p className="text-[15px] font-bold">Le micro est bloqué. {aide.titre} :</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px]">
        {aide.etapes.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ol>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onReessayer} className="pressable min-h-11 rounded-full px-5 text-[15px] font-bold" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
          Réessayer
        </button>
        <span className="text-[14px] text-[#111111]/70">Ou écris ta réponse.</span>
      </div>
    </div>
  );
}
