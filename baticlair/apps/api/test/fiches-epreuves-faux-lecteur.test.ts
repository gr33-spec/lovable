import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §52, ÉPREUVES PAR LE FAUX LECTEUR (mission du fondateur, 2026-10-19 : « 5 devis d'épreuve par métier par le faux
 * lecteur » ; crédit API à zéro : « zéro appel API »). Chaque métier calculé par sa fiche (`referentiels/metiers/`) passe
 * par toute la porte /v1/quantitatifs : lecture simulée (l'ouvrage nommé par « Ce que le devis écrit »), questions de la
 * fiche, réponses, puis la commande au mot près. Devis d'épreuve écrits à la main, anonymes (désignations, quantités,
 * unités). Ajouter un métier : ajouter ses cinq épreuves ici.
 */
type Ligne = { libelle: string; quantite: string; unite: string };
type Epreuve = { nom: string; lignes: Ligne[]; questions: Record<string, string>; commande: Record<string, string>; ecrits?: string[] };

const EPREUVES: Record<string, { compte: string; epreuves: Epreuve[] }> = {
  earthworks: {
    compte: "terrassement",
    epreuves: [
      {
        nom: "accès voiture : géotextile et empierrement écrits avec leur épaisseur",
        lignes: [
          { libelle: "Décapage terre végétale sur 30 cm", quantite: "80", unite: "m²" },
          { libelle: "Géotextile sous empierrement", quantite: "80", unite: "m²" },
          { libelle: "Empierrement GNT 0/31,5 ép. 20 cm compactée", quantite: "80", unite: "m²" },
        ],
        questions: {},
        commande: { "GNT 0/31,5": "37 t", "Géotextile 150 g/m²": "1 rouleau 4 × 25 m de 100 m²" },
      },
      {
        nom: "branchement tout-à-l'égout : tubes, sable, grillage, et le regard tel qu'écrit",
        lignes: [
          { libelle: "Branchement eaux usées PVC CR8 Ø125 en tranchée", quantite: "18", unite: "ml" },
          { libelle: "Regard de branchement en limite de propriété", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Tube PVC CR8 Ø125": "7 barres de 3 m", "Sable 0/4": "6 t", "Grillage avertisseur marron": "1 rouleau de 100 m" },
        ecrits: ["Regard de branchement en limite de propriété"],
      },
      {
        nom: "tranchée commune électricité et télécom : la tranchée commune se demande",
        lignes: [
          { libelle: "Fourreau Enedis TPC Ø63", quantite: "30", unite: "ml" },
          { libelle: "Fourreau télécom TPC Ø40", quantite: "30", unite: "ml" },
          { libelle: "Lit de pose et enrobage sable des fourreaux", quantite: "30", unite: "ml" },
        ],
        questions: { tranchee_commune: "oui" },
        commande: {
          "Gaine TPC rouge Ø63": "1 couronne de 50 m",
          "Gaine TPC verte Ø40": "1 couronne de 50 m",
          "Grillage avertisseur rouge": "1 rouleau de 100 m",
          "Grillage avertisseur vert": "1 rouleau de 100 m",
          "Sable 0/4": "9 t",
        },
      },
      {
        nom: "assainissement non collectif : épandage calculé, fosse et boîtes telles qu'écrites",
        lignes: [
          { libelle: "Fosse toutes eaux 3000 L", quantite: "1", unite: "u" },
          { libelle: "Épandage 3 tranchées de 15 ml, gravier 10/40, géotextile", quantite: "45", unite: "ml" },
          { libelle: "Boîte de répartition", quantite: "1", unite: "u" },
          { libelle: "Boîte de bouclage", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Tube d'épandage PVC CR4 Ø100": "12 barres de 4 m", "Gravier roulé lavé 10/40": "14 t", "Géotextile en bande de 1 m": "1 rouleau de 50 m" },
        ecrits: ["Fosse toutes eaux 3000 L", "Boîte de répartition", "Boîte de bouclage"],
      },
      {
        nom: "maison : drainage, hérisson sans épaisseur (question), remblai en sable",
        lignes: [
          { libelle: "Drainage périphérique drain Ø100 enrobé, gravier 20/40, géotextile", quantite: "44", unite: "ml" },
          { libelle: "Regard de visite drainage", quantite: "5", unite: "u" },
          { libelle: "Hérisson en pierres cassées 20/40 sous dallage", quantite: "60", unite: "m²" },
          { libelle: "Remblai en sable d'apport", quantite: "5", unite: "m³" },
          { libelle: "Évacuation des déblais en décharge", quantite: "1", unite: "ens" },
        ],
        questions: { epaisseur_herisson: "20" },
        commande: {
          "Drain Ø100 enrobé géotextile": "1 couronne de 50 m",
          "Cailloux 20/40": "31 t",
          "Géotextile de drainage": "2 rouleaux 2 × 25 m de 50 m²",
          "Sable 0/4": "10 t",
        },
        ecrits: ["Regard de visite drainage"],
      },
    ],
  },
  masonry: {
    compte: "maconnerie",
    epreuves: [
      {
        nom: "murs en parpaings montés au ciment et sable, chaînage en blocs U",
        lignes: [
          { libelle: "Murs en parpaings de 20", quantite: "60", unite: "m²" },
          { libelle: "Chaînage horizontal en blocs U", quantite: "32", unite: "ml" },
        ],
        questions: { mortier: "chantier" },
        commande: {
          "Bloc béton creux 50 × 20 × 20": "9 palettes de 70 u",
          "Ciment CEM II 32,5": "12 sacs de 35 kg",
          "Sable 0/4": "2 t",
          "Bloc U de chaînage de 20": "68 u",
          "Armature de chaînage préfabriquée 4 HA10": "6 éléments de 6 m",
          "Béton C25/30": "1 m³",
        },
      },
      {
        nom: "fondations : la section écrite tranche la question, les fouilles hors commande",
        lignes: [
          { libelle: "Fouilles en rigole", quantite: "9", unite: "m³" },
          { libelle: "Béton de propreté 5 cm", quantite: "18", unite: "m²" },
          { libelle: "Semelle filante 50 × 25 en béton armé", quantite: "36", unite: "ml" },
        ],
        questions: {},
        commande: { "Béton de propreté": "1 m³", "Béton C25/30": "5 m³", "Armature de semelle filante préfabriquée": "7 éléments de 6 m" },
      },
      {
        nom: "dalle de garage : épaisseurs écrites, hérisson, film et treillis",
        lignes: [
          { libelle: "Hérisson 20/40 ép. 20 cm", quantite: "30", unite: "m²" },
          { libelle: "Film polyane", quantite: "30", unite: "m²" },
          { libelle: "Dalle béton armé ST25C ép. 12 cm", quantite: "30", unite: "m²" },
        ],
        questions: {},
        commande: { "Cailloux 20/40": "10 t", "Film polyéthylène 150 µm": "1 rouleau de 150 m²", "Béton C25/30": "4 m³", "Treillis soudé ST25C": "3 panneaux de 14,4 m²" },
      },
      {
        nom: "étage : plancher hourdis béton, poutrelles telles qu'écrites, murs en brique R20",
        lignes: [
          { libelle: "Plancher poutrelles hourdis béton", quantite: "40", unite: "m²" },
          { libelle: "Poutrelles précontraintes selon plan", quantite: "8", unite: "u" },
          { libelle: "Mur en brique R20", quantite: "50", unite: "m²" },
        ],
        questions: {},
        commande: {
          "Entrevous béton 16 (53 × 20)": "5 palettes de 72 u",
          "Béton C25/30": "2,5 m³",
          "Treillis de dalle de compression (PAF)": "7 panneaux de 6,4 m²",
          "Brique rectifiée de 20 (type R20)": "7 palettes de 60 u",
          "Mortier joint mince pour brique rectifiée": "4 sacs de 25 kg",
        },
        ecrits: ["Poutrelles précontraintes selon plan"],
      },
      {
        nom: "béton cellulaire, enduit et chape (épaisseur demandée), échafaudage hors commande",
        lignes: [
          { libelle: "Murs en béton cellulaire de 20", quantite: "70", unite: "m²" },
          { libelle: "Enduit monocouche gratté", quantite: "85", unite: "m²" },
          { libelle: "Chape ciment", quantite: "40", unite: "m²" },
          { libelle: "Échafaudage", quantite: "1", unite: "ens" },
        ],
        questions: { epaisseur_chape: "6" },
        commande: {
          "Bloc béton cellulaire de 20 (62,5 × 25)": "10 palettes de 48 u",
          "Mortier-colle pour béton cellulaire": "13 sacs de 25 kg",
          "Enduit monocouche": "75 sacs de 25 kg",
          "Ciment CEM II 32,5": "27 sacs de 35 kg",
          "Sable 0/4": "4,5 t",
        },
      },
    ],
  },
  carpentry: {
    compte: "charpente",
    epreuves: [
      {
        nom: "chevronnage : longueur et entraxe écrits, aucune question",
        lignes: [{ libelle: "Chevronnage sapin traité 63×75, chevrons L 4,00 m entraxe 60 cm", quantite: "80", unite: "m²" }],
        questions: { consommables: "1" },
        commande: { "Chevron 63×75 traité classe 2 L 4,00 m": "36 pièces", "Vis de charpente 8×160": "2 boîtes de 50 u" },
      },
      {
        nom: "chevrons 6/8 sans longueur ni entraxe : deux questions",
        lignes: [{ libelle: "Chevrons 6/8 sapin traité classe 2", quantite: "50", unite: "m²" }],
        questions: { longueur_chevron: "500", entraxe_chevrons: "50", consommables: "1" },
        commande: { "Chevron 63×75 traité classe 2 L 5,00 m": "22 pièces", "Vis de charpente 8×160": "2 boîtes de 50 u" },
      },
      {
        nom: "rénovation : traitement curatif au bidon, chevrons remplacés tels qu'écrits",
        lignes: [
          { libelle: "Traitement curatif de charpente existante", quantite: "120", unite: "m²" },
          { libelle: "Remplacement de chevrons à l'identique", quantite: "6", unite: "u" },
        ],
        questions: {},
        commande: { "Traitement insecticide-fongicide charpente": "3 bidons de 20 L" },
        ecrits: ["Remplacement de chevrons à l'identique"],
      },
      {
        nom: "combles : plancher OSB au panneau, solives telles qu'écrites",
        lignes: [
          { libelle: "Plancher OSB 18 mm", quantite: "45", unite: "m²" },
          { libelle: "Solives 75×225 L 4,50 m", quantite: "12", unite: "u" },
        ],
        questions: {},
        commande: { "Panneau OSB3 18 mm rainé-bouveté 2500×675": "29 panneaux de 1,65 m²" },
        ecrits: ["Solives 75×225 L 4,50 m"],
      },
      {
        nom: "garage : lot de fermettes tel qu'écrit, rives et ancrage des sablières",
        lignes: [
          { libelle: "Fermettes industrielles sur plan, lot fabricant", quantite: "1", unite: "u" },
          { libelle: "Planches de rive sapin traité", quantite: "30", unite: "ml" },
          { libelle: "Sablière ancrée sur maçonnerie", quantite: "16", unite: "ml" },
        ],
        questions: { consommables: "1" },
        commande: { "Planche de rive sapin traité": "8 pièces de 4 m", "Goujon d'ancrage béton M10": "1 boîte de 50 u" },
        ecrits: ["Fermettes industrielles sur plan, lot fabricant"],
      },
    ],
  },
  joinery: {
    compte: "menuiserie",
    epreuves: [
      {
        nom: "fenêtres en dépose totale : la fenêtre reste telle qu'écrite, la pose ajoute ses fournitures",
        lignes: [{ libelle: "Fenêtre PVC 2 vantaux 1200 × 1350, pose en dépose totale", quantite: "3", unite: "u" }],
        questions: { consommables: "1" },
        commande: {
          "Mousse imprégnée précomprimée 15/3-7": "3 rouleaux de 8 m",
          "Mousse PU basse expansion 750 ml": "2 aérosols de 15 m",
          "Mastic MS polymère 290 ml": "4 cartouches de 5,2 m",
          "Mastic acrylique 310 ml": "2 cartouches de 14 m",
          "Vis de cadre FFS 7,5 × 152": "1 boîte de 100 u",
          "Habillage intérieur PVC plat 100 mm": "5 barres de 3 m",
        },
        ecrits: ["@1"],
      },
      {
        nom: "portes-fenêtres en rénovation sur dormant : habillages intérieur et extérieur",
        lignes: [{ libelle: "Porte-fenêtre PVC 2 vantaux, pose en rénovation sur dormant existant", quantite: "2", unite: "u" }],
        questions: { consommables: "1" },
        commande: {
          "Mastic MS polymère 290 ml": "3 cartouches de 5,2 m",
          "Mastic acrylique 310 ml": "1 cartouche de 14 m",
          "Mousse PU basse expansion 750 ml": "1 aérosol de 15 m",
          "Vis de cadre FFS 7,5 × 152": "1 boîte de 100 u",
          "Habillage intérieur PVC plat 100 mm": "5 barres de 3 m",
          "Cornière d'habillage extérieur PVC": "5 barres de 3 m",
        },
        ecrits: ["@1"],
      },
      {
        nom: "neuf en applique : deux formats sur deux lignes, chacun le sien",
        lignes: [
          { libelle: "Baie coulissante alu, pose en applique", quantite: "1", unite: "u" },
          { libelle: "Fenêtre alu fixe, pose en applique", quantite: "1", unite: "u" },
        ],
        questions: { consommables: "1" },
        commande: {
          "Mousse imprégnée précomprimée 15/3-7": "2 rouleaux de 8 m",
          "Bande d'étanchéité à l'air 100 mm": "1 rouleau de 25 m",
          "Cheville de fixation de cadre 8 × 80": "1 boîte de 100 u",
        },
        ecrits: ["@1", "@2"],
      },
      {
        nom: "porte d'entrée, volets roulants tels qu'écrits",
        lignes: [
          { libelle: "Porte d'entrée alu vitrée", quantite: "1", unite: "u" },
          { libelle: "Volet roulant rénovation radio", quantite: "3", unite: "u" },
        ],
        questions: { consommables: "1" },
        commande: {
          "Mousse imprégnée précomprimée 15/3-7": "1 rouleau de 8 m",
          "Mousse PU basse expansion 750 ml": "1 aérosol de 15 m",
          "Mastic MS polymère 290 ml": "2 cartouches de 5,2 m",
          "Vis de cadre FFS 7,5 × 152": "1 boîte de 100 u",
        },
        ecrits: ["@1", "@2"],
      },
      {
        nom: "menuiseries sans cotes ni type : le format se demande",
        lignes: [{ libelle: "Menuiseries PVC, pose en dépose totale", quantite: "5", unite: "u" }],
        questions: { format_depose: "petite", consommables: "1" },
        commande: {
          "Mousse imprégnée précomprimée 15/3-7": "3 rouleaux de 8 m",
          "Mousse PU basse expansion 750 ml": "2 aérosols de 15 m",
          "Mastic MS polymère 290 ml": "4 cartouches de 5,2 m",
          "Mastic acrylique 310 ml": "2 cartouches de 14 m",
          "Vis de cadre FFS 7,5 × 152": "1 boîte de 100 u",
          "Habillage intérieur PVC plat 100 mm": "6 barres de 3 m",
        },
        ecrits: ["@1"],
      },
    ],
  },
  interior_joinery: {
    compte: "menuiserie-interieure",
    epreuves: [
      {
        nom: "stratifié flottant : pose et colisage écrits, aucune question",
        lignes: [{ libelle: "Parquet stratifié flottant pose droite, colis de 2,2 m²", quantite: "30", unite: "m²" }],
        questions: {},
        commande: { "Parquet ou stratifié, colis de 2,2 m²": "15 colis de 2,2 m²", "Sous-couche parquet": "3 rouleaux de 15 m²" },
      },
      {
        nom: "point de Hongrie sans colisage : deux questions",
        lignes: [{ libelle: "Parquet contrecollé flottant en point de Hongrie", quantite: "12", unite: "m²" }],
        questions: { pose_parquet: "hongrie", colis_parquet: "1.5" },
        commande: { "Parquet ou stratifié, colis de 1,5 m²": "9 colis de 1,5 m²", "Sous-couche parquet": "1 rouleau de 15 m²" },
      },
      {
        nom: "plinthes en barres, blocs-portes tels qu'écrits",
        lignes: [
          { libelle: "Plinthes bois", quantite: "38", unite: "ml" },
          { libelle: "Bloc-porte isoplane 204 × 73 poussant gauche", quantite: "3", unite: "u" },
        ],
        questions: {},
        commande: { "Plinthe en barre de 2,40 m": "18 barres de 2,4 m" },
        ecrits: ["@2"],
      },
      {
        nom: "lambris sous rampant : la pose se demande, tasseaux en barres",
        lignes: [{ libelle: "Lambris pin sous toiture", quantite: "25", unite: "m²" }],
        questions: { pose_lambris: "rampant" },
        commande: { "Lambris en botte de 2 m²": "15 bottes de 2 m²", "Tasseau 27 × 40": "26 barres de 2,4 m" },
      },
      {
        nom: "placards tels qu'écrits et plinthes",
        lignes: [
          { libelle: "Façade de placard coulissante 2 vantaux 1,80 × 2,50", quantite: "2", unite: "u" },
          { libelle: "Plinthes MDF prépeintes", quantite: "20", unite: "ml" },
        ],
        questions: {},
        commande: { "Plinthe en barre de 2,40 m": "9 barres de 2,4 m" },
        ecrits: ["@1"],
      },
    ],
  },
  drywall: {
    compte: "platrerie",
    epreuves: [
      {
        nom: "cloison avec sa hauteur écrite : plaques et montants de 2,70 m, entraxe 40",
        lignes: [{ libelle: "Cloison 72/48 BA13 sur ossature, hauteur 2,70 m", quantite: "30", unite: "m²" }],
        questions: { consommables: "1" },
        commande: {
          "Plaque BA13 1,20 × 2,70 m": "20 plaques",
          "Montant M48 L 2,70 m": "34 montants",
          "Rail R48 3 m": "9 barres de 3 m",
          "Vis TTPC 25": "1 boîte de 1 000 u",
          "Bande à joint papier": "1 rouleau de 150 m",
          "Enduit à joint poudre": "1 sac de 25 kg",
        },
      },
      {
        nom: "doublage collé sans hauteur : la hauteur se demande ; consommables refusés",
        lignes: [{ libelle: "Doublage collé Placomur 10+80", quantite: "45", unite: "m²" }],
        questions: { hauteur_doublage: "2.6", consommables: "0" },
        commande: { "Panneau de doublage collé 1,20 × 2,60 m": "16 panneaux", "Mortier adhésif MAP": "4 sacs de 25 kg" },
      },
      {
        nom: "plafond F530 et trappe de visite telle qu'écrite",
        lignes: [
          { libelle: "Plafond suspendu BA13 sur fourrures F530", quantite: "40", unite: "m²" },
          { libelle: "Trappe de visite 60 × 60", quantite: "1", unite: "u" },
        ],
        questions: { consommables: "1" },
        commande: {
          "Plaque BA13 1,20 × 2,50 m": "14 plaques",
          "Fourrure F530 3 m": "26 barres de 3 m",
          "Suspente F530": "1 boîte de 100 u",
          "Cornière de rive F530 3 m": "7 barres de 3 m",
          "Vis TTPC 25": "1 boîte de 1 000 u",
          "Bande à joint papier": "1 rouleau de 150 m",
          "Enduit à joint poudre": "1 sac de 25 kg",
        },
        ecrits: ["@2"],
      },
      {
        nom: "combles soufflés, résistance écrite",
        lignes: [{ libelle: "Isolation des combles perdus par soufflage R 7", quantite: "80", unite: "m²" }],
        questions: {},
        commande: { "Laine de verre à souffler": "19 sacs de 17,3 kg" },
      },
      {
        nom: "cloison sans hauteur et doublage avec la sienne : une question, deux longueurs",
        lignes: [
          { libelle: "Cloison 72/48 BA13 sur ossature", quantite: "20", unite: "m²" },
          { libelle: "Doublage collé Placomur 10+80, hauteur 2,50 m", quantite: "25", unite: "m²" },
        ],
        questions: { hauteur_cloison: "2.5", consommables: "1" },
        commande: {
          "Plaque BA13 1,20 × 2,50 m": "14 plaques",
          "Montant M48 L 2,50 m": "17 montants",
          "Rail R48 3 m": "6 barres de 3 m",
          "Panneau de doublage collé 1,20 × 2,50 m": "9 panneaux",
          "Mortier adhésif MAP": "2 sacs de 25 kg",
          "Vis TTPC 25": "1 boîte de 1 000 u",
          "Bande à joint papier": "1 rouleau de 150 m",
          "Enduit à joint poudre": "1 sac de 25 kg",
        },
      },
    ],
  },
  plumbing: {
    compte: "plomberie",
    epreuves: [
      {
        nom: "deux lavabos en multicouche écrit, kits livrés : seuls tubes, raccords, coudes et colle",
        lignes: [{ libelle: "Lavabo vasque sur meuble, alimentation multicouche", quantite: "2", unite: "u" }],
        questions: { distance_nourrice: "5", kit_livre: "oui", consommables: "1" },
        commande: {
          "Tube multicouche 16 × 2": "1 couronne de 50 m",
          "Tube PVC évacuation Ø32": "4 barres de 4 m",
          "Raccord à sertir multicouche 16": "8 u",
          "Coude PVC Ø32 87°30": "4 u",
          "Colle PVC": "1 pot de 250 ml",
        },
        ecrits: ["@1"],
      },
      {
        nom: "deux WC en PER, kits à commander, consommables refusés",
        lignes: [
          { libelle: "WC suspendu avec bâti-support", quantite: "1", unite: "u" },
          { libelle: "WC à poser sortie horizontale", quantite: "1", unite: "u" },
        ],
        questions: { distance_nourrice: "3", tube_alimentation: "per", kit_livre: "non", consommables: "0" },
        commande: {
          "Tube PER pré-gainé 16": "1 couronne de 50 m",
          "Tube PVC évacuation Ø100": "2 barres de 4 m",
          "Raccord à glissement PER 16": "4 u",
          "Coude PVC Ø100 87°30": "2 u",
          "Manchon de WC Ø90/100": "1 u",
          "Pipe de WC Ø100": "1 u",
          "Robinet d'arrêt 15 × 21": "2 u",
          "Flexible d'alimentation": "1 u",
        },
        ecrits: ["@1", "@2"],
      },
      {
        nom: "douche et baignoire loin de la nourrice : diamètres 16 et 20",
        lignes: [
          { libelle: "Douche à l'italienne", quantite: "1", unite: "u" },
          { libelle: "Baignoire acrylique 170 × 70", quantite: "1", unite: "u" },
        ],
        questions: { distance_nourrice: "8", tube_alimentation: "multicouche", kit_livre: "non", consommables: "1" },
        commande: {
          "Tube multicouche 16 × 2": "1 couronne de 50 m",
          "Tube multicouche 20 × 2": "1 couronne de 50 m",
          "Tube PVC évacuation Ø40": "5 barres de 4 m",
          "Raccord à sertir multicouche 16": "4 u",
          "Raccord à sertir multicouche 20": "4 u",
          "Coude PVC Ø40 87°30": "4 u",
          "Colle PVC": "1 pot de 250 ml",
          "Bonde de douche Ø90": "1 u",
          "Vidage de baignoire": "1 u",
        },
        ecrits: ["@1", "@2"],
      },
      {
        nom: "chauffe-eau : groupe et siphon de sécurité toujours, pas de question de kit",
        lignes: [{ libelle: "Chauffe-eau électrique 200 L", quantite: "1", unite: "u" }],
        questions: { distance_nourrice: "3", tube_alimentation: "multicouche", consommables: "1" },
        commande: {
          "Tube multicouche 20 × 2": "1 couronne de 50 m",
          "Tube PVC évacuation Ø32": "1 barre de 4 m",
          "Raccord à sertir multicouche 20": "4 u",
          "Coude PVC Ø32 87°30": "2 u",
          "Colle PVC": "1 pot de 250 ml",
          "Groupe de sécurité 20 × 27": "1 u",
          "Siphon de groupe de sécurité": "1 u",
        },
        ecrits: ["@1"],
      },
      {
        nom: "cuisine : évier, lave-linge, robinetterie telle qu'écrite",
        lignes: [
          { libelle: "Évier inox 2 bacs", quantite: "1", unite: "u" },
          { libelle: "Alimentation et évacuation lave-linge", quantite: "1", unite: "u" },
          { libelle: "Robinetterie mitigeur chromé", quantite: "1", unite: "u" },
        ],
        questions: { distance_nourrice: "5", tube_alimentation: "per", kit_livre: "non", consommables: "0" },
        commande: {
          "Tube PER pré-gainé 16": "1 couronne de 50 m",
          "Tube PVC évacuation Ø40": "4 barres de 4 m",
          "Raccord à glissement PER 16": "6 u",
          "Coude PVC Ø40 87°30": "4 u",
          "Bonde et siphon d'évier Ø40 avec prise lave-vaisselle": "1 u",
          "Robinet machine à laver": "2 u",
          "Siphon d'attente Ø40": "1 u",
        },
        ecrits: ["@1", "@2", "@3"],
      },
    ],
  },
  hvac: {
    compte: "chauffage-ventilation",
    epreuves: [
      {
        nom: "monosplit : une couronne à la bonne longueur, goulotte, condensats, support",
        lignes: [
          { libelle: "Unité intérieure murale 2,5 kW", quantite: "1", unite: "u" },
          { libelle: "Groupe extérieur monosplit 2,5 kW", quantite: "1", unite: "u" },
        ],
        questions: { distance_groupe: "3" },
        commande: {
          "Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 5 m": "1 couronne",
          "Goulotte de liaison 80 × 60": "2 barres de 2 m",
          "Tuyau de condensats Ø16": "1 rouleau de 30 m",
          "Passage de mur pour goulotte": "1 u",
          "Angle de goulotte": "2 u",
          "Support de groupe extérieur": "1 u",
          "Plots antivibratiles (jeu de 4)": "1 jeu",
        },
        ecrits: ["@1", "@2"],
      },
      {
        nom: "PAC bibloc écrite : liaison frigorifique, ni flexibles ni vannes",
        lignes: [{ libelle: "PAC air/eau bibloc 11 kW", quantite: "1", unite: "u" }],
        questions: { distance_groupe: "8" },
        commande: {
          "Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 10 m": "1 couronne",
          "Tuyau de condensats Ø16": "1 rouleau de 30 m",
          "Filtre à boues magnétique": "1 u",
          "Support de groupe extérieur": "1 u",
          "Plots antivibratiles (jeu de 4)": "1 jeu",
        },
        ecrits: ["@1"],
      },
      {
        nom: "radiateurs à l'identique : raccords de transition, aucune distance demandée",
        lignes: [{ libelle: "Remplacement de radiateurs acier à l'identique", quantite: "5", unite: "u" }],
        questions: {},
        commande: { "Raccord de transition": "10 u" },
        ecrits: ["@1"],
      },
      {
        nom: "VMC hygro B : gaines au carton selon les pièces de service, consommables sur le oui",
        lignes: [{ libelle: "VMC simple flux hygro B", quantite: "1", unite: "u" }],
        questions: { nb_bouches: "5", consommables: "1" },
        commande: {
          "Gaine VMC souple Ø80": "4 cartons de 6 m",
          "Gaine VMC souple Ø125": "1 carton de 6 m",
          "Gaine VMC isolée Ø125 (rejet)": "1 carton de 6 m",
          "Sortie de toit VMC": "1 u",
          "Adhésif aluminium": "1 rouleau",
          "Collier de serrage VMC": "2 sachets de 10 u",
        },
        ecrits: ["@1"],
      },
      {
        nom: "plancher chauffant et sèche-serviettes sur réseau neuf",
        lignes: [
          { libelle: "Plancher chauffant basse température", quantite: "100", unite: "m²" },
          { libelle: "Radiateur sèche-serviettes à eau", quantite: "1", unite: "u" },
        ],
        questions: { radiateur_reseau: "neuf", distance_radiateur: "4" },
        commande: {
          "Tube PER BAO 16 × 1,5": "3 couronnes de 240 m",
          "Panneau isolant à plots": "112 panneaux de 0,94 m²",
          "Bande périphérique": "2 rouleaux de 50 m",
          "Tube multicouche 16 × 2": "1 couronne de 50 m",
          "Robinet thermostatique": "1 u",
          "Té de réglage": "1 u",
        },
        ecrits: ["@2"],
      },
    ],
  },
  tiling: {
    compte: "carrelage",
    epreuves: [
      {
        nom: "60x60 pose droite écrite : cartons, colle double encollage, joint",
        lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }],
        questions: {},
        commande: { "Carreau de sol 60×60": "23 cartons de 1,44 m²", "Mortier-colle C2 S1": "7 sacs de 25 kg", "Mortier de joint": "1 sac de 5 kg" },
      },
      {
        nom: "45x45 en diagonale : 12 % de coupes",
        lignes: [{ libelle: "Carrelage sol 45x45 en diagonale", quantite: "20", unite: "m²" }],
        questions: {},
        commande: { "Carreau de sol 45×45": "14 cartons de 1,62 m²", "Mortier-colle C2 S1": "5 sacs de 25 kg", "Mortier de joint": "1 sac de 5 kg" },
      },
      {
        nom: "faïence 30x60 et plinthes assorties à la pièce",
        lignes: [
          { libelle: "Faïence murale 30x60", quantite: "15", unite: "m²" },
          { libelle: "Plinthes assorties", quantite: "20", unite: "ml" },
        ],
        questions: {},
        commande: { "Faïence 30×60": "12 cartons de 1,44 m²", "Mortier-colle C2 S1": "4 sacs de 25 kg", "Mortier de joint": "1 sac de 5 kg", "Plinthe carrelage 8 × 60": "35 plinthes de 0,6 m" },
      },
      {
        nom: "protection à l'eau de la douche, receveur tel qu'écrit",
        lignes: [
          { libelle: "Système de protection à l'eau sous carrelage", quantite: "8", unite: "m²" },
          { libelle: "Receveur de douche 90 × 90", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Résine de protection à l'eau (SPEC)": "1 seau de 7 kg", "Primaire avant SPEC": "2 bidons" },
        ecrits: ["@2"],
      },
      {
        nom: "ragréage 5 mm écrit, carrelage sans format ni pose : deux questions",
        lignes: [
          { libelle: "Ragréage P3 5 mm", quantite: "25", unite: "m²" },
          { libelle: "Carrelage sol grès cérame", quantite: "25", unite: "m²" },
        ],
        questions: { format_sol: "60x120", pose_sol: "decalee" },
        commande: {
          "Ragréage autolissant P3": "8 sacs de 25 kg",
          "Primaire d'accrochage": "1 bidon de 5 kg",
          "Carreau de sol 60×120": "20 cartons de 1,44 m²",
          "Mortier-colle C2 S1": "7 sacs de 25 kg",
          "Mortier de joint": "1 sac de 5 kg",
        },
      },
    ],
  },
  flooring: {
    compte: "sols",
    epreuves: [
      {
        nom: "sol PVC en rouleau collé : mètres de lé de 4 m et colle",
        lignes: [{ libelle: "Sol PVC en rouleau collé", quantite: "50", unite: "m²" }],
        questions: {},
        commande: { "Sol PVC en rouleau, largeur 4 m": "14 mètres de 4 m²", "Colle acrylique sols souples": "1 seau de 20 kg" },
      },
      {
        nom: "lames clipsables, colis de 2,8 m² écrit : aucune question",
        lignes: [{ libelle: "Lames vinyle clipsables, colis de 2,8 m²", quantite: "30", unite: "m²" }],
        questions: {},
        commande: { "Lames vinyle clipsables, colis de 2,8 m²": "12 colis de 2,8 m²", "Sous-couche pour sol clipsable": "4 rouleaux de 10 m²" },
      },
      {
        nom: "parquet flottant sans colis ni pose : deux questions",
        lignes: [{ libelle: "Parquet flottant chêne", quantite: "40", unite: "m²" }],
        questions: { colis_parquet: "2.0", pose_parquet: "droite" },
        commande: { "Parquet ou stratifié, colis de 2 m²": "21 colis de 2 m²", "Sous-couche parquet": "3 rouleaux de 15 m²" },
      },
      {
        nom: "moquette collée et barres de seuil telles qu'écrites",
        lignes: [
          { libelle: "Moquette collée", quantite: "60", unite: "m²" },
          { libelle: "Barre de seuil alu", quantite: "4", unite: "u" },
        ],
        questions: {},
        commande: { "Moquette en rouleau, largeur 4 m": "17 mètres de 4 m²", "Colle acrylique sols souples": "2 seaux de 20 kg" },
        ecrits: ["@2"],
      },
      {
        nom: "ragréage 5 mm et pose en diagonale écrits : seul le colis est demandé",
        lignes: [
          { libelle: "Ragréage P3 5 mm", quantite: "20", unite: "m²" },
          { libelle: "Parquet flottant posé en diagonale", quantite: "20", unite: "m²" },
        ],
        questions: { colis_parquet: "2.2" },
        commande: {
          "Ragréage autolissant P3": "6 sacs de 25 kg",
          "Primaire d'accrochage": "1 bidon de 5 kg",
          "Parquet ou stratifié, colis de 2,2 m²": "11 colis de 2,2 m²",
          "Sous-couche parquet": "2 rouleaux de 15 m²",
        },
      },
    ],
  },
  painting: {
    compte: "peinture",
    epreuves: [
      {
        nom: "impression et 2 couches écrites : aucune question",
        lignes: [{ libelle: "Peinture murs et plafonds, impression + 2 couches", quantite: "100", unite: "m²" }],
        questions: {},
        commande: { "Peinture acrylique murs et plafonds": "2 seaux de 15 L", "Impression acrylique": "1 seau de 15 L" },
      },
      {
        nom: "plafonds sans couches ni impression : deux questions",
        lignes: [{ libelle: "Peinture plafonds mate", quantite: "60", unite: "m²" }],
        questions: { couches: "2", impression: "non" },
        commande: { "Peinture acrylique murs et plafonds": "1 seau de 15 L" },
      },
      {
        nom: "enduit en 2 passes écrit : sacs de 25 kg",
        lignes: [{ libelle: "Enduit de lissage 2 passes", quantite: "50", unite: "m²" }],
        questions: {},
        commande: { "Enduit de lissage en poudre": "2 sacs de 25 kg" },
      },
      {
        nom: "laque 2 couches en pots, radiateurs tels qu'écrits",
        lignes: [
          { libelle: "Laque boiseries satin, 2 couches", quantite: "15", unite: "m²" },
          { libelle: "Peinture radiateurs acier", quantite: "3", unite: "u" },
        ],
        questions: {},
        commande: { "Laque acrylique satin boiseries": "3 pots" },
        ecrits: ["@2"],
      },
      {
        nom: "papier peint et façade D2 : rouleaux, colle, seaux",
        lignes: [
          { libelle: "Pose de papier peint", quantite: "40", unite: "m²" },
          { libelle: "Ravalement peinture D2", quantite: "120", unite: "m²" },
        ],
        questions: {},
        commande: {
          "Papier peint, rouleau de 10,05 × 0,53 m": "9 rouleaux de 5,3 m²",
          "Colle papier peint": "1 seau de 10 kg",
          "Peinture façade D2": "3 seaux de 15 L",
        },
      },
    ],
  },
  metalwork: {
    compte: "serrurerie",
    epreuves: [
      {
        nom: "garde-corps galvanisé écrit : barres de 6 m, platines, scellement sur ton oui",
        lignes: [{ libelle: "Garde-corps acier à barreaudage galvanisé", quantite: "6", unite: "ml" }],
        questions: { consommables: "1" },
        commande: {
          "Tube carré acier 20 × 20 (barreaux)": "8 barres de 6 m",
          "Tube carré acier 40 × 40 (main courante, lisse, poteaux)": "3 barres de 6 m",
          "Platine acier 150 × 150 × 8": "5 pièces",
          "Scellement chimique, cartouche de 300 ml": "1 cartouche",
        },
      },
      {
        nom: "garde-corps sans finition : peint, antirouille et laque en pots",
        lignes: [{ libelle: "Garde-corps métallique", quantite: "10", unite: "ml" }],
        questions: { finition: "peint", consommables: "1" },
        commande: {
          "Tube carré acier 20 × 20 (barreaux)": "13 barres de 6 m",
          "Tube carré acier 40 × 40 (main courante, lisse, poteaux)": "5 barres de 6 m",
          "Platine acier 150 × 150 × 8": "7 pièces",
          "Scellement chimique, cartouche de 300 ml": "1 cartouche",
          "Primaire antirouille": "1 pot",
          "Laque glycéro métal": "1 pot",
        },
      },
      {
        nom: "grille de défense : carré plein et fer plat en barres",
        lignes: [{ libelle: "Grille de défense acier", quantite: "6", unite: "m²" }],
        questions: {},
        commande: { "Carré plein acier 14 × 14 (barreaux)": "9 barres de 6 m", "Fer plat acier 30 × 8 (traverses)": "3 barres de 6 m" },
      },
      {
        nom: "clôture 1,73 m écrite, portillon tel qu'écrit",
        lignes: [
          { libelle: "Clôture en panneaux rigides 1,73 m", quantite: "50", unite: "ml" },
          { libelle: "Portillon assorti 1 m", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Panneau rigide 2,50 × 1,73 m": "20 panneaux", "Poteau de clôture à encoches": "20 poteaux" },
        ecrits: ["@2"],
      },
      {
        nom: "clôture sans hauteur : une question",
        lignes: [{ libelle: "Clôture panneaux soudés", quantite: "25", unite: "ml" }],
        questions: { hauteur_cloture: "1.23" },
        commande: { "Panneau rigide 2,50 × 1,23 m": "10 panneaux", "Poteau de clôture à encoches": "10 poteaux" },
      },
    ],
  },
  facade: {
    compte: "facade",
    epreuves: [
      {
        nom: "monocouche gratté sur maçonnerie écrit : sacs de 25 kg, aucune question",
        lignes: [{ libelle: "Enduit monocouche gratté sur maçonnerie", quantite: "50", unite: "m²" }],
        questions: {},
        commande: { "Enduit monocouche": "57 sacs de 25 kg" },
      },
      {
        nom: "monocouche sans support ni finition : deux questions",
        lignes: [{ libelle: "Enduit monocouche OC2", quantite: "40", unite: "m²" }],
        questions: { support_enduit: "beton", finition_enduit: "taloche" },
        commande: { "Enduit monocouche": "23 sacs de 25 kg" },
      },
      {
        nom: "ITE PSE 120 mm écrite : colis, mortier, chevilles, treillis, finition",
        lignes: [{ libelle: "ITE polystyrène graphité 120 mm", quantite: "60", unite: "m²" }],
        questions: {},
        commande: {
          "PSE graphite ITE 1200 × 600 × 120 mm": "22 colis de 2,88 m²",
          "Mortier colle et sous-enduit ITE": "28 sacs de 25 kg",
          "Cheville à frapper ITE 180 mm": "5 boîtes de 100 u",
          "Treillis d'armature fibre de verre": "2 rouleaux de 50 m²",
          "Finition organique talochée": "7 seaux de 25 kg",
        },
      },
      {
        nom: "RPE grain 2 écrit, bavettes telles qu'écrites",
        lignes: [
          { libelle: "RPE taloché grain 2", quantite: "100", unite: "m²" },
          { libelle: "Bavettes alu d'appui", quantite: "6", unite: "u" },
        ],
        questions: {},
        commande: { "Revêtement plastique épais": "13 seaux de 25 kg" },
        ecrits: ["@2"],
      },
      {
        nom: "antimousse puis peinture D2 : bidons et seaux",
        lignes: [
          { libelle: "Traitement antimousse", quantite: "150", unite: "m²" },
          { libelle: "Peinture de façade D2", quantite: "150", unite: "m²" },
        ],
        questions: {},
        commande: { "Antimousse façade": "2 bidons de 20 L", "Peinture façade D2": "3 seaux de 15 L" },
      },
    ],
  },
};

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

type Vue = { id: string; metier: string; peut_partir: boolean; questions: { id: string }[]; lignes: { libelle: string; texte: string; a_confirmer: boolean; raison?: string }[] };
const RATIO = "ratio:";
const cleDe = (id: string) => id.replace(/^(?:engine:)?(?:fiche|param):/, "");

describe("§52 : cinq devis d'épreuve par métier, par le faux lecteur", () => {
  for (const [metier, { compte, epreuves }] of Object.entries(EPREUVES)) {
    for (const [i, e] of epreuves.entries()) {
      it(`${compte}, épreuve ${i + 1} : ${e.nom}`, async () => {
        const { agent } = await signUpWithCompany(ctx.app, `epreuve-${compte}-${i}@example.fr`, "Entreprise d'épreuve", [metier]);
        let q = (await agent.post("/v1/quantitatifs").send({ lignes: e.lignes }).expect(201)).body as Vue;
        expect(q.metier).toBe(compte);
        // Les questions de la fiche (§51.6) ; les « C'est bon » des ratios « à vérifier » (§47.1) sont à part.
        const fiche = (v: Vue) => v.questions.filter((x) => !x.id.startsWith(RATIO));
        expect(fiche(q).map((x) => cleDe(x.id)).sort()).toEqual(Object.keys(e.questions).sort());
        if (Object.keys(e.questions).length > 0) {
          const reponses = fiche(q).map((x) => ({ question: x.id, valeur: e.questions[cleDe(x.id)]! }));
          q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses }).expect(201)).body as Vue;
          expect(fiche(q)).toEqual([]);
        }
        // §47.1 : une ligne orange dit sa règle (ou « consommable sur ton oui », §49.1) ; « C'est bon » sur chacune, puis la liste part.
        for (const l of q.lignes.filter((x) => x.a_confirmer)) expect(l.raison, l.libelle).toMatch(/^(?:Quantité à confirmer : \S|Consommable ajouté sur ton oui)/);
        const ok = q.questions.filter((x) => x.id.startsWith(RATIO)).map((x) => ({ question: x.id, valeur: "ok" }));
        if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body as Vue;
        expect(q.questions).toEqual([]);
        expect(q.peut_partir).toBe(true);
        const commande = Object.fromEntries(q.lignes.map((l) => [l.libelle, l.texte]));
        for (const [f, attendu] of Object.entries(e.commande)) expect(commande[f], f).toBe(attendu);
        // Règle numéro un : rien d'autre que ce que les ouvrages écrits contiennent, et les pièces écrites telles quelles.
        // « @n » : la ligne n du devis, telle qu'écrite (la menuiserie dont la fiche ne calcule que la pose).
        const ecrits = (e.ecrits ?? []).map((x) => (/^@\d+$/.test(x) ? e.lignes[Number(x.slice(1)) - 1]!.libelle : x));
        for (const x of ecrits) expect(Object.keys(commande).some((k) => x.startsWith(k)), x).toBe(true);
        expect(Object.keys(commande).length).toBe(Object.keys(e.commande).length + ecrits.length);
      });
    }
  }
});
