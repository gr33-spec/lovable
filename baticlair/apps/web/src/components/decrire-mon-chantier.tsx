"use client";

import { MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { lireDescription, type LigneDecrite } from "../../../../packages/domain/src/assistant/assistant";
import { api, ApiError, type Quantitatif, type Takeoff } from "@/lib/api";
import { useDictee } from "@/lib/dictee";
import { AssistantMobiiz, marquerAssistantOuvert, type Message } from "./assistant-mobiiz";
import { BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, Puce, TexteMobiiz, useChampDicte, useFil, useZoneVisible } from "./chat-mobiiz";

/**
 * « DÉCRIS TON CHANTIER » EN CONVERSATION (Greg, 31 octobre 2026, capture « Assistant Mobiiz » : « une véritable interface
 * de discussion, pas un formulaire ») : le quatrième départ d'une liste. L'artisan écrit ou dicte dans la barre du bas ; le
 * code (aucun appel IA, aucun quota) tire les lignes du message (`lireDescription`) : une quantité dite en chiffres fait
 * une ligne ; ce qui est dit sans quantité en chiffres est proposé d'un tap, jamais compté d'office. Dès la première ligne,
 * la liste est créée (la porte habituelle, `POST /v1/quantitatifs`) et LA MÊME CONVERSATION continue avec l'assistant
 * (questions, consignes, « Voir PDF »). Rien d'inventé : sans quantité dite, la ligne arrive « à préciser ».
 */
const ACCUEIL = "Décris-moi ton chantier ou indique directement les matériaux et quantités dont tu as besoin. Tu peux écrire ou utiliser le micro.";

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
  const [messages, setMessages] = useState<Message[]>([{ de: "mobiiz", texte: ACCUEIL }]);
  const [aConfirmer, setAConfirmer] = useState<LigneDecrite[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [liste, setListe] = useState<{ q: Quantitatif; takeoff: Takeoff; propositions: LigneDecrite[]; historique: Message[] } | null>(null);
  const champDicte = useChampDicte();
  const dictee = useDictee(champDicte.surVoix);
  const { fil, enBas } = useFil([messages, aConfirmer.length]);
  const zone = useZoneVisible(enBas);

  /** La liste naît avec ses premières lignes ; la conversation continue avec l'assistant, dans le même fil. */
  async function creer(lignes: LigneDecrite[], reste: LigneDecrite[], fil: Message[]) {
    setOccupe(true);
    try {
      const q = await api<Quantitatif>("/v1/quantitatifs?ecran=1", { method: "POST", body: { lignes: lignes.map((l) => ({ libelle: l.libelle, quantite: l.quantite, unite: l.unite })) } });
      const complet = q.ecran ? q : await api<Quantitatif>(`/v1/quantitatifs/${encodeURIComponent(q.id)}?ecran=1`);
      marquerAssistantOuvert(complet.projetId);
      if (complet.ecran) setListe({ q: complet, takeoff: complet.ecran, propositions: reste, historique: fil });
      else router.push(`/chantiers/${complet.projetId}`);
    } catch (e) {
      setMessages((m) => [...m, { de: "mobiiz", texte: e instanceof ApiError && e.message ? `La liste n'est pas créée : ${e.message}` : "La liste n'est pas créée. Réessaie dans un instant." }]);
    } finally {
      setOccupe(false);
    }
  }

  function envoyer() {
    const texte = champDicte.saisie.trim();
    if (!texte || occupe) return;
    dictee.arreter();
    champDicte.setSaisie("");
    const fil: Message[] = [...messages, { de: "moi", texte }];
    setMessages(fil);
    const r = lireDescription(texte);
    const reste = [...aConfirmer, ...r.aConfirmer];
    if (r.lignes.length > 0) {
      const dites = r.lignes.map((l) => `${l.libelle}${l.quantite ? ` (${l.quantite}${l.unite ? ` ${l.unite}` : ""})` : ""}`).join(", ");
      void creer(r.lignes, reste, [...fil, { de: "mobiiz", texte: `C'est noté : ${dites}.` }]);
      return;
    }
    setAConfirmer(reste);
    setMessages((m) => [
      ...m,
      {
        de: "mobiiz",
        texte: reste.length
          ? "Je n'ai compté que ce qui a une quantité en chiffres. Donne-la (« 1 WC suspendu ») ou touche ce que tu veux garder."
          : "Je n'ai pas trouvé de matériau. Dis-le avec sa quantité, par exemple « 10 sacs de colle ».",
      },
    ]);
  }

  if (liste)
    return (
      <AssistantMobiiz
        takeoff={liste.takeoff}
        projectId={liste.q.projetId}
        quantitatifId={liste.q.id}
        historique={liste.historique}
        propositions={liste.propositions}
        onUpdated={(q) => {
          if (q.ecran) setListe((x) => (x ? { ...x, q, takeoff: q.ecran! } : x));
        }}
        onClose={() => router.push(`/chantiers/${liste.q.projetId}`)}
        onSend={() => router.push(`/chantiers/${liste.q.projetId}`)}
      />
    );

  return (
    <div
      ref={zone}
      role="dialog"
      aria-modal="true"
      aria-label="Décris ton chantier"
      className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[#FBF8F3]"
      style={{ backgroundColor: COULEURS_CHAT.fond }}
    >
      <EnTeteChat onFermer={onFermer} />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4">
          {messages.map((m, i) =>
            m.de === "moi" ? (
              <Bulle key={i} de="moi">
                {m.texte}
              </Bulle>
            ) : (
              <Bulle key={i} de="mobiiz">
                <TexteMobiiz>{m.texte}</TexteMobiiz>
              </Bulle>
            ),
          )}
          {aConfirmer.length > 0 ? (
            <div role="group" aria-label="À garder ?" className="flex flex-wrap gap-2 pl-10">
              {aConfirmer.map((p) => (
                <Puce key={p.libelle} disabled={occupe} onClick={() => void creer([p], aConfirmer.filter((x) => x !== p), [...messages, { de: "moi", texte: `Garder « ${p.libelle} »` }])}>
                  Garder « {p.libelle} »{p.quantite ? ` (${p.quantite})` : ""}
                </Puce>
              ))}
            </div>
          ) : null}
          {occupe ? <p className="pl-10 text-[14px] text-[#FBF8F3]/60">Je prépare ta liste…</p> : null}
        </div>
        <BarreSaisie
          valeur={champDicte.saisie}
          onChange={champDicte.setSaisie}
          onEnvoyer={envoyer}
          occupe={occupe}
          ecoute={dictee.ecoute}
          probleme={dictee.probleme}
          onDicter={() => {
            champDicte.avantDictee();
            dictee.demarrer();
          }}
          onArreter={dictee.arreter}
          onAnnulerDictee={() => {
            dictee.annuler();
            champDicte.rendre();
          }}
        />
      </div>
    </div>
  );
}
