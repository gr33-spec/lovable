/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026, RÈGLE CHANGÉE le même jour : « le design est à refaire, un vrai site d'artisan »).
 * Un seul modèle, fond ivoire, de vraies photos ; plus de visuel dessiné, de pictogramme ni de motif. Le métier principal
 * donne : le nom du métier dans le grand titre (« Couvreur à Lannion »), la teinte par défaut (une des teintes) et les prestations proposées à la création de la page (titre + une phrase), que l'artisan garde, corrige ou retire.
 * La page est privée par défaut : rien n'est publié sans que l'artisan l'ait vu.
 */

/**
 * Les teintes au choix. Le bouton « Appeler » reste jaune Mobiiz. RÈGLE CHANGÉE (Greg, 17 novembre 2026 : « des couleurs
 * bien différentes dans le nuancier ») : avant, quatre teintes sombres proches (ardoise, anthracite, bleu nuit, vert sapin) ;
 * maintenant neuf teintes de familles différentes, toutes assez profondes pour un texte blanc (contraste 7 au moins). La
 * teinte colore la barre du haut, l'accueil, la bande et le contact. Les quatre premières gardent leur code (pages déjà réglées).
 */
export const TEINTES = [
  { id: "ardoise", nom: "Ardoise", hex: "#3E5163" },
  { id: "anthracite", nom: "Anthracite", hex: "#2E3338" },
  { id: "bleu-nuit", nom: "Bleu nuit", hex: "#1D3557" },
  { id: "vert-sapin", nom: "Vert sapin", hex: "#1F4D3A" },
  { id: "bleu-roi", nom: "Bleu roi", hex: "#1E4BA0" },
  { id: "petrole", nom: "Pétrole", hex: "#0E5A5E" },
  { id: "bordeaux", nom: "Bordeaux", hex: "#7A1F33" },
  { id: "rouge-brique", nom: "Rouge brique", hex: "#A0281E" },
  { id: "prune", nom: "Prune", hex: "#6B2D7A" },
] as const;
export type TeinteId = (typeof TEINTES)[number]["id"];

/**
 * LA COULEUR DES BOUTONS (Greg, 17 novembre 2026 : « fais en sorte de pouvoir changer la couleur des boutons »). RÈGLE
 * CHANGÉE : avant, « Appeler » et « Demander un devis » toujours jaune Mobiiz. Maintenant l'artisan choisit : le jaune
 * reste par défaut. La couleur sert aussi aux traits, aux icônes et à la ville du grand titre. Le texte d'un bouton
 * (noir ou blanc) est choisi par le code pour rester lisible (`texteSurCouleur`).
 */
export const COULEURS_BOUTONS = [
  { id: "jaune", nom: "Jaune Mobiiz", hex: "#FED206" },
  { id: "orange", nom: "Orange", hex: "#F7931E" },
  { id: "rouge", nom: "Rouge", hex: "#E03131" },
  { id: "rose", nom: "Rose", hex: "#E64980" },
  { id: "violet", nom: "Violet", hex: "#7048E8" },
  { id: "bleu", nom: "Bleu", hex: "#1971C2" },
  { id: "turquoise", nom: "Turquoise", hex: "#15AABF" },
  { id: "vert", nom: "Vert", hex: "#2F9E44" },
  { id: "noir", nom: "Noir", hex: "#15120E" },
] as const;

/** La couleur des boutons d'une page : celle choisie si elle est proposée, sinon le jaune Mobiiz. */
export function couleurBoutonsDe(couleur: string | null | undefined): (typeof COULEURS_BOUTONS)[number] {
  return COULEURS_BOUTONS.find((x) => x.hex.toLowerCase() === couleur?.toLowerCase() || x.id === couleur) ?? COULEURS_BOUTONS[0];
}

export interface Prestation {
  titre: string;
  texte: string;
}

export interface ThemeMetier {
  metier: string;
  /** Le nom du métier dans le grand titre (« Couvreur », « Peintre »). */
  nom: string;
  teinte: TeinteId;
  /** Accroche d'exemple pour « Mobiiz m'aide à l'écrire » (jamais publiée sans l'artisan) : « {zone} » remplacé par la zone. */
  accroche: string;
  presentation: string;
  /** Les prestations proposées à la création de la page (3 ou 4). */
  prestations: Prestation[];
}

const p = (titre: string, texte: string): Prestation => ({ titre, texte });
const t = (metier: string, nom: string, teinte: TeinteId, accroche: string, presentation: string, prestations: Prestation[]): ThemeMetier => ({ metier, nom, teinte, accroche, presentation, prestations });

/** Un thème par métier du catalogue (`TRADES`, `packages/domain/src/trades/index.ts`). */
export const THEMES_METIER: Readonly<Record<string, ThemeMetier>> = {
  roofing: t("roofing", "Couvreur", "ardoise", "Votre toiture entre de bonnes mains{zone}", "Couverture, zinguerie et réparation de toitures : ardoise, tuile et zinc, en neuf comme en rénovation.", [
    p("Couverture ardoise et tuile", "Réfection complète ou partielle, en ardoise naturelle ou en tuile, dans les règles de l'art."),
    p("Zinguerie", "Gouttières, descentes, noues et habillages en zinc, posés et façonnés sur mesure."),
    p("Réparation de toiture", "Ardoises ou tuiles cassées, fuites, dégâts après une tempête."),
    p("Entretien et démoussage", "Nettoyage, traitement et vérification de la toiture pour la faire durer."),
  ]),
  masonry: t("masonry", "Maçon", "anthracite", "Des murs solides, faits pour durer{zone}", "Maçonnerie générale, extensions, ouvertures de murs et petits ouvrages : du terrassement à la finition.", [
    p("Extension et agrandissement", "Une pièce de plus, du gros œuvre jusqu'à la mise hors d'eau."),
    p("Ouverture de mur", "Création ou agrandissement d'ouvertures, mur porteur compris, avec les renforts nécessaires."),
    p("Dalles et fondations", "Dalles, fondations et chapes pour vos projets de construction."),
    p("Murets et clôtures", "Murs de clôture, murets et piliers en parpaing, brique ou pierre."),
  ]),
  drywall: t("drywall", "Plaquiste", "ardoise", "Cloisons, isolation, plafonds : du propre{zone}", "Plâtrerie et isolation intérieure : cloisons, doublages, plafonds et combles, pour un intérieur plus confortable.", [
    p("Cloisons et doublages", "Redistribuer les pièces ou isoler les murs, avec des finitions prêtes à peindre."),
    p("Isolation des combles", "Combles perdus ou aménagés, pour moins de pertes de chaleur."),
    p("Faux plafonds", "Plafonds suspendus ou rampants, avec spots intégrés si besoin."),
  ]),
  painting: t("painting", "Peintre", "vert-sapin", "Des finitions nettes, du sol au plafond{zone}", "Peinture intérieure et extérieure, revêtements muraux et finitions.", [
    p("Peinture intérieure", "Murs, plafonds et boiseries, avec la préparation des supports et la protection des meubles."),
    p("Façades et ravalement", "Nettoyage, réparation et peinture des façades pour protéger la maison."),
    p("Papiers peints et revêtements", "Pose de papiers peints, toiles de verre et revêtements muraux."),
    p("Boiseries et ferronneries", "Volets, portes, portails et garde-corps remis en peinture."),
  ]),
  tiling: t("tiling", "Carreleur", "bleu-nuit", "Carrelage et faïence posés au millimètre{zone}", "Pose de carrelage, faïence et mosaïque : salles de bains, cuisines, terrasses. Coupes nettes et joints réguliers.", [
    p("Carrelage de sol", "Pose de carrelage grand format ou traditionnel, intérieur et extérieur."),
    p("Faïence et crédence", "Murs de salle de bains et crédences de cuisine, coupes nettes."),
    p("Salle de bains complète", "Douche à l'italienne, faïence et sol, du support à la finition."),
  ]),
  flooring: t("flooring", "Poseur de sols", "anthracite", "Des sols beaux et durables{zone}", "Pose de parquets, sols souples et stratifiés, ponçage et vitrification.", [
    p("Parquet", "Pose de parquet massif ou contrecollé, collé ou flottant."),
    p("Sols souples", "Vinyle, lino et moquette posés sur un support préparé."),
    p("Ponçage et vitrification", "Votre ancien parquet remis à neuf."),
  ]),
  electrical: t("electrical", "Électricien", "bleu-nuit", "Installation et rénovation électrique{zone}", "Installation, rénovation et mise en conformité électrique, tableaux, éclairage et dépannage.", [
    p("Rénovation électrique", "Remise à neuf de l'installation, pièce par pièce ou toute la maison."),
    p("Tableau et mise aux normes", "Remplacement du tableau et mise en sécurité de l'installation."),
    p("Éclairage", "Éclairage intérieur et extérieur, spots, variateurs."),
    p("Dépannage", "Panne, disjonction, prise qui chauffe."),
  ]),
  plumbing: t("plumbing", "Plombier", "bleu-nuit", "Plomberie, sanitaires et chauffage{zone}", "Plomberie, sanitaires et chauffage : installation, rénovation de salles de bains et dépannage.", [
    p("Salle de bains", "Création ou rénovation complète, douche, baignoire et meubles."),
    p("Chauffe-eau", "Remplacement et entretien de chauffe-eau et ballons."),
    p("Recherche de fuite", "Diagnostic et réparation des fuites, visibles ou encastrées."),
    p("Dépannage", "Robinetterie, évacuation bouchée, chasse d'eau."),
  ]),
  joinery: t("joinery", "Menuisier", "vert-sapin", "Menuiseries sur mesure, posées avec soin{zone}", "Fenêtres, portes, volets et menuiseries sur mesure, en bois, PVC ou aluminium.", [
    p("Fenêtres et portes", "Remplacement et pose de fenêtres, portes-fenêtres et portes d'entrée."),
    p("Volets", "Volets battants ou roulants, manuels ou motorisés."),
    p("Sur mesure", "Menuiseries fabriquées aux cotes exactes de votre maison."),
  ]),
  hvac: t("hvac", "Chauffagiste", "bleu-nuit", "Chauffage et ventilation bien réglés{zone}", "Installation et entretien de chauffage, pompes à chaleur et ventilation.", [
    p("Pompe à chaleur", "Étude, installation et mise en service de pompes à chaleur."),
    p("Chaudière", "Remplacement et entretien annuel de chaudières."),
    p("Ventilation", "Installation de VMC simple ou double flux."),
  ]),
  carpentry: t("carpentry", "Charpentier", "anthracite", "Des charpentes solides, du traditionnel au moderne{zone}", "Charpente traditionnelle et industrielle, ossature bois, extensions et réparations.", [
    p("Charpente traditionnelle", "Fabrication et pose de charpentes en bois massif."),
    p("Ossature bois", "Extensions et maisons à ossature bois."),
    p("Réparation et traitement", "Remplacement de pièces abîmées et traitement des bois."),
  ]),
  waterproofing: t("waterproofing", "Étancheur", "anthracite", "Des toits-terrasses étanches, durablement{zone}", "Étanchéité des toitures-terrasses, balcons et ouvrages enterrés.", [
    p("Toiture-terrasse", "Étanchéité neuve ou réfection, avec isolation si besoin."),
    p("Balcons et terrasses", "Étanchéité sous carrelage ou en résine."),
    p("Réparation de fuite", "Recherche et traitement des infiltrations."),
  ]),
  cladding: t("cladding", "Bardeur", "vert-sapin", "Des façades habillées avec soin{zone}", "Bardage bois, composite et métallique, isolation par l'extérieur.", [
    p("Bardage bois", "Pose de bardage en bois naturel ou prégrisé."),
    p("Bardage composite", "Un habillage en lames composites."),
    p("Isolation par l'extérieur", "Isoler la maison sans perdre de place à l'intérieur."),
  ]),
  facade: t("facade", "Façadier", "ardoise", "Des façades refaites à neuf{zone}", "Ravalement, enduits, nettoyage et isolation des façades.", [
    p("Ravalement", "Nettoyage, réparation des fissures et finition de la façade."),
    p("Enduits", "Enduits traditionnels ou monocouches, à la chaux ou au ciment."),
    p("Isolation par l'extérieur", "Une façade neuve et une maison mieux isolée."),
  ]),
  ceiling: t("ceiling", "Plafonnier", "ardoise", "Des plafonds suspendus nets et réguliers{zone}", "Plafonds suspendus, dalles acoustiques et faux plafonds.", [
    p("Plafonds suspendus", "Faux plafonds en plaques ou en dalles, avec éclairage intégré."),
    p("Dalles acoustiques", "Moins de bruit dans les bureaux, commerces et salles."),
  ]),
  interior_joinery: t("interior_joinery", "Agenceur", "vert-sapin", "Des agencements intérieurs sur mesure{zone}", "Menuiserie intérieure et agencement : placards, dressings, escaliers et meubles sur mesure.", [
    p("Placards et dressings", "Rangements sur mesure, du sol au plafond."),
    p("Escaliers", "Escaliers en bois fabriqués et posés sur mesure."),
    p("Meubles sur mesure", "Bibliothèques, meubles TV et aménagements de combles."),
  ]),
  kitchen: t("kitchen", "Cuisiniste", "anthracite", "Votre cuisine, pensée et posée sur mesure{zone}", "Conception et pose de cuisines, plans de travail et électroménager.", [
    p("Conception", "Plans et choix des matériaux selon votre pièce et votre budget."),
    p("Pose", "Montage, raccordements et finitions."),
    p("Plans de travail", "Stratifié, bois, quartz ou céramique."),
  ]),
  solar: t("solar", "Installateur solaire", "bleu-nuit", "Produisez votre propre électricité{zone}", "Installation de panneaux photovoltaïques, raccordement et suivi de production.", [
    p("Panneaux photovoltaïques", "Étude du toit, pose et raccordement."),
    p("Autoconsommation", "Une installation dimensionnée pour votre consommation."),
    p("Bornes de recharge", "Recharge de véhicule électrique à la maison."),
  ]),
  decking: t("decking", "Poseur de terrasses", "vert-sapin", "Des terrasses bois qui durent{zone}", "Terrasses en bois et composite, pergolas et aménagements extérieurs.", [
    p("Terrasse bois", "Lames en pin, mélèze ou bois exotique, sur plots ou lambourdes."),
    p("Terrasse composite", "Une terrasse en lames composites."),
    p("Pergolas", "Pergolas en bois ou en aluminium."),
  ]),
  paving: t("paving", "Paveur", "anthracite", "Des allées et des cours pavées avec soin{zone}", "Pavage, dallage extérieur, allées et cours.", [
    p("Allées", "Allées pavées ou dallées, drainantes si besoin."),
    p("Cours et stationnements", "Des surfaces solides, faites pour durer."),
    p("Bordures", "Bordures et caniveaux posés au cordeau."),
  ]),
  earthworks: t("earthworks", "Terrassier", "anthracite", "Terrassement et VRD{zone}", "Terrassement, réseaux, assainissement et voirie.", [
    p("Terrassement", "Préparation de terrain avant construction."),
    p("Assainissement", "Installation et mise aux normes d'assainissement individuel."),
    p("Réseaux", "Tranchées et raccordements eau, électricité et télécoms."),
  ]),
  irrigation: t("irrigation", "Installateur d'arrosage", "vert-sapin", "L'arrosage automatique, bien pensé{zone}", "Arrosage automatique des jardins et espaces verts, programmation et entretien.", [
    p("Arrosage automatique", "Étude et installation adaptées à votre jardin."),
    p("Goutte-à-goutte", "Massifs et potagers arrosés sans gaspillage."),
    p("Entretien", "Mise en route au printemps et hivernage."),
  ]),
  metalwork: t("metalwork", "Serrurier-métallier", "anthracite", "Métallerie et serrurerie sur mesure{zone}", "Serrurerie, garde-corps, portails et ouvrages métalliques sur mesure.", [
    p("Garde-corps", "Garde-corps et rampes en acier ou aluminium."),
    p("Portails", "Portails et clôtures fabriqués sur mesure."),
    p("Serrurerie", "Ouverture de porte, changement de serrure et blindage."),
  ]),
  general: t("general", "Entreprise générale", "anthracite", "Votre projet de A à Z{zone}", "Entreprise générale du bâtiment : construction, rénovation et coordination de tous les corps de métier.", [
    p("Construction", "Maisons et extensions, du terrassement aux finitions."),
    p("Rénovation", "Rénovation complète, un seul interlocuteur."),
    p("Coordination", "Tous les corps de métier organisés pour vous."),
  ]),
  other: t("other", "Artisan du bâtiment", "ardoise", "Un artisan à votre écoute{zone}", "Artisan du bâtiment : travaux de rénovation et d'entretien.", []),
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

/** La teinte d'une page : celle choisie si elle fait partie des teintes proposées, sinon celle du métier. */
export function teinteDeLaPage(couleur: string | null | undefined, metier: string | null | undefined): (typeof TEINTES)[number] {
  return TEINTES.find((x) => x.hex.toLowerCase() === couleur?.toLowerCase() || x.id === couleur) ?? TEINTES.find((x) => x.id === themeDuMetier(metier).teinte)!;
}
