import type { LectureDevis } from "./lecture.js";

/**
 * LE TEXTE DU DEVIS, PAS CELUI DU MODÈLE (Greg, 20 novembre 2026, D-2026-024 rejoué cinq fois en ligne) : le modèle
 * recopie la désignation de chaque ligne à sa façon (le titre seul, « titre : description », « titre — description »,
 * « titre. description »), et tout ce que le code en tire (l'ouvrage, les données écrites, le nom de la pièce) changeait
 * d'une lecture à l'autre. La désignation d'une ligne est donc reprise du texte numéroté du devis, toujours la même :
 * son titre (la ligne qui porte la quantité et le prix, colonnes retirées), puis sa description (les lignes suivantes,
 * jusqu'au titre d'après), « titre : description ». Une ligne qu'on ne retrouve pas garde les mots du modèle.
 */
const norme = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Une ligne de tableau du devis : plusieurs colonnes (séparées par deux espaces) dont un montant ou une quantité. */
const colonnes = (t: string) => t.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
const estUnTitre = (t: string) => {
  const c = colonnes(t);
  return c.length >= 3 && /€/.test(t) && /[a-z]{3}/i.test(c[0]!) && c.slice(1).some((x) => /^\d/.test(x));
};
const HORS_ARTICLE = /^(?:description|total|sous[- ]total|tva|net a payer|acompte|conditions|page \d)/;

export function designationsDuDevis(lecture: LectureDevis, numberedText: string): LectureDevis {
  const rangs = numberedText
    .split("\n")
    .map((l) => /^\[(\d+:\d+)\]\s?(.*)$/.exec(l)?.[2] ?? "")
    .filter((t) => t.trim() !== "");
  const titres: { i: number; titre: string }[] = [];
  rangs.forEach((t, i) => {
    if (estUnTitre(t)) titres.push({ i, titre: colonnes(t)[0]! });
  });
  if (titres.length === 0) return lecture;
  const articles = titres.map(({ i, titre }, k) => {
    const fin = k + 1 < titres.length ? titres[k + 1]!.i : rangs.length;
    const description: string[] = [];
    for (let j = i + 1; j < fin; j++) {
      const t = rangs[j]!.trim();
      // Le pied de page, l'en-tête du tableau sur la page suivante, les totaux : jamais la description d'un article.
      if (HORS_ARTICLE.test(norme(t)) || colonnes(t).length >= 2) break;
      description.push(t);
    }
    return { titre, cle: norme(titre), description: description.join(" ").replace(/\s+/g, " ").trim() };
  });
  const pris = new Set<number>();
  const lignes = lecture.lignes.map((l) => {
    const lu = norme(l.designation);
    // Le titre le plus long dont la désignation du modèle commence (deux titres peuvent commencer pareil).
    let meilleur = -1;
    articles.forEach((a, k) => {
      if (pris.has(k) || !a.cle || !lu.startsWith(a.cle)) return;
      if (meilleur < 0 || a.cle.length > articles[meilleur]!.cle.length) meilleur = k;
    });
    if (meilleur < 0) return l;
    pris.add(meilleur);
    const a = articles[meilleur]!;
    return { ...l, designation: a.description ? `${a.titre} : ${a.description}` : a.titre };
  });
  return { ...lecture, lignes };
}
