import { METIER_NAMES, ROOFING_REFERENTIAL, type Assumption, type TraceLine } from "@baticlair/domain";
import type { ReviewedTakeoff } from "../../takeoff/index.js";

/**
 * Ce que rend la porte /v1/quantitatifs (§38) : le même objet pour l'app et pour un partenaire.
 * Les clés sont en français, comme le contrat du référentiel ; aucun détail interne du moteur.
 */
export type Etat = "en_cours" | "questions" | "pret" | "erreur";

export interface Morceau {
  texte: string;
  /** Valeur modifiable : sa clé (à renvoyer sur /reponses ou /corrections), sinon absente. */
  cle?: string;
  valeur?: string;
  unite?: string;
  /**
   * devis = lu dans le devis (ou déduit de l'adresse) ; hypothese = valeur par défaut (à confirmer) ;
   * referentiel = donnée sourcée ; artisan = choisie ; estimation = approchée faute de table officielle.
   */
  confiance: "devis" | "hypothese" | "referentiel" | "artisan" | "estimation";
}

const METIER: Record<string, string> = METIER_NAMES;
export const metierOf = (trade: string) => METIER[trade] ?? trade;

const confianceOf = (origin: TraceLine["origin"]): Morceau["confiance"] =>
  origin === "devis" ? "devis" : origin === "assumption" ? "hypothese" : origin === "company" || origin === "project" ? "artisan" : "referentiel";

/** Ce qui compte pour l'artisan en plus des hypothèses : la marge ou la perte (les intermédiaires du calcul restent dans la trace). */
const PARLANT = /^(marge|perte)|\((table|formule) /i;

/**
 * Libellé → clé de chaque valeur réglable du chantier (pente, rampant…) : une valeur déjà choisie
 * par l'artisan n'est plus une hypothèse, mais reste modifiable d'un tap (§39).
 * TODO plan v3, étape 3 : lu dans le dossier du métier, avec le référentiel.
 */
const PARAM_KEYS = new Map(ROOFING_REFERENTIAL.workItems.flatMap((w) => w.params.map((p) => [p.label, `param:${p.key}`] as const)));

/**
 * « 9 313 pièces = surface de toiture 200 m² · pente du toit 45° · … » (§39) : la mesure du devis, les
 * hypothèses et les choix de l'artisan, dans l'ordre du calcul. Une hypothèse modifiable porte sa clé.
 */
function explication(quantite: string | null, trace: readonly TraceLine[], assumptions: readonly Assumption[]): { phrase: string; morceaux: Morceau[] } {
  const seen = new Set<string>();
  const morceaux: Morceau[] = [];
  for (const t of trace) {
    if (t.value === "" || t.label.toLowerCase() === "produit" || /^contenu/i.test(t.label)) continue;
    // « Estimation : recouvrement 120 mm hors table Cupa… » : un morceau à part entière, sans valeur ni unité.
    if (t.label === "Estimation") {
      morceaux.push({ texte: `estimation : ${t.value.charAt(0).toLowerCase()}${t.value.slice(1)}`, confiance: "estimation" });
      continue;
    }
    const hyp = assumptions.find((a) => a.label === t.label);
    const utile = t.origin !== "referential" || PARLANT.test(t.label) || Boolean(hyp);
    if (!utile) continue;
    const unit = !t.unit || t.unit === "u" ? "" : t.unit === "°" ? "°" : ` ${t.unit.replace(/^u\//, "/").replace("m2", "m²")}`;
    // « région ardoise III » : la valeur dite par le référentiel ; `valeur` garde celle du calcul (à renvoyer).
    // §44.3 : la note de l'artisan gagne sur le devis, et l'explication cite les deux (« note de l'artisan ; le devis disait 40° »).
    const others = t.origin === "project" && t.from ? t.from.split(" ; ").slice(1).map((x) => x.split(" : ").pop()!.replace(/\s*°$/, "°").trim()).filter(Boolean) : [];
    const cite = others.length > 0 ? ` (note de l'artisan ; le devis disait ${others.join(", ")})` : "";
    const texte = `${t.label.charAt(0).toLowerCase()}${t.label.slice(1)} ${t.shown ?? t.value}${unit}${t.estimation ? " (estimation)" : ""}${cite}`;
    if (seen.has(texte)) continue;
    seen.add(texte);
    morceaux.push({
      texte,
      // Seules les valeurs que /corrections sait changer portent une clé.
      ...(hyp?.key.startsWith("param:") ? { cle: hyp.key } : PARAM_KEYS.has(t.label) ? { cle: PARAM_KEYS.get(t.label)! } : {}),
      valeur: t.value,
      ...(t.unit && t.unit !== "u" ? { unite: t.unit } : {}),
      confiance: t.estimation ? "estimation" : confianceOf(t.origin),
    });
  }
  return { phrase: `${quantite ?? "?"} = ${morceaux.map((m) => m.texte).join(" · ")}`, morceaux };
}

export function quantitatifView(
  base: { id: string; reference: string | null; projetId: string; source: "pdf" | "lignes" },
  reviewed: ReviewedTakeoff,
) {
  const { takeoff, purchase, view } = reviewed;
  const groupOf = new Map(purchase.groups.flatMap((g) => g.itemKeys.map((k) => [k, g.label] as const)));
  const lignes = purchase.toBuy.map((b) => {
    const need = view.items.find((i) => i.kind === "need" && b.needIds.includes(i.id))?.need;
    const line = takeoff.lines.find((l) => b.lineIds.includes(l.id));
    return {
      id: b.key,
      libelle: b.label,
      quantite: b.order ? Number(b.order.count) : null,
      unite: b.order?.unit ?? null,
      texte: b.quantity,
      conditionnement: b.approx,
      ouvrage: groupOf.get(b.key) ?? null,
      origine: b.kind === "computed" ? "calcul" : "devis",
      a_confirmer: b.state === "to_confirm",
      // Le prix d'une ligne de devis est celui de l'ouvrage (85 €/m² de couverture), pas d'un article calculé.
      ...(b.kind !== "computed" && line?.priceRaw ? { prix: line.priceRaw } : {}),
      hypotheses: b.assumptionKeys,
      /** Ce que l'artisan a réécrit lui-même (§41.4) : « libelle », « quantite ». */
      modifie: (b.edited ?? []).map((e) => (e === "label" ? "libelle" : "quantite")),
      /** Chiffre approché (recouvrement hors table du fabricant…) : pourquoi, en une phrase ; sinon absent. */
      ...(need?.trace.some((t) => t.label === "Estimation") ? { estimation: need.trace.filter((t) => t.label === "Estimation").map((t) => t.value).join(" ") } : {}),
      explication: b.edited?.includes("quantity")
        ? { phrase: `${b.quantity} = quantité fixée par vous`, morceaux: [{ texte: "quantité fixée par vous", confiance: "artisan" as const }, ...(need ? explication(b.quantity, need.trace, purchase.assumptions).morceaux : [])] }
        : need
          ? explication(b.quantity, need.trace, purchase.assumptions)
          : { phrase: `${b.quantity ?? "?"} = repris tel quel du devis`, morceaux: [{ texte: "repris tel quel du devis", confiance: "devis" as const }] },
    };
  });
  const questions = purchase.questions.map((d) => {
    const q = d.question;
    const boutons = q?.options?.length
      ? q.options.map((o) => ({ label: o.label, valeur: o.value }))
      : !q && d.primary
        ? [{ label: d.primary.label, valeur: "ok" }]
        : [];
    return {
      id: d.key,
      texte: q?.text ?? d.text,
      titre: d.title,
      boutons,
      // « Je ne sais pas » : toujours possible pour une question du calcul (valeur par défaut gardée).
      je_ne_sais_pas: Boolean(q && q.kind === "param"),
      ...(q?.unit ? { unite: q.unit } : {}),
      saisie_libre: Boolean(q && q.kind === "param" && !q.options?.length),
    };
  });
  const etat: Etat = questions.length > 0 ? "questions" : "pret";
  return {
    ...base,
    etat,
    metier: metierOf(takeoff.trade),
    version_referentiel: takeoff.referentialVersion,
    compris: purchase.understood,
    /** Les lignes du devis telles que reçues (prix compris), pour que le partenaire retrouve les siennes. */
    devis: takeoff.lines.map((l) => ({ id: l.id, libelle: l.designation, quantite: l.quantityRaw, unite: l.unitRaw, ...(l.priceRaw ? { prix: l.priceRaw } : {}) })),
    questions,
    lignes,
    a_chiffrer: purchase.toQuote.map((q) => ({ id: q.key, libelle: q.label, mesure: q.measure, raison: q.reason })),
    hypotheses: purchase.assumptions.map((a) => ({ cle: a.key, libelle: a.label, valeur: a.value, unite: a.unit, choix: a.choices ?? [] })),
    peut_partir: purchase.canValidate,
    /** L'artisan a validé la liste : elle peut partir en demande de prix. */
    valide: takeoff.status === "validated",
  };
}
