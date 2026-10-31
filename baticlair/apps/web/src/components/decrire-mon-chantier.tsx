"use client";

import { Check, Mic, MessageSquareText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { lireDescription, type LigneDecrite } from "../../../../packages/domain/src/assistant/assistant";
import { api, ApiError } from "@/lib/api";
import { useDictee } from "@/lib/dictee";

/**
 * « DÉCRIS TON CHANTIER » (Greg, 31 octobre 2026, point 1) : le quatrième départ d'une liste. L'artisan écrit ou dicte ; le
 * code (aucun appel IA, aucun quota) en tire les lignes : une quantité dite en chiffres fait une ligne cochée ; le reste
 * (nombre en lettres, rien de chiffré) est proposé décoché, l'artisan coche ce qui est bien un matériau. Rien d'inventé :
 * sans quantité dite, la ligne arrive « à préciser ». Puis la liste arrive sur le même écran que les autres départs.
 */
type Proposee = LigneDecrite & { id: number; cochee: boolean; sure: boolean };

export function BoutonDecrire() {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className="pressable flex min-h-16 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card active:bg-ground">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ground text-ink" aria-hidden="true">
          <MessageSquareText size={20} />
        </span>
        <span className="flex flex-col">
          <span className="text-[16px] font-semibold">Je décris mon chantier</span>
          <span className="text-[14px] leading-snug text-muted">À l&apos;écrit ou au micro : je garde les quantités que tu dis.</span>
        </span>
      </button>
      {ouvert ? <DecrireMonChantier onFermer={fermer} /> : null}
    </>
  );
}

function DecrireMonChantier({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [proposees, setProposees] = useState<Proposee[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const base = useRef("");
  const dictee = useDictee(
    useCallback((t: string) => {
      setTexte(`${base.current}${base.current && t ? " " : ""}${t}`.trimStart());
    }, []),
  );
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);

  function lire() {
    dictee.arreter();
    const r = lireDescription(texte);
    let id = 0;
    setProposees([...r.lignes.map((l) => ({ ...l, id: id++, cochee: true, sure: true })), ...r.aConfirmer.map((l) => ({ ...l, id: id++, cochee: false, sure: false }))]);
  }

  async function creer() {
    const lignes = (proposees ?? []).filter((p) => p.cochee);
    if (lignes.length === 0) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const q = await api<{ projetId: string }>("/v1/quantitatifs", { method: "POST", body: { lignes: lignes.map((l) => ({ libelle: l.libelle, quantite: l.quantite, unite: l.unite })) } });
      router.push(`/chantiers/${q.projetId}`);
    } catch (e) {
      setErreur(e instanceof ApiError && e.message ? e.message : "La liste n'est pas créée. Réessaie dans un instant.");
      setEnvoi(false);
    }
  }

  const nb = (proposees ?? []).filter((p) => p.cochee).length;
  return (
    <div role="dialog" aria-modal="true" aria-label="Décris ton chantier" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-ground text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-[18px] font-extrabold">Décris ton chantier</h2>
        <button type="button" onClick={onFermer} aria-label="Fermer" className="pressable flex size-11 items-center justify-center rounded-full border border-line">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <p className="text-[15px] text-muted">Dis ce qu&apos;il te faut, avec les quantités : « 40 m² de placo BA13, 3 rouleaux de laine de verre 100 mm, 6 sacs de mortier ».</p>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 rounded-2xl border border-line bg-surface px-4 focus-within:border-ink">
            <span className="sr-only">Ta description</span>
            <textarea
              rows={4}
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value);
                base.current = e.target.value;
              }}
              placeholder={dictee.ecoute ? "Je t'écoute…" : "Écris ou dicte ici"}
              className="w-full resize-none bg-transparent py-3 text-[16px] outline-none"
            />
          </label>
          <button
            type="button"
            aria-label={dictee.ecoute ? "Arrêter la dictée" : "Dicter"}
            aria-pressed={dictee.ecoute}
            onClick={() => {
              if (dictee.ecoute) dictee.arreter();
              else {
                base.current = texte;
                dictee.demarrer();
              }
            }}
            className={`pressable flex size-12 shrink-0 items-center justify-center rounded-full border ${dictee.ecoute ? "border-danger bg-danger text-white" : "border-line bg-surface text-ink"}`}
          >
            <Mic size={20} aria-hidden="true" />
          </button>
        </div>
        {dictee.probleme ? (
          <p role="alert" className="text-[14px] font-semibold text-danger">
            {dictee.probleme}
          </p>
        ) : null}
        <button type="button" disabled={!texte.trim()} onClick={lire} className="pressable min-h-12 self-start rounded-full bg-ink px-5 text-[15px] font-bold text-white disabled:opacity-40">
          Lire ma description
        </button>
        {proposees ? (
          proposees.length === 0 ? (
            <p className="text-[15px] text-muted">Je n&apos;ai trouvé aucun matériau. Ajoute les quantités : « 10 sacs de colle ».</p>
          ) : (
            <section aria-label="Ce que j'ai compris" className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Ce que j&apos;ai compris</h3>
              <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface shadow-card">
                {proposees.map((p) => (
                  <li key={p.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={p.cochee}
                        onChange={() => setProposees((all) => (all ?? []).map((x) => (x.id === p.id ? { ...x, cochee: !x.cochee } : x)))}
                      />
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${p.cochee ? "border-ink bg-ink text-white" : "border-line"}`} aria-hidden="true">
                        {p.cochee ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-[15px] font-semibold">{p.libelle}</span>
                        <span className="text-[13px] text-muted">
                          {p.quantite ? `${p.quantite}${p.unite ? ` ${p.unite}` : ""}` : "Quantité à préciser"}
                          {p.sure ? "" : " · à cocher si c'est un matériau"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )
        ) : null}
        {erreur ? (
          <p role="alert" className="text-[14px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </div>
      {proposees && proposees.length > 0 ? (
        <div className="border-t border-line px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button type="button" disabled={nb === 0 || envoi} onClick={() => void creer()} className="pressable mx-auto flex min-h-13 w-full max-w-2xl items-center justify-center rounded-full bg-accent text-[16px] font-bold text-on-accent disabled:opacity-50">
            {envoi ? "Je crée ta liste…" : `Créer ma liste (${nb} ligne${nb > 1 ? "s" : ""})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
