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
