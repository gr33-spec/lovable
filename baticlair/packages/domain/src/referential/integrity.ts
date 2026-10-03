import { formulaVariables, inferDim, parseFormula } from "./expression.js";
import { GENERIC_PRODUCT_DATA_SOURCES, PRODUCT_DATA_SOURCES, type Fact, type Provenance, type Referential } from "./model.js";
import { dimLabel, parseRefUnit, sameDim, type Dim } from "./units.js";
import { normalizeText } from "../trades/trade-profile.js";

/**
 * Contrôle d'un référentiel avant usage (tests et chargement). Une erreur
 * ici est une donnée qui pourrait produire une fausse quantité : le
 * référentiel est refusé, pas « corrigé ».
 */
export function checkReferential(ref: Referential): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where} : ${msg}`);
  const sourceIds = new Set<string>();
  for (const s of ref.sources) {
    if (sourceIds.has(s.id)) err(`source ${s.id}`, "identifiant en double");
    sourceIds.add(s.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.retrievedAt)) err(`source ${s.id}`, "date de récupération invalide (AAAA-MM-JJ)");
    if (!s.url && !s.documentRef && s.kind !== "definition" && s.kind !== "baticlair_rule") err(`source ${s.id}`, "ni adresse ni référence de document");
  }

  const provenance = (where: string, p: Provenance) => {
    if (!sourceIds.has(p.source)) err(where, `source inconnue « ${p.source} »`);
    if (!Number.isInteger(p.version) || p.version < 1) err(where, "version invalide");
    if (p.verification.status === "verified" && (!p.verification.verifiedAt || !p.verification.verifiedBy)) {
      err(where, "vérifiée sans date ni vérificateur");
    }
  };
  const unitDim = (where: string, unit: string): Dim | null => {
    try {
      return parseRefUnit(unit).dim;
    } catch (e) {
      err(where, (e as Error).message);
      return null;
    }
  };
  const fact = (where: string, f: Fact, expected?: Dim | null) => {
    provenance(where, f);
    if (!/^-?\d+(\.\d+)?$/.test(f.value)) err(where, `valeur « ${f.value} » non décimale`);
    const dim = unitDim(where, f.unit);
    if (dim && expected && !sameDim(dim, expected)) err(where, `unité ${f.unit} (${dimLabel(dim)}) au lieu de ${dimLabel(expected)}`);
  };

  /**
   * Une caractéristique produit se prouve par le fabricant (ou une norme, un distributeur), jamais par
   * l'habitude ; seul un produit GÉNÉRIQUE (sans marque) peut tenir ses données d'une pratique métier validée.
   */
  const productFact = (where: string, f: Fact, expected: Dim | null, nature: Fact["kind"], generic = false) => {
    fact(where, f, expected);
    if (f.kind !== nature) err(where, `nature « ${f.kind} » rangée comme « ${nature} »`);
    const sourceKind = ref.sources.find((s) => s.id === f.source)?.kind;
    const allowed = generic ? GENERIC_PRODUCT_DATA_SOURCES : PRODUCT_DATA_SOURCES;
    if (sourceKind && !allowed.includes(sourceKind)) err(where, `donnée produit sourcée par « ${sourceKind} » : il faut une source fabricant, norme ou distributeur`);
  };

  const families = new Map(ref.families.map((f) => [f.code, f]));
  for (const f of ref.families) {
    unitDim(`famille ${f.code}`, f.needUnit);
    for (const a of f.attributes) unitDim(`famille ${f.code}.${a.key}`, a.unit);
    for (const k of f.keyAttributes) if (!f.attributes.some((a) => a.key === k)) err(`famille ${f.code}`, `caractéristique clé inconnue « ${k} »`);
  }

  const productIds = new Set<string>();
  const aliasOwners = new Map<string, string>();
  for (const p of ref.products) {
    const where = `produit ${p.id}`;
    if (productIds.has(p.id)) err(where, "identifiant en double");
    productIds.add(p.id);
    const family = families.get(p.family);
    if (!family) {
      err(where, `famille inconnue « ${p.family} »`);
      continue;
    }
    for (const [key, f] of Object.entries(p.attributes)) {
      const def = family.attributes.find((a) => a.key === key);
      if (!def) err(where, `caractéristique « ${key} » non déclarée pour la famille ${family.code}`);
      productFact(`${where}.${key}`, f, def ? unitDim(`${where}.${key}`, def.unit) : null, "manufacturer_spec", p.generic === true);
    }
    const needDim = unitDim(where, family.needUnit);
    // Aucune unité de vente = conditionnement encore inconnu (permis : les besoins s'affichent, la conversion attend).
    if (p.sellingUnits.length > 0 && p.sellingUnits.filter((s) => s.primary).length !== 1) err(where, "il faut exactement une unité de commande principale");
    for (const su of p.sellingUnits) productFact(`${where} vendu par ${su.id}`, su.contains, needDim, "packaging", p.generic === true);
    for (const alias of p.aliases) {
      const key = `${p.family}|${normalizeText(alias)}`;
      const owner = aliasOwners.get(key);
      if (owner && owner !== p.id) err(where, `appellation « ${alias} » déjà portée par ${owner} (ambiguïté à trancher par une question, pas par l'ordre)`);
      aliasOwners.set(key, p.id);
    }
  }

  for (const w of ref.workItems) {
    const where = `ouvrage ${w.id}`;
    for (const t of w.triggers) if (!families.has(t)) err(where, `famille déclencheuse inconnue « ${t} »`);
    for (const s of w.slots) {
      if (!families.has(s.family)) err(where, `emplacement ${s.key} : famille inconnue « ${s.family} »`);
      if (s.usual) {
        if (!sourceIds.has(s.usual.source)) err(`${where} emplacement ${s.key}`, `source inconnue « ${s.usual.source} »`);
        const p = s.usual.productId ? ref.products.find((x) => x.id === s.usual!.productId) : undefined;
        if (s.usual.productId && (!p || p.family !== s.family)) err(`${where} emplacement ${s.key}`, `produit par défaut « ${s.usual.productId} » inconnu ou d'une autre famille`);
      }
    }
    for (const [k, c] of Object.entries(w.constants)) {
      fact(`${where}.regle.${k}`, c);
      if (c.kind !== "installation_condition") err(`${where}.regle.${k}`, `une constante d'ouvrage est une condition de pose, pas « ${c.kind} »`);
    }
    const paramDims = new Map<string, Dim | null>(w.params.map((p) => [p.key, unitDim(`${where}.${p.key}`, p.unit)]));
    for (const [k, t] of Object.entries(w.tables ?? {})) {
      const tw = `${where} table ${k}`;
      provenance(tw, t);
      unitDim(tw, t.unit);
      if (t.axes.length < 1 || t.axes.length > 2) err(tw, "une table a une ou deux entrées");
      for (const a of t.axes) {
        if (!paramDims.has(a.param)) err(tw, `entrée inconnue « ${a.param} »`);
        if (a.thresholds.length === 0 || a.thresholds.some((x) => !/^-?\d+(\.\d+)?$/.test(x))) err(tw, "seuils non décimaux ou absents");
        if (a.thresholds.some((x, i) => i > 0 && Number(x) <= Number(a.thresholds[i - 1]))) err(tw, "seuils non croissants");
      }
      const rows = t.axes[0]?.thresholds.length ?? 0;
      const cols = t.axes[1]?.thresholds.length ?? 1;
      if (t.values.length !== rows || t.values.some((r) => r.length !== cols)) err(tw, `il faut ${rows} lignes de ${cols} valeurs`);
      if (t.values.flat().some((x) => !/^-?\d+(\.\d+)?$/.test(x))) err(tw, "valeur non décimale");
    }
    const derivedDims = new Map<string, Dim | null>((w.derived ?? []).map((d) => [d.key, unitDim(`${where}.${d.key}`, d.unit)]));
    const dimOf = (name: string): Dim => {
      const [head, attr] = name.split(".");
      if (attr === undefined) {
        const d = paramDims.get(name) ?? derivedDims.get(name);
        if (d === undefined) throw new Error(`variable inconnue « ${name} »`);
        if (d === null) throw new Error(`unité invalide pour « ${name} »`);
        return d;
      }
      if (head === "table") {
        const t = w.tables?.[attr];
        if (!t) throw new Error(`table inconnue « ${attr} »`);
        return parseRefUnit(t.unit).dim;
      }
      if (head === "commande") {
        const n = w.needs.find((x) => x.id === attr);
        if (!n) throw new Error(`besoin inconnu « ${attr} »`);
        return parseRefUnit(n.unit).dim;
      }
      if (head === "regle") {
        const c = w.constants[attr];
        if (!c) throw new Error(`constante inconnue « ${attr} »`);
        return parseRefUnit(c.unit).dim;
      }
      const slot = w.slots.find((s) => s.key === head);
      const def = slot ? families.get(slot.family)?.attributes.find((a) => a.key === attr) : undefined;
      if (!def) throw new Error(`caractéristique inconnue « ${name} »`);
      return parseRefUnit(def.unit).dim;
    };
    for (const p of w.params) {
      const own = paramDims.get(p.key);
      for (const bound of p.range ? [p.range.min, p.range.max] : []) {
        try {
          const d = dimOf(bound);
          if (own && !sameDim(d, own)) err(`${where}.${p.key}`, `borne ${bound} d'une autre dimension`);
        } catch (e) {
          err(`${where}.${p.key}`, (e as Error).message);
        }
      }
      if (p.default) {
        const dw = `${where}.${p.key} (hypothèse)`;
        provenance(dw, p.default);
        if ((p.default.value === undefined) === (p.default.formula === undefined)) err(dw, "une valeur OU une formule");
        if (p.default.value !== undefined && !/^-?\d+(\.\d+)?$/.test(p.default.value)) err(dw, `valeur « ${p.default.value} » non décimale`);
        if (p.default.formula !== undefined) {
          try {
            const expr = parseFormula(p.default.formula);
            if (formulaVariables(expr).includes(p.key)) err(dw, "l'hypothèse se cite elle-même");
            const d = inferDim(expr, dimOf);
            if (own && !sameDim(d, own)) err(dw, `la formule donne ${dimLabel(d)}, pas des ${p.unit}`);
          } catch (e) {
            err(dw, (e as Error).message);
          }
        }
      }
      if (p.choices?.some((c) => !/^-?\d+(\.\d+)?$/.test(c.value))) err(`${where}.${p.key}`, "réponse proposée non décimale");
      for (const s of p.forSlots ?? []) if (!w.slots.some((x) => x.key === s)) err(`${where}.${p.key}`, `emplacement inconnu « ${s} »`);
    }
    for (const d of w.derived ?? []) {
      const dw = `${where} valeur ${d.key}`;
      provenance(dw, d);
      if (paramDims.has(d.key)) err(dw, "même clé qu'un paramètre");
      try {
        const expr = parseFormula(d.formula);
        if (formulaVariables(expr).includes(d.key)) err(dw, "la valeur se cite elle-même");
        const dim = inferDim(expr, dimOf);
        const own = derivedDims.get(d.key);
        if (own && !sameDim(dim, own)) err(dw, `la formule donne ${dimLabel(dim)}, pas des ${d.unit}`);
      } catch (e) {
        err(dw, (e as Error).message);
      }
    }
    const needIds = new Set<string>();
    for (const n of w.needs) {
      const nw = `${where} besoin ${n.id}`;
      if (needIds.has(n.id)) err(nw, "identifiant en double");
      needIds.add(n.id);
      provenance(nw, n);
      if (!w.slots.some((s) => s.key === n.slot)) err(nw, `emplacement inconnu « ${n.slot} »`);
      for (const r of n.requires ?? []) if (!paramDims.has(r)) err(nw, `donnée requise inconnue « ${r} »`);
      const expected = unitDim(nw, n.unit);
      try {
        const expr = parseFormula(n.formula);
        formulaVariables(expr).forEach(dimOf);
        for (const v of formulaVariables(expr).filter((x) => x.startsWith("commande."))) {
          const cited = v.slice("commande.".length);
          if (cited === n.id || !needIds.has(cited)) err(nw, `« ${v} » : le besoin cité doit être calculé AVANT celui-ci`);
        }
        const dim = inferDim(expr, dimOf);
        if (expected && !sameDim(dim, expected)) err(nw, `la formule donne ${dimLabel(dim)}, pas des ${n.unit}`);
      } catch (e) {
        err(nw, (e as Error).message);
      }
    }
  }

  for (const r of ref.wasteRules) {
    provenance(`marge ${r.family}`, r);
    if (!families.has(r.family)) err(`marge ${r.family}`, "famille inconnue");
    if (r.product && !ref.products.some((p) => p.id === r.product && p.family === r.family)) err(`marge ${r.family}`, `produit inconnu « ${r.product} »`);
    if (r.workItem && !ref.workItems.some((w) => w.id === r.workItem)) err(`marge ${r.family}`, `ouvrage inconnu « ${r.workItem} »`);
    if (!/^\d+(\.\d+)?$/.test(r.rate)) err(`marge ${r.family}`, "taux invalide");
  }
  return errors;
}
