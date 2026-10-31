# Recette en ligne, test.mobiiz.fr (25 octobre 2026)

Script : `docs/groupe/recette-en-ligne/recette.mjs` (Playwright, vrai navigateur, vraies adresses `delivered+…@resend.dev`, Stripe en mode test).
Captures et journal : `docs/groupe/captures/recette-en-ligne/iphone-se/` et `…/ordinateur/` (`journal.json`).

## Résultat : 37 étapes sur 40, sur iPhone SE comme sur ordinateur

| Étapes | iPhone SE | Ordinateur |
|---|---|---|
| Visiteur : landing, tarifs, inscription, connexion, mot de passe oublié, CGU, mentions, confidentialité, conditions négoce, connexion négoce, page introuvable | ✓ | ✓ |
| Landing : aucune démo d'office ; « Voir comment ça marche (30 s) », trois métiers, Passer | ✓ | ✓ |
| Inscription artisan, e-mail réel « Confirme ton adresse e-mail » | ✓ | ✓ |
| Guide : trois écrans, prochaine clôture (« dimanche 1 novembre à 12 h »), ne revient pas, « Revoir le guide » | ✓ | ✓ |
| Commande commune : SIRET et adresse | ✓ | ✓ |
| Dépôt d'une liste (photo), vraie lecture | ✗ clé IA | ✗ clé IA |
| Liste ajoutée à la commande commune | ✗ (suite) | ✗ (suite) |
| Dépôt d'un devis (PDF), vraie lecture, questions, liste | ✗ clé IA | ✗ clé IA |
| Négoce dans la boucle, e-mail réel d'invitation, création de l'accès, espace négoce sans nom d'artisan | ✓ | ✓ |
| Abonnement : essai et deux formules ; Stripe carte refusée, carte acceptée (« Abonné au mois »), facture téléchargeable, passage à l'annuel au prorata, résiliation | ✓ | ✓ |
| E-mails réels de l'abonnement (actif, annuel, résiliation) | ✓ | ✓ |
| Chantier fictif, mes chantiers, fournisseurs, formules, compte | ✓ | ✓ |
| Export JSON et PDF, suppression du compte | ✓ | ✓ |

## Zéro reste

- Aucun « BatiClair », aucun lien mort, aucune page vide, aucun débordement sur les pages parcourues.
- Restent : `[A COMPLETER]` dans les mentions légales et la confidentialité (capital, RCS, directeur de publication, e-mail de contact, adresse de l'hébergeur Neon) : informations à fournir par Greg ; la construction de production refuse de partir tant qu'il en reste un.
- Console : la seule erreur de l'app est le 502 de la lecture (ci-dessous), plus un 404 voulu (page introuvable) et un 401 voulu (après suppression du compte). Les erreurs de la page de paiement hébergée par Stripe (Amazon Pay, carte refusée) ne sont pas dans l'app.

## Lecture IA : refusée par Anthropic

Réponse de l'API : `analysis_failed`, motif `provider_error` (Anthropic répond HTTP 400 en moins d'une demi-seconde, pour Opus comme pour Sonnet). La prévisualisation lit `ANTHROPIC_API_KEY` (clé du 1er octobre) ; `BATICLAIR_ANTHROPIC_KEY` n'est posée que sur la production. À régler par Greg (dépense) : recharger cette clé, ou cocher « Preview » sur `BATICLAIR_ANTHROPIC_KEY` dans Vercel (projet baticlair-api). La lecture elle-même est couverte en local (e2e, lecture simulée) et par la vraie lecture de la CI.

## Regroupement négocié par un humain (business model final, 25 octobre 2026, soir)

Script : `docs/groupe/recette-en-ligne/negocie.mjs` (iPhone SE). Captures et journal : `docs/groupe/captures/recette-en-ligne/negocie/iphone-se/`.

**16 étapes sur 16, zéro anomalie** (console, API, débordement) :

1. `/couvreurs` : « Pour les couvreurs », « Des chasseurs d'opportunités négocient pour toi. »
2. Inscription artisan, SIRET, chantier à Lannion (22) avec ardoise 32×22 et crochets.
3. Demande perso : accord d'identité coché d'office, nouveau négoce par e-mail.
4. « Préviens ton négoce » : SMS prérempli (« … bonjour@mobiiz.fr, c'est bien moi. »), « Je l'ai déjà prévenu ».
5. E-mail réel au négoce (« Demande de devis · … »).
6. « Tenter un prix de groupe » : seule l'ardoise se déclare (le crochet garde sa raison).
7. Regroupements : « Regroupement en cours ».
8. Chasseur (admin de test) : code par e-mail réel, écran « Chasseur d'opportunités ».
9. Tableau : « N° 1 · En collecte · Ardoise 32×22 Espagne 1er choix », 1 800 pièces, 1 entreprise, dans le 22, négoces de la zone.
10. « Je prends en charge » → En négociation.
11. Offre : 1,10 € HT négocié, 2 % → « Prix affiché aux artisans : 1,12 € HT (commission incluse) ».
12. « Envoyer l'offre à tous ».
13. Artisan : « Négoce vérifié dans le 22 », nom du négoce caché, mentions « Négocié pour vous par Mobiiz » et « Commission Mobiiz incluse dans le prix ».
14. « J'accepte » → bon de commande, e-mail réel « Ta commande groupée n° 1001 : … ».
15. Chasseur : « 1 acceptation sur 1 », « Transmettre la commande au négoce » → e-mail réel « Commande groupée n° 1 : 1 800 pièces … ».
16. Les deux comptes supprimés.

Constats : la liste « Négoces de la zone » du chasseur contient les faux négoces des recettes précédentes (base de la prévisualisation, pas de la production) ; l'objet de l'e-mail du lot dit « pièces de Ardoise » (à écrire « d'ardoise ») ; « Non merci » de l'offre passait sur deux lignes sur iPhone SE : devenu « Refuser ».
