"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { AuFil, BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, EtapesIa, TexteMobiiz, useChampDicte, useFil, useZoneVisible, type EtapeIa } from "@/components/chat-mobiiz";
import { BackButton, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useDictee } from "@/lib/dictee";

type Element = { id: number; de: "moi" | "mobiiz"; texte: string } | { id: number; de: "etapes"; etapes: EtapeIa[]; fini: boolean };
const EXEMPLES = ["Combien d'inscrits ce mois ?", "Quelle croissance ?", "Quels négoces ne répondent jamais ?"];
const ETAPES: EtapeIa[] = [
  { cle: "reflexion", titre: "Réflexion…", detail: "Je lis ta question." },
  { cle: "lecture", titre: "Lecture des chiffres…", detail: "Je relève les chiffres du jour : inscrits, abonnés, revenus, négoces, activité. Aucun détail de chantier." },
];

/**
 * « POSE TA QUESTION » (Greg, 14 novembre 2026 : « je demande en langage normal […] il répond avec les chiffres. Lecture seule
 * […] Même interface que l'assistant artisan »). La même conversation que l'assistant des artisans, aux couleurs du thème.
 */
export default function AdminQuestionPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Pose ta question</PageTitle>
      <PorteAdmin>
        <Conversation />
      </PorteAdmin>
    </div>
  );
}

function Conversation() {
  const router = useRouter();
  const [elements, setElements] = useState<Element[]>([]);
  const [occupe, setOccupe] = useState(false);
  const champ = useChampDicte();
  const dictee = useDictee(champ.surVoix);
  const { fil, enBas } = useFil([elements.length, occupe]);
  const zone = useZoneVisible(enBas);
  const compteur = useRef(0);
  const ajouter = (e: Omit<Extract<Element, { de: "moi" | "mobiiz" }>, "id"> | Omit<Extract<Element, { de: "etapes" }>, "id">) => {
    const id = ++compteur.current;
    setElements((xs) => [...xs, { ...e, id } as Element]);
    return id;
  };

  async function envoyer(dit?: string) {
    const question = (dit ?? champ.saisie).trim();
    if (!question || occupe) return;
    dictee.arreter();
    champ.setSaisie("");
    ajouter({ de: "moi", texte: question });
    const idEtapes = ajouter({ de: "etapes", etapes: ETAPES, fini: false });
    setOccupe(true);
    const r = await api<{ reponse: string; ia: boolean }>("/v1/admin/vue/question", { method: "POST", body: { question } }).catch((e: unknown) => (e instanceof ApiError ? e : null));
    setOccupe(false);
    const ok = r && !(r instanceof ApiError);
    setElements((xs) => xs.map((x) => (x.id === idEtapes && x.de === "etapes" ? { ...x, fini: true, etapes: [...x.etapes, { cle: "termine", titre: "Terminé", detail: ok ? (r.ia ? "Réponse écrite à partir de ces chiffres, sans rien modifier." : "Réponse donnée par le code, à partir de ces chiffres, sans rien modifier.") : "La réponse n'est pas arrivée." }] } : x)));
    ajouter({ de: "mobiiz", texte: ok ? r.reponse : "Je n'ai pas pu répondre. Réessaie dans un instant." });
  }

  return (
    <div ref={zone} role="dialog" aria-modal="true" aria-label="Pose ta question" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <EnTeteChat onFermer={() => router.push("/admin")} />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4">
          <Bulle de="mobiiz">
            <TexteMobiiz>Pose ta question sur l&apos;activité de Mobiiz. Je réponds avec les chiffres du jour. Je ne fais que lire : je ne modifie rien.</TexteMobiiz>
          </Bulle>
          {elements.length === 0 ? (
            <div role="group" aria-label="Exemples de questions" className="ml-10 flex flex-wrap gap-2">
              {EXEMPLES.map((x) => (
                <button key={x} type="button" disabled={occupe} onClick={() => void envoyer(x)} className="pressable min-h-11 rounded-full border-2 border-[#FED206] px-4 text-[15px] font-bold disabled:opacity-50">
                  {x}
                </button>
              ))}
            </div>
          ) : null}
          {elements.map((e) =>
            e.de === "moi" ? (
              <Bulle key={e.id} de="moi">
                {e.texte}
              </Bulle>
            ) : e.de === "etapes" ? (
              <EtapesIa key={e.id} etapes={e.etapes} fini={e.fini} />
            ) : (
              <Bulle key={e.id} de="mobiiz">
                <TexteMobiiz>
                  <AuFil texte={e.texte} surAvance={enBas} />
                </TexteMobiiz>
              </Bulle>
            ),
          )}
        </div>
        <BarreSaisie
          valeur={champ.saisie}
          onChange={champ.setSaisie}
          onEnvoyer={() => void envoyer()}
          occupe={occupe}
          ecoute={dictee.ecoute}
          probleme={dictee.probleme}
          onDicter={() => {
            champ.avantDictee();
            dictee.demarrer();
          }}
          onArreter={dictee.arreter}
          invite="Pose ta question…"
        />
      </div>
    </div>
  );
}
