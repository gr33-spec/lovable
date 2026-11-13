"use client";

import { ChevronLeft, ChevronRight, ChevronsUpDown, PenLine, Plus, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, INPUT } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/** Greg, 1er novembre 2026 : le message d'une liste qui couvre plusieurs familles (remplace le blocage par métier). */
export const PHRASE_PLUSIEURS_FAMILLES = "Cette liste contient plusieurs familles de matériaux. MOBIIZ va les organiser en lots adaptés. Vérifie la répartition avant de continuer.";

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
  /** En recherche : où l'article se range, les autres catalogues qui le partagent, ce que son format précise déjà. */
  chemin?: { catalogue: string; rayon: string; famille: string; produit: string } | null;
  autresCatalogues?: string[];
  caracteristiques?: string[];
  precisions?: string[];
  /** Marqué « à vérifier » par l'équipe Mobiiz : dit sur la ligne, rien n'est affirmé à la place de l'artisan. */
  aVerifier?: boolean;
}

interface Metier {
  code: string;
  libelle: string;
  mien: boolean;
  familleAchat: string;
  /** Greg, 13 novembre 2026 : un métier pas encore réellement fourni reste visible et se dit « en cours d'enrichissement ». */
  enEnrichissement?: boolean;
}

interface Reponse {
  metiers: Metier[];
  metier: string;
  resultats: ArticleCatalogueVue[] | null;
  /** Les intitulés déjà écrits par l'entreprise, et ceux écrits par plusieurs artisans (« Écris ta liste », gardés). */
  ecrits?: { designation: string; unite: string }[] | null;
  communes?: { designation: string; unite: string }[] | null;
  arbre: { libelle: string; produits: { libelle: string; article: ArticleCatalogueVue | null; variantes: { libelle: string; article: ArticleCatalogueVue }[] }[] }[] | null;
  /** Le catalogue du métier en rayons (Greg, 12 novembre 2026) : rayon › famille › produit › caractéristiques. */
  rayons?: RayonVue[] | null;
}

/** Un choix à faire pour arriver à un article : la caractéristique et ses valeurs, chacune avec la suite. */
export interface ChoixVue {
  nom: string;
  options: { valeur: string; suite: ChoixVue | null; article: ArticleCatalogueVue | null }[];
}
export interface ProduitVue {
  libelle: string;
  /** Ce qu'il reste à choisir, en une ligne (« Matériau, finition, épaisseur »). */
  indication: string;
  nombre: number;
  precisions: { nom: string; niveau: "utile" | "facultative"; exemple?: string }[];
  article: ArticleCatalogueVue | null;
  choix: ChoixVue | null;
}
export interface RayonVue {
  libelle: string;
  familles: { libelle: string; produits: ProduitVue[] }[];
}
interface Chemin {
  rayon: string | null;
  famille: string | null;
  produit: string | null;
  /** Les valeurs déjà choisies du produit, dans l'ordre (« zinc », « naturel »). */
  choisis: string[];
}
const DEPART: Chemin = { rayon: null, famille: null, produit: null, choisis: [] };

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

export function CatalogueListes({
  familleAchat,
  onAjouter,
  onAutreMetier,
  mode = "achat-groupe",
}: {
  familleAchat: string | null;
  onAjouter: (l: LigneChoisie) => void;
  onAutreMetier?: (l: LigneChoisie, metier: Metier) => void;
  /**
   * « Saisir ma liste » (Greg, 31 octobre 2026) : le même sélecteur, sans la logique de l'achat groupé. En mode « liste » :
   * « Rechercher un matériau… », la quantité peut attendre (rien n'est inventé), ce qui est tapé s'ajoute tel quel
   * (catalogue jamais fermé), « Ajouter à la sélection » (Greg, 1er novembre 2026). L'achat groupé garde son comportement (valeur par défaut).
   */
  mode?: "achat-groupe" | "liste";
}) {
  const liste = mode === "liste";
  const [metier, setMetier] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [chemin, setChemin] = useState<Chemin>(DEPART);
  const [article, setArticle] = useState<ArticleCatalogueVue | null>(null);
  /** Les précisions libres du produit choisi (teinte, gamme) : écrites, ajoutées à la désignation, jamais un article de plus. */
  const [precisions, setPrecisions] = useState<{ defs: ProduitVue["precisions"]; valeurs: Record<string, string> }>({ defs: [], valeurs: {} });
  const [qte, setQte] = useState("");
  const [libre, setLibre] = useState(false);
  const [libreTexte, setLibreTexte] = useState("");
  const [libreQte, setLibreQte] = useState("");
  const [libreUnite, setLibreUnite] = useState(liste ? "" : "pièces");
  const [autre, setAutre] = useState<{ ligne: LigneChoisie; metier: Metier } | null>(null);
  const recherche = q.trim();
  const charger = useCallback((signal: AbortSignal) => api<Reponse>(`/v1/catalogue?${new URLSearchParams({ ...(metier ? { metier } : {}), ...(recherche ? { q: recherche } : {}) })}`, { signal }), [metier, recherche]);
  const { data } = useResource(charger);
  // Les métiers une fois reçus restent affichés pendant qu'une recherche ou un changement de métier recharge : le
  // sélecteur ne se vide jamais (Greg, 12 novembre 2026, iPhone : « pas réactif, parfois la liste ne se déroule pas »).
  const [garde, setGarde] = useState<{ metiers: Metier[]; metier: string } | null>(null);
  if (data?.metiers.length && (garde?.metiers !== data.metiers || garde.metier !== data.metier)) setGarde({ metiers: data.metiers, metier: data.metier });
  const metiers = data?.metiers.length ? data.metiers : (garde?.metiers ?? []);
  const courant = metiers.find((m) => m.code === (metier ?? data?.metier ?? garde?.metier)) ?? null;

  const choisir = (a: ArticleCatalogueVue, defs: ProduitVue["precisions"] = []) => {
    setArticle(a);
    setPrecisions({ defs, valeurs: {} });
    setQte("");
  };
  /** La désignation qui part : celle de l'article, suivie des précisions écrites (« … · teinte : RAL 7016 »). */
  const designationDe = (a: ArticleCatalogueVue) =>
    [a.designation, ...precisions.defs.map((d) => [d.nom, (precisions.valeurs[d.nom] ?? "").trim()] as const).filter(([, v]) => v).map(([n, v]) => `${n.toLowerCase()} : ${v}`)].join(" · ");
  const ajouter = (l: LigneChoisie) => {
    // Un achat groupé est organisé par métier : un produit d'un autre métier va dans le lot de son métier, sur accord.
    const m = metiers.find((x) => x.code === l.metier) ?? null;
    if (familleAchat && l.familleAchat && l.familleAchat !== familleAchat && m) {
      setAutre({ ligne: l, metier: m });
      return;
    }
    onAjouter(l);
    setArticle(null);
    // Le rayon et la famille restent ouverts : l'artisan ajoute souvent plusieurs produits de la même famille.
    setChemin((c) => ({ ...c, produit: null, choisis: [] }));
    setQte("");
    // Mode liste : la recherche repart à zéro pour le matériau suivant.
    if (liste) setQ("");
  };

  if (autre)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        {/* Greg, 1er novembre 2026 : plus de blocage « un achat groupé reste d'un seul métier » ; la liste est rangée en
            lots, l'artisan vérifie la répartition, rien ne rejoint un autre achat groupé sans son accord. */}
        <p className="text-[16px] font-bold">{PHRASE_PLUSIEURS_FAMILLES}</p>
        <p className="text-[15px]">
          {autre.ligne.designation} : lot {autre.metier.libelle.toLowerCase()}.
        </p>
        {onAutreMetier ? (
          <Button
            onClick={() => {
              onAutreMetier(autre.ligne, autre.metier);
              setAutre(null);
              setArticle(null);
            }}
          >
            Le ranger dans le lot {autre.metier.libelle.toLowerCase()}
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
      {/* Le sélecteur prend TOUTE la surface de la carte : un toucher n'importe où ouvre la liste du téléphone (avant,
          toucher « Métier : » ne faisait que poser le contour, sans rien dérouler). */}
      <div className="relative flex min-h-13 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[16px] font-semibold focus-within:border-accent">
        <span className="shrink-0 text-muted">Catalogue :</span>
        <span className="min-w-0 grow truncate font-bold">{courant?.libelle ?? "…"}</span>
        <ChevronsUpDown size={18} aria-hidden="true" className="shrink-0 text-muted" />
        <select
          aria-label="Métier"
          value={courant?.code ?? ""}
          onChange={(e) => {
            setMetier(e.target.value);
            setChemin(DEPART);
            setArticle(null);
          }}
          className="absolute top-0 left-0 size-full cursor-pointer appearance-none rounded-xl text-[16px] opacity-0"
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
      </div>

      {/* Greg, 13 novembre 2026 : un métier partiel reste ouvert ; il dit que son catalogue grandit, et l'on peut toujours écrire son matériau. */}
      {courant?.enEnrichissement ? (
        <div role="note" className="flex flex-col gap-1 rounded-xl border border-line bg-ground px-4 py-3">
          <p className="text-[15px] font-bold">Catalogue en cours d&apos;enrichissement</p>
          <p className="text-[14px] text-muted">Tous les matériaux de ce métier n&apos;y sont pas encore. Si le tien manque, écris-le : il part quand même.</p>
          {libre ? null : (
            <button type="button" onClick={() => setLibre(true)} className="pressable mt-1 flex min-h-11 items-center gap-2 self-start rounded-lg text-left text-[15px] font-semibold text-accent-text">
              <PenLine size={18} aria-hidden="true" /> Je saisis mon matériau
            </button>
          )}
        </div>
      ) : null}

      {article ? (
        <div className="flex flex-col gap-3 rounded-xl bg-ground p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setArticle(null)} aria-label="Choix précédent" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <p className="text-[16px] font-semibold">{designationDe(article)}</p>
          </div>
          {/* Les précisions utiles se proposent ; les facultatives se replient. Écrites, jamais un article de plus. */}
          {liste && precisions.defs.length ? (
            <div className="flex flex-col gap-2">
              {precisions.defs
                .filter((d) => d.niveau === "utile")
                .map((d) => (
                  <ChampPrecision key={d.nom} def={d} valeur={precisions.valeurs[d.nom] ?? ""} onChange={(v) => setPrecisions((p) => ({ ...p, valeurs: { ...p.valeurs, [d.nom]: v } }))} />
                ))}
              {precisions.defs.some((d) => d.niveau === "facultative") ? (
                <details className="rounded-xl border border-line bg-surface px-4 py-2">
                  <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-semibold">Plus de précisions (facultatif)</summary>
                  <div className="flex flex-col gap-2 pb-2">
                    {precisions.defs
                      .filter((d) => d.niveau === "facultative")
                      .map((d) => (
                        <ChampPrecision key={d.nom} def={d} valeur={precisions.valeurs[d.nom] ?? ""} onChange={(v) => setPrecisions((p) => ({ ...p, valeurs: { ...p.valeurs, [d.nom]: v } }))} />
                      ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
          <label htmlFor="qte-article" className="text-[16px] font-semibold">
            Combien ?
          </label>
          <div className="flex items-center gap-3">
            <input id="qte-article" aria-label={`Quantité de ${article.designation}`} inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} placeholder="Quantité" className={`${INPUT} max-w-40`} autoFocus onKeyDown={(e) => e.key === "Enter" && nombre(qte) > 0 && (e.preventDefault(), ajouter({ designation: designationDe(article), unite: article.unite, qte, cle: article.cle, familleAchat: article.familleAchat, metier: article.metier }))} />
            <span className="text-[16px] text-muted">{article.unite}</span>
          </div>
          <Button variant="ink" disabled={!liste && !(nombre(qte) > 0)} onClick={() => ajouter({ designation: designationDe(article), unite: article.unite, qte, ...(article.cle ? { cle: article.cle } : { libre: true }), familleAchat: article.familleAchat, metier: article.metier })}>
            <Plus size={18} aria-hidden="true" /> {liste ? "Ajouter à la sélection" : "Ajouter à ma liste"}
          </Button>
          {liste ? <p className="text-[13px] text-muted">La quantité peut attendre : tu la mettras dans ta liste.</p> : null}
        </div>
      ) : (
        <>
          <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <label htmlFor="cherche-catalogue" className="sr-only">
              {liste ? "Rechercher un matériau" : "Chercher un matériau"}
            </label>
            <input id="cherche-catalogue" value={q} onChange={(e) => setQ(e.target.value)} placeholder={liste ? "Rechercher un matériau…" : "Ou cherche : panne, liteau, crochet…"} className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" autoComplete="off" />
          </div>
          {!data ? (
            <p className="text-[15px] text-muted">Chargement du catalogue…</p>
          ) : recherche ? (
            <ul aria-label="Résultats" className="flex flex-col gap-2">
              {/* Mode liste : ce qui est tapé s'ajoute tel quel, sans produit imposé (le catalogue n'est jamais fermé). */}
              {liste && recherche.length >= 2 ? (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setLibreTexte(recherche);
                      setLibre(true);
                    }}
                    className={`${BOUTON} border-dashed`}
                  >
                    <span className="flex items-center gap-2">
                      <PenLine size={18} aria-hidden="true" className="shrink-0" />
                      <span>Ajouter « {recherche} » tel que je l&apos;écris</span>
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              ) : null}
              {/* Mode liste : les intitulés déjà écrits par toi, puis ceux d'autres artisans (jamais leur nom d'entreprise). */}
              {liste
                ? [...(data.ecrits ?? []).map((e) => ({ ...e, de: "toi" as const })), ...(data.communes ?? []).map((e) => ({ ...e, de: "autres" as const }))].map((e) => (
                    <li key={`${e.de}-${e.designation}`}>
                      <button
                        type="button"
                        aria-label={e.de === "autres" ? `${e.designation} (écrit par d'autres artisans)` : `${e.designation} (déjà écrit par toi)`}
                        onClick={() => {
                          setLibreTexte(e.designation);
                          setLibreUnite(e.unite || "");
                          setLibre(true);
                        }}
                        className={BOUTON}
                      >
                        <span className="flex flex-col">
                          <span>{e.designation}</span>
                          <span className="text-[13px] font-normal text-muted">{e.de === "autres" ? "Écrit par d'autres artisans" : "Déjà écrit par toi"}</span>
                        </span>
                        <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  ))
                : null}
              {(data.resultats ?? []).map((a) => (
                <li key={a.cle}>
                  <button type="button" onClick={() => choisir(a)} className={BOUTON}>
                    <span className="flex min-w-0 flex-col">
                      <span>{a.designation}</span>
                      {/* Son contexte (Greg, 13 novembre 2026) : « Métier · Famille · Article », la sous-famille quand elle
                          existe ; puis les autres métiers qui le partagent, et ce qui reste à préciser. */}
                      {a.chemin ? (
                        <span className="text-[13px] font-normal text-muted">
                          {[a.chemin.catalogue, a.chemin.rayon, ...(a.chemin.famille === a.chemin.rayon ? [] : [a.chemin.famille]), a.chemin.produit].join(" · ")}
                          {a.autresCatalogues?.length ? ` (aussi en ${a.autresCatalogues.join(", ")})` : ""}
                        </span>
                      ) : a.metier !== courant?.code ? (
                        <span className="text-[13px] font-normal text-muted">{metiers.find((m) => m.code === a.metier)?.libelle}</span>
                      ) : null}
                      {a.precisions?.length ? <span className="text-[13px] font-semibold text-accent-text">À préciser : {a.precisions.join(", ")}</span> : null}
                      {a.aVerifier ? <span className="text-[13px] font-semibold text-accent-text">À vérifier avec ton négoce</span> : null}
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {data.resultats?.length === 0 && !liste ? <li className="text-[15px] text-muted">Rien de ce nom. Décris-le ci-dessous, il partira quand même.</li> : null}
            </ul>
          ) : (
            <Niveaux data={data} metier={courant?.libelle ?? null} aPreciser={liste} chemin={chemin} onChemin={setChemin} onArticle={choisir} />
          )}
        </>
      )}

      {/* Toujours en bas : la ligne libre, qui part quand même (sans être cumulée). */}
      {libre ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line p-4">
          <label htmlFor="libre-texte" className="text-[16px] font-semibold">
            {liste ? "Désignation" : "Décris ton besoin"}
          </label>
          <input id="libre-texte" value={libreTexte} onChange={(e) => setLibreTexte(e.target.value)} placeholder="Ex. faîtière ventilée modèle ancien" className={INPUT} autoFocus />
          <div className="flex gap-2">
            <input aria-label="Quantité de la ligne libre" inputMode="decimal" value={libreQte} onChange={(e) => setLibreQte(e.target.value)} placeholder={liste ? "Quantité (facultatif)" : "Quantité"} className={`${INPUT} max-w-40`} />
            <select aria-label="Unité de la ligne libre" value={libreUnite} onChange={(e) => setLibreUnite(e.target.value)} className={`${INPUT} grow`}>
              {liste ? <option value="">Unité</option> : null}
              {UNITES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <Button
            variant="ink"
            disabled={libreTexte.trim().length < (liste ? 2 : 3) || (!liste && !(nombre(libreQte) > 0))}
            onClick={() => {
              ajouter({ designation: libreTexte.trim(), unite: libreUnite, qte: libreQte, libre: true });
              setLibre(false);
              setLibreTexte("");
              setLibreQte("");
            }}
          >
            <Plus size={18} aria-hidden="true" /> {liste ? "Ajouter à la sélection" : "Ajouter cette ligne"}
          </Button>
        </div>
      ) : courant?.enEnrichissement ? null : (
        <button type="button" onClick={() => setLibre(true)} className="pressable flex min-h-13 items-center gap-3 rounded-xl px-1 text-left text-[15px] font-semibold text-accent-text">
          <PenLine size={18} aria-hidden="true" /> Je saisis mon matériau
        </button>
      )}
    </div>
  );
}

/** Sur ordinateur, les familles et les sous-familles se choisissent dans la colonne de gauche : pas une seconde fois au centre. */
const GAUCHE = "xl:hidden";

/** Le premier article sous un choix : il donne l'unité et le métier d'une ligne laissée « à préciser ». */
function premierArticle(c: ChoixVue): ArticleCatalogueVue {
  const o = c.options[0]!;
  return o.suite ? premierArticle(o.suite) : o.article!;
}

function ChampPrecision({ def, valeur, onChange }: { def: ProduitVue["precisions"][number]; valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[15px] font-semibold">
      {def.nom}
      <input aria-label={def.nom} value={valeur} onChange={(e) => onChange(e.target.value)} maxLength={60} placeholder={def.exemple ?? ""} className={INPUT} autoComplete="off" />
    </label>
  );
}

/**
 * LE CATALOGUE EN RAYONS (Greg, 12 novembre 2026 : « l'artisan doit naviguer comme dans un catalogue de négoce, sans voir
 * immédiatement des centaines de références ») : rayon › famille › produit › caractéristiques, une à une, jusqu'à UN
 * article. Un rayon d'une seule famille passe droit aux produits. Le fil d'Ariane dit toujours où l'on est ; « Choix
 * précédent » remonte d'un niveau sans rien perdre. Sur ordinateur, les rayons et leurs familles restent à gauche.
 */
function Niveaux({ data, metier, aPreciser, chemin, onChemin, onArticle }: { data: Reponse; metier: string | null; aPreciser: boolean; chemin: Chemin; onChemin: (c: Chemin) => void; onArticle: (a: ArticleCatalogueVue, precisions: ProduitVue["precisions"]) => void }) {
  const rayons = data.rayons ?? [];
  const rayon = rayons.find((r) => r.libelle === chemin.rayon) ?? (rayons.length === 1 ? rayons[0]! : null);
  const famille = rayon ? (rayon.familles.find((f) => f.libelle === chemin.famille) ?? (rayon.familles.length === 1 ? rayon.familles[0]! : null)) : null;
  const produit = famille?.produits.find((p) => p.libelle === chemin.produit) ?? null;
  // Le choix en cours : on descend dans les choix du produit en suivant les valeurs déjà prises.
  let choix: ChoixVue | null = produit?.choix ?? null;
  for (const v of chemin.choisis) choix = choix?.options.find((o) => o.valeur === v)?.suite ?? null;

  const ouvrirProduit = (p: ProduitVue) => (p.article ? onArticle(p.article, p.precisions) : onChemin({ rayon: rayon!.libelle, famille: famille!.libelle, produit: p.libelle, choisis: [] }));
  const remonter = () => {
    if (chemin.choisis.length) onChemin({ ...chemin, choisis: chemin.choisis.slice(0, -1) });
    else if (produit) onChemin({ ...chemin, produit: null });
    else if (famille && rayon && rayon.familles.length > 1 && chemin.famille) onChemin({ ...chemin, famille: null });
    else onChemin(DEPART);
  };
  // Le fil d'Ariane (Greg, 13 novembre 2026 : « Zinguerie > Gouttières et descentes ») : le métier, la famille, la
  // sous-famille quand la famille en a plusieurs, le produit, puis les caractéristiques déjà choisies.
  const fil = [metier, rayon?.libelle, rayon && rayon.familles.length > 1 && chemin.famille ? famille?.libelle : null, produit?.libelle, ...chemin.choisis].filter((x): x is string => !!x);
  const auDepart = !chemin.rayon && rayons.length > 1;
  const retour = auDepart ? null : fil.length ? (
    <div className="flex items-center gap-2">
      {rayons.length > 1 || produit || (rayon && rayon.familles.length > 1 && chemin.famille) ? (
        <button type="button" onClick={remonter} aria-label="Choix précédent" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      ) : null}
      <p aria-label="Tu es ici" className="min-w-0 text-[15px] leading-snug font-semibold">
        {fil.join(" › ")}
      </p>
    </div>
  ) : null;

  let contenu: React.ReactNode;
  if (produit && choix)
    contenu = (
      <>
        <p className="text-[16px] font-bold">{choix.nom}</p>
        <ul aria-label={`${produit.libelle} : ${choix.nom}`} className="flex flex-col gap-2">
          {choix.options.map((o) => (
            <li key={o.valeur}>
              <button type="button" onClick={() => (o.article && !o.suite ? onArticle(o.article, produit.precisions) : onChemin({ ...chemin, rayon: rayon!.libelle, famille: famille!.libelle, choisis: [...chemin.choisis, o.valeur] }))} className={BOUTON}>
                {o.valeur}
                <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {/* « Laisser à préciser » (Greg, 13 novembre 2026) : la ligne part avec ce qui est déjà choisi ; ce qui manque
            est écrit « à préciser », jamais deviné. En achat groupé, l'article exact est nécessaire pour additionner. */}
        {aPreciser ? (
          <button type="button" onClick={() => onArticle({ ...premierArticle(choix!), cle: "", variante: null, designation: `${[produit.libelle, ...chemin.choisis].join(" ")} · ${choix!.nom.toLowerCase()} à préciser` }, produit.precisions)} aria-label="Laisser à préciser" className={`${BOUTON} border-dashed`}>
            <span className="flex min-w-0 flex-col">
              <span>Laisser à préciser</span>
              <span className="text-[13px] font-normal text-muted">Ton négoce te le demandera.</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
          </button>
        ) : null}
      </>
    );
  else if (famille)
    contenu = (
      <ul aria-label={famille.libelle} className="flex flex-col gap-2">
        {famille.produits.map((p) => (
          <li key={p.libelle}>
            <button type="button" onClick={() => ouvrirProduit(p)} aria-label={p.libelle} className={BOUTON}>
              <span className="flex min-w-0 flex-col">
                <span>{p.libelle}</span>
                {p.indication ? <span className="text-[13px] font-normal text-muted">À choisir : {p.indication.toLowerCase()}</span> : null}
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  else if (rayon)
    contenu = (
      <ul aria-label={rayon.libelle} className={`flex flex-col gap-2 ${GAUCHE}`}>
        {rayon.familles.map((f) => (
          <li key={f.libelle}>
            <button type="button" onClick={() => onChemin({ rayon: rayon.libelle, famille: f.libelle, produit: null, choisis: [] })} className={BOUTON}>
              {f.libelle}
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  else
    contenu = (
      <ul aria-label="Familles" className={`flex flex-col gap-2 ${rayons.length > 1 ? GAUCHE : ""}`}>
        {rayons.map((r) => (
          <li key={r.libelle}>
            <button type="button" onClick={() => onChemin({ rayon: r.libelle, famille: null, produit: null, choisis: [] })} aria-label={r.libelle} className={BOUTON}>
              <span className="flex min-w-0 flex-col">
                <span>{r.libelle}</span>
                <span className="text-[13px] font-normal text-muted">
                  {r.familles.length > 1 ? `${r.familles.length} sous-familles` : `${r.familles[0]?.produits.length ?? 0} produit${(r.familles[0]?.produits.length ?? 0) > 1 ? "s" : ""}`}
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );

  // Ordinateur : la navigation du catalogue reste à gauche (rayons, et les familles du rayon ouvert) ; le contenu au centre.
  const lateral = rayons.length > 1 || (rayon?.familles.length ?? 0) > 1;
  return (
    <div className={lateral ? "flex flex-col gap-3 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:items-start xl:gap-6" : "flex flex-col gap-3"}>
      {lateral ? (
        <nav aria-label="Familles du catalogue" className="hidden flex-col gap-1 xl:flex">
          {rayons.map((r) => {
            const ouvert = r.libelle === rayon?.libelle;
            return (
              <div key={r.libelle} className="flex flex-col gap-0.5">
                <button type="button" aria-current={ouvert ? "true" : undefined} onClick={() => onChemin({ rayon: r.libelle, famille: null, produit: null, choisis: [] })} className={`pressable min-h-11 rounded-lg px-3 text-left text-[15px] font-bold ${ouvert ? "bg-accent-soft" : ""}`}>
                  {r.libelle}
                </button>
                {ouvert && r.familles.length > 1
                  ? r.familles.map((f) => (
                      <button key={f.libelle} type="button" aria-current={f.libelle === famille?.libelle ? "true" : undefined} onClick={() => onChemin({ rayon: r.libelle, famille: f.libelle, produit: null, choisis: [] })} className={`pressable min-h-10 rounded-lg py-1.5 pr-2 pl-6 text-left text-[14px] ${f.libelle === famille?.libelle ? "font-bold underline underline-offset-4" : "text-muted"}`}>
                        {f.libelle}
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </nav>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3">
        {retour}
        {contenu}
        {lateral && !famille ? <p className="hidden rounded-xl border border-dashed border-line p-4 text-[15px] text-muted xl:block">{rayon ? "Choisis une sous-famille à gauche." : "Choisis une famille à gauche."}</p> : null}
      </div>
    </div>
  );
}
