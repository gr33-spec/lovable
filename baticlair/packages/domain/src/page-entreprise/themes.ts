/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : la page publique de chaque entreprise. Même structure pour tous, ambiance
 * adaptée au MÉTIER PRINCIPAL : couleur et fond par défaut, pictogramme, motif de fond, visuel de couverture par défaut et
 * textes d'exemple. Un thème par métier du catalogue (`TRADES`), « Autre métier » compris. Rien ici n'est publié tel quel
 * sans l'artisan : les textes d'exemple ne sont que des suggestions dans l'éditeur (jamais affichés sur la page publique).
 */

/** Les visuels de couverture par défaut (fichiers `apps/web/public/pages/couvertures/<id>.svg`), un par famille de métiers. */
export const VISUELS = ["toiture", "peinture", "electricite", "plomberie", "bois", "maconnerie", "carrelage", "exterieur", "metal", "solaire", "interieur", "general"] as const;
export type Visuel = (typeof VISUELS)[number];

/** Les pictogrammes (traduits en icônes par l'écran) et motifs de fond discrets, liés au métier. */
export const PICTOS = ["toit", "pinceau", "eclair", "goutte", "marteau", "brique", "carreau", "feuille", "cle", "soleil", "flamme", "regle", "maison"] as const;
export type Picto = (typeof PICTOS)[number];

export type Fond = "clair" | "sombre";

export interface ThemeMetier {
  metier: string;
  /** Le nom court du métier sur la page (« Couvreur », « Peintre »). */
  nom: string;
  couleur: string;
  fond: Fond;
  visuel: Visuel;
  picto: Picto;
  /** Accroche d'exemple : « {zone} » est remplacé par la zone, sinon la phrase sans lieu. */
  accroche: string;
  presentation: string;
  services: string[];
}

const t = (metier: string, nom: string, couleur: string, fond: Fond, visuel: Visuel, picto: Picto, accroche: string, presentation: string, services: string[]): ThemeMetier => ({
  metier,
  nom,
  couleur,
  fond,
  visuel,
  picto,
  accroche,
  presentation,
  services,
});

/** Un thème par métier du catalogue (`TRADES`, `packages/domain/src/trades/index.ts`). */
export const THEMES_METIER: Readonly<Record<string, ThemeMetier>> = {
  roofing: t("roofing", "Couvreur", "#3E5163", "sombre", "toiture", "toit", "Votre toiture entre de bonnes mains{zone}", "Couverture, zinguerie et réparation de toitures : ardoise, tuile et zinc, en neuf comme en rénovation. Devis clair, chantier propre.", ["Réfection de toiture", "Zinguerie et gouttières", "Recherche de fuite", "Démoussage et entretien"]),
  masonry: t("masonry", "Maçon", "#8C5A3C", "clair", "maconnerie", "brique", "Des murs solides, faits pour durer{zone}", "Maçonnerie générale, extensions, ouvertures de murs et petits ouvrages : du terrassement à la finition.", ["Extension et agrandissement", "Ouverture de mur porteur", "Dalle et fondations", "Murets et clôtures"]),
  drywall: t("drywall", "Plaquiste", "#5C6B7A", "clair", "interieur", "regle", "Cloisons, isolation, plafonds : du propre{zone}", "Plâtrerie et isolation intérieure : cloisons, doublages, plafonds et combles, pour un intérieur plus confortable.", ["Cloisons et doublages", "Isolation des combles", "Faux plafonds", "Bandes et finitions"]),
  painting: t("painting", "Peintre", "#2F7D6D", "clair", "peinture", "pinceau", "Des finitions nettes, du sol au plafond{zone}", "Peinture intérieure et extérieure, revêtements muraux et finitions soignées. Protection du chantier et nettoyage compris.", ["Peinture intérieure", "Ravalement et façades", "Papier peint et revêtements", "Laques et boiseries"]),
  tiling: t("tiling", "Carreleur", "#2D6A8E", "clair", "carrelage", "carreau", "Carrelage et faïence posés au millimètre{zone}", "Pose de carrelage, faïence et mosaïque : salles de bains, cuisines, terrasses. Coupes nettes et joints réguliers.", ["Carrelage de sol", "Faïence murale", "Salle de bains", "Terrasse extérieure"]),
  flooring: t("flooring", "Poseur de sols", "#8A6A3F", "clair", "bois", "regle", "Des sols beaux et durables{zone}", "Pose de parquets, sols souples et stratifiés, ponçage et vitrification.", ["Parquet massif et contrecollé", "Sols souples", "Ponçage et vitrification", "Ragréage"]),
  electrical: t("electrical", "Électricien", "#1F5FA8", "sombre", "electricite", "eclair", "Une installation électrique sûre et aux normes{zone}", "Installation, rénovation et mise en conformité électrique, tableaux, éclairage et dépannage.", ["Rénovation électrique", "Tableau et mise aux normes", "Éclairage", "Dépannage"]),
  plumbing: t("plumbing", "Plombier", "#1B7FA3", "clair", "plomberie", "goutte", "Plomberie et chauffage sans mauvaise surprise{zone}", "Plomberie, sanitaires et chauffage : installation, rénovation de salles de bains et dépannage.", ["Salle de bains", "Chauffe-eau", "Recherche de fuite", "Dépannage"]),
  joinery: t("joinery", "Menuisier", "#7A5230", "clair", "bois", "marteau", "Menuiseries sur mesure, posées avec soin{zone}", "Fenêtres, portes, volets et menuiseries sur mesure, en bois, PVC ou aluminium.", ["Fenêtres et portes", "Volets", "Portes de garage", "Sur mesure"]),
  hvac: t("hvac", "Chauffagiste", "#B4532A", "clair", "plomberie", "flamme", "Chauffage et ventilation bien réglés{zone}", "Installation et entretien de chauffage, pompes à chaleur et ventilation.", ["Pompe à chaleur", "Chaudière", "VMC", "Entretien"]),
  carpentry: t("carpentry", "Charpentier", "#6E4B2A", "sombre", "toiture", "marteau", "Charpentes solides, du traditionnel au moderne{zone}", "Charpente traditionnelle et industrielle, ossature bois, extensions et réparations.", ["Charpente traditionnelle", "Ossature bois", "Extension", "Traitement des bois"]),
  waterproofing: t("waterproofing", "Étancheur", "#37474F", "sombre", "toiture", "goutte", "Toits-terrasses étanches, durablement{zone}", "Étanchéité des toitures-terrasses, balcons et ouvrages enterrés.", ["Toiture-terrasse", "Balcons et terrasses", "Végétalisation", "Réparation de fuite"]),
  cladding: t("cladding", "Bardeur", "#4E5D52", "sombre", "bois", "regle", "Des façades habillées avec soin{zone}", "Bardage bois, composite et métallique, isolation par l'extérieur.", ["Bardage bois", "Bardage composite", "Isolation par l'extérieur", "Rénovation de façade"]),
  facade: t("facade", "Façadier", "#9A6B4F", "clair", "maconnerie", "pinceau", "Façades refaites à neuf{zone}", "Ravalement, enduits, nettoyage et isolation des façades.", ["Ravalement", "Enduits", "Nettoyage de façade", "Isolation par l'extérieur"]),
  ceiling: t("ceiling", "Plafonnier", "#5A6878", "clair", "interieur", "regle", "Plafonds suspendus, nets et réguliers{zone}", "Plafonds suspendus, dalles acoustiques et faux plafonds.", ["Plafonds suspendus", "Dalles acoustiques", "Faux plafonds", "Éclairage intégré"]),
  interior_joinery: t("interior_joinery", "Agenceur", "#8B6440", "clair", "bois", "marteau", "Agencements intérieurs sur mesure{zone}", "Menuiserie intérieure et agencement : placards, dressings, escaliers et meubles sur mesure.", ["Placards et dressings", "Escaliers", "Meubles sur mesure", "Portes intérieures"]),
  kitchen: t("kitchen", "Cuisiniste", "#A04A3B", "clair", "interieur", "maison", "Votre cuisine, pensée et posée sur mesure{zone}", "Conception et pose de cuisines, plans de travail et électroménager.", ["Conception de cuisine", "Pose", "Plans de travail", "Rénovation"]),
  solar: t("solar", "Installateur solaire", "#C27C0E", "clair", "solaire", "soleil", "Produisez votre propre électricité{zone}", "Installation de panneaux photovoltaïques, raccordement et suivi de production.", ["Panneaux photovoltaïques", "Autoconsommation", "Bornes de recharge", "Maintenance"]),
  decking: t("decking", "Poseur de terrasses", "#7D5A3A", "clair", "exterieur", "feuille", "Des terrasses bois qui durent{zone}", "Terrasses en bois et composite, pergolas et aménagements extérieurs.", ["Terrasse bois", "Terrasse composite", "Pergola", "Entretien"]),
  paving: t("paving", "Paveur", "#6B6156", "clair", "exterieur", "brique", "Allées et cours pavées avec soin{zone}", "Pavage, dallage extérieur, allées et cours.", ["Allées", "Cours et parkings", "Dallage", "Bordures"]),
  earthworks: t("earthworks", "Terrassier", "#6D5B3B", "clair", "exterieur", "brique", "Terrassement et VRD, chantier propre{zone}", "Terrassement, réseaux, assainissement et voirie.", ["Terrassement", "Assainissement", "Réseaux", "Voirie"]),
  irrigation: t("irrigation", "Installateur d'arrosage", "#3F7D4E", "clair", "exterieur", "goutte", "L'arrosage automatique, bien pensé{zone}", "Arrosage automatique des jardins et espaces verts, programmation et entretien.", ["Arrosage automatique", "Goutte-à-goutte", "Programmation", "Entretien"]),
  metalwork: t("metalwork", "Serrurier-métallier", "#4A4F57", "sombre", "metal", "cle", "Métallerie et serrurerie sur mesure{zone}", "Serrurerie, garde-corps, portails et ouvrages métalliques sur mesure.", ["Garde-corps", "Portails", "Escaliers métalliques", "Serrurerie"]),
  general: t("general", "Entreprise générale", "#2E3A46", "sombre", "general", "maison", "Votre projet de A à Z{zone}", "Entreprise générale du bâtiment : construction, rénovation et coordination de tous les corps de métier.", ["Construction", "Rénovation", "Extension", "Coordination"]),
  other: t("other", "Artisan du bâtiment", "#33414E", "clair", "general", "maison", "Un artisan à votre écoute{zone}", "Artisan du bâtiment : travaux de rénovation et d'entretien, devis clair et chantier propre.", []),
};

/** Le thème d'un métier ; un métier inconnu ou absent prend celui d'« Autre métier ». */
export function themeDuMetier(metier: string | null | undefined): ThemeMetier {
  return (metier && THEMES_METIER[metier]) || THEMES_METIER.other!;
}

/** L'accroche d'exemple avec sa zone (« … à Lannion »), sans zone la phrase seule. */
export function accrocheParDefaut(theme: ThemeMetier, zone: string | null | undefined): string {
  const z = zone?.trim();
  return theme.accroche.replace("{zone}", z ? ` à ${z}` : "");
}
