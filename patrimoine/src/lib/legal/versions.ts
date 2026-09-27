// Cadre juridique versionné. Chaque document généré porte la référence du
// modèle utilisé ; le modèle applicable est choisi automatiquement selon la
// date du bail (date de signature, à défaut date de prise d'effet).
//
// MAINTENANCE : pour un nouveau texte (décret, loi), ajouter une version ici
// avec sa date d'entrée en vigueur, puis adapter les rédactions dans
// lease.ts en testant `version.id`. Ne jamais modifier une version passée :
// un bail déjà signé doit pouvoir être régénéré à l'identique.

export interface LegalVersion {
  id: string;
  label: string;
  /** Première date (incluse) d'application : bail conclu ou renouvelé à compter de cette date. */
  from: string;
  /** Dernière date (incluse) d'application. */
  to?: string;
  sources: string[];
  /**
   * Rédaction comparée mot à mot au texte publié au Journal officiel.
   * Tant que `false`, l'application signale que la rédaction doit être
   * contrôlée avant signature.
   */
  verified: boolean;
  verifyNote?: string;
}

export const LEASE_VERSIONS: LegalVersion[] = [
  {
    id: "nue-2015",
    label: "Contrat type de location nue — décret n° 2015-587 du 29 mai 2015",
    from: "2015-08-01",
    to: "2026-09-30",
    sources: [
      "Loi n° 89-462 du 6 juillet 1989, art. 3",
      "Décret n° 2015-587 du 29 mai 2015 relatif aux contrats types de location de logement à usage de résidence principale, annexe 1",
      "Loi n° 2023-668 du 27 juillet 2023 (clause résolutoire : six semaines après commandement de payer)",
    ],
    verified: false,
    verifyNote:
      "Structure et mentions du contrat type reprises ; rédaction établie d'après la loi du 6 juillet 1989. Texte non comparé mot à mot avec l'annexe publiée au Journal officiel.",
  },
  {
    id: "nue-2026",
    label: "Contrat type de location nue — décret n° 2015-587 modifié par le décret n° 2026-596 du 6 juillet 2026",
    from: "2026-10-01",
    sources: [
      "Loi n° 89-462 du 6 juillet 1989, art. 3 et 24",
      "Décret n° 2015-587 du 29 mai 2015, annexe 1, dans sa rédaction issue du décret n° 2026-596 du 6 juillet 2026 (JO du 7 juillet 2026)",
      "Code de l'urbanisme, art. L. 151-14-1 (servitude de résidence principale)",
    ],
    verified: false,
    verifyNote:
      "Nouveautés intégrées : clause résolutoire obligatoire (loyer, charges, dépôt de garantie — six semaines après commandement de payer), clauses résolutoires facultatives (assurance, troubles de voisinage, servitude de résidence principale), téléphone portable des parties. La rédaction de ces clauses doit être alignée mot à mot sur l'annexe publiée au Journal officiel.",
  },
];

export const INSPECTION_VERSION: LegalVersion = {
  id: "edl-2016",
  label: "État des lieux — décret n° 2016-382 du 30 mars 2016",
  from: "2016-06-01",
  sources: ["Loi n° 89-462 du 6 juillet 1989, art. 3-2", "Décret n° 2016-382 du 30 mars 2016 fixant les modalités d'établissement de l'état des lieux"],
  verified: true,
};

export const RECEIPT_VERSION: LegalVersion = {
  id: "quittance-art21",
  label: "Quittance et reçu — article 21 de la loi du 6 juillet 1989",
  from: "1989-07-08",
  sources: ["Loi n° 89-462 du 6 juillet 1989, art. 21"],
  verified: true,
};

/** Modèle de bail applicable à une date (AAAA-MM-JJ). */
export function leaseVersionFor(date: string | undefined): LegalVersion {
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const found = LEASE_VERSIONS.find((v) => d >= v.from && (!v.to || d <= v.to));
  // Avant 2015 : on applique le premier modèle disponible (à défaut de modèle officiel antérieur).
  return found ?? LEASE_VERSIONS[0];
}

/** Date déterminant le modèle : conclusion du bail (signature), à défaut prise d'effet. */
export function leaseReferenceDate(t: { signDate?: string; startDate?: string }): string | undefined {
  return t.signDate || t.startDate;
}
