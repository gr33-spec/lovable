# Jouer un cycle complet sur iPhone

But (Greg, 24 octobre 2026) : vivre tout un cycle Mobiiz depuis ton iPhone, avec de vrais e-mails et un paiement simulé, en une demi-heure, sans attendre le calendrier.

## 0. Avant (une fois)

1. **Le lien** : **https://test.mobiiz.fr**, public (sans compte Vercel), non indexé par Google. C'est la prévisualisation de la branche `claude/saas-achat-artisans-prompt-1lyihx`, avec sa propre base (copie Neon) ; l'API est sur `https://api-test.mobiiz.fr`. Rien ne touche la production.
2. **Déjà réglé** (variables de la branche, 24 octobre 2026) : commande commune ouverte, toi admin (`GROUPE_ADMINS`), e-mails réels depuis `contact@mobiiz.fr` (avant le 26 octobre : bonjour@) avec la liste blanche = ton e-mail, Stripe en mode test (49 € par mois, 348 € par an).
3. Sur l'iPhone : ouvrir le lien dans Safari, puis Partager → « Sur l'écran d'accueil » (sans cela, pas de notifications).
4. **Carte de test Stripe** : `4242 4242 4242 4242`, une date future, n'importe quel code à 3 chiffres. Aucune carte n'est débitée.

## 1. Le parcours (environ 30 minutes)

| # | Où | Ce que tu fais | Ce que tu dois voir |
|---|---|---|---|
| 1 | Landing | Ouvre la page d'accueil, puis « Tarifs ». | « Dès 29 € par mois, économise des centaines, voire des milliers d'euros chaque année. » ; les deux formules, l'annuel en avant (« -40 % », « 29 € HT par mois, payé à l'année », « 240 € économisés par an ») et le mensuel à côté (« 49 € HT par mois ») ; les 3 étapes ; « Gratuit pour les négoces ». |
| 2 | Inscription | Crée ton compte artisan avec ton e-mail. | L'e-mail de code arrive : logo Mobiiz, pied légal BATI INVEST, lien « Gérer tes e-mails ». En haut de l'app : « Essai gratuit : encore 60 jours ». |
| 3 | Ta liste | « + », dépose un devis (ou « J'ai déjà ma liste »), réponds aux questions, puis ajoute la liste à la commande du mois (chantier dans le 22). | La liste est dans la commande ; le bandeau d'essai est toujours là. |
| 4 | Tableau de bord | Menu → Commande commune → « Tableau de bord » → « Recevoir mon code ». Saisis le code reçu par e-mail. | Les 4 gros chiffres et les sections. Plus bas, la carte « Démo (mode test) ». |
| 5 | Démo | « Créer un jeu de test ». | « 5 faux artisans et 3 faux négoces dans le 22, 20 lignes déposées. » |
| 6 | Démo | « Clôturer maintenant ». | « 1 commande close, 3 grilles envoyées aux négoces. » Les 3 e-mails des faux négoces arrivent **chez toi**, objet « [TEST → negoce-test-1@demo.mobiiz.fr] … ». Tu peux ouvrir la grille depuis l'e-mail, comme un négoce. |
| 7 | Démo | « Faire répondre les négoces ». | « 3 négoces ont répondu (prix fictifs). » |
| 8 | Démo | « Publier les résultats ». | Un e-mail et une notification : les résultats sont là. Dans l'app, l'onglet de la commande montre les 3 négoces classés et l'économie du cycle. |
| 9 | App | Choisis un négoce, puis « Commander ». | Le bon de commande part (e-mail redirigé vers toi). |
| 10 | Démo | « Finir l'essai ». Reviens dans l'app et essaie de déposer une liste. | L'écran « Ton essai est terminé. Continue dès 29 € HT par mois. », avec l'économie de ton premier cycle, les deux formules (l'annuel coché), « Je continue » et « Pas maintenant ». Les résultats déjà publiés restent visibles. |
| 11 | Paiement | Touche « Mensuel », puis « Je continue ». | La page de paiement Stripe (mode test) à 49 € HT + TVA. Paie avec la carte `4242 4242 4242 4242`. Retour dans l'app : « Abonné au mois » ; l'e-mail « Ton abonnement Mobiiz est actif » arrive ; la facture F-000001 (base de la prévisualisation) est dans « Mon abonnement » → « Mes factures ». |
| 11 bis | Abonnement | « Passer à l'annuel », puis « Oui, payer … ». | Ce qui reste de ton mois est déduit ; « Abonné à l'année », 348 € HT par an ; l'e-mail « Tu es passé à l'abonnement annuel Mobiiz » ; une deuxième facture (« Passage à l'abonnement annuel »), quelques secondes après (Stripe la renvoie). |
| 12 | Démo | « Simuler un échec de paiement ». | Au prochain renouvellement simulé : l'e-mail « Ton paiement Mobiiz n'est pas passé » et 7 jours de grâce (bandeau). |
| 13 | Abonnement | « Mon abonnement » → « Résilier », puis confirmer. | Deux clics ; « Une année commencée n'est pas remboursée au prorata. » ; l'e-mail « Ta résiliation Mobiiz est enregistrée » ; l'accès est gardé jusqu'à l'échéance de l'année. |
| 14 | Démo | « Tout effacer ». | Les faux comptes disparaissent. Ton compte, ta liste et tes factures restent. |

## 2. Si quelque chose ne va pas

- **Pas d'e-mail** : vérifier `EMAILS_AUTORISES` et le domaine chez Resend (« Verified »). Les e-mails hors liste ne partent pas si aucune adresse de redirection n'est connue.
- **« Cette page est réservée à l'équipe »** : ton e-mail n'est pas dans `GROUPE_ADMINS`.
- **Pas de carte « Démo »** : la démo n'existe qu'en prévisualisation, en paiement simulé ou Stripe de test ; jamais en production.
- **Les faux comptes** n'entrent dans aucun chiffre du tableau de bord, et chaque geste de démo est noté au journal des accès.
