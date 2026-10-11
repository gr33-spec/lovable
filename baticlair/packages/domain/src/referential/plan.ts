import type { ChantierContext } from "./context.js";
import type { WorkItemInput } from "./engine.js";
import { normalizeText } from "../trades/trade-profile.js";

/**
 * LE PLAN D'UN DEVIS : chaque ligne rattachée à un ouvrage du référentiel, à ses emplacements et aux données qu'elle
 * porte. Depuis §51.5, c'est la LECTURE DU MODÈLE qui dit tout cela (`planDeLecture`, lecture/lecture.ts) : le code ne
 * cherche plus de mots dans les lignes. Ici restent les types du plan et la lecture d'une valeur écrite (« 35° »).
 */
export interface QuoteLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** Titres du devis au-dessus de la ligne (voir TakeoffLineInput.section). */
  section?: readonly string[];
}

export type LinePlan =
  | {
      ref: string;
      status: "planned";
      workItemId: string;
      /** Emplacement que la ligne désigne (« contre_liteau »). */
      slot: string;
      /** Autres emplacements que la ligne cite (« crochets et naissances compris »). */
      mentions: string[];
      characteristics: string[];
      /** La mesure de l'ouvrage est écrite dans le texte (« sur 200 m² »), pas dans la colonne quantité. */
      measureInText?: { value: string; unit: string };
      /** Sa quantité s'ajoute à celle d'une autre ligne du même article (bandes de rive + bande porte-solin, D-2026-020). */
      adds?: true;
      /** Une quantité sans unité (« 10 ») : l'unité se demande sur la ligne (§49.2) avant tout calcul de l'ouvrage. */
      unitMissing?: true;
      /** Sa quantité mesure l'ouvrage (120 m² de couverture, 4 fenêtres) : elle remplit une donnée de l'ouvrage. */
      measures?: true;
    }
  /** Main-d'œuvre, location, forfait : rien à acheter. */
  | { ref: string; status: "not_material" }
  /** Pas d'ouvrage connu pour cette ligne : BatiClair le dit. */
  | { ref: string; status: "not_covered"; family: string | null; reason: string };

export interface QuotePlan {
  lines: LinePlan[];
  inputs: WorkItemInput[];
  context: ChantierContext;
  /** Caractéristiques du devis par emplacement, pour le nom des lignes d'achat. */
  /** Caractéristiques lues dans les lignes, par emplacement d'UN ouvrage (clé « ouvrage/emplacement ») : les crochets de la gouttière ne prêtent rien aux crochets d'ardoise. */
  characteristicsBySlot: Record<string, string[]>;
  /** Questions de cohérence (deux valeurs différentes pour la même donnée), en phrases. */
  conflicts: string[];
  /**
   * Les mêmes, structurées : deux sources (devis, en-tête lu, croquis) qui ne disent pas la même chose, sans
   * réponse de l'artisan. Jamais tranchées en silence : une question avec les deux valeurs en boutons.
   */
  contradictions: { workItemId: string; key: string; label: string; unit: string; facts: { value: string; unit: string; evidence: string }[] }[];
  /** Ce que l'artisan doit savoir (l'amiante, §18), dès qu'une ligne la nomme, même une ligne de main-d'œuvre. */
  warnings?: string[];
}

/**
 * La famille que NOMME la première parenthèse de la ligne, quand elle commence par le nom d'un autre article d'un
 * ouvrage qui a aussi la famille du titre (« Tubes de descente (Coude zinc Ø80) » : un coude). Sinon null.

/** Unités de ligne de devis → unités du référentiel. */
export const LINE_UNITS: Record<string, string> = { U: "u", M: "m", ML: "m", M2: "m2", M3: "m3", KG: "kg", T: "t" };
const TEXT_UNITS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", ml: "m", m2: "m2", "m²": "m2", "%": "%", "°": "°", metre: "m", metres: "m", degre: "°", degres: "°" };

/** Une valeur lue par le prompt A (« 35° », « 5,50 m », « 45 % », « 0,65 mm ») → valeur et unité du référentiel. */
export function readDimension(raw: string): { value: string; unit: string } | null {
  const m = /^\s*(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(mm|cm|ml|m²|m2|m|%|°|degres|degre|deg)\s*$/i.exec(normalizeText(raw).replace(/\s+/g, " "));
  if (!m) return null;
  const unit = /^deg/.test(m[2]!.toLowerCase()) ? "°" : TEXT_UNITS[m[2]!.toLowerCase()];
  if (!unit) return null;
  return { value: m[1]!.replace(/[ .](?=\d{3})/g, "").replace(",", "."), unit };
}


/** La clé des caractéristiques d'un emplacement : propre à l'ouvrage (deux ouvrages ont chacun leurs « crochets »). */
export const slotCharacteristicsKey = (workItemId: string, slot: string) => `${workItemId}/${slot}`;
