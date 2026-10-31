"use client";

import { ChevronLeft, ChevronRight, PenLine, Plus, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, INPUT } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LE CATALOGUE EN LISTES (correction après test de Greg, 30 octobre 2026, points 3 et 4) : en haut, « Métier : Couverture
 * ▾ » (les métiers du profil d'abord, un toucher pour changer) ; puis un toucher par niveau, famille › produit › format ;
 * la recherche (mots du chantier, fautes admises) en complément ; et toujours en bas, « Je ne trouve pas : je décris mon
 * besoin », une ligne libre qui part quand même. Un achat groupé reste d'un seul métier : un produit d'un autre métier
 * se met de côté pour l'achat groupé de son métier.
 */
export interface ArticleCatalogueVue {
  cle: string;
  metier: string;
  famille: string;
  produit: string;
  variante: string | null;
  designation: string;
  unite: string;
  familleAchat: string;
}

interface Metier {
  code: string;
  libelle: string;
  mien: boolean;
  familleAchat: string;
}

interface Reponse {
  metiers: Metier[];
  metier: string;
  resultats: ArticleCatalogueVue[] | null;
  arbre: { libelle: string; produits: { libelle: string; article: ArticleCatalogueVue | null; variantes: { libelle: string; article: ArticleCatalogueVue }[] }[] }[] | null;
}

export interface LigneChoisie {
  designation: string;
  unite: string;
  qte: string;
  cle?: string;
  libre?: boolean;
  familleAchat?: string;
  /** Le métier du catalogue (pour mettre de côté un produit d'un autre métier). */
  metier?: string;
}

const UNITES = ["pièces", "m", "m²", "m³", "kg", "sacs", "rouleaux", "palettes", "boîtes", "litres", "pots"];
const BOUTON = "pressable flex min-h-13 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left text-[16px] font-semibold";
const LIEN = "min-h-11 self-start text-[15px] font-semibold text-accent-text underline underline-offset-4";
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

export function CatalogueListes({ familleAchat, onAjouter, onAutreMetier }: { familleAchat: string | null; onAjouter: (l: LigneChoisie) => void; onAutreMetier?: (l: LigneChoisie, metier: Metier) => void }) {
  const [metier, setMetier] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [chemin, setChemin] = useState<{ famille: string | null; produit: string | null }>({ famille: null, produit: null });
  const [article, setArticle] = useState<ArticleCatalogueVue | null>(null);
  const [qte, setQte] = useState("");
  const [libre, setLibre] = useState(false);
  const [libreTexte, setLibreTexte] = useState("");
  const [libreQte, setLibreQte] = useState("");
  const [libreUnite, setLibreUnite] = useState("pièces");
  const [autre, setAutre] = useState<{ ligne: LigneChoisie; metier: Metier } | null>(null);
  const recherche = q.trim();
  const charger = useCallback((signal: AbortSignal) => api<Reponse>(`/v1/catalogue?${new URLSearchParams({ ...(metier ? { metier } : {}), ...(recherche ? { q: recherche } : {}) })}`, { signal }), [metier, recherche]);
  const { data } = useResource(charger);
  const metiers = data?.metiers ?? [];
  const courant = metiers.find((m) => m.code === (metier ?? data?.metier)) ?? null;

  const choisir = (a: ArticleCatalogueVue) => {
    setArticle(a);
    setQte("");
  };
  const ajouter = (l: LigneChoisie) => {
    // Un achat groupé reste d'un seul métier : un produit d'un autre métier se met de côté pour le sien.
    const m = metiers.find((x) => x.code === l.metier) ?? null;
    if (familleAchat && l.familleAchat && l.familleAchat !== familleAchat && m) {
      setAutre({ ligne: l, metier: m });
      return;
    }
    onAjouter(l);
    setArticle(null);
    setChemin({ famille: null, produit: null });
    setQte("");
  };

  if (autre)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        <p className="text-[16px] font-bold">
          {autre.ligne.designation} est de la {autre.metier.libelle.toLowerCase()}.
        </p>
        <p className="text-[15px]">Un achat groupé reste d&apos;un seul métier. Mets-le dans l&apos;achat groupé {autre.metier.libelle.toLowerCase()} : tu le retrouves sur l&apos;accueil.</p>
        {onAutreMetier ? (
          <Button
            onClick={() => {
              onAutreMetier(autre.ligne, autre.metier);
              setAutre(null);
              setArticle(null);
            }}
          >
            Le mettre dans l&apos;achat groupé {autre.metier.libelle.toLowerCase()}
          </Button>
        ) : null}
        <button type="button" onClick={() => setAutre(null)} className={LIEN}>
          Annuler
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Point 4 : le sélecteur visible, un toucher pour changer de métier ; les métiers du profil en premier. */}
      <label className="flex min-h-13 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[16px] font-semibold">
        <span className="shrink-0 text-muted">Métier :</span>
        <select
          aria-label="Métier"
          value={courant?.code ?? ""}
          onChange={(e) => {
            setMetier(e.target.value);
            setChemin({ famille: null, produit: null });
            setArticle(null);
          }}
          className="min-h-12 grow bg-transparent font-bold outline-none"
        >
          {metiers.some((m) => m.mien) ? (
            <optgroup label="Tes métiers">
              {metiers
                .filter((m) => m.mien)
                .map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.libelle}
                  </option>
                ))}
            </optgroup>
          ) : null}
          <optgroup label="Autres métiers">
            {metiers
              .filter((m) => !m.mien)
              .map((m) => (
                <option key={m.code} value={m.code}>
                  {m.libelle}
                </option>
              ))}
          </optgroup>
        </select>
      </label>

      {article ? (
        <div className="flex flex-col gap-3 rounded-xl bg-ground p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setArticle(null)} aria-label="Choix précédent" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <p className="text-[16px] font-semibold">{article.designation}</p>
          </div>
          <label htmlFor="qte-article" className="text-[16px] font-semibold">
            Combien ?
          </label>
          <div className="flex items-center gap-3">
            <input id="qte-article" aria-label={`Quantité de ${article.designation}`} inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} placeholder="Quantité" className={`${INPUT} max-w-40`} autoFocus onKeyDown={(e) => e.key === "Enter" && nombre(qte) > 0 && (e.preventDefault(), ajouter({ designation: article.designation, unite: article.unite, qte, cle: article.cle, familleAchat: article.familleAchat, metier: article.metier }))} />
            <span className="text-[16px] text-muted">{article.unite}</span>
          </div>
          <Button variant="ink" disabled={!(nombre(qte) > 0)} onClick={() => ajouter({ designation: article.designation, unite: article.unite, qte, cle: article.cle, familleAchat: article.familleAchat, metier: article.metier })}>
            <Plus size={18} aria-hidden="true" /> Ajouter à ma liste
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <label htmlFor="cherche-catalogue" className="sr-only">
              Chercher un matériau
            </label>
            <input id="cherche-catalogue" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ou cherche : panne, liteau, crochet…" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" autoComplete="off" />
          </div>
          {!data ? (
            <p className="text-[15px] text-muted">Chargement du catalogue…</p>
          ) : recherche ? (
            <ul aria-label="Résultats" className="flex flex-col gap-2">
              {(data.resultats ?? []).map((a) => (
                <li key={a.cle}>
                  <button type="button" onClick={() => choisir(a)} className={BOUTON}>
                    <span className="flex flex-col">
                      <span>{a.designation}</span>
                      {a.metier !== courant?.code ? <span className="text-[13px] font-normal text-muted">{metiers.find((m) => m.code === a.metier)?.libelle}</span> : null}
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {data.resultats?.length === 0 ? <li className="text-[15px] text-muted">Rien de ce nom. Décris-le ci-dessous, il partira quand même.</li> : null}
            </ul>
          ) : (
            <Niveaux data={data} chemin={chemin} onChemin={setChemin} onArticle={choisir} />
          )}
        </>
      )}

      {/* Toujours en bas : la ligne libre, qui part quand même (sans être cumulée). */}
      {libre ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line p-4">
          <label htmlFor="libre-texte" className="text-[16px] font-semibold">
            Décris ton besoin
          </label>
          <input id="libre-texte" value={libreTexte} onChange={(e) => setLibreTexte(e.target.value)} placeholder="Ex. faîtière ventilée modèle ancien" className={INPUT} autoFocus />
          <div className="flex gap-2">
            <input aria-label="Quantité de la ligne libre" inputMode="decimal" value={libreQte} onChange={(e) => setLibreQte(e.target.value)} placeholder="Quantité" className={`${INPUT} max-w-32`} />
            <select aria-label="Unité de la ligne libre" value={libreUnite} onChange={(e) => setLibreUnite(e.target.value)} className={`${INPUT} grow`}>
              {UNITES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <Button
            variant="ink"
            disabled={libreTexte.trim().length < 3 || !(nombre(libreQte) > 0)}
            onClick={() => {
              ajouter({ designation: libreTexte.trim(), unite: libreUnite, qte: libreQte, libre: true });
              setLibre(false);
              setLibreTexte("");
              setLibreQte("");
            }}
          >
            <Plus size={18} aria-hidden="true" /> Ajouter cette ligne
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setLibre(true)} className="pressable flex min-h-13 items-center gap-3 rounded-xl px-1 text-left text-[15px] font-semibold text-accent-text">
          <PenLine size={18} aria-hidden="true" /> Je ne trouve pas : je décris mon besoin.
        </button>
      )}
    </div>
  );
}

function Niveaux({ data, chemin, onChemin, onArticle }: { data: Reponse; chemin: { famille: string | null; produit: string | null }; onChemin: (c: { famille: string | null; produit: string | null }) => void; onArticle: (a: ArticleCatalogueVue) => void }) {
  const familles = data.arbre ?? [];
  const famille = familles.find((f) => f.libelle === chemin.famille) ?? null;
  const produit = famille?.produits.find((p) => p.libelle === chemin.produit) ?? null;
  const retour = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChemin(produit ? { famille: chemin.famille, produit: null } : { famille: null, produit: null })} aria-label="Choix précédent" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <p className="text-[15px] font-semibold">{[chemin.famille, chemin.produit].filter(Boolean).join(" › ")}</p>
    </div>
  );
  if (produit)
    return (
      <>
        {retour}
        <ul aria-label={produit.libelle} className="flex flex-col gap-2">
          {produit.variantes.map((v) => (
            <li key={v.libelle}>
              <button type="button" onClick={() => onArticle(v.article)} className={BOUTON}>
                {v.libelle}
                <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  if (famille)
    return (
      <>
        {retour}
        <ul aria-label={famille.libelle} className="flex flex-col gap-2">
          {famille.produits.map((p) => (
            <li key={p.libelle}>
              <button type="button" onClick={() => (p.article && p.variantes.length === 0 ? onArticle(p.article) : onChemin({ famille: famille.libelle, produit: p.libelle }))} className={BOUTON}>
                {p.libelle}
                <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <ul aria-label="Familles" className="flex flex-col gap-2">
      {familles.map((f) => (
        <li key={f.libelle}>
          <button type="button" onClick={() => onChemin({ famille: f.libelle, produit: null })} className={BOUTON}>
            {f.libelle}
            <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
