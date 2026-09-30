# Dépôt lovable — deux applications indépendantes

| Dossier | Application | Hébergement |
|---|---|---|
| [`patrimoine/`](patrimoine/) | Gestion de patrimoine immobilier | Vercel, projet **patrimoine** (Root Directory `patrimoine`) |
| [`baticlair/`](baticlair/) | BatiClair — assistant d'achat pour les artisans du bâtiment | Vercel, voir [`baticlair/docs/mise-en-ligne.md`](baticlair/docs/mise-en-ligne.md) |

Les deux applications ne partagent **aucun** fichier : chacune a ses
dépendances, ses outils et sa base de données. Rien d'une application ne
doit être placé à la racine du dépôt.
