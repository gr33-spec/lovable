---
code: modele
metier: identifiant_batiClair      # celui du repérage (earthworks, masonry…) ; un nouveau métier prend un identifiant neuf
nom: Nom du métier tel que l'artisan le dit
etat: brouillon                    # brouillon | en validation | relu (relu = un artisan du métier l'a relu : la mention §52 tombe)
version: 2026-10-19
moteur: fiche                      # fiche (calculé par ce fichier) | tiroir (le métier garde son tiroir TypeScript)
---

# Modèle de fiche métier (format commun, §52)

Copier ce fichier en `<code>.md`, remplir les huit sections, lancer les tests du domaine : la fiche est chargée par le
repérage sans une ligne de code. Les tableaux des sections 2 à 6 sont lus par le code, au mot près de leurs en-têtes.
Règle numéro un : une fiche ne fait sortir que les fournitures CONTENUES dans un ouvrage écrit au devis, jamais un ouvrage
absent. Un ratio sans source (section 8) ni niveau de confiance (sûr / usuel / à vérifier) est refusé par le test.

## 1. Unités et vocabulaire du devis

Comment un artisan de ce métier écrit ses lignes : unités (m², m³, ml, u, ens), abréviations, ouvrages types, ce qui est
de la main-d'œuvre seule (sans fourniture). Ce texte est donné tel quel au modèle de lecture.

## 2. Ouvrages

Colonne facultative « Article écrit » (oui / non) : oui quand l'ouvrage est la POSE d'un article écrit (une fenêtre) ; la
ligne garde alors aussi l'article tel qu'écrit, la fiche n'ajoute que les fournitures de pose.

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| exemple-ouvrage | Exemple d'ouvrage | m² | « Exemple … », « Ex. … » |

## 3. Ratios

Quantité de fourniture par unité d'ouvrage. Condition : `cle=valeur` d'une question de la section 5 (la ligne ne compte que
si la réponse, ou la donnée écrite au devis, vaut cette valeur) ; plusieurs : `cle=valeur et cle2=valeur2` ; sinon « — ».

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| exemple-ouvrage | Fourniture exemple | 1,05 | m² | — | à vérifier | S1 |

## 4. Conditionnements

Ce que le comptoir vend. « Vendu en » = l'unité commandable ; « Contenance » = ce qu'elle contient dans l'unité du besoin.
Quand « Vendu en » est l'unité du besoin (m³ de béton), la contenance est le pas d'arrondi.

Colonne facultative « Consommable » (oui / non) : un consommable de pose (vis, mastic, mousse, colle) ne sort que sur le
« oui » à la question consommables (règle numéro un, §49.1 point 4), orange « Consommable ajouté sur ton oui ».

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Fourniture exemple | rouleau | 10 | m² | à vérifier | S1 | non |

## 5. Questions

Une question seulement si le devis ne permet ni de lire ni de déduire la donnée (§51.2). Boutons : `Libellé=valeur`
séparés par « / ».

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| exemple_choix | Ta question, en tutoyant ? | Choix A=a / Choix B=b | exemple-ouvrage |

## 6. Test permanent

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Exemple d'ouvrage | 20 | m² | exemple-ouvrage |

### Bref

- Une phrase par fait, comme le modèle doit l'écrire.

### Questions attendues

- `exemple_choix`

### Réponses

- `exemple_choix` = a

### Comptes attendus

| Fourniture | Commande |
|---|---|
| Fourniture exemple | 3 rouleaux de 10 m² |

## 7. À relire par un artisan

- Les trois ratios à relire en premier, avec ce qui les ferait changer.

## 8. Sources

- S1 : Référence (DTU, NF, fiche fabricant, catalogue négoce), date de consultation ; « de mémoire, à vérifier » si non consultée.
