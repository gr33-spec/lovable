"use client";

import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type Quantitatif } from "@/lib/api";
import { useBrouillon } from "@/lib/brouillon";
import { CatalogueListes, type LigneChoisie } from "./catalogue-listes";
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
}

const UNITES = ["", "pièces", "m", "m²", "m³", "kg", "sacs", "rouleaux", "palettes", "boîtes", "litres", "pots"];

export function boutonSaisie(n: number): string {
  return n === 0 ? "Sélectionne un matériau" : n === 1 ? "Ajouter 1 matériau à ma liste" : `Ajouter ${n} matériaux à ma liste`;
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

  const sortir = () => (lignes.length > 0 ? setQuitter(true) : onFermer());

  return (
    <div role="dialog" aria-modal="true" aria-label="Saisir ma liste" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2.5">
        <button type="button" onClick={sortir} aria-label="Retour" className="pressable grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <h2 className="text-[19px] font-extrabold">Saisir ma liste</h2>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
        <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">Quels matériaux veux-tu ajouter ?</h3>
        <CatalogueListes mode="liste" familleAchat={null} onAjouter={ajouter} />
        {ajoute ? (
          <p role="status" className="text-[14px] font-semibold text-ok">
            « {ajoute} » est dans ta liste.
          </p>
        ) : null}
        {lignes.length > 0 ? (
          <section aria-label="Ma liste en cours" className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Ma liste · {lignes.length}</h3>
            <ul className="flex flex-col gap-2">
              {lignes.map((l, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-start gap-2">
                    <label className="flex grow flex-col gap-1 text-[13px] font-semibold text-muted">
                      Désignation
                      <input value={l.designation} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, designation: e.target.value } : x)))} className={INPUT} />
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
                      <input inputMode="decimal" value={l.qte} placeholder="À préciser" aria-label={`Quantité de ${l.designation}`} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, qte: e.target.value } : x)))} className={INPUT} />
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
        ) : null}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </div>
      {/* Le bouton principal, toujours visible au-dessus de la zone du geste ; jamais sous la barre du menu (plein écran). */}
      <div className="shrink-0 border-t border-line bg-ground px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <button
          type="button"
          disabled={lignes.length === 0 || pending}
          onClick={() => void creer()}
          className="pressable mx-auto flex min-h-13 w-full max-w-2xl items-center justify-center rounded-full bg-accent px-5 text-[16px] font-bold text-on-accent disabled:bg-line disabled:text-muted"
        >
          {pending ? "Je crée ta liste…" : boutonSaisie(lignes.length)}
        </button>
      </div>
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
