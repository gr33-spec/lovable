#!/usr/bin/env python3
"""Outil de rédaction : compare deux versions de chantiers-types.md (lignes qui changent). Usage : comparer_chantiers.py avant.md apres.md"""
import re, sys
def parse(path):
    d = {}; cur = None
    for l in open(path):
        m = re.match(r"## (PI-\d+)", l)
        if m: cur = m.group(1); d[cur] = {}; continue
        if cur and l.startswith("| ") and not l.startswith("| Article"):
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            if len(c) >= 4 and not c[3].startswith(("cloison", "plafond", "doublage", "isolation", "pare", "joints", "contre", "coffrage")):
                d[cur][c[0]] = (c[1], c[2])
    return d
a, b = parse(sys.argv[1]), parse(sys.argv[2])
for k in b:
    for art in sorted(set(a.get(k, {})) | set(b[k])):
        x, y = a.get(k, {}).get(art), b[k].get(art)
        if x != y: print(f"| {k} | {art} | {'; '.join(x) if x else '—'} | {'; '.join(y) if y else '— (retiré)'} |")
