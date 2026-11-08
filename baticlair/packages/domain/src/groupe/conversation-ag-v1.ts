/**
 * « AJOUTER UN MATÉRIAU » EN CONVERSATION (Greg, 8 novembre 2026, capture « Choisis précisément le produit » : « C'est nul
 * ça, je veux passer par l'IA Mobiiz »). Sans import : le site l'utilise tel quel.
 *
 * L'artisan écrit ou dicte son besoin comme au comptoir (« 10 palettes d'ardoise 32 22 Espagne 1er choix pour le 1er
 * juin, livrées sur chantier ») ; Mobiiz en tire le produit de la liste blanche V1, ses caractéristiques, la quantité,
 * livraison ou retrait et la date ; puis pose UNE question à la fois sur ce qui manque, avec des réponses rapides tirées
 * des choix du produit. Jamais une caractéristique ni une quantité inventée : seul ce qui est dit (ou touché) est pris.
 * Une fois tout dit, le besoin s'ouvre prérempli dans le parcours habituel (conditionnement, lieu privé, achat compatible,
 * confirmation). Un matériau hors liste blanche : « Pas encore ouvert aux achats groupés ».
 */
export interface OptionConv {
  valeur: string;
  libelle: string;
}
export interface UniteConv {
  code: string;
  singulier: string;
  pluriel: string;
}
export interface ProduitConv {
  type: string;
  libelle: string;
  unite: UniteConv;
  conditionnements: { unite: UniteConv; parDefaut: number | null }[];
  caracteristiques: { attribut: string; libelle: string; options: OptionConv[] }[];
}
export interface BesoinConv {
  type: string | null;
  attributs: Record<string, string>;
  quantite: number | null;
  unite: string | null;
  reception: "livraison" | "retrait" | null;
  dateBesoin: string | null;
}
export interface TourConv {
  besoin: BesoinConv;
  reponse: string;
  suggestions: string[];
  /** Tout est dit : le besoin peut s'ouvrir prérempli. */
  complet: boolean;
}

export const BESOIN_VIDE: BesoinConv = { type: null, attributs: {}, quantite: null, unite: null, reception: null, dateBesoin: null };

const norm = (s: string) =>
  ` ${s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d)\s*[x×*]\s*(\d)/g, "$1x$2")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9,.²x/]+/g, " ")
    .replace(/(?<!\d)[,.]|[,.](?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

/** Les mots qui désignent chaque produit (au-delà de son libellé). */
const SYNONYMES: Record<string, string[]> = {
  ardoise: ["ardoise", "ardoises"],
  tuile: ["tuile", "tuiles"],
  "fenetre-de-toit": ["fenetre de toit", "fenetres de toit", "velux", "veluxs", "fenetre toit", "chassis de toit"],
  "ecran-sous-toiture": ["ecran", "ecrans", "sous toiture", "pare pluie", "hpv"],
  gouttiere: ["gouttiere", "gouttieres", "chenal"],
  isolant: ["isolant", "isolants", "laine de verre", "laine de roche", "laine", "isolation"],
  liteau: ["liteau", "liteaux", "litteau", "litteaux"],
  osb: ["osb", "panneau osb", "panneaux osb"],
  "cable-r2v": ["cable", "cables", "r2v", "ro2v"],
};
const NON_OUVERTS = /\b(parpaing|parpaings|ciment|beton|placo|plaque de platre|carrelage|peinture|brique|briques|sable|gravier|enduit|mortier|colle|vis|clou|clous|crochet|crochets|tube|tubes|cuivre|pvc)\b/;

function trouverProduit(produits: readonly ProduitConv[], t: string): ProduitConv | null {
  // Le produit nommé le plus tôt dans la phrase (« tuile … teinte ardoisée » est une tuile).
  let meilleur: { p: ProduitConv; i: number } | null = null;
  for (const p of produits) {
    const mots = [...(SYNONYMES[p.type] ?? []), norm(p.libelle).trim()];
    for (const m of mots) {
      const i = Math.min(...[` ${m} `, ` ${m}s `].map((f) => t.indexOf(f)).filter((x) => x >= 0), Infinity);
      if (i < (meilleur?.i ?? Infinity)) meilleur = { p, i };
    }
  }
  return meilleur?.p ?? null;
}

/** Les caractéristiques dites : le libellé ou la valeur d'une option, en entier dans la phrase. */
function lireAttributs(p: ProduitConv, t: string, deja: Record<string, string>): Record<string, string> {
  const out = { ...deja };
  for (const c of p.caracteristiques) {
    const trouve = c.options.find((o) => {
      const v = norm(o.valeur).trim();
      const formes = [norm(o.libelle).trim(), v, v.replace(/(\d)x(\d)/, "$1 $2"), norm(o.libelle).trim().replace(/ mm$/, "mm")].filter((f) => f.length > 1);
      return formes.some((f) => t.includes(` ${f} `));
    });
    if (trouve) out[c.attribut] = trouve.valeur;
  }
  return out;
}

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** « 1er juin », « 15/06 », « dans 3 semaines », « dans 2 mois » : toujours une date à venir. */
export function lireDate(t: string, aujourdhui: Date): string | null {
  const base = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const futur = (j: number, m: number, a?: number) => {
    let d = new Date(a ?? base.getFullYear(), m, j);
    if (!a && d <= base) d = new Date(base.getFullYear() + 1, m, j);
    return d.getMonth() === m && d.getDate() === j ? iso(d) : null;
  };
  const dm = new RegExp(` (\\d{1,2})(?:er)? (${MOIS.join("|")})(?: (20\\d{2}))? `).exec(t);
  if (dm) return futur(Number(dm[1]), MOIS.indexOf(dm[2]!), dm[3] ? Number(dm[3]) : undefined);
  const num = / (\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d{2}))? /.exec(t.replace(/\s(\d{1,2})\s?\/\s?(\d{1,2})/g, " $1/$2"));
  if (num) return futur(Number(num[1]), Number(num[2]) - 1, num[3] ? Number(num[3]) : undefined);
  const dans = / dans (\d{1,2}|une|un|deux|trois|quatre|six|huit) (semaines?|mois|jours?) /.exec(t);
  if (dans) {
    const n = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, six: 6, huit: 8 }[dans[1]!] ?? Number(dans[1]);
    const d = new Date(base);
    if (dans[2]!.startsWith("semaine")) d.setDate(d.getDate() + 7 * n);
    else if (dans[2]!.startsWith("jour")) d.setDate(d.getDate() + n);
    else d.setMonth(d.getMonth() + n);
    return iso(d);
  }
  return null;
}

/** La quantité dite avec son unité (celle du produit ou d'un conditionnement), jamais un nombre de caractéristique. */
function lireQuantite(p: ProduitConv, t: string): { quantite: number; unite: string } | null {
  const unites = [...p.conditionnements.map((c) => c.unite), p.unite];
  for (const u of unites) {
    const mots = [u.pluriel, u.singulier, u.code].map((m) => norm(m).trim()).filter(Boolean);
    if (u.code === "m2" || /m²/.test(u.singulier)) mots.push("m2", "m²", "metres carres", "metre carre");
    if (u.code === "m" || u.code === "ml") mots.push("ml", "m", "metres", "metre", "metres lineaires", "m lineaires");
    for (const m of [...new Set(mots)].sort((a, b) => b.length - a.length)) {
      const r = new RegExp(` (\\d+(?:[.,]\\d+)?) ?${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} `).exec(t);
      if (r) return { quantite: Number(r[1]!.replace(",", ".")), unite: u.code };
    }
  }
  return null;
}

/** Un nombre seul (réponse à « Combien ? ») : dans l'unité proposée. */
const nombreSeul = (t: string) => {
  const r = /^ (\d+(?:[.,]\d+)?) $/.exec(t);
  return r ? Number(r[1]!.replace(",", ".")) : null;
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const dateLisible = (d: string) => {
  const [a, m, j] = d.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m! - 1]} ${a}`;
};

/** Le nom lisible du besoin : produit et caractéristiques choisies. */
export function nomDuBesoin(p: ProduitConv, attributs: Record<string, string>): string {
  const vals = p.caracteristiques.map((c) => c.options.find((o) => o.valeur === attributs[c.attribut])?.libelle).filter(Boolean);
  return [p.libelle, ...vals].join(" · ");
}

/** Un tour de conversation : ce qui est dit s'ajoute au besoin, puis la question suivante (une seule). */
export function tourAchatGroupe(produits: readonly ProduitConv[], avant: BesoinConv, message: string, aujourdhui = new Date(), uniteProposee: string | null = null): TourConv {
  const t = norm(message);
  const b: BesoinConv = { ...avant, attributs: { ...avant.attributs } };
  let produit = produits.find((p) => p.type === b.type) ?? null;
  const notes: string[] = [];

  const autre = trouverProduit(produits, t);
  if (autre && autre.type !== b.type) {
    produit = autre;
    b.type = autre.type;
    b.attributs = {};
    b.quantite = null;
    b.unite = null;
  }
  if (!produit) {
    if (NON_OUVERTS.test(t))
      return { besoin: b, reponse: "Ce matériau n'est pas encore ouvert aux achats groupés. Il reste dans ton quantitatif, pour une demande de prix à tes négoces. Quel autre matériau veux-tu acheter en groupe ?", suggestions: produits.slice(0, 4).map((p) => p.libelle), complet: false };
    return { besoin: b, reponse: "Quel matériau veux-tu acheter en groupe ? Dis-le comme au comptoir, par exemple « 10 palettes d'ardoise 32×22 Espagne 1er choix pour le 1er juin ».", suggestions: produits.slice(0, 4).map((p) => p.libelle), complet: false };
  }

  b.attributs = lireAttributs(produit, t, b.attributs);
  const q = lireQuantite(produit, t);
  if (q) {
    b.quantite = q.quantite;
    b.unite = q.unite;
  } else if (b.quantite === null && uniteProposee) {
    const n = nombreSeul(t);
    if (n && n > 0) {
      b.quantite = n;
      b.unite = uniteProposee;
    }
  }
  if (/ (livr\w*|chantier) /.test(t)) b.reception = "livraison";
  if (/ (retrait|retire|depot|je passe|enlevement) /.test(t)) b.reception = "retrait";
  const d = lireDate(t, aujourdhui);
  if (d) b.dateBesoin = d;

  if (!avant.type) notes.push(`${produit.libelle} : c'est noté.`);

  // La question suivante, dans l'ordre du comptoir : caractéristiques, quantité, réception, date.
  const manque = produit.caracteristiques.find((c) => !b.attributs[c.attribut]);
  if (manque) {
    const deja = Object.keys(b.attributs).length ? ` J'ai : ${nomDuBesoin(produit, b.attributs)}.` : "";
    return { besoin: b, reponse: `${notes.join(" ")}${deja} ${manque.libelle} ?`.trim(), suggestions: manque.options.map((o) => o.libelle).slice(0, 6), complet: false };
  }
  if (b.quantite === null) {
    const u = produit.conditionnements[0]?.unite ?? produit.unite;
    return { besoin: b, reponse: `${nomDuBesoin(produit, b.attributs)}. Combien de ${u.pluriel} ?`, suggestions: [], complet: false };
  }
  if (!b.reception) return { besoin: b, reponse: "Livraison sur chantier ou retrait au dépôt ?", suggestions: ["Livraison sur chantier", "Retrait au dépôt"], complet: false };
  if (!b.dateBesoin) return { besoin: b, reponse: "Pour quand en as-tu besoin ?", suggestions: ["Dans 3 semaines", "Dans 1 mois", "Dans 2 mois"], complet: false };
  const u = [...produit.conditionnements.map((c) => c.unite), produit.unite].find((x) => x.code === b.unite) ?? produit.unite;
  return {
    besoin: b,
    reponse: `C'est complet : ${nomDuBesoin(produit, b.attributs)}, ${nf(b.quantite)} ${b.quantite > 1 ? u.pluriel : u.singulier}, ${b.reception === "livraison" ? "livraison sur chantier" : "retrait au dépôt"}, avant le ${dateLisible(b.dateBesoin)}. Je regarde s'il existe déjà un achat groupé.`,
    suggestions: [],
    complet: true,
  };
}

/** L'unité proposée à la question « Combien ? » (le premier conditionnement, sinon l'unité du produit). */
export const uniteDeLaQuestion = (p: ProduitConv | null | undefined) => (p ? (p.conditionnements[0]?.unite.code ?? p.unite.code) : null);

/** L'adresse du parcours habituel, préremplie avec le besoin. */
export function lienDuBesoin(b: BesoinConv): string {
  const q: [string, string][] = [];
  if (b.type) q.push(["type", b.type]);
  for (const [k, v] of Object.entries(b.attributs)) q.push([k, v]);
  if (b.quantite !== null) q.push(["quantite", String(b.quantite)]);
  if (b.unite) q.push(["unite", b.unite]);
  if (b.reception) q.push(["reception", b.reception]);
  if (b.dateBesoin) q.push(["date", b.dateBesoin]);
  return `/achats-groupes/nouveau?${q.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`;
}

/**
 * L'AUTOCOMPLÉTION (Greg, 8 novembre 2026 : « je commence à écrire ardoise 3… ça me sort une liste qui se peaufine petit à
 * petit ; et si pas d'article, je continue manuellement ») : à chaque caractère, les produits ouverts qui correspondent,
 * complétés de la caractéristique suivante dont le libellé commence par ce qui est en train d'être tapé (« ardoise 3 » →
 * « Ardoise naturelle · 32 × 22 », « · 35 × 25 », « · 30 × 20 »). Rien ne correspond : aucune suggestion, l'artisan continue
 * d'écrire et la conversation lit sa phrase. `besoin` donne le produit déjà dit quand la saisie ne le redit pas.
 */
export interface SuggestionConv {
  libelle: string;
  type: string;
  attributs: Record<string, string>;
}
export function suggestionsSaisie(produits: readonly ProduitConv[], texte: string, besoin: BesoinConv = BESOIN_VIDE, max = 6): SuggestionConv[] {
  const brut = texte.replace(/\s+$/, "");
  if (!brut.trim()) return [];
  const finieParEspace = /\s$/.test(texte);
  const t = norm(brut);
  const mots = t.trim().split(" ");
  const partiel = finieParEspace ? "" : (mots.at(-1) ?? "");
  const sansPartiel = norm(finieParEspace ? brut : mots.slice(0, -1).join(" "));
  let produit = trouverProduit(produits, t) ?? produits.find((p) => p.type === besoin.type) ?? null;
  // Un début de mot de produit (« ard », « gout ») : les produits qui commencent ainsi.
  if (!produit) {
    if (partiel.length < 2) return [];
    return produits
      .filter((p) => [...(SYNONYMES[p.type] ?? []), norm(p.libelle).trim()].some((m) => m.startsWith(partiel) || m.split(" ").some((w) => w.startsWith(partiel))))
      .slice(0, max)
      .map((p) => ({ libelle: p.libelle, type: p.type, attributs: {} }));
  }
  const motProduit = [...(SYNONYMES[produit.type] ?? []), norm(produit.libelle).trim()].some((m) => m.startsWith(partiel) || m.split(" ").some((w) => w.startsWith(partiel)));
  const base = produit.type === besoin.type ? besoin.attributs : {};
  const attributs = lireAttributs(produit, partiel && !motProduit ? sansPartiel : t, base);
  const suivante = produit.caracteristiques.find((c) => !attributs[c.attribut]);
  // Tout est dit : plus rien à proposer, l'artisan continue (quantité, date…).
  if (!suivante) return [];
  const filtre = partiel && !motProduit ? partiel : "";
  return suivante.options
    .filter((o) => !filtre || [norm(o.libelle).trim(), norm(o.valeur).trim()].some((f) => f.startsWith(filtre) || f.split(" ").some((w) => w.startsWith(filtre))))
    .slice(0, max)
    .map((o) => {
      const a = { ...attributs, [suivante.attribut]: o.valeur };
      return { libelle: nomDuBesoin(produit!, a), type: produit!.type, attributs: a };
    });
}

