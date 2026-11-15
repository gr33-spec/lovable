"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChoixCreation } from "@/components/choix-creation";
import { NouveauQuantitatif } from "@/components/nouveau-quantitatif";
import { SaisirMaListe } from "@/components/saisir-ma-liste";

/** L'adresse du parcours « Publier un besoin groupé » : sous « Achats groupés », du début à la fin (lot E). */
export const PUBLIER_BESOIN = "/achats-groupes/publier";

/**
 * Direction A (Greg, 12 novembre 2026) : « Créer un quantitatif » n'ouvre plus l'assistant d'office. Sans mode : le choix
 * (« Je saisis ma liste » ou « Mobiiz m'aide »). `?mode=manuel` (et l'ancien `?liste=1`) : la saisie à la main.
 * `?mode=assistant` : l'assistant, avec ses façons d'entrer visibles.
 *
 * UN SEUL OUTIL DE SAISIE (Greg, 16 novembre 2026) : « Créer mon besoin » (achats groupés) ouvre exactement ce même outil ;
 * la liste créée mène alors à l'écran où l'on coche les lignes à grouper. LOT E (Greg, 15 novembre 2026) : ce parcours vit
 * à son adresse, `/achats-groupes/publier` : l'onglet « Achats groupés » reste allumé, le titre dit « Publier un besoin
 * groupé », Retour et le bouton précédent du navigateur ramènent aux achats groupés, un lien profond rouvre le bon écran.
 * L'ancienne adresse (`/chantiers/nouveau?pour=achat-groupe`) y renvoie.
 */
export function PorteCreation({ pour = null }: { pour?: "achat-groupe" | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") ?? (params.get("liste") === "1" ? "manuel" : null);
  const ancienne = !pour && params.get("pour") === "achat-groupe";
  useEffect(() => {
    if (ancienne) router.replace(`${PUBLIER_BESOIN}${mode ? `?mode=${mode}` : ""}`);
  }, [ancienne, mode, router]);
  if (ancienne) return null;
  const retour = pour ? PUBLIER_BESOIN : "/chantiers/nouveau";
  const versListe = pour ? (id: string) => `/achats-groupes/quantitatif/${id}` : undefined;
  if (mode === "manuel") return <SaisirMaListe onFermer={() => router.push(retour)} versListe={versListe} />;
  if (mode === "assistant") return <NouveauQuantitatif onFermer={() => router.push(retour)} versListe={versListe} />;
  return <ChoixCreation pour={pour} />;
}
