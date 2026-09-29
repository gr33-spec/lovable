# Dépôt lovable — deux applications indépendantes

| Dossier | Application | Hébergement |
|---|---|---|
| [`patrimoine/`](patrimoine/) | Gestion de patrimoine immobilier | Vercel, projet **patrimoine** (Root Directory `patrimoine`) |
| [`baticlair/`](baticlair/) | BatiClair — assistant d'achat pour les artisans du bâtiment | Vercel, voir [`baticlair/docs/mise-en-ligne.md`](baticlair/docs/mise-en-ligne.md) |

Les deux applications ne partagent **aucun** fichier : chacune a ses
dépendances, ses outils et sa base de données. Rien d'une application ne
doit être placé à la racine du dépôt.

## `vercel.json` à la racine

Il ne concerne **que** le projet Vercel `lovable`, dont le dossier est la
racine du dépôt (l'ancienne BatiClair, supprimée). `"ignoreCommand": "exit 0"`
lui dit de ne plus rien construire : son dernier site en ligne reste tel
quel. Les projets dont le dossier est `patrimoine/`, `baticlair/…` ou
`boutique/` ne lisent pas ce fichier.
