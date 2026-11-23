import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, SUGGESTIONS_KEY, type EngineAnswer } from "../src/index.js";

/**
 * FIXATION DES TUILES (A-INTEGRER §2 ; Greg, 23 novembre 2026 : « la Bretagne d'abord ») : en Suggestion ; cochée, les tuiles
 * du 1er rang d'égout et de rive toujours fixées, la partie courante selon le tableau du NF DTU 40.21 §5.4 (zone de vent par
 * département, site exposé par la commune, écran, pente). Seule question : « Écran sous toiture ? », si le devis n'en dit rien.
 */
const C02 = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C02.json", import.meta.url), "utf8")).lecture)!;
const CASE = "couverture-tuiles-emboitement/fixation";
const vent = (v: string) => [{ key: "zone_vent", value: v, unit: "u", evidence: "Département du chantier", origin: "document" as const }];
const lire = (answers: Record<string, EngineAnswer>, zone?: string) => ecranDeLecture({ ref, lecture: C02, answers, preferences: {}, ...(zone ? { extraFacts: vent(zone) } : {}) });
const fixations = (e: ReturnType<typeof lire>) => e.purchase.toBuy.find((b) => /^Crochets de fixation/.test(b.label));

describe("la fixation des tuiles", () => {
  it("une case de la catégorie Fixations ; non cochée, rien", () => {
    expect(lire({}, "3").suggestions.find((s) => s.key === CASE)).toMatchObject({ label: "Fixation des tuiles (crochets)", categorie: "Fixations" });
    expect(fixations(lire({ [SUGGESTIONS_KEY]: "aucune" }, "3"))).toBeUndefined();
  });

  it("Côtes-d'Armor (vent 3) : sans écran plus de fixations qu'avec écran ; égout et rives toujours fixés", () => {
    const base = (ecran: string): Record<string, EngineAnswer> => {
      const a: Record<string, EngineAnswer> = { [SUGGESTIONS_KEY]: CASE };
      let e = lire(a, "3");
      for (let i = 0; i < 4; i++) {
        for (const q of e.questions) {
          if (a[q.key] !== undefined) continue;
          a[q.key] = /ecran_sous_toiture/.test(q.key) ? { value: ecran, unit: "u" } : /longueur_rives/.test(q.key) ? { value: "20", unit: "m" } : q.options?.[0] ? { value: q.options[0].value, unit: q.unit ?? "u" } : null;
        }
        e = lire(a, "3");
      }
      return a;
    };
    const sans = fixations(lire(base("2"), "3"))!;
    const avec = fixations(lire(base("1"), "3"))!;
    expect(sans.postes?.map((p) => p.id)).toEqual(["courante", "egout", "rives"]);
    const n = (x: typeof sans) => (x.postes ?? []).reduce((t, p) => t + Number(p.valeur), 0);
    expect(n(sans)).toBeGreaterThan(n(avec));
    expect(sans.quantity).toMatch(/boîtes? de 400$/);
  });

  it("hors Bretagne (zone de vent inconnue) : rien n'est inventé", () => {
    const e = lire({ [SUGGESTIONS_KEY]: CASE });
    const f = fixations(e);
    expect(f?.state === "ready" && f?.quantity ? f.quantity : null).toBeNull();
  });
});
