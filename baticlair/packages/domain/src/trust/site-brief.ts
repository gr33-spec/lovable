import { baseOf } from "../referential/model.js";
import { ficheDocument, type FicheChantier } from "../referential/fiche.js";
import { Decimal } from "../shared/decimal.js";
import { evaluateInterval, formulaVariables, parseFormula, type IntervalValue } from "../referential/expression.js";
import type { Referential } from "../referential/model.js";
import type { QuotePlan } from "../referential/plan.js";
import { METIER_NAMES, tradeIdOf } from "../referential/registry.js";
import { parseRefUnit } from "../referential/units.js";

/**
 * LE CHANTIER EN BREF (§45.3, bloc 1) et la première phrase du mail (§45.2) : cinq à huit faits qui servent le
 * fournisseur (ouvrage, surface, pente, rampant, largeur, matériau et épaisseur, descentes, ville et situation).
 * Seuls les FAITS y entrent : ce que dit le devis, un document, la note ou une réponse de l'artisan. Une hypothèse de
 * l'app (« 2 descentes » quand le devis n'en parle pas, une pente par défaut) n'y figure pas tant que l'artisan ne l'a
 * pas confirmée (§45.7, test 6). Aucun paramètre interne (zone climatique, poids posé, marge) : « bord de mer », oui.
 */
export interface SiteBrief {
  /** « couverture zinc à joint debout » ; « plâtrerie (cloison 72/48) » quand le libellé ne dit pas le métier. */
  ouvrage: string | null;
  /** « Brest » ; null si l'adresse du chantier n'a pas de commune. */
  ville: string | null;
  /** Les faits, dans l'ordre du fournisseur : « 91 m² en monopente », « rampant 7 m », « zinc prépatiné… ». */
  faits: string[];
  /** La situation (« bord de mer »), à côté de la ville dans le bloc 1. */
  situation: string | null;
  /** Les faits du bloc 1 qui ne sont pas dans la phrase du mail (nombre de descentes, §45.2 / §45.3). */
  complements: string[];
}

type Answer = string | { value: string; unit: string } | null;

const fr = (d: Decimal) => {
  const r = d.toDecimalPlaces(2);
  const [int, dec] = r.toFixed().split(".");
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? `,${dec}` : ""}`;
};
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const unitText = (u: string) => (u === "m2" ? "m²" : u === "°" ? "°" : u);
const MAX_FAITS = 8;
/** La forme du toit, telle que l'écrit le devis. */
const FORMES: [RegExp, string][] = [
  [/\bmono[ -]?pente\b/, "monopente"],
  [/\b(?:deux|2) (?:pans|versants)\b/, "deux pans"],
  [/\b(?:quatre|4) (?:pans|versants)\b/, "quatre pans"],
];

/** Les matières qui ouvrent la description du matériau dans une ligne (« Couverture zinc à joint debout prépatiné… »). */
const MATERIAL_START = /\b(zinc|cuivre|inox|alu(?:minium)?|plomb|acier|ardoises?|tuiles?|epdm|bitume|bac acier|plaques? de pl[aâ]tre|ba ?1[38])\b/i;
/** Ce que le libellé de l'ouvrage dit déjà (la pose, pas la matière). */
const POSE_WORDS = /(?:^|\s)(?:à joint debout|joint debout|pos[ée]e?s? au crochet|au crochet|sur liteaux|en couverture)(?=\s|$)/gi;
/**
 * Le matériau d'une ligne quand le prompt A ne l'a pas lu : de la première matière nommée jusqu'à la première
 * virgule, sans les mots de pose (« zinc à joint debout prépatiné gris quartz 0,65 mm » → « zinc prépatiné gris
 * quartz 0,65 mm »). Lu dans le texte du devis, jamais deviné.
 */
export function materialOf(designation: string): string | null {
  const segment = designation.split(/,(?!\d)|[;(]/)[0] ?? "";
  const m = MATERIAL_START.exec(segment);
  if (!m) return null;
  const text = segment.slice(m.index).replace(POSE_WORDS, "").replace(/\s+/g, " ").trim();
  return text.split(" ").length >= 2 ? text.charAt(0).toLowerCase() + text.slice(1) : null;
}

export function siteBrief(input: {
  ref: Referential;
  plan: QuotePlan;
  answers: Readonly<Record<string, Answer>>;
  /** Les lignes du quantitatif, avec la matière lue par le prompt A (« zinc prépatiné gris quartz »). */
  lines: readonly { id: string; designation: string; quantity: string | null; unit: string | null; material?: string | null }[];
  /** Le contexte lu en tête du devis (« objet : réfection monopente »). */
  context?: Readonly<Record<string, string>>;
  ville: string | null;
}): SiteBrief {
  const { ref, plan } = input;
  const planned = plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned");
  // L'ouvrage principal : la plus grande surface du devis, sinon la première ligne reconnue.
  const area = (id: string) => {
    const l = input.lines.find((x) => x.id === id);
    if (!l?.quantity || !/^(m2|m²)$/i.test((l.unit ?? "").trim())) return -1;
    const n = Number(l.quantity.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : -1;
  };
  const main = [...planned].sort((a, b) => area(b.ref) - area(a.ref))[0];
  const work = main ? ref.workItems.find((w) => w.id === baseOf(main.workItemId)) : undefined;
  const metier = METIER_NAMES[tradeIdOf(ref.trade)] ?? ref.trade;
  const label = work ? norm(work.label).startsWith(norm(metier).slice(0, 6)) ? work.label.replace(/\s*\(.*\)$/, "").toLowerCase() : `${metier} (${work.label.replace(/\s*\(.*\)$/, "").toLowerCase()})` : null;

  // Une donnée est un FAIT si l'artisan l'a répondue, ou si le devis, un document ou la note la donne.
  const fact = (key: string): { value: Decimal; unit: string } | null => {
    const a = input.answers[`param:${key}`];
    if (a && typeof a === "object" && a.value !== "") return { value: new Decimal(a.value), unit: a.unit };
    const facts = plan.context.facts.filter((f) => f.key === key && (!f.workItemId || f.workItemId === work?.id));
    const f = facts.find((x) => x.origin === "artisan") ?? facts.find((x) => x.origin === "document") ?? facts[0];
    if (!f) return null;
    try {
      return { value: new Decimal(f.value.replace(",", ".")), unit: f.unit };
    } catch {
      return null;
    }
  };
  /** Une donnée calculée (largeur du pan) n'est un fait que si TOUTES ses entrées en sont. */
  const derivedFact = (key: string): { value: Decimal; unit: string } | null => {
    const d = work?.derived?.find((x) => x.key === key);
    if (!d) return null;
    const expr = parseFormula(d.formula);
    const values = new Map<string, IntervalValue>();
    for (const name of formulaVariables(expr)) {
      const f = fact(name);
      if (!f) return null;
      const u = parseRefUnit(f.unit || "u");
      const v = f.value.times(u.factor);
      values.set(name, { lo: v, hi: v, dim: u.dim });
    }
    const out = evaluateInterval(expr, (n) => values.get(n)!);
    return { value: out.lo.dividedBy(parseRefUnit(d.unit).factor), unit: d.unit };
  };

  const faits: string[] = [];
  const mainLine = main ? input.lines.find((l) => l.id === main.ref) : undefined;
  const texts = norm([...input.lines.map((l) => l.designation), ...Object.values(input.context ?? {})].join(" \n "));
  const forme = FORMES.find(([re]) => re.test(texts))?.[1];
  if (mainLine?.quantity) faits.push(`${mainLine.quantity.replace(".", ",")} ${unitText((mainLine.unit ?? "").replace("²", "2"))}${forme ? ` en ${forme}` : ""}`.trim());
  const pente = fact("pente");
  if (pente) faits.push(`pente ${fr(pente.value)}°`);
  const rampant = fact("longueur_rampant");
  if (rampant) faits.push(`rampant ${fr(rampant.value)} m`);
  const largeur = derivedFact("largeur_pan");
  if (largeur) faits.push(`largeur ${fr(largeur.value)} m`);
  // Le matériau, tel que lu (prompt A), avec l'épaisseur répondue ou lue si elle n'y est pas déjà.
  const material = mainLine?.material?.trim() || (mainLine ? materialOf(mainLine.designation) : null);
  const epaisseur = fact("epaisseur_zinc");
  const ep = epaisseur ? `${fr(epaisseur.value)} mm` : null;
  if (material) faits.push(ep && !material.replace(/\s/g, "").includes(ep.replace(/\s/g, "")) ? `${material} ${ep}` : material);
  else if (ep) faits.push(`épaisseur ${ep}`);
  // Le support, quand une ligne le cite (« pose sur voligeage »).
  const sheathing = planned.some((l) => {
    const w = ref.workItems.find((x) => x.id === baseOf(l.workItemId));
    return [l.slot, ...l.mentions].some((s) => w?.slots.find((x) => x.key === s)?.family === "sheathing");
  });
  if (sheathing) faits.push("pose sur voligeage");
  const complements: string[] = [];
  const descentes = fact("nb_descentes");
  if (descentes && descentes.value.greaterThan(0)) complements.push(`${fr(descentes.value)} descente${descentes.value.greaterThan(1) ? "s" : ""}`);
  // La situation, jamais la zone : zone 3 (et au-delà) = bord de mer (§7, §36.6).
  const zone = fact("zone");
  const situation = zone && zone.value.greaterThanOrEqualTo(3) ? "bord de mer" : null;
  return { ouvrage: label, ville: input.ville, faits: faits.slice(0, MAX_FAITS - 2), situation, complements };
}

/** « Je vous envoie la liste des fournitures pour un chantier de … à Brest : 91 m² en monopente, … » (§45.2). */
export function briefSentence(brief: SiteBrief): string {
  const what = brief.ouvrage ? `un chantier de ${brief.ouvrage}` : "un chantier";
  const where = brief.ville ? ` à ${brief.ville}` : "";
  const facts = brief.faits.length > 0 ? ` : ${brief.faits.join(", ")}` : "";
  return `Je vous envoie la liste des fournitures pour ${what}${where}${facts}.`;
}

/** Les faits du bloc 1 du PDF : l'ouvrage, les faits, la ville et sa situation. */
export function briefFacts(brief: SiteBrief): string[] {
  const out: string[] = [];
  if (brief.ouvrage) out.push(brief.ouvrage.charAt(0).toUpperCase() + brief.ouvrage.slice(1));
  out.push(...brief.faits, ...brief.complements);
  // La ville et sa situation ferment toujours le bloc, dans la limite de huit faits.
  const where = brief.ville || brief.situation ? [[brief.ville, brief.situation].filter(Boolean).join(", ")] : [];
  return [...out.slice(0, MAX_FAITS - where.length), ...where];
}

/** La commune d'une adresse de chantier (« 3 impasse des Lilas, 22500 Paimpol » → « Paimpol »). */
export function communeOf(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = /\b\d{5}\s+([^,;\n]+)/.exec(address);
  const text = (m?.[1] ?? address.split(",").pop() ?? "").trim();
  return text ? text.replace(/^\d{5}\s*/, "").trim() || null : null;
}

/** La clé d'une ligne du bref : son texte d'origine, sans accent ni ponctuation (stable tant que le devis ne change pas). */
export const briefKey = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/**
 * §50.7 « LE CHANTIER EN BREF », le même à l'écran et chez le fournisseur (§45.3 bloc 1) : les faits confirmés, la note de
 * l'artisan (deux lignes au plus, ni prix ni mesures, déjà lues comme faits), la ville qui ferme le bloc ; huit lignes au
 * plus. Chaque ligne garde sa clé et suit la correction de l'artisan (`bref:<clé>` : le texte réécrit, ou vide = retirée).
 */
export function briefResume(
  brief: SiteBrief,
  notes: string | null,
  answers: Readonly<Record<string, unknown>>,
  /** §51 : la fiche de chantier lue par l'IA (déjà complétée et corrigée) ; le bref EST alors la fiche, plus la ville. */
  fiche: FicheChantier | null = null,
): { cle: string; texte: string }[] {
  if (fiche && ficheDocument(fiche).length > 0) {
    const where = brief.ville || brief.situation ? briefFacts(brief).slice(-1) : [];
    // Retour du fondateur (2026-10-11) : le client et l'adresse ne partent que si l'artisan le demande (« bref:avec-client ») ;
    // un négoce n'en a pas besoin pour chiffrer. « Littoral : oui » est déjà dit par la ville (« bord de mer »).
    const withClient = answers["bref:avec-client"] === "oui";
    const lines = [...ficheDocument(fiche), ...where.map((texte) => ({ cle: briefKey(texte), texte }))]
      .filter((l) => !priceLeak(l.texte))
      .filter((l) => !/^fiche-littoral/.test(l.cle))
      .filter((l) => withClient || !IDENTITE.test(l.cle.replace(/^fiche-/, "")));
    return lines.flatMap((l) => {
      // Une ligne de la fiche suit sa correction par la fiche elle-même (`ficheCorrigee`) ; la ville, par son texte.
      if (l.cle.startsWith("fiche-")) return [l];
      const said = answers[`bref:${l.cle}`];
      if (typeof said !== "string") return [l];
      return said.trim() ? [{ cle: l.cle, texte: said.trim() }] : [];
    });
  }
  const noteLines = (notes ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !priceLeak(l) && !/\d/.test(l))
    .slice(0, 2);
  const facts = briefFacts(brief);
  const where = brief.ville || brief.situation ? facts.slice(-1) : [];
  const resume = [...facts.slice(0, facts.length - where.length).slice(0, 8 - where.length - noteLines.length), ...noteLines, ...where];
  return resume.flatMap((texte) => {
    const cle = briefKey(texte);
    const said = answers[`bref:${cle}`];
    if (typeof said !== "string") return [{ cle, texte }];
    return said.trim() ? [{ cle, texte: said.trim() }] : [];
  });
}

/** Les données qui disent QUI et OÙ exactement (pas la ville) : hors du bref par défaut. */
const IDENTITE = /^(?:client|maitre|nom(?:$|[-_])|adresse|code[-_]?postal|telephone|tel|e?-?mail|courriel)/i;

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const plainLabel = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * §50.7, retour du fondateur (2026-10-11) : « Le chantier en bref » en UN texte descriptif, le même à l'écran et chez le
 * fournisseur. L'ouvrage et sa surface ouvrent le texte, puis le matériau, puis les autres faits en une phrase, puis la
 * ville ; le client et l'adresse, s'ils sont demandés, le ferment. Rien n'est inventé : chaque mot vient d'une ligne du bref.
 */
export function briefTexte(lines: readonly { cle: string; texte: string }[]): string {
  const parts = lines.map((l) => {
    const i = l.texte.indexOf(" : ");
    return i > 0 ? { label: l.texte.slice(0, i).trim(), value: l.texte.slice(i + 3).trim() } : { label: "", value: l.texte.trim() };
  });
  const take = (re: RegExp) => {
    const i = parts.findIndex((p) => p.label && re.test(plainLabel(p.label)));
    return i >= 0 ? parts.splice(i, 1)[0] : undefined;
  };
  const ouvrage = take(/^ouvrage$/);
  const surface = take(/^surface$/);
  const materiau = take(/^materiaux?$/);
  const client = take(/^(?:client|maitre)/);
  const adresse = take(/^adresse/);
  take(/^code.?postal/);
  // La ville et sa situation : la dernière ligne sans libellé.
  const lastPlain = parts.length > 0 && !parts[parts.length - 1]!.label ? parts.pop() : undefined;
  const sentences: string[] = [];
  if (ouvrage) sentences.push(`${capitalize(ouvrage.value)}${surface ? `, ${surface.value}` : ""}`);
  else if (surface) sentences.push(`Surface ${surface.value}`);
  if (materiau) sentences.push(capitalize(materiau.value));
  const phrase = (p: { label: string; value: string }) => {
    if (!p.label) return p.value;
    const label = p.label.charAt(0).toLowerCase() + p.label.slice(1);
    if (/^oui$/i.test(p.value)) return label;
    if (/^non$/i.test(p.value)) return `sans ${label}`;
    if (/^oui\s*[,:]\s*/i.test(p.value)) return `${capitalize(label)} : ${p.value.replace(/^oui\s*[,:]\s*/i, "")}`;
    const many = /^nombre (?:de |d['’])(.+)$/i.exec(label);
    if (many) return `${p.value} ${many[1]}`;
    return /^\d/.test(p.value) ? `${label} ${p.value}` : `${label} : ${p.value}`;
  };
  const facts = parts.map(phrase).filter(Boolean);
  if (facts.length > 0) sentences.push(capitalize(facts.join(", ")));
  if (lastPlain) sentences.push(ouvrage || materiau || facts.length > 0 ? `Chantier à ${lastPlain.value}` : capitalize(lastPlain.value));
  if (client || adresse) sentences.push([client ? `Client : ${client.value}` : null, adresse ? `${client ? "adresse" : "Adresse"} : ${adresse.value}` : null].filter(Boolean).join(", "));
  return sentences.map((s) => `${s.replace(/[.\s]+$/, "")}.`).join(" ");
}

/**
 * Le test du §42.2 et du §43.5, appliqué à tout texte qui part chez le fournisseur : le symbole €,
 * une devise, un montant à deux décimales suivi d'une devise, ou les mots du chiffrage.
 * Renvoie ce qui a été trouvé, ou null si le texte est propre.
 */
export function priceLeak(text: string): string | null {
  const patterns = [/€/, /\d[\d\s]*[.,]\d{2}\s*(?:€|eur|euros?)\b/i, /\b(?:HT|TTC|TVA)\b/, /\b(?:remise|montant|prix unitaire|p\.u\.|total)\b/i, /(?<!sans )\bprix\b/i];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
