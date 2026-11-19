"""Construit la FICHE COUVERTURE unique à partir de la recherche (`recherche/*.json`).

Sortie :
  - fiche-couverture.json : la base, classée famille > sous-famille > marque > modèle, chaque chiffre avec sa
    valeur, son unité, sa condition, son statut et ses sources (renvoi à la liste `sources`). C'est le fichier
    que le code lit.
  - carte-regions.json : la carte des régions, à part (départements, zones, habitudes ; communes quand elles
    existent).
  - fiche-couverture.md : la même base en tableaux lisibles, pour la relecture du fondateur.

Le format est commun à tous les métiers (voir `docs/format-base-metier.md`) : rien n'y est propre à la
couverture, sauf les données.

Usage : python3 -I construire_fiche.py   (depuis ce dossier)
"""
import collections
import json
import os
import re

ICI = os.path.dirname(os.path.abspath(__file__))
RECH = os.path.join(ICI, "recherche")

VERSION = "couverture-2026.11.19-1"
FAMILLES = [
    # code, libellé, fichier de recherche, filtre sur le champ « famille »
    ("ardoise", "Ardoises", "ardoise.json", None),
    ("tuile_emboitement", "Tuiles à emboîtement et à glissement", "tuiles-emboitement.json", None),
    ("tuile_plate", "Tuiles plates", "tuiles-plates-canal-beton.json", "tuile_plate"),
    ("tuile_canal", "Tuiles canal", "tuiles-plates-canal-beton.json", "tuile_canal"),
    ("tuile_romane", "Tuiles romanes", "tuiles-plates-canal-beton.json", "tuile_romane"),
    ("tuile_beton", "Tuiles béton", "tuiles-plates-canal-beton.json", "tuile_beton"),
    ("points_singuliers", "Faîtages, arêtiers, rives, égouts, noues, ventilation", "points-singuliers.json", None),
    ("zinguerie", "Zinguerie et évacuation des eaux pluviales", "zinguerie.json", None),
    ("ecran", "Écrans sous toiture", "ecrans-etancheite.json", "ecran"),
    ("etancheite", "Étanchéité de toiture", "ecrans-etancheite.json", "etancheite"),
    ("bois_couverture", "Bois de couverture", "bois.json", None),
]
CONFIRME = ("confirme", "confirme_fabricant")

# Un chiffre sans marque propre est une RÈGLE de la sous-famille (DTU, calcul, recoupement de plusieurs marques).
GENERIQUE = re.compile(r"^(|tous|toutes.*|\(.*\)|générique.*|dtu.*|.*,.*|.*/.*)$", re.I)
GROUPES = {"Koramic (Wienerberger)": ("Koramic", "Wienerberger"), "Terreal (Wienerberger)": ("Terreal", "Wienerberger"),
           "Terreal": ("Terreal", "Wienerberger"), "Wienerberger": ("Wienerberger", "Wienerberger"),
           "Monier (BMI)": ("Monier", "BMI"), "BMI Monier": ("Monier", "BMI"), "Cedral (Etex)": ("Cedral", "Etex")}


def charge(nom):
    with open(os.path.join(RECH, nom), encoding="utf-8") as f:
        return json.load(f)


class Sources:
    """Liste unique des sources : une par URL (ou par titre sans URL), renvoyée par son identifiant."""

    def __init__(self):
        self.par_cle, self.liste = {}, []

    def id(self, s):
        cle = (s.get("url") or "").strip() or (s.get("titre") or "").strip()
        if cle not in self.par_cle:
            sid = f"S{len(self.liste) + 1}"
            self.par_cle[cle] = sid
            self.liste.append({"id": sid, "titre": s.get("titre"), "url": s.get("url"), "type": s.get("type"),
                               "consulte": s.get("consulte")})
        return self.par_cle[cle]


# Un seul nom par donnée, d'une famille à l'autre (testeur-négoce, 19/11/2026 : « tuiles au m² » contre
# « tuiles_par_m2 »). Le libellé d'origine reste dans `libelle_source`.
SYNONYMES = {
    "tuiles au m²": "tuiles_par_m2", "tuiles de couvert au m² (couvert seul)": "couverts_par_m2",
    "tuiles au m² (courants ou couverts seuls)": "couverts_par_m2", "courants au m²": "courants_par_m2",
    "couverts au m²": "couverts_par_m2", "courants + couverts au m²": "tuiles_par_m2",
    "liteaux au m²": "liteaux_ml_par_m2", "largeur utile": "largeur_utile", "poids unitaire": "poids_unitaire",
    "tuiles par palette": "tuiles_par_palette", "pente minimale": "pente_minimale", "pente_mini_fiche": "pente_minimale",
    "pente minimale sans écran": "pente_minimale_sans_ecran", "norme d'application": "dtu",
    "faîtières au ml": "faitieres_par_ml", "faitieres_et_accessoires_par_ml": "faitieres_par_ml",
    "longueur hors tout": "longueur_hors_tout", "dimensions hors tout": "dimensions_hors_tout",
    "existence au catalogue": "existence_au_catalogue", "poids unitaire / au m²": "poids_unitaire_et_au_m2",
    "longueur × largeur hors tout (largeur utile)": "dimensions_et_largeur_utile",
    "tuile_rive_par_ml_et_par_cote": "rives_par_ml_et_par_cote", "ardoises_m2": "ardoises_par_m2",
}


def nom_attribut(a):
    a = SYNONYMES.get(a, a)
    a = a.lower()
    for x, y in (("é", "e"), ("è", "e"), ("ê", "e"), ("à", "a"), ("â", "a"), ("î", "i"), ("ô", "o"), ("û", "u"),
                 ("ç", "c"), ("²", "2"), ("×", "x"), ("œ", "oe")):
        a = a.replace(x, y)
    return re.sub(r"[^a-z0-9]+", "_", a).strip("_")


def valeur(e, src):
    v = {"id": e["id"], "attribut": nom_attribut(e["attribut"]), "valeur": e.get("valeur"), "unite": e.get("unite"),
         "statut": e["statut"], "sources": [src.id(s) for s in e.get("sources", [])]}
    if v["attribut"] != e["attribut"]:
        v["libelle_source"] = e["attribut"]
    for k in ("condition", "regions", "ecart", "raison", "controle", "reference", "details"):
        if e.get(k) not in (None, "", []):
            v[k] = e[k]
    # Extrait court de chaque source, gardé avec le chiffre (la preuve), pas dans la liste des sources.
    ex = [{"source": src.id(s), "extrait": s["extrait"]} for s in e.get("sources", []) if s.get("extrait")]
    if ex:
        v["preuves"] = ex
    return v


MOTS_FAMILLE = [("tuile_canal", r"canal|bardelis|courant|couvert"), ("tuile_plate", r"plate"),
                ("tuile_romane", r"romane"), ("tuile_beton", r"b[ée]ton|monier"),
                ("etancheite", r"[ée]tanch|membrane|bitum|primaire|isolant|epdm|pvc|sbs|relev|terrasse|pare-vapeur|autoprot|[ée]querre|2e couche|eep|eaux pluviales|trop-plein|crapaudine"),
                ("ecran", r"[ée]cran|hpv|contre-liteau|adh[ée]sif|larmier")]


def famille_de(texte, soeurs):
    """La famille d'un verdict ou d'une rubrique comptoir parmi celles d'un même fichier ; la première par défaut."""
    if len(soeurs) == 1:
        return soeurs[0]
    t = texte.lower()
    for code, motif in MOTS_FAMILLE:
        if code in soeurs and re.search(motif, t):
            return code
    return soeurs[0]


def construit():
    src = Sources()
    familles, stats = [], collections.Counter()
    for code, libelle, fichier, filtre in FAMILLES:
        d = charge(fichier)
        entrees = [e for e in d["entrees"] if filtre is None or e.get("famille") == filtre]
        sous = collections.OrderedDict()
        for e in entrees:
            sf = e.get("sous_famille") or libelle
            s = sous.setdefault(sf, {"nom": sf, "regles": [], "marques": collections.OrderedDict()})
            marque = (e.get("marque") or "").strip()
            modele = (e.get("modele") or "").strip()
            if not modele:
                r = valeur(e, src)
                if marque:
                    r["portee"] = marque
                s["regles"].append(r)
            else:
                # Un format sans marque (ardoise 32×22, plate 17×27) : un modèle « toutes marques », la portée gardée.
                nom, groupe = ("Toutes marques", "—") if GENERIQUE.match(marque) else GROUPES.get(marque, (marque, marque))
                m = s["marques"].setdefault(nom, {"nom": nom, "groupe": groupe, "modeles": collections.OrderedDict()})
                mo = m["modeles"].setdefault(modele, {"nom": modele, "attributs": []})
                v = valeur(e, src)
                if nom == "Toutes marques" and marque:
                    v["portee"] = marque
                mo["attributs"].append(v)
            stats[(code, e["statut"])] += 1
        fam = {"code": code, "libelle": libelle, "sous_familles": []}
        for s in sous.values():
            s["marques"] = [{**m, "modeles": list(m["modeles"].values())} for m in s["marques"].values()]
            fam["sous_familles"].append(s)
        # Verdicts et comptoir : chacun sous SA famille quand le fichier en couvre plusieurs (mots de l'article ou du ratio).
        soeurs = [c for c, l, fi, f in FAMILLES if fi == fichier]
        fam["verdicts"] = [{**v, "sources": [src.id(s) for s in v.get("sources", [])]} for v in d.get("verdict_ratios", [])
                           if famille_de(v.get("ratio", "") + " " + v.get("origine", ""), soeurs) == code]
        fam["comptoir"] = [{**c, "sources": [src.id(s) for s in c.get("sources", [])]} for c in d.get("commande_comptoir", [])
                           if famille_de(c.get("article", ""), soeurs) == code]
        if code == soeurs[0]:
            for k in ("regle_arrondi", "regle_confirmation", "perimetre", "note_format"):
                if d.get(k):
                    fam[k] = d[k]
        familles.append(fam)

    regions = charge("regions.json")
    carte = {"version": VERSION, "definitions_zones": regions.get("definitions_zones"),
             "avertissements": regions.get("avertissements"),
             "departements": [{**e, "sources": [src.id(s) for s in e.get("sources", [])]} for e in regions["entrees"]],
             "verdict_section26": regions.get("verdict_section26"), "verdict_zone_ts": regions.get("verdict_zone_ts")}
    communes = os.path.join(RECH, "communes")
    if os.path.isdir(communes):
        carte["communes"] = sorted(f for f in os.listdir(communes) if f.endswith(".json"))
    rst = collections.Counter(e["statut"] for e in regions["entrees"])
    carte["taux_confirme"] = round(100 * sum(n for st, n in rst.items() if st in CONFIRME) / max(1, len(regions["entrees"])), 1)

    # Constantes de calcul lues par le code : chacune prouvée par des chiffres CONFIRMÉS de la fiche.
    ids = {}
    for fa in familles:
        for so in fa["sous_familles"]:
            for r in so["regles"]:
                ids[r["id"]] = r
            for m in so["marques"]:
                for mo in m["modeles"]:
                    for a in mo["attributs"]:
                        ids[a["id"]] = a
    with open(os.path.join(ICI, "constantes.json"), encoding="utf-8") as f:
        constantes = json.load(f)["constantes"]
    for c in constantes:
        for p in c["preuves"]:
            if p not in ids:
                raise SystemExit(f"constante {c['cle']} : preuve inconnue {p}")
            if ids[p]["statut"] not in CONFIRME:
                raise SystemExit(f"constante {c['cle']} : la preuve {p} n'est pas confirmée ({ids[p]['statut']})")
        c["statut"] = "confirme"

    total = sum(stats.values())
    conf = sum(n for (c, s), n in stats.items() if s in CONFIRME)
    fiche = {
        "fiche": "couverture", "metier": "roofing", "nom": "Couverture, zinguerie, étanchéité, bois de couverture",
        "version": VERSION, "etat": "en validation",
        "regle_confirmation": ("confirme : deux sources indépendantes, dont un fabricant ou un DTU quand c'est possible ; "
                               "confirme_fabricant : fiche officielle du fabricant, sur son domaine, datée, et contrôle "
                               "par le calcul du modèle (décision du fondateur, 19/11/2026) ; une_source ; a_confirmer."),
        "regles_fondateur": "../../../.claude/skills/regles-metier/SKILL.md",
        "carte_regions": "carte-regions.json",
        "taux_confirme": round(100 * conf / total, 1),
        "comptes": {f"{c}:{s}": n for (c, s), n in sorted(stats.items())},
        "constantes": constantes,
        "familles": familles,
        "sources": src.liste,
    }
    return fiche, carte


def md(fiche, carte):
    L = [f"# Fiche couverture ({fiche['version']}, {fiche['etat']})", "",
         "Fichier GÉNÉRÉ par `construire_fiche.py` depuis `recherche/` : ne pas modifier à la main.", "",
         f"Taux de chiffres confirmés : **{fiche['taux_confirme']} %**. Règle : {fiche['regle_confirmation']}", ""]
    for f in fiche["familles"]:
        L += [f"## {f['libelle']}", ""]
        for s in f["sous_familles"]:
            L += [f"### {s['nom']}", ""]
            if s["regles"]:
                L += ["| Règle | Valeur | Condition | Statut |", "|---|---|---|---|"]
                for r in s["regles"]:
                    obj = f"{r.get('objet', '')} : " if r.get("objet") else ""
                    L.append(f"| {obj}{r['attribut']} | {r['valeur']} {r.get('unite') or ''} | {r.get('condition', '')} | {r['statut']} |"
                             .replace("\n", " "))
                L.append("")
            for m in s["marques"]:
                for mo in m["modeles"]:
                    attrs = "; ".join(f"{a['attribut']} {a['valeur']} {a.get('unite') or ''}".strip() for a in mo["attributs"]
                                      if not isinstance(a["valeur"], (list, dict)))
                    st = collections.Counter(a["statut"] for a in mo["attributs"])
                    L.append(f"- **{m['nom']} {mo['nom']}** ({', '.join(f'{k} {v}' for k, v in st.items())}) : {attrs}"
                             .replace("\n", " "))
            L.append("")
    L += ["## Carte des régions", "", "Voir `carte-regions.json` (et `recherche/regions.md` pour la page lisible).", ""]
    return "\n".join(L)


if __name__ == "__main__":
    fiche, carte = construit()
    with open(os.path.join(ICI, "fiche-couverture.json"), "w", encoding="utf-8") as f:
        json.dump(fiche, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(os.path.join(ICI, "carte-regions.json"), "w", encoding="utf-8") as f:
        json.dump(carte, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(os.path.join(ICI, "fiche-couverture.md"), "w", encoding="utf-8") as f:
        f.write(md(fiche, carte))
    n = sum(len(mo["attributs"]) for fa in fiche["familles"] for s in fa["sous_familles"] for m in s["marques"] for mo in m["modeles"])
    nm = sum(len(m["modeles"]) for fa in fiche["familles"] for s in fa["sous_familles"] for m in s["marques"])
    nr = sum(len(s["regles"]) for fa in fiche["familles"] for s in fa["sous_familles"])
    print(f"fiche {fiche['version']} : {len(fiche['familles'])} familles, {nm} modèles ({n} chiffres), {nr} règles, "
          f"{len(fiche['sources'])} sources, {fiche['taux_confirme']} % confirmé ; {len(carte['departements'])} départements")
