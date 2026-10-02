# Enrichissement progressif du référentiel

Pas de grande base de produits remplie à la main avant la bêta. BatiClair
apprend **les produits réellement rencontrés** sur les devis des
utilisateurs, et les connaît parfaitement.

## La boucle

```
produit rencontré sur un vrai devis
  → liste précise de ce qui manque (automatique)
  → documentation vérifiée (fiche fabricant, page exacte)
  → données enregistrées avec leur source
  → tests (banc d'essai + test du produit)
  → réutilisé sur tous les chantiers suivants
```

1. **Rencontré.** Le devis passe par le banc (ou, demain, par l'appli).
   `documentationNeeds` dresse la liste exacte, rangée par nature :
   - *produit à identifier* : le devis ne nomme pas le modèle (référence,
     puis fiche technique) ;
   - *modèle absent du référentiel* : l'artisan n'a reconnu aucune
     proposition ;
   - *donnée produit* : une caractéristique utilisée par une règle
     (espacement maximal des crochets…) ;
   - *conditionnement* : l'unité vendue (botte, barre, rouleau) ;
   - *règle* : la règle de calcul attend sa source ou sa validation ;
   - *ouvrage à couvrir* : aucune règle pour cet ouvrage (rives, chatières…).
2. **Documenté.** Source idéale : fiche technique ou notice de pose du
   fabricant (avec la page) ; DTU ; à défaut règle de pratique écrite et
   validée. Les valeurs relevées sur le web restent en brouillon.
3. **Enregistré.** Chaque valeur porte sa source, sa nature (caractéristique
   fabricant, condition de pose, conditionnement), son statut et qui l'a
   vérifiée. Le contrôle d'intégrité refuse une valeur sans source.
4. **Testé.** Le banc d'essai régénère son score ; un test fixe la donnée
   contre la fiche (comme `demonstration-regles-tuiles-liteaux.md`).
5. **Réutilisé.** Le produit est reconnu par ses appellations sur les
   devis suivants (et dans les réponses des fournisseurs).

## Ouvert à une base externe

Le référentiel est fait de **couches** (`mergeReferentials`) : la base
BatiClair, puis les couches documentées au fil des chantiers, et plus tard
une base externe (API fabricant, catalogue négoce) via un
`ReferentialProvider`. Le moteur ne voit qu'un référentiel : brancher une
source ne change pas le moteur.

Une couche suit les mêmes règles que la base : sources obligatoires,
contrôle d'intégrité, et **brouillon tant que personne n'a vérifié**. Une
donnée importée n'est donc jamais utilisée pour un artisan sans
vérification.

## Ce qui reste volontairement hors du moteur

Les préférences de l'entreprise (produit habituel, marge) : elles évitent
une question, elles ne deviennent jamais une donnée fabricant.
