"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button, INPUT } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { capturerEcran, reduireImage } from "@/lib/capture-ecran";

/**
 * « SIGNALER UN PROBLÈME » (Greg, 13 novembre 2026) : un bouton sur chaque écran de l'application (dans « Mon menu ») et
 * de l'espace négoce (en bas de page). La page concernée et la capture de l'écran sont jointes toutes seules ; l'utilisateur
 * n'écrit que ce qui ne va pas. Il reçoit aussitôt « Merci, on regarde », puis « C'est corrigé, merci » le moment venu.
 */
const PAGES_NEGOCE = /^\/(chiffrer|grille|achat-groupe|reponse|negoce|negoces|conditions-negoce)(\/|$)/;

export interface SignalementHandle {
  ouvrir: () => void;
}

/** `sansBouton` : la fenêtre seule, ouverte par `ref.current.ouvrir()` (le bouton vit dans un menu qui se referme). */
export function SignalerProbleme({ connecte, className = "", sansBouton = false, ref }: { connecte: boolean; className?: string; sansBouton?: boolean; ref?: Ref<SignalementHandle> }) {
  const pathname = usePathname();
  // Recette du 13 novembre 2026 : un négoce est vouvoyé ; la page affichée ne montre jamais son lien personnel (le serveur
  // l'écarte de toute façon avant d'enregistrer).
  const vous = !connecte && PAGES_NEGOCE.test(pathname);
  const pageAffichee = pathname.split("/").map((m) => (m.length >= 20 && /^[A-Za-z0-9_-]+$/.test(m) ? "…" : m)).join("/");
  const [ouvert, setOuvert] = useState(false);
  const [capture, setCapture] = useState<string | null>(null);
  const [captureEnCours, setCaptureEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<{ accuse: boolean } | null>(null);
  const declencheur = useRef<HTMLButtonElement>(null);
  const boite = useRef<HTMLDivElement>(null);

  async function ouvrir() {
    setErreur(null);
    setFait(null);
    setCapture(null);
    setCaptureEnCours(true);
    // La capture se prend AVANT d'ouvrir la fenêtre, une fois le menu refermé : c'est l'écran du problème qu'on veut.
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const image = await capturerEcran();
    setCapture(image);
    setCaptureEnCours(false);
    setOuvert(true);
  }
  useImperativeHandle(ref, () => ({ ouvrir: () => void ouvrir() }));
  function fermer() {
    setOuvert(false);
    declencheur.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!ouvert) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("keydown", clavier);
    boite.current?.querySelector<HTMLElement>("textarea")?.focus();
    return () => document.removeEventListener("keydown", clavier);
  }, [ouvert]);

  async function envoyer() {
    setErreur(null);
    setEnvoi(true);
    try {
      const commun = { message: message.trim(), page: pathname, contexte: `${navigator.userAgent.slice(0, 200)} · ${window.innerWidth}×${window.innerHeight}`, ...(capture ? { capture } : {}) };
      const r = connecte
        ? await api<{ accuse: boolean }>("/v1/signalements", { method: "POST", body: commun })
        : await api<{ accuse: boolean }>("/v1/public/signalements", { method: "POST", body: { ...commun, origine: PAGES_NEGOCE.test(pathname) ? "negoce" : "public", ...(email.trim() ? { email: email.trim() } : {}) } });
      setFait(r);
      setMessage("");
    } catch (e) {
      setErreur(messageErreur(e) || "Le signalement n'est pas parti. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      {sansBouton ? null : (
        <button ref={declencheur} type="button" onClick={() => void ouvrir()} disabled={captureEnCours} data-hors-capture className={className || "pressable flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-accent-text"}>
          <LifeBuoy size={18} aria-hidden="true" className="shrink-0" /> Signaler un problème
        </button>
      )}
      {ouvert ? (
        <div data-hors-capture className="fixed top-0 left-0 z-[90] flex h-[100dvh] w-full items-end justify-center bg-black/60 p-3 sm:items-center" onClick={(e) => (e.target === e.currentTarget ? fermer() : undefined)}>
          <div ref={boite} role="dialog" aria-modal="true" aria-label="Signaler un problème" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[20px] bg-surface p-5 text-ink shadow-card">
            {fait ? (
              <>
                <p className="text-[20px] font-extrabold">Merci, on regarde.</p>
                <p className="text-[16px]">{fait.accuse ? (vous ? "Vous recevez un e-mail de confirmation, puis un autre dès que c'est corrigé." : "Tu reçois un e-mail de confirmation, puis un autre dès que c'est corrigé.") : vous ? "Votre signalement est bien arrivé." : "Ton signalement est bien arrivé."}</p>
                <Button variant="ink" onClick={fermer}>
                  Fermer
                </Button>
              </>
            ) : (
              <>
                <p className="text-[20px] font-extrabold">Signaler un problème</p>
                <label htmlFor="signalement-message" className="text-[16px] font-semibold">
                  Que se passe-t-il ?
                </label>
                <textarea id="signalement-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={3000} placeholder="Ex. le bouton Envoyer ne répond pas." className={`${INPUT} py-3`} />
                {connecte ? null : (
                  <>
                    <label htmlFor="signalement-email" className="text-[16px] font-semibold">
                      {vous ? "Votre e-mail, pour vous répondre (facultatif)" : "Ton e-mail, pour te répondre (facultatif)"}
                    </label>
                    <input id="signalement-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
                  </>
                )}
                <div className="flex flex-col gap-2 rounded-xl bg-ground p-3 text-[14px]">
                  <p>
                    <span className="font-semibold">Page jointe :</span> {pageAffichee}
                  </p>
                  {capture ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- une image locale, jamais servie par le site */}
                      <img src={capture} alt="Capture de l'écran jointe" className="h-20 w-auto rounded-lg border border-line" />
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">Capture d&apos;écran jointe</span>
                        <button type="button" onClick={() => setCapture(null)} className="min-h-11 self-start text-[14px] font-semibold text-accent-text underline">
                          Retirer la capture
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col gap-1">
                      <span>La capture automatique n&apos;a pas pu se faire sur cet appareil. {vous ? "Vous pouvez" : "Tu peux"} joindre une capture d&apos;écran (facultatif).</span>
                      <input type="file" accept="image/*" aria-label="Joindre une capture d'écran" onChange={(e) => void (async () => setCapture(e.target.files?.[0] ? await reduireImage(e.target.files[0]) : null))()} className="text-[14px]" />
                    </label>
                  )}
                </div>
                {erreur ? (
                  <p role="alert" className="text-[15px] font-semibold text-[#a3261a]">
                    {erreur}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button variant="ink" disabled={envoi || message.trim().length < 3} onClick={() => void envoyer()}>
                    {envoi ? "Envoi…" : "Envoyer"}
                  </Button>
                  <button type="button" onClick={fermer} className="min-h-13 px-4 text-[16px] font-semibold">
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
