import type { Referential } from "./model.js";

/**
 * Le référentiel est fait de COUCHES : la base BatiClair, puis ce qui est
 * documenté au fil des vrais chantiers, et plus tard une base externe
 * (API fabricant, catalogue d'un négoce). Le moteur ne voit qu'un seul
 * référentiel : brancher une source ne change pas le moteur.
 *
 * Toute couche suit les mêmes règles que la base (sources, vérification,
 * natures de données) : checkReferential s'applique au résultat. Une donnée
 * importée arrive en « draft » tant que personne ne l'a vérifiée.
 */
export type ReferentialLayer = Pick<Referential, "id" | "version"> & Partial<Omit<Referential, "id" | "version" | "trade">>;

/** Fournisseur de couche (fichier, base, API externe) : il ne fait que charger des données. */
export interface ReferentialProvider {
  id: string;
  load(trade: string): Promise<ReferentialLayer | null>;
}

/**
 * Superpose les couches dans l'ordre : un élément de même identifiant est
 * remplacé par la couche suivante (une donnée mieux documentée remplace la
 * précédente) ; les autres s'ajoutent. La version combinée est enregistrée
 * avec chaque calcul.
 */
export function mergeReferentials(base: Referential, ...layers: ReferentialLayer[]): Referential {
  const merge = <T extends { id?: string; code?: string }>(a: T[], b: T[] | undefined): T[] => {
    if (!b) return a;
    const key = (x: T) => x.id ?? x.code!;
    const replaced = new Map(b.map((x) => [key(x), x]));
    return [...a.map((x) => replaced.get(key(x)) ?? x), ...b.filter((x) => !a.some((y) => key(y) === key(x)))];
  };
  // Les marges n'ont pas d'identifiant : une couche les ajoute (la règle la plus précise l'emporte au calcul).
  return layers.reduce<Referential>(
    (acc, l) => ({
      ...acc,
      version: `${acc.version}+${l.id}@${l.version}`,
      sources: merge(acc.sources, l.sources),
      families: merge(acc.families, l.families),
      products: merge(acc.products, l.products),
      workItems: merge(acc.workItems, l.workItems),
      wasteRules: [...acc.wasteRules, ...(l.wasteRules ?? [])],
    }),
    base,
  );
}
