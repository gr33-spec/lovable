import type { ArtisanRound, SupplierReply, SupplierRound } from "@baticlair/domain";
import { z } from "zod";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * LA RELECTURE À DEUX VOIX (décision du fondateur, 2026-10-05) : après le calcul, un FOURNISSEUR et un ARTISAN (deux
 * IA, Sonnet) discutent la liste en trois tours ; le code tire la conclusion (`panelDoubts`). Ils lisent le dossier en
 * texte (devis lu + liste calculée), jamais le PDF ; ils ne calculent rien.
 */
export const REVIEW_PROMPT = { id: "takeoff_review", version: 1 } as const;

export interface ReviewInput {
  /** Le dossier : devis lu (L1…), liste calculée (A1…, F1…), hypothèses. */
  dossier: string;
  tradeLabel: string;
}

export interface TakeoffReviewer {
  readonly provider: string;
  supplier(input: ReviewInput): Promise<ReadAttempt<SupplierRound>>;
  artisan(input: ReviewInput & { supplier: SupplierRound }): Promise<ReadAttempt<ArtisanRound>>;
  reply(input: ReviewInput & { supplier: SupplierRound; artisan: ArtisanRound }): Promise<ReadAttempt<SupplierReply>>;
}

export const TAKEOFF_REVIEWER = Symbol("TAKEOFF_REVIEWER");

const remark = z.object({
  article: z.string().nullable().describe("Repère de l'article (A3, F1), ou null si la remarque porte sur tout le dossier."),
  sujet: z.enum(["quantite", "precision", "manque", "designation", "autre"]),
  texte: z.string().describe("Une ou deux phrases courtes, avec des mots de chantier ou de comptoir."),
});

export const supplierWire = z.object({ remarques: z.array(remark) });
export const artisanWire = z.object({
  reponses: z.array(z.object({ remarque: z.number().int(), accord: z.boolean(), texte: z.string() })),
  remarques: z.array(remark),
});
export const replyWire = z.object({
  objections: z.array(z.object({ remarque: z.number().int(), maintient: z.boolean(), texte: z.string() })),
  avis: z.array(z.object({ remarque: z.number().int(), accord: z.boolean(), texte: z.string() })),
});

const RULES = [
  "Règles communes :",
  "- Tu ne calcules rien et tu ne changes aucun chiffre : BatiClair calcule. Tu signales seulement.",
  "- Une remarque = un vrai problème pour chiffrer, charger ou faire le chantier. Rien sur ce qui est correct.",
  "- Les repères : L = ligne du devis du client, A = article à commander, F = partie à préciser avec le fournisseur.",
  "- Les hypothèses listées sont connues de l'artisan : ne les conteste que si elles sont fausses pour CE chantier.",
  "- Phrases courtes, en français de chantier, sans politesse. Réponds uniquement par le JSON demandé.",
].join("\n");

export function supplierSystem(trade: string): string {
  return [
    `Tu es vendeur au comptoir d'un négoce de matériaux, habitué aux artisans en ${trade}.`,
    "Un artisan t'envoie sa liste à chiffrer, préparée d'après le devis de son client.",
    "Ton seul but : pouvoir chiffrer et charger chaque article dans le camion SANS rappeler l'artisan.",
    "Fais une remarque pour chaque article que tu ne pourrais pas chiffrer tel quel (teinte, dimension, référence,",
    "conditionnement, finition manquante…) ou dont la quantité te surprend au vu du devis. Au plus 15 remarques, les",
    "plus importantes d'abord.",
    "",
    RULES,
  ].join("\n");
}

export function artisanSystem(trade: string): string {
  return [
    `Tu es artisan en ${trade}, expérimenté. Tu relis la liste à chiffrer préparée d'après TON devis client, et les`,
    "remarques numérotées du vendeur du négoce.",
    "1) Pour chaque remarque du vendeur : accord = true si c'est un vrai problème ; accord = false si la liste est",
    "   bonne, et dis pourquoi en une phrase.",
    "2) Ajoute tes propres remarques seulement si un ouvrage du devis n'a pas ses fournitures, si une quantité ne colle",
    "   pas avec le devis, ou s'il manque un accessoire indispensable au chantier. Au plus 10 remarques.",
    "",
    RULES,
  ].join("\n");
}

export function replySystem(trade: string): string {
  return [
    `Tu es le même vendeur au comptoir (négoce, ${trade}). L'artisan a répondu à tes remarques et en a ajouté.`,
    "1) objections : pour chaque remarque à laquelle l'artisan a répondu « pas d'accord », maintient = true si tu ne",
    "   peux toujours pas chiffrer ou charger, maintient = false si son explication te suffit.",
    "2) avis : pour chaque remarque de l'artisan, accord = true si c'est un vrai problème pour la commande.",
    "",
    RULES,
  ].join("\n");
}

const numbered = (items: { texte: string; article: string | null }[]) =>
  items.length === 0 ? "(aucune)" : items.map((r, i) => `${i + 1}. ${r.article ? `[${r.article}] ` : ""}${r.texte}`).join("\n");

export function artisanBrief(supplier: SupplierRound): string {
  return `REMARQUES DU VENDEUR :\n${numbered(supplier.remarques)}`;
}

export function replyBrief(supplier: SupplierRound, artisan: ArtisanRound): string {
  const objections = artisan.reponses.filter((r) => !r.accord).map((r) => `${r.remarque}. (ta remarque : ${supplier.remarques[r.remarque - 1]?.texte ?? "?"}) — l'artisan : ${r.texte}`);
  return [
    `TES REMARQUES CONTESTÉES PAR L'ARTISAN :\n${objections.length ? objections.join("\n") : "(aucune)"}`,
    `REMARQUES DE L'ARTISAN :\n${numbered(artisan.remarques)}`,
  ].join("\n\n");
}
