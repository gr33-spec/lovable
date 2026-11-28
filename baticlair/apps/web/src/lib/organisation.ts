/**
 * Données structurées de Mobiiz (Greg, 28 novembre 2026, référencement) : `Organization` et `WebSite`, seulement sur la
 * landing. Rien que des faits visibles ailleurs sur le site (nom, éditeur des mentions légales, adresse de contact, logo) :
 * aucun avis, aucune note, aucune promesse. Google s'en sert pour le nom du site et le logo dans ses résultats. Aucun
 * import : lu par la landing et par le test `scripts/indexation.test.mjs`.
 */
export function donneesOrganisation(origine: string, d: { nom: string; editeur: string; email: string; accroche: string }) {
  const racine = `${origine}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${racine}#organisation`,
        name: d.nom,
        legalName: d.editeur,
        url: racine,
        logo: `${origine}/marque/icone-1024.png`,
        email: d.email,
        slogan: d.accroche,
        areaServed: "FR",
      },
      {
        "@type": "WebSite",
        "@id": `${racine}#site`,
        name: d.nom,
        url: racine,
        inLanguage: "fr-FR",
        publisher: { "@id": `${racine}#organisation` },
      },
    ],
  };
}
