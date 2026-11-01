"use client";

import { useRef, useState } from "react";
import { useDictee } from "@/lib/dictee";
import { BarreSaisie, Bulle, COULEURS_CHAT, TexteMobiiz, useChampDicte, useFil } from "./chat-mobiiz";
import { ETAPES_RELECTURE, interpreterReponsesNumerotees, messageDesQuestions, type QuestionNumerotee, type ReponseInterpretee } from "../../../../packages/domain/src/assistant/reponses-libres-numerotees";

/**
 * LA CONVERSATION APRÈS L'ANALYSE (Greg, 1er novembre 2026 : « MOBIIZ fonctionne comme ChatGPT »). Un seul message avec
 * toutes les questions numérotées ; l'artisan répond librement en une fois, au clavier ou à la voix ; chaque réponse va à sa
 * question (code, `interpreterReponsesNumerotees`, aucun appel IA) et remplit la carte du dessous ; seules les questions
 * ambiguës ou sans réponse sont reposées. Lignes d'état courtes, jamais le raisonnement. Les cartes à boutons restent
 * dessous, inchangées : la conversation ne fait que les remplir, et le serveur revalide tout au « Calculer ma liste ».
 */
export interface QuestionDeConversation extends QuestionNumerotee {
  /** La question peut être laissée sans réponse (pas le façonnage obligatoire). */
  retirable: boolean;
}

type Message = { de: "mobiiz" | "moi"; texte: string };

const PAUSE_MS = 380;

export function ConversationQuestions({
  questions,
  aRepondre,
  onReponse,
  onSansReponse,
}: {
  questions: readonly QuestionDeConversation[];
  /** Les numéros encore sans réponse (ni répondus ni retirés). */
  aRepondre: ReadonlySet<number>;
  onReponse: (cle: string, r: { value: string; label: string; custom?: boolean }) => void;
  /** « Je ne sais pas » : la question part sans réponse, sa ligne restera à vérifier. */
  onSansReponse: (cle: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => [{ de: "mobiiz", texte: messageDesQuestions(questions.filter((q) => aRepondre.has(q.numero))) }]);
  const [etape, setEtape] = useState<string | null>(null);
  const champ = useChampDicte();
  const dictee = useDictee(champ.surVoix);
  const { fil } = useFil([messages.length, etape]);
  const enCours = useRef(false);

  const envoyer = async () => {
    const texte = champ.saisie.trim();
    if (!texte || enCours.current) return;
    enCours.current = true;
    champ.setSaisie("");
    setMessages((m) => [...m, { de: "moi", texte }]);
    const posees = questions.filter((q) => aRepondre.has(q.numero));
    const reduit = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    for (const e of ETAPES_RELECTURE.slice(0, 2)) {
      setEtape(e);
      if (!reduit) await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    const lues = interpreterReponsesNumerotees(posees, texte);
    setEtape(ETAPES_RELECTURE[2]);
    if (!reduit) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const notees: ReponseInterpretee[] = [];
    const laissees: ReponseInterpretee[] = [];
    const reposer: QuestionDeConversation[] = [];
    const raisons: string[] = [];
    for (const r of lues) {
      const q = posees.find((x) => x.numero === r.numero)!;
      if (r.statut === "compris" && r.valeur !== null) {
        onReponse(q.cle, { value: r.valeur, label: r.libelle ?? r.valeur, ...(r.libreEcrite ? { custom: true } : {}) });
        notees.push(r);
      } else if (r.statut === "sans_reponse" && r.raison && q.retirable) {
        onSansReponse(q.cle);
        laissees.push(r);
      } else {
        reposer.push(q);
        if (r.raison) raisons.push(`${r.numero}. ${r.raison}`);
      }
    }
    const parties: string[] = [];
    if (notees.length) parties.push(["Noté :", ...notees.map((r) => `${r.numero}. ${r.libelle}`)].join("\n"));
    if (laissees.length) parties.push(["Je laisse sans réponse, la ligne restera à vérifier :", ...laissees.map((r) => `${r.numero}.`)].join("\n"));
    if (raisons.length) parties.push(raisons.join("\n"));
    parties.push(reposer.length ? messageDesQuestions(reposer, true) : "Tout est noté. Vérifie les réponses ci-dessous, puis « Calculer ma liste ».");
    setEtape(null);
    setMessages((m) => [...m, { de: "mobiiz", texte: parties.join("\n\n") }]);
    enCours.current = false;
  };

  return (
    <section aria-label="Conversation avec MOBIIZ" className="flex flex-col overflow-hidden rounded-[20px] shadow-card" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <div ref={fil} className="flex max-h-[min(56dvh,520px)] flex-col gap-3 overflow-y-auto px-3 pt-4 pb-2 lg:px-5">
        {messages.map((m, i) =>
          m.de === "moi" ? (
            <Bulle key={i} de="moi">
              {m.texte}
            </Bulle>
          ) : (
            <Bulle key={i} de="mobiiz" label="Message de MOBIIZ">
              <TexteMobiiz>{m.texte}</TexteMobiiz>
            </Bulle>
          ),
        )}
        {etape ? (
          <p role="status" className="self-start pl-10 text-[14px] font-semibold text-[#FBF8F3]/75">
            {etape}
          </p>
        ) : null}
      </div>
      <BarreSaisie
        valeur={champ.saisie}
        onChange={champ.setSaisie}
        onEnvoyer={() => void envoyer()}
        occupe={etape !== null}
        ecoute={dictee.ecoute}
        probleme={dictee.probleme}
        onDicter={() => {
          champ.avantDictee();
          dictee.demarrer();
        }}
        onArreter={dictee.arreter}
        onAnnulerDictee={() => {
          dictee.annuler();
          champ.rendre();
        }}
      />
      <p className="px-4 pb-3 text-[13px] text-[#FBF8F3]/70">Ou réponds avec les boutons ci-dessous.</p>
    </section>
  );
}
