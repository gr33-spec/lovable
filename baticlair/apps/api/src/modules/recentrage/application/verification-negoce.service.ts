import { prenomDirigeant, verifierNegoce, NAF_MATERIAUX_DEFAUT, PHRASES_REFUS_NEGOCE, type VerificationNegoce } from "@baticlair/domain";
import { validationFailed } from "../../../platform/errors/domain-error.js";

/**
 * LA VÉRIFICATION DES NÉGOCES (Greg, 25 octobre 2026) : à l'inscription, le SIRET passe par l'API Recherche d'entreprises
 * de l'État (gratuite, sans clé) : la raison sociale, l'adresse et le code NAF reviennent remplis ; refus si la société
 * n'existe pas, est fermée ou n'a pas une activité de commerce de matériaux (`NAF_MATERIAUX`). E-mail au domaine de
 * l'entreprise : validé ; sinon (Gmail, Orange…) : « à vérifier », l'admin valide en un clic. API en panne : « à
 * vérifier », jamais un refus.
 */
export interface FicheEntreprise {
  trouvee: boolean;
  active: boolean;
  naf: string | null;
  nom: string;
  adresse: string | null;
  /** Lot final, point 1 : le prénom du premier dirigeant (personne physique), pour préremplir l'identité de l'artisan. */
  prenomDirigeant?: string | null;
}

export interface RechercheEntreprises {
  parSiret(siret: string): Promise<FicheEntreprise | null>;
}

/** Les SIRET réservés aux tests (valides au sens de Luhn) : une société fermée, une société hors matériaux. */
export const SIRET_TEST_FERME = "11111111100006";
export const SIRET_TEST_HORS_MATERIAUX = "22222222200002";

/** Dans les tests : toute société existe, est active et vend des matériaux, sauf les deux SIRET réservés. */
export class FakeRechercheEntreprises implements RechercheEntreprises {
  async parSiret(siret: string): Promise<FicheEntreprise | null> {
    if (siret === SIRET_TEST_FERME) return { trouvee: true, active: false, naf: "46.73A", nom: "SOCIETE FERMEE", adresse: null };
    if (siret === SIRET_TEST_HORS_MATERIAUX) return { trouvee: true, active: true, naf: "56.10A", nom: "RESTAURANT TEST", adresse: null };
    return { trouvee: true, active: true, naf: "46.73A", nom: "", adresse: null };
  }
}

type HttpGet = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface ReponseRecherche {
  results?: {
    nom_complet?: string;
    nom_raison_sociale?: string;
    activite_principale?: string;
    etat_administratif?: string;
    siege?: { siret?: string; adresse?: string; etat_administratif?: string; activite_principale?: string };
    matching_etablissements?: { siret?: string; adresse?: string; etat_administratif?: string; activite_principale?: string }[];
    dirigeants?: { type_dirigeant?: string; prenoms?: string; nom?: string }[];
  }[];
}

export class ApiRechercheEntreprises implements RechercheEntreprises {
  constructor(private readonly fetchImpl: HttpGet = globalThis.fetch as unknown as HttpGet) {}

  async parSiret(siret: string): Promise<FicheEntreprise | null> {
    const res = await this.fetchImpl(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`recherche-entreprises ${res.status}`);
    const r = ((await res.json()) as ReponseRecherche).results?.[0];
    if (!r) return { trouvee: false, active: false, naf: null, nom: "", adresse: null };
    const etab = r.matching_etablissements?.find((e) => e.siret === siret) ?? (r.siege?.siret === siret ? r.siege : null);
    if (!etab) return { trouvee: false, active: false, naf: null, nom: "", adresse: null };
    return {
      trouvee: true,
      active: (etab.etat_administratif ?? r.etat_administratif) === "A",
      naf: etab.activite_principale ?? r.activite_principale ?? null,
      nom: r.nom_raison_sociale ?? r.nom_complet ?? "",
      adresse: etab.adresse ?? null,
      prenomDirigeant: prenomDirigeant(r.dirigeants?.find((d) => d.type_dirigeant === "personne physique" && d.prenoms)?.prenoms ?? null),
    };
  }
}

export class VerificationNegoceService {
  constructor(
    private readonly recherche: RechercheEntreprises | null,
    private readonly reglages: { naf: string[] | null; fake: boolean },
  ) {}

  /**
   * Le verdict pour une inscription. Sans SIRET ou API en panne : « à vérifier ». En test (`fake`), le domaine compte
   * comme celui de l'entreprise sauf pour une messagerie grand public.
   */
  /** La fiche de l'annuaire pour un SIRET, ou null (API coupée ou en panne : jamais une erreur). */
  async fiche(siret: string): Promise<FicheEntreprise | null> {
    if (!this.recherche) return null;
    return this.recherche.parSiret(siret).catch(() => null);
  }

  async verifier(i: { siret: string | null; email: string; enseigne: string }): Promise<{ verification: "valide" | "a_verifier"; naf: string | null; raisonSociale: string | null }> {
    if (!i.siret || !this.recherche) return { verification: "a_verifier", naf: null, raisonSociale: null };
    let fiche: FicheEntreprise | null;
    try {
      fiche = await this.recherche.parSiret(i.siret);
    } catch {
      return { verification: "a_verifier", naf: null, raisonSociale: null };
    }
    const nom = fiche?.nom || i.enseigne;
    const nomPourDomaine = this.reglages.fake ? (i.email.split("@")[1] ?? "").split(".")[0] ?? nom : nom;
    const v: VerificationNegoce = verifierNegoce(fiche ? { ...fiche, nom: nomPourDomaine } : null, i.email, this.reglages.naf ?? NAF_MATERIAUX_DEFAUT);
    if (v.statut === "refuse") throw validationFailed(PHRASES_REFUS_NEGOCE[v.raison], { reason: `siret_${v.raison}`, phrase: PHRASES_REFUS_NEGOCE[v.raison] });
    return { verification: v.statut, naf: fiche?.naf ?? null, raisonSociale: fiche?.nom || null };
  }
}
