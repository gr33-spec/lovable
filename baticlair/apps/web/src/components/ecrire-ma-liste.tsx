"use client";

import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, INPUT } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useBrouillon } from "@/lib/brouillon";

/**
 * « ÉCRIS TA LISTE » EN PLEIN ÉCRAN (Greg, 28 octobre 2026, point 1 : « le clavier recouvre le champ, je tape à
 * l'aveugle ») : le champ est en haut, sous le titre, jamais derrière le clavier ; chaque ligne ajoutée apparaît au-dessus,
 * modifiable (un tap la remet dans le champ) et supprimable (la croix) ; Entrée ajoute ; pendant la frappe, les références
 * du catalogue se proposent et se choisissent d'un tap ; sinon la ligne reste en texte libre, « à vérifier » ; « Terminé »
 * reste visible au-dessus du clavier (dans l'en-tête de l'écran, pas en bas).
 *
 * INTITULÉ ET QUANTITÉ SÉPARÉS (Greg, 30 octobre 2026 : « crochet gouttière bandeau 25 », le 25 lu comme la quantité alors
 * que c'est le développé) : l'intitulé s'écrit tel quel, chiffres compris, dans son champ ; la quantité et l'unité ont les
 * leurs. Rien n'est deviné dans l'intitulé, et rien ne bloque l'ajout : sans quantité, la ligne part « à vérifier ». Les
 * propositions mêlent le catalogue et les intitulés déjà écrits par l'entreprise elle-même (`ecrits`) ; ceux des autres
 * ne passent qu'une fois ajoutés au catalogue par l'admin (Greg, 30 octobre 2026, nuit).
 */
export interface LigneEcrite {
  libelle: string;
  quantite: string;
  unite: string;
}

/** « Ardoise 32×22, 900 pièces » → libellé, quantité, unité ; sans nombre, la quantité reste vide (à vérifier). */
export function analyserLigne(texte: string): LigneEcrite {
  const t = texte.trim().replace(/\s+/g, " ");
  // La quantité est le DERNIER nombre (« Ardoise 32×22, 1800 pièces » : 1800, jamais le 32 du format) ; l'unité n'a pas de chiffre, sauf m2 / m3.
  const m = /^(.+?)[\s,;:·]+(\d+(?:[.,]\d+)?)\s*([^\d\s][^\d]*?[23]?)?\s*$/.exec(t);
  if (!m) return { libelle: t, quantite: "", unite: "pièces" };
  return { libelle: m[1]!.replace(/[\s,;:·]+$/, ""), quantite: m[2]!.replace(",", "."), unite: (m[3] ?? "").trim() || "pièces" };
}

/** Les unités proposées ; celle d'une proposition du catalogue s'ajoute si elle manque. */
const UNITES = ["pièces", "m", "m²", "m³", "kg", "L", "rouleaux", "boîtes", "sacs", "paquets", "palettes", "longueurs"];

export function EcrireMaListe({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  // Correction après test de Greg (30 octobre 2026, point 2) : la liste commencée est gardée sur le serveur ; fermer,
  // passer par le menu puis revenir la rouvre telle quelle (l'accueil propose « Reprendre ta liste »).
  const b = useBrouillon<{ lignes: LigneEcrite[]; texte: string; quantite?: string; unite?: string }>(
    "liste:nouvelle",
    { type: "liste", url: "/chantiers/nouveau?liste=1", titre: (d) => `Ta liste · ${d.lignes.length} ligne${d.lignes.length > 1 ? "s" : ""}`, vide: (d) => d.lignes.length === 0 && !d.texte.trim() },
    { lignes: [], texte: "", quantite: "", unite: "pièces" },
  );
  const { lignes, texte } = b.donnees;
  const quantite = b.donnees.quantite ?? "";
  const unite = b.donnees.unite || "pièces";
  const setLignes = (f: (ls: LigneEcrite[]) => LigneEcrite[]) => b.modifier((d) => ({ ...d, lignes: f(d.lignes) }));
  const saisir = (c: { texte?: string; quantite?: string; unite?: string }) => b.modifier((d) => ({ ...d, ...c }));
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const champQte = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  // Les références du catalogue et les intitulés de l'entreprise, dès deux lettres tapées (chiffres compris).
  const mot = texte.trim().length >= 2 ? texte.trim() : "";
  // Le catalogue complet (point 3 du 30 octobre) : les mots du chantier, fautes admises (« pane » → Panne).
  const fetchCat = useCallback(
    (signal: AbortSignal) =>
      mot ? api<{ resultats: { designation: string; unite: string }[] | null; ecrits?: { designation: string; unite: string }[] | null }>(`/v1/catalogue?q=${encodeURIComponent(mot)}`, { signal }).catch(() => null) : Promise.resolve(null),
    [mot],
  );
  const { data: cat } = useResource(fetchCat);
  const suggestions = mot ? [...(cat?.resultats ?? []).slice(0, 3), ...(cat?.ecrits ?? [])].filter((r) => r.designation.toLowerCase() !== mot.toLowerCase()).slice(0, 5) : [];
  const unites = UNITES.includes(unite) ? UNITES : [...UNITES, unite];

  useEffect(() => {
    champ.current?.focus();
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [onFermer]);
  useEffect(() => {
    liste.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [lignes.length]);

  const enCours = (): LigneEcrite => ({ libelle: texte.trim().replace(/\s+/g, " "), quantite: quantite.trim().replace(",", "."), unite });
  const ajouter = () => {
    if (!texte.trim()) return;
    const l = enCours();
    b.modifier((d) => ({ ...d, lignes: [...d.lignes, l], texte: "", quantite: "", unite: "pièces" }));
    champ.current?.focus();
  };
  const reprendre = (i: number) => {
    const l = lignes[i]!;
    b.modifier((d) => ({ ...d, lignes: d.lignes.filter((_, j) => j !== i), texte: l.libelle, quantite: l.quantite, unite: l.unite || "pièces" }));
    champ.current?.focus();
  };
  const choisir = (r: { designation: string; unite: string }) => {
    saisir({ texte: r.designation, unite: r.unite || unite });
    champQte.current?.focus();
  };
  async function terminer() {
    const toutes = texte.trim() ? [...lignes, enCours()] : lignes;
    if (toutes.length === 0) return onFermer();
    setPending(true);
    setErreur(null);
    try {
      const q = await api<{ projetId: string }>("/v1/quantitatifs", { method: "POST", body: { lignes: toutes.map((l) => ({ libelle: l.libelle, quantite: l.quantite || null, unite: l.unite || "pièces" })) } });
      b.effacer();
      router.push(`/chantiers/${q.projetId}`);
    } catch (e) {
      setErreur(messageErreur(e));
      setPending(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Écris ta liste" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-ground">
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={onFermer} aria-label="Fermer" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
          <X size={20} aria-hidden="true" />
        </button>
        <h1 className="grow truncate text-[20px] font-extrabold">Écris ta liste</h1>
        <Button variant="ink" pending={pending} onClick={() => void terminer()} className="min-h-11 shrink-0 px-5">
          <Check size={18} aria-hidden="true" /> Terminé
        </Button>
      </div>
      <div className="flex min-h-0 flex-col gap-2 px-4">
        {lignes.length ? (
          <ul ref={liste} aria-label="Ma liste" className="flex max-h-[30dvh] flex-col gap-1.5 overflow-y-auto">
            {lignes.map((l, i) => (
              <li key={`${l.libelle}-${i}`} className="flex items-center gap-1 rounded-xl bg-surface pl-3 shadow-card">
                <button type="button" onClick={() => reprendre(i)} aria-label={`Modifier : ${l.libelle}`} className="flex min-h-11 min-w-0 grow items-center gap-2 py-2 text-left text-[15px]">
                  <span className="truncate font-semibold">{l.libelle}</span>
                  <span className="shrink-0 whitespace-nowrap text-muted">{l.quantite ? `${l.quantite} ${l.unite}` : "quantité ?"}</span>
                  {!l.quantite ? <span className="shrink-0 rounded-full bg-warn-bg px-2 py-0.5 text-[12px] font-semibold text-warn">à vérifier</span> : null}
                </button>
                <button type="button" onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))} aria-label={`Retirer : ${l.libelle}`} className="grid size-11 shrink-0 place-items-center rounded-full text-muted">
                  <X size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          ref={champ}
          aria-label="Intitulé"
          value={texte}
          onChange={(e) => saisir({ texte: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (texte.trim()) champQte.current?.focus();
            }
          }}
          placeholder={lignes.length ? "Ligne suivante…" : "Crochet gouttière bandeau 25"}
          enterKeyHint="next"
          autoComplete="off"
          className={`${INPUT} w-full`}
        />
        <div className="flex items-center gap-2">
          <input
            ref={champQte}
            aria-label="Quantité"
            value={quantite}
            onChange={(e) => saisir({ quantite: e.target.value.replace(/[^\d.,]/g, "") })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ajouter();
              }
            }}
            placeholder="Qté"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            className={`${INPUT} w-24 shrink-0 text-center`}
          />
          <select aria-label="Unité" value={unite} onChange={(e) => saisir({ unite: e.target.value })} className={`${INPUT} min-w-0 grow`}>
            {unites.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button type="button" onClick={ajouter} disabled={!texte.trim()} aria-label="Ajouter la ligne" className="pressable grid size-13 shrink-0 place-items-center rounded-full bg-accent text-on-accent disabled:opacity-40">
            <Plus size={22} aria-hidden="true" />
          </button>
        </div>
        {suggestions.length ? (
          <ul aria-label="Références proposées" className="flex flex-wrap gap-2">
            {suggestions.map((r) => (
              <li key={r.designation}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choisir(r)} className="pressable inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3 text-left text-[14px] font-semibold">
                  {r.designation}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">{lignes.length ? "Un tap sur une ligne la modifie. Sans quantité, elle reste à vérifier." : "Écris l'intitulé comme tu veux, puis la quantité. Elle peut attendre."}</p>
        )}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  );
}
