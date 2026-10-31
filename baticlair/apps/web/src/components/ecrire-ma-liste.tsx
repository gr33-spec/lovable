"use client";

import { BadgeCheck, Check, ChevronLeft, ChevronRight, History, Package, Plus, Search, Users, X } from "lucide-react";
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
 * passent une fois ajoutés au catalogue par l'admin (Greg, 30 octobre 2026, nuit), ou, depuis le 31 octobre au soir, dès
 * qu'une autre entreprise écrit ou commande en achat groupé la même chose (`communes`, « écrit par d'autres artisans »).
 *
 * LE CATALOGUE MÉTIER (Greg, 31 octobre 2026) : un produit à plusieurs formats se choisit en deux touchers (« Liteau ›
 * 18×40 ») ; les mots qui précisent sans être au catalogue (« rouge » dans « H14 rouge ») restent dans la désignation ;
 * « Je ne trouve pas mon matériau » ouvre la saisie libre, avec la marque ou la référence si l'artisan la connaît, écrite
 * dans la désignation (elle part ainsi dans la liste, le PDF et la demande). Jamais une référence imposée.
 */
interface Proposition {
  designation: string;
  unite: string;
  produit?: string;
  variante?: string | null;
  precisions?: string[];
  statut?: "verifie" | "generique" | null;
  famille?: string;
  marque?: string | null;
  /** Un intitulé déjà écrit par l'entreprise elle-même. */
  mien?: boolean;
  /** Une référence des artisans : écrite ou commandée par plusieurs entreprises, jamais vérifiée (Greg, 31 octobre 2026, soir). */
  commune?: boolean;
}

/** Les propositions, regroupées par produit : un produit à plusieurs formats n'occupe qu'une puce. */
function regrouper(resultats: readonly Proposition[], ecrits: readonly Proposition[], communes: readonly Proposition[] = []) {
  const groupes = new Map<string, Proposition[]>();
  for (const r of resultats) {
    const k = r.produit ?? r.designation;
    groupes.set(k, [...(groupes.get(k) ?? []), r]);
  }
  // Ce qui est tapé désigne déjà une variante (« H14 rouge » : le coloris Rouge, sans mot de reste) : elle se propose seule,
  // d'un tap ; sinon le produit tient en une puce et ses variantes s'ouvrent (« Liteau › »).
  const exacte = (articles: Proposition[]) => {
    const sans = articles.filter((a) => !a.precisions?.length && a.variante);
    return sans.length === 1 && articles.some((a) => a.precisions?.length) ? sans[0]! : null;
  };
  const entrees: ({ type: "produit"; produit: string; articles: Proposition[] } | { type: "article"; article: Proposition })[] = [...groupes].map(([produit, articles]) => {
    const seule = articles.length > 1 ? exacte(articles) : articles[0]!;
    return seule ? { type: "article" as const, article: seule } : { type: "produit" as const, produit, articles };
  });
  return [...entrees.slice(0, 5), ...ecrits.map((article) => ({ type: "article" as const, article: { ...article, mien: true } })), ...communes.map((article) => ({ type: "article" as const, article: { ...article, commune: true } }))].slice(0, 7);
}
/** Sans accents ni casse, pour comparer ce qui est tapé et ce qui est proposé. */
const plat = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Les mots de la proposition qui commencent comme un mot tapé passent en gras (« lit » dans « Liteau »). */
function Surligne({ texte, q }: { texte: string; q: string }) {
  const mots = plat(q).split(/[\s,;·]+/).filter((m) => m.length >= 2);
  if (!mots.length) return <>{texte}</>;
  return (
    <>
      {texte.split(/(\s+)/).map((m, i) => {
        const p = plat(m).replace(/[^a-z0-9×x]/g, "");
        const vu = p.length > 0 && mots.some((t) => p.startsWith(t.replace(/[^a-z0-9×x]/g, "")) && t.replace(/[^a-z0-9×x]/g, "").length > 0);
        return vu ? (
          <strong key={i} className="font-extrabold">
            {m}
          </strong>
        ) : (
          <span key={i}>{m}</span>
        );
      })}
    </>
  );
}

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
      mot ? api<{ resultats: Proposition[] | null; ecrits?: Proposition[] | null; communes?: Proposition[] | null }>(`/v1/catalogue?q=${encodeURIComponent(mot)}`, { signal }).catch(() => null) : Promise.resolve(null),
    [mot],
  );
  const { data: cat } = useResource(fetchCat);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [libre, setLibre] = useState(false);
  const [saisieActive, setSaisieActive] = useState(true);
  const [actif, setActif] = useState(-1);
  const [marqueLibre, setMarqueLibre] = useState("");
  const dejaChoisi = (r: Proposition) => r.designation.toLowerCase() === mot.toLowerCase() || texte.toLowerCase().startsWith(r.designation.toLowerCase());
  const suggestions = mot && !libre ? regrouper((cat?.resultats ?? []).filter((r) => !dejaChoisi(r)), (cat?.ecrits ?? []).filter((r) => !dejaChoisi(r)), (cat?.communes ?? []).filter((r) => !dejaChoisi(r))) : [];
  const groupeOuvert = ouvert ? suggestions.find((e) => e.type === "produit" && e.produit === ouvert) : undefined;
  const unites = UNITES.includes(unite) ? UNITES : [...UNITES, unite];
  // Le panneau des propositions : seulement pendant la saisie de l'intitulé (replié à la quantité, ou en saisie libre).
  const panneau = Boolean(mot) && !libre && saisieActive;
  // Les choix du clavier (↑ ↓ Entrée), dans l'ordre de l'écran.
  const options: { run: () => void }[] =
    groupeOuvert && groupeOuvert.type === "produit"
      ? [...groupeOuvert.articles.map((r) => ({ run: () => choisir(r) })), { run: () => setOuvert(null) }]
      : [
          ...suggestions.map((e) => ({ run: () => (e.type === "produit" ? setOuvert(e.produit) : choisir(e.article)) })),
          { run: () => setLibre(true) },
        ];

  useEffect(() => {
    champ.current?.focus();
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [onFermer]);
  useEffect(() => {
    liste.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [lignes.length]);

  const enCours = (): LigneEcrite => ({ libelle: [texte.trim(), marqueLibre.trim()].filter(Boolean).join(", ").replace(/\s+/g, " "), quantite: quantite.trim().replace(",", "."), unite });
  const ajouter = () => {
    if (!texte.trim()) return;
    const l = enCours();
    b.modifier((d) => ({ ...d, lignes: [...d.lignes, l], texte: "", quantite: "", unite: "pièces" }));
    setLibre(false);
    setMarqueLibre("");
    setOuvert(null);
    champ.current?.focus();
  };
  const reprendre = (i: number) => {
    const l = lignes[i]!;
    b.modifier((d) => ({ ...d, lignes: d.lignes.filter((_, j) => j !== i), texte: l.libelle, quantite: l.quantite, unite: l.unite || "pièces" }));
    champ.current?.focus();
  };
  const choisir = (r: Proposition) => {
    saisir({ texte: [r.designation, ...(r.precisions ?? [])].join(" "), unite: r.unite || unite });
    setOuvert(null);
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
      {/* Ordinateur : une colonne centrée (2xl), lisible, au lieu de champs étirés sur tout l'écran. */}
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 lg:mx-auto lg:w-full lg:max-w-2xl lg:pt-10 lg:pb-4">
        <button type="button" onClick={onFermer} aria-label="Fermer" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
          <X size={20} aria-hidden="true" />
        </button>
        <h1 className="grow truncate text-[20px] font-extrabold">Écris ta liste</h1>
        <Button variant="ink" pending={pending} onClick={() => void terminer()} className="min-h-11 shrink-0 px-5">
          <Check size={18} aria-hidden="true" /> Terminé
        </Button>
      </div>
      <div className="flex min-h-0 flex-col gap-2 px-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:gap-3">
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
        {/* LA SAISIE (Greg, 31 octobre 2026, soir : « pas très intuitif quand on commence à taper ») : les propositions
            s'ouvrent JUSTE SOUS le champ, en liste (pas en pastilles éparpillées), chacune avec ce qui la distingue (famille,
            marque vérifiée, déjà écrite par toi, écrite par d'autres artisans) et son unité ; les mots tapés en gras ; un
            produit à plusieurs formats ouvre ses formats en grille ; « Je cherche… » pendant la recherche ; sur ordinateur,
            ↑ ↓ et Entrée. La liste se replie dès qu'on passe à la quantité (le champ reste au-dessus du clavier). */}
        <div className="relative flex flex-col gap-2">
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[#8a7650]" />
            <input
              ref={champ}
              aria-label="Intitulé"
              aria-autocomplete="list"
              onFocus={() => setSaisieActive(true)}
              value={texte}
              onChange={(e) => {
                saisir({ texte: e.target.value });
                setActif(-1);
              }}
              onKeyDown={(e) => {
                if (panneau && options.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  e.preventDefault();
                  setActif((i) => (e.key === "ArrowDown" ? (i + 1) % options.length : (i <= 0 ? options.length : i) - 1));
                  return;
                }
                if (e.key === "Escape" && actif >= 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  setActif(-1);
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (panneau && actif >= 0 && options[actif]) {
                    options[actif].run();
                    setActif(-1);
                    return;
                  }
                  if (texte.trim()) champQte.current?.focus();
                }
              }}
              placeholder={lignes.length ? "Ligne suivante…" : "Tape un matériau : liteau, H14, BA13…"}
              enterKeyHint="next"
              autoComplete="off"
              className={`${INPUT} w-full pl-11`}
            />
          </div>
          {panneau ? (
            <div className="flex max-h-[42dvh] flex-col overflow-y-auto rounded-2xl border border-line bg-surface shadow-card lg:max-h-[50dvh]">
              {groupeOuvert && groupeOuvert.type === "produit" ? (
                <div className="flex flex-col gap-3 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setOuvert(null);
                        setActif(-1);
                      }}
                      className={`pressable inline-flex min-h-10 items-center gap-1 rounded-full border border-line px-3 text-[14px] font-semibold ${actif === groupeOuvert.articles.length ? "bg-ground ring-2 ring-accent" : ""}`}
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      Retour
                    </button>
                    <p className="min-w-0 truncate text-[15px] font-extrabold">{groupeOuvert.produit}</p>
                    <span className="ml-auto shrink-0 text-[13px] text-muted">choisis le format</span>
                  </div>
                  <ul aria-label={`Formats de ${groupeOuvert.produit}`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groupeOuvert.articles.map((r, i) => (
                      <li key={r.designation}>
                        <button
                          type="button"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => choisir(r)}
                          className={`pressable flex min-h-11 w-full items-center rounded-xl border border-line px-3 text-left text-[15px] font-semibold hover:bg-ground ${actif === i ? "bg-ground ring-2 ring-accent" : ""}`}
                        >
                          {r.variante ?? r.designation}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  {cat === null ? (
                    <p role="status" className="flex min-h-12 items-center gap-2 px-4 text-[14px] text-muted">
                      <Search size={16} aria-hidden="true" /> Je cherche « {mot} »…
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p className="px-4 pt-3 text-[14px] text-muted">Rien au catalogue pour « {mot} ». Tu peux l&apos;ajouter tel quel.</p>
                  ) : null}
                  <ul aria-label="Références proposées" className="flex flex-col divide-y divide-line">
                    {suggestions.map((e, i) => {
                      const surbrillance = actif === i ? "bg-ground" : "";
                      if (e.type === "produit") {
                        const famille = e.articles[0]?.famille;
                        return (
                          <li key={`p:${e.produit}`}>
                            <button
                              type="button"
                              onMouseDown={(ev) => ev.preventDefault()}
                              onClick={() => {
                                setOuvert(e.produit);
                                setActif(-1);
                              }}
                              aria-label={`${e.produit} : choisir le format`}
                              className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-ground ${surbrillance}`}
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ground text-muted" aria-hidden="true">
                                <Package size={18} />
                              </span>
                              <span className="flex min-w-0 grow flex-col">
                                <span className="truncate text-[15px] font-semibold">
                                  <Surligne texte={e.produit} q={mot} />
                                </span>
                                <span className="truncate text-[13px] text-muted">
                                  {e.articles.length} formats{famille ? ` · ${famille}` : ""}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted">
                                Choisir <ChevronRight size={16} aria-hidden="true" />
                              </span>
                            </button>
                          </li>
                        );
                      }
                      const r = e.article;
                      const nom = [r.designation, ...(r.precisions ?? [])].join(" ");
                      const sous = r.commune
                        ? "Écrit par d'autres artisans"
                        : r.mien
                          ? "Déjà écrit par toi"
                          : [r.famille, r.statut === "verifie" && r.marque ? `${r.marque}, référence vérifiée` : null].filter(Boolean).join(" · ");
                      const Icone = r.commune ? Users : r.mien ? History : r.statut === "verifie" ? BadgeCheck : Package;
                      return (
                        <li key={`a:${r.designation}`}>
                          <button
                            type="button"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => choisir(r)}
                            aria-label={r.commune ? `${r.designation} (écrit par d'autres artisans)` : nom}
                            className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-ground ${surbrillance}`}
                          >
                            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${r.statut === "verifie" ? "bg-accent/25 text-ink" : "bg-ground text-muted"}`} aria-hidden="true">
                              <Icone size={18} />
                            </span>
                            <span className="flex min-w-0 grow flex-col">
                              <span className="text-[15px] font-semibold">
                                <Surligne texte={r.designation} q={mot} />
                                {r.precisions?.length ? <span className="font-normal text-muted"> {r.precisions.join(" ")}</span> : null}
                              </span>
                              {sous ? <span className="truncate text-[13px] text-muted">{sous}</span> : null}
                            </span>
                            {r.unite ? <span className="shrink-0 rounded-full bg-ground px-2.5 py-1 text-[12px] font-semibold text-muted">{r.unite}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        type="button"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setLibre(true);
                          setActif(-1);
                        }}
                        className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-ground ${actif === suggestions.length ? "bg-ground" : ""}`}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-dashed border-line text-muted" aria-hidden="true">
                          <Plus size={18} />
                        </span>
                        <span className="flex min-w-0 grow flex-col">
                          <span className="text-[15px] font-semibold">Je ne trouve pas mon matériau — le saisir moi-même</span>
                          <span className="truncate text-[13px] text-muted">« {mot} » partira tel quel, avec la marque si tu la connais</span>
                        </span>
                      </button>
                    </li>
                  </ul>
                  <p aria-hidden="true" className="hidden border-t border-line px-4 py-2 text-[12px] text-muted lg:block">
                    ↑ ↓ pour choisir · Entrée pour valider · Échap pour revenir au champ
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={champQte}
            aria-label="Quantité"
            onFocus={() => setSaisieActive(false)}
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
          <select aria-label="Unité" onFocus={() => setSaisieActive(false)} value={unite} onChange={(e) => saisir({ unite: e.target.value })} className={`${INPUT} min-w-0 grow`}>
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
        {libre ? (
          <input
            aria-label="Marque, modèle ou référence (facultatif)"
            value={marqueLibre}
            onChange={(e) => setMarqueLibre(e.target.value)}
            placeholder="Marque, modèle ou référence (facultatif)"
            autoComplete="off"
            className={`${INPUT} w-full`}
          />
        ) : null}
        {!panneau && !libre ? (
          <p className="text-[13px] text-muted">{lignes.length ? "Un tap sur une ligne la modifie. Sans quantité, elle reste à vérifier." : "Écris l'intitulé comme tu veux, puis la quantité. Elle peut attendre."}</p>
        ) : null}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  );
}
