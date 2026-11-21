/**
 * Devis réel 7954 (électricité, chauffage, VMC, sanitaire : transformation d'un hôtel-restaurant en 10 logements),
 * test permanent du référentiel électricité (§6, validé par le fondateur le 11 octobre 2026). Document SCANNÉ
 * (15 pages en image) : lignes relevées à la main sur l'image. ANONYMISÉ : désignation, quantité, unité et le titre
 * qui couvre la ligne ; ni nom, ni adresse, ni prix. Seule la ville reste (le bref attendu du §6 la cite).
 *
 * Contrôle de la transcription : les comptes de points du §6 retombent exactement (58 points lumineux simples, 13
 * va-et-vient 1 point, 1 va-et-vient 2 points, 1 télérupteur, 151 prises 16 A, 28 RJ45, 12 TV, 10 four, 10 plaque,
 * 10 frigo, 10 hotte, 4 lave-vaisselle, 8 lave-linge, 3 sèche-linge, 8 chauffe-eau, 10 tableaux, 10 mises à la terre,
 * 59 alimentations radiateur) : `test/devis-7954.test.ts`.
 */
export interface Ligne7954 {
  ref: string;
  /** Les titres qui couvrent la ligne, du plus large au plus précis (« N°1 TYPE T3 › CUISINE/ SEJOUR »). */
  section: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
}

export const CONTEXTE_7954 = {
  sujet: "Devis projet de transformation d'un hôtel/restaurant",
  ville: "Paimpol",
  mentions: ["L'installation électrique est prévue pour fonctionner en monophasé 220 V et est conforme à la norme C 15 100 en vigueur", "Appareillage Hager Essensya"],
};

const out: Ligne7954[] = [];
let n = 0;
const add = (section: string, designation: string, quantity: string | null, unit: string | null = "U") => {
  n += 1;
  out.push({ ref: String(n), section, designation, quantity, unit });
};
const tableau = (s: string) =>
  add(
    `${s} › TABLEAU GENERAL ELECTRIQUE`,
    "TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 MA DISJONCTEURS 2A DISJONCTEURS 10A DISJONCTEURS 16A DISJONCTEURS 20A DISJONCTEURS 32A CONTACTEUR J/N FILS BARETTE MONTAGE",
    "1,000",
  );
const terre = (s: string) => {
  for (const d of ["PRISE DE TERRE", "BARETTE DE TERRE", "LIAISON EQUIPOTENTIEL", "MESURE DE LA VALEUR DE LA PRISE DE TERRE"]) add(`${s} › MISE A LA TERRE`, d, "1,000");
};
const ELEC = "DEVIS ELECTRICITE";
const LS = "LAMPLE SIMPLE 1 POINT LUMINEUX";
const VV = "VA ET VIENT 1 POINT LUMINEUX";
const PC = "PRISE DE COURANT 16A+T";
const piece = (s: string, items: [string, string][]) => {
  for (const [d, q] of items) add(s, d, q);
};

piece(`${ELEC} › TRAVAUX D'ELECTRICITE : DEPOSE ET PREPARATION CHANTIER`, []);
for (const [d, q] of [
  ["DEPOSE DE L'INSTALLATION ET EVACUATION", "1,000"],
  ["POSE D'UNE PRISE DE CHANTIER", "1,000"],
  ["PLAN ELECTRIQUE", "1,000"],
  ["PERCEMENT / CREATION DE PASSAGE / RACCORDS CIMENT / TRAVAUX ELECTRICITE", "1,000"],
] as const)
  add(`${ELEC} › TRAVAUX D'ELECTRICITE : DEPOSE ET PREPARATION CHANTIER`, d, q, null);

// N°1 TYPE T3
let L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › N°1 TYPE T3`;
piece(`${L} › CUISINE/ SEJOUR`, [[LS, "2,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "8,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE LAVE-VAISSELLE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › DEGAGEMENT`, [[VV, "1,000"], [PC, "1,000"]]);
piece(`${L} › CHAMBRE 1`, [[LS, "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [[LS, "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS/WC`, [[LS, "2,000"], [PC, "1,000"]]);
tableau(L);
terre(L);

// N°2 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › N°2 TYPE T3`;
piece(`${L} › CHAMBRE 1`, [[LS, "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [[LS, "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › DEGAGEMENT A`, [[VV, "1,000"], [PC, "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [[LS, "2,000"], [PC, "1,000"]]);
piece(`${L} › SALON/SEJOUR`, [[VV, "1,000"], ["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "5,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › DEGAGEMENT B`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "1,000"]]);
piece(`${L} › WC`, [[LS, "1,000"]]);
piece(`${L} › CUISINE`, [[LS, "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "6,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE LAVE-VAISSELLE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"]]);
piece(`${L} › BUANDERIE`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["PRISE SECHE-LINGE", "1,000"]]);
tableau(L);
terre(L);

// N°3 TYPE T1
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › N°3 TYPE T1`;
piece(`${L} › CUISINE/SEJOUR`, [[LS, "2,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "6,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"]]);
piece(`${L} › CHAMBRE 1/SALON`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE TV", "1,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › WC`, [[LS, "1,000"]]);
piece(`${L} › DEGAGEMENT`, [[VV, "1,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"]]);
tableau(L);
terre(L);

// R+1, N°4 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+1 › N°4 TYPE T3`;
piece(`${L} › DEGAGEMENT`, [[VV, "1,000"], [PC, "1,000"]]);
piece(`${L} › WC`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["PRISE SECHE-LINGE", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CUISINE/ SEJOUR`, [[VV, "1,000"], ["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "6,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE LAVE-VAISSELLE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"]]);
tableau(L);
terre(L);

// N°5 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+1 › N°5 TYPE T3`;
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALON`, [[VV, "1,000"], [PC, "4,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"]]);
piece(`${L} › CUISINE`, [[VV, "1,000"], ["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "5,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE LAVE-VAISSELLE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"]]);
piece(`${L} › BUANDERIE`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["PRISE SECHE-LINGE", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
tableau(L);
terre(L);

// N°6 TYPE T2
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+1 › N°6 TYPE T2`;
piece(`${L} › CUISINE/ SALON`, [[VV, "1,000"], ["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "6,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE TV", "1,000"], ["PRISE RJ45", "1,000"]]);
tableau(L);
terre(L);

// N°7 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+1 › N°7 TYPE T3`;
piece(`${L} › CUISINE/ SALON`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [VV, "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "8,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
tableau(L);
terre(L);

// R+2, N°8 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+2 › N°8 TYPE T3`;
piece(`${L} › CUISINE/ SALON`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [VV, "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "8,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
tableau(L);
terre(L);

// N°9 TYPE T2
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+2 › N°9 TYPE T2`;
piece(`${L} › CUISINE/ SALON`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [VV, "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "8,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › BUREAU`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
tableau(L);
terre(L);

// N°10 TYPE T3
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA › R+2 › N°10 TYPE T3`;
piece(`${L} › CUISINE/ SALON`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [VV, "1,000"], ["ALIMENTATION HOTTE", "1,000"], [PC, "8,000"], ["PRISE FOUR", "1,000"], ["PRISE PLAQUE", "1,000"], ["PRISE REFRIGERATEUR", "1,000"], ["PRISE RJ45", "1,000"], ["PRISE TV", "1,000"]]);
piece(`${L} › CHAMBRE 1`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › CHAMBRE 2`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › SALLE DE BAINS`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "2,000"], [PC, "1,000"], ["PRISE MACHINE A LAVER", "1,000"], ["ALIMENTATION CHAUFFE-EAU", "1,000"]]);
piece(`${L} › WC`, [["LAMPE SIMPLE 1 POINT LUMINEUX", "1,000"]]);
tableau(L);
terre(L);

// Page 12 : un bloc de pièces rattaché à aucun logement (question du §6).
L = `${ELEC} › APPAREILLAGE HAGER ESSENSYA`;
piece(`${L} › CHAMBRE 1`, [["TELERUPTEUR 1 POINT LUMINEUX", "1,000"], [PC, "3,000"], ["PRISE TV", "1,000"], ["PRISE RJ45", "1,000"]]);
piece(`${L} › DEGAGEMENT`, [["VA ET VIENT 2 POINTS LUMINEUX", "1,000"]]);
add(`${ELEC} › TRAVAUX ADMINISTRATIF`, "DEMANDE DE CONSUEL", "10,000");
add(`${ELEC} › TRAVAUX ADMINISTRATIF`, "FORMATION UTILISATEUR", "1,000");
add(ELEC, "COFFRET DE COM SEMI-ÉQU. 4XRJ45/TV GR2 TN405", "10,000");
add(ELEC, "CONNECTEUR RJ45", "30,000");
add(ELEC, "INSTALLATION ET MISE EN SERVICE DU COFFRET DE COMMUNICATION", "10,000");

const RAD = "DEVIS RADIATEURS ELECTRIQUE";
add(RAD, "ALIMENTATION RADIATEUR", "59,000", null);
add(RAD, "RADIATEUR ELECTRIQUE ATOLL 750W", "18,000", null);
add(RAD, "RADIATEUR ELECTRIQUE ATOLL 1000W", "21,000", null);
add(RAD, "SECHE SERVIETTE 750W SDB ANCINETI", "10,000", null);

const VMC = "VMC HYGROREGLABLE ALDES";
add(VMC, "ALDES Kit BAHIA Optima MICROWATT HYGRO B", "10,000", null);
for (const [d, q] of [["BOUCHE EXTRACTION BAINS", "10,000"], ["BOUCHE EXTRACTION WC", "8,000"], ["BOUCHE EXTRACTION CUISINE", "10,000"], ["BOUCHE EXTRACTION CELLIER", "3,000"]] as const) add(`${VMC} › BOUCHES D'EXTRACTION`, d, q);
add(`${VMC} › BOUCHES D'ENTREE D'AIR`, "BOUCHE ENTREE D'AIR ENTREE D'AIR HYGRO 6/45 CLAS 30", "25,000");
add(`${VMC} › BOUCHES D'ENTREE D'AIR`, "MANCHON REGLABE LG 100MM HYGRO", "25,000");
add(`${VMC} › RESEAU DE GAINE PVC`, "RESEAU DE GAINE Y COMPRIS SUPPORT", "10,000");
add(`${VMC} › RESEAU DE GAINE PVC`, "GAINE 0/80 SANITAIRE GAINE SOUPLE PVC DN80 ATLANTIC", "1,000", null);
add(`${VMC} › RESEAU DE GAINE PVC`, "GAINE 0/125 CUISINE GAINE SOUPLE PVC DN 125 ATLANTIC", "1,000", null);
add(`${VMC} › RESEAU DE GAINE PVC`, "CHAPEAU PREVU PAR LE COUVREUR", null, null);
add(VMC, "POSE, MISE EN SERVICE ET PERCEMENT", "10,000");

const SAN = "TRAVAUX SANITAIRE";
for (const [d, q] of [["ROBINET M.A.L SANS RACCORD 1/2-3/4", "10,000"], ["SIPHON M.A.L", "10,000"], ["VANNE D'ARRET GENERAL", "10,000"], ["ROBINET DE PUISAGE NIVEAU 0", "1,000"]] as const) add(`${SAN} › SALLE D'EAU`, d, q, null);
for (const [d, q] of [
  ["ROBINET LAVE VAISSELLE SANS RACCORD 1/2-3/4", "10,000"],
  ["SIPHON LAVE VAISSELLE SORTIE VERTICALE", "10,000"],
  ["Alimentation Eau froide, Eau chaude pour évier en attente pour cuisiniste (non prévu raccordement de l'évier, travaux à la charge du cuisiniste)", "10,000"],
] as const)
  add(`${SAN} › CUISINE`, d, q, null);
add(`${SAN} › ESPACE WC INDEPENDANT NIVEAU 0`, "ENSEMBLE SUSPENDU ANCOFLASH", "10,000");
add(`${SAN} › ESPACE WC INDEPENDANT NIVEAU 0`, "PLAQUE DOUBLE TOUCHE RONDO BLANC 100104506 PORCELANOSA", "10,000");
add(`${SAN} › ESPACE MEUBLE SDE NIVEAU 0`, "MEUBLE 60 AVEC MITIGEUR ET MIROIR", "10,000", null);
for (const [d, q] of [["RECEVEUR SLATE 90X90 CM PORCELANOSA", "4,000"], ["VALVULA HOR 80MM PLATO DUCHA STONE", "4,000"], ["THERMOSTATIQUE ET BARRE DE DOUCHE", "4,000"], ["PAROI A DEFINIR", "1,000"]] as const) add(`${SAN} › ESPACE DOUCHE SDE NIVEAU 0`, d, q);
for (const [d, q] of [["RECEVEUR DOUCHE120*90 CM PORCELANOSA BLANC 100286768", "6,000"], ["VALVULA HOR 80MM PLATO DUCHA STONE", "6,000"], ["THERMOSTATIQUE ET BARRE DE DOUCHE", "6,000"], ["PAROI A DEFINIR", "1,000"]] as const) add(`${SAN} › ESPACE DOUCHE SDE NIVEAU 2`, d, q);
for (const [d, q] of [
  ["MALICIO 80 LITRES", "7,000"],
  ["MALICIO 65 LITRES", "3,000"],
  ["GROUPE DE SECURITE AVEC SOUPAPE 10 BARS, VANNE D'ARRET, CLAPET ANTI-RETOUR ET MANOMETRE", "10,000"],
  ["SIPHON DE GROUPE", "10,000"],
  ["RACCORDS DIELECTRIQUE MF 3/4F", "10,000"],
  ["REDUCTEUR DE PRESSION", "10,000"],
  ["RACCORDS CUIVRE Y COMPRIS SOUDURE", "10,000"],
] as const)
  add(`${SAN} › CHAUFFE EAU ELECTRIQUE`, d, q);
add(`${SAN} › CANALISATION`, "Distribution eau froide et eau chaude en Tuyaux PE, dans la dalle.", "890,000", null);
add(`${SAN} › CANALISATION`, "TUBE PER PRE GAINE 10X12 BLEU", "1,000", null);
add(`${SAN} › CANALISATION`, "TUBE PER PRE GAINE 13X16 BLEU", "1,000", null);
add(`${SAN} › CANALISATION`, "plaque SERTIFIX DOUCHE", "1,000", null);
add(`${SAN} › CANALISATION`, "RACCORDS PE, RACCORDS MULTICOUCHE CUIVRE, OXYGENE, ACETYLENE, SOUDURES", "10,000", null);
add(`${SAN} › EVACUATION`, "TUBE PVC EVACUATION D 100 NF", "100,000", "ML");
for (const [d, q] of [
  ["CULOTTE PVC 87°30 MF SIMPLE 100", "60,000"],
  ["COUDE PVC 45° FF 100", "45,000"],
  ["COLLIER PVC 100", "100,000"],
  ["TAMPON REDUCTION PVC MF 100.40", "100,000"],
  ["RACCORDS 0/40, COLLES", "10,000"],
  ["FIXATION INOX WC BIDET 6X70 X2, et Manchon de raccordement", "10,000"],
  ["DIVERS PLATRE, CIMENT", "10,000"],
] as const)
  add(`${SAN} › EVACUATION`, d, q, null);

export const DEVIS_7954: readonly Ligne7954[] = out;
