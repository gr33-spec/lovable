import { z } from "zod";
import { paletteFor, themeDef, THEMES } from "../theme";
import type { PdfCover, PdfPrefs, PdfSection } from "../types";

// Personnalisation des dossiers PDF (couleur, couverture, textes, parties).
// Partagé entre l'écran de réglage et la génération côté serveur : les
// choix ne modifient jamais les chiffres, seulement la présentation.

export const PDF_SECTIONS: { id: PdfSection; label: string; hint: string }[] = [
  { id: "patrimoine", label: "État du patrimoine", hint: "Immeubles, valeurs, loyers, dette" },
  { id: "credits", label: "Crédits en cours", hint: "Détail par société" },
  { id: "capacite", label: "Capacité de remboursement", hint: "DSCR, taux d'effort, par société" },
  { id: "trajectoire", label: "Trajectoire", hint: "Graphiques, ventes, fins de crédit" },
  { id: "remuneration", label: "Rémunération des dirigeants", hint: "Si des rémunérations sont saisies" },
  { id: "comptes", label: "Comptes annuels", hint: "Si des bilans sont saisis" },
];

export const PDF_COVERS: { id: PdfCover; label: string; hint: string }[] = [
  { id: "immersive", label: "Immersive", hint: "Pleine page aux couleurs du thème" },
  { id: "bandeau", label: "Bandeau", hint: "Bandeau coloré, chiffres clés dessous" },
  { id: "epure", label: "Épurée", hint: "Fond blanc, touches de couleur" },
];

export const DEFAULT_COVER: PdfCover = "immersive";
export const APP_COLOR = "app";

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max))
    .optional();

const schema = z.object({
  color: z.enum([APP_COLOR, ...THEMES.map((t) => t.id)] as [string, ...string[]]).optional().catch(undefined),
  cover: z.enum(["immersive", "bandeau", "epure"]).optional().catch(undefined),
  title: text(80).catch(undefined),
  subtitle: text(120).catch(undefined),
  recipient: text(120).catch(undefined),
  message: text(700).catch(undefined),
  hide: z
    .array(z.enum(["patrimoine", "credits", "capacite", "trajectoire", "remuneration", "comptes"]))
    .max(6)
    .optional()
    .catch(undefined),
});

/** Lecture tolérante : une valeur invalide est ignorée, jamais bloquante. */
export function parsePdfPrefs(raw: unknown): PdfPrefs {
  const r = schema.safeParse(raw ?? {});
  if (!r.success) return {};
  const out: PdfPrefs = {};
  for (const [k, v] of Object.entries(r.data)) if (v !== undefined && v !== "") (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Préférences passées dans l'adresse du PDF (paramètre `o`), sinon celles enregistrées. */
export function prefsFromUrl(url: URL, saved: unknown): PdfPrefs {
  const o = url.searchParams.get("o");
  if (o) {
    try {
      return parsePdfPrefs(JSON.parse(o));
    } catch {
      /* adresse abîmée : on retombe sur les réglages enregistrés */
    }
  }
  return parsePdfPrefs(saved);
}

export function prefsQuery(p: PdfPrefs | undefined): string {
  const clean = parsePdfPrefs(p);
  return Object.keys(clean).length ? `o=${encodeURIComponent(JSON.stringify(clean))}` : "";
}

export const shows = (p: PdfPrefs, s: PdfSection) => !p.hide?.includes(s);

/** Couleurs du document, déduites du thème (même moteur que l'application). */
export interface PdfColors {
  brand: string;
  deep: string;
  deep2: string;
  deep3: string;
  soft: string;
  stripe: string;
  glow: string;
  muted: string;
  onBrand: string;
}

export function pdfThemeId(p: PdfPrefs | undefined, appTheme: string | undefined): string {
  return !p?.color || p.color === APP_COLOR ? themeDef(appTheme).id : themeDef(p.color).id;
}

export function pdfColors(p: PdfPrefs | undefined, appTheme: string | undefined): PdfColors {
  const pal = paletteFor(themeDef(pdfThemeId(p, appTheme)).base);
  return {
    brand: pal.brand,
    deep: pal.deep,
    deep2: pal.deep2,
    deep3: pal.deep3,
    soft: pal.brandSoft,
    stripe: pal.bg,
    glow: pal.brandGlow,
    muted: pal.brandMuted,
    onBrand: pal.onBrand,
  };
}
