import type { Referential } from "./model.js";

/**
 * UN TIROIR FAIT DE PLUSIEURS (lot B, constructeur de maisons / entreprise générale) : le devis d'un constructeur passe
 * par tous les lots (maçonnerie, plâtrerie, électricité…) ; chaque ligne est calculée par le tiroir de son lot, avec ses
 * règles, ses questions du comptoir et ses sources, sans rien réécrire. Les tiroirs sont réunis dans l'ordre donné ; un
 * code de famille, un produit ou un ouvrage déjà pris par un tiroir précédent est préfixé par l'identifiant du tiroir
 * (« menuiserie-interieure.plinthe-240 ») pour que deux métiers ne se marchent jamais dessus. Une source de même
 * identifiant est la même source (« definition ») : gardée une fois.
 */
export function composeReferentials(id: string, version: string, trade: string, refs: readonly Referential[]): Referential {
  const families = new Set<string>();
  const products = new Set<string>();
  const works = new Set<string>();
  const out: Referential = { id, version, trade, sources: [], families: [], products: [], workItems: [], wasteRules: [], countedWorks: [] };
  for (const ref of refs) {
    const name = (taken: Set<string>, code: string) => (taken.has(code) ? `${ref.id}.${code}` : code);
    const fam = new Map(ref.families.map((f) => [f.code, name(families, f.code)]));
    const prod = new Map(ref.products.map((p) => [p.id, name(products, p.id)]));
    const work = new Map(ref.workItems.map((w) => [w.id, name(works, w.id)]));
    const f = (code: string) => fam.get(code) ?? code;
    for (const s of ref.sources) if (!out.sources.some((x) => x.id === s.id)) out.sources.push(s);
    for (const x of ref.families) {
      out.families.push({ ...x, code: f(x.code), ...(x.refines ? { refines: f(x.refines) } : {}) });
      families.add(f(x.code));
    }
    for (const p of ref.products) {
      out.products.push({ ...p, id: prod.get(p.id)!, family: f(p.family) });
      products.add(prod.get(p.id)!);
    }
    for (const w of ref.workItems) {
      out.workItems.push({
        ...w,
        id: work.get(w.id)!,
        triggers: w.triggers.map(f),
        slots: w.slots.map((s) => ({
          ...s,
          family: f(s.family),
          ...(s.usual ? { usual: { ...s.usual, ...(s.usual.productId ? { productId: prod.get(s.usual.productId) ?? s.usual.productId } : {}) } } : {}),
        })),
      });
      works.add(work.get(w.id)!);
    }
    for (const r of ref.wasteRules) {
      out.wasteRules.push({ ...r, family: f(r.family), ...(r.product ? { product: prod.get(r.product) ?? r.product } : {}), ...(r.workItem ? { workItem: work.get(r.workItem) ?? r.workItem } : {}) });
    }
    for (const c of ref.countedWorks ?? []) if (!out.countedWorks!.some((x) => x.key === c.key)) out.countedWorks!.push(c);
  }
  return out;
}
