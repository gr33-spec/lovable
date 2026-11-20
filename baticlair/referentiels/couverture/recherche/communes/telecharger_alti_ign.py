#!/usr/bin/env python3
"""Altitude IGN (RGE ALTI, service public data.geopf.fr) au point de la mairie de chaque commune.

Usage : python3 -I telecharger_alti_ign.py communes-france-2026.csv sortie.json
Lit latitude_mairie / longitude_mairie du fichier data.gouv « communes-france-2026.csv »
et interroge le service d'altimétrie de l'IGN par lots de 150 points. Écrit
{code_insee: altitude_m} (null si le service ne répond pas). Bibliothèque standard seulement.
"""
import csv, json, sys, time, urllib.request, urllib.parse

URL = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"

def main(src, dst):
    rows = [r for r in csv.DictReader(open(src, encoding="utf-8"))
            if r["latitude_mairie"] and r["longitude_mairie"]]
    try:
        out = json.load(open(dst))
    except (OSError, ValueError):
        out = {}
    todo = [r for r in rows if r["code_insee"] not in out]
    for i in range(0, len(todo), 150):
        lot = todo[i:i + 150]
        q = urllib.parse.urlencode({
            "lon": "|".join(r["longitude_mairie"] for r in lot),
            "lat": "|".join(r["latitude_mairie"] for r in lot),
            "resource": "ign_rge_alti_wld", "zonly": "true"})
        for essai in range(4):
            try:
                with urllib.request.urlopen(URL + "?" + q, timeout=60) as rep:
                    z = json.load(rep)["elevations"]
                break
            except Exception as e:  # réseau instable : on réessaie
                time.sleep(3 * (essai + 1)); z = None
        for r, v in zip(lot, z or [None] * len(lot)):
            out[r["code_insee"]] = None if v is None or v <= -99999 else round(v, 1)
        if i // 150 % 20 == 0:
            json.dump(out, open(dst, "w")); print(i + len(lot), "/", len(todo), flush=True)
    json.dump(out, open(dst, "w"), sort_keys=True)
    print("fini", len(out))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
