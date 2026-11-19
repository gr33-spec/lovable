import { TARIFS } from "../../../../../packages/domain/src/groupe/tarifs";
import type { FichePageLocale } from "./fiche";

/**
 * LA FICHE « COUVREURS DE BRETAGNE » (Greg, 19 novembre 2026) : la première page locale, celle qu'on dupliquera.
 * Les faits de la petite histoire sont croisés sur au moins deux sources (`sources`, détail dans
 * `docs/regions/bretagne-couvreurs-sources.md`) ; en cas de doute, la phrase est retirée. Photos : libres de droits pour
 * un usage commercial, auteur et licence affichés ; pour mettre ses propres photos, on remplace le fichier sous le même
 * nom dans `public/regions/bretagne/` (et ses dimensions ici).
 */
export const COUVREURS_BRETAGNE: FichePageLocale = {
  slug: "couvreurs-bretagne",
  metier: { id: "roofing", nom: "couvreur", nomPluriel: "couvreurs", lots: ["couverture", "zinguerie"] },
  region: {
    nom: "Bretagne",
    en: "en Bretagne",
    drapeau: "gwenn-ha-du",
    departements: [
      { code: "22", nom: "Côtes-d'Armor", dans: "dans les Côtes-d'Armor" },
      { code: "29", nom: "Finistère", dans: "dans le Finistère" },
      { code: "35", nom: "Ille-et-Vilaine", dans: "en Ille-et-Vilaine" },
      { code: "56", nom: "Morbihan", dans: "dans le Morbihan" },
    ],
  },
  seo: {
    titre: "Couvreurs de Bretagne : quantitatif et achats groupés · Mobiiz",
    description:
      "Couvreur en Bretagne ? Ton quantitatif sort de ton devis, part chez tes négoces, et tu achètes ardoise, crochets et zinc au prix des gros avec les couvreurs de ton département. Gratuit pour commencer.",
  },
  accroche: {
    kicker: "Couvreurs de Bretagne",
    titre: ["L’outil des couvreurs", "de Bretagne."],
    lead: "Ton quantitatif sort de ton devis en quelques instants. Il part chez tes négoces. Et avec les couvreurs de ton département, tu achètes au prix des gros.",
  },
  etapes: [
    { titre: "Dépose ton devis", texte: "Photo ou PDF. Mobiiz en tire ta liste de matériaux : ardoises, crochets, liteaux, zinc." },
    { titre: "Vérifie ta liste", texte: "Ce qui manque, Mobiiz te le demande, comme au comptoir. Tu corriges d’un geste." },
    { titre: "Envoie à tes négoces", texte: "Une seule demande, jusqu’à 5 négoces. Leurs réponses arrivent au même endroit." },
  ],
  collectif: {
    titre: "À plusieurs, au prix des gros.",
    texte:
      "Tes ardoises, tes crochets, ton zinc : mets ton besoin en commun avec les couvreurs de ton département. Les négoces chiffrent un vrai volume. Chacun garde sa livraison sur son chantier, et tu décides à la réception de l’offre.",
    note: "Publier et rejoindre un achat groupé, c’est gratuit. Aucun prix ni aucune économie n’est garanti : tout dépend des offres reçues.",
  },
  emblematique: {
    surtitre: "L’ardoise",
    titre: "Ici, les toits sont en ardoise.",
    paragraphes: [
      "En Bretagne, on couvre en ardoise naturelle. Et on la pose face au vent, à la pluie et, près de la côte, aux embruns : le format, le recouvrement, les crochets, tout compte.",
      "L’ardoise ne se tire plus en France : elle arrive chez ton négoce par palettes. C’est exactement le genre de commande qui se fait mieux à plusieurs.",
    ],
    points: [
      { titre: "Ardoise naturelle", texte: "Format, qualité : Mobiiz les reprend de ton devis et te demande ce qui manque." },
      { titre: "Pose au crochet", texte: "Crochets inox ou teintés : ils sortent de ton devis avec les ardoises." },
      { titre: "Zinc", texte: "Gouttières, rives, noues, faîtages : tu dis si tu façonnes, Mobiiz compte le reste." },
    ],
    photo: {
      src: "/regions/bretagne/toit-ardoise.webp",
      largeur: 1600,
      hauteur: 1200,
      alt: "Gros plan d'un toit en ardoise épaisse, son faîtage blanchi et son pignon de pierre, dans les monts d'Arrée",
      legende: "Toit d’ardoise et faîtage, Botmeur (Finistère)",
      credit: "Photo : Henri Moreau, CC BY-SA 3.0, redimensionnée",
      source: "https://commons.wikimedia.org/wiki/File:2010._Botmeur._Creisquer._Lignolet._D%C3%A9tail.JPG",
    },
  },
  histoire: {
    surtitre: "La petite histoire",
    titre: "Pourquoi l’ardoise ici, et pourquoi on la pose ainsi.",
    chapitres: [
      {
        titre: "Une pierre du pays",
        paragraphes: [
          {
            texte: "Le centre de la Bretagne repose sur des schistes ardoisiers : ceux du bassin de Châteaulin, jusqu’à Maël-Carhaix, datent du Carbonifère inférieur.",
            sources: ["ineris", "pref22-dossier"],
          },
          {
            texte: "Au XIXe siècle, l’ardoise s’est généralisée dans le Finistère, à la place d’une partie des toits de chaume. Dans le golfe du Morbihan, le chaume a reculé au début du XXe siècle, très souvent remplacé par l’ardoise.",
            sources: ["culture-volumetrie", "culture-chaume"],
          },
          {
            texte: "Au XXe siècle, Maël-Carhaix, dans les Côtes-d’Armor, a été le grand site ardoisier breton. Son ardoisière souterraine a fermé en 2000.",
            sources: ["ineris", "pref22-dossier", "pref22-enquete"],
          },
          {
            texte: "L’ardoise espagnole arrive sur le marché à partir de 1965 et précipite le déclin des ardoisières françaises. Depuis la fermeture de Trélazé, en Anjou, en 2014, la France ne produit plus d’ardoise : celle qu’on pose est importée.",
            sources: ["ad49", "pdl-inventaire", "ffb"],
          },
        ],
      },
      {
        titre: "Une pose qui tient au vent",
        paragraphes: [
          {
            texte: "Le littoral de la Manche et de l’Atlantique, jusqu’à Lorient, est classé dans la zone la plus sévère pour le vent et la pluie. Sur environ 5 km depuis la côte, sur les îles et les presqu’îles étroites, le site est dit « exposé » : le recouvrement y demande une étude particulière.",
            sources: ["guide-culture", "cupa-architecte"],
          },
          {
            texte: "C’est le recouvrement qui fait l’étanchéité. Il dépend de la région, de la pente, de la longueur du versant et de la fixation, et il donne le pureau, donc l’écartement des liteaux.",
            sources: ["guide-culture", "cupa-architecte"],
          },
          {
            texte: "On pose au clou, la méthode ancienne, ou au crochet, depuis la fin du XIXe siècle. La partie visible du crochet peut être teintée.",
            sources: ["guide-culture", "cupa-mh"],
          },
          {
            texte: "Près de la mer, l’inox du crochet compte : en front de mer, face aux embruns, seule une nuance au molybdène (type 316 Ti) convient, et l’inox à 17 % de chrome est déconseillé en bord de mer.",
            sources: ["frenehard", "bati-avenue"],
          },
          {
            texte: "Les règles de pose de l’ardoise naturelle sont celles du NF DTU 40.11, révisé en décembre 2020.",
            sources: ["ffb", "frenehard"],
          },
        ],
      },
    ],
  },
  ambiance: {
    titre: "La Bretagne des couvreurs",
    photos: [
      {
        src: "/regions/bretagne/maison-pierre-ardoise.webp",
        largeur: 1200,
        hauteur: 900,
        alt: "Maison rurale en pierre, toit à deux pans en ardoise épaisse",
        legende: "Maison de pierre et d’ardoise, Botmeur (Finistère)",
        credit: "Photo : Henri Moreau, CC BY-SA 4.0, redimensionnée",
        source: "https://commons.wikimedia.org/wiki/File:2010._Botmeur._Creisquer._Maison_%C3%A0_lignolet..JPG",
      },
      {
        src: "/regions/bretagne/maison-granit-brehat.webp",
        largeur: 1200,
        hauteur: 800,
        alt: "Grande bâtisse en pierre à toit d'ardoise, avec tourelle et lucarnes, sur l'île de Bréhat",
        legende: "Bâtisse en pierre et ardoise, Île-de-Bréhat (Côtes-d’Armor)",
        credit: "Photo : Gzen92, CC BY-SA 4.0, redimensionnée",
        source: "https://commons.wikimedia.org/wiki/File:Batisse_(%C3%8Ele-de-Br%C3%A9hat).jpg",
      },
      {
        src: "/regions/bretagne/littoral-brehat.webp",
        largeur: 1200,
        hauteur: 803,
        alt: "Rochers de granite rose et galets au bord de la mer, pointe du Paon à Bréhat",
        legende: "Pointe du Paon, Île-de-Bréhat (Côtes-d’Armor)",
        credit: "Photo : JLPC, CC BY-SA 3.0, redimensionnée",
        source: "https://commons.wikimedia.org/wiki/File:Br%C3%A9hat_granit_pr%C3%A8s_Paon.jpg",
      },
    ],
  },
  local: {
    surtitre: "Fait en Bretagne",
    titre: "Par un couvreur, pour les couvreurs.",
    texte:
      "Mobiiz est imaginé par un ancien couvreur, dans les Côtes-d’Armor. On commence par la Bretagne et par la couverture, parce que c’est notre métier et notre coin. Les négoces restent nos partenaires : des demandes claires, c’est du temps gagné pour tout le monde.",
  },
  questions: [
    {
      q: "Je peux garder mes négoces habituels ?",
      r: "Oui. Tu envoies ta demande à tes négoces, jusqu’à 5 par demande. Tu choisis ensuite celui que tu veux.",
    },
    {
      q: "Avec qui je suis regroupé ?",
      r: "Avec les couvreurs de ton département. Chacun garde sa livraison sur son chantier, et tu décides à la réception de l’offre.",
    },
    {
      q: "Est-ce que je dois obligatoirement commander ?",
      r: "Non. Tu n’es jamais obligé de commander : tu décides en voyant l’offre.",
    },
    {
      q: "Est-ce que je vais forcément payer moins cher ?",
      r: "Non, aucun prix ni niveau d’économie n’est garanti. Les négoces proposent des prix selon les volumes et les conditions de la demande.",
    },
    {
      q: "Est-ce que Mobiiz est gratuit ?",
      r: `${TARIFS.question.r} Le détail est sur la page Tarifs.`,
    },
  ],
  final: {
    titre: ["Ton prochain chantier", "commence ici."],
    texte: "Inscris-toi, dépose ton devis et consulte tes négoces. Les couvreurs de ton département sont là quand une commande s’y prête.",
  },
  sources: [
    { id: "ineris", titre: "Mise en sécurité de l’ardoisière de Maël-Carhaix (Côtes-d’Armor), rapport DRS-03-43500/R01, 2003", editeur: "INERIS pour la DRIRE Bretagne", url: "https://www.ineris.fr/sites/default/files/contribution/Documents/Mise%20en%20s%C3%A9curit%C3%A9%20de%20l%27Ardoisi%C3%A8re%20de%20Ma%C3%ABl-Carhaix%20%28C%C3%B4tes%20d%27Armor%29%20%28ID%202231396%29.pdf" },
    { id: "pref22-dossier", titre: "Demande d’autorisation environnementale, site du Moulin de la Lande, Maël-Carhaix (dossier 2016-791)", editeur: "Préfecture des Côtes-d’Armor", url: "https://www.cotes-darmor.gouv.fr/index.php/contenu/telechargement/36036/253870/file/2016-791-D-Demande.pdf" },
    { id: "pref22-enquete", titre: "Rapport et conclusions du commissaire enquêteur, Maël-Carhaix (2018)", editeur: "Préfecture des Côtes-d’Armor", url: "https://www.cotes-darmor.gouv.fr/index.php/contenu/telechargement/37059/260715/file/Rapport%20d%C3%A9finitif%20et%20conclusions%20Ma%C3%ABl-Carhaix.pdf" },
    { id: "culture-volumetrie", titre: "La volumétrie de toiture (fiche de conseil architectural, Finistère)", editeur: "Ministère de la Culture", url: "https://www.culture.gouv.fr/Media/Medias-creation-rapide/volumetrie_toiture.pdf" },
    { id: "culture-chaume", titre: "Les savoir-faire chaumiers dans le golfe du Morbihan et en Brière (inventaire du patrimoine immatériel)", editeur: "Ministère de la Culture", url: "https://www.culture.gouv.fr/Media/Medias-creation-rapide/Les-savoir-faire-chaumiers-dans-le-golfe-du-Morbihan-et-en-Briere.pdf" },
    { id: "pdl-inventaire", titre: "Le schiste ardoisier (dossier IA44005648, 2015)", editeur: "Région Pays de la Loire, Inventaire général du patrimoine culturel", url: "https://gertrude.paysdelaloire.fr/dossier/pdf/7176e6f9-51f2-4ca1-b3a7-2ba48ac9ba9e/le-schiste-ardoisier.pdf" },
    { id: "ad49", titre: "Fonds de la Société ardoisière de l’Anjou (124 J), répertoire", editeur: "Archives départementales de Maine-et-Loire", url: "https://archives.maine-et-loire.fr/fileadmin/actualites/frad049_0124j_ir_2023_v.pdf" },
    { id: "ffb", titre: "Les ardoises naturelles couvertes par un nouveau NF DTU", editeur: "Fédération française du bâtiment", url: "https://www.ffbatiment.fr/techniques-batiment/enveloppe-du-batiment/couverture/dossier-bam/nf-dtu-ardoise-naturelle" },
    { id: "guide-culture", titre: "Ouvrages de couverture : ardoises, guide de maîtrise d’ouvrage et de maîtrise d’œuvre (2011)", editeur: "Ministère de la Culture", url: "https://www.culture.gouv.fr/content/download/50134/file/GuideMoaMoe_Couverture_Ardoises_20110801.pdf" },
    { id: "cupa-architecte", titre: "Catalogue architecte (régions, sites, recouvrement)", editeur: "Cupa Pizarras (fabricant)", url: "https://www.cupapizarras.com/sites/default/files/catalogue_architecte.pdf" },
    { id: "cupa-mh", titre: "Gamme Monuments historiques et patrimoine", editeur: "Cupa Pizarras (fabricant)", url: "https://www.cupapizarras.com/pub/patrimoine-mh/gamme_monuments_historiques_patrimoine.pdf" },
    { id: "frenehard", titre: "Nouveau NF DTU 40.11 pour crochets d’ardoise (2020)", editeur: "Frénéhard (fabricant)", url: "https://medias.bigmat.fr/data_medias/medias_finaux/documents/3661044015305-G2cxbgH7t4.pdf" },
    { id: "bati-avenue", titre: "Fiche technique, crochet d’ardoise inox 17 % (réf. 760746)", editeur: "Bati Avenue (distributeur)", url: "https://www.bati-avenue.com/media/akeneo_connector/media_files/F/T/FT_D127760746_39d4.pdf" },
  ],
};
