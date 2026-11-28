# Photos de l'accueil

Greg, 21 novembre 2026 : les deux photos de l'accueil sont les siennes. Aucun crédit n'est à afficher, et la ligne « Photos : … » en bas de l'accueil est retirée.

Le code est dans `apps/web/src/lib/photos-accueil.ts`. Les fichiers sont dans `apps/web/public/accueil/`, en AVIF puis WebP, en 640 et 1280 px de large. Le navigateur prend la taille qui suit l'écran. La photo du haut est chargée tout de suite, celle des achats groupés plus tard.

| Fichier | Carte | Ce qu'elle montre | Cadrage gardé |
|---|---|---|---|
| `quantitatif-greg-*` | « Nouveau quantitatif » (tous les métiers) | Image de Greg du 23 novembre 2026 : un devis entre dans la machine Mobiiz et ressort en quantitatif (titre posé SOUS l'image, jamais dessus). Avant : un artisan sur ses plans (`docs/photos-accueil-anciennes/quantitatif-greg-artisan-plans-1280.webp`) | Le centre (`50% 50%`) |
| `groupes-greg-*` | « Achats groupés » (grande carte et vignette « Sois le premier ») | Une vingtaine d'artisans réunis devant un dépôt | Les visages, en haut (`50% 28%`) |

Poids : 18 à 58 Ko en AVIF pour la photo du haut, 25 à 79 Ko pour celle des achats groupés.

## Pour changer une photo

1. Garde les mêmes noms de fichier, ou change le chemin dans `photos-accueil.ts`.
2. Mets deux largeurs, 640 px et 1280 px, en AVIF et en WebP.
3. Si besoin, change le texte de description (`alt`) et le point gardé au recadrage (`cadrage`).

Le texte posé sur une photo est blanc sur un voile noir dégradé, en thème clair comme en sombre.

## Anciennes photos

Elles sont gardées dans `docs/photos-accueil-anciennes/` : elles ne sont plus servies par le site.

| Fichier | Auteur | Licence | Source |
|---|---|---|---|
| `quantitatif-couvreur-*` | Karora | Domaine public | [Slater at work, Rothesay, Isle of Bute](https://commons.wikimedia.org/wiki/File:Slater_at_work,_Rothesay,_Isle_of_Bute.jpg) |
| `groupes-artisans-*` | David Shankbone | CC BY 3.0 (crédit obligatoire si on la remet) | [Roofers in Denver Colorado](https://commons.wikimedia.org/wiki/File:Roofers_in_Denver_Colorado.jpg) |
