"use client";

import { ArrowLeft, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type Quantitatif } from "@/lib/api";
import { useBrouillon } from "@/lib/brouillon";
import { CatalogueListes, type LigneChoisie } from "./catalogue-listes";
import { NouveauQuantitatif } from "./nouveau-quantitatif";
import { INPUT } from "./ui";

/**
 * « SAISIR MA LISTE » (Greg, 31 octobre 2026 : « réutilise exactement le mécanisme de sélection de l'achat groupé ») : le
 * même sélecteur (`CatalogueListes`, mode « liste ») — métier, recherche, familles, formats —, SANS la logique de l'achat
 * groupé : ni groupe, ni participation, ni négoce, ni envoi, ni crédit. On ajoute les matériaux un par un (« Ajouter ce
 * matériau ») ; chaque ligne reste modifiable (désignation, caractéristiques, quantité, unité) ; le bouton du bas crée LA
 * LISTE et ouvre l'éditeur habituel. Le métier oriente les familles sans empêcher un autre métier ; ce qui est tapé
 * s'ajoute tel quel. Les lignes sont gardées (brouillon serveur) : changer de métier, de famille ou revenir ne perd rien.
 */
export interface LigneSaisie {
  designation: string;
  precision: string;
  qte: string;
  unite: string;
  cle?: string;
  /** la ligne vient d'une proposition de Mobiiz que l'artisan a acceptée ; elle le dit tant qu'il ne l'a pas modifiée. */
  origine?: "mobiiz";
}

const UNITES = ["", "pièces", "m", "m²", "m³", "kg", "sacs", "rouleaux", "palettes", "boîtes", "litres", "pots"];

const sansOrigine = (l: LigneSaisie): LigneSaisie => {
  const reste = { ...l };
  delete reste.origine;
  return reste;
};

export function boutonSaisie(n: number): string {
  // Greg, 1er novembre 2026 : « Créer ma liste avec N matériaux » (le bouton crée la liste et ouvre l'éditeur).
  // Direction A (Greg, 12 novembre 2026) : le quantitatif est le document, la liste est son contenu.
  return n === 0 ? "Ajoute un matériau pour créer le quantitatif" : n === 1 ? "Créer le quantitatif · 1 matériau" : `Créer le quantitatif · ${n} matériaux`;
}

export function SaisirMaListe({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const b = useBrouillon<{ lignes: LigneSaisie[] }>(
    "liste:saisie",
    { type: "liste", url: "/chantiers/nouveau?liste=1", titre: (d) => `Ta liste · ${d.lignes.length} matériau${d.lignes.length > 1 ? "x" : ""}`, vide: (d) => d.lignes.length === 0 },
    { lignes: [] },
  );
  const lignes = b.donnees.lignes;
  const setLignes = (f: (l: LigneSaisie[]) => LigneSaisie[]) => b.modifier((d) => ({ ...d, lignes: f(d.lignes) }));
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [quitter, setQuitter] = useState(false);
  const [ajoute, setAjoute] = useState<string | null>(null);
  // Direction A (Greg, 12 novembre 2026) : l'aide de Mobiiz s'ouvre par-dessus la liste en cours, qui ne bouge pas.
  const [aide, setAide] = useState(false);

  // Un brouillon de l'ancien « Écris ta liste » (« liste:nouvelle ») est repris ici une fois : ses lignes ne se perdent pas.
  const pret = b.pret;
  useEffect(() => {
    if (!pret || lignes.length > 0) return;
    let vivant = true;
    void api<{ brouillon: { donnees: { lignes?: { libelle: string; quantite: string; unite: string }[] } } | null }>(`/v1/brouillons/un?cle=${encodeURIComponent("liste:nouvelle")}`)
      .then((r) => {
        const anciennes = r.brouillon?.donnees.lignes ?? [];
        if (!vivant || anciennes.length === 0) return;
        b.modifier((d) => ({ ...d, lignes: [...d.lignes, ...anciennes.map((l) => ({ designation: l.libelle, precision: "", qte: l.quantite ?? "", unite: l.unite ?? "" }))] }));
        // Les lignes sont passées dans « liste:saisie » (gardé sur le serveur) : l'ancien brouillon n'a plus lieu d'être.
        void api(`/v1/brouillons?cle=${encodeURIComponent("liste:nouvelle")}`, { method: "DELETE" }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  // Plein écran : la page derrière est figée, la barre du menu ne recouvre rien (CLAUDE.md).
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);

  const ajouter = (l: LigneChoisie) => {
    setLignes((ls) => [...ls, { designation: l.designation, precision: "", qte: l.qte.trim(), unite: l.unite, ...(l.cle ? { cle: l.cle } : {}) }]);
    setAjoute(l.designation);
  };

  async function creer() {
    if (lignes.length === 0) return;
    setPending(true);
    setErreur(null);
    try {
      const q = await api<Quantitatif>("/v1/quantitatifs?ecran=1", {
        method: "POST",
        body: { lignes: lignes.map((l) => ({ libelle: l.designation.trim(), quantite: l.qte.trim() || null, unite: l.unite.trim() || null })) },
      });
      // Les caractéristiques et précisions : sur la ligne, comme une précision de la liste (rien d'inventé).
      const aPreciser = lignes.some((l) => l.precision.trim());
      const ecran = !aPreciser ? null : (q.ecran ?? (await api<Quantitatif>(`/v1/quantitatifs/${encodeURIComponent(q.id)}?ecran=1`).catch(() => null))?.ecran);
      if (ecran) {
        const parPosition = [...ecran.lines].sort((a, c) => a.position - c.position);
        for (const [i, l] of lignes.entries()) {
          const p = l.precision.trim();
          const ligne = parPosition[i];
          const item = ligne ? ecran.purchase.toBuy.find((x) => x.lineIds.includes(ligne.id)) : undefined;
          if (p && item) await api(`/v1/quantitatifs/${encodeURIComponent(q.id)}/corrections`, { method: "POST", body: { action: "preciser", id: item.key, precision: p } }).catch(() => undefined);
        }
      }
      b.effacer();
      router.push(`/chantiers/${q.projetId}`);
    } catch (e) {
      setErreur(e instanceof ApiError && e.message ? e.message : "La liste n'est pas créée. Réessaie dans un instant.");
      setPending(false);
    }
  }

  const aPreciser = lignes.filter((l) => !l.qte.trim()).length;
  const listeEnCours = (
          <section aria-label="Ma liste en cours" className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">
              Ma liste · {lignes.length}
              {aPreciser > 0 ? <span className="ml-2 rounded-full bg-[#FFE9D6] px-2 py-0.5 text-[12px] font-bold tracking-normal text-[#8A3D06] normal-case">{aPreciser} à préciser</span> : null}
            </h3>
            <ul className="flex flex-col gap-2">
              {lignes.map((l, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {l.qte.trim() ? <span className="rounded-full bg-ok-bg px-2.5 py-0.5 text-[13px] font-bold text-ok">Complète</span> : <span className="rounded-full bg-[#FFE9D6] px-2.5 py-0.5 text-[13px] font-bold text-[#8A3D06]">Quantité à préciser</span>}
                  </span>
                  {l.origine === "mobiiz" ? <span className="self-start rounded-full bg-[#FFE9D6] px-2.5 py-0.5 text-[13px] font-bold text-[#8A3D06]">Proposé par Mobiiz · vérifie et complète</span> : null}
                  <div className="flex items-start gap-2">
                    <label className="flex grow flex-col gap-1 text-[13px] font-semibold text-muted">
                      Désignation
                      <input value={l.designation} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...sansOrigine(x), designation: e.target.value } : x)))} className={INPUT} />
                    </label>
                    <button type="button" aria-label={`Retirer ${l.designation}`} onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))} className="mt-6 grid size-11 shrink-0 place-items-center rounded-full text-muted">
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                  <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
                    Caractéristiques ou précision
                    <input value={l.precision} placeholder="Teinte, dimensions, finition… (facultatif)" onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, precision: e.target.value } : x)))} className={INPUT} />
                  </label>
                  <div className="flex gap-2">
                    <label className="flex w-36 flex-col gap-1 text-[13px] font-semibold text-muted">
                      Quantité
                      <input inputMode="decimal" value={l.qte} placeholder="À préciser" aria-label={`Quantité de ${l.designation}`} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...sansOrigine(x), qte: e.target.value } : x)))} className={INPUT} />
                    </label>
                    <label className="flex grow flex-col gap-1 text-[13px] font-semibold text-muted">
                      Unité
                      <select value={l.unite} aria-label={`Unité de ${l.designation}`} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, unite: e.target.value } : x)))} className={INPUT}>
                        {[...new Set([...UNITES, l.unite])].map((u) => (
                          <option key={u} value={u}>
                            {u || "À préciser"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </section>
  );

  const sortir = () => (lignes.length > 0 ? setQuitter(true) : onFermer());

  return (
    <div role="dialog" aria-modal="true" aria-label="Saisir ma liste" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2.5">
        <button type="button" onClick={sortir} aria-label="Retour" className="pressable grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[19px] font-extrabold">Ma liste</h2>
        {/* l'aide a son nom, dans l'en-tête : elle ne recouvre ni la liste ni le bouton du bas. */}
        <button type="button" onClick={() => setAide(true)} className="pressable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-bold whitespace-nowrap text-white">
          <Sparkles size={16} aria-hidden="true" className="text-[#FED206]" />
          Mobiiz m&apos;aide
        </button>
      </header>
      {/* Ordinateur : le catalogue à gauche, la liste en cours à droite ; avec Mobiiz ouvert, la liste à gauche et
          la conversation à droite. Le téléphone garde ses écrans successifs. */}
      <div className={`flex min-h-0 w-full flex-1 flex-col lg:flex-row ${aide ? "lg:w-1/2" : ""}`}>
      <div className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-6 lg:mx-0 lg:max-w-none lg:px-8 ${aide ? "lg:hidden" : ""}`}>
        <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">Quels matériaux veux-tu ajouter&nbsp;?</h3>
        <CatalogueListes mode="liste" familleAchat={null} onAjouter={ajouter} />
        {ajoute ? (
          <p role="status" className="text-[14px] font-semibold text-ok">
            « {ajoute} » est dans ta liste.
          </p>
        ) : null}
        <div className="lg:hidden">{lignes.length > 0 ? listeEnCours : null}</div>
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </div>
      <aside aria-label="Ma liste" className={`hidden min-h-0 flex-col border-l border-line lg:flex ${aide ? "lg:w-full lg:border-l-0" : "lg:w-[28rem] xl:w-[32rem]"}`}>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pt-5 pb-4">
          {lignes.length > 0 ? (
            listeEnCours
          ) : (
            <>
              <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Ma liste · 0</h3>
              <p className="rounded-xl border border-dashed border-line p-4 text-[15px] text-muted">Ta liste est vide. Choisis un matériau dans le catalogue, ou touche « Mobiiz m&apos;aide » pour partir d&apos;une photo, d&apos;un document ou de ce que tu dis.</p>
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-line px-6 py-3">
          <button type="button" disabled={lignes.length === 0 || pending} onClick={() => void creer()} className="pressable flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-5 text-[16px] font-bold text-on-accent disabled:bg-line disabled:text-muted">
            {pending ? "Je crée ton quantitatif…" : boutonSaisie(lignes.length)}
          </button>
        </div>
      </aside>
      </div>
      {/* Le bouton principal, toujours visible au-dessus de la zone du geste ; jamais sous la barre du menu (plein écran). */}
      <div className="shrink-0 border-t border-line bg-ground px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">
        <button
          type="button"
          disabled={lignes.length === 0 || pending}
          onClick={() => void creer()}
          className="pressable mx-auto flex min-h-13 w-full max-w-2xl items-center justify-center rounded-full bg-accent px-5 text-[16px] font-bold text-on-accent disabled:bg-line disabled:text-muted"
        >
          {pending ? "Je crée ton quantitatif…" : boutonSaisie(lignes.length)}
        </button>
      </div>
      {aide ? (
        <NouveauQuantitatif
          existantes={lignes.map((l) => l.designation)}
          onFermer={() => setAide(false)}
          surAjout={(ls) => {
            setLignes((avant) => [...avant, ...ls.map((l) => ({ designation: l.libelle, precision: "", qte: l.quantite ?? "", unite: l.unite ?? "", origine: "mobiiz" as const }))]);
            setAjoute(ls.length > 1 ? `${ls.length} matériaux proposés par Mobiiz` : ls[0]!.libelle);
          }}
        />
      ) : null}
      {quitter ? (
        <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/40 p-4 lg:items-center" onClick={() => setQuitter(false)}>
          <div role="alertdialog" aria-modal="true" aria-label="Quitter la saisie ?" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-card">
            <h3 className="text-[18px] font-extrabold">Quitter la saisie ?</h3>
            <p className="text-[15px] text-muted">
              Tes {lignes.length} matériau{lignes.length > 1 ? "x" : ""} restent en brouillon : tu les retrouves en revenant sur « Saisir ma liste ».
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuitter(false)} className="pressable min-h-12 grow rounded-full border border-line font-semibold">
                Rester
              </button>
              <button type="button" onClick={onFermer} className="pressable min-h-12 grow rounded-full bg-ink font-bold text-white">
                Quitter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
