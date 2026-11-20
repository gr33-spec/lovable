#!/usr/bin/env python3
"""Outil de rédaction : taux de confirmation des valeurs de referentiel.json (valeurs uniques, état écrit dans la note)."""
import json, os, re
from collections import Counter
r = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "referentiel.json")))
vus = {}
def parcours(o):
    if isinstance(o, dict):
        v = o.get("verification")
        if v and v.get("status") == "draft":
            m = re.search(r"— (2 sources|1 source|à confirmer|contradiction) :", v.get("note", ""))
            if m:
                vus[(o.get("value") or o.get("formula") or json.dumps(o.get("values")), o.get("unit"), v["note"])] = m.group(1)
        for x in o.values(): parcours(x)
    elif isinstance(o, list):
        for x in o: parcours(x)
parcours(r)
c = Counter(vus.values()); n = sum(c.values())
for k in ["2 sources", "1 source", "contradiction", "à confirmer"]:
    print(f"{k:14} {c[k]:4}  {round(100 * c[k] / n)} %")
print(f"{'total':14} {n:4}")
