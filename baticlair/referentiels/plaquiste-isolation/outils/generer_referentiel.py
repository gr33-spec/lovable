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
VERSION = "plaquiste-isolation-2026.11.20-4"
TRADE = "drywall"
DATE = "2026-11-19"

# Compteur des chiffres par état (pour le compte rendu).
COMPTE = {"validé Greg": 0, "2 sources": 0, "1 source": 0, "à confirmer": 0, "contradiction": 0, "définition": 0}


def _verif(etat, note):
    COMPTE[etat] += 1
    if etat == "validé Greg":
        return {"status": "verified", "verifiedAt": "2026-11-20", "verifiedBy": "Greg Roy (fondateur), réponses du 20 novembre 2026", "note": note}
    return {"status": "draft", "note": f"Recherche du {DATE} — {etat} : {note}"}


def GREG(note):
    """Décision du fondateur (20 novembre 2026) : valeur vérifiée (comme la couverture)."""
    return ("validé Greg", note, None)


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


SOURCES += [
    {"id": "greg-decisions", "kind": "trade_practice", "title": "Réponses de Greg Roy (fondateur), 20 novembre 2026 : montants de porte, vis de doublage, suspentes, 98/48 en 3,75 m, coupe-feu d'une seule marque, coffrages", "documentRef": "FICHE.md §16", "retrievedAt": "2026-11-20"},
    {"id": "rockwool-murs-2024", "kind": "standard", "title": "NF DTU 25.41 (fév. 2022) : hauteurs des contre-cloisons, tableau repris par Rockwool (guide murs par l'intérieur 07/2024)", "url": "https://www.rockwool.com/syssiteassets/rw-f/telechargements/guides-de-pose-et-mise-en-oeuvre/murs-isolation-par-l-interieur/rockwool_mise_en_oeuvre_rockmur_nu_murs_par_interieur.pdf", "retrievedAt": DATE, "note": "recherche/03 §4.2-4.3."},
    {"id": "siniat-pregycolle", "kind": "manufacturer", "title": "Siniat, fiche produit Prégycolle 120 (01/09/2026) : 1,8 kg/m², 10 plots de 10 cm par m²", "url": "https://www.siniat.fr/-/print2pdf/product/pi174132/siniat-fiche-produit/fr-fr.pdf", "retrievedAt": DATE},
    {"id": "acermi-gr32", "kind": "standard", "title": "ACERMI, certificats 02/018/100 (GR 32 Roulé Revêtu Kraft) et 02/018/098/27 (GR 32 Nu), 16/05/2025", "url": "https://acermi.com/en/certified-insulation-products/certificate/02-018-098-27/", "retrievedAt": DATE},
    {"id": "isover-gr32-roule", "kind": "manufacturer", "title": "Isover, fiche GR 32 Roulé Revêtu Kraft (MAJ 24/04/2026)", "url": "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_79476.pdf", "retrievedAt": DATE},
    {"id": "isover-gr32-nu", "kind": "manufacturer", "title": "Isover, fiche GR 32 Nu (copie Chausson, non datée)", "url": "https://www.chausson.fr/media/article-document/211141", "retrievedAt": DATE},
    {"id": "isover-isoconfort35", "kind": "manufacturer", "title": "Isover, fiche Isoconfort 35 Revêtu Kraft (MAJ 24/03/2026) et ACERMI 05/018/408/35", "url": "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1554173.pdf", "retrievedAt": DATE},
    {"id": "isover-ibr", "kind": "manufacturer", "title": "Isover, IBR Revêtu Kraft (fiche 23/04/2026 en extrait) et ACERMI 02/018/052/29", "url": "https://acermi.com/en/certified-insulation-products/certificate/02-018-052-29/", "retrievedAt": DATE},
    {"id": "acermi-soufflage", "kind": "standard", "title": "ACERMI, certificats des isolants à souffler : Comblissimo 07/D/018/474/28, Supafil Loft 045 04/D/016/378/27, Jetrock 2 17/D/015/1195/5, Thermacell Cristal 22/D/141/1569/5, Igloo 12/D/157/784/23", "url": "https://www.acermi.com/en/certified-insulation-products/certificate/07-d-018-474-28", "retrievedAt": DATE, "note": "Le nombre de sacs pour 100 m² se lit sur le certificat du produit (recherche/04 B1)."},
    {"id": "isover-comblissimo", "kind": "manufacturer", "title": "Isover, fiche Comblissimo (MAJ 24/04/2026) : sac 17,3 kg, R 10 en 465 mm", "url": "https://www.isover.fr/", "retrievedAt": DATE, "note": "recherche/04 B1, source S42."},
    {"id": "isover-vario", "kind": "manufacturer", "title": "Isover, notice membrane Vario Xtra (rouleau 1,50 × 40 m) et adhésif Vario KB1 (60 mm × 40 m)", "url": "https://uploads.gedimat.fr/DOCUMENT/TYPE2/0000225966312.pdf", "retrievedAt": DATE},
    {"id": "gedimat-vario", "kind": "retailer", "title": "Gedimat, membrane Vario Xtra 60 m² et adhésif Vario KB1 40 m", "url": "https://www.gedimat.fr/adhesif-vario-kb1-rouleau-de-40mx60mm-isover,1867391,3,21,961.htm", "retrievedAt": DATE},
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


FAMILIES += [
    fam("blown_insulation_work", "Isolation des combles perdus par soufflage", "m2", ["soufflage", "laine soufflee", "combles perdus", "vrac", "ouate"]),
    fam("loose_fill", "Isolant en vrac à souffler", "u", ["comblissimo", "supafil", "jetrock", "ouate", "thermacell", "igloo"]),
    fam("vapour_barrier", "Membrane pare-vapeur", "m2", ["pare-vapeur", "pare vapeur", "membrane", "vario", "frein vapeur"]),
    fam("vb_tape", "Adhésif de membrane", "ml", ["adhesif", "kb1", "multitape"], consumable=True),
    fam("boxing", "Coffrage, soffite, caisson", "ml", ["coffrage", "soffite", "caisson", "habillage de poutre", "encoffrement", "ipn"]),
    fam("corner_tape", "Bande armée d'angle", "ml", ["bande armee", "bande d'angle"], consumable=True),
    fam("hanger_anchor", "Fixation des suspentes au support", "u", ["cheville metal", "clou cheville"], consumable=True),
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
            [unite("longueur", "longueur de 2,35 m", "longueurs de 2,35 m", "2.35", "m", "placo-rail-f530", OK2("2,35 m : fiche Placo Rail F 530 (18/12/2023) et Bricomarché (même code-barres) ; botte de 20 : Placo seul, sans effet sur une commande à la longueur (recherche/10 n° 1)."))],
            ["rail f530", "rail f 530"]),
    produit("corniere-cr2", "perimeter_angle", "Cornière de rive CR2 (ou équivalent), longueur 3,00 m", "Cornières de rive",
            [unite("longueur", "longueur de 3 m", "longueurs de 3 m", "3", "m", "placo-cr2", OK2("3,00 m : fiche Placo CR2 (extrait) et Bricomarché ; botte de 30 : 1 source."))],
            ["corniere", "cr2", "corniere de rive"]),
    produit("suspente-longue", "hanger", "Suspente longue 171 pour fourrure F 530 (ou équivalent), plénum 20 à 150 mm", "Suspentes longues 171 (plénum 20 à 150 mm)",
            [unite("boite", "boîte de 100", "boîtes de 100", "100", "u", "placo-suspentes", OK2("Boîte de 100 : fiche Placo (MAJ 31/03/2026, extrait) et ManoMano / négoces, recherche/02 A.1."))],
            ["suspente", "suspente longue", "suspente 171"]),
    produit("suspente-secable", "hanger", "Suspente sécable pour fourrure F 530 (ou équivalent), plénum 80 à 580 mm", "Suspentes sécables (plénum 80 à 580 mm)",
            [unite("boite", "boîte de 50", "boîtes de 50", "50", "u", "placo-suspentes", OK2("Boîte de 50 : fiches Placo suspente sécable et pivot via Samse / BigMat (recherche/02b) et piste interne."))],
            ["suspente secable"]),
    produit("eclisse-f530", "splice", "Éclisse pour fourrure F 530 (ou équivalent)", "Éclisses",
            [unite("boite", "boîte de 50", "boîtes de 50", "50", "u", "placo-eclisse", OK2("Boîte de 50 : fiche Placo Éclisse F 530 et éclisse universelle Gypso. Attention : l'« Éclisse 50 Stil F 530 » est une autre pièce (500 mm, botte de 10) (recherche/10 n° 2)."))],
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
            [unite("boite", "boîte de 500", "boîtes de 500", "500", "u", "gypso-vis", OK2("Boîte de 500 : Placo et Gypso ; la boîte de 1000 n'existe qu'en marque négoce (Samse, Klimas) (recherche/10 n° 27)."))],
            ["trpf", "vis trpf", "vis metal metal"]),
    produit("clous-gaz-beton", "anchor", "Clous pour cloueur à gaz avec cartouche de gaz (type et longueur selon le support : béton C6 20 mm, bois CW6 ; marque du cloueur à préciser)", "Clous + gaz béton",
            [unite("boite", "boîte de 500 avec gaz", "boîtes de 500 avec gaz", "500", "u", "spit-pulsa", OK2("Boîte de 500 clous + 1 cartouche : Spit et Paslode (même gamme) ; clou de 20 mm pour rail sur béton confirmé ; Hilti : 1 200 clous, gaz à part. Rail sur plancher bois : aucun clou de cloueur à gaz publié (recherche/10 n° 3)."))],
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
            [unite("seau", "seau de 25 kg", "seaux de 25 kg", "25", "kg", "placo-integrale-2023-bande", OK2("Seau de 25 kg : Placo (format en stock), Siniat, Toupret, Planodis. Les 22 et 17 kg sont d'autres produits (Placomix PRO et PRO Allégé) (recherche/10 n° 28)."))],
            ["enduit pret a l'emploi", "placomix", "enduit pate", "pregy s"]),
    produit("map-25", "adhesive_mortar", "Mortier adhésif pour doublage (MAP Formule + ou équivalent), sac de 25 kg", "Mortier adhésif MAP",
            [unite("sac", "sac de 25 kg", "sacs de 25 kg", "25", "kg", "placo-map", OK2("Sac de 25 kg : fiche Placo MAP Formule + (28/05/2025), Castorama ; Siniat Prégycolle 120 et Knauf Mak 3 aussi en 25 kg (recherche/05 C)."))],
            ["map", "mortier adhesif", "map formule", "pregycolle", "mak 3"]),
    produit("laine-cloison-45", "insulation", "Laine minérale 45 mm pour cloison (panneau semi-rigide ou rouleau)", "Laine 45 mm",
            [unite("m2", "m²", "m²", "1", "m2", "definition", ("1 source", "Conditionnement au colis à lire sur la fiche du produit choisi : voir recherche/04.", None))],
            ["laine 45", "gr32 45", "isolant cloison"],
            note="Placeholder : conditionnement réel ajouté avec la recherche isolants."),
]


def isolant(id, label, short, m2, source, etat, aliases):
    return produit(id, "insulation", label, short, [unite("colis", f"colis de {str(m2).replace('.', ',')} m²", f"colis de {str(m2).replace('.', ',')} m²", str(m2), "m2", source, etat)], aliases)


PRODUCTS = [p for p in PRODUCTS if p["id"] != "laine-cloison-45"] + [
    isolant("ursa-prk32-45", "URSA PRK 32 45 mm, R 1,40, panneaux 1,35 × 0,60 m (colis de 13 = 10,53 m²) ou équivalent", "Laine 45 mm (PRK 32)", 10.53, "acermi-gr32", OK2("R 1,40 et format 1,35 × 0,60 : fiche URSA et certificat ACERMI (recherche/04 A3, A5). Remplace le GR 32 Nu 45, retiré de la fiche Isover du 24/03/2026 (recherche/15)."), ["laine 45", "laine de verre 45", "prk 32 45", "gr32 45", "gr 32 45", "isoconfort 32 45"]),
    isolant("gr32-roule-100", "Isover GR 32 Roulé Revêtu Kraft 100 mm, R 3,15, rouleau 2,70 × 1,20 m (3,24 m²) ou équivalent", "GR 32 kraft 100", 3.24, "isover-gr32-roule", OK2("3,24 m² : fiche Isover 24/04/2026 et 13/05/2024 ; Brico Dépôt 2,7 × 1,2 m."), ["gr32 100", "gr 32 100", "laine de verre 100"]),
    isolant("gr32-roule-120", "Isover GR 32 Roulé Revêtu Kraft 120 mm, R 3,75, rouleau 2,70 × 1,20 m (3,24 m²) ou équivalent", "GR 32 kraft 120", 3.24, "isover-gr32-roule", OK2("3,24 m² : fiches Isover 2026 et 2024 ; Bricomarché."), ["gr32 120", "gr 32 120", "laine de verre 120"]),
    isolant("gr32-roule-140", "Isover GR 32 Roulé Revêtu Kraft 140 mm, R 4,35, rouleau 2,70 × 1,20 m (3,24 m²) ou équivalent", "GR 32 kraft 140", 3.24, "isover-gr32-roule", OK2("3,24 m² : fiches Isover 2026 et 2024."), ["gr32 140", "gr 32 140"]),
    isolant("gr32-roule-160", "Isover GR 32 Roulé Revêtu Kraft 160 mm, R 5,00, rouleau 2,70 × 1,20 m (3,24 m²) ou équivalent", "GR 32 kraft 160", 3.24, "isover-gr32-roule", OK2("3,24 m² : fiches Isover 2026 et 2024."), ["gr32 160", "gr 32 160"]),
    isolant("isoconfort35-200", "Isover Isoconfort 35 Revêtu Kraft 200 mm, R 5,70, rouleau 3,00 × 1,20 m (3,60 m²) ou équivalent", "Isoconfort 35 200", 3.60, "isover-isoconfort35", OK2("3,60 m² : fiche Isover 24/03/2026 et fiche gamme ancienne (réf. 85093)."), ["isoconfort 200", "isoconfort 35 200"]),
    isolant("isoconfort35-220", "Isover Isoconfort 35 Revêtu Kraft 220 mm, R 6,25, rouleau 2,80 × 1,20 m (3,36 m²) ou équivalent", "Isoconfort 35 220", 3.36, "isover-isoconfort35", OK2("3,36 m² : fiche Isover 24/03/2026, Brico Dépôt, Castorama ; l'ancien 2,10 m était l'Isoconfort 35 « voile » de 2014 (recherche/10 n° 4)."), ["isoconfort 220", "isoconfort 35 220"]),
    isolant("isoconfort35-240", "Isover Isoconfort 35 Revêtu Kraft 240 mm, R 6,85, rouleau 2,60 × 1,20 m (3,12 m²) ou équivalent", "Isoconfort 35 240", 3.12, "isover-isoconfort35", OK2("3,12 m² : fiche Isover 2026, Brico Dépôt, Castorama (recherche/10 n° 5)."), ["isoconfort 240", "isoconfort 35 240"]),
    isolant("ibr-100", "Isover IBR Revêtu Kraft 100 mm, R 2,50, rouleau 8,0 × 1,20 m (9,60 m²) ou équivalent", "IBR 100", 9.60, "isover-ibr", OK2("9,60 m² : Point.P et Tessella ; R ACERMI."), ["ibr 100"]),
    isolant("ibr-200", "Isover IBR Revêtu Kraft 200 mm, R 5,00, rouleau 4,5 × 1,20 m (5,40 m²) ou équivalent", "IBR 200", 5.40, "isover-ibr", OK2("5,40 m² : Isover, Castorama, Leroy Merlin (recherche/10 n° 55)."), ["ibr 200"]),
    isolant("ibr-300", "Isover IBR Revêtu Kraft 300 mm, R 7,50, rouleau 2,6 × 1,20 m (3,12 m²) ou équivalent", "IBR 300", 3.12, "isover-ibr", OK2("3,12 m² : SFIC et Tessella ; fiche Isover 2017."), ["ibr 300"]),
    isolant("ibr-400", "Isover IBR Revêtu Kraft 400 mm, R 10, rouleau 2,0 × 1,20 m (2,40 m²) ou équivalent", "IBR 400", 2.40, "isover-ibr", OK2("2,40 m² : fiche Isover (extrait) et Brico Dépôt."), ["ibr 400"]),
    produit("bande-armee", "corner_tape", "Bande armée d'angle 50 mm (deux lames acier), rouleau de 30 m", "Bande armée",
            [unite("rouleau", "rouleau de 30 m", "rouleaux de 30 m", "30", "m", "placo-integrale-2023-bande", OK2("Rouleau de 30 m : Siniat (catalogue Finition) et Placo Bande Armée 50 (fiche, BigMat) (recherche/05 A.1)."))], ["bande armee", "bande d'angle"]),
    produit("vrac-souffle", "loose_fill", "Isolant en vrac à souffler (produit et poids du sac selon le certificat)", "Isolant à souffler", piece("sac", "sacs"), ["laine a souffler", "laine soufflee", "ouate"]),
    produit("vario-xtra", "vapour_barrier", "Membrane pare-vapeur hygro-régulante (Vario Xtra ou équivalent), rouleau 1,50 × 40 m (60 m²)", "Membrane pare-vapeur",
            [unite("rouleau", "rouleau de 60 m²", "rouleaux de 60 m²", "60", "m2", "isover-vario", OK2("1,50 × 40 m = 60 m² : notice Isover et Gedimat."))], ["vario", "vario xtra", "pare-vapeur", "membrane"]),
    produit("adhesif-kb1", "vb_tape", "Adhésif de membrane (Vario KB1 ou équivalent), rouleau 60 mm × 40 m", "Adhésif membrane",
            [unite("rouleau", "rouleau de 40 m", "rouleaux de 40 m", "40", "m", "gedimat-vario", OK2("40 m × 60 mm : Gedimat et Brico Dépôt."))], ["kb1", "adhesif vario", "adhesif membrane"]),
    produit("cheville-metal-6x40", "hanger_anchor", "Chevilles métalliques à frapper 6 × 40 pour suspente sur béton", "Chevilles métal 6 × 40",
            [unite("boite", "boîte de 100", "boîtes de 100", "100", "u", "placo-integrale-plafonds-2023", OK2("Boîte de 100 : Rawl, Spit, ING Fixations (recherche/10 n° 56)."))], ["clou cheville", "cheville metallique"]),
    produit("vis-ttpc-35-bois", "screw_board", "Vis TTPC 35 (3,5 × 35), fixation des suspentes sur bois", "Vis TTPC 35 (suspentes)",
            [unite("boite", "boîte de 1000", "boîtes de 1000", "1000", "u", "gypso-vis", OK2("Boîte de 1000 : Gypso / Chausson et Klimas."))], ["vis 35 suspente"]),
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

CLOUEUR = {
    "key": "marque_cloueur", "label": "Marque du cloueur", "unit": "u", "kind": "artisan_preference",
    "question": "Ton cloueur à gaz, c'est quelle marque ?",
    "hint": "Les clous et les cartouches de gaz vont avec leur cloueur.",
    "named": True,
    "choices": [{"label": "Spit", "value": "1", "dit": ["spit", "pulsa"]}, {"label": "Hilti", "value": "2", "dit": ["hilti", "gx"]}, {"label": "Paslode", "value": "3", "dit": ["paslode"]}],
    "display": {"1": "Spit", "2": "Hilti", "3": "Paslode"},
}

TYPE_PLAQUE_FEU_DEFAUT = {**prov("placo-pv-feu", OK2("Plaque par défaut selon le classement : EI 30 en 72/48 et EI 60 en 98/48 en plaques STANDARD chez les trois marques ; 72/48 EI 60 et 98/48 EI 120 en plaques feu (Placoflam, KF) chez Placo et Knauf (recherche/11 §4.2).")), "formula": "si(ei > 30, si(couches < 2, 3, si(ei > 60, 3, 1)), 1)", "note": "plaque standard, ou plaque feu quand le système coupe-feu l'exige, par défaut"}

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
LONGUEUR_PLAQUE = "si(hauteur <= regle.s250, regle.l250, si(hauteur <= regle.s260, regle.l260, si(hauteur <= regle.s270, regle.l270, si(hauteur <= regle.s280, regle.l280, si(hauteur <= regle.s300, regle.l300, si(hauteur <= regle.s320, regle.l320, regle.l360))))))"
# Longueur de montant Placo : 2,49 / 2,59 / 2,69 / 2,79 / 2,99 / 3,19 / 3,59 / 3,99 (= hauteur − 1 cm).
LONGUEUR_MONTANT = "si(hauteur <= regle.s250, regle.m249, si(hauteur <= regle.s260, regle.m259, si(hauteur <= regle.s270, regle.m269, si(hauteur <= regle.s280, regle.m279, si(hauteur <= regle.s300, regle.m299, si(hauteur <= regle.s320, regle.m319, si(hauteur <= regle.s360, regle.m359, regle.m399)))))))"


def longueurs():
    ok_plaque = OK2("Longueurs BA13 2,50 / 2,60 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 m : Placo (18/12/2023) et Siniat (01/09/2026), recherche/01 §1.1 ; plaque coupée 1 cm plus courte que la hauteur (Siniat, carnet cloison).")
    ok_montant = OK2("Longueurs Placo Stil M 48 2,49 / 2,59 / 2,69 / 2,79 / 2,99 / 3,19 / 3,59 / 3,99 m : fiche Placo (18/12/2023) et Chausson / SFIC / Point.P (recherche/02 A.1). Marques négoce : 2,50 / 3,00 m.")
    c = {}
    # Seuils : une hauteur jusqu'à L + 1 cm se fait avec une plaque de L (plaque coupée à hauteur − 1 cm).
    for k, seuil, val in [("250", "2.51", "2.5"), ("260", "2.61", "2.6"), ("270", "2.71", "2.7"), ("280", "2.81", "2.8"), ("300", "3.01", "3"), ("320", "3.21", "3.2"), ("360", "3.61", "3.6")]:
        c["s" + k] = regle(seuil, "m", "placo-ba13", ok_plaque, f"Jusqu'à {seuil.replace('.', ',')} m de hauteur : plaque de {val.replace('.', ',')} m.", label=f"jusqu'à {seuil.replace('.', ',')} m de haut : plaque de {val.replace('.', ',')} m")
        c["l" + k] = regle(val, "m", "placo-ba13", ok_plaque, label=f"plaque de {val.replace('.', ',')} m")
    for k, val in [("m249", "2.49"), ("m259", "2.59"), ("m269", "2.69"), ("m279", "2.79"), ("m299", "2.99"), ("m319", "3.19"), ("m359", "3.59"), ("m399", "3.99")]:
        c[k] = regle(val, "m", "placo-m48", ok_montant, label=f"montant de {val.replace('.', ',')} m")
    return c


def finitions_constantes(parements):
    """Bande et enduit par m² d'ouvrage : `parements` faces jointoyées."""
    return {
        "bande_par_m2": regle(str(round(1.40 * parements, 2)), "ml/m2", "placo-integrale-2023-bande", OK2(f"1,40 ml par m² de parement (Placo Intégrale 04/2023 et brochure doublage 2017 ; fiche solution 72/48 : 2,80 pour deux faces) × {parements} face(s). Siniat dit 1,1 (joints entre plaques seulement) : Placo retenu, plus prudent."), label="{v} de bande par m²"),
        "enduit_poudre_par_m2": regle(str(round(0.33 * parements, 2)), "kg/m2", "placo-pr4", OK2(f"0,33 kg/m² de parement : fiche Placo PR4 (02/04/2026) et Intégrale 2023 ; Siniat 0,30-0,35 × {parements} face(s)."), label="{v} d'enduit poudre par m²"),
        "enduit_pate_par_m2": regle(str(round(0.47 * parements, 2)), "kg/m2", "placo-integrale-2023-bande", OK2(f"0,47 kg/m² de parement : Intégrale Placo 2023, Siniat Prégy S 0,45, Semin CE 78 0,50 (recherche/12) × {parements} face(s). Le 0,525 de la seule fiche Placomix Pro est un minimum de produit, d'autres documents Placo du même produit disent 0,49."), label="{v} d'enduit prêt à l'emploi par m²"),
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
        "montants_par_porte": regle("2", "u", "greg-decisions", GREG("2 montants d'huisserie par porte écrite au devis (Greg, 20 novembre 2026)."), label="{v} montants par porte"),
        "rails_par_cloison": regle("2", "u", "snip-fc18", OK2("Un rail en bas, un en haut (SNIP fiche 18 ; Siniat carnet cloison)."), label="{v} rails (haut et bas)"),
        "montant_large": regle("60", "mm", "dtu-2541-2022", OK2("Au-delà du montant 48 (M62, M70, M90…), la cloison tient sa hauteur en montants simples à 0,60 dans les cas courants (DTU via Rockwool ; Siniat).")),
        "e60": regle("0.60", "m", "dtu-2541-2022", OK2("Entraxe 0,60 m : DTU 25.41 via Siniat carnet et SNIP.")),
        "e40": regle("0.40", "m", "dtu-2541-2022", OK2("Entraxe 0,40 m : DTU 25.41 via Siniat carnet et SNIP.")),
        "pas_fixation_rail": regle("0.60", "m", "siniat-carnet-cloison", OK2("Rails fixés tous les 60 cm au plus : Siniat carnet cloison et Placo Intégrale 2023 (nouveauté DTU 25.41)."), label="une fixation tous les {v}"),
        # Seuils de hauteur NF DTU 25.41 2022, M48-35
        "h_7248_s60": regle("2.50", "m", "dtu-2541-2022", hauteurs_ok), "h_7248_s40": regle("2.75", "m", "dtu-2541-2022", hauteurs_ok),
        "h_7248_d60": regle("3.05", "m", "dtu-2541-2022", hauteurs_ok), "h_7248_d40": regle("3.40", "m", "dtu-2541-2022", hauteurs_ok),
        "h_9848_s60": regle("3.00", "m", "dtu-2541-2022", hauteurs_ok), "h_9848_s40": regle("3.40", "m", "dtu-2541-2022", hauteurs_ok),
        "h_9848_d60": regle("3.75", "m", "dtu-2541-2022", GREG("Validé par Greg le 20/11/2026. "+"3,75 m : fiche Placo sp00020105 (98/48 doublés 0,60, 3,75 m), Siniat carnet DTU et Pladur ; seul le guide Rockwool dit 3,70 (recherche/09 n° 30, à valider par Greg). Règle changée : avant 3,70 m.")),
        "h_m70_s60": regle("3.90", "m", "dtu-2541-2022", OK2("120/70 (2 BA13, M70-40) : 3,90 m en simples 0,60 (Rockwool DTU 2022, Siniat 3,85, Pladur 3,85).")),
        # Vis (SNIP fiche 18, déc. 2024 : vis des rails comprises)
        "vis_1p_s60": regle("30", "u/m2", "snip-fc18", OK2("30 vis/m² (vis à 30 cm + vis des rails) : SNIP fiche 18 et fiche solution Placo actuelle sp00011223 (29,19). Le « 22 » venait d'une ancienne fiche Placo (recherche/09 n° 31)."), label="{v} vis par m²"),
        "vis_1p_s40": regle("37", "u/m2", "snip-fc18", OK2("37 vis/m² à 0,40 : SNIP fiche 18 et fiche solution Placo sp00011244 (36,75) (recherche/09 n° 6)."), label="{v} vis par m²"),
        "vis_1p_d60": regle("35", "u/m2", "snip-fc18", OK2("35 vis/m² en doublés 0,60 : SNIP fiche 18 et guide Chausson 2020-21 (recherche/13 A1)."), label="{v} vis par m²"),
        "vis_1p_d40": regle("47", "u/m2", "snip-fc18", OK2("47 vis/m² en doublés 0,40 : SNIP 47 et Chausson 45, à 4 % près (recherche/13 A2)."), label="{v} vis par m²"),
        "vis_int_s60": regle("10", "u/m2", "snip-fc18", OK2("1re peau vissée à 60 cm : SNIP (10) et guide Chausson 2020-21 (même règle, le calcul redonne 10) (recherche/15 n° 1)."), label="{v} vis 1re peau par m²"),
        "vis_int_s40": regle("14", "u/m2", "snip-fc18", OK2("SNIP 14 et règle Chausson (calcul : 14) (recherche/15 n° 1)."), label="{v} vis 1re peau par m²"),
        "vis_int_d60": regle("13", "u/m2", "snip-fc18", OK2("1re peau vissée à 60 cm en montants doublés : SNIP 13 et règle Chausson « plaques internes à 60 cm » (recherche/15 n° 1)."), label="{v} vis 1re peau par m²"),
        "vis_int_d40": regle("18", "u/m2", "snip-fc18", OK2("SNIP 18 et règle Chausson (recherche/15 n° 1)."), label="{v} vis 1re peau par m²"),
        "vis_ext_s60": regle("27", "u/m2", "snip-fc18", OK2("2e peau TTPC 35 : SNIP 27 et Placo sp00011452 (26,25) (recherche/09 n° 11)."), label="{v} vis 2e peau par m²"),
        "vis_ext_s40": regle("34", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 2e peau par m²"),
        "vis_ext_d60": regle("32", "u/m2", "snip-fc18", OK2("SNIP 32 et Placo sp00020105 (31,5) (recherche/09)."), label="{v} vis 2e peau par m²"),
        "vis_ext_d40": regle("42", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis 2e peau par m²"),
        "trpf_s60": regle("2", "u/m2", "snip-fc18", OK2("2 TRPF/m² (montant sur rail, haut et bas) : SNIP fiche 18 et Placo fiche solution 72/48."), label="{v} vis TRPF par m²"),
        "trpf_s40": regle("3", "u/m2", "snip-fc18", UNE("SNIP fiche 18."), label="{v} vis TRPF par m²"),
        "trpf_d60": regle("6", "u/m2", "placo-integrale-plafonds-2023", OK2("6 TRPF/m² en doublés 0,60 : Placo (assemblage des montants doublés compris) et guide Chausson ; le SNIP en compte 5 (recherche/13 A4). Règle changée : avant 5."), label="{v} vis TRPF par m²"),
        "trpf_d40": regle("10", "u/m2", "placo-integrale-plafonds-2023", CONFLIT("10 TRPF/m² : Placo Intégrale 2021-22 et le calcul de sa règle « montants doublés solidarisés tous les 40 cm » (9,9) (recherche/15 n° 2). Règle changée : avant 7.", "SNIP 7, Chausson 8 : ils ne comptent pas toute la solidarisation des montants doublés."), label="{v} vis TRPF par m²"),
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
                        {"value": "1", "keywords": ["72/48", "72 / 48", "100/70", "1 ba13", "parement simple"]}],
         "default": {**prov("capeb-dtu-2541", OK2("Logement (cas A du DTU 25.41 2022) : une plaque par face suffit, c'est la 72/48 courante (CAPEB, Siniat carnet cloison).")), "value": "1", "note": "une plaque par face (72/48), par défaut"}},
        {"key": "montant", "label": "Largeur du montant", "unit": "mm", "kind": "site_data", "question": "Montants de 48 ou de 70 ?",
         "choices": [{"label": "48", "value": "48"}, {"label": "70", "value": "70"}],
         "textValues": [{"value": "70", "keywords": ["100/70", "120/70", "m70", "r70"]}, {"value": "48", "keywords": ["72/48", "98/48", "m48", "r48"]}],
         "default": {**prov("dtu-2541-2022", OK2("Le 48 est le montant des cloisons de logement (72/48, 98/48) : DTU, Placo, Siniat.")), "value": "48", "note": "montant de 48, par défaut"}},
        {"key": "montage", "label": "Montage des montants", "unit": "u", "kind": "site_data", "question": "Tes montants : simples à 60 cm, simples à 40 cm, ou doublés ?",
         "hint": "Au-delà de 2,50 m, une 72/48 ne tient plus en montants simples à 60 cm (DTU 25.41).",
         "choices": [{"label": "Simples à 60 cm", "value": "1"}, {"label": "Simples à 40 cm", "value": "2"}, {"label": "Doublés à 60 cm", "value": "3"}, {"label": "Doublés à 40 cm", "value": "4"}],
         "display": {"1": "montants simples à 60 cm", "2": "montants simples à 40 cm", "3": "montants doublés à 60 cm", "4": "montants doublés à 40 cm"},
         "textValues": [{"value": "2", "keywords": ["entraxe 40", "entraxe 0,40", "a 40 cm", "e=40", "sous faience", "sous carrelage"]}, {"value": "3", "keywords": ["montants doubles", "doubles"]}],
         "default": {**prov("dtu-2541-2022", hauteurs_ok), "formula": "si(ei > 30, si(couches < 2, 4, si(hauteur <= regle.h_9848_s60, 1, si(hauteur <= regle.h_9848_s40, 2, si(hauteur <= regle.h_9848_d60, 3, 4)))), si(montant > regle.montant_large, 1, si(couches < 2, si(hauteur <= regle.h_7248_s60, 1, si(hauteur <= regle.h_7248_s40, 2, si(hauteur <= regle.h_7248_d60, 3, 4))), si(hauteur <= regle.h_9848_s60, 1, si(hauteur <= regle.h_9848_s40, 2, si(hauteur <= regle.h_9848_d60, 3, 4))))))", "note": montage_note + " Coupe-feu EI 60 en 72/48 : montants doublés à 0,40 (Placo PV RS 15-020, Knauf PV EFR-19-V-002073)."}},
        TYPE_PLAQUE, ENDUIT, FIXATION_RAIL, CLOUEUR,
        {"key": "portes", "label": "Portes dans la cloison", "unit": "u", "kind": "site_data", "question": "Combien de portes dans cette cloison ?",
         "textCount": ["porte", "portes", "bloc-porte", "blocs-portes", "bloc porte", "huisserie", "huisseries"],
         "default": {**prov("greg-decisions", GREG("Montants d'huisserie : 2 par porte ÉCRITE au devis (Greg, 20 novembre 2026) ; sans porte écrite, aucune.")), "value": "0", "note": "aucune porte écrite au devis"}},
    ]
    derived = [
        {"key": "longueur_cloison", "label": "Longueur de cloison", "unit": "m", "formula": "surface / hauteur", "shown": True, **prov("mobiiz-geometrie", OK2("Longueur = surface ÷ hauteur : SNIP et Pladur calculent les rails ainsi (0,84 ml/m² à 2,50 m)."))},
        {"key": "longueur_plaque", "label": "Longueur des plaques", "unit": "m", "formula": LONGUEUR_PLAQUE, "shown": True, **prov("placo-ba13", OK2("Plus petite longueur vendue ≥ hauteur − 1 cm."))},
        {"key": "longueur_montant", "label": "Longueur des montants", "unit": "m", "formula": LONGUEUR_MONTANT, "shown": True, **prov("placo-m48", OK2("Montant = hauteur − 1 cm, longueurs Placo en 9."))},
        {"key": "entraxe", "label": "Entraxe des montants", "unit": "m", "formula": "si(montage < 2, regle.e60, si(montage < 3, regle.e40, si(montage < 4, regle.e60, regle.e40)))", "shown": False, **prov("dtu-2541-2022", OK2("Entraxe 0,60 ou 0,40 m (DTU 25.41, Siniat, SNIP)."))},
        {"key": "doubles", "label": "Montants doublés", "unit": "u", "formula": "si(montage < 3, 1, 2)", "shown": False, **prov("dtu-2541-2022", OK2("Montants doublés = deux montants dos à dos."))},
    ]
    vis_ttpc = "si(couches < 2, si(montage < 2, regle.vis_1p_s60, si(montage < 3, regle.vis_1p_s40, si(montage < 4, regle.vis_1p_d60, regle.vis_1p_d40))), si(montage < 2, regle.vis_int_s60, si(montage < 3, regle.vis_int_s40, si(montage < 4, regle.vis_int_d60, regle.vis_int_d40))))"
    vis_ext = "si(montage < 2, regle.vis_ext_s60, si(montage < 3, regle.vis_ext_s40, si(montage < 4, regle.vis_ext_d60, regle.vis_ext_d40)))"
    trpf = "si(montage < 2, regle.trpf_s60, si(montage < 3, regle.trpf_s40, si(montage < 4, regle.trpf_d60, regle.trpf_d40)))"
    needs = [
        {"id": "plaques", "slot": "plaque", "formula": "arrondi_sup(longueur_cloison * regle.faces * couches * regle.chute_plaques / regle.largeur_plaque)", "unit": "u", "core": True,
         "designation": "Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}", "precision": "{couches} sur {longueur_cloison|m} de cloison, hauteur {hauteur|m}",
         "exclusions": "Vides de portes non déduits (le devis vend la surface pleine) ; hors huisseries.", **prov("snip-fc18", OK2("Plaques = 2 faces × plaques par face × 1,05 (SNIP 2,10 m²/m² ; Pladur 2,1 ; Placo 2,10)."))},
        {"id": "montants", "slot": "montant", "formula": "arrondi_sup((longueur_cloison / entraxe + 1 + (doubles - 1) * (longueur_cloison / entraxe - 1)) * regle.chute_ossature) + portes * regle.montants_par_porte", "unit": "u", "core": True,
         "designation": "Montants M{montant|mm#} longueur {longueur_montant|m}", "precision": "{montage}", "short": "montants",
         "exclusions": "Montants d'huisserie : 2 par porte écrite au devis (Greg, 20/11/2026) ; montants d'angle non compris.", **prov("snip-fc18", OK2("Un montant par entraxe + 1 ; en doublés, les deux montants de bout ne se doublent pas : (n + (doubles − 1)(n − 2)) × 1,05. Redonne le SNIP (2,10 / 2,89 / 3,68 / 5,25 ml/m²) et Placo Intégrale 2021-22 (recherche/09 n° 35). Hors montants d'huisserie."))},
        {"id": "rails", "slot": "rail", "formula": "longueur_cloison * regle.rails_par_cloison * regle.chute_ossature", "unit": "ml", "core": True, "precision": "rails haut et bas", "short": "rails",
         **prov("snip-fc18", OK2("2 × longueur × 1,05 : SNIP (0,84 ml/m² à 2,50 m) et Pladur (0,84 / 0,75 / 0,70 selon la hauteur)."))},
        {"id": "vis-ttpc-25", "slot": "vis", "formula": f"surface * {vis_ttpc}", "unit": "u", "core": True, "short": "vis TTPC 25", **prov("snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."))},
        {"id": "vis-ttpc-35", "slot": "vis_ext", "formula": f"surface * {vis_ext}", "unit": "u", "core": True, "when": "couches >= 2", "short": "vis TTPC 35", "precision": "2e peau", **prov("snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."))},
        {"id": "vis-trpf", "slot": "trpf", "formula": f"surface * {trpf}", "unit": "u", "core": True, "short": "vis TRPF", **prov("snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."))},
        {"id": "fixations-clous", "slot": "fixation", "formula": "arrondi_sup(longueur_cloison * regle.rails_par_cloison * regle.chute_ossature / regle.pas_fixation_rail)", "unit": "u", "core": True, "when": "fixation_rail < 2", "short": "fixations de rail",
         "designation": "Clous {marque_cloueur} pour cloueur à gaz, béton 20 mm, avec cartouches de gaz", "precisionRequires": ["marque_cloueur"],
         "precision": "une fixation tous les 60 cm", **prov("siniat-carnet-cloison", OK2("Pas de 0,60 m au plus : Siniat, Placo, Pladur (recherche/13 B1). Fixation en bout de barre non comptée (une seule source, grand public)."))},
        {"id": "fixations-chevilles", "slot": "fixation_cheville", "formula": "arrondi_sup(longueur_cloison * regle.rails_par_cloison * regle.chute_ossature / regle.pas_fixation_rail)", "unit": "u", "core": True, "when": "fixation_rail >= 2", "short": "chevilles de rail",
         "precision": "une cheville tous les 60 cm", **prov("siniat-carnet-cloison", OK2("Même règle que les clous (recherche/13 B1)."))},
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
        {"key": "isolant", "family": "insulation", "label": "Isolant de cloison", "keywords": ["laine", "isolant", "gr32"], "usual": {"text": "Laine minérale 45 mm (épaisseur admise en M48 : 30 à 45 mm, DTU via Rockwool).", "source": "dtu-2541-2022", "productId": "ursa-prk32-45"}},
        *slots_finitions(),
    ]
    return {"id": "cloison-distributive", "trade": TRADE, "section": "principal", "label": "Cloison sur ossature métallique (72/48, 98/48, 100/70, 120/70…)",
            "triggers": ["partition"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUTILS COMMUNS AUX OUVRAGES
# ---------------------------------------------------------------------------------------------------------------
def slot(key, family, label, product, text, source, formOf=None, keywords=None, **extra):
    s = {"key": key, "family": family, "label": label}
    if formOf:
        s["formOf"] = formOf
    if keywords:
        s["keywords"] = keywords
    s["usual"] = {"text": text, "source": source, "productId": product}
    s.update(extra)
    return s


def besoin(id, slot_, formula, unit, source, etat, **extra):
    n = {"id": id, "slot": slot_, "formula": formula, "unit": unit, "core": extra.pop("core", True), **prov(source, etat)}
    n.update(extra)
    return n


def derive(key, label, unit, formula, source, etat, shown=False):
    return {"key": key, "label": label, "unit": unit, "formula": formula, "shown": shown, **prov(source, etat)}


GEO = OK2("Géométrie : longueur = surface ÷ hauteur (SNIP et Pladur calculent ainsi).")


def fixations_rail(base_ml, extra_count="0"):
    """Clous ou chevilles des rails (et des appuis) selon l'habitude de l'artisan."""
    f = f"arrondi_sup({base_ml} / regle.pas_fixation_rail + {extra_count})"
    etat = OK2("Pas de 0,60 m au plus : Siniat, Placo, Pladur (« 50 à 60 cm ») (recherche/13 B1). La fixation en bout de barre (à 10 cm de chaque extrémité, Castorama seul) n'est pas comptée.")
    return [
        besoin("fixations-clous", "fixation", f, "u", "siniat-carnet-cloison", etat, when="fixation_rail < 2", short="fixations", precision="une fixation tous les 60 cm", designation="Clous {marque_cloueur} pour cloueur à gaz, béton 20 mm, avec cartouches de gaz", precisionRequires=["marque_cloueur"]),
        besoin("fixations-chevilles", "fixation_cheville", f, "u", "siniat-carnet-cloison", etat, when="fixation_rail >= 2", short="chevilles", precision="une cheville tous les 60 cm"),
    ]


def slots_fixation(formOf):
    return [
        slot("fixation", "anchor", "Clous de fixation", "clous-gaz-beton", "Clous pour cloueur à gaz, béton.", "spit-pulsa", formOf, ["clou", "cloueur"]),
        slot("fixation_cheville", "anchor", "Chevilles de fixation", "cheville-frapper", "Chevilles à frapper 6 × 40.", "brico-depot-chevilles", formOf, ["cheville"]),
    ]


def c_pas_fixation():
    return regle("0.60", "m", "siniat-carnet-cloison", OK2("Rails fixés tous les 60 cm au plus : Siniat carnet cloison et Placo Intégrale 2023 (nouveauté DTU 25.41)."), label="une fixation tous les {v}")


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 2 : DOUBLAGE COLLÉ (complexe plaque + isolant au mortier adhésif)
# ---------------------------------------------------------------------------------------------------------------
def doublage_colle():
    c = {**longueurs(),
         "largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Complexes de 1,20 m (Placo, Isover, Siniat, Knauf).")),
         "chute_plaques": regle("1.05", "u", "pladur-2019", OK2("1,05 m² de complexe par m² : Pladur Mémento 2017 et Placo (Placotherm, extrait)."), label="complexes + {v}"),
         "map_par_m2": regle("1.8", "kg/m2", "siniat-pregycolle", OK2("1,8 kg/m² (10 plots de 10 cm, complexe PSE sur mur plan) : Siniat Prégycolle 120 (01/09/2026) et Placo brochure doublage 2017 / Placotherm+. Le « 2 à 3 kg/m² » de la fiche produit MAP vaut pour tous les usages du mortier (recherche/12)."), label="{v} de mortier adhésif par m²"),
         "map_irregulier_par_m2": regle("2.5", "kg/m2", "pladur-2019", OK2("2,5 kg/m² pour un complexe en laine minérale ou un mur irrégulier : Placo DuoPass 2017, Pladur 2017, Knauf Mak 3 2020 « 2 à 2,5 » (recherche/12)."), label="{v} de mortier adhésif par m²"),
         **finitions_constantes(1)}
    params = [surface("Surface de doublage", "Surface de doublage ?"), HAUTEUR,
              {"key": "support_mur", "label": "Mur à doubler", "unit": "u", "kind": "site_data", "question": "Ton mur est plan, ou irrégulier (mur ancien) ?",
               "hint": "Un mur irrégulier ou un complexe en laine minérale prend plus de mortier adhésif.",
               "choices": [{"label": "Plan", "value": "1", "dit": ["plan", "droit", "neuf"]}, {"label": "Irrégulier", "value": "2", "dit": ["irregulier", "ancien", "pas droit"]}],
               "display": {"1": "mur plan", "2": "mur irrégulier"},
               "textValues": [{"value": "2", "keywords": ["calibel", "laine de verre", "laine minerale", "mur ancien", "renovation", "irregulier"]}],
               "default": {**prov("siniat-pregycolle", OK2("Mur plan (béton, parpaing enduit) : cas du quantitatif fabricant (Siniat, Placo).")), "value": "1", "note": "mur plan, par défaut"}},
              ENDUIT]
    derived = [derive("longueur_mur", "Longueur de mur", "m", "surface / hauteur", "mobiiz-geometrie", GEO, True),
               derive("longueur_complexe", "Longueur des complexes", "m", LONGUEUR_PLAQUE, "placo-ba13", OK2("Complexes en 2,50 / 2,60 / 2,70 / 2,80 / 3,00 m (Doublissimo, Calibel, Prégytherm) : recherche/01 §8."), True)]
    needs = [
        besoin("complexes", "complexe", "arrondi_sup(longueur_mur * regle.chute_plaques / regle.largeur_plaque)", "u", "pladur-2019", OK2("Complexes = longueur ÷ 1,20 × 1,05."),
               designation="Complexes de doublage {devis} 1,20 × {longueur_complexe|m}", precision="pour {longueur_mur|m} de mur, hauteur {hauteur|m}",
               exclusions="Au-delà de 3,00 m : complexes superposés (Siniat) ; au-delà de 3,60 m : tasseau intermédiaire (NF DTU 25.42)."),
        besoin("map", "map", "surface * si(support_mur < 2, regle.map_par_m2, regle.map_irregulier_par_m2)", "kg", "siniat-pregycolle", OK2("Ratio Siniat / Placo système ; mur irrégulier ou laine : Placo, Pladur, Knauf."), short="mortier adhésif"),
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "doublage", "family": "glued_lining", "label": "Doublage collé", "measureOnly": True},
        slot("complexe", "lining_board", "Complexes de doublage", "complexe-doublage", "Complexe du devis (ex. 10+80 PSE, 13+100 PSE graphité), 1,20 m.", "placo-ba13", "doublage", ["complexe", "placomur", "doublissimo", "calibel", "pregytherm", "polyplac", "10+", "13+"], ask="Quel complexe : isolant et épaisseur (ex. PSE 10+80, laine de verre 10+100) ?"),
        slot("map", "adhesive_mortar", "Mortier adhésif", "map-25", "MAP en sac de 25 kg.", "placo-map", "doublage", ["map", "mortier adhesif", "colle"]),
        *slots_finitions(),
    ]
    return {"id": "doublage-colle", "trade": TRADE, "section": "principal", "label": "Doublage collé au mortier adhésif (complexe plaque + isolant)",
            "triggers": ["glued_lining"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 3 : DOUBLAGE SUR FOURRURES ET APPUIS (type Optima)
# ---------------------------------------------------------------------------------------------------------------
def doublage_fourrures():
    c = {**longueurs(),
         "largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaques de 1,20 m.")),
         "chute": regle("1.05", "u", "snip-fc18", OK2("5 % : SNIP fiche 18 et Pladur."), label="+ {v}"),
         "entraxe": regle("0.60", "m", "pladur-2019", OK2("Fourrures verticales à 0,60 m : Pladur, Rockwool (DTU 2022), Placo Intégrale 2021."), label="fourrures tous les {v}"),
         "longueur_fourrure": regle("3", "m", "placo-f530", OK2("Fourrure de 3,00 m (Placo, Chausson)."), label="fourrure de {v}"),
         "h_un_appui": regle("2.70", "m", "rockwool-murs-2024", OK2("Jusqu'à 2,70 m : une ligne d'appuis à 1,35 m au plus (Rockwool DTU 2022 et Pladur)."), label="une ligne d'appuis jusqu'à {v}"),
         "h_deux_appuis": regle("4.50", "m", "pladur-2019", OK2("Jusqu'à 4,50 m : appuis à 1,30 et 2,60 m (Pladur) ; DTU 2022 jusqu'à 5,30 m avec plusieurs appuis (CAPEB)."), label="deux lignes d'appuis jusqu'à {v}"),
         "rails_par_mur": regle("2", "u", "snip-fc18", OK2("Lisse ou rail en haut et en bas (SNIP, Pladur)."), label="{v} rails (haut et bas)"),
         "vis_par_m2": regle("15", "u/m2", "snip-fc18", GREG("15 vis/m² (SNIP, vis de rive comprises) quand la marque n'est pas écrite, par prudence (Greg, 20/11/2026)."), label="{v} vis par m²"),
         "vis_placo": regle("11", "u/m2", "placo-integrale-plafonds-2023", OK2("Placo : 11 vis/m² (Intégrale 2021-22, sans vis de rive), cohérent avec la FDES Placo 2023 du doublage Optima sur INIES (4 à 11) (recherche/16 n° 7)."), label="{v} vis par m² (Placo)"),
         "vis_siniat": regle("12", "u/m2", "siniat-carnet-cloison", UNE("Siniat Clipstar : 12 vis/m² ; le guide Chausson dit aussi 12 (recherche/15 n° 4)."), label="{v} vis par m² (Siniat)"),
         "trpf_par_m2": regle("2", "u/m2", "snip-fc18", OK2("SNIP 2/m² et Pladur Mémento 2017 (vis MM 2) (recherche/09 n° 15)."), label="{v} vis TRPF par m²"),
         "pas_fixation_rail": c_pas_fixation(),
         "isolant_par_m2": regle("1.05", "u", "pladur-2019", OK2("1,05 m² d'isolant par m² : Pladur et Placo."), label="isolant + 5 %"),
         **finitions_constantes(1)}
    params = [surface("Surface de doublage", "Surface de doublage ?"), HAUTEUR,
              {"key": "epaisseur_isolant", "label": "Épaisseur de l'isolant", "unit": "mm", "kind": "site_data", "question": "Épaisseur de l'isolant derrière le doublage ?",
               "hint": "Elle choisit la longueur des appuis.", "textLabels": ["laine", "isolant", "gr32", "gr 32", "epaisseur"], "bareNumber": True, "textRange": {"min": "40", "max": "300"},
               "choices": [{"label": "75 mm", "value": "75"}, {"label": "100 mm", "value": "100"}, {"label": "120 mm", "value": "120"}, {"label": "140 mm", "value": "140"}, {"label": "160 mm", "value": "160"}]},
              TYPE_PLAQUE, ENDUIT, FIXATION_RAIL, CLOUEUR, {"key": "marque_ossature", "label": "Marque de l'ossature", "unit": "u", "kind": "site_data", "question": "L'ossature, c'est quelle marque ?",
               "choices": [{"label": "Pas dit", "value": "0"}, {"label": "Placo", "value": "1"}, {"label": "Knauf", "value": "2"}, {"label": "Siniat", "value": "3"}],
               "display": {"0": "marque non écrite", "1": "Placo", "2": "Knauf", "3": "Siniat"},
               "textValues": [{"value": "1", "keywords": ["placo", "optima", "placostil", "stil"]}, {"value": "2", "keywords": ["knauf"]}, {"value": "3", "keywords": ["siniat", "clipstar", "pregymetal"]}],
               "default": {**prov("greg-decisions", GREG("Vis de doublage : celles de la marque quand elle est écrite au devis, sinon 15/m² (syndicat), par prudence (Greg, 20 novembre 2026). Jamais demandée.")), "value": "0", "note": "marque non écrite : ratio du syndicat"}}]
    derived = [derive("longueur_mur", "Longueur de mur", "m", "surface / hauteur", "mobiiz-geometrie", GEO, True),
               derive("longueur_plaque", "Longueur des plaques", "m", LONGUEUR_PLAQUE, "placo-ba13", OK2("Plus petite longueur vendue ≥ hauteur − 1 cm."), True),
               derive("nb_fourrures", "Nombre de fourrures", "u", "arrondi_sup((longueur_mur / regle.entraxe + 1) * regle.chute)", "snip-fc18", OK2("Une fourrure verticale tous les 0,60 m + 1, × 1,05 : SNIP et Pladur (recherche/09 n° 40).")),
               derive("lignes_appuis", "Lignes d'appuis", "u", "si(hauteur <= regle.h_un_appui, 1, si(hauteur <= regle.h_deux_appuis, 2, 3))", "rockwool-murs-2024", OK2("Rockwool et Pladur."))]
    needs = [
        besoin("plaques", "plaque", "arrondi_sup(longueur_mur * regle.chute / regle.largeur_plaque)", "u", "snip-fc18", OK2("1,05 m² de plaque par m² (SNIP, Pladur)."),
               designation="Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}", precision="pour {longueur_mur|m} de mur"),
        besoin("fourrures", "fourrure", "nb_fourrures * si(hauteur <= regle.longueur_fourrure, regle.longueur_fourrure, hauteur * regle.chute) + longueur_mur * lignes_appuis * regle.chute", "ml", "snip-fc18", OK2("Une fourrure entière par file verticale, plus la fourrure HORIZONTALE chevillée au mur qui porte les appuis (une par ligne d'appuis) : SNIP p. 11 et notice Isover Optima2 (recherche/09 n° 40-41)."), short="fourrures", precision="fourrures verticales tous les 60 cm"),
        besoin("rails", "rail_f530", "longueur_mur * regle.rails_par_mur * regle.chute", "ml", "placo-rail-f530", OK2("2 × longueur × 1,05 (SNIP, Pladur) ; rail F 530 de 2,35 m (Placo)."), short="rails", precision="haut et bas"),
        besoin("appuis", "appui", "nb_fourrures * lignes_appuis", "u", "rockwool-murs-2024", OK2("Un appui par fourrure verticale et par ligne : SNIP 0,80/m² et notice Isover Optima2 ; le « 2 appuis/m² » Placo ancien ne se retrouve nulle part (recherche/09 n° 42)."),
               designation="Appuis intermédiaires pour isolant de {epaisseur_isolant|mm#} mm", short="appuis"),
        besoin("vis-ttpc-25", "vis", "surface * si(marque_ossature < 1, regle.vis_par_m2, si(marque_ossature < 2, regle.vis_placo, si(marque_ossature < 3, regle.vis_par_m2, regle.vis_siniat)))", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="vis"),
        besoin("vis-trpf", "trpf", "surface * regle.trpf_par_m2", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="vis TRPF"),
        *fixations_rail("longueur_mur * regle.rails_par_mur * regle.chute", "nb_fourrures * lignes_appuis"),
        besoin("isolant", "isolant", "surface * regle.isolant_par_m2", "m2", "pladur-2019", OK2("1,05 m²/m²."), core=False, short="isolant"),
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "doublage", "family": "furring_lining", "label": "Doublage sur ossature", "measureOnly": True},
        slot("plaque", "plasterboard", "Plaques", "plaque-ba13", "BA13 1,20 m.", "placo-ba13", "doublage", ["plaque", "ba13"]),
        slot("fourrure", "furring", "Fourrures", "fourrure-f530", "Fourrures F 530 de 3 m.", "placo-f530", "doublage", ["fourrure", "f530"]),
        slot("rail_f530", "furring_rail", "Rails F 530", "rail-f530", "Rail F 530 de 2,35 m, haut et bas.", "placo-rail-f530", "doublage", ["rail", "lisse"]),
        slot("appui", "bracket", "Appuis intermédiaires", "appui-optima", "Appuis de la longueur de l'isolant.", "isover-optima2", "doublage", ["appui", "optima"]),
        slot("vis", "screw_board", "Vis TTPC 25", "vis-ttpc-25", "TTPC 25.", "gypso-vis", "doublage", ["ttpc", "vis"]),
        slot("trpf", "screw_metal", "Vis TRPF", "vis-trpf-13", "TRPF 13.", "snip-fc18", "doublage", ["trpf"]),
        *slots_fixation("doublage"),
        slot("isolant", "insulation", "Isolant", "gr32-roule-100", "Isolant écrit au devis (ex. GR 32 kraft 100 mm).", "isover-gr32-roule", None, ["laine", "isolant", "gr32", "gr 32"], ask="Quel isolant : marque ou équivalent, épaisseur, kraft ou nu ?"),
        *slots_finitions(),
    ]
    return {"id": "doublage-fourrures", "trade": TRADE, "section": "principal", "label": "Doublage sur fourrures et appuis intermédiaires (type Optima)",
            "triggers": ["furring_lining"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 4 : CONTRE-CLOISON SUR MONTANTS (autoportante)
# ---------------------------------------------------------------------------------------------------------------
def contre_cloison():
    hh = OK2("Hauteurs NF DTU 25.41 (2022), contre-cloison 1 BA13 : M48-35 0,60 simples 2,00 / doublés 2,40 (Rockwool 07/2024 et Pladur) ; M70 : 2,50 / 3,00.")
    c = {**longueurs(),
         "largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaques de 1,20 m.")),
         "chute": regle("1.05", "u", "snip-fc18", OK2("5 % : SNIP et Pladur."), label="+ {v}"),
         "e60": regle("0.60", "m", "dtu-2541-2022", OK2("Entraxe 0,60 (DTU via Siniat, SNIP).")),
         "e40": regle("0.40", "m", "dtu-2541-2022", OK2("Entraxe 0,40 (DTU via Siniat, SNIP).")),
         "rails_par_mur": regle("2", "u", "snip-fc18", OK2("Rail haut et bas (SNIP)."), label="{v} rails"),
         "montant_large": regle("60", "mm", "rockwool-murs-2024", OK2("M70 et plus : tableau à part (Rockwool, Pladur).")),
         "h48_s60": regle("2.00", "m", "rockwool-murs-2024", hh), "h48_s40": regle("2.25", "m", "pladur-2019", OK2("2,25 m : Pladur ; Placo dit 2,30, on garde la plus basse (recherche/13 D3).")),
         "h48_d60": regle("2.40", "m", "rockwool-murs-2024", hh), "h48_d40": regle("2.65", "m", "pladur-2019", OK2("2,65 m : Pladur ; Placo dit 2,75, on garde la plus basse (recherche/13 D4).")),
         "h70_s60": regle("2.50", "m", "rockwool-murs-2024", hh),
         "vis_s60": regle("15", "u/m2", "snip-fc18", GREG("15 vis/m² (SNIP) quand la marque n'est pas écrite, par prudence (Greg, 20/11/2026)."), label="{v} vis par m²"),
         "vis_placo": regle("11", "u/m2", "placo-integrale-plafonds-2023", UNE("Placo : 11 vis/m², même règle de vissage que le doublage (recherche/13 D2)."), label="{v} vis par m² (Placo)"),
         "vis_siniat": regle("12", "u/m2", "siniat-carnet-cloison", UNE("Siniat : 12 vis/m² (Clipstar ; même règle) (recherche/15 n° 4)."), label="{v} vis par m² (Siniat)"),
         "vis_s40": regle("19", "u/m2", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), label="{v} vis par m²"),
         "trpf_s": regle("2", "u/m2", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), label="{v} TRPF par m²"),
         "trpf_d": regle("5", "u/m2", "snip-fc18", OK2("SNIP 5, Placo 5 si montants doublés."), label="{v} TRPF par m²"),
         "pas_fixation_rail": c_pas_fixation(),
         "isolant_par_m2": regle("1.05", "u", "pladur-2019", OK2("1,05 m²/m² : Pladur et Placo."), label="isolant + 5 %"),
         **finitions_constantes(1)}
    params = [surface("Surface de contre-cloison", "Surface de contre-cloison ?"), HAUTEUR,
              {"key": "montant", "label": "Largeur du montant", "unit": "mm", "kind": "site_data", "question": "Montants de 48 ou de 70 ?",
               "choices": [{"label": "48", "value": "48"}, {"label": "70", "value": "70"}],
               "textValues": [{"value": "70", "keywords": ["m70", "r70", "montants de 70"]}, {"value": "48", "keywords": ["m48", "r48", "montants de 48"]}],
               "default": {**prov("rockwool-murs-2024", OK2("M48 courant.")), "value": "48", "note": "montant de 48, par défaut"}},
              {"key": "montage", "label": "Montage des montants", "unit": "u", "kind": "site_data", "question": "Tes montants : simples à 60 cm, simples à 40 cm, ou doublés ?",
               "hint": "Une contre-cloison en M48 ne tient que 2,00 m en montants simples à 60 cm (DTU 25.41).",
               "choices": [{"label": "Simples à 60 cm", "value": "1"}, {"label": "Simples à 40 cm", "value": "2"}, {"label": "Doublés à 60 cm", "value": "3"}, {"label": "Doublés à 40 cm", "value": "4"}],
               "display": {"1": "montants simples à 60 cm", "2": "montants simples à 40 cm", "3": "montants doublés à 60 cm", "4": "montants doublés à 40 cm"},
               "default": {**prov("rockwool-murs-2024", hh), "formula": "si(montant > regle.montant_large, si(hauteur <= regle.h70_s60, 1, 3), si(hauteur <= regle.h48_s60, 1, si(hauteur <= regle.h48_s40, 2, si(hauteur <= regle.h48_d60, 3, 4))))", "note": "montage le moins cher qui tient la hauteur (DTU 25.41)"}},
              TYPE_PLAQUE, ENDUIT, FIXATION_RAIL, CLOUEUR, {"key": "marque_ossature", "label": "Marque de l'ossature", "unit": "u", "kind": "site_data", "question": "L'ossature, c'est quelle marque ?",
               "choices": [{"label": "Pas dit", "value": "0"}, {"label": "Placo", "value": "1"}, {"label": "Knauf", "value": "2"}, {"label": "Siniat", "value": "3"}],
               "display": {"0": "marque non écrite", "1": "Placo", "2": "Knauf", "3": "Siniat"},
               "textValues": [{"value": "1", "keywords": ["placo", "optima", "placostil", "stil"]}, {"value": "2", "keywords": ["knauf"]}, {"value": "3", "keywords": ["siniat", "clipstar", "pregymetal"]}],
               "default": {**prov("greg-decisions", GREG("Vis de doublage : celles de la marque quand elle est écrite au devis, sinon 15/m² (syndicat), par prudence (Greg, 20 novembre 2026). Jamais demandée.")), "value": "0", "note": "marque non écrite : ratio du syndicat"}}]
    derived = [derive("longueur_mur", "Longueur de mur", "m", "surface / hauteur", "mobiiz-geometrie", GEO, True),
               derive("longueur_plaque", "Longueur des plaques", "m", LONGUEUR_PLAQUE, "placo-ba13", OK2("Plus petite longueur ≥ hauteur − 1 cm."), True),
               derive("longueur_montant", "Longueur des montants", "m", LONGUEUR_MONTANT, "placo-m48", OK2("Montant = hauteur − 1 cm."), True),
               derive("entraxe", "Entraxe des montants", "m", "si(montage < 2, regle.e60, si(montage < 3, regle.e40, si(montage < 4, regle.e60, regle.e40)))", "dtu-2541-2022", OK2("0,60 / 0,40.")),
               derive("doubles", "Montants doublés", "u", "si(montage < 3, 1, 2)", "dtu-2541-2022", OK2("Deux montants dos à dos."))]
    needs = [
        besoin("plaques", "plaque", "arrondi_sup(longueur_mur * regle.chute / regle.largeur_plaque)", "u", "snip-fc18", OK2("1,05 m²/m² (SNIP, Pladur)."), designation="Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}", precision="pour {longueur_mur|m} de mur"),
        besoin("montants", "montant", "arrondi_sup((longueur_mur / entraxe + 1 + (doubles - 1) * (longueur_mur / entraxe - 1)) * regle.chute)", "u", "snip-fc18", OK2("Même règle que la cloison : SNIP et Placo (recherche/09 n° 45)."), designation="Montants M{montant|mm#} longueur {longueur_montant|m}", precision="{montage}", short="montants"),
        besoin("rails", "rail", "longueur_mur * regle.rails_par_mur * regle.chute", "ml", "snip-fc18", OK2("2 × longueur × 1,05 (SNIP, Pladur)."), short="rails", precision="haut et bas"),
        besoin("vis-ttpc-25", "vis", "surface * si(montage < 2, si(marque_ossature < 1, regle.vis_s60, si(marque_ossature < 2, regle.vis_placo, si(marque_ossature < 3, regle.vis_s60, regle.vis_siniat))), regle.vis_s40)", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="vis"),
        besoin("vis-trpf", "trpf", "surface * si(montage < 3, regle.trpf_s, regle.trpf_d)", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="vis TRPF"),
        *fixations_rail("longueur_mur * regle.rails_par_mur * regle.chute"),
        besoin("isolant", "isolant", "surface * regle.isolant_par_m2", "m2", "pladur-2019", OK2("1,05 m²/m²."), core=False, short="isolant"),
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "contre_cloison", "family": "stud_lining", "label": "Contre-cloison", "measureOnly": True},
        slot("plaque", "plasterboard", "Plaques", "plaque-ba13", "BA13 1,20 m.", "placo-ba13", "contre_cloison", ["plaque", "ba13"]),
        slot("rail", "rail", "Rails", "rail-48", "Rails de 3 m.", "placo-r48", "contre_cloison", ["rail"]),
        slot("montant", "stud", "Montants", "montant-48", "Montants M48.", "placo-m48", "contre_cloison", ["montant"]),
        slot("vis", "screw_board", "Vis TTPC 25", "vis-ttpc-25", "TTPC 25.", "gypso-vis", "contre_cloison", ["ttpc", "vis"]),
        slot("trpf", "screw_metal", "Vis TRPF", "vis-trpf-13", "TRPF 13.", "snip-fc18", "contre_cloison", ["trpf"]),
        *slots_fixation("contre_cloison"),
        slot("isolant", "insulation", "Isolant", "gr32-roule-100", "Isolant écrit au devis.", "isover-gr32-roule", None, ["laine", "isolant", "gr32"], ask="Quel isolant : marque ou équivalent, épaisseur, kraft ou nu ?"),
        *slots_finitions(),
    ]
    return {"id": "contre-cloison-montants", "trade": TRADE, "section": "principal", "label": "Contre-cloison sur montants (doublage autoportant)",
            "triggers": ["stud_lining"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 5 : PLAFOND SUR FOURRURES F 530 ET SUSPENTES
# ---------------------------------------------------------------------------------------------------------------
def plafond():
    c = {"largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaques de 1,20 m.")),
         "chute": regle("1.05", "u", "placo-integrale-plafonds-2023", OK2("1,05 m² de plaque par m² de plafond : Placo Intégrale 2023 et Pladur."), label="+ {v}"),
         "e60": regle("0.60", "m", "placo-integrale-plafonds-2023", OK2("Entraxe 0,60 si isolant < 6 kg/m² : Placo 2023 et Siniat carnet plafond.")),
         "e50": regle("0.50", "m", "placo-integrale-plafonds-2023", OK2("0,50 si 6 à 10 kg/m² : Placo 2023 et Siniat.")),
         "fourrures_e60": regle("1.79", "ml/m2", "snip-fc18", OK2("1,79 ml/m² à 0,60 : SNIP fiche 18 et fiche solution Placo sp00012110 (1,79) ; le « 2 » de l'Intégrale 2023 est un arrondi (recherche/09 n° 46)."), label="{v} de fourrures par m²"),
         "fourrures_e50": regle("2.10", "ml/m2", "snip-fc18", OK2("2,10 ml/m² à 0,50 : SNIP et Pladur ; Placo 2,2."), label="{v} de fourrures par m²"),
         "fourrures_e40": regle("3.0", "ml/m2", "placo-integrale-plafonds-2023", UNE("3,0 ml/m² à 0,40 : Placo Intégrale 2023."), label="{v} de fourrures par m²"),
         "suspentes_e60": regle("1.56", "u/m2", "snip-fc18", GREG("Validé par Greg le 20/11/2026. "+"1,56 suspente/m² à 0,60 : SNIP fiche 18 et fiche Placo sp00012110 (2026) ; Pladur 1,46. Valable pour une grande pièce : une pièce de 4 × 4 m en demande ≈ 1,75 ; la boîte de 100 couvre l'écart sur un chantier courant (recherche/09 n° 47). Règle changée : avant 1,8 (Intégrale 2023)."), label="{v} suspentes par m²"),
         "suspentes_e50": regle("1.84", "u/m2", "snip-fc18", OK2("SNIP 1,84 et Pladur 1,75 sortent de la même formule à la pièce (une suspente tous les 1,20 m par file), seule la pièce de référence change (recherche/15 n° 5)."), label="{v} suspentes par m²"),
         "suspentes_e40": regle("2.7", "u/m2", "placo-integrale-plafonds-2023", OK2("2,7 : Placo 2023 ; le calcul à la pièce (une suspente tous les 1,20 m par file) donne 2,63 pour 4 × 4 m (recherche/13 E2)."), label="{v} suspentes par m²"),
         "longueur_fourrure_plafond": regle("3", "m", "placo-f530", OK2("Fourrure commandée en 3,00 m (Placo, Chausson) : une éclisse à chaque aboutage."), label="fourrures de {v}"),
         "vis_int_e50": regle("4", "u/m2", "placo-integrale-plafonds-2023", OK2("1re peau d'un plafond en 2 BA13, entraxe 0,50 : 4 vis/m², Placo 2023 et Pladur 2019 ; le SNIP compte le double (recherche/13 E7)."), label="{v} vis 1re peau par m²"),
         "vis_e60": regle("12", "u/m2", "snip-fc18", CONFLIT("12 vis/m² à 0,60 (SNIP).", "Placo 2023 : 10 ; Pladur : 8."), label="{v} vis par m²"),
         "vis_e50": regle("14", "u/m2", "snip-fc18", OK2("14 vis/m² à 0,50 : SNIP et guide Chausson 2020-21 (recherche/13 E4)."), label="{v} vis par m²"),
         "vis_e40": regle("15", "u/m2", "placo-integrale-plafonds-2023", UNE("15 (Placo 2023)."), label="{v} vis par m²"),
         "vis_int": regle("8", "u/m2", "snip-fc18", CONFLIT("1re peau d'un plafond en 2 BA13 à 0,60 : 8 vis/m² (SNIP), gardé jusqu'à l'avis d'un plaquiste (recherche/16 n° 6).", "Placo Intégrale 2023 : 3 ; mais la FDES Placo 2026 (INIES 52811) pèse deux fois la masse de 3 + 12 vis : la valeur 3 ne tient pas."), label="{v} vis 1re peau par m²"),
         "vis_ext": regle("12", "u/m2", "snip-fc18", OK2("2e peau : 12 vis TTPC 35/m² (SNIP) ; Placo 10 à 15."), label="{v} vis 2e peau par m²"),
         "vis_par_suspente_bois": regle("2", "u", "placo-integrale-plafonds-2023", OK2("2 vis TTPC 35 par suspente sous bois : Placo Intégrale 2023 et fiche Maxi Stil F 530."), label="{v} vis par suspente"),
         "pas_fixation_rail": c_pas_fixation(),
         "isolant_par_m2": regle("1.05", "u", "pladur-2019", OK2("1,05 m²/m² (Placo, Pladur)."), label="isolant + 5 %"),
         "chute_corniere": regle("1.05", "u", "snip-fc18", OK2("Périmètre × 1,05 : retrouvé exactement dans SNIP (0,47 ml/m² pour 8 × 10 m) et Pladur (0,44 pour 8 × 12 m) (recherche/09 n° 62)."), label="+ {v}"),
         **finitions_constantes(1)}
    perimetre = {**prov("mobiiz-geometrie", DOUTE("Estimation : pièce supposée carrée (périmètre = 4 × √surface). Ni SNIP (0,47 ml/m² pour 8 × 10 m) ni Placo (« selon chantier ») ne donnent mieux : à remplacer par le périmètre réel.")),
                 "label": "Cornière de rive par m² de plafond (pièce supposée carrée)", "unit": "ml/m2",
                 "axes": [{"param": "surface", "thresholds": ["0", "8", "12", "16", "20", "30", "40", "60", "100"]}],
                 "values": [["2.0"], ["1.41"], ["1.15"], ["1.0"], ["0.89"], ["0.73"], ["0.63"], ["0.52"], ["0.40"]]}
    params = [surface("Surface de plafond", "Surface de plafond ?"),
              {"key": "support", "label": "Support du plafond", "unit": "u", "kind": "site_data", "question": "Ton plafond est fixé sous quoi ?",
               "hint": "Il choisit la fixation des suspentes.",
               "choices": [{"label": "Solives ou charpente bois", "value": "1", "dit": ["bois", "solives", "charpente", "fermettes"]}, {"label": "Dalle béton", "value": "2", "dit": ["beton", "dalle"]}],
               "display": {"1": "sous bois", "2": "sous dalle béton"},
               "textValues": [{"value": "1", "keywords": ["solives", "solivage", "fermettes", "charpente", "rampant", "sous bois"]}, {"value": "2", "keywords": ["dalle", "beton", "hourdis"]}]},
              {"key": "plenum", "label": "Hauteur de suspension", "unit": "u", "kind": "site_data", "question": "Ton plafond descend de combien sous le support ?",
               "hint": "Il choisit la suspente : longue jusqu'à 15 cm, sécable jusqu'à 58 cm.",
               "choices": [{"label": "Moins de 15 cm", "value": "1"}, {"label": "15 à 58 cm", "value": "2"}],
               "display": {"1": "suspentes longues", "2": "suspentes sécables"},
               "default": {**prov("placo-suspentes", UNE("Suspente longue 171 (plénum 20 à 150 mm) : cas courant sous solives (Placo).")), "value": "1", "note": "plafond près du support, par défaut"}},
              {"key": "entraxe_fourrures", "label": "Entraxe des fourrures", "unit": "cm", "kind": "site_data", "question": "Entraxe des fourrures ?",
               "hint": "60 cm sous un isolant léger (moins de 6 kg/m²), 50 cm de 6 à 10 kg/m², 40 cm au-delà ou en plaques hydro.",
               "choices": [{"label": "60 cm", "value": "60"}, {"label": "50 cm", "value": "50"}, {"label": "40 cm", "value": "40"}], "textLabels": ["entraxe"],
               "default": {**prov("placo-integrale-plafonds-2023", OK2("0,60 m si l'isolant posé dessus pèse moins de 6 kg/m² (Placo 2023, Siniat).")), "value": "60", "note": "entraxe courant"}},
              {"key": "couches", "label": "Plaques", "unit": "u", "kind": "site_data", "question": "Une ou deux plaques ?", "choices": [{"label": "Une", "value": "1"}, {"label": "Deux", "value": "2"}],
               "textValues": [{"value": "2", "keywords": ["2 ba13", "2 x ba13", "deux ba13", "double peau", "parement double"]}],
               "default": {**prov("placo-integrale-plafonds-2023", OK2("Plafond courant : une BA13 (Placo, Pladur).")), "value": "1", "note": "une plaque, par défaut"}},
              {"key": "longueur_plaque", "label": "Longueur des plaques de plafond", "unit": "m", "kind": "artisan_preference", "question": "Tes plaques de plafond, en quelle longueur ?",
               "choices": [{"label": "2,50 m", "value": "2.5"}, {"label": "3,00 m", "value": "3"}],
               "default": {**prov("placo-ba13", UNE("2,50 m : longueur la plus courante (pile de 50) ; ne change pas le nombre de m².")), "value": "2.5", "note": "plaques de 2,50 m, par défaut"}},
              TYPE_PLAQUE, ENDUIT, FIXATION_RAIL, CLOUEUR]
    E = "si(entraxe_fourrures >= regle.e60, {a}, si(entraxe_fourrures >= regle.e50, {b}, {c}))"
    derived = [derive("nb_suspentes", "Nombre de suspentes", "u", "arrondi_sup(surface * " + E.format(a="regle.suspentes_e60", b="regle.suspentes_e50", c="regle.suspentes_e40") + ")", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."))]
    needs = [
        besoin("plaques", "plaque", "arrondi_sup(surface * couches * regle.chute / (regle.largeur_plaque * longueur_plaque))", "u", "placo-integrale-plafonds-2023", OK2("1,05 m² de plaque par m² et par peau (Placo, Pladur)."), designation="Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}"),
        besoin("fourrures", "fourrure", "surface * " + E.format(a="regle.fourrures_e60", b="regle.fourrures_e50", c="regle.fourrures_e40"), "ml", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="fourrures", precision="entraxe {entraxe_fourrures|cm}"),
        besoin("suspentes-longues", "suspente", "nb_suspentes", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), when="plenum < 2", short="suspentes"),
        besoin("suspentes-secables", "suspente_secable", "nb_suspentes", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), when="plenum >= 2", short="suspentes"),
        besoin("vis-suspentes", "vis_suspente", "nb_suspentes * regle.vis_par_suspente_bois", "u", "placo-integrale-plafonds-2023", OK2("2 TTPC 35 par suspente sous bois."), when="support < 2", short="vis de suspente"),
        besoin("chevilles-suspentes", "cheville_suspente", "nb_suspentes", "u", "placo-integrale-plafonds-2023", OK2("Une cheville métallique par suspente sous béton : Placo Intégrale 2023 et Pladur 2019 (chevilles sous agrément à chaque point) (recherche/09 n° 24)."), when="support >= 2", short="chevilles de suspente"),
        besoin("eclisses", "eclisse", "surface * si(entraxe_fourrures >= regle.e60, regle.fourrures_e60, si(entraxe_fourrures >= regle.e50, regle.fourrures_e50, regle.fourrures_e40)) / regle.longueur_fourrure_plafond", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="éclisses"),
        besoin("corniere", "corniere", "surface * table.perimetre * regle.chute_corniere", "ml", "snip-fc18", OK2("Méthode périmètre × 1,05 : SNIP et Pladur (recherche/09 n° 64) ; le périmètre reste estimé (pièce carrée)."), estimate="périmètre estimé d'après la surface : ajuste à tes pièces", short="cornière de rive"),
        besoin("vis-ttpc-25", "vis", "surface * si(couches < 2, " + E.format(a="regle.vis_e60", b="regle.vis_e50", c="regle.vis_e40") + ", si(entraxe_fourrures >= regle.e60, regle.vis_int, regle.vis_int_e50))", "u", "snip-fc18", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="vis"),
        besoin("vis-ttpc-35", "vis_ext", "surface * regle.vis_ext", "u", "snip-fc18", OK2("SNIP 12/m², Placo 10-15."), when="couches >= 2", short="vis 2e peau"),
        *fixations_rail("surface * table.perimetre * regle.chute_corniere"),
        besoin("isolant", "isolant", "surface * regle.isolant_par_m2", "m2", "pladur-2019", OK2("1,05 m²/m²."), core=False, short="isolant"),
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "plafond", "family": "ceiling", "label": "Plafond", "measureOnly": True},
        slot("plaque", "plasterboard", "Plaques", "plaque-ba13", "BA13 1,20 × 2,50 m.", "placo-ba13", "plafond", ["plaque", "ba13"]),
        slot("fourrure", "furring", "Fourrures", "fourrure-f530", "Fourrures F 530 de 3 m.", "placo-f530", "plafond", ["fourrure", "f530"]),
        slot("suspente", "hanger", "Suspentes longues", "suspente-longue", "Suspente longue 171, boîte de 100.", "placo-suspentes", "plafond", ["suspente"]),
        slot("suspente_secable", "hanger", "Suspentes sécables", "suspente-secable", "Suspente sécable.", "placo-suspentes", "plafond", ["secable"]),
        slot("vis_suspente", "screw_board", "Vis de suspente (TTPC 35)", "vis-ttpc-35", "2 TTPC 35 par suspente.", "placo-integrale-plafonds-2023", "plafond", ["vis 35"]),
        slot("cheville_suspente", "hanger_anchor", "Chevilles de suspente", "cheville-metal-6x40", "Cheville métallique 6 × 40.", "placo-integrale-plafonds-2023", "plafond", ["cheville metal"]),
        slot("eclisse", "splice", "Éclisses", "eclisse-f530", "Éclisses F 530.", "placo-eclisse", "plafond", ["eclisse"]),
        slot("corniere", "perimeter_angle", "Cornière de rive", "corniere-cr2", "Cornière CR2 de 3 m.", "placo-cr2", "plafond", ["corniere", "cr2"]),
        slot("vis", "screw_board", "Vis TTPC 25", "vis-ttpc-25", "TTPC 25.", "gypso-vis", "plafond", ["ttpc 25"]),
        slot("vis_ext", "screw_board", "Vis TTPC 35 (2e peau)", "vis-ttpc-35", "TTPC 35.", "gypso-vis", "plafond", ["ttpc 35"]),
        slot("trpf", "screw_metal", "Vis TRPF", "vis-trpf-13", "TRPF 13.", "snip-fc18", "plafond", ["trpf"]),
        *slots_fixation("plafond"),
        slot("isolant", "insulation", "Isolant", "ibr-200", "Isolant écrit au devis.", "isover-ibr", None, ["laine", "isolant", "ibr"], ask="Quel isolant : marque ou équivalent, épaisseur, kraft ou nu ?"),
        *slots_finitions(),
    ]
    return {"id": "plafond-fourrures", "trade": TRADE, "section": "principal", "label": "Plafond sur fourrures F 530 et suspentes (sous solives, sous dalle, sous rampants)",
            "triggers": ["ceiling"], "params": params, "slots": slots, "constants": c, "derived": derived, "tables": {"perimetre": perimetre}, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 6 : CLOISON SÉPARATIVE (SAA, SAD) — constitution connue, quantités à confirmer
# ---------------------------------------------------------------------------------------------------------------
def separative():
    d = DOUTE("Aucun quantitatif fabricant SAA / SAD lu : déduit de la constitution (Placo SAA 120 / SAD 160, Siniat S180) et des ratios de la 98/48.")
    c = {**longueurs(),
         "largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaques de 1,20 m.")),
         "chute": regle("1.05", "u", "snip-fc18", OK2("5 % : SNIP et Pladur."), label="+ {v}"),
         "faces": regle("2", "u", "mobiiz-geometrie", OK2("Deux faces."), label="{v} faces"),
         "plaques_par_face": regle("2", "u", "dtu-2541-2022", OK2("SAA et SAD : 2 BA13 par face (Placo SAA 120, SAD 160 ; Siniat S180)."), label="{v} plaques par face"),
         "e60": regle("0.60", "m", "dtu-2541-2022", OK2("Entraxe 0,60.")),
         "files_montants": regle("2", "u", "dtu-2541-2022", OK2("Séparative à double ossature : SNIP p. 7 (4,20 ml/m² = 2 × 2,10) et Pladur Mémento 2017 p. 64 (3,50 = 2 × 1,75) (recherche/09 n° 59)."), label="{v} files de montants"),
         "vis_int": regle("12", "u/m2", "snip-fc18", UNE("Séparative, 1re peau, montants simples 0,60 : SNIP p. 6-7 (12) ; Pladur compte plus serré (recherche/13 C1)."), label="{v} vis 1re peau par m²"),
         "vis_ext": regle("30", "u/m2", "snip-fc18", OK2("Séparative, 2e peau : SNIP 30 ; chaque file est une 72/48 déjà confirmée (SNIP + Placo 29,19) (recherche/15 n° 3)."), label="{v} vis 2e peau par m²"),
         "trpf": regle("4", "u/m2", "snip-fc18", OK2("Séparative : 4 TRPF/m² = deux files de 72/48 à 2 (SNIP + Placo) (recherche/15 n° 3)."), label="{v} TRPF par m²"),
         "pas_fixation_rail": c_pas_fixation(),
         "isolant_par_m2": regle("1.05", "u", "snip-fc18", OK2("1,05 m²/m² par couche."), label="isolant + 5 %"),
         **finitions_constantes(2)}
    params = [surface("Surface de cloison séparative", "Surface de cloison ?"), HAUTEUR,
              {"key": "type_separative", "label": "Type de séparative", "unit": "u", "kind": "site_data", "question": "Séparative à ossature alternée (SAA) ou double (SAD) ?",
               "choices": [{"label": "SAA (ossature alternée)", "value": "1"}, {"label": "SAD (ossature double)", "value": "2"}],
               "display": {"1": "SAA", "2": "SAD"},
               "textValues": [{"value": "1", "keywords": ["saa", "alternee"]}, {"value": "2", "keywords": ["sad", "ossature double", "double ossature"]}]},
              TYPE_PLAQUE, ENDUIT, FIXATION_RAIL, CLOUEUR]
    derived = [derive("longueur_cloison", "Longueur de cloison", "m", "surface / hauteur", "mobiiz-geometrie", GEO, True),
               derive("longueur_plaque", "Longueur des plaques", "m", LONGUEUR_PLAQUE, "placo-ba13", OK2("Plus petite longueur ≥ hauteur − 1 cm."), True),
               derive("longueur_montant", "Longueur des montants", "m", LONGUEUR_MONTANT, "placo-m48", OK2("Montant = hauteur − 1 cm."), True),
               derive("files_rails", "Files de rails", "u", "si(type_separative < 2, 1, 2)", "dtu-2541-2022", OK2("SAA : un rail large ; SAD : deux rails : SNIP et fiches système Placo (recherche/15 n° 3)."))]
    needs = [
        besoin("plaques", "plaque", "arrondi_sup(longueur_cloison * regle.faces * regle.plaques_par_face * regle.chute / regle.largeur_plaque)", "u", "snip-fc18", OK2("4,2 m² de plaques par m² (2 faces × 2 plaques × 1,05), comme le parement double (Placo, Pladur)."), designation="Plaques BA13 {type_plaque} 1,20 × {longueur_plaque|m}"),
        besoin("montants", "montant", "arrondi_sup((longueur_cloison / regle.e60 + 1) * regle.files_montants * regle.chute)", "u", "snip-fc18", OK2("Deux files de montants simples à 0,60 : SNIP p. 7 et Pladur p. 64 (recherche/09 n° 59, recherche/15 n° 3)."), designation="Montants M48 longueur {longueur_montant|m}", short="montants", precision="deux files ({type_separative})"),
        besoin("rails", "rail", "longueur_cloison * 2 * files_rails * regle.chute", "ml", "dtu-2541-2022", d, short="rails", precision="SAA : un rail large (R70 ou R90) haut et bas ; SAD : deux rails R48 haut et bas"),
        besoin("vis-ttpc-25", "vis", "surface * regle.vis_int", "u", "snip-fc18", d, short="vis 1re peau"),
        besoin("vis-ttpc-35", "vis_ext", "surface * regle.vis_ext", "u", "snip-fc18", d, short="vis 2e peau"),
        besoin("vis-trpf", "trpf", "surface * regle.trpf", "u", "snip-fc18", d, short="vis TRPF"),
        *fixations_rail("longueur_cloison * 2 * files_rails * regle.chute"),
        besoin("isolant", "isolant", "surface * regle.isolant_par_m2", "m2", "snip-fc18", OK2("1,05 m²/m² par couche ; une 2e couche se lit au devis."), core=False, short="isolant"),
        *besoins_finitions("surface"),
    ]
    slots = [
        {"key": "separative", "family": "separating_partition", "label": "Cloison séparative", "measureOnly": True},
        slot("plaque", "plasterboard", "Plaques", "plaque-ba13", "BA13, deux par face.", "placo-ba13", "separative", ["plaque", "ba13"]),
        slot("rail", "rail", "Rails", "rail-48", "Rails de 3 m (largeur selon le système).", "placo-r48", "separative", ["rail"], ask="Quels rails : R48 (SAD) ou R70 / R90 (SAA) ?"),
        slot("montant", "stud", "Montants", "montant-48", "Montants M48.", "placo-m48", "separative", ["montant"]),
        slot("vis", "screw_board", "Vis TTPC 25", "vis-ttpc-25", "TTPC 25.", "gypso-vis", "separative", ["ttpc 25"]),
        slot("vis_ext", "screw_board", "Vis TTPC 35", "vis-ttpc-35", "TTPC 35.", "gypso-vis", "separative", ["ttpc 35"]),
        slot("trpf", "screw_metal", "Vis TRPF", "vis-trpf-13", "TRPF 13.", "snip-fc18", "separative", ["trpf"]),
        *slots_fixation("separative"),
        slot("isolant", "insulation", "Isolant", "ursa-prk32-45", "Isolant écrit au devis.", "acermi-gr32", None, ["laine", "isolant"], ask="Quel isolant : marque ou équivalent, épaisseur ?"),
        *slots_finitions(),
    ]
    return {"id": "cloison-separative", "trade": TRADE, "section": "principal", "label": "Cloison séparative (SAA, SAD)",
            "triggers": ["separating_partition"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 7 : TRAITEMENT DES JOINTS SEUL (« bandes et enduit »)
# ---------------------------------------------------------------------------------------------------------------
def joints():
    c = finitions_constantes(1)
    needs = [dict(n, core=True) for n in besoins_finitions("surface")]
    slots = [{"key": "joints", "family": "joint_work", "label": "Traitement des joints", "measureOnly": True},
             {**slots_finitions()[0], "formOf": "joints"}, {**slots_finitions()[1], "formOf": "joints"}, slots_finitions()[2]]
    for s_ in slots:
        s_.pop("suggested", None)
    return {"id": "joints-seuls", "trade": TRADE, "section": "principal", "label": "Bandes et enduit (traitement des joints seul)",
            "triggers": ["joint_work"], "params": [surface("Surface de parement", "Surface à jointoyer ?"), ENDUIT], "slots": slots, "constants": c, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 8 : ISOLANT EN ROULEAUX OU PANNEAUX (combles, rampants, murs, planchers)
# ---------------------------------------------------------------------------------------------------------------
def isolation_rouleaux():
    c = {"chute": regle("1.05", "u", "pladur-2019", OK2("1,05 m² par m² et par couche : fiches Isover 2019 (combles aménagés, rampants) et guide Chausson ; en combles perdus, Isover seul, même valeur que Placo, Pladur et Rockwool en paroi (recherche/13 G1-G2)."), label="+ {v}")}
    params = [surface("Surface à isoler", "Surface à isoler ?"),
              {"key": "couches_isolant", "label": "Couches", "unit": "u", "kind": "site_data", "question": "Combien de couches de cet isolant ?",
               "choices": [{"label": "Une", "value": "1"}, {"label": "Deux", "value": "2"}],
               "textValues": [{"value": "2", "keywords": ["2 couches", "deux couches", "croisees"]}],
               "default": {**prov("acermi-gr32", OK2("Une couche par ligne de devis : une 2e couche s'écrit à part (DTU 45.10, règle 2/3-1/3).")), "value": "1", "note": "une couche, par défaut"}}]
    needs = [besoin("isolant", "isolant", "surface * couches_isolant * regle.chute", "m2", "pladur-2019", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="isolant")]
    slots = [slot("isolant", "insulation", "Isolant", "gr32-roule-100", "Isolant écrit au devis.", "isover-gr32-roule", None, ["laine", "isolant", "ibr", "gr32", "isoconfort", "rockmur"], ask="Quel isolant : marque ou équivalent, gamme, épaisseur (ou R), kraft ou nu ?")]
    return {"id": "isolation-rouleaux", "trade": TRADE, "section": "principal", "label": "Isolant en rouleaux ou panneaux (combles, rampants, murs)",
            "triggers": ["insulation"], "params": params, "slots": slots, "constants": c, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 9 : SOUFFLAGE EN COMBLES PERDUS (NF DTU 45.11)
# ---------------------------------------------------------------------------------------------------------------
def soufflage():
    acermi = UNE("Certificat ACERMI du produit (une source officielle par produit ; Comblissimo R 10 recoupé par la fiche Isover 2026).")
    deux = OK2("Certificat ACERMI en vigueur ET fiche fabricant récente concordants : Comblissimo (fiche Isover 2026, à 1 % près), Jetrock 2 (fiche Rockwool 01/2026, identique), Thermacell Cristal (fiche Soprema INSFR0303-3/b et brochure 06/2025) (recherche/10 n° 25, recherche/13 F1-F3).")
    une = OK2("Supafil Loft 045 : certificat ACERMI et produit jumeau Knauf Thermo Loft (ACERMI 13/D/016/850, même tableau) repris par la brochure Samse 2024 ; Igloo en sacs de 10 kg : certificat ACERMI 2026 et fiche Ouattitude 09/2024, à un sac près. Le sac de 11,3 kg n'est dans aucun tableau certifié : compter avec le poids écrit sur le sac (recherche/17 n° 1).")
    sacs_a = {**prov("acermi-soufflage", deux), "label": "Sacs pour 100 m² : Comblissimo, Jetrock 2, Thermacell Cristal", "unit": "u",
              "axes": [{"param": "produit_vrac", "thresholds": ["1", "3", "4"]}, {"param": "r_vise", "thresholds": ["5", "6", "7", "8", "10"]}],
              "values": [["15.6", "18.7", "21.8", "24.9", "31.2"],   # Comblissimo, sac 17,3 kg
                         ["21.1", "25.3", "29.6", "33.8", "42.2"],   # Rockwool Jetrock 2, sac 20 kg
                         ["40", "48", "56", "64", "80"]]}            # Thermacell Cristal, sac 12,5 kg
    sacs_b = {**prov("acermi-soufflage", une), "label": "Sacs pour 100 m² : Supafil Loft 045, Igloo", "unit": "u",
              "axes": [{"param": "produit_vrac", "thresholds": ["1", "5"]}, {"param": "r_vise", "thresholds": ["5", "6", "7", "8", "10"]}],
              "values": [["16.4", "19.7", "23.0", "26.3", "32.9"],   # Knauf Supafil Loft 045, sac 16,6 kg
                         ["62", "74", "87", "99", "124"]]}          # Igloo (Ouattitude N), sac de 10 kg
    acermi = deux
    params = [{"key": "surface", "label": "Surface des combles (au sol)", "unit": "m2", "kind": "site_data", "question": "Surface des combles ?", "fromLineQuantity": True},
              {"key": "produit_vrac", "label": "Isolant à souffler", "unit": "u", "kind": "site_data", "question": "Quel isolant à souffler ?",
               "hint": "Le nombre de sacs dépend du produit (son certificat ACERMI).",
               "choices": [{"label": "Laine de verre Comblissimo (sac 17,3 kg)", "value": "1"}, {"label": "Laine de verre Supafil (sac 16,6 kg)", "value": "2"}, {"label": "Laine de roche Jetrock (sac 20 kg)", "value": "3"}, {"label": "Ouate Thermacell Cristal (sac 12,5 kg)", "value": "4"}, {"label": "Ouate Igloo (sac 10 kg)", "value": "5"}],
               "display": {"1": "Laine de verre à souffler Comblissimo, sac de 17,3 kg", "2": "Laine de verre à souffler Supafil Loft 045, sac de 16,6 kg", "3": "Laine de roche à souffler Jetrock 2, sac de 20 kg", "4": "Ouate de cellulose Thermacell Cristal, sac de 12,5 kg", "5": "Ouate de cellulose Igloo, sac de 10 kg"},
               "textValues": [{"value": "1", "keywords": ["comblissimo"]}, {"value": "2", "keywords": ["supafil"]}, {"value": "3", "keywords": ["jetrock", "laine de roche soufflee"]}, {"value": "4", "keywords": ["thermacell"]}, {"value": "5", "keywords": ["igloo", "ouattitude"]}]},
              {"key": "r_vise", "label": "Résistance thermique visée", "unit": "u", "kind": "site_data", "question": "Quel R visé ?",
               "choices": [{"label": "R 5", "value": "5"}, {"label": "R 6", "value": "6"}, {"label": "R 7", "value": "7"}, {"label": "R 8", "value": "8"}, {"label": "R 10", "value": "10"}],
               "display": {"5": "R 5", "6": "R 6", "7": "R 7", "8": "R 8", "10": "R 10"},
               "textValues": [{"value": "10", "keywords": ["r10", "r 10", "r=10", "r = 10"]}, {"value": "8", "keywords": ["r8", "r 8", "r=8", "r = 8"]}, {"value": "7", "keywords": ["r7", "r 7", "r=7", "r = 7"]}, {"value": "6", "keywords": ["r6", "r 6", "r=6", "r = 6"]}, {"value": "5", "keywords": ["r5", "r 5", "r=5", "r = 5"]}]}]
    needs = [besoin("sacs", "vrac", "arrondi_sup(surface * si(produit_vrac < 2, table.sacs_a, si(produit_vrac < 3, table.sacs_b, si(produit_vrac < 5, table.sacs_a, table.sacs_b))) / regle.cent_m2)", "u", "acermi-soufflage", acermi,
                    designation="{produit_vrac}", precision="pour {surface|m2} à {r_vise}, épaisseur après tassement du certificat",
                    exclusions="Aucune majoration : le tassement est déjà dans le tableau du certificat. Piges, déflecteurs de conduits et rehausse de trappe : seulement s'ils sont écrits.")]
    slots = [{"key": "combles", "family": "blown_insulation_work", "label": "Combles soufflés", "measureOnly": True},
             slot("vrac", "loose_fill", "Isolant à souffler", "vrac-souffle", "Sacs du produit écrit au devis.", "acermi-soufflage", "combles", ["comblissimo", "supafil", "ouate", "jetrock"])]
    return {"id": "isolation-soufflee", "trade": TRADE, "section": "principal", "label": "Isolation des combles perdus par soufflage",
            "triggers": ["blown_insulation_work"], "params": params, "slots": slots, "constants": {"cent_m2": regle("100", "m2", "acermi-soufflage", OK2("Le certificat ACERMI donne les sacs pour 100 m² (définition du tableau)."), label="pour {v}")}, "tables": {"sacs_a": sacs_a, "sacs_b": sacs_b}, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 10 : MEMBRANE PARE-VAPEUR
# ---------------------------------------------------------------------------------------------------------------
def pare_vapeur():
    c = {"majoration": regle("1.10", "u", "isover-vario", OK2("1,10 m² de membrane par m² : rendement Isover et calcul (lé 1,50 m, recouvrement 10 cm → +7 %, plus relevés), confirmé en 3e passe (recherche/07)."), label="membrane + {v}"),
         "largeur_utile": regle("1.40", "m", "isover-vario", OK2("Recouvrement de 10 cm au moins entre lés : Knauf, Rockwool (11/2024), Soprema, Isover (recherche/07)."), label="un joint tous les {v}"),
         "adhesif_par_m2": regle("0.8", "ml/m2", "isover-vario", UNE("0,8 ml d'adhésif par m² : seule valeur écrite telle quelle (Isover, fourchette 0,8 à 1,4 « suivant les points singuliers ») ; le guide Chausson donne un minimum de 0,65 (recherche/15 n° 7). Règle changée : avant 0,93."), label="{v} d'adhésif par m²")}
    params = [surface("Surface de membrane", "Surface à couvrir ?")]
    needs = [besoin("membrane", "membrane", "surface * regle.majoration", "m2", "isover-vario", OK2("Surface × 1,10 : Isover (étiquettes Vario Xtra, Stopvap) et calcul sur le recouvrement de 10 cm de trois fabricants (recherche/12)."), short="membrane"),
             besoin("adhesif", "adhesif", "surface * regle.adhesif_par_m2", "ml", "isover-vario", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."), short="adhésif", core=True)]
    slots = [slot("membrane", "vapour_barrier", "Membrane pare-vapeur", "vario-xtra", "Rouleau de 60 m².", "isover-vario", None, ["membrane", "pare-vapeur", "vario"]),
             slot("adhesif", "vb_tape", "Adhésif de membrane", "adhesif-kb1", "Adhésif de la même marque, rouleau de 40 m.", "gedimat-vario", "membrane", ["adhesif", "kb1"])]
    return {"id": "pare-vapeur", "trade": TRADE, "section": "principal", "label": "Membrane pare-vapeur et adhésifs",
            "triggers": ["vapour_barrier"], "params": params, "slots": slots, "constants": c, "needs": needs}


# ---------------------------------------------------------------------------------------------------------------
# COUPE-FEU (décision de Greg, 20 novembre 2026) : tout le système d'UNE marque, avec son procès-verbal ;
# une seule question « Quelle marque ? » ; chaque ligne du système porte la marque, jamais « ou équivalent ».
# ---------------------------------------------------------------------------------------------------------------
SOURCES += [
    {"id": "placo-pv-feu", "kind": "manufacturer", "title": "Placo : systèmes coupe-feu (Offre Placo 2024 p. 60, fiches systèmes Placoflam 72/48 EI 60 PV RS 15-020, 98/48 EI 120 PV RS 15-022, Intégrale Plafonds 2023 montage PRF)", "documentRef": "recherche/11-coupe-feu-par-marque.md, sources P1, P4, S47", "url": "https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf", "retrievedAt": "2026-11-20"},
    {"id": "siniat-pv-feu", "kind": "manufacturer", "title": "Siniat : fiches systèmes coupe-feu 2025-2026 (D72/48 EI 30, D98/48 EI 60, D106/70, plafonds S47 2 Prégyflam REI 60)", "url": "https://www.siniat.fr/-/print2pdf/system/pi477485/siniat-fiche-technique/fr-fr/plafond-pregymetal-sur-fourrures-s47-2-ba13-flam-rei60-avec-isolant.pdf", "retrievedAt": "2026-11-20"},
    {"id": "knauf-pv-feu", "kind": "manufacturer", "title": "Knauf : catalogue Plaquiste 2020, cloisons KM (72/48 EI 30, KF EI 60 PV EFR-19-V-002073, 98/48 EI 60 à EI 120)", "url": "https://deltourmateriaux.com/wp-content/uploads/2020/08/cloisons-catalogue-2020-plaquiste-knauf.pdf", "retrievedAt": "2026-11-20", "note": "Antérieur au DTU 2022 : hauteurs à revalider sur une fiche 2026."},
]

TROIS_MARQUES = OK2("Placo, Siniat et Knauf disent chacun que les performances feu ne valent qu'avec leurs propres composants (recherche/11 §4.1) : aucun « ou équivalent ».")

EI = {
    "key": "ei", "label": "Classement coupe-feu", "unit": "u", "kind": "site_data",
    "question": "Quel classement coupe-feu ?",
    "choices": [{"label": "Pas de coupe-feu", "value": "0"}, {"label": "EI 30", "value": "30"}, {"label": "EI 60", "value": "60"}, {"label": "EI 90", "value": "90"}, {"label": "EI 120", "value": "120"}],
    "display": {"0": "sans exigence feu", "30": "EI 30", "60": "EI 60", "90": "EI 90", "120": "EI 120"},
    "textValues": [{"value": "120", "keywords": ["ei 120", "ei120", "rei 120", "rei120", "cf 2h", "coupe-feu 2h"]}, {"value": "90", "keywords": ["ei 90", "ei90", "rei 90", "rei90"]},
                   {"value": "60", "keywords": ["ei 60", "ei60", "rei 60", "rei60", "cf 1h", "coupe-feu 1h", "coupe feu 1h"]}, {"value": "30", "keywords": ["ei 30", "ei30", "rei 30", "rei30", "cf 1/2h", "coupe-feu 1/2h"]}],
    "default": {**prov("placo-pv-feu", OK2("Sans mot de classement au devis (EI, REI, CF, PV), l'ouvrage n'a pas d'exigence feu : le classement se lit, il ne se déduit jamais (recherche/11 §4.1, trois marques).")), "value": "0", "note": "pas d'exigence feu écrite"},
}

MARQUE = {
    "key": "marque_systeme", "label": "Marque du système coupe-feu", "unit": "u", "kind": "site_data",
    "question": "Ton système coupe-feu, c'est quelle marque ?",
    "hint": "Tout le système suit cette marque et son procès-verbal : plaques, ossature, vis, laine.",
    "named": True,
    "choices": [{"label": "Placo", "value": "1", "dit": ["placo", "placoflam"]}, {"label": "Knauf", "value": "2", "dit": ["knauf", "kf"]}, {"label": "Siniat", "value": "3", "dit": ["siniat", "pregyflam", "prégy"]}],
    "display": {"1": "Placo", "2": "Knauf", "3": "Siniat"},
    "textValues": [{"value": "1", "keywords": ["placo", "placoflam", "placostil"]}, {"value": "2", "keywords": ["knauf", "kf 13", "metal stud"]}, {"value": "3", "keywords": ["siniat", "pregyflam", "pregymetal"]}],
}


def _quand(when, extra):
    """Combine deux conditions d'existence (1 = vrai)."""
    if not when:
        return extra
    return f"si({extra}, si({when}, 1, 0), 0)"


def coupe_feu(work, articles, noms, plafond_rei=False):
    """Chaque besoin d'article du système existe en deux : standard (ei < 1) et coupe-feu (ei >= 1), où la ligne porte
    la marque et attend sa réponse (precisionRequires). `noms` : désignation de base des besoins qui n'en ont pas."""
    ei = dict(EI, display={"0": "sans exigence feu", "30": "REI 30", "60": "REI 60", "90": "REI 90", "120": "REI 120"}) if plafond_rei else EI
    work["params"] = work["params"] + [ei, MARQUE]
    out = []
    for n in work["needs"]:
        if n["id"] not in articles:
            out.append(n)
            continue
        std = dict(n, when=_quand(n.get("when"), "ei < 1"))
        feu = dict(n, id=n["id"] + "-feu", when=_quand(n.get("when"), "ei >= 1"), precisionRequires=["marque_systeme"])
        base = n.get("designation") or noms[n["id"]]
        feu["designation"] = base.replace("BA13 {type_plaque}", "{marque_systeme} {type_plaque} BA13") if "{type_plaque}" in base else f"{base} {{marque_systeme}}"
        feu["precision"] = ((n.get("precision") + " ; ") if n.get("precision") else "") + "système coupe-feu {marque_systeme} {ei} : en entier dans cette marque ; à défaut, un système complet d'une autre marque avec son procès-verbal, signalé à l'artisan ; jamais de mélange de marques"
        out += [std, feu]
    work["needs"] = out
    return work

# ---------------------------------------------------------------------------------------------------------------
# OUVRAGE 11 : COFFRAGE, SOFFITE, CAISSON (règle proposée, recherche/12 : à valider par un plaquiste)
# ---------------------------------------------------------------------------------------------------------------
def coffrage():
    regle_prop = DOUTE("Aucun fabricant ni guide de métré ne publie de quantités par mètre de coffrage : règle proposée qui applique, face par face, les ratios au m² confirmés et la géométrie des arêtes (recherche/12, à valider par un plaquiste).")
    c = {"largeur_plaque": regle("1.20", "m", "placo-ba13", OK2("Plaques de 1,20 m.")),
         "longueur_plaque": regle("2.5", "m", "placo-ba13", OK2("Plaque de 2,50 m (Placo, Siniat)."), label="plaques de {v}"),
         "chute_coffrage": regle("1.10", "u", "mobiiz-geometrie", regle_prop, label="plaques + {v} (petites faces)"),
         "rives_par_ml": regle("2", "u", "mobiiz-geometrie", regle_prop, label="{v} rives par mètre de coffrage"),
         "pas_fixation_rail": c_pas_fixation(),
         "vis_par_m2": regle("15", "u/m2", "snip-fc18", OK2("15 vis/m² : ratio plafond / contre-cloison du SNIP, appliqué à la surface de plaques (recherche/12)."), label="{v} vis par m²"),
         "chute": regle("1.05", "u", "snip-fc18", OK2("5 % (SNIP, Pladur)."), label="+ {v}"),
         **finitions_constantes(1)}
    params = [{"key": "longueur_coffrage", "label": "Longueur du coffrage", "unit": "m", "kind": "site_data", "question": "Longueur du coffrage ?", "fromLineQuantity": True},
              {"key": "type_coffrage", "label": "Forme du coffrage", "unit": "u", "kind": "site_data", "question": "Ton coffrage, c'est un soffite en L (2 faces) ou un caisson en U (3 faces) ?",
               "choices": [{"label": "Soffite en L (2 faces)", "value": "1", "dit": ["soffite", "en l", "2 faces"]}, {"label": "Caisson en U (3 faces)", "value": "2", "dit": ["caisson", "en u", "3 faces", "ipn", "poutre"]}],
               "display": {"1": "soffite en L", "2": "caisson en U"},
               "textValues": [{"value": "2", "keywords": ["caisson", "ipn", "poutre", "3 faces"]}, {"value": "1", "keywords": ["soffite", "2 faces", "angle"]}]},
              {"key": "developpe", "label": "Développé (somme des faces)", "unit": "m", "kind": "site_data", "question": "Développé du coffrage (la somme de ses faces) ?",
               "textLabels": ["developpe", "dev."], "textRange": {"min": "0.1", "max": "3"},
               "choices": [{"label": "40 cm", "value": "0.4"}, {"label": "60 cm", "value": "0.6"}, {"label": "80 cm", "value": "0.8"}, {"label": "1 m", "value": "1"}]},
              ENDUIT, FIXATION_RAIL, CLOUEUR]
    derived = [derive("surface_plaques", "Surface de plaques", "m2", "longueur_coffrage * developpe", "mobiiz-geometrie", OK2("Longueur × développé (géométrie)."), True),
               derive("aretes", "Arêtes saillantes", "u", "type_coffrage", "mobiiz-geometrie", OK2("Soffite en L : 1 arête saillante ; caisson en U : 2 (géométrie)."))]
    needs = [
        besoin("plaques", "plaque", "arrondi_sup(surface_plaques * regle.chute_coffrage / (regle.largeur_plaque * regle.longueur_plaque))", "u", "mobiiz-geometrie", regle_prop, designation="Plaques BA13 1,20 × 2,50 m", precision="à vérifier : {longueur_coffrage|m} × développé {developpe|m} × 1,10 = {surface_plaques|m2} de plaques (règle acceptée par Greg le 20/11, à confirmer par un plaquiste)"),
        besoin("rives", "rive", "longueur_coffrage * (regle.rives_par_ml + aretes) * regle.chute", "ml", "mobiiz-geometrie", regle_prop, precision="rives au mur et au plafond, profilé à chaque arête basse", short="profilés de rive"),
        *fixations_rail("longueur_coffrage * regle.rives_par_ml"),
        besoin("vis-ttpc-25", "vis", "surface_plaques * regle.vis_par_m2", "u", "snip-fc18", OK2("Ratio au m² (SNIP)."), short="vis"),
        besoin("bande-armee", "bande_armee", "longueur_coffrage * aretes * regle.chute", "ml", "placo-integrale-2023-bande", OK2("Bande armée obligatoire sur chaque angle saillant : NF DTU 25.41 § 6.1.4.2.3 (cité par Knauf) et Siniat ; longueur = géométrie (recherche/05, 12)."), short="bande armée", precision="une par arête saillante"),
        *besoins_finitions("surface_plaques"),
    ]
    slots = [{"key": "coffrage", "family": "boxing", "label": "Coffrage", "measureOnly": True},
             slot("plaque", "plasterboard", "Plaques", "plaque-ba13", "BA13 1,20 × 2,50 m.", "placo-ba13", "coffrage", ["plaque", "ba13"]),
             slot("rive", "perimeter_angle", "Profilés de rive", "corniere-cr2", "Cornière ou rail de 3 m.", "placo-cr2", "coffrage", ["corniere", "rail"]),
             *slots_fixation("coffrage"),
             slot("vis", "screw_board", "Vis TTPC 25", "vis-ttpc-25", "TTPC 25.", "gypso-vis", "coffrage", ["ttpc"]),
             slot("bande_armee", "corner_tape", "Bande armée d'angle", "bande-armee", "Bande armée, rouleau de 30 m.", "placo-integrale-2023-bande", "coffrage", ["bande armee", "cornière d'angle"]),
             *slots_finitions()]
    return {"id": "coffrage", "trade": TRADE, "section": "singulier", "label": "Coffrage, soffite, caisson, habillage de poutre",
            "triggers": ["boxing"], "params": params, "slots": slots, "constants": c, "derived": derived, "needs": needs}



def referentiel():
    cl = coupe_feu(cloison(), ["plaques", "montants", "rails", "vis-ttpc-25", "vis-ttpc-35", "vis-trpf", "isolant"],
                   {"rails": "Rails R{montant|mm#}, longueur 3 m", "vis-ttpc-25": "Vis TTPC 25", "vis-ttpc-35": "Vis TTPC 35", "vis-trpf": "Vis TRPF 13", "isolant": "Laine minérale 45 mm"})
    pl = coupe_feu(plafond(), ["plaques", "fourrures", "suspentes-longues", "suspentes-secables", "eclisses", "corniere", "vis-ttpc-25", "vis-ttpc-35"],
                   {"fourrures": "Fourrures, longueur 3 m", "suspentes-longues": "Suspentes longues", "suspentes-secables": "Suspentes sécables", "eclisses": "Éclisses de fourrure", "corniere": "Cornières de rive, longueur 3 m", "vis-ttpc-25": "Vis TTPC 25", "vis-ttpc-35": "Vis TTPC 35"}, plafond_rei=True)
    for w in (cl, pl):
        w["params"] = [dict(x, default=TYPE_PLAQUE_FEU_DEFAUT) if x["key"] == "type_plaque" else x for x in w["params"]]
    # Cloison coupe-feu en 72/48 : laine minérale obligatoire (Placo RS 15-019 / 15-020, Siniat EFR-24-005466, Knauf 06-V-263).
    PRODUCTS.append(produit("laine-minerale-pv", "insulation", "Laine minérale 45 mm du système coupe-feu (selon son procès-verbal)", "Laine minérale 45 mm (PV)",
                            [{"id": "m2", "label": {"one": "m²", "many": "m²"}, "contains": un(1, "m2"), "primary": True}], ["laine minerale pv"]))
    cl["slots"].append(slot("laine_feu", "insulation", "Laine minérale du système coupe-feu", "laine-minerale-pv", "Laine minérale 45 mm exigée par le PV.", "placo-pv-feu", "cloison", ["laine minerale"]))
    cl["needs"] = [dict(n, when=_quand(n.get("when"), "couches >= 2")) if n["id"] == "isolant-feu" else n for n in cl["needs"]]
    cl["needs"].append(besoin("laine-feu", "laine_feu", "surface * regle.isolant_par_m2", "m2", "placo-pv-feu", OK2("Laine minérale 45 mm obligatoire en 72/48 coupe-feu : Placo (RS 15-019, RS 15-020), Siniat (LV 45, EFR-24-005466), Knauf (« avec laine minérale uniquement »), recherche/11 §4.1 point 3."),
                              when="si(ei >= 1, si(couches < 2, 1, 0), 0)", precisionRequires=["marque_systeme"], designation="Laine minérale 45 mm {marque_systeme} (selon le PV)", short="laine du système coupe-feu"))
    # Plafond coupe-feu : deux plaques par défaut (REI 60 : Placo PRF 2 Placoflam, Siniat 2 Prégyflam) ; peau visible vissée à 15 cm.
    # Plafond coupe-feu : le nombre de plaques reste lu au devis (une valeur par défaut calculée laisserait la 2e peau « possible » dans les conditions du moteur).
    PRODUCTS.append(produit("entretoise-prf", "splice", "Entretoise Stil Flam Placo (montage plafond feu Placo, remplace le PRF)", "Entretoises Stil Flam Placo", piece("entretoise", "entretoises"), ["entretoise prf"]))
    pl["slots"].append(slot("entretoise_prf", "splice", "Entretoises PRF", "entretoise-prf", "Entretoises PRF tous les 0,60 m (montage feu Placo).", "placo-pv-feu", "plafond", ["entretoise"]))
    pl["constants"]["entretoises_prf"] = regle("1.3", "u/m2", "placo-pv-feu", DOUTE("Le système PRF n'est plus vendu : Placo l'a remplacé par Stil Flam, entretoises tous les 1,20 m, « deux fois moins » qu'avant (Offre Placo 2024, fiche produit du 18/12/2023) ; 1,3/m² = la moitié des 2,6 du PRF, calcul non écrit par Placo (recherche/17 n° 3). Règle changée : avant 2,6."), label="{v} entretoises par m²")
    pl["needs"].append(besoin("entretoises-prf", "entretoise_prf", "surface * regle.entretoises_prf", "u", "placo-pv-feu", OK2("Formule : le ratio au m² × la surface ; l'état du chiffre est celui de son ratio (constante)."),
                              when="si(ei >= 1, si(marque_systeme < 2, 1, 0), 0)", precisionRequires=["marque_systeme"], short="entretoises PRF", precision="montage feu Placo Stil Flam, une entretoise tous les 1,20 m"))
    pl["constants"]["vis_feu"] = regle("23", "u/m2", "placo-pv-feu", UNE("Montage feu PRF : peau visible vissée tous les 15 cm, jusqu'à 23 vis/m² (Placo Intégrale Plafonds 2023 p. 104) ; Siniat et Knauf : vissage dans le PV, non publié."), label="{v} vis par m² (montage feu)")
    pl["needs"] = [dict(n, formula="surface * regle.vis_feu") if n["id"] == "vis-ttpc-35-feu" else n for n in pl["needs"]]
    work_items = [cl, separative(), doublage_colle(), doublage_fourrures(), contre_cloison(), pl, joints(), isolation_rouleaux(), soufflage(), pare_vapeur(), coffrage()]
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
