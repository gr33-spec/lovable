// Liste des sections du dossier banque (partagée entre l'écran et le PDF).
export const SECTION_OPTIONS = [
  { id: "synthese", label: "Synthèse chiffrée (valeur, dette, loyers, cash-flow, LTV)" },
  { id: "structure", label: "Structure du groupe" },
  { id: "patrimoine", label: "Patrimoine immobilier" },
  { id: "credits", label: "Tableau des crédits" },
  { id: "indicateurs", label: "Indicateurs financiers (DSCR, rendement, LTV…)" },
  { id: "comptes", label: "Comptes annuels (bilans)" },
  { id: "echeancier", label: "Échéancier des fins de crédits" },
  { id: "projection", label: "Projection 5 / 10 / 15 / 20 / 30 ans et graphiques" },
  { id: "chronologie", label: "Chronologie patrimoniale" },
  { id: "fiches", label: "Fiche par société" },
  { id: "travaux", label: "Travaux programmés" },
  { id: "scenarios", label: "Scénarios sélectionnés" },
] as const;
