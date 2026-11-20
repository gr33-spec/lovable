# Photos de l'accueil

Greg, 20 novembre 2026. L'accueil est photographique : une photo du métier pour « Nouveau quantitatif » et une photo d'artisans au travail ensemble pour « Achats groupés ». Le code est dans `apps/web/src/lib/photos-accueil.ts`. Les fichiers sont dans `apps/web/public/accueil/`, en AVIF et en WebP, en deux tailles.

## Pour mettre tes propres photos

1. Garde le même nom de fichier, ou change le chemin dans `photos-accueil.ts`.
2. Mets deux largeurs : 640 px et 1280 px, en AVIF et en WebP.
3. Change le texte de description (`alt`) et le crédit : `null` si la photo est à toi.

## Règles

- Licence qui autorise l'usage commercial. Aucun faux logo, aucune marque lisible, aucun visage reconnaissable. Aucune photo générée par une IA.
- Couvreur : un couvreur en situation crédible et en sécurité, sur un toit d'ardoise.
- Les autres métiers prennent la photo de leur site d'artisan (`docs/photos-par-defaut.md`). Une entreprise de plusieurs métiers prend une photo neutre du bâtiment.
- Le crédit s'affiche en petit en bas de l'accueil, seulement quand la licence l'exige (CC BY, CC BY-SA).

## Crédits

| Fichier | Ce qu'elle montre | Auteur | Licence | Source |
|---|---|---|---|---|
| `quantitatif-couvreur-*` | Un couvreur assis sur une planche de toit, ardoise et marteau en main, ardoises en piles. Recadrée sans le visage. | Karora | Domaine public | [Slater at work, Rothesay, Isle of Bute](https://commons.wikimedia.org/wiki/File:Slater_at_work,_Rothesay,_Isle_of_Bute.jpg) |
| `groupes-artisans-*` | Trois couvreurs casqués travaillent ensemble sur un toit en tuiles. Recadrée sans la brouette marquée. | AUTEUR_DENVER | CC BY 3.0 | [Roofers in Denver Colorado](https://commons.wikimedia.org/wiki/File:Roofers_in_Denver_Colorado.jpg) |

Candidates écartées : « The Collyweston Slater » (une enseigne de pub) ; « Roofers (50631209332) » (CC0, mais visages reconnaissables) ; « Two roofers at work, New Orleans » (vieux toit abîmé, pas en sécurité) ; « Marking off a slate » (trop petite).
