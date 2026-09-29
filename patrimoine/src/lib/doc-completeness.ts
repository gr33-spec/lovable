import type { AppData, DocCategory } from "./types";
import { documentIndex } from "./documents";

// Pièces essentielles, volontairement peu nombreuses (pas d'alerte en
// cascade) : ce qu'un banquier ou un notaire demande en premier.
//  - bien loué : acte d'achat, assurance ;
//  - crédit en cours : offre de prêt (le tableau d'amortissement est suivi à part).
// Les baux et cautions signés sont suivis par le dossier du locataire.

export interface MissingDoc {
  id: string;
  label: string;
  category: DocCategory;
}

type Scope = { buildingId: string } | { loanId: string };

// Index calculé une fois par version des données (appelé pour chaque bien et crédit).
const cache = new WeakMap<AppData, ReturnType<typeof documentIndex>>();

export function missingDocuments(data: AppData, scope: Scope): MissingDoc[] {
  let docs = cache.get(data);
  if (!docs) {
    docs = documentIndex(data);
    cache.set(data, docs);
  }
  const has = (cat: DocCategory) => docs.some((d) => d.category === cat && ("buildingId" in scope ? d.buildingId === scope.buildingId : d.loanId === scope.loanId));
  const out: MissingDoc[] = [];
  if ("buildingId" in scope) {
    const b = data.buildings.find((x) => x.id === scope.buildingId);
    if (!b) return out;
    const personal = b.usage === "residence_principale" || b.usage === "residence_secondaire";
    if (personal) return out;
    if (!has("acte")) out.push({ id: "acte", label: "acte d'achat", category: "acte" });
    if (!has("assurance")) out.push({ id: "assurance", label: "assurance (propriétaire non occupant)", category: "assurance" });
  } else {
    const l = data.loans.find((x) => x.id === scope.loanId);
    if (!l) return out;
    if (!has("offre_pret")) out.push({ id: "offre", label: "offre de prêt", category: "offre_pret" });
  }
  return out;
}
