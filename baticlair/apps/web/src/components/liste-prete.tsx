"use client";

import { Check, Layers, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { api, messageErreur, newActionKey } from "@/lib/api";
import type { AnalyseRapprochement } from "@/lib/rapprochement";
import { useResource } from "@/lib/use-resource";

/**
 * « TON QUANTITATIF EST PRÊT » (Greg, 7 novembre 2026, capture « Saisir ma liste » : deux parcours distincts mais reliés) :
 * après la liste, UNE carte. « Demander des prix » part dans tous les cas (la demande individuelle reste indépendante) ;
 * « Chercher aussi un regroupement » est un interrupteur, les lignes recommandées par le serveur déjà cochées, modifiables
 * une par une. Chaque ligne cherche SEULE (produit par produit), jamais un paquet mélangé ; rien ne rejoint un groupe sans
 * un geste de l'artisan (il est prévenu, il décide). Les anciens réglages restent derrière « Plus d'options de regroupement ».
 */
export const JOURS_RECHERCHE = 21;
const jourIso = (d: Date) => d.toISOString().slice(0, 10);
/** La date de fin de recherche, à partir d'aujourd'hui. */
const finDeRecherche = () => jourIso(new Date(Date.now() + JOURS_RECHERCHE * 86_400_000));
const jourLisible = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export function ListePrete({ projectId, nbArticles, envoye, onDemanderPrix, options }: { projectId: string; nbArticles: number; envoye: boolean; onDemanderPrix: () => void; options?: React.ReactNode }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { signal }).catch(() => null), [projectId]);
  const { data, setData } = useResource(fetcher);
  const [prix, setPrix] = useState(true);
  const [groupe, setGroupe] = useState<boolean | null>(null);
  const [coches, setCoches] = useState<Set<string> | null>(null);
  const [voir, setVoir] = useState(false);
  const [plus, setPlus] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  if (!data) return null;

  const actives = new Set(["disponible", "proposee", "rejointe"]);
  const eligibles = data.lignes.filter((l) => l.rapprochable && !(l.recherche && actives.has(l.recherche.statut)));
  const enRecherche = data.lignes.filter((l) => l.recherche && actives.has(l.recherche.statut));
  const recommandees = eligibles.filter((l) => l.recommandee);
  const choisies = coches ?? new Set(recommandees.map((l) => l.key));
  const groupeOn = (groupe ?? recommandees.length > 0) && eligibles.length > 0;
  const nbChoisies = eligibles.filter((l) => choisies.has(l.key)).length;
  const basculer = (key: string) => {
    const s = new Set(choisies);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    setCoches(s);
  };

  async function continuer() {
    setErreur(null);
    setPending(true);
    try {
      if (groupeOn && nbChoisies > 0) {
        const jusquau = finDeRecherche();
        const articles = eligibles.filter((l) => choisies.has(l.key)).map((l) => l.key);
        setData(await api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { method: "POST", body: { articles, jusquau, modeLivraison: "livraison", rayonKm: 0, dateMax: null }, idempotencyKey: newActionKey() }));
        setFait(`${articles.length} ligne${articles.length > 1 ? "s cherchent" : " cherche"} un regroupement jusqu'au ${jourLisible(jusquau)}. Tu seras prévenu, et rien ne rejoint un groupe sans ton accord.`);
        setCoches(new Set());
      }
      if (prix && !envoye) onDemanderPrix();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Ton quantitatif est prêt" className="flex flex-col gap-3">
      <p className="text-[20px] leading-tight font-extrabold">
        {envoye ? "Ta demande est partie." : `Ton quantitatif est prêt : ${nbArticles} article${nbArticles > 1 ? "s" : ""}.`}
      </p>
      <div className="flex flex-col rounded-[20px] bg-surface shadow-card">
        {!envoye ? (
          <button type="button" role="checkbox" aria-checked={prix} onClick={() => setPrix((p) => !p)} className="flex items-start gap-3 p-4 text-left">
            <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${prix ? "bg-accent text-on-accent" : "border-2 border-line"}`} aria-hidden="true">
              {prix ? <Check size={18} strokeWidth={3} /> : null}
            </span>
            <span className="flex flex-col">
              <span className="text-[17px] font-bold">
                Demander des prix pour {nbArticles > 1 ? `les ${nbArticles} articles` : "l'article"}
              </span>
              <span className="text-[15px] text-muted">Envoyer la demande complète à mes négoces.</span>
            </span>
          </button>
        ) : null}
        <div className={`flex flex-col gap-2 p-4 ${!envoye ? "border-t border-line" : ""}`}>
          <div className="flex items-start gap-3">
            <span className="flex flex-1 flex-col">
              <span id="titre-regroupement" className="text-[17px] font-bold">
                Chercher aussi un regroupement
              </span>
              <span className="text-[15px] text-muted">
                {eligibles.length === 0
                  ? enRecherche.length
                    ? `${enRecherche.length} ligne${enRecherche.length > 1 ? "s cherchent" : " cherche"} déjà un regroupement.`
                    : "Aucun article assez précis pour un regroupement sûr."
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
                      <span className="text-[15px] font-semibold">{l.designation}</span>
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
      {(!envoye && prix) || (groupeOn && nbChoisies > 0) ? (
        <Button pending={pending} onClick={() => void continuer()} className="w-full">
          Continuer
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
