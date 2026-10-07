import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { offerOutputSchema } from "../src/modules/offers/application/offer-extractor.js";
import { completionWireSchema } from "../src/modules/takeoff/application/quantitatif-pass.js";
import { extractionFormatSchema } from "../src/modules/takeoff/application/takeoff-extractor.js";

/**
 * L'API Anthropic REFUSE une demande dont le format de sortie dépasse ses plafonds (structured outputs) : 16 champs
 * « valeur ou vide » (anyOf, type ["string", "null"]) et 24 champs optionnels au total. La v12 de la lecture en
 * comptait 18 : chaque devis échouait en quelques secondes (« Ce devis n'a pas pu être lu »). Chaque format envoyé
 * reste sous les plafonds.
 */
type Json = { type?: string | string[]; anyOf?: Json[]; properties?: Record<string, Json>; required?: string[]; items?: Json; $defs?: Record<string, Json> };

function count(schema: Json): { unions: number; optionals: number } {
  let unions = 0;
  let optionals = 0;
  const walk = (s: Json | undefined) => {
    if (!s) return;
    for (const [name, p] of Object.entries(s.properties ?? {})) {
      if (p.anyOf || Array.isArray(p.type)) unions++;
      if (!(s.required ?? []).includes(name)) optionals++;
      walk(p);
    }
    for (const a of s.anyOf ?? []) walk(a);
    walk(s.items);
    for (const d of Object.values(s.$defs ?? {})) walk(d);
  };
  walk(schema);
  return { unions, optionals };
}

const formats: [string, z.ZodType][] = [
  ["lecture du devis (prompt A)", extractionFormatSchema],
  ["quantitatif (prompt B)", completionWireSchema],
  ["devis fournisseur", offerOutputSchema],
];

describe("plafonds des sorties structurées de l'API", () => {
  for (const [name, schema] of formats) {
    it(`${name} : 16 unions et 24 optionnels au plus`, () => {
      const { unions, optionals } = count(zodOutputFormat(schema).schema as Json);
      expect(unions).toBeLessThanOrEqual(16);
      expect(optionals).toBeLessThanOrEqual(24);
    });
  }
  it("la lecture du devis garde de la marge (14 unions)", () => {
    expect(count(zodOutputFormat(extractionFormatSchema).schema as Json).unions).toBe(14);
  });
});
