#!/usr/bin/env python3
"""
Outil de RÉDACTION de la fiche plaquiste-isolation (aucun code de l'application ne le lit).

Il écrit `referentiel.json` au format exact du référentiel couverture (`referentiels/couverture/referentiel.json`),
pour que la fiche puisse être branchée plus tard par `loadReferential` sans retouche.

Chaque chiffre porte sa source (identifiant de `SOURCES`) et son état :
  - OK2(...)  : confirmé par deux sources indépendantes (dont un fabricant ou un DTU) ;
  - UNE(...)  : une seule source ;
  - DOUTE(...) : à confirmer, avec la raison ;
  - CONFLIT(...) : sources en désaccord, valeur retenue + le désaccord.
Toutes les valeurs restent « draft » dans le fichier : la règle Mobiiz veut qu'un chiffre hors référentiel du fondateur
reste à confirmer tant qu'un plaquiste ne l'a pas relu (§47.1 : la ligne sort orange « Quantité à confirmer »).
L'état de recherche (2 sources, 1 source, à confirmer, contradiction) est écrit dans la note de vérification.

Lancer : python3 outils/generer_referentiel.py   (depuis referentiels/plaquiste-isolation)
"""
import json
import os

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "referentiel.json")
VERSION = "plaquiste-isolation-2026.11.20-1"
TRADE = "drywall"
DATE = "2026-11-19"

# Compteur des chiffres par état (pour le compte rendu).
COMPTE = {"2 sources": 0, "1 source": 0, "à confirmer": 0, "contradiction": 0, "définition": 0}


def _verif(etat, note):
    COMPTE[etat] += 1
    return {"status": "draft", "note": f"Recherche du {DATE} — {etat} : {note}"}


def OK2(note):
    return ("2 sources", note, None)


def UNE(note):
    return ("1 source", note, None)


def DOUTE(note):
    return ("à confirmer", note, None)


def CONFLIT(note, desaccord):
    return ("contradiction", note, desaccord)


def prov(source, etat):
    e, note, conflit = etat
    p = {"source": source, "verification": _verif(e, note), "version": 1}
    if conflit:
        p["conflict"] = conflit
    return p


def fact(kind, value, unit, source, etat, note=None, label=None):
    f = {**prov(source, etat), "kind": kind, "value": str(value), "unit": unit}
    if note:
        f["note"] = note
    if label:
        f["label"] = label
    return f


def regle(value, unit, source, etat, note=None, label=None):
    return fact("installation_condition", value, unit, source, etat, note, label)


DEFINITION = {"source": "definition", "verification": {"status": "verified", "verifiedAt": DATE, "verifiedBy": "Mobiiz (définition)"}, "version": 1}


def un(value, unit):
    COMPTE["définition"] += 1
    return {**DEFINITION, "kind": "packaging", "value": str(value), "unit": unit}


# ---------------------------------------------------------------------------------------------------------------
# SOURCES (chaque identifiant renvoie à recherche/0x-*.md, où l'URL, la date du document et la page sont notées)
# ---------------------------------------------------------------------------------------------------------------
SOURCES = [
    {"id": "definition", "kind": "definition", "title": "Définitions (1 pièce = 1 pièce)", "retrievedAt": DATE},
    {"id": "mobiiz-geometrie", "kind": "baticlair_rule", "title": "Géométrie Mobiiz : longueur d'ouvrage = surface ÷ hauteur ; une plaque couvre 1,20 m × la hauteur ; arrondi à l'unité de vente", "retrievedAt": DATE, "note": "Règle de calcul, à faire valider par un plaquiste (fiche plaquiste-isolation, section Règles de calcul)."},
    {"id": "snip-fc18", "kind": "manufacturer", "title": "SNIP, fiche conseil n° 18 « Ouvrages en plaques de plâtre : quantitatifs estimés de produits » (déc. 2024, PDF du 13/02/2025)", "publisher": "SNIP (syndicat des fabricants : Placo, Knauf, Siniat…)", "url": "https://www.lesindustriesduplatre.org/wp-content/uploads/2025/03/SNIP-FICHE-CONSEIL-18-VERSIONS-2025_V6-13fevrier.pdf", "retrievedAt": DATE, "note": "Hypothèses du document : 5 % de chutes comprises, vis des rails comptées, cloison 4 m × 2,50-2,70 m, plafond 8 × 10 m. recherche/02, section D."},
    {"id": "dtu-2541-2022", "kind": "standard", "title": "NF DTU 25.41 (février 2022) : hauteurs limites des cloisons et contre-cloisons, tableaux repris par Rockwool (guide cloisons 12/2023, guide murs 07/2024) et la CAPEB", "documentRef": "NF DTU 25.41 P1-1, février 2022 (texte AFNOR non recopié)", "url": "https://www.rockwool.com/siteassets/rw-f/telechargements/guides-de-pose-et-mise-en-oeuvre/cloisons/rockwool_mise_en_oeuvre_isolation_des_cloisons.pdf", "retrievedAt": DATE, "note": "recherche/03, sections 1.0, 1.1, 4.2."},
    {"id": "capeb-dtu-2541", "kind": "standard", "title": "CAPEB, guide « NF DTU 25.41 — Les principales nouveautés 2022 »", "url": "https://www.capeb.fr/www/capeb/media//morbihan/document/2022_Guide%20DTU%2025-41_DEF_HD_WEB.pdf", "retrievedAt": DATE},
    {"id": "siniat-carnet-cloison", "kind": "manufacturer", "title": "Siniat, carnet de pose DTU « Comment réaliser une cloison en plaques de plâtre ? »", "url": "https://www.siniat.fr/fr-fr/siniatheque/carnet-de-pose-dtu/comment-realiser-une-cloison-en-plaques-de-platre/", "retrievedAt": DATE},
    {"id": "siniat-d7248", "kind": "manufacturer", "title": "Siniat, fiche système Cloison Prégymétal D72/48 EI30 37 dB M48-35 (02/09/2026)", "url": "https://www.siniat.fr/-/print2pdf/system/pi79832/siniat-fiche-technique/fr-fr/cloison-pregymetal-d72-48-ei30-37db-m48-35-isolant.pdf", "retrievedAt": DATE},
    {"id": "placo-solution-7248", "kind": "manufacturer", "title": "Placo, fiche solution Cloison Placostil 72/48 BA13 EI30 39 dB 2,6 m (quantités pour 1 m²)", "url": "https://www.reseau-proeco-energies.fr/files/membres/dossier_technique/Cloison-Placostil-R-72-48-Placoplatre-R-BA13-EI-30-39dB-2-6m.pdf", "retrievedAt": DATE},
    {"id": "placo-integrale-plafonds-2023", "kind": "manufacturer", "title": "Placo, L'Intégrale Placo Second Œuvre 04/2023, chapitre Plafonds", "url": "https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf", "retrievedAt": DATE},
    {"id": "pladur-2019", "kind": "manufacturer", "title": "Pladur, fiches systèmes cloisons distributives parement simple et double 1 200 mm (rév. 03/2019) et Mémento 2017", "url": "https://entreprise.pladur.com/siteassets/page-assets/interactive-selector/cloisons-dist-parements-simples-1200.pdf", "retrievedAt": DATE, "note": "Antérieur au DTU 2022 : sert de seconde source pour les quantités, jamais seul pour une hauteur."},
    {"id": "placo-m48", "kind": "manufacturer", "title": "Placo, fiche produit Montant Stil M 48 (MAJ 18/12/2023)", "url": "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_376584.pdf", "retrievedAt": DATE},
    {"id": "placo-r48", "kind": "manufacturer", "title": "Placo, fiche produit Rail Stil R 48 (MAJ 18/12/2023)", "url": "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_7972.pdf", "retrievedAt": DATE},
    {"id": "placo-f530", "kind": "manufacturer", "title": "Placo, fiche produit Fourrure Stil F 530 (MAJ 18/12/2023)", "url": "https://www.materiaux-naturels.fr/doc/product/n_1965.pdf", "retrievedAt": DATE},
    {"id": "placo-rail-f530", "kind": "manufacturer", "title": "Placo, fiche produit Rail Stil F 530 (MAJ 18/12/2023) : 2,35 m, botte de 20", "url": "https://www.materiaux-naturels.fr/doc/product/n_1967.pdf", "retrievedAt": DATE},
    {"id": "placo-eclisse", "kind": "manufacturer", "title": "Placo, fiche produit Éclisse Stil F 530 (MAJ 18/12/2023)", "url": "https://www.materiaux-naturels.fr/doc/product/n_1968.pdf", "retrievedAt": DATE},
    {"id": "placo-suspentes", "kind": "manufacturer", "title": "Placo, fiches suspentes Stil F 530 (longue 171, sécable)", "url": "https://www.placo.fr/documents/fiche-technique/fichetechnique-suspente-longue-stil-f-530.pdf", "retrievedAt": DATE, "note": "Lue par extrait de moteur (placo.fr répond 403), recoupée par négoces : recherche/02 A.1, recherche/06."},
    {"id": "placo-cr2", "kind": "manufacturer", "title": "Placo, fiche Cornière Stil CR2 (3,00 m)", "url": "https://www.placo.fr/documents/fiche-produit/ficheproduit-cornire-stil-cr2.pdf", "retrievedAt": DATE, "note": "Extrait de moteur ; Bricomarché recoupe 3 m."},
    {"id": "isover-optima2", "kind": "manufacturer", "title": "Isover, appuis intermédiaires Optima2 (boîtes de 50, 40 pour 75-160)", "url": "https://www.bricomarche.com/", "retrievedAt": DATE, "note": "Conditionnement relevé chez Bricomarché, Leroy Merlin, Brico Dépôt, recoupé par Easyfix : recherche/02 A.1 et 03 4.3."},
    {"id": "gypso-vis", "kind": "retailer", "title": "Gypso / Chausson et Klimas : gamme et conditionnement des vis TTPC", "url": "https://www.chausson.fr/", "retrievedAt": DATE, "note": "recherche/02 C.1, C.3."},
    {"id": "spit-pulsa", "kind": "manufacturer", "title": "Spit, fiche cloueur Pulsa 40P+ et clous C6 (boîtes de 500 + 1 gaz)", "url": "https://www.spit.fr/", "retrievedAt": DATE, "note": "recherche/02 C.4."},
    {"id": "brico-depot-chevilles", "kind": "retailer", "title": "Brico Dépôt, chevilles à frapper 6 × 40 (sachet de 50, seau de 800)", "url": "https://www.bricodepot.fr/", "retrievedAt": DATE},
    {"id": "placo-integrale-2023-bande", "kind": "manufacturer", "title": "Placo, L'Intégrale 04/2023 et brochure doublage 2017 : bande 1,40 ml/m², enduit 0,33 (poudre) / 0,47 (pâte) kg/m² de parement", "url": "https://www.chausson.fr/media/article-document/241621", "retrievedAt": DATE, "note": "recherche/05 A.2, B.4."},
    {"id": "siniat-finition", "kind": "manufacturer", "title": "Siniat, catalogue Finition 2021/2022 (enduits, MAP, bandes, palettes)", "url": "https://media.siniat.fr/pi187452/original/541110939/catalogue-finition.pdf", "retrievedAt": DATE, "note": "Dernière édition PDF trouvée : à revérifier."},
    {"id": "placo-pr4", "kind": "manufacturer", "title": "Placo, fiche produit Placojoint PR4 25 kg (MAJ 02/04/2026)", "url": "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_74570.pdf", "retrievedAt": DATE},
    {"id": "placo-map", "kind": "manufacturer", "title": "Placo, fiche produit MAP Formule + 25 kg (MAJ 28/05/2025)", "url": "https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250198821-XFYvn3ucwY.pdf", "retrievedAt": DATE},
    {"id": "placo-ba13", "kind": "manufacturer", "title": "Placo, fiche produit Placoplatre BA 13 (18/12/2023) : longueurs, pile de 50 (40 en 3,20 / 3,60 m)", "url": "https://www.placo.fr/", "retrievedAt": DATE, "note": "Fiche lue via un négoce (recherche/01, source S1)."},
    {"id": "siniat-pregyplac", "kind": "manufacturer", "title": "Siniat, fiche Prégyplac Std BA13 (01/09/2026)", "url": "https://www.siniat.fr/", "retrievedAt": DATE, "note": "recherche/01, source S2."},
    {"id": "negoces-plaques", "kind": "retailer", "title": "Négoces (Chausson, Gedimat, BigMat, Samse, Quéguiner, Tout Faire) : unités de vente relevées", "url": "https://www.chausson.fr/", "retrievedAt": DATE, "note": "recherche/06 (89 lignes, 2 à 5 négoces par article)."},
]

# ---------------------------------------------------------------------------------------------------------------
# FAMILLES
# ---------------------------------------------------------------------------------------------------------------
def fam(code, label, need, keywords, attributes=None, consumable=False, key=None):
    f = {"code": code, "label": label, "needUnit": need, "attributes": attributes or [], "keyAttributes": key or [], "keywords": keywords}
    if consumable:
        f["consumable"] = True
    return f


FAMILIES = [
    # Ouvrages (la ligne du devis est une mesure)
    fam("partition", "Cloison sur ossature métallique", "m2", ["cloison", "72/48", "98/48", "100/70", "120/70", "140/90", "distribution", "placostil"]),
    fam("separating_partition", "Cloison séparative (SAA, SAD)", "m2", ["separative", "saa", "sad", "ossature alternee", "ossature double"]),
    fam("glued_lining", "Doublage collé (complexe plaque + isolant)", "m2", ["doublage colle", "doublage", "complexe", "placomur", "doublissimo", "pregytherm", "polyplac", "calibel"]),
    fam("furring_lining", "Doublage sur fourrures et appuis", "m2", ["optima", "appuis", "doublage sur ossature", "doublage fourrures"]),
    fam("stud_lining", "Contre-cloison sur montants", "m2", ["contre-cloison", "contre cloison", "doublage autoportant", "doublage sur montants"]),
    fam("ceiling", "Plafond sur fourrures et suspentes", "m2", ["plafond", "faux plafond", "plafond suspendu", "f530", "rampant"]),
    fam("joint_work", "Traitement des joints", "m2", ["bandes et enduit", "jointement", "traitement des joints"]),
    # Articles
    fam("plasterboard", "Plaque de plâtre", "u", ["plaque", "ba13", "ba15", "ba18", "placo", "placoplatre", "pregyplac"], [{"key": "largeur", "label": "Largeur", "unit": "m"}], key=["largeur"]),
    fam("lining_board", "Complexe de doublage", "u", ["complexe", "doublage", "10+80", "13+100"], [{"key": "largeur", "label": "Largeur", "unit": "m"}]),
    fam("rail", "Rail", "ml", ["rail", "r48", "r70", "r90"]),
    fam("stud", "Montant", "u", ["montant", "m48", "m70", "m90"]),
    fam("furring", "Fourrure", "ml", ["fourrure", "f530", "f47"]),
    fam("furring_rail", "Rail F 530 (lisse de doublage)", "ml", ["rail f530", "lisse"]),
    fam("perimeter_angle", "Cornière de rive", "ml", ["corniere de rive", "cr2"]),
    fam("hanger", "Suspente", "u", ["suspente", "pivot"]),
    fam("bracket", "Appui intermédiaire", "u", ["appui", "optima"]),
    fam("splice", "Éclisse de fourrure", "u", ["eclisse"]),
    fam("screw_board", "Vis à plaque (TTPC)", "u", ["vis ttpc", "ttpc", "vis placo"], consumable=True),
    fam("screw_metal", "Vis métal-métal (TRPF)", "u", ["trpf", "vis metal"], consumable=True),
    fam("anchor", "Fixation au support (clou, cheville)", "u", ["cheville", "clou", "cloueur"], consumable=True),
    fam("joint_tape", "Bande à joint", "ml", ["bande", "bande a joint"], consumable=True),
    fam("joint_compound", "Enduit à joint", "kg", ["enduit", "placojoint", "placomix", "pregylys"], consumable=True),
    fam("adhesive_mortar", "Mortier adhésif (MAP)", "kg", ["map", "mortier adhesif", "colle"]),
    fam("insulation", "Isolant en rouleau ou panneau", "m2", ["laine", "isolant", "laine de verre", "laine de roche", "gr32"]),
]

# ---------------------------------------------------------------------------------------------------------------
# PRODUITS génériques (le comptoir sert la marque qu'il tient : « ou équivalent »)
# ---------------------------------------------------------------------------------------------------------------
def piece(one="pièce", many="pièces"):
    return [{"id": "piece", "label": {"one": one, "many": many}, "contains": un(1, "u"), "primary": True}]


def produit(id, family, label, short, units, aliases=None, attributes=None, note=None):
    p = {"id": id, "family": family, "label": label, "shortLabel": short, "aliases": aliases or [], "generic": True, "attributes": attributes or {}, "sellingUnits": units}
    if note:
        p["note"] = note
    return p


def unite(id, one, many, value, unit, source, etat, primary=True):
    u = {"id": id, "label": {"one": one, "many": many}, "contains": fact("packaging", value, unit, source, etat)}
    if primary:
        u["primary"] = True
    return u


PRODUCTS = [
    produit("plaque-ba13", "plasterboard", "Plaque de plâtre BA13 1,20 m (ou équivalent)", "Plaques BA13", piece("plaque", "plaques"),
            ["ba13", "plaque ba13", "placo ba13"],
            {"largeur": fact("manufacturer_spec", "1.20", "m", "placo-ba13", OK2("1,20 m : Placo BA13 (18/12/2023) et Siniat Prégyplac (01/09/2026), recherche/01 §1.1."))}),
    produit("complexe-doublage", "lining_board", "Complexe de doublage 1,20 m, plaque + isolant (type écrit au devis)", "Complexes de doublage", piece("panneau", "panneaux"),
            ["complexe de doublage", "doublage isolant"],
            {"largeur": fact("manufacturer_spec", "1.20", "m", "placo-ba13", OK2("1,20 m partout : Doublissimo, Placomur (Placo), Calibel (Isover), Prégytherm (Siniat), Polyplac (Knauf), recherche/01 §8."))}),
    produit("rail-48", "rail", "Rail R48 (ou équivalent), longueur 3,00 m", "Rails R48",
            [unite("longueur", "longueur de 3 m", "longueurs de 3 m", "3", "m", "placo-r48", OK2("3,00 m : fiche Placo R 48 (18/12/2023) et Point.P / Dispano ; pas de rail de 4 m chez Placo. Botte de 10 (info), recherche/02 A.1."))],
            ["rail 48", "r48", "rail r48"]),
    produit("rail-70", "rail", "Rail R70 (ou équivalent), longueur 3,00 m", "Rails R70",
            [unite("longueur", "longueur de 3 m", "longueurs de 3 m", "3", "m", "negoces-plaques", OK2("R 70, R 90, R 100 en 3,00 m : Point.P, BigMat, SFIC et placo.fr (extrait), recherche/02 A.1."))],
            ["rail 70", "r70"]),
    produit("montant-48", "stud", "Montant M48 (ou équivalent)", "Montants M48", piece("montant", "montants"), ["montant 48", "m48"]),
    produit("montant-70", "stud", "Montant M70 (ou équivalent)", "Montants M70", piece("montant", "montants"), ["montant 70", "m70"]),
    produit("fourrure-f530", "furring", "Fourrure F 530 (ou équivalent), longueur 3,00 m", "Fourrures F530",
            [unite("longueur", "longueur de 3 m", "longueurs de 3 m", "3", "m", "placo-f530", OK2("3,00 m (et 5,30 m) : fiche Placo F 530 (18/12/2023) et Chausson ; pas de 4 m chez Placo ; Knauf F47 : 2,70 / 3,00 / 5,30, recherche/02 A.1-A.2."))],
            ["fourrure", "f530", "f 530", "f47"]),
    produit("rail-f530", "furring_rail", "Rail F 530 (ou équivalent), longueur 2,35 m", "Rails F530",
            [unite("longueur", "longueur de 2,35 m", "longueurs de 2,35 m", "2.35", "m", "placo-rail-f530", UNE("2,35 m, botte de 20 : fiche Placo Rail F 530 (18/12/2023) ; l'ancienne piste interne disait 3 m (faux)."))],
            ["rail f530", "rail f 530"]),
    produit("corniere-cr2", "perimeter_angle", "Cornière de rive CR2 (ou équivalent), longueur 3,00 m", "Cornières de rive",
            [unite("longueur", "longueur de 3 m", "longueurs de 3 m", "3", "m", "placo-cr2", OK2("3,00 m : fiche Placo CR2 (extrait) et Bricomarché ; botte de 30 : 1 source."))],
            ["corniere", "cr2", "corniere de rive"]),
    produit("suspente-longue", "hanger", "Suspente longue 171 pour fourrure F 530 (ou équivalent), plénum 20 à 150 mm", "Suspentes longues",
            [unite("boite", "boîte de 100", "boîtes de 100", "100", "u", "placo-suspentes", OK2("Boîte de 100 : fiche Placo (MAJ 31/03/2026, extrait) et ManoMano / négoces, recherche/02 A.1."))],
            ["suspente", "suspente longue", "suspente 171"]),
    produit("suspente-secable", "hanger", "Suspente sécable pour fourrure F 530 (ou équivalent), plénum 80 à 580 mm", "Suspentes sécables",
            [unite("boite", "boîte de 50", "boîtes de 50", "50", "u", "placo-suspentes", DOUTE("Boîte de 50 : piste interne seulement ; à confirmer en négoce (recherche/02 A.1)."))],
            ["suspente secable"]),
    produit("eclisse-f530", "splice", "Éclisse pour fourrure F 530 (ou équivalent)", "Éclisses",
            [unite("boite", "boîte de 50", "boîtes de 50", "50", "u", "placo-eclisse", UNE("Boîte de 50 : fiche Placo Éclisse F 530 (18/12/2023)."))],
            ["eclisse"]),
    produit("appui-optima", "bracket", "Appui intermédiaire de doublage (Optima2 ou équivalent)", "Appuis intermédiaires",
            [unite("boite", "boîte de 50", "boîtes de 50", "50", "u", "isover-optima2", OK2("Boîte de 50 (40 pour le 75-160) : Bricomarché, Leroy Merlin, Brico Dépôt, recoupé Easyfix (recherche/02 A.1)."))],
            ["appui", "appuis", "optima", "appui intermediaire"]),
    produit("vis-ttpc-25", "screw_board", "Vis TTPC 25 (3,5 × 25) pour plaque sur ossature métallique", "Vis TTPC 25",
            [unite("boite", "boîte de 1000", "boîtes de 1000", "1000", "u", "gypso-vis", OK2("Boîte de 1000 : Gypso / Chausson et Klimas ; Placo vend en boîtes de 500 et 1500 (recherche/02 C.3, recherche/06)."))],
            ["ttpc 25", "vis 25", "vis placo 25"]),
    produit("vis-ttpc-35", "screw_board", "Vis TTPC 35 (3,5 × 35) pour plaque sur ossature métallique", "Vis TTPC 35",
            [unite("boite", "boîte de 1000", "boîtes de 1000", "1000", "u", "gypso-vis", OK2("Boîte de 1000 : Gypso / Chausson et Klimas (recherche/02 C.3)."))],
            ["ttpc 35", "vis 35"]),
    produit("vis-trpf-13", "screw_metal", "Vis TRPF 13 métal-métal (rail / montant)", "Vis TRPF 13",
            [unite("boite", "boîte de 500", "boîtes de 500", "500", "u", "gypso-vis", CONFLIT("Boîte de 500 (Placo, GSB) retenue.", "Klimas vend la TEX 3,5 × 9,5 en boîte de 1000 : le conditionnement dépend de la marque (recherche/02 C.3)."))],
            ["trpf", "vis trpf", "vis metal metal"]),
    produit("clous-gaz-beton", "anchor", "Clous pour cloueur à gaz, béton, 20 mm (boîte de 500 avec 1 cartouche de gaz ; marque du cloueur à préciser)", "Clous + gaz béton",
            [unite("boite", "boîte de 500 avec gaz", "boîtes de 500 avec gaz", "500", "u", "spit-pulsa", UNE("Spit C6 : boîte de 500 clous + 1 cartouche, ou 1500 + 3 ; Hilti non vérifié (recherche/02 C.4). Longueur 20 mm pour un rail sur béton : usage, à confirmer."))],
            ["clous", "cloueur", "clou gaz"]),
    produit("cheville-frapper", "anchor", "Chevilles à frapper 6 × 40 (sachet de 50)", "Chevilles 6 × 40",
            [unite("sachet", "sachet de 50", "sachets de 50", "50", "u", "brico-depot-chevilles", OK2("Sachet de 50 et seau de 800 : Brico Dépôt, Fischer (recherche/02 C.4)."))],
            ["cheville", "cheville a frapper", "clou cheville"]),
    produit("bande-papier", "joint_tape", "Bande à joint papier micro-perforée 50 mm, rouleau de 150 m", "Bande à joint",
            [unite("rouleau", "rouleau de 150 m", "rouleaux de 150 m", "150", "m", "placo-integrale-2023-bande", OK2("150 m × 50 mm : Placo (Bricomarché, Intégrale 2023) ; Siniat 150 m × 51 mm (catalogue Finition) ; recherche/05 A.1."))],
            ["bande", "bande a joint", "bande papier"]),
    produit("enduit-poudre", "joint_compound", "Enduit à joint en poudre (type Placojoint PR4 ou équivalent), sac de 25 kg", "Enduit poudre",
            [unite("sac", "sac de 25 kg", "sacs de 25 kg", "25", "kg", "placo-pr4", OK2("Sac de 25 kg : fiche Placo PR4 (02/04/2026), Castorama / Point.P ; Siniat Prégylys 25 kg (recherche/05 B.1)."))],
            ["enduit poudre", "placojoint", "pr4", "pregylys"]),
    produit("enduit-pate", "joint_compound", "Enduit à joint prêt à l'emploi (type Placomix ou équivalent), seau de 25 kg", "Enduit prêt à l'emploi",
            [unite("seau", "seau de 25 kg", "seaux de 25 kg", "25", "kg", "placo-integrale-2023-bande", CONFLIT("Seau de 25 kg retenu (Placomix classique 25 kg, Siniat Prégy S 25 kg).", "Placomix Pro est en seau de 22 kg, le Pro Allégé en 17 kg, Siniat Prégy S aussi en 7 kg : le seau dépend de la marque (recherche/05 B.2)."))],
            ["enduit pret a l'emploi", "placomix", "enduit pate", "pregy s"]),
    produit("map-25", "adhesive_mortar", "Mortier adhésif pour doublage (MAP Formule + ou équivalent), sac de 25 kg", "Mortier adhésif MAP",
            [unite("sac", "sac de 25 kg", "sacs de 25 kg", "25", "kg", "placo-map", OK2("Sac de 25 kg : fiche Placo MAP Formule + (28/05/2025), Castorama ; Siniat Prégycolle 120 et Knauf Mak 3 aussi en 25 kg (recherche/05 C)."))],
            ["map", "mortier adhesif", "map formule", "pregycolle", "mak 3"]),
    produit("laine-cloison-45", "insulation", "Laine minérale 45 mm pour cloison (panneau semi-rigide ou rouleau)", "Laine 45 mm",
            [unite("m2", "m²", "m²", "1", "m2", "definition", ("1 source", "Conditionnement au colis à lire sur la fiche du produit choisi : voir recherche/04.", None))],
            ["laine 45", "gr32 45", "isolant cloison"],
            note="Placeholder : conditionnement réel ajouté avec la recherche isolants."),
]

# ---------------------------------------------------------------------------------------------------------------
# PARAMÈTRES COMMUNS
# ---------------------------------------------------------------------------------------------------------------
HAUTEUR = {
    "key": "hauteur", "label": "Hauteur sous plafond", "unit": "m", "kind": "site_data",
    "question": "Hauteur sous plafond ?",
    "hint": "Elle choisit la longueur des plaques et des montants.",
    "textLabels": ["hauteur", "hsp", "h ="],
    "textRange": {"min": "1.5", "max": "6"},
    "choices": [{"label": "2,50 m", "value": "2.5"}, {"label": "2,60 m", "value": "2.6"}, {"label": "2,70 m", "value": "2.7"}, {"label": "2,80 m", "value": "2.8"}, {"label": "3,00 m", "value": "3"}],
}

ENDUIT = {
    "key": "enduit_forme", "label": "Enduit à joint", "unit": "u", "kind": "artisan_preference",
    "question": "Ton enduit à joint : en poudre (sac) ou prêt à l'emploi (seau) ?",
    "choices": [{"label": "En poudre", "value": "1", "dit": ["poudre", "sac", "en sac"]}, {"label": "Prêt à l'emploi", "value": "2", "dit": ["pret a l'emploi", "pate", "seau", "tout pret"]}],
    "display": {"1": "en poudre", "2": "prêt à l'emploi"},
    "textValues": [{"value": "2", "keywords": ["pret a l'emploi", "placomix", "pate"]}, {"value": "1", "keywords": ["poudre", "placojoint", "pr4"]}],
}

FIXATION_RAIL = {
    "key": "fixation_rail", "label": "Fixation des rails", "unit": "u", "kind": "artisan_preference",
    "question": "Tes rails au sol et au plafond, tu les fixes comment ?",
    "choices": [{"label": "Cloueur à gaz", "value": "1", "dit": ["cloueur", "gaz", "pistolet"]}, {"label": "Chevilles à frapper", "value": "2", "dit": ["cheville", "chevilles", "frapper"]}],
    "display": {"1": "cloueur à gaz", "2": "chevilles à frapper"},
}

TYPE_PLAQUE = {
    "key": "type_plaque", "label": "Type de plaque", "unit": "u", "kind": "site_data",
    "question": "Quelles plaques : standard, hydro, feu, phonique ou haute dureté ?",
    "named": True,
    "choices": [{"label": "Standard", "value": "1"}, {"label": "Hydro (H1)", "value": "2"}, {"label": "Feu", "value": "3"}, {"label": "Phonique", "value": "4"}, {"label": "Haute dureté", "value": "5"}],
    "display": {"1": "standard", "2": "hydro H1", "3": "feu", "4": "phonique", "5": "haute dureté"},
    "textValues": [
        {"value": "2", "keywords": ["hydro", "h1", "placomarine", "pregydro", "salle de bain", "salle d'eau", "verte"]},
        {"value": "3", "keywords": ["feu", "placoflam", "pregyflam", "ei 30", "ei30", "ei 60", "ei60"]},
        {"value": "4", "keywords": ["phonique", "acoustique", "placo phonique"]},
        {"value": "5", "keywords": ["haute durete", "habito", "diamant", "placodur"]},
    ],
    "default": {**prov("negoces-plaques", OK2("Plaque standard quand le devis ne dit rien : c'est l'article courant du comptoir (recherche/01 §9, recherche/06).")), "value": "1", "note": "plaque standard, par défaut"},
}


def surface(label, q):
    return {"key": "surface", "label": label, "unit": "m2", "kind": "site_data", "question": q, "fromLineQuantity": True}


# Longueur de plaque : la plus petite longueur courante ≥ hauteur − 1 cm (jeu en pied, Siniat ; longueurs Placo BA13).
LONGUEUR_PLAQUE = "si(hauteur <= regle.l250, regle.l250, si(hauteur <= regle.l260, regle.l260, si(hauteur <= regle.l270, regle.l270, si(hauteur <= regle.l280, regle.l280, si(hauteur <= regle.l300, regle.l300, si(hauteur <= regle.l320, regle.l320, regle.l360))))))"
# Longueur de montant Placo : 2,49 / 2,59 / 2,69 / 2,79 / 2,99 / 3,19 / 3,59 / 3,99 (= hauteur − 1 cm).
LONGUEUR_MONTANT = "si(hauteur <= regle.l250, regle.m249, si(hauteur <= regle.l260, regle.m259, si(hauteur <= regle.l270, regle.m269, si(hauteur <= regle.l280, regle.m279, si(hauteur <= regle.l300, regle.m299, si(hauteur <= regle.l320, regle.m319, si(hauteur <= regle.l360, regle.m359, regle.m399)))))))"


def longueurs():
    ok_plaque = OK2("Longueurs BA13 2,50 / 2,60 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 m : Placo (18/12/2023) et Siniat (01/09/2026), recherche/01 §1.1 ; plaque coupée 1 cm plus courte que la hauteur (Siniat, carnet cloison).")
    ok_montant = OK2("Longueurs Placo Stil M 48 2,49 / 2,59 / 2,69 / 2,79 / 2,99 / 3,19 / 3,59 / 3,99 m : fiche Placo (18/12/2023) et Chausson / SFIC / Point.P (recherche/02 A.1). Marques négoce : 2,50 / 3,00 m.")
    c = {}
    for k, v in [("l250", "2.51"), ("l260", "2.61"), ("l270", "2.71"), ("l280", "2.81"), ("l300", "3.01"), ("l320", "3.21"), ("l360", "3.61")]:
        pass
    # Seuils : une hauteur jusqu'à L + 1 cm se fait avec une plaque de L (plaque coupée à hauteur − 1 cm).
    for k, seuil, val in [("l250", "2.51", "2.5"), ("l260", "2.61", "2.6"), ("l270", "2.71", "2.7"), ("l280", "2.81", "2.8"), ("l300", "3.01", "3"), ("l320", "3.21", "3.2"), ("l360", "3.61", "3.6")]:
        c[k] = regle(seuil, "m", "placo-ba13", ok_plaque, f"Jusqu'à {seuil.replace('.', ',')} m de hauteur : plaque de {val.replace('.', ',')} m.")
    for k, val in [("m249", "2.49"), ("m259", "2.59"), ("m269", "2.69"), ("m279", "2.79"), ("m299", "2.99"), ("m319", "3.19"), ("m359", "3.59"), ("m399", "3.99")]:
        c[k] = regle(val, "m", "placo-m48", ok_montant)
    return c


def finitions_constantes(parements):
    """Bande et enduit par m² d'ouvrage : `parements` faces jointoyées."""
    return {
        "bande_par_m2": regle(str(round(1.40 * parements, 2)), "ml/m2", "placo-integrale-2023-bande", OK2(f"1,40 ml par m² de parement (Placo Intégrale 04/2023 et brochure doublage 2017 ; fiche solution 72/48 : 2,80 pour deux faces) × {parements} face(s). Siniat dit 1,1 (joints entre plaques seulement) : Placo retenu, plus prudent."), label="{v} de bande par m²"),
        "enduit_poudre_par_m2": regle(str(round(0.33 * parements, 2)), "kg/m2", "placo-pr4", OK2(f"0,33 kg/m² de parement : fiche Placo PR4 (02/04/2026) et Intégrale 2023 ; Siniat 0,30-0,35 × {parements} face(s)."), label="{v} d'enduit poudre par m²"),
        "enduit_pate_par_m2": regle(str(round(0.47 * parements, 2)), "kg/m2", "placo-integrale-2023-bande", CONFLIT(f"0,47 kg/m² de parement : Intégrale Placo 2023 et brochure 2017 × {parements} face(s).", "La fiche Placomix Pro dit 0,525 kg/m², Siniat Prégy S 0,45 : selon le produit (recherche/05 B.2)."), label="{v} d'enduit prêt à l'emploi par m²"),
    }


def besoins_finitions(base):
    return [
        {"id": "bande", "slot": "bande", "formula": f"{base} * regle.bande_par_m2", "unit": "ml", "core": False, "short": "bande", "precision": "joints jointoyés avec bande", **prov("placo-integrale-2023-bande", OK2("Formule : m² × ratio Placo."))},
        {"id": "enduit-poudre", "slot": "enduit", "formula": f"{base} * regle.enduit_poudre_par_m2", "unit": "kg", "core": False, "when": "enduit_forme < 2", "short": "enduit poudre", **prov("placo-pr4", OK2("Formule : m² × ratio Placo."))},
        {"id": "enduit-pate", "slot": "enduit_pate", "formula": f"{base} * regle.enduit_pate_par_m2", "unit": "kg", "core": False, "when": "enduit_forme >= 2", "short": "enduit prêt à l'emploi", **prov("placo-integrale-2023-bande", OK2("Formule : m² × ratio Placo."))},
    ]


def slots_finitions():
    return [
        {"key": "bande", "family": "joint_tape", "label": "Bande à joint", "keywords": ["bande"], "suggested": {"label": "Bande à joint (si tu fais les joints)"}, "usual": {"text": "Bande papier, rouleau de 150 m.", "source": "placo-integrale-2023-bande", "productId": "bande-papier"}},
        {"key": "enduit", "family": "joint_compound", "label": "Enduit à joint", "keywords": ["enduit"], "suggested": {"label": "Enduit à joint (si tu fais les joints)"}, "usual": {"text": "Enduit poudre, sac de 25 kg.", "source": "placo-pr4", "productId": "enduit-poudre"}},
        {"key": "enduit_pate", "family": "joint_compound", "label": "Enduit à joint prêt à l'emploi", "keywords": ["pret a l'emploi", "placomix"], "formOf": "enduit", "usual": {"text": "Enduit prêt à l'emploi, seau de 25 kg.", "source": "placo-integrale-2023-bande", "productId": "enduit-pate"}},
    ]


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 1 : CLOISON DISTRIBUTIVE SUR OSSATURE (72/48, 98/48, 100/70, 120/70, 140/90)
# ---------------------------------------------------------------------------------------------------------------
def cloison():
    hauteurs_ok = OK2("NF DTU 25.41 (fév. 2022) via Rockwool 12/2023, recoupé par la fiche Siniat D72/48 (02/09/2026) et Pladur : 72/48 en M48-35, 2,50 m (simples 0,60) / 2,75 (simples 0,40) / 3,05 (doublés 0,60) / 3,40 (doublés 0,40) ; 98/48 : 3,00 / 3,40 / 3,70 / 4,15 (recherche/03 §1.1).")
    c = {
        **longueurs(),
        "faces": regle("2", "u", "mobiiz-geometrie", OK2("Une cloison a deux faces (définition du système 72/48 : une BA13 par face ; 98/48 : deux)."), label="{v} faces"),
        "chute_plaques": regle("1.05", "u", "snip-fc18", OK2("5 % de chutes sur les plaques : SNIP fiche 18 (2,10 m²/m² en 72/48) et Pladur (« coefficient de perte de 5 % »), recherche/03 §1.3."), label="plaques + {v}"),
        "largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaque de 1,20 m (Placo, Siniat).")),
        "chute_ossature": regle("1.05", "u", "snip-fc18", OK2("5 % sur l'ossature : SNIP fiche 18 (rails 0,84 ml/m² = 2 ÷ 2,50 × 1,05 ; montants 2,10 ml/m²) et Pladur (0,84 ml/m² à 2,50 m)."), label="ossature + {v}"),
        "rails_par_cloison": regle("2", "u", "snip-fc18", OK2("Un rail en bas, un en haut (SNIP fiche 18 ; Siniat carnet cloison)."), label="{v} rails (haut et bas)"),
        "pas_fixation_rail": regle("0.60", "m", "siniat-carnet-cloison", OK2("Rails fixés tous les 60 cm au plus : Siniat carnet cloison et Placo Intégrale 2023 (nouveauté DTU 25.41)."), label="une fixation tous les {v}"),
        # Seuils de hauteur NF DTU 25.41 2022, M48-35
        "h_7248_s60": regle("2.50", "m", "dtu-2541-2022", hauteurs_ok), "h_7248_s40": regle("2.75", "m", "dtu-2541-2022", hauteurs_ok),
        "h_7248_d60": regle("3.05", "m", "dtu-2541-2022", hauteurs_ok), "h_7248_d40": regle("3.40", "m", "dtu-2541-2022", hauteurs_ok),
        "h_9848_s60": regle("3.00", "m", "dtu-2541-2022", hauteurs_ok), "h_9848_s40": regle("3.40", "m", "dtu-2541-2022", hauteurs_ok),
        "h_9848_d60": regle("3.70", "m", "dtu-2541-2022", CONFLIT("3,70 m retenu (valeur la plus basse).", "Rockwool (DTU 2022) 3,70 ; Siniat carnet et Pladur 3,75.")),
        "h_m70_s60": regle("3.90", "m", "dtu-2541-2022", OK2("120/70 (2 BA13, M70-40) : 3,90 m en simples 0,60 (Rockwool DTU 2022, Siniat 3,85, Pladur 3,85).")),
        # Vis (SNIP fiche 18, déc. 2024 : vis des rails comprises)
        "vis_1p_s60": regle("30", "u/m2", "snip-fc18", CONFLIT("30 vis/m² (SNIP fiche 18, déc. 2024 : vis à 30 cm sur montants + 5 vis/ml sur les rails).", "Placo (fiche solution 72/48) dit 22 sans les vis de rail ; Pladur 41 ; Gypso 25. SNIP retenu, document de la profession le plus récent."), label="{v} vis par m²"),
        "vis_1p_s40": regle("37", "u/m2", "snip-fc18", UNE("SNIP fiche 18 : 37 vis/m² à 0,40 (Placo ancien : 30)."), label="{v} vis par m²"),
        "vis_1p_d60": regle("35", "u/m2", "snip-fc18", UNE("SNIP fiche 18, montants doublés 0,60."), label="{v} vis par m²"),
        "vis_1p_d40": regle("47", "u/m2", "snip-fc18", UNE("SNIP fiche 18, montants doublés 0,40."), label="{v} vis par m²"),
        "vis_int_s60": regle("10", "u/m2", "snip-fc18", UNE("SNIP fiche 18, 98/48 : 1re peau vissée à 60 cm, TTPC 25."), label="{v} vis 1re peau par m²"),
        "vis_int_s40": regle("14", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 1re peau par m²"),
        "vis_int_d60": regle("13", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 1re peau par m²"),
        "vis_int_d40": regle("18", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 1re peau par m²"),
        "vis_ext_s60": regle("27", "u/m2", "snip-fc18", UNE("SNIP fiche 18, 98/48 : 2e peau, TTPC 35 (2 × 12,5 mm + 10 mm)."), label="{v} vis 2e peau par m²"),
        "vis_ext_s40": regle("34", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 2e peau par m²"),
        "vis_ext_d60": regle("32", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 2e peau par m²"),
        "vis_ext_d40": regle("42", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 2e peau par m²"),
        "trpf_s60": regle("2", "u/m2", "snip-fc18", OK2("2 TRPF/m² (montant sur rail, haut et bas) : SNIP fiche 18 et Placo fiche solution 72/48."), label="{v} vis TRPF par m²"),
        "trpf_s40": regle("3", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis TRPF par m²"),
        "trpf_d60": regle("5", "u/m2", "snip-fc18", CONFLIT("5 TRPF/m² (SNIP).", "Placo compte aussi l'assemblage des montants doublés : 6."), label="{v} vis TRPF par m²"),
        "trpf_d40": regle("7", "u/m2", "snip-fc18", CONFLIT("7 TRPF/m² (SNIP).", "Placo : 10."), label="{v} vis TRPF par m²"),
        "isolant_par_m2": regle("1.05", "u", "snip-fc18", OK2("1,05 m² d'isolant par m² : SNIP fiche 18 et Placo fiche solution 72/48."), label="isolant + 5 %"),
        **finitions_constantes(2),
    }
    montage_note = "Hauteurs limites NF DTU 25.41 (février 2022), montant M48-35 courant : on prend le montage le moins cher qui tient la hauteur (simples 0,40 avant doublés 0,60)."
    params = [
        surface("Surface de cloison (une face)", "Surface de cloison ?"),
        HAUTEUR,
        {"key": "couches", "label": "Plaques par face", "unit": "u", "kind": "site_data", "question": "Une ou deux plaques par face ?",
         "choices": [{"label": "Une (72/48)", "value": "1"}, {"label": "Deux (98/48)", "value": "2"}],
         "display": {"1": "1 plaque par face", "2": "2 plaques par face"},
         "textValues": [{"value": "2", "keywords": ["98/48", "98 / 48", "120/70", "140/90", "150/100", "2 ba13", "2xba13", "2 x ba13", "parement double", "double peau"]},
                        {"value": "1", "keywords": ["72/48", "72 / 48", "100/70", "1 ba13", "parement simple"]}]},
        {"key": "montant", "label": "Largeur du montant", "unit": "mm", "kind": "site_data", "question": "Montants de 48 ou de 70 ?",
         "choices": [{"label": "48", "value": "48"}, {"label": "70", "value": "70"}],
         "textValues": [{"value": "70", "keywords": ["100/70", "120/70", "m70", "r70"]}, {"value": "48", "keywords": ["72/48", "98/48", "m48", "r48"]}],
         "default": {**prov("dtu-2541-2022", OK2("Le 48 est le montant des cloisons de logement (72/48, 98/48) : DTU, Placo, Siniat.")), "value": "48", "note": "montant de 48, par défaut"}},
        {"key": "montage", "label": "Montage des montants", "unit": "u", "kind": "site_data", "question": "Tes montants : simples à 60 cm, simples à 40 cm, ou doublés ?",
         "hint": "Au-delà de 2,50 m, une 72/48 ne tient plus en montants simples à 60 cm (DTU 25.41).",
         "choices": [{"label": "Simples à 60 cm", "value": "1"}, {"label": "Simples à 40 cm", "value": "2"}, {"label": "Doublés à 60 cm", "value": "3"}, {"label": "Doublés à 40 cm", "value": "4"}],
         "display": {"1": "montants simples à 60 cm", "2": "montants simples à 40 cm", "3": "montants doublés à 60 cm", "4": "montants doublés à 40 cm"},
         "textValues": [{"value": "2", "keywords": ["entraxe 40", "entraxe 0,40", "a 40 cm", "e=40"]}, {"value": "3", "keywords": ["montants doubles", "doubles"]}],
         "default": {**prov("dtu-2541-2022", hauteurs_ok), "formula": "si(montant > 60, 1, si(couches < 2, si(hauteur <= regle.h_7248_s60, 1, si(hauteur <= regle.h_7248_s40, 2, si(hauteur <= regle.h_7248_d60, 3, 4))), si(hauteur <= regle.h_9848_s60, 1, si(hauteur <= regle.h_9848_s40, 2, si(hauteur <= regle.h_9848_d60, 3, 4)))))", "note": montage_note}},
        TYPE_PLAQUE, ENDUIT, FIXATION_RAIL,
    ]
    derived = [
        {"key": "longueur_cloison", "label": "Longueur de cloison", "unit": "m", "formula": "surface / hauteur", "shown": True, **prov("mobiiz-geometrie", OK2("Longueur = surface ÷ hauteur : SNIP et Pladur calculent les rails ainsi (0,84 ml/m² à 2,50 m)."))},
        {"key": "longueur_plaque", "label": "Longueur des plaques", "unit": "m", "formula": LONGUEUR_PLAQUE, "shown": True, **prov("placo-ba13", OK2("Plus petite longueur vendue ≥ hauteur − 1 cm."))},
        {"key": "longueur_montant", "label": "Longueur des montants", "unit": "m", "formula": LONGUEUR_MONTANT, "shown": True, **prov("placo-m48", OK2("Montant = hauteur − 1 cm, longueurs Placo en 9."))},
        {"key": "entraxe", "label": "Entraxe des montants", "unit": "m", "formula": "si(montage < 2, 0.60, si(montage < 3, 0.40, si(montage < 4, 0.60, 0.40))) * 1", "shown": False, **prov("dtu-2541-2022", OK2("Entraxe 0,60 ou 0,40 m (DTU 25.41, Siniat, SNIP)."))},
        {"key": "doubles", "label": "Montants doublés", "unit": "u", "formula": "si(montage < 3, 1, 2)", "shown": False, **prov("dtu-2541-2022", OK2("Montants doublés = deux montants dos à dos."))},
    ]
    vis_ttpc = "si(couches < 2, si(montage < 2, regle.vis_1p_s60, si(montage < 3, regle.vis_1p_s40, si(montage < 4, regle.vis_1p_d60, regle.vis_1p_d40))), si(montage < 2, regle.vis_int_s60, si(montage < 3, regle.vis_int_s40, si(montage < 4, regle.vis_int_d60, regle.vis_int_d40))))"
    vis_ext = "si(montage < 2, regle.vis_ext_s60, si(montage < 3, regle.vis_ext_s40, si(montage < 4, regle.vis_ext_d60, regle.vis_ext_d40)))"
    trpf = "si(montage < 2, regle.trpf_s60, si(montage < 3, regle.trpf_s40, si(montage < 4, regle.trpf_d60, regle.trpf_d40)))"
    needs = [
        {"id": "plaques", "slot": "plaque", "formula": "arrondi_sup(longueur_cloison * regle.faces * couches * regle.chute_plaques / regle.largeur_plaque)", "unit": "u", "core": True,
         "designation": "Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}", "precision": "{couches} sur {longueur_cloison|m} de cloison, hauteur {hauteur|m}",
         "exclusions": "Vides de portes non déduits (le devis vend la surface pleine) ; hors huisseries.", **prov("snip-fc18", OK2("Plaques = 2 faces × plaques par face × 1,05 (SNIP 2,10 m²/m² ; Pladur 2,1 ; Placo 2,10)."))},
        {"id": "montants", "slot": "montant", "formula": "arrondi_sup((arrondi_sup(longueur_cloison / entraxe) + 1) * doubles * regle.chute_ossature)", "unit": "u", "core": True,
         "designation": "Montants M{montant|mm#} longueur {longueur_montant|m}", "precision": "{montage}", "short": "montants",
         "exclusions": "Hors montants d'huisserie et d'angle (Placo les compte dans ses 2,10 ml/m²) : à ajouter par porte.", **prov("snip-fc18", CONFLIT("Un montant par entraxe + 1, × 1,05 ; soit ≈ 1,75 ml/m² à 0,60 (Pladur).", "SNIP et Placo comptent 2,10 ml/m² : ils incluent montants de départ, d'about et d'huisserie. À trancher par un plaquiste."))},
        {"id": "rails", "slot": "rail", "formula": "longueur_cloison * regle.rails_par_cloison * regle.chute_ossature", "unit": "ml", "core": True, "precision": "rails haut et bas", "short": "rails",
         **prov("snip-fc18", OK2("2 × longueur × 1,05 : SNIP (0,84 ml/m² à 2,50 m) et Pladur (0,84 / 0,75 / 0,70 selon la hauteur)."))},
        {"id": "vis-ttpc-25", "slot": "vis", "formula": f"surface * {vis_ttpc}", "unit": "u", "core": True, "short": "vis TTPC 25", **prov("snip-fc18", UNE("Ratio SNIP par montage."))},
        {"id": "vis-ttpc-35", "slot": "vis_ext", "formula": f"surface * {vis_ext}", "unit": "u", "core": True, "when": "couches >= 2", "short": "vis TTPC 35", "precision": "2e peau", **prov("snip-fc18", UNE("Ratio SNIP, parement double."))},
        {"id": "vis-trpf", "slot": "trpf", "formula": f"surface * {trpf}", "unit": "u", "core": True, "short": "vis TRPF", **prov("snip-fc18", UNE("Ratio SNIP."))},
        {"id": "fixations-clous", "slot": "fixation", "formula": "arrondi_sup(longueur_cloison * regle.rails_par_cloison * regle.chute_ossature / regle.pas_fixation_rail)", "unit": "u", "core": True, "when": "fixation_rail < 2", "short": "fixations de rail",
         "precision": "une fixation tous les 60 cm de rail", **prov("siniat-carnet-cloison", DOUTE("Pas de 60 cm confirmé (Siniat, Placo) ; la fixation en bout de chaque rail n'est chiffrée par aucune source lue."))},
        {"id": "fixations-chevilles", "slot": "fixation_cheville", "formula": "arrondi_sup(longueur_cloison * regle.rails_par_cloison * regle.chute_ossature / regle.pas_fixation_rail)", "unit": "u", "core": True, "when": "fixation_rail >= 2", "short": "chevilles de rail",
         "precision": "une cheville tous les 60 cm de rail", **prov("siniat-carnet-cloison", DOUTE("Idem fixations au cloueur."))},
        {"id": "isolant", "slot": "isolant", "formula": "surface * regle.isolant_par_m2", "unit": "m2", "core": False, "short": "isolant", **prov("snip-fc18", OK2("1,05 m²/m² : SNIP et Placo."))},
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "cloison", "family": "partition", "label": "Cloison", "measureOnly": True},
        {"key": "plaque", "family": "plasterboard", "label": "Plaques", "formOf": "cloison", "keywords": ["plaque", "ba13"], "usual": {"text": "BA13 1,20 m, longueur selon la hauteur.", "source": "placo-ba13", "productId": "plaque-ba13"}},
        {"key": "rail", "family": "rail", "label": "Rails", "formOf": "cloison", "keywords": ["rail"], "usual": {"text": "Rails de la largeur des montants, longueurs de 3 m.", "source": "placo-r48", "productId": "rail-48"}},
        {"key": "montant", "family": "stud", "label": "Montants", "formOf": "cloison", "keywords": ["montant"], "usual": {"text": "Montants M48, longueur = hauteur − 1 cm.", "source": "placo-m48", "productId": "montant-48"}},
        {"key": "vis", "family": "screw_board", "label": "Vis TTPC 25", "formOf": "cloison", "keywords": ["ttpc 25", "vis 25"], "usual": {"text": "TTPC 25 pour une BA13 sur métal (épaisseur + 10 mm).", "source": "gypso-vis", "productId": "vis-ttpc-25"}},
        {"key": "vis_ext", "family": "screw_board", "label": "Vis TTPC 35", "formOf": "cloison", "keywords": ["ttpc 35", "vis 35"], "usual": {"text": "TTPC 35 pour la 2e peau (2 × 12,5 mm + 10 mm).", "source": "gypso-vis", "productId": "vis-ttpc-35"}},
        {"key": "trpf", "family": "screw_metal", "label": "Vis TRPF", "formOf": "cloison", "keywords": ["trpf"], "usual": {"text": "TRPF 13, montant sur rail.", "source": "snip-fc18", "productId": "vis-trpf-13"}},
        {"key": "fixation", "family": "anchor", "label": "Clous de fixation des rails", "formOf": "cloison", "keywords": ["clou", "cloueur"], "usual": {"text": "Clous pour cloueur à gaz, béton.", "source": "spit-pulsa", "productId": "clous-gaz-beton"}},
        {"key": "fixation_cheville", "family": "anchor", "label": "Chevilles de fixation des rails", "formOf": "cloison", "keywords": ["cheville"], "usual": {"text": "Chevilles à frapper 6 × 40.", "source": "brico-depot-chevilles", "productId": "cheville-frapper"}},
        {"key": "isolant", "family": "insulation", "label": "Isolant de cloison", "keywords": ["laine", "isolant", "gr32"], "usual": {"text": "Laine minérale 45 mm (épaisseur admise en M48 : 30 à 45 mm, DTU via Rockwool).", "source": "dtu-2541-2022", "productId": "laine-cloison-45"}},
        *slots_finitions(),
    ]
    return {"id": "cloison-distributive", "trade": TRADE, "section": "principal", "label": "Cloison sur ossature métallique (72/48, 98/48, 100/70, 120/70…)",
            "triggers": ["partition"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


def referentiel():
    work_items = [cloison()]
    return {
        "id": "plaquiste-isolation",
        "version": VERSION,
        "writtenOnly": True,
        "withoutSupplyUnits": ["h", "hr", "hrs", "heure", "heures", "j", "jour", "jours", "journee", "journees", "fft", "ft", "forfait", "forfaits"],
        "trade": TRADE,
        "sources": SOURCES,
        "families": FAMILIES,
        "products": PRODUCTS,
        "workItems": work_items,
        "wasteRules": [],
        "countedWorks": [],
    }


if __name__ == "__main__":
    ref = referentiel()
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(ref, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("écrit", SORTIE, "—", len(ref["workItems"]), "ouvrages,", len(ref["products"]), "produits")
    print("chiffres :", COMPTE)
