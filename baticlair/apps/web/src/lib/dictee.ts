"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * LA DICTÉE (assistant Mobiiz, Greg, 31 octobre 2026, point 4) : la reconnaissance vocale du navigateur (Web Speech API),
 * zéro coût, zéro dépendance. Le texte dicté va dans la case, JAMAIS envoyé seul : l'artisan relit puis envoie. Micro
 * refusé, navigateur sans dictée, rien entendu : une phrase claire, et le clavier reste là.
 */
type Reconnaissance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function fabrique(): (new () => Reconnaissance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconnaissance; webkitSpeechRecognition?: new () => Reconnaissance };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const PHRASES_DICTEE = {
  indisponible: "La dictée n'est pas disponible sur ce navigateur. Utilise le micro de ton clavier, ou écris ta réponse.",
  refuse: "Le micro est bloqué. Autorise-le dans les réglages du navigateur, ou écris ta réponse.",
  rien: "Je n'ai rien entendu. Réessaie, ou écris ta réponse.",
  erreur: "La dictée s'est arrêtée. Réessaie, ou écris ta réponse.",
};

export function useDictee(surTexte: (texte: string, final: boolean) => void) {
  const [ecoute, setEcoute] = useState(false);
  const [probleme, setProbleme] = useState<string | null>(null);
  const rec = useRef<Reconnaissance | null>(null);
  const rappel = useRef(surTexte);
  useEffect(() => {
    rappel.current = surTexte;
  }, [surTexte]);
  useEffect(() => () => rec.current?.abort(), []);

  const arreter = useCallback(() => {
    rec.current?.stop();
  }, []);

  const demarrer = useCallback(() => {
    setProbleme(null);
    const F = fabrique();
    if (!F) {
      setProbleme(PHRASES_DICTEE.indisponible);
      return;
    }
    try {
      const r = new F();
      r.lang = "fr-FR";
      r.interimResults = true;
      r.continuous = false;
      r.onresult = (e) => {
        let texte = "";
        let final = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          texte += e.results[i]![0]!.transcript;
          final = e.results[i]!.isFinal;
        }
        rappel.current(texte, final);
      };
      r.onerror = (e) => {
        setProbleme(e.error === "not-allowed" || e.error === "service-not-allowed" ? PHRASES_DICTEE.refuse : e.error === "no-speech" ? PHRASES_DICTEE.rien : e.error === "aborted" ? null : PHRASES_DICTEE.erreur);
      };
      r.onend = () => setEcoute(false);
      rec.current = r;
      r.start();
      setEcoute(true);
    } catch {
      setProbleme(PHRASES_DICTEE.erreur);
      setEcoute(false);
    }
  }, []);

  return { ecoute, probleme, demarrer, arreter, effacerProbleme: () => setProbleme(null) };
}
