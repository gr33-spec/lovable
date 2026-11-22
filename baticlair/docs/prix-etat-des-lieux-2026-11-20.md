# Prix : état des lieux (20 novembre 2026)

Demande de Greg (refonte de l'accueil, point 7) : ce que Mobiiz garde des prix, ce qui manque, et une proposition. Rien n'est codé. Aucune modification de la base.

## Ce qui est stocké

| Où | Quoi | Sert à |
|---|---|---|
| `price_request_recipient.prix` | Les prix ligne par ligne donnés par un négoce via le lien de chiffrage, plus livraison, délai, validité et date de réponse. Rattachés à l'artisan et au négoce. | « Mes prix », la comparaison des offres |
| `observations_prix` | Une ligne anonyme par prix reçu : article normalisé, prix HT, quantité, unité, département, date, type (perso ou groupe), source hachée. Aucun nom, ni d'artisan ni de négoce. Alimenté par les réponses au lien de chiffrage (sauf les prix « à vérifier ») et les anciennes offres groupées. | L'observatoire, le baromètre |
| `offre_achat_groupe_v1` | Le prix de l'offre d'un achat groupé et le fournisseur | L'offre aux participants |
| `offre_negociee`, `supplier_offer(_line)` | Anciens circuits : offres négociées et lectures de devis négoce (lecture coupée depuis le 28 octobre) | Historique |

## Ce qui manque

- Les offres des achats groupés V1 ne vont pas dans l'observatoire.
- Aucune trace « proposé » ou « commandé », ni la date de commande : un prix proposé et un prix réellement payé se mélangent.
- Le département seulement, pas la région.
- Les devis PDF des négoces ne sont pas lus : aucun prix n'en sort.
- La normalisation des articles hors catalogue est fragile (deux mots pour le même article).
- La durée de conservation de l'observatoire est à vérifier au registre RGPD.

## Proposition (à valider, rien n'est fait)

1. Deux colonnes en plus dans `observations_prix`, sans rien retirer : `statut` (proposé ou commandé) et `region`.
2. Verser dans l'observatoire les offres d'achats groupés V1 à leur clôture, puis les commandes passées.
3. Une ligne au registre RGPD : durée de conservation, finalité (prix de référence anonymes).
4. Une phrase dans les conditions des négoces : leurs prix peuvent servir, sans leur nom, à des repères de prix après la clôture. À faire relire par l'avocat.

## Idées pour plus tard (notées, pas codées)

- Les derniers prix négociés, affichés sans le nom du négoce, après la clôture.
- Le compteur d'économies, quand on aura les vrais prix payés par l'artisan.
- La lecture des factures du négoce de l'artisan.
