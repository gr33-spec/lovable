"use client";

import { Layers, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { api, messageErreur, newActionKey } from "@/lib/api";
import type { AnalyseRapprochement } from "@/lib/rapprochement";
import { useResource } from "@/lib/use-resource";

/**
 * « TON QUANTITATIF EST PRÊT » (Greg, 7 novembre 2026, capture « Saisir ma liste » : deux parcours distincts mais reliés) :
 * après la liste, UNE carte. La demande de prix part par le bouton principal de la liste (« Demander les prix à mes
 * négoces », un seul bouton par étape, point 8) ; « Chercher aussi un regroupement » est un interrupteur, les lignes
 * recommandées par le serveur déjà cochées, modifiables une par une, lancé par CE MÊME bouton (un geste). Chaque ligne
 * cherche SEULE (produit par produit), jamais un paquet mélangé ; rien ne rejoint un groupe sans un geste de l'artisan.
 * Une erreur du regroupement se dit et ne bloque jamais la demande de prix. Une fois la demande partie, « Lancer la
 * recherche » seul. Les anciens réglages restent derrière « Plus d'options de regroupement ».
 */
export const JOURS_RECHERCHE = 21;
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
/** La date de fin de recherche, à partir d'aujourd'hui. */
const finDeRecherche = () => jourIso(new Date(Date.now() + JOURS_RECHERCHE * 86_400_000));
const jourLisible = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
const ACTIVES = new Set(["disponible", "proposee", "rejointe"]);

export function ListePrete({ projectId, nbArticles, envoye, brancherLancement, options }: { projectId: string; nbArticles: number; envoye: boolean; brancherLancement: (lancer: (() => Promise<void>) | null) => void; options?: React.ReactNode }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { signal }).catch(() => null), [projectId]);
  const { data, setData } = useResource(fetcher);
  const [groupe, setGroupe] = useState<boolean | null>(null);
  const [coches, setCoches] = useState<Set<string> | null>(null);
  const [voir, setVoir] = useState(false);
  const [plus, setPlus] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const lignes = data?.lignes ?? [];
  const eligibles = lignes.filter((l) => l.rapprochable && !(l.recherche && ACTIVES.has(l.recherche.statut)));
  const enRecherche = lignes.filter((l) => l.recherche && ACTIVES.has(l.recherche.statut));
  const recommandees = eligibles.filter((l) => l.recommandee);
  const choisies = coches ?? new Set(recommandees.map((l) => l.key));
  const groupeOn = (groupe ?? recommandees.length > 0) && eligibles.length > 0;
  const articles = eligibles.filter((l) => choisies.has(l.key)).map((l) => l.key);
  const nbChoisies = articles.length;

  /** Les lignes choisies cherchent un regroupement ; une erreur se dit, sans jamais bloquer la demande de prix. */
  async function lancer() {
    if (!groupeOn || articles.length === 0) return;
    setErreur(null);
    setPending(true);
    try {
      const jusquau = finDeRecherche();
      setData(await api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { method: "POST", body: { articles, jusquau, modeLivraison: "livraison", rayonKm: 0, dateMax: null }, idempotencyKey: newActionKey() }));
      setFait(`${articles.length} ligne${articles.length > 1 ? "s cherchent" : " cherche"} un regroupement jusqu'au ${jourLisible(jusquau)}. Tu seras prévenu, et rien ne rejoint un groupe sans ton accord.`);
      setCoches(new Set());
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  // Le bouton principal de la liste appelle la version du dernier rendu (sélection à jour).
  const derniere = useRef(lancer);
  useEffect(() => {
    derniere.current = lancer;
  });
  useEffect(() => {
    brancherLancement(() => derniere.current());
    return () => brancherLancement(null);
  }, [brancherLancement]);
  if (!data) return null;

  const basculer = (key: string) => {
    const s = new Set(choisies);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    setCoches(s);
  };

  return (
    <section aria-label="Ton quantitatif est prêt" className="flex flex-col gap-3">
      <p className="text-[20px] leading-tight font-extrabold">
        {envoye ? "Ta demande est partie." : `Ton quantitatif est prêt : ${nbArticles} article${nbArticles > 1 ? "s" : ""}.`}
      </p>
      <div className="flex flex-col rounded-[20px] bg-surface shadow-card">
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start gap-3">
            <span className="flex flex-1 flex-col">
              <span id="titre-regroupement" className="text-[17px] font-bold">
                Chercher aussi un regroupement
              </span>
              <span className="text-[15px] text-muted">
                {eligibles.length === 0
                  ? enRecherche.length
                    ? `${enRecherche.length} ligne${enRecherche.length > 1 ? "s cherchent" : " cherche"} déjà un regroupement.`
                    : "Aucun article assez précis pour un regroupement sûr : précise une ligne (marque, modèle, origine…) pour qu'elle puisse chercher."
                  : recommandees.length
                    ? `Pour ${recommandees.length} article${recommandees.length > 1 ? "s" : ""} à fort potentiel, sans bloquer la demande.`
                    : "Aucun article recommandé ; tu peux en choisir."}
              </span>
            </span>
            {eligibles.length > 0 ? (
              <button
                type="button"
                role="switch"
                aria-checked={groupeOn}
                aria-labelledby="titre-regroupement"
                onClick={() => setGroupe(!groupeOn)}
                className={`relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors ${groupeOn ? "bg-accent" : "bg-line"}`}
              >
                <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${groupeOn ? "left-7" : "left-1"}`} />
              </button>
            ) : null}
          </div>
          {data.opportunites && eligibles.length > 0 ? <p className="text-[15px] font-semibold">{data.opportunites}</p> : null}
          {groupeOn ? (
            <button type="button" onClick={() => setVoir((v) => !v)} aria-expanded={voir} className="min-h-11 self-start text-[15px] font-semibold text-accent-text underline underline-offset-4">
              {voir ? "Masquer les articles" : `Voir les ${nbChoisies} article${nbChoisies > 1 ? "s" : ""} sélectionné${nbChoisies > 1 ? "s" : ""}`}
            </button>
          ) : null}
          {groupeOn && voir ? (
            <ul aria-label="Articles pour le regroupement" className="flex flex-col">
              {eligibles.map((l) => (
                <li key={l.key}>
                  <label className="flex min-h-12 items-start gap-3 border-b border-line py-2 last:border-b-0">
                    <input type="checkbox" checked={choisies.has(l.key)} onChange={() => basculer(l.key)} className="mt-1 size-5 shrink-0 accent-accent" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold break-words">{l.designation}</span>
                      <span className="text-[13px] text-muted">
                        {l.quantite} {l.unite}
                        {l.pourquoi ? ` · ${l.pourquoi}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          {!envoye && groupeOn && nbChoisies > 0 ? <p className="text-[14px] text-muted">« Demander les prix à mes négoces » envoie ta liste et lance cette recherche, d&apos;un seul geste.</p> : null}
        </div>
        <p className="flex items-center gap-2 border-t border-line p-4 text-[15px]">
          <ShieldCheck size={20} aria-hidden="true" className="shrink-0" /> Rien ne rejoint un groupe sans ton accord.
        </p>
      </div>
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">
          {fait}
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      {envoye && groupeOn && nbChoisies > 0 ? (
        <Button pending={pending} onClick={() => void lancer()} className="w-full">
          Lancer la recherche
        </Button>
      ) : null}
      {!envoye ? (
        <button type="button" onClick={() => router.push("/chantiers?statut=a-preparer")} className="min-h-11 self-center text-[15px] font-semibold underline underline-offset-4">
          Enregistrer pour plus tard
        </button>
      ) : null}
      {options ? (
        <>
          <button type="button" onClick={() => setPlus((p) => !p)} aria-expanded={plus} className="min-h-11 self-center text-[14px] font-semibold text-muted underline underline-offset-4">
            <Layers size={14} aria-hidden="true" className="mr-1 inline" />
            {plus ? "Masquer les options de regroupement" : "Plus d'options de regroupement"}
          </button>
          {plus ? options : null}
        </>
      ) : null}
    </section>
  );
}
