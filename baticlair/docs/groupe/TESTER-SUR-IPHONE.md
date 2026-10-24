# Jouer un cycle complet sur iPhone

But (Greg, 24 octobre 2026) : vivre tout un cycle Mobiiz depuis ton iPhone, avec de vrais e-mails et un paiement simulé, en une demi-heure, sans attendre le calendrier.

## 0. Avant (une fois)

1. **L'API de la branche** : l'API de prévisualisation (`baticlair-api`, branche `claude/integration-groupe`) doit être déployée, et le site de prévisualisation doit pointer dessus (variable `API_URL` du projet web, environnement Preview). Tant que ce n'est pas fait, le site de prévisualisation parle à l'API de production, où rien de tout ceci n'existe.
2. **Variables de l'API de prévisualisation** :
   - `GROUPE=on`
   - `GROUPE_ADMINS=<ton e-mail>`
   - `PAIEMENT=simule` (par défaut)
   - `ABONNEMENT=on` (par défaut)
   - `RESEND_API_KEY`
   - `EMAIL_DOMAINE`
   - `EMAILS_AUTORISES=<ton e-mail>`
   - `CRON_SECRET`

   Voir `EMAILS.md` pour le domaine et la liste blanche.
3. Sur l'iPhone : ouvrir le lien de prévisualisation dans Safari, puis Partager → « Sur l'écran d'accueil » (sans cela, pas de notifications).

## 1. Le parcours (environ 30 minutes)

| # | Où | Ce que tu fais | Ce que tu dois voir |
|---|---|---|---|
| 1 | Landing | Ouvre la page d'accueil, puis « Tarifs ». | « Pour 29 € par mois, économise des centaines, voire des milliers d'euros chaque année. » ; les 3 étapes ; « Gratuit pour les négoces ». |
| 2 | Inscription | Crée ton compte artisan avec ton e-mail. | L'e-mail de code arrive : logo Mobiiz, pied légal BATI INVEST, lien « Gérer tes e-mails ». En haut de l'app : « Essai gratuit : encore 60 jours ». |
| 3 | Ta liste | « + », dépose un devis (ou « J'ai déjà ma liste »), réponds aux questions, puis ajoute la liste à la commande du mois (chantier dans le 22). | La liste est dans la commande ; le bandeau d'essai est toujours là. |
| 4 | Tableau de bord | Menu → Commande commune → « Tableau de bord » → « Recevoir mon code ». Saisis le code reçu par e-mail. | Les 4 gros chiffres et les sections. Plus bas, la carte « Démo (mode test) ». |
| 5 | Démo | « Créer un jeu de test ». | « 5 faux artisans et 3 faux négoces dans le 22, 20 lignes déposées. » |
| 6 | Démo | « Clôturer maintenant ». | « 1 commande close, 3 grilles envoyées aux négoces. » Les 3 e-mails des faux négoces arrivent **chez toi**, objet « [TEST → negoce-test-1@demo.baticlair.fr] … ». Tu peux ouvrir la grille depuis l'e-mail, comme un négoce. |
| 7 | Démo | « Faire répondre les négoces ». | « 3 négoces ont répondu (prix fictifs). » |
| 8 | Démo | « Publier les résultats ». | Un e-mail et une notification : les résultats sont là. Dans l'app, l'onglet de la commande montre les 3 négoces classés et l'économie du cycle. |
| 9 | App | Choisis un négoce, puis « Commander ». | Le bon de commande part (e-mail redirigé vers toi). |
| 10 | Démo | « Finir l'essai ». Reviens dans l'app et essaie de déposer une liste. | L'écran « Ton essai est terminé. Continue pour 29 € HT par mois, sans engagement. », avec l'économie de ton premier cycle, « Je continue » et « Pas maintenant ». Les résultats déjà publiés restent visibles. |
| 11 | Paiement | « Je continue ». | La page « Paiement (simulation) », avec le bandeau rouge « Mode test : aucun paiement réel ». « Payer » : l'abonnement est actif ; l'e-mail « Ton abonnement Mobiiz est actif » arrive ; la facture TEST-000001 est dans « Mon abonnement » → « Mes factures ». |
| 12 | Démo | « Simuler un échec de paiement ». | Au prochain renouvellement simulé : l'e-mail « Ton paiement Mobiiz n'est pas passé » et 7 jours de grâce (bandeau). |
| 13 | Abonnement | « Mon abonnement » → « Résilier », puis confirmer. | Deux clics ; l'e-mail « Ta résiliation Mobiiz est enregistrée » ; l'accès est gardé jusqu'à la fin de la période. |
| 14 | Démo | « Tout effacer ». | Les faux comptes disparaissent. Ton compte, ta liste et tes factures restent. |

## 2. Si quelque chose ne va pas

- **Pas d'e-mail** : vérifier `EMAILS_AUTORISES` et le domaine chez Resend (« Verified »). Les e-mails hors liste ne partent pas si aucune adresse de redirection n'est connue.
- **« Cette page est réservée à l'équipe »** : ton e-mail n'est pas dans `GROUPE_ADMINS`.
- **Pas de carte « Démo »** : l'API est en paiement réel (`PAIEMENT=stripe`). La démo n'existe qu'en mode test, jamais en production.
- **Les faux comptes** n'entrent dans aucun chiffre du tableau de bord, et chaque geste de démo est noté au journal des accès.
