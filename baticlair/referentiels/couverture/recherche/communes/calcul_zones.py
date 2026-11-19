#!/usr/bin/env python3
"""Zone climatique de couverture PAR COMMUNE (décision du fondateur du 19 novembre 2026).

Calcule pour chaque commune : distance de la mairie à la mer, altitude, zone ardoise
(NF DTU 40.11 P1-1, déc. 2020, annexe B), zone tuile (NF DTU 40.21 P1-1, oct. 2013,
annexe B), situation exposée probable, région de vent et région de neige (annexes
nationales Eurocode 1). Bibliothèque standard Python seulement ; les fichiers
téléchargés ne sont que lus (jamais exécutés). Lancer avec `python3 -I`.

Exemple (voir README.md pour les sources) :
  python3 -I calcul_zones.py \
    --communes dg/communes-france-2026.csv \
    --polygones dg/communes-france-avec-polygon-2026.geojson \
    --trait-cote cote/TCH \
    --ltm ltm/x/LTM/LTM_METROPOLE_rgf \
    --alti-ign alti/alti_mairie_ign.json \
    --littoral-bzh littoral/bzh_littoral.json \
    --cog-2011 cog/comsimp2011.txt --mvt cog/cog2025/v_mvt_commune_2025.csv \
    --regions ../regions.json \
    --departements 22,29,35,56,44 --sortie bretagne-44.json

Règles appliquées (définitions de l'annexe B, vérifiées sur deux sources : copie du
DTU et guide fabricant ; le texte « seul fait foi », la carte est approximative) :
  côte « nord » = Atlantique de Lorient (rive ouest de la rade) à la Bretagne nord,
  Manche et mer du Nord ; côte « sud » = Atlantique de Lorient à l'Espagne ;
  côte « med » = Méditerranée et Corse.
  Tuile 40.21 : 3 si côte nord <= 20 km ou altitude > 500 m ; 2 si côte sud <= 20 km,
    ou côte nord 20-40 km, ou altitude 200-500 m ; 1 sinon (intérieur et côte
    méditerranéenne sous 200 m).
  Ardoise 40.11 : comme la tuile pour l'Atlantique, la Manche, la mer du Nord et
    l'altitude ; en plus zone 3 pour Provence, Languedoc, Roussillon, Corse et vallée
    du Rhône jusqu'à la pointe Isère-Drôme-Ardèche (approximation par département et
    par distance au Rhône, statut a_confirmer).
  On retient la plus sévère des règles. Les documents particuliers du marché (le
  devis) priment toujours.
"""
import argparse, collections, csv, json, math, re, struct, sys, unicodedata

# ---------------------------------------------------------------- projection
A, E = 6378137.0, 0.0818191910428158
N_L93, C_L93, XS, YS = 0.7256077650532670, 11754255.426096, 700000.0, 12655612.049876


def l93(lon, lat):
    """Lon/lat (RGF93 ~ WGS84, degrés) -> Lambert-93 (m)."""
    p = math.radians(lat)
    li = math.log(math.tan(math.pi / 4 + p / 2) * ((1 - E * math.sin(p)) / (1 + E * math.sin(p))) ** (E / 2))
    r = C_L93 * math.exp(-N_L93 * li)
    g = N_L93 * math.radians(lon - 3.0)
    return XS + r * math.sin(g), YS - r * math.cos(g)


# ---------------------------------------------------------------- shapefile
def read_dbf(path, enc="latin-1"):
    d = open(path, "rb").read()
    n = struct.unpack("<I", d[4:8])[0]
    hl, rl = struct.unpack("<HH", d[8:12])
    fields, i = [], 32
    while d[i] != 0x0D:
        fields.append((d[i:i + 11].split(b"\0")[0].decode(), d[i + 16]))
        i += 32
    out = []
    for k in range(n):
        r = d[hl + k * rl + 1:hl + (k + 1) * rl]
        o, rec = 0, {}
        for f, ln in fields:
            rec[f] = r[o:o + ln].decode(enc, "replace").strip()
            o += ln
        out.append(rec)
    return out


def read_shp(path):
    """Polylignes / points d'un .shp (types 1, 3, 11, 13) -> liste de listes de parties."""
    s = open(path, "rb").read()
    pos, geoms = 100, []
    while pos < len(s):
        _, clen = struct.unpack(">ii", s[pos:pos + 8])
        c = s[pos + 8:pos + 8 + clen * 2]
        pos += 8 + clen * 2
        st = struct.unpack("<i", c[:4])[0]
        if st in (1, 11):
            geoms.append([[struct.unpack("<2d", c[4:20])]])
        elif st in (3, 13, 5, 15):
            npart, npts = struct.unpack("<ii", c[36:44])
            parts = list(struct.unpack("<%di" % npart, c[44:44 + 4 * npart])) + [npts]
            o = 44 + 4 * npart
            pts = struct.unpack("<%dd" % (2 * npts), c[o:o + 16 * npts])
            geoms.append([[(pts[2 * j], pts[2 * j + 1]) for j in range(parts[q], parts[q + 1])]
                          for q in range(npart)])
        else:
            geoms.append([])
    return geoms


# ---------------------------------------------------------------- géométrie
def seg_inter(p1, p2, p3, p4):
    def cr(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    d1, d2, d3, d4 = cr(p3, p4, p1), cr(p3, p4, p2), cr(p1, p2, p3), cr(p1, p2, p4)
    return (d1 * d2 < 0) and (d3 * d4 < 0)


def dist_seg(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def point_in_ring(x, y, ring):
    c = False
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]; x2, y2 = ring[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


class Grid:
    """Index de points par cases carrées ; plus proche voisin par anneaux."""

    def __init__(self, pts, cell=5000.0):
        self.cell, self.g = cell, collections.defaultdict(list)
        for p in pts:
            self.g[(int(p[0] // cell), int(p[1] // cell))].append(p)

    def nearest(self, x, y, rmax=80000.0):
        cx, cy, best, bp = int(x // self.cell), int(y // self.cell), float("inf"), None
        k = 0
        while k * self.cell <= rmax + self.cell:
            if best < (k - 1) * self.cell:
                break
            for i in range(cx - k, cx + k + 1):
                for j in (range(cy - k, cy + k + 1) if i in (cx - k, cx + k) else (cy - k, cy + k)):
                    for p in self.g.get((i, j), ()):
                        d = (p[0] - x) ** 2 + (p[1] - y) ** 2
                        if d < best * best:
                            best, bp = math.sqrt(d), p
            k += 1
        return (best if best <= rmax else None), bp


# ---------------------------------------------------------------- trait de côte
LORIENT_X = 223000.0   # Lambert-93 : entre Larmor-Plage (rive ouest) et Port-Louis (rive est)
LORIENT_YMAX = 6770000.0


def classe_cote(x, y):
    if y < 6350000 and x > 600000:
        return "med"           # Méditerranée continentale et Corse
    if x >= LORIENT_X and y < LORIENT_YMAX:
        return "sud"           # Atlantique de Lorient à l'Espagne
    return "nord"              # Atlantique jusqu'à Lorient, Manche, mer du Nord


def charge_cote(base_tch, base_ltm, pas=100.0):
    """Trait de côte Histolitt découpé aux limites transversales de la mer (SHOM).

    Renvoie (points mer par classe, points d'estuaire, anneaux d'îles)."""
    recs, geoms = read_dbf(base_tch + ".dbf"), read_shp(base_tch + ".shp")
    key = lambda p: (round(p[0]), round(p[1]))
    parent = {}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    edges = []
    for g in geoms:
        for part in g:
            for i in range(len(part) - 1):
                edges.append((key(part[i]), key(part[i + 1])))
    # coupures : arcs LTM (segments) et points LTM (disque de rayon adapté)
    cuts = []
    for g in read_shp(base_ltm + "_arc.shp"):
        for part in g:
            for i in range(len(part) - 1):
                (x1, y1), (x2, y2) = part[i], part[i + 1]
                dx, dy = x2 - x1, y2 - y1
                L = math.hypot(dx, dy) or 1
                ext = 30.0 / L      # prolonge de 30 m pour toucher les deux rives
                cuts.append(("seg", (x1 - dx * ext, y1 - dy * ext), (x2 + dx * ext, y2 + dy * ext)))
    allv = list({p for e in edges for p in e})
    gv = Grid(allv, 2000.0)
    for g in read_shp(base_ltm + "_point.shp"):
        x, y = g[0][0]
        d, _ = gv.nearest(x, y, 3000)
        if d is not None:
            cuts.append(("disk", (x, y), min(1500.0, 2.0 * d + 60.0)))
    # index des coupures par case
    cutgrid = collections.defaultdict(list)
    for ci, c in enumerate(cuts):
        if c[0] == "seg":
            xs, ys = (c[1][0], c[2][0]), (c[1][1], c[2][1])
            r = 0
        else:
            xs, ys, r = (c[1][0],), (c[1][1],), c[2]
        for i in range(int((min(xs) - r) // 2000), int((max(xs) + r) // 2000) + 1):
            for j in range(int((min(ys) - r) // 2000), int((max(ys) + r) // 2000) + 1):
                cutgrid[(i, j)].append(ci)
    kept, touch = [], collections.defaultdict(set)
    for a, b in edges:
        cand = set(cutgrid.get((int(a[0] // 2000), int(a[1] // 2000)), ())) | set(
            cutgrid.get((int(b[0] // 2000), int(b[1] // 2000)), ()))
        hit = None
        for ci in cand:
            c = cuts[ci]
            if c[0] == "seg" and seg_inter(a, b, c[1], c[2]):
                hit = ci; break
            if c[0] == "disk" and dist_seg(c[1], a, b) <= c[2]:
                hit = ci; break
        if hit is None:
            kept.append((a, b))
        else:
            touch[hit].update((a, b))
    for a, b in kept:
        parent.setdefault(a, a); parent.setdefault(b, b)
    for p in allv:
        parent.setdefault(p, p)
    for a, b in kept:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    length, deg = collections.Counter(), collections.Counter()
    for a, b in kept:
        length[find(a)] += math.hypot(a[0] - b[0], a[1] - b[1])
        deg[a] += 1; deg[b] += 1
    estuaire = set()
    for ci, pts in touch.items():
        comps = {find(p) for p in pts}
        if len(comps) < 2:
            continue
        mer = max(comps, key=lambda c: length[c])
        estuaire.update(c for c in comps if c != mer)
    # Une composante d'estuaire très longue serait une erreur de topologie : on la garde en mer.
    estuaire = {c for c in estuaire if length[c] < 400000}
    # anneaux fermés courts = îles (pour la situation « île »)
    comp_pts = collections.defaultdict(list)
    for a, b in kept:
        comp_pts[find(a)].append((a, b))
    iles = []
    for c, es in comp_pts.items():
        if c in estuaire or length[c] > 300000 or length[c] < 300:
            continue
        nodes = {p for e in es for p in e}
        if all(deg[p] == 2 for p in nodes):
            adj = collections.defaultdict(list)
            for a, b in es:
                adj[a].append(b); adj[b].append(a)
            start = es[0][0]; ring = [start]; prev, cur = None, start
            while True:
                nx = adj[cur][0] if adj[cur][0] != prev else adj[cur][1]
                prev, cur = cur, nx
                ring.append(cur)
                if cur == start or len(ring) > len(nodes) + 2:
                    break
            xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
            iles.append(((min(xs), min(ys), max(xs), max(ys)), ring, length[c]))
    # points échantillonnés tous les `pas` mètres
    mer = {"nord": [], "sud": [], "med": []}
    est_pts = []
    for a, b in kept:
        c = find(a)
        L = math.hypot(a[0] - b[0], a[1] - b[1])
        n = max(1, int(L // pas))
        for k in range(n):
            t = k / n
            p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            (est_pts if c in estuaire else mer[classe_cote(*p)]).append(p)
    return mer, est_pts, iles, len(cuts)


# ---------------------------------------------------------------- vent / neige
VENT_44_R2 = {  # NF EN 1991-1-4/NA, tableau des cantons (TI C 3 306 tab. 2 ; VMZINC mémento 2025)
    "ANCENIS", "BLAIN", "CHATEAUBRIANT", "DERVAL", "GUEMENE-PENFAO", "LIGNE",
    "MOISDON-LA-RIVIERE", "NORT-SUR-ERDRE", "NOZAY", "RIAILLE", "ROUGE",
    "SAINT-JULIEN-DE-VOUVANTES", "SAINT-MARS-LA-JAILLE", "SAINT-NICOLAS-DE-REDON", "VARADES"}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", "-", s).strip("-")


def cantons_2011_vers_2026(cog2011, mvt, codes_2026):
    """{code commune 2026: {(dep, canton 2011)}} à partir du COG 2011 et des mouvements INSEE."""
    old = {}
    with open(cog2011, encoding="latin-1") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            old[r["DEP"] + r["COM"] if len(r["DEP"]) == 2 else r["DEP"][:2] + r["COM"]] = (r["DEP"], r["CT"])
    nxt = {}
    with open(mvt, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["DATE_EFF"] >= "2011-01-01" and r["COM_AV"] != r["COM_AP"] and r["TYPECOM_AP"] == "COM" \
                    and r["MOD"] in ("31", "32", "33", "34", "35", "41", "50"):
                nxt.setdefault(r["COM_AV"], r["COM_AP"])
    out = collections.defaultdict(set)
    for c, ct in old.items():
        seen = 0
        while c not in codes_2026 and c in nxt and seen < 10:
            c, seen = nxt[c], seen + 1
        out[c].add(ct)
    return out


def valeur_dep(regions, dep, cle):
    for e in regions["entrees"]:
        if e["code"] == dep:
            z = e["zones"][cle]
            return z.get("valeur"), z.get("statut"), z.get("sources", [])
    return None, None, []


# ---------------------------------------------------------------- zones DTU
ARDOISE_MED_DEPS = {"2A", "2B", "13", "83", "84", "30", "34", "11", "66"}   # Provence, Languedoc, Roussillon, Corse
ARDOISE_MED_A_VOIR = {"04", "06", "48", "26", "07"}   # limites de « Provence » / « Languedoc » / vallée du Rhône
RHONE = [(4.80, 45.30), (4.81, 45.10), (4.86, 44.93), (4.78, 44.72), (4.70, 44.55),
         (4.66, 44.30), (4.70, 44.10), (4.81, 43.95), (4.66, 43.70)]  # tracé simplifié, pointe Isère-Drôme-Ardèche -> Arles


def zone_cote(dn, ds, nord_label="côte de Lorient à la Belgique"):
    """Zone due à la mer, identique pour tuile et ardoise sur l'Atlantique, la Manche et la mer du Nord."""
    if dn is not None and dn <= 20:
        return 3, "%s à %.1f km (<= 20 km)" % (nord_label, dn)
    if ds is not None and ds <= 20:
        return 2, "côte atlantique de Lorient à l'Espagne à %.1f km (<= 20 km)" % ds
    if dn is not None and dn <= 40:
        return 2, "%s à %.1f km (bande 20-40 km)" % (nord_label, dn)
    return 1, "à plus de 20 km de la côte sud et 40 km de la côte nord"


def zone_alti(z):
    if z is None:
        return None, "altitude inconnue"
    if z > 500:
        return 3, "altitude %.0f m (> 500 m)" % z
    if z >= 200:
        return 2, "altitude %.0f m (200-500 m)" % z
    return 1, "altitude %.0f m (< 200 m)" % z


def main():
    ap = argparse.ArgumentParser()
    for a in ("communes", "trait-cote", "ltm", "alti-ign", "regions", "sortie"):
        ap.add_argument("--" + a, required=True)
    for a in ("polygones", "littoral-bzh", "cog-2011", "mvt", "departements"):
        ap.add_argument("--" + a)
    o = ap.parse_args()
    deps = set(o.departements.split(",")) if o.departements else None

    rows = [r for r in csv.DictReader(open(o.communes, encoding="utf-8"))
            if r["typecom"] == "COM" and (deps is None or r["dep_code"] in deps)
            and len(r["dep_code"]) <= 2]   # métropole et Corse (les DROM n'ont pas de zone DTU 40.x)
    codes = {r["code_insee"] for r in rows}
    alti = json.load(open(o.alti_ign))
    regions = json.load(open(o.regions, encoding="utf-8"))
    print("communes", len(rows), file=sys.stderr)

    mer, est, iles, ncuts = charge_cote(o.trait_cote, o.ltm)
    gm = {k: Grid(v) for k, v in mer.items()}
    ge = Grid(est)
    print("côte", {k: len(v) for k, v in mer.items()}, "estuaire", len(est), "îles", len(iles),
          "coupures LTM", ncuts, file=sys.stderr)

    polys = {}
    if o.polygones:
        for f in json.load(open(o.polygones, encoding="utf-8"))["features"]:
            c = f["properties"]["code_insee"]
            if c in codes and f["geometry"]:
                g = f["geometry"]
                rings = g["coordinates"] if g["type"] == "Polygon" else [r for p in g["coordinates"] for r in p]
                polys[c] = [[l93(*pt[:2]) for pt in ring] for ring in rings]

    litt = {}
    if o.littoral_bzh:
        for f in json.load(open(o.littoral_bzh, encoding="utf-8"))["features"]:
            litt[f["properties"]["Code_insee"]] = f["properties"]["Classement"]

    cant = {}
    if o.cog_2011 and o.mvt:
        cant = cantons_2011_vers_2026(o.cog_2011, o.mvt, codes)
        noms = {}
        base = o.cog_2011.replace("comsimp2011", "canton2011")
        try:
            for r in csv.DictReader(open(base, encoding="latin-1"), delimiter="\t"):
                noms[(r["DEP"], r["CANTON"])] = norm(r["NCC"])
        except OSError:
            pass

    rhone = [l93(*p) for p in RHONE]
    out = []
    for r in rows:
        c, dep = r["code_insee"], r["dep_code"]
        lat = float(r["latitude_mairie"] or r["latitude_centre"])
        lon = float(r["longitude_mairie"] or r["longitude_centre"])
        x, y = l93(lon, lat)
        dn, _ = gm["nord"].nearest(x, y)
        ds, _ = gm["sud"].nearest(x, y)
        dmed, _ = gm["med"].nearest(x, y)
        de, _ = ge.nearest(x, y, 20000)
        km = lambda d: None if d is None else round(d / 1000, 1)
        dn, ds, dmed, de = km(dn), km(ds), km(dmed), km(de)
        dmer = min([d for d in (dn, ds, dmed) if d is not None], default=None)
        # distance minimale du territoire communal (pour repérer les communes à cheval)
        dn_min = ds_min = None
        if c in polys and dmer is not None and dmer < 70:
            bn = bs = float("inf")
            for ring in polys[c]:
                for p in ring[::max(1, len(ring) // 200)]:
                    a, _ = gm["nord"].nearest(p[0], p[1], 45000)
                    b, _ = gm["sud"].nearest(p[0], p[1], 25000)
                    bn = min(bn, a if a is not None else bn)
                    bs = min(bs, b if b is not None else bs)
            dn_min = km(bn) if bn < float("inf") else None
            ds_min = km(bs) if bs < float("inf") else None
        z_ign = alti.get(c)
        f2 = lambda v: float(v) if v not in ("", None) else None
        zmoy, zmin, zmax = f2(r["altitude_moyenne"]), f2(r["altitude_minimale"]), f2(r["altitude_maximale"])
        z = z_ign if z_ign is not None else zmoy
        flags, statut = [], "calcule"

        zc, rc = zone_cote(dn, ds)
        za, ra = zone_alti(z)
        zt = max(zc, za or 1)
        regle_t = [rc, ra + (" (mairie, IGN RGE ALTI)" if z_ign is not None else " (moyenne communale)")]
        # commune à cheval sur une limite de bande
        if dn_min is not None or ds_min is not None:
            zc_min, _ = zone_cote(dn_min if dn_min is not None else dn, ds_min if ds_min is not None else ds)
            if zc_min > zc:
                flags.append("territoire communal à cheval : zone %d possible sur la partie la plus proche de la mer "
                             "(nord %.1f km / sud %s km au plus près)" % (zc_min, dn_min or -1, ds_min))
                statut = "limite"
        if zmin is not None and zmax is not None:
            zlo, zhi = zone_alti(zmin)[0], zone_alti(zmax)[0]
            if zhi > zt:
                flags.append("relief : altitude %d à %d m sur la commune, zone %d au-dessus de %s m"
                             % (zmin, zmax, zhi, "500" if zhi == 3 else "200"))
                statut = "limite"
            elif zlo < zt and za is not None and za == zt and za > zc:
                flags.append("relief : altitude %d à %d m sur la commune, zone %d seulement sous %s m"
                             % (zmin, zmax, max(zc, zlo), "200" if za == 2 else "500"))
                statut = "limite"
        if z is not None and zmoy is not None and z_ign is not None and abs(z_ign - zmoy) > 150:
            flags.append("altitude mairie (%.0f m) très différente de la moyenne communale (%.0f m)" % (z_ign, zmoy))
        if z is not None and z > 900:
            flags.append("altitude > 900 m : climat de montagne, hors climat de plaine visé par le DTU 40.11 ; vérifier le domaine d'application")
            statut = "a_confirmer"
        if dn is not None and ds is not None and dn <= 30 and ds <= 20 and abs(dn - 20) < 8:
            flags.append("près de la limite de Lorient (côte nord à %.1f km, côte sud à %.1f km)" % (dn, ds))
            statut = "limite" if statut == "calcule" else statut

        # ardoise : zone 3 méditerranéenne en plus
        zard, regle_a = zt, list(regle_t)
        if dep in ARDOISE_MED_DEPS:
            zard = 3
            regle_a.append("Provence / Languedoc / Roussillon / Corse (DTU 40.11 B.1.3), lu par département")
            if dep in ("30", "34", "11", "13", "84"):
                pass
        elif dep in ARDOISE_MED_A_VOIR:
            drh = min(dist_seg((x, y), rhone[i], rhone[i + 1]) for i in range(len(rhone) - 1)) / 1000
            if dep in ("26", "07") and drh <= 10:
                zard = 3
                regle_a.append("vallée du Rhône à %.1f km du fleuve (tracé simplifié)" % drh)
            flags.append("ardoise : limite de la zone 3 méditerranéenne / vallée du Rhône non définie à la commune (carte B.1 du DTU 40.11)")
            statut = "a_confirmer"

        # situation exposée probable
        expo = []
        if dmer is not None and dmer <= 5:
            expo.append("littoral à %.1f km (<= 5 km)" % dmer)
        for (bx0, by0, bx1, by1), ring, L in iles:
            if bx0 <= x <= bx1 and by0 <= y <= by1 and point_in_ring(x, y, ring):
                expo.append("île")
                break
        if de is not None and de <= 5:
            expo.append("estuaire à %.1f km (amont de la limite transversale de la mer)" % de)
        lit = litt.get(c)

        # vent
        vval, vst, vsrc = valeur_dep(regions, dep, "vent")
        vent, vent_regle = None, None
        if vval and re.fullmatch(r"\d", vval.strip()):
            vent, vent_regle = int(vval), "département entier en région %s" % vval
        elif dep == "44" and cant:
            cts = cant.get(c, set())
            rs = {2 if noms.get(ct) in VENT_44_R2 else 3 for ct in cts}
            if len(rs) == 1:
                vent = rs.pop()
                vent_regle = "ancien(s) canton(s) %s -> région %d" % (", ".join(sorted(noms.get(ct, "?") for ct in cts)), vent)
                vst = "confirme"
            else:
                vent = 3 if rs else None
                vent_regle = "commune nouvelle à cheval sur des cantons de régions %s" % sorted(rs) if rs else "canton 2011 introuvable"
                vst = "limite"
                statut = "limite" if statut == "calcule" else statut
        else:
            m = re.match(r"\s*(\d)", vval or "")
            vent = int(m.group(1)) if m else None
            vent_regle = "département partagé par cantons : %s (valeur principale retenue, à résoudre par canton)" % vval
            vst = "a_confirmer"
        nval, nst, nsrc = valeur_dep(regions, dep, "neige")
        if nval and re.fullmatch(r"[A-E]\d?", nval.strip()):
            neige, neige_regle = nval.strip(), "département entier en région %s" % nval.strip()
        else:
            m = re.match(r"\s*([A-E]\d?)", nval or "")
            neige = m.group(1) if m else None
            neige_regle = "département partagé : %s (à résoudre par canton / commune, NF EN 1991-1-3/NA/A2)" % nval
            nst = "a_confirmer"

        out.append({
            "code_insee": c, "nom": r["nom_standard"], "departement": dep,
            "codes_postaux": r["codes_postaux"],
            "mairie": {"lat": lat, "lon": lon},
            "altitude": {"mairie_ign_m": z_ign, "moyenne_m": zmoy, "min_m": zmin, "max_m": zmax,
                         "retenue_m": z, "source": "mairie : IGN RGE ALTI (service data.geopf.fr) ; min/moy/max : data.gouv « communes-france-2026 »"},
            "distance_mer_km": {"cote_nord": dn, "cote_sud": ds, "mediterranee": dmed, "plus_proche": dmer,
                                "cote_nord_territoire_min": dn_min, "cote_sud_territoire_min": ds_min,
                                "estuaire": de,
                                "source": "mairie -> trait de côte Histolitt (SHOM/IGN) coupé aux limites transversales de la mer (SHOM)"},
            "littoral": {"riveraine_mer_ou_estuaire": lit if lit else ("non" if o.littoral_bzh and dep in ("22", "29", "35", "56") else None),
                         "source": "DREAL Bretagne, communes littorales au titre de la loi Littoral" if dep in ("22", "29", "35", "56") else None,
                         "littoral_5km": dmer is not None and dmer <= 5},
            "zone_tuile_dtu_40_21": zt,
            "zone_ardoise_dtu_40_11": zard,
            "situation_exposee_probable": expo or None,
            "vent": {"region": vent, "regle": vent_regle, "statut": vst},
            "neige": {"region": neige, "regle": neige_regle, "statut": nst},
            "regle_appliquee": {"tuile": " ; ".join(regle_t) + " -> zone %d (la plus sévère)" % zt,
                                "ardoise": " ; ".join(regle_a) + " -> zone %d" % zard},
            "alertes": flags or None,
            "statut": statut,
        })
    out.sort(key=lambda e: e["code_insee"])
    meta = {
        "famille": "regions", "sous_famille": "zones par commune", "generated": "2026-11-19",
        "nombre": len(out),
        "regles": __doc__.split("Règles appliquées")[1].strip(),
        "statuts": {"calcule": "toutes les règles donnent une seule zone pour la commune",
                    "limite": "la zone dépend de l'endroit exact du chantier dans la commune (bande côtière, relief, canton) : demander « bord de mer ? » / l'altitude, ou prendre la plus sévère",
                    "a_confirmer": "règle non tranchée à la commune (zone méditerranéenne de l'ardoise, montagne, vent ou neige par canton)"},
        "communes": out,
    }
    json.dump(meta, open(o.sortie, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cnt = collections.Counter((e["departement"], e["zone_ardoise_dtu_40_11"], e["zone_tuile_dtu_40_21"]) for e in out)
    print("écrit", o.sortie, len(out), file=sys.stderr)
    print(json.dumps(collections.Counter(e["statut"] for e in out)), file=sys.stderr)


if __name__ == "__main__":
    main()
