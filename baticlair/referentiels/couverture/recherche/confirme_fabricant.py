"""Applique la règle du fondateur (19/11/2026) : une valeur propre à un modèle est « confirme_fabricant »
quand elle vient de la fiche officielle du fabricant (sur son domaine) ET que le modèle passe le contrôle par
le calcul (tuiles/m² = 1 / (largeur utile × pureau) à 3 % près ou à l'arrondi publié ; liteaux/m² = 1 / pureau)."""
import json, re, sys, collections
from urllib.parse import urlparse

FAB_DOMAINS = ("edilians.com", "terreal.com", "wienerberger.fr", "wienerberger.com", "koramic", "monier", "bmigroup",
               "bmi-", "cupapizarras", "rathscheck", "vmzinc", "onduline", "cedral", "eternit", "siplast", "soprema")

def nums(v):
    if isinstance(v, (int, float)): return [float(v)]
    if isinstance(v, str): return [float(n.replace(",", ".")) for n in re.findall(r"\d+(?:[.,]\d+)?", v)]
    return []

def num(v):
    n = nums(v)
    return n[0] if n else None

def fab_source(x):
    for s in x.get("sources", []):
        host = urlparse(s.get("url") or "").netloc.lower()
        if s.get("type") == "fabricant" and any(k in host for k in FAB_DOMAINS): return s
    return None

def close(calc, pub):
    return abs(calc - pub) / pub <= 0.03 or (float(pub).is_integer() and abs(calc - pub) < 0.5)

def checks_for(entries):
    """Rend (passés, ratés) : liste de textes."""
    a = collections.defaultdict(list)
    for x in entries: a[x["attribut"].lower()].append(x)
    ok, ko = [], []
    def first(*names):
        for n in names:
            for x in a.get(n, []):
                v = num(x["valeur"])
                if v: return v
        return None
    lus = []
    for n in ("largeur_utile", "largeur utile"):
        for x in a.get(n, []):
            lus = lus or nums(x["valeur"])
    lus = [v for v in lus if 100 < v < 600]
    for p, t in [("pureau", "tuiles_par_m2"), ("pureau_max", "tuiles_par_m2_min"), ("pureau_min", "tuiles_par_m2_max"),
                 ("pureau", "tuiles au m²")]:
        pv, tv = first(p), first(t)
        if lus and pv and tv:
            lo, hi = 1e6 / (max(lus) * pv), 1e6 / (min(lus) * pv)
            good = (lo * 0.97 <= tv <= hi * 1.03) or close(lo, tv) or close(hi, tv)
            txt = f"{lo:.2f}" if lo == hi else f"{lo:.2f} à {hi:.2f}"
            (ok if good else ko).append(f"{t} : calcul 1/(largeur utile {'-'.join(f'{v:g}' for v in sorted(set(lus)))} × pureau {pv:g}) = {txt}, fiche {tv:g}")
    # nombre au m² unique publié pour une plage de pureau (Koramic : au pureau maxi) : il doit tomber dans la plage
    pmin, pmax, tv = first("pureau_min"), first("pureau_max"), first("tuiles_par_m2")
    if lus and pmin and pmax and tv and not first("pureau"):
        lo, hi = 1e6 / (max(lus) * pmax), 1e6 / (min(lus) * pmin)
        (ok if lo * 0.97 <= tv <= hi * 1.03 else ko).append(f"tuiles_par_m2 : plage calculée 1/(largeur utile × pureau {pmin:g} à {pmax:g}) = {lo:.2f} à {hi:.2f}, fiche {tv:g}")
    # liteaux = 1 / pureau (pureau lu, ou longueur − recouvrement lu dans la condition)
    L = first("longueur hors tout")
    for x in a.get("liteaux_ml_par_m2", []) + a.get("liteaux au m²", []):
        vs = nums(x["valeur"])
        if len(vs) >= 2 and first("pureau_min") and first("pureau_max"):
            for v, pv in ((vs[0], first("pureau_min")), (vs[1], first("pureau_max"))):
                calc = 1000 / pv
                (ok if close(calc, v) else ko).append(f"liteaux : calcul 1/{pv:g} = {calc:.2f} ml/m², fiche {v:g}")
            continue
        v = vs[0] if vs else None
        if not v: continue
        cond = x.get("condition") or ""
        mp = re.search(r"pureau\s*(?:de\s*)?(\d+)", cond); mr = re.search(r"recouvrement\s*(\d+)", cond)
        pv = float(mp.group(1)) if mp else (L - float(mr.group(1)) if (L and mr) else first("pureau", "pureau_max"))
        if pv and pv < 60: pv *= 10  # pureau écrit en cm
        if pv:
            calc = 1000 / pv
            (ok if close(calc, v) else ko).append(f"liteaux : calcul 1/{pv:g} = {calc:.2f} ml/m², fiche {v:g}")
    return ok, ko

def apply(path):
    d = json.load(open(path)); e = d["entrees"]
    by = collections.defaultdict(list)
    for x in e: by[(x.get("marque"), x.get("modele"))].append(x)
    stats = collections.Counter()
    for k, xs in by.items():
        ok, ko = checks_for(xs)
        for x in xs:
            if x.get("statut") != "une_source" or not fab_source(x): continue
            if ok and not ko:
                x["statut"] = "confirme_fabricant"
                x["controle"] = ok
                stats["confirme_fabricant"] += 1
            else:
                x["controle"] = ok + [f"ÉCHEC {c}" for c in ko] if (ok or ko) else ["contrôle impossible : largeur utile, pureau ou nombre au m² absent de la fiche"]
                stats["reste_une_source"] += 1
    d.setdefault("regle_confirmation", "confirme_fabricant = fiche officielle du fabricant, sur son domaine, datée + contrôle par le calcul du modèle (1/(largeur utile × pureau) à 3 % ou à l'arrondi publié ; liteaux = 1/pureau). Décision du fondateur, 19/11/2026.")
    json.dump(d, open(path, "w"), ensure_ascii=False, indent=1)
    print(path, dict(stats), dict(collections.Counter(x["statut"] for x in e)))

for p in sys.argv[1:]: apply(p)
