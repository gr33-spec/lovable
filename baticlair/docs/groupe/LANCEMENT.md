# Lancement : ce que Greg fait, dans l'ordre

Ordre fixé par Greg le 23 octobre 2026 : le crédit, puis les appels (négoces, couvreurs). La fusion et la mise en production viennent ensuite, quand les premiers retours sont là. Tout ce qui est technique et faisable sans toi, Claude le fait.

## Maintenant

1. **Recharger le crédit Anthropic**, puis écrire « crédit rechargé ». Claude lance alors la vraie lecture : les devis réels du dépôt, puis une vraie grille de négoce de plusieurs lignes (DETTE n° 28).
2. **Appeler 5 à 10 négoces couverture des Côtes-d'Armor.** Leur dire : une commande toutes les deux semaines (clôture le 1er et le 15 à midi), une seule grille avec tout le volume, cinq jours ouvrés pour répondre, prix fermes quel que soit le volume, grille garantie 30 jours pour le négoce retenu, aucun frais. Noter le bon e-mail de chacun : c'est à cet e-mail qu'arrive le lien « créez votre accès » (`/negoce/rejoindre/<jeton>`) dès qu'un couvreur l'ajoute, et tu n'as plus rien à faire ensuite : il s'inscrit seul (dépôts, paliers de livraison, départements) et reçoit chaque grille à la clôture. L'onglet Négoces de l'admin dit qui est inscrit, invité jamais venu, désabonné.
3. **Appeler 10 à 20 couvreurs que tu connais.** Leur faire essayer la liste sur le lien de prévisualisation (SIRET, adresse du chantier, « Ajouter à la commande »), et noter ce qui coince.

## Après les premiers retours

4. **Comptes et clés** : domaine d'envoi validé chez Resend, clé INSEE Sirene.
5. **Variables Vercel** : `GROUPE=on`, `COMMANDE_COMMUNE=mois`, `GROUPE_ADMINS` (ton e-mail), `CRON_SECRET`, `AUTH_SECRET`, clé Resend, clé Sirene.
6. **Fusion** : relire et approuver la PR #284 (ou `claude/integration-groupe`) vers `main`.
7. **Mise en production** : ton domaine sur Vercel, puis « go prod » ; Claude retire alors le `noindex` de la landing (DETTE n° 26) et vérifie la prod.
8. **Indexation Google** : Search Console, sitemap envoyé.
9. **Juridique** : relecture des CGU, des conditions négoce et de la confidentialité par l'avocat (`A-FAIRE-RELIRE.md`), registre RGPD.
10. **Premier cycle** : vérifier les dates dans l'admin (clôture le 1er et le 15 à 12 h, réponse sous 5 jours ouvrés), annoncer la commande commune aux couvreurs, suivre les grilles puis les commandes.
