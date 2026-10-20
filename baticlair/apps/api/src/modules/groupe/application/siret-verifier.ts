/**
 * Section 5 du parcours groupé : « SIRET vérifié (API INSEE) avant tout accès au groupé ». Le port dit seulement si
 * l'établissement existe et est actif ; l'adaptateur INSEE l'interroge, les tests le remplacent.
 */
export type ResultatSiret = { statut: "actif" } | { statut: "inconnu" } | { statut: "ferme" } | { statut: "indisponible" };

export interface SiretVerifier {
  verifier(siret: string): Promise<ResultatSiret>;
}

export const SIRET_VERIFIER = Symbol("SIRET_VERIFIER");

/** Quatorze chiffres et la clé de Luhn (les SIRET de La Poste, 356000000…, font exception : somme multiple de 5). */
export function siretBienForme(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (siret.startsWith("356000000")) return [...siret].reduce((s, c) => s + Number(c), 0) % 5 === 0;
  let somme = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(siret[13 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    somme += d;
  }
  return somme % 10 === 0;
}

/** API Sirene de l'INSEE (clé d'intégration) ; sans clé configurée, la vérification est indisponible. */
export class InseeSiretVerifier implements SiretVerifier {
  constructor(private readonly apiKey: string | null) {}

  async verifier(siret: string): Promise<ResultatSiret> {
    if (!this.apiKey) return { statut: "indisponible" };
    try {
      const res = await fetch(`https://api.insee.fr/api-sirene/3.11/siret/${siret}`, {
        headers: { "X-INSEE-Api-Key-Integration": this.apiKey, accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return { statut: "inconnu" };
      if (!res.ok) return { statut: "indisponible" };
      const body = (await res.json()) as { etablissement?: { periodesEtablissement?: { etatAdministratifEtablissement?: string }[] } };
      const etat = body.etablissement?.periodesEtablissement?.[0]?.etatAdministratifEtablissement;
      return etat === "A" ? { statut: "actif" } : { statut: "ferme" };
    } catch {
      return { statut: "indisponible" };
    }
  }
}
