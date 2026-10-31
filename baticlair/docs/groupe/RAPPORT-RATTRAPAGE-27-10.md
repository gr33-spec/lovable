# Rapport final du rattrapage (27 octobre 2026)

Tout ce qui était « à faire » ou « en cours » dans `docs/SUIVI.md` au 27 octobre, écran par écran, avec les captures iPhone SE et ordinateur. Tout est en ligne sur test.mobiiz.fr (branche `claude/saas-achat-artisans-prompt-1lyihx`, dernier commit de ce rapport). Rien dans main, aucune dépense, pas de Stripe live.

## Les douze points, écran par écran

| N° | Demande | État | Écran et captures |
| --- | --- | --- | --- |
| R1 | Plus aucun reste de l'ancien mode côté artisan | en ligne (26/10) | Accueil et chantier sans bandeau « Commande du … · Clôture dans », `/groupe` renvoie sur `/regroupements`. Test e2e « Mode humain : plus rien de l'ancien mode » sur six écrans, vu échouer sur l'ancien code. Captures `captures/regroupements-26-10/4-accueil-sans-bandeau-*`, `5-chantier-sans-bandeau-*`. |
| R2 | Onglet Regroupements : « Déclarer un besoin » toujours en haut, exemples cliquables, « Invite tes négoces » | en ligne (26/10) | `captures/regroupements-26-10/1-vide-*`, `2-exemple-prerempli-*`, `3-besoin-declare-*`. |
| R3 | Exemples du peintre | en ligne (27/10) | Peinture et sous-couche regroupables (teinte et contenance exigées). `captures/rattrapage-27-10/4-avec-ville-*` (« Peinture blanche 15l » déclarée). |
| R4 | Carte « Regroupements » vide sur l'accueil | en ligne (27/10) | « Tu sais déjà ce que tu vas commander ? Dis-le, on regroupe et on négocie. » `captures/rattrapage-27-10/1-accueil-carte-vide-*`. |
| R5 | Clé Anthropic de test.mobiiz.fr | en ligne (27/10, remplacé avec ton accord) | Carte « Compte Anthropic de la clé » dans l'espace admin : identifiant d'organisation, variable lue, état. Jamais la clé. |
| R6 | Élision « pièces d'ardoise » | en ligne (25/10) | Visible dans les notifications et les alertes du chasseur : « 1 800 pièces d'ardoise 32×22 » (recette négociée, étape 14). |
| R7 | Adresse Mobiiz par artisan, réponses des négoces dans Mobiiz | en ligne (27/10) | Six écrans : `captures/adresse-mobiiz-27-10/1-ecran-adresse-*` à `6-mes-recus-rattache-*`. Recette avec un vrai e-mail de négoce (PDF) reçu sur le chantier. |
| R8 | Rapport en dix lignes avant de coder R7 | en ligne (27/10) | Envoyé et validé. Plafonds Resend : gratuit 3 000/mois et 100/jour, reçus compris ; Pro (20 $/mois) vers 100 artisans inscrits. |
| R9 | Plan peintres | en ligne (26/10) | Validé par toi le 26/10. |
| R10 | Codes de la sauvegarde nocturne | en ligne (26/10) | Posés dans GitHub ; la sauvegarde part à la mise en ligne de mobiiz.fr. |
| R11 | Quantitatif en photo (deux captures) | reportée | Le compte Anthropic n'a plus de crédit : aucune lecture IA ne passe (photo, PDF, liste). Reprend dès que tu as rechargé ; la vraie lecture de 7954 suivra. |
| R12 | « motif : zone_inactive » en déclarant « Peinture blanche 15l » | en ligne (27/10) | Le besoin se regroupe au département de la livraison ; phrase en français ; placeholder « Code postal et ville ». `captures/rattrapage-27-10/2-regroupements-vide-*`, `3-sans-ville-*`, `4-avec-ville-*`, `5-tes-besoins-*`. |

## La recette complète en ligne (27 octobre)

### Artisan + négoce + chasseur (`docs/groupe/recette-en-ligne/negocie.mjs`)

22 étapes sur 22, iPhone SE et ordinateur, zéro anomalie : landing `/couvreurs`, inscription (écran de l'adresse Mobiiz), SIRET et adresse dans le 22, demande perso avec « Préviens ton négoce » (SMS qui nomme l'adresse Mobiiz), vrai e-mail de demande de prix au négoce, besoin déclaré (le crochet refusé), deuxième artisan, e-mail de formation au chasseur, chasseur (code par e-mail, tableau, fiche, prise en charge, offre avec commission, envoi), offre reçue négoce masqué, acceptation et bon de commande des deux artisans, lot transmis au négoce, purge des faux négoces, comptes supprimés. Captures : `captures/recette-negocie-27-10/se/` et `/ordi/` (24 écrans chacun, journal `journal.json`).

### Produit (`docs/groupe/recette-en-ligne/recette.mjs`)

Script du 24 octobre, rejoué sur iPhone SE avec l'admin de test : 31 étapes sur 51 passent (`captures/recette-generale-27-10/se/`, journal `journal.json`). Ce qui passe : les onze pages publiques (zéro reste), la landing et sa démonstration, l'inscription avec l'écran de l'adresse Mobiiz, le guide, les vrais e-mails d'inscription, SIRET et adresse, l'abonnement (deux formules, carte refusée, carte acceptée, passage à l'annuel au prorata, e-mails), le chantier fictif, les écrans, l'export JSON et PDF, la suppression du compte.

Les vingt échecs ont trois causes, aucune nouvelle :
- **Le crédit Anthropic (R11)** : dépôt d'une photo, d'un PDF, ajout au regroupement (étapes 19 à 21). Reprend dès que tu recharges.
- **Les écrans de l'ancien mode, retirés par R1** : « Mets ton négoce dans la boucle », invitation et espace négoce « prochaine clôture », cycle admin de la commande du mois, résultats, commande, prix garantis (étapes 23 à 35). Le script doit être réécrit pour le mode humain (SUIVI, ligne 42).
- **L'espace admin derrière le code et l'onglet « Test »** (sécurité du 26/10) : le script cliquait directement sur les gestes ; la résiliation (étape 42) a échoué par ricochet, le script était resté sur la page admin. La facture (étape 39) existe bien en base (F-000009 puis F-000010 à la bascule annuelle) : le webhook Stripe est arrivé 20 à 30 secondes après le paiement, le script n'attendait que 30 secondes sans recharger.

## Ce qui reste et dépend de toi

- Crédit Anthropic (R11) : sans lui, aucune lecture IA en ligne ; la vraie lecture de 7954 attend.
- Clés Turnstile, `CHIFFREMENT_CLE` (lot B), photo pour la landing, trois vrais devis de peintres.
- Le prompt UX que tu envoies : il passe avant le lot B.
