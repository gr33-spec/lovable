"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BESOIN_VIDE, lienDuBesoin, tourAchatGroupe, uniteDeLaQuestion, type BesoinConv, type ProduitConv } from "../../../../packages/domain/src/groupe/conversation-ag-v1";
import { useDictee } from "@/lib/dictee";
import { useSession } from "@/lib/session";
import type { EtatV1 } from "@/lib/ag-v1";
import { BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, Puce, TexteMobiiz, useChampDicte, useFil, useZoneVisible } from "./chat-mobiiz";

/**
 * « AJOUTER UN MATÉRIAU » AVEC MOBIIZ (Greg, 8 novembre 2026, capture « Choisis précisément le produit » : « C'est nul ça,
 * je veux passer par l'IA Mobiiz ») : une conversation plein écran. L'artisan dit son besoin comme au comptoir ; Mobiiz en
 * tire le produit, ses caractéristiques, la quantité, livraison ou retrait et la date, et pose UNE question à la fois avec des
 * réponses rapides (`tourAchatGroupe`). Une fois tout dit, « Continuer » ouvre le besoin prérempli dans le parcours habituel
 * (conditionnement, lieu privé, achat compatible, confirmation). Rien n'est créé ici.
 */
type Message = { id: number; de: "mobiiz" | "moi"; texte: string };

export function ConversationAchatGroupeV1({ etat }: { etat: EtatV1 }) {
  const router = useRouter();
  const { me } = useSession();
  const prenom = me.user.name.trim().split(/\s+/)[0] ?? "";
  const produits = etat.produits as unknown as ProduitConv[];
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 1, de: "mobiiz", texte: `Bonjour${prenom ? ` ${prenom}` : ""}. Quel matériau veux-tu acheter en groupe ? Dis-le comme au comptoir, avec la quantité et la date si tu les as.` },
  ]);
  const [besoin, setBesoin] = useState<BesoinConv>(BESOIN_VIDE);
  const [suggestions, setSuggestions] = useState<string[]>(() => produits.slice(0, 4).map((p) => p.libelle));
  const [complet, setComplet] = useState(false);
  const champ = useChampDicte();
  const dictee = useDictee(champ.surVoix);
  const { fil, enBas } = useFil([messages.length, complet]);
  const zone = useZoneVisible(enBas);
  const compteur = useRef(1);
  // Plein écran par-dessus l'app : l'en-tête et le menu derrière deviennent inertes tant qu'elle est ouverte.
  useEffect(() => {
    const inertes: HTMLElement[] = [];
    for (let el = zone.current as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
      for (const frere of Array.from(el.parentElement?.children ?? [])) {
        const dansLaPage = !!el.parentElement?.closest("main");
        const menu = frere.tagName === "NAV" || !!frere.querySelector?.('nav[aria-label="Navigation principale"]');
        if (frere !== el && frere instanceof HTMLElement && !frere.inert && frere.tagName !== "SCRIPT" && (dansLaPage || menu)) {
          frere.inert = true;
          inertes.push(frere);
        }
      }
    }
    return () => inertes.forEach((e) => (e.inert = false));
  });

  function dire(texte: string) {
    const t = texte.trim();
    if (!t) return;
    dictee.arreter();
    const produit = produits.find((p) => p.type === besoin.type);
    const tour = tourAchatGroupe(produits, besoin, t, new Date(), uniteDeLaQuestion(produit));
    setMessages((m) => [...m, { id: ++compteur.current, de: "moi", texte: t }, { id: ++compteur.current, de: "mobiiz", texte: tour.reponse }]);
    setBesoin(tour.besoin);
    setSuggestions(tour.suggestions);
    setComplet(tour.complet);
  }

  return (
    <div ref={zone} role="dialog" aria-modal="true" aria-label="Ajouter un matériau en achat groupé" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[#FBF8F3]" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <EnTeteChat onFermer={() => router.push("/achats-groupes")} />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4">
          {messages.map((m) =>
            m.de === "moi" ? (
              <Bulle key={m.id} de="moi">
                {m.texte}
              </Bulle>
            ) : (
              <Bulle key={m.id} de="mobiiz">
                <TexteMobiiz>{m.texte}</TexteMobiiz>
              </Bulle>
            ),
          )}
          {suggestions.length && !complet ? (
            <div role="group" aria-label="Réponses rapides" className="flex flex-wrap gap-2 pl-10">
              {suggestions.map((x) => (
                <Puce key={x} onClick={() => dire(x)}>
                  {x}
                </Puce>
              ))}
            </div>
          ) : null}
        </div>
        <BarreSaisie
          valeur={champ.saisie}
          onChange={champ.setSaisie}
          onEnvoyer={() => {
            const t = champ.saisie;
            champ.setSaisie("");
            dire(t);
          }}
          occupe={false}
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
          invite={complet ? "Corrige ou précise…" : "Décris ton besoin…"}
          avant={
            complet ? (
              <button type="button" onClick={() => router.push(lienDuBesoin(besoin))} className="pressable mb-2 flex min-h-12 w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
                Continuer : vérifier et confirmer
              </button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
